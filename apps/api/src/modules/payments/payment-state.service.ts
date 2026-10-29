import {
  EVENT_TYPE_BY_STATUS,
  canTransition,
  isSettledStatus,
  type Payment,
  type PaymentStatus,
} from '@pay/contracts';
import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../infra/db/database.service';
import { paymentEvents, payments, webhookEvents } from '../../infra/db/schema';
import type { ProviderPaymentResult } from '../providers/payment-provider.interface';
import { toPaymentDto } from './payment.mapper';

type Tx = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];

export type ApplyWebhookResult =
  | { outcome: 'applied'; from: string; to: string }
  | { outcome: 'already-processed' }
  | { outcome: 'missing' }
  | { outcome: 'ignored'; reason: string };

@Injectable()
export class PaymentStateService {
  constructor(private readonly database: DatabaseService) {}

  async initializePayment(paymentId: string, result: ProviderPaymentResult): Promise<Payment> {
    return this.database.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .for('update');

      if (!payment) {
        throw new NotFoundException(`Payment ${paymentId} not found`);
      }

      if (!canTransition(payment.status, result.status)) {
        throw new BadGatewayException(
          `Provider returned an invalid transition ${payment.status} -> ${result.status}`,
        );
      }

      const now = new Date();
      const sequence = await this.nextSequence(tx, payment.id);
      const [updated] = await tx
        .update(payments)
        .set({
          status: result.status,
          providerRef: result.providerRef,
          nextAction: isSettledStatus(result.status) ? null : result.nextAction,
          lastEventAt: now,
          updatedAt: now,
          version: sql`${payments.version} + 1`,
        })
        .where(eq(payments.id, payment.id))
        .returning();

      if (!updated) {
        throw new Error(`Payment ${paymentId} disappeared during initialization`);
      }

      await tx.insert(paymentEvents).values({
        paymentId: payment.id,
        sequence,
        type: EVENT_TYPE_BY_STATUS[result.status],
        source: 'provider',
        fromStatus: payment.status,
        toStatus: result.status,
        payload: {
          providerRef: result.providerRef,
          nextAction: result.nextAction,
          rawStatus: result.rawStatus ?? null,
          raw: result.raw ?? null,
        },
        createdAt: now,
      });

      return toPaymentDto(updated);
    });
  }

  async applyProviderSnapshot(
    paymentId: string,
    targetStatus: PaymentStatus,
    payload: {
      providerRef: string;
      rawStatus?: string;
      amountMinor?: bigint;
      currency?: string;
    },
  ): Promise<boolean> {
    return this.database.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .for('update');

      if (!payment || targetStatus === payment.status) {
        return false;
      }

      if (targetStatus === 'SUCCEEDED') {
        if (payload.amountMinor !== undefined && payload.amountMinor !== payment.amountMinor) {
          return false;
        }

        if (payload.currency !== undefined && payload.currency !== payment.currency) {
          return false;
        }
      }

      if (!canTransition(payment.status, targetStatus)) {
        return false;
      }

      const now = new Date();
      const sequence = await this.nextSequence(tx, payment.id);

      await tx
        .update(payments)
        .set({
          status: targetStatus,
          lastEventAt: now,
          updatedAt: now,
          version: sql`${payments.version} + 1`,
          nextAction: isSettledStatus(targetStatus) ? null : payment.nextAction,
        })
        .where(eq(payments.id, payment.id));

      await tx.insert(paymentEvents).values({
        paymentId: payment.id,
        sequence,
        type: EVENT_TYPE_BY_STATUS[targetStatus],
        source: 'reconciliation',
        fromStatus: payment.status,
        toStatus: targetStatus,
        payload: {
          ...payload,
          amountMinor: payload.amountMinor?.toString(),
        },
        createdAt: now,
      });

      return true;
    });
  }

  async failInitialization(paymentId: string, reason: string): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .for('update');

      if (!payment || payment.status !== 'CREATED' || !canTransition(payment.status, 'FAILED')) {
        return;
      }

      const now = new Date();
      const sequence = await this.nextSequence(tx, payment.id);

      await tx
        .update(payments)
        .set({
          status: 'FAILED',
          nextAction: null,
          lastEventAt: now,
          updatedAt: now,
          version: sql`${payments.version} + 1`,
        })
        .where(eq(payments.id, payment.id));

      await tx.insert(paymentEvents).values({
        paymentId: payment.id,
        sequence,
        type: 'PAYMENT_FAILED',
        source: 'provider',
        fromStatus: payment.status,
        toStatus: 'FAILED',
        payload: { error: reason },
        createdAt: now,
      });
    });
  }

  async applyWebhook(webhookEventId: string): Promise<ApplyWebhookResult> {
    return this.database.db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.id, webhookEventId))
        .for('update');

      if (!event) {
        return { outcome: 'missing' };
      }

      if (event.processedAt) {
        return { outcome: 'already-processed' };
      }

      if (!event.paymentId) {
        await this.markProcessed(tx, event.id, 'No payment id in normalized webhook');
        return { outcome: 'ignored', reason: 'no-payment' };
      }

      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, event.paymentId))
        .for('update');

      if (!payment) {
        await this.markProcessed(tx, event.id, 'Payment not found');
        return { outcome: 'ignored', reason: 'payment-not-found' };
      }

      if (event.targetStatus === 'SUCCEEDED' && event.amountMinor !== payment.amountMinor) {
        const reason = `Amount mismatch: webhook=${event.amountMinor.toString()} payment=${payment.amountMinor.toString()}`;
        await this.markProcessed(tx, event.id, reason);
        return { outcome: 'ignored', reason };
      }

      if (event.targetStatus === 'SUCCEEDED' && event.currency !== payment.currency) {
        const reason = `Currency mismatch: webhook=${event.currency} payment=${payment.currency}`;
        await this.markProcessed(tx, event.id, reason);
        return { outcome: 'ignored', reason };
      }

      if (event.targetStatus === payment.status) {
        await this.markProcessed(tx, event.id, null);
        return { outcome: 'already-processed' };
      }

      if (!canTransition(payment.status, event.targetStatus)) {
        const reason = `Ignored transition ${payment.status} -> ${event.targetStatus}`;
        await this.markProcessed(tx, event.id, reason);
        return { outcome: 'ignored', reason };
      }

      const now = new Date();
      const sequence = await this.nextSequence(tx, payment.id);

      await tx
        .update(payments)
        .set({
          status: event.targetStatus,
          lastEventAt: event.occurredAt,
          updatedAt: now,
          version: sql`${payments.version} + 1`,
          nextAction: isSettledStatus(event.targetStatus) ? null : payment.nextAction,
        })
        .where(eq(payments.id, payment.id));

      await tx.insert(paymentEvents).values({
        paymentId: payment.id,
        sequence,
        type: event.eventType,
        source: 'webhook',
        fromStatus: payment.status,
        toStatus: event.targetStatus,
        payload: event.payload,
        createdAt: now,
      });

      await this.markProcessed(tx, event.id, null);

      return { outcome: 'applied', from: payment.status, to: event.targetStatus };
    });
  }

  private async nextSequence(tx: Tx, paymentId: string): Promise<number> {
    const [row] = await tx
      .select({
        next: sql<number>`coalesce(max(${paymentEvents.sequence}), 0) + 1`,
      })
      .from(paymentEvents)
      .where(eq(paymentEvents.paymentId, paymentId));

    return Number(row?.next ?? 1);
  }

  private async markProcessed(tx: Tx, id: string, error: string | null): Promise<void> {
    await tx
      .update(webhookEvents)
      .set({
        processedAt: new Date(),
        processingError: error,
        attempts: sql`${webhookEvents.attempts} + 1`,
      })
      .where(eq(webhookEvents.id, id));
  }
}
