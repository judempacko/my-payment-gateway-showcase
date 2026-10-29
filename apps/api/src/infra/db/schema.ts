import {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  type Customer,
  type NextAction,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentStatus,
} from '@pay/contracts';
import { v7 as uuidv7 } from 'uuid';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const asTuple = <T extends string>(values: readonly T[]): [T, ...T[]] => [...values] as [T, ...T[]];

export const paymentStatusEnum = pgEnum('payment_status', asTuple(PAYMENT_STATUSES));
export const paymentProviderEnum = pgEnum('payment_provider', asTuple(PAYMENT_PROVIDERS));
export const paymentMethodEnum = pgEnum('payment_method', asTuple(PAYMENT_METHODS));

export const products = pgTable(
  'products',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('products_slug_uq').on(table.slug)],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    merchantId: text('merchant_id').notNull().default('demo'),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    status: paymentStatusEnum('status').$type<PaymentStatus>().notNull().default('CREATED'),
    provider: paymentProviderEnum('provider').$type<PaymentProvider>().notNull(),
    method: paymentMethodEnum('method').$type<PaymentMethod>().notNull(),
    providerRef: text('provider_ref'),
    nextAction: jsonb('next_action').$type<NextAction | null>(),
    customer: jsonb('customer').$type<Customer>().notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    lastEventAt: timestamp('last_event_at', { withTimezone: true }),
    version: integer('version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_status_idx').on(table.status),
    index('payments_created_at_idx').on(table.createdAt),
    index('payments_provider_ref_idx').on(table.provider, table.providerRef),
  ],
);

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    type: text('type').notNull(),
    source: text('source').notNull(),
    fromStatus: paymentStatusEnum('from_status').$type<PaymentStatus>(),
    toStatus: paymentStatusEnum('to_status').$type<PaymentStatus>(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_events_payment_sequence_uq').on(table.paymentId, table.sequence),
  ],
);

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    provider: paymentProviderEnum('provider').$type<PaymentProvider>().notNull(),
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    providerRef: text('provider_ref'),
    targetStatus: paymentStatusEnum('target_status').$type<PaymentStatus>().notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    signatureValid: boolean('signature_valid').notNull(),
    headers: jsonb('headers').$type<Record<string, unknown>>().notNull().default({}),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    rawBody: text('raw_body').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingError: text('processing_error'),
    attempts: integer('attempts').notNull().default(0),
  },
  (table) => [
    uniqueIndex('webhook_events_provider_event_uq').on(table.provider, table.providerEventId),
    index('webhook_events_payment_idx').on(table.paymentId),
    index('webhook_events_processed_idx').on(table.processedAt),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    merchantId: text('merchant_id').notNull().default('demo'),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex('idempotency_keys_merchant_key_uq').on(table.merchantId, table.key)],
);
