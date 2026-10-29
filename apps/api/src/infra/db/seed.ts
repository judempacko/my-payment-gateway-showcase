import type { PaymentMethod, PaymentProvider, PaymentStatus } from '@pay/contracts';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DEMO_PRODUCTS, LEGACY_DEMO_SLUGS } from '../../modules/catalog/catalog.constants';
import { paymentEvents, payments, products } from './schema';

const DEMO_PAYMENT_IDS = {
  succeeded: '10000000-0000-7000-8000-000000000001',
  failed: '10000000-0000-7000-8000-000000000002',
  pending: '10000000-0000-7000-8000-000000000003',
} as const;

type SeedPayment = {
  id: string;
  productId: string;
  amountMinor: bigint;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  method: PaymentMethod;
  providerRef: string;
  customer: { name: string; email: string; country: string };
  createdAt: Date;
  events: Array<{
    sequence: number;
    type: string;
    toStatus: PaymentStatus;
    fromStatus: PaymentStatus | null;
  }>;
};

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? 'postgresql://pay:pay@localhost:5432/payments';
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const now = Date.now();
  const seedPayments: SeedPayment[] = [
    {
      id: DEMO_PAYMENT_IDS.succeeded,
      productId: DEMO_PRODUCTS[0]!.id,
      amountMinor: 96900n,
      currency: 'EUR',
      status: 'SUCCEEDED',
      provider: 'mock',
      method: 'card',
      providerRef: 'mock_seed_succeeded',
      customer: { name: 'Ada Lovelace', email: 'ada@example.com', country: 'FR' },
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      events: [
        { sequence: 1, type: 'PAYMENT_CREATED', fromStatus: null, toStatus: 'CREATED' },
        { sequence: 2, type: 'PAYMENT_PENDING', fromStatus: 'CREATED', toStatus: 'PENDING' },
        { sequence: 3, type: 'PAYMENT_SUCCEEDED', fromStatus: 'PENDING', toStatus: 'SUCCEEDED' },
      ],
    },
    {
      id: DEMO_PAYMENT_IDS.failed,
      productId: DEMO_PRODUCTS[1]!.id,
      amountMinor: 95900n,
      currency: 'EUR',
      status: 'FAILED',
      provider: 'mock',
      method: 'card',
      providerRef: 'mock_seed_failed',
      customer: { name: 'Grace Hopper', email: 'grace@example.com', country: 'FR' },
      createdAt: new Date(now - 45 * 60 * 1000),
      events: [
        { sequence: 1, type: 'PAYMENT_CREATED', fromStatus: null, toStatus: 'CREATED' },
        { sequence: 2, type: 'PAYMENT_PENDING', fromStatus: 'CREATED', toStatus: 'PENDING' },
        { sequence: 3, type: 'PAYMENT_FAILED', fromStatus: 'PENDING', toStatus: 'FAILED' },
      ],
    },
    {
      id: DEMO_PAYMENT_IDS.pending,
      productId: DEMO_PRODUCTS[3]!.id,
      amountMinor: 129900n,
      currency: 'XOF',
      status: 'PENDING',
      provider: 'mock',
      method: 'mobile_money',
      providerRef: 'mock_seed_pending',
      customer: { name: 'Awa Diop', email: 'awa@example.com', country: 'SN' },
      createdAt: new Date(now - 5 * 60 * 1000),
      events: [
        { sequence: 1, type: 'PAYMENT_CREATED', fromStatus: null, toStatus: 'CREATED' },
        { sequence: 2, type: 'PAYMENT_PENDING', fromStatus: 'CREATED', toStatus: 'PENDING' },
      ],
    },
  ];

  try {
    await db
      .update(products)
      .set({ active: false })
      .where(inArray(products.slug, LEGACY_DEMO_SLUGS));

    for (const product of DEMO_PRODUCTS) {
      await db
        .insert(products)
        .values({
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          amountMinor: BigInt(product.amountMinor),
          currency: product.currency,
          active: true,
        })
        .onConflictDoUpdate({
          target: products.slug,
          set: {
            name: product.name,
            description: product.description,
            amountMinor: BigInt(product.amountMinor),
            currency: product.currency,
            active: true,
          },
        });
    }

    for (const payment of seedPayments) {
      await db
        .insert(payments)
        .values({
          id: payment.id,
          productId: payment.productId,
          quantity: 1,
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          status: payment.status,
          provider: payment.provider,
          method: payment.method,
          providerRef: payment.providerRef,
          nextAction: null,
          customer: payment.customer,
          metadata: { seeded: true },
          lastEventAt: payment.createdAt,
          version: payment.events.length,
          createdAt: payment.createdAt,
          updatedAt: payment.createdAt,
        })
        .onConflictDoUpdate({
          target: payments.id,
          set: {
            productId: payment.productId,
            quantity: 1,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            status: payment.status,
            provider: payment.provider,
            method: payment.method,
            providerRef: payment.providerRef,
            nextAction: null,
            customer: payment.customer,
            metadata: { seeded: true },
            lastEventAt: payment.createdAt,
            version: payment.events.length,
            updatedAt: payment.createdAt,
          },
        });

      for (const event of payment.events) {
        await db
          .insert(paymentEvents)
          .values({
            paymentId: payment.id,
            sequence: event.sequence,
            type: event.type,
            source: event.sequence === 1 ? 'api' : 'provider',
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            payload: { seeded: true },
            createdAt: new Date(payment.createdAt.getTime() + event.sequence * 1000),
          })
          .onConflictDoNothing({
            target: [paymentEvents.paymentId, paymentEvents.sequence],
          });
      }
    }

    console.log('Seed complete');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exitCode = 1;
});
