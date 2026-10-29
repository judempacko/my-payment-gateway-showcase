import type { NextAction, Payment, PaymentEvent, WebhookRecord } from '@pay/contracts';
import type { InferSelectModel } from 'drizzle-orm';
import type { paymentEvents, payments, webhookEvents } from '../../infra/db/schema';

export type PaymentRow = InferSelectModel<typeof payments>;
export type PaymentEventRow = InferSelectModel<typeof paymentEvents>;
export type WebhookEventRow = InferSelectModel<typeof webhookEvents>;

export function toPaymentDto(row: PaymentRow): Payment {
  return {
    id: row.id,
    status: row.status,
    provider: row.provider,
    method: row.method,
    amountMinor: row.amountMinor.toString(),
    currency: row.currency,
    productId: row.productId,
    quantity: row.quantity,
    customer: row.customer,
    providerRef: row.providerRef,
    nextAction: (row.nextAction as NextAction | null) ?? null,
    metadata: row.metadata,
    lastEventAt: row.lastEventAt?.toISOString() ?? null,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPaymentEventDto(row: PaymentEventRow): PaymentEvent {
  return {
    id: row.id,
    paymentId: row.paymentId,
    sequence: row.sequence,
    type: row.type as PaymentEvent['type'],
    source: row.source,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toWebhookDto(row: WebhookEventRow): WebhookRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.providerEventId,
    eventType: row.eventType,
    paymentId: row.paymentId,
    signatureValid: row.signatureValid,
    headers: row.headers,
    payload: row.payload,
    rawBody: row.rawBody,
    receivedAt: row.receivedAt.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
    processingError: row.processingError,
    attempts: row.attempts,
  };
}
