import { Module, Logger, OnModuleDestroy, OnModuleInit, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, JobsOptions } from 'bullmq';
import { RedisService } from '../shared/redis.service';

export const QUEUE_REMINDERS = 'reminders';
export const QUEUE_CAMPAIGN = 'campaigns';
export const QUEUE_OUTBOUND = 'outbound-messages';

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueuesService.name);
  private queues: Map<string, Queue> = new Map();
  private workers: Worker[] = [];

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const connection = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.getOrThrow<number>('REDIS_PORT'),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
    };

    [QUEUE_REMINDERS, QUEUE_CAMPAIGN, QUEUE_OUTBOUND].forEach((name) => {
      this.queues.set(name, new Queue(name, { connection }));
    });

    this.logger.log(`Queues ready: ${[...this.queues.keys()].join(', ')}`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }

  enqueue(name: string, data: unknown, opts?: JobsOptions) {
    const q = this.queues.get(name);
    if (!q) throw new Error(`Queue ${name} not registered`);
    return q.add(name, data, opts);
  }

  registerWorker(name: string, processor: (job: { data: unknown }) => Promise<void>) {
    const connection = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.getOrThrow<number>('REDIS_PORT'),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
    };
    const w = new Worker(name, async (job) => processor(job), { connection });
    this.workers.push(w);
    return w;
  }
}

@Module({
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
