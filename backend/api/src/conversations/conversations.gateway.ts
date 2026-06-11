import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { RedisService } from '../shared/redis.service';
import { ConversationsService, InboundMessageEvent } from './conversations.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/conversations',
})
export class ConversationsGateway
  implements OnModuleInit, OnModuleDestroy, OnGatewayConnection
{
  private readonly logger = new Logger(ConversationsGateway.name);
  private subscriber: Redis;

  // Último QR/estado conocido. Se re-emite a cualquier cliente que se conecte,
  // para que no se pierda el evento por timing de (re)conexión del socket.
  private lastQr: { qr: string; at: number } | null = null;
  private lastStatus: any = null;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly conversations: ConversationsService,
  ) {}

  // QR vigente por HTTP (fallback si el socket pierde el evento).
  getCurrentQr(): { qr: string } | null {
    if (this.lastQr && Date.now() - this.lastQr.at < 60_000) {
      return { qr: this.lastQr.qr };
    }
    return null;
  }

  // Cuando un cliente se conecta, le mandamos el último QR/estado vigente.
  handleConnection(client: Socket) {
    if (this.lastStatus) client.emit('status', this.lastStatus);
    // QR válido solo ~60s; si es reciente, lo reenviamos.
    if (this.lastQr && Date.now() - this.lastQr.at < 60_000) {
      client.emit('qr', { qr: this.lastQr.qr });
    }
  }

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
          this.lastQr = { qr: data.qr, at: Date.now() };
          this.logger.log(`QR recibido del daemon (len=${data.qr?.length ?? 0}), reemitiendo a clientes`);
          this.server.emit('qr', data);
        } else if (channel === statusCh) {
          this.lastStatus = data;
          // Al conectarse, ya no hay QR vigente.
          if (data.status === 'connected' || data.status === 'logged-out') {
            this.lastQr = null;
          }
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
    // Reacción a un mensaje desconocido → nada que emitir.
    if (!message) return;
    this.server.emit('message', { conversation, message });
  }
}
