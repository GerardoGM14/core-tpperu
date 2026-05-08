import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private _client: Redis;
  private subscribers: Redis[] = [];

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this._client = new Redis(this.connectionOptions());
    this._client.on('error', (err) => this.logger.error(`Redis client error: ${err.message}`));
    this.logger.log(`Redis connected to ${this.connectionOptions().host}:${this.connectionOptions().port}`);
  }

  async onModuleDestroy() {
    await Promise.all([this._client?.quit(), ...this.subscribers.map((s) => s.quit())]);
  }

  get client() {
    return this._client;
  }

  /**
   * Crea una conexión dedicada en modo subscriber. ioredis exige que las
   * conexiones que llaman a SUBSCRIBE/PSUBSCRIBE no se reutilicen para otros
   * comandos, por eso devolvemos una conexión nueva por consumidor.
   */
  createSubscriber(): Redis {
    const sub = new Redis(this.connectionOptions());
    sub.on('error', (err) => this.logger.error(`Redis subscriber error: ${err.message}`));
    this.subscribers.push(sub);
    return sub;
  }

  connectionOptions(): RedisOptions {
    return {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.getOrThrow<number>('REDIS_PORT'),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: null,
    };
  }
}
