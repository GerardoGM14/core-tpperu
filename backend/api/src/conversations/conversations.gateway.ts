import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { RedisService } from '../shared/redis.service';
import { ConversationsService, InboundMessageEvent } from './conversations.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/conversations',
})
export class ConversationsGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConversationsGateway.name);
  private subscriber: Redis;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly conversations: ConversationsService,
  ) {}

  async onModuleInit() {
    const inboundCh = this.config.get<string>('WA_REDIS_CHANNEL_INBOUND', 'whatsapp:inbound');
    const qrCh = this.config.get<string>('WA_REDIS_CHANNEL_QR', 'whatsapp:qr');
    const statusCh = this.config.get<string>('WA_REDIS_CHANNEL_STATUS', 'whatsapp:status');

    this.subscriber = this.redis.createSubscriber();
    await this.subscriber.subscribe(inboundCh, qrCh, statusCh);
    this.logger.log(`Subscribed to ${inboundCh}, ${qrCh}, ${statusCh}`);

    this.subscriber.on('message', async (channel, raw) => {
      try {
        const data = JSON.parse(raw);
        if (channel === inboundCh) {
          await this.handleInbound(data as InboundMessageEvent);
        } else if (channel === qrCh) {
          this.server.emit('qr', data);
        } else if (channel === statusCh) {
          this.server.emit('status', data);
        }
      } catch (err) {
        this.logger.error(`Bad payload on ${channel}: ${(err as Error).message}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber?.unsubscribe();
  }

  private async handleInbound(evt: InboundMessageEvent) {
    const { conversation, message } = await this.conversations.ingestInbound(evt);
    this.server.emit('message', { conversation, message });
  }
}
