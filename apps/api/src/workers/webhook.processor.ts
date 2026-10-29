import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../infra/db/database.service';
import { webhookEvents } from '../infra/db/schema';
import { WEBHOOK_QUEUE } from '../infra/queue/queue.constants';
import { PaymentStateService } from '../modules/payments/payment-state.service';

@Processor(WEBHOOK_QUEUE)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly state: PaymentStateService,
    private readonly database: DatabaseService,
  ) {
    super();
  }

  async process(job: Job<{ webhookEventId: string }>): Promise<void> {
    const webhookEventId = job.data.webhookEventId;

    try {
      const result = await this.state.applyWebhook(webhookEventId);
      this.logger.log(`Webhook ${webhookEventId}: ${result.outcome}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';

      await this.database.db
        .update(webhookEvents)
        .set({
          attempts: sql`${webhookEvents.attempts} + 1`,
          processingError: message,
        })
        .where(eq(webhookEvents.id, webhookEventId));

      this.logger.error(`Webhook ${webhookEventId} failed: ${message}`);
      throw error;
    }
  }
}
