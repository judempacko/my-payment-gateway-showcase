import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../infra/db/database.service';
import { payments, webhookEvents } from '../../infra/db/schema';
import { WEBHOOK_JOB, WEBHOOK_QUEUE } from '../../infra/queue/queue.constants';
import { IgnoredWebhookError } from '../providers/ignored-webhook.error';
import type { RawWebhookContext } from '../providers/payment-provider.interface';
import { ProviderRegistry } from '../providers/provider.registry';

export type IngestResult = {
  id: string | null;
  duplicate: boolean;
  ignored: boolean;
};

@Injectable()
export class WebhookIngestService {
  private readonly logger = new Logger(WebhookIngestService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly registry: ProviderRegistry,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {}

  async ingest(providerId: string, context: RawWebhookContext): Promise<IngestResult> {
    const provider = this.registry.get(providerId);
    const valid = await provider.verifyWebhook(context);

    if (!valid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let event;

    try {
      event = await provider.parseWebhook(context);
    } catch (error) {
      if (error instanceof IgnoredWebhookError) {
        this.logger.log(`Ignored ${providerId} webhook: ${error.message}`);
        return { id: null, duplicate: false, ignored: true };
      }

      this.logger.warn(`Rejected malformed ${providerId} webhook: ${String(error)}`);
      throw new BadRequestException('Malformed webhook payload');
    }

    let paymentId = event.paymentId;

    if (!paymentId && event.providerRef) {
      const [payment] = await this.database.db
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(eq(payments.provider, event.provider), eq(payments.providerRef, event.providerRef)),
        )
        .limit(1);
      paymentId = payment?.id ?? null;
    }

    const [inserted] = await this.database.db
      .insert(webhookEvents)
      .values({
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        paymentId,
        providerRef: event.providerRef,
        targetStatus: event.status,
        amountMinor: BigInt(event.amountMinor),
        currency: event.currency,
        occurredAt: event.occurredAt,
        signatureValid: true,
        headers: context.headers as Record<string, unknown>,
        payload: event.raw,
        rawBody: context.rawBody.toString('utf8'),
      })
      .onConflictDoNothing({
        target: [webhookEvents.provider, webhookEvents.providerEventId],
      })
      .returning({ id: webhookEvents.id });

    if (!inserted) {
      return { id: null, duplicate: true, ignored: false };
    }

    try {
      await this.queue.add(
        WEBHOOK_JOB,
        { webhookEventId: inserted.id },
        {
          jobId: inserted.id,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        },
      );
    } catch (error) {
      this.logger.error(
        `Webhook ${inserted.id} persisted but could not be queued; the sweeper will retry: ${String(error)}`,
      );
    }

    return { id: inserted.id, duplicate: false, ignored: false };
  }
}
