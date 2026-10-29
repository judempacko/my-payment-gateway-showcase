import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, isNull, lt } from 'drizzle-orm';
import { DatabaseService } from '../infra/db/database.service';
import { webhookEvents } from '../infra/db/schema';
import { WEBHOOK_JOB, WEBHOOK_QUEUE } from '../infra/queue/queue.constants';

const SWEEP_INTERVAL_MS = 30_000;
const MIN_AGE_MS = 30_000;

@Injectable()
export class WebhookSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookSweeper.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly database: DatabaseService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async sweep(): Promise<void> {
    const cutoff = new Date(Date.now() - MIN_AGE_MS);

    try {
      const rows = await this.database.db
        .select({ id: webhookEvents.id })
        .from(webhookEvents)
        .where(and(isNull(webhookEvents.processedAt), lt(webhookEvents.receivedAt, cutoff)))
        .limit(50);

      for (const row of rows) {
        await this.queue.add(
          WEBHOOK_JOB,
          { webhookEventId: row.id },
          {
            jobId: `sweep-${row.id}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 1_000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );
      }

      if (rows.length > 0) {
        this.logger.log(`Re-enqueued ${rows.length} unprocessed webhook event(s)`);
      }
    } catch (error) {
      this.logger.error(`Webhook sweep failed: ${String(error)}`);
    }
  }
}
