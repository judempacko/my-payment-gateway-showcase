import {
  PAYMENT_STATUSES,
  type Payment,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentStatus,
} from '@pay/contracts';
import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../../infra/db/database.service';
import { idempotencyKeys, paymentEvents, payments, webhookEvents } from '../../infra/db/schema';
import {
  toPaymentDto,
  toPaymentEventDto,
  toWebhookDto,
  type PaymentEventRow,
  type PaymentRow,
} from './payment.mapper';
import type { PaymentDayRow, PaymentTotalsRow, WebhookPipelineRow } from './payment-stats';

export const DEMO_MERCHANT_ID = 'demo';

export type InsertPaymentInput = {
  productId: string;
  quantity: number;
  amountMinor: bigint;
  currency: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  customer: { name: string; email: string; phone?: string; country?: string };
  metadata: Record<string, unknown>;
};

export type ListPaymentsInput = {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  limit: number;
  cursor?: string;
  page?: number;
};

@Injectable()
export class PaymentsRepository {
  constructor(private readonly database: DatabaseService) {}

  async insert(input: InsertPaymentInput): Promise<PaymentRow> {
    const [row] = await this.database.db
      .insert(payments)
      .values({
        productId: input.productId,
        quantity: input.quantity,
        amountMinor: input.amountMinor,
        currency: input.currency,
        provider: input.provider,
        method: input.method,
        customer: input.customer,
        metadata: input.metadata,
        status: 'CREATED',
      })
      .returning();

    if (!row) {
      throw new Error('Failed to insert payment');
    }

    return row;
  }

  async insertEvent(input: {
    paymentId: string;
    sequence: number;
    type: string;
    source: string;
    fromStatus: PaymentStatus | null;
    toStatus: PaymentStatus | null;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.database.db.insert(paymentEvents).values(input);
  }

  async findById(id: string): Promise<PaymentRow | null> {
    const [row] = await this.database.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);

    return row ?? null;
  }

  async list(input: ListPaymentsInput): Promise<{
    items: Payment[];
    nextCursor: string | null;
    page?: number;
    pageSize?: number;
    total?: number;
    pageCount?: number;
  }> {
    const conditions: SQL[] = [];

    if (input.status) {
      conditions.push(eq(payments.status, input.status));
    }

    if (input.provider) {
      conditions.push(eq(payments.provider, input.provider));
    }

    if (input.page !== undefined) {
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;
      const [rows, countRows] = await Promise.all([
        this.database.db
          .select()
          .from(payments)
          .where(where)
          .orderBy(desc(payments.createdAt), desc(payments.id))
          .limit(input.limit)
          .offset(offset),
        this.database.db
          .select({ count: sql<number>`count(*)::int` })
          .from(payments)
          .where(where),
      ]);
      const total = countRows[0]?.count ?? 0;

      return {
        items: rows.map(toPaymentDto),
        nextCursor: null,
        page: input.page,
        pageSize: input.limit,
        total,
        pageCount: Math.ceil(total / input.limit),
      };
    }

    if (input.cursor) {
      conditions.push(lt(payments.id, input.cursor));
    }

    const rows = await this.database.db
      .select()
      .from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt), desc(payments.id))
      .limit(input.limit + 1);

    const page = rows.slice(0, input.limit);
    const hasMore = rows.length > input.limit;

    return {
      items: page.map(toPaymentDto),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async statsTotals(): Promise<PaymentTotalsRow[]> {
    return this.database.db
      .select({
        provider: payments.provider,
        status: payments.status,
        currency: payments.currency,
        count: sql<number>`count(*)::int`,
        amountMinor: sql<string>`coalesce(sum(${payments.amountMinor}), 0)::text`,
      })
      .from(payments)
      .groupBy(payments.provider, payments.status, payments.currency);
  }

  async statsSeries(since: Date): Promise<PaymentDayRow[]> {
    const date = sql<string>`to_char(date_trunc('day', ${payments.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`;

    return this.database.db
      .select({
        date,
        status: payments.status,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(gte(payments.createdAt, since))
      .groupBy(date, payments.status)
      .orderBy(date);
  }

  async statsWebhooks(): Promise<WebhookPipelineRow> {
    const [row] = await this.database.db
      .select({
        processed: sql<number>`count(*) filter (where ${webhookEvents.processedAt} is not null)::int`,
        pending: sql<number>`count(*) filter (where ${webhookEvents.processedAt} is null and ${webhookEvents.processingError} is null)::int`,
        failed: sql<number>`count(*) filter (where ${webhookEvents.processedAt} is null and ${webhookEvents.processingError} is not null)::int`,
        lastReceivedAt: sql<Date | null>`max(${webhookEvents.receivedAt})`,
        lastErrorAt: sql<Date | null>`max(${webhookEvents.receivedAt}) filter (where ${webhookEvents.processingError} is not null and ${webhookEvents.processedAt} is null)`,
      })
      .from(webhookEvents);

    return (
      row ?? {
        processed: 0,
        pending: 0,
        failed: 0,
        lastReceivedAt: null,
        lastErrorAt: null,
      }
    );
  }

  async listEvents(paymentId: string): Promise<PaymentEventRow[]> {
    return this.database.db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.paymentId, paymentId))
      .orderBy(asc(paymentEvents.sequence));
  }

  async listWebhooks(paymentId: string) {
    const rows = await this.database.db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.paymentId, paymentId))
      .orderBy(desc(webhookEvents.receivedAt));

    return rows.map(toWebhookDto);
  }

  async claimIdempotency(
    key: string,
    requestHash: string,
  ): Promise<{ claimed: boolean; record: typeof idempotencyKeys.$inferSelect }> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [created] = await this.database.db
      .insert(idempotencyKeys)
      .values({
        merchantId: DEMO_MERCHANT_ID,
        key,
        requestHash,
        expiresAt,
      })
      .onConflictDoNothing({
        target: [idempotencyKeys.merchantId, idempotencyKeys.key],
      })
      .returning();

    if (created) {
      return { claimed: true, record: created };
    }

    const [existing] = await this.database.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.merchantId, DEMO_MERCHANT_ID), eq(idempotencyKeys.key, key)))
      .limit(1);

    if (!existing) {
      throw new Error('Idempotency key conflict but no existing record was found');
    }

    return { claimed: false, record: existing };
  }

  async completeIdempotency(id: string, payment: Payment): Promise<void> {
    await this.database.db
      .update(idempotencyKeys)
      .set({
        responseStatus: 201,
        responseBody: payment as unknown as Record<string, unknown>,
      })
      .where(eq(idempotencyKeys.id, id));
  }

  async releaseIdempotency(id: string): Promise<void> {
    await this.database.db.delete(idempotencyKeys).where(eq(idempotencyKeys.id, id));
  }

  asPaymentDto(row: PaymentRow): Payment {
    return toPaymentDto(row);
  }

  asEventDto(row: PaymentEventRow) {
    return toPaymentEventDto(row);
  }

  statusValues(): readonly PaymentStatus[] {
    return PAYMENT_STATUSES;
  }
}
