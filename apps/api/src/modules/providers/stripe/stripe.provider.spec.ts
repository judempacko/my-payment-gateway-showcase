import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { IgnoredWebhookError } from '../ignored-webhook.error';
import { normalizeStripeEvent } from './stripe.provider';

function stripeEvent(type: string, object: unknown, created = 1_700_000_000): Stripe.Event {
  return {
    id: `evt_${type.replaceAll('.', '_')}`,
    object: 'event',
    api_version: '2026-01-01',
    created,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
  } as unknown as Stripe.Event;
}

const session = {
  id: 'cs_test_123',
  object: 'checkout.session',
  amount_total: 4900,
  currency: 'eur',
  payment_status: 'paid',
  status: 'complete',
  metadata: { paymentId: '10000000-0000-7000-8000-000000000001' },
  client_reference_id: null,
} as unknown as Stripe.Checkout.Session;

const paymentIntent = {
  id: 'pi_test_123',
  object: 'payment_intent',
  amount: 4900,
  amount_received: 0,
  currency: 'eur',
  metadata: { paymentId: '10000000-0000-7000-8000-000000000001' },
} as unknown as Stripe.PaymentIntent;

describe('Stripe event normalization', () => {
  it('maps a paid Checkout Session to SUCCEEDED', () => {
    const normalized = normalizeStripeEvent(stripeEvent('checkout.session.completed', session));

    expect(normalized.status).toBe('SUCCEEDED');
    expect(normalized.eventType).toBe('PAYMENT_SUCCEEDED');
    expect(normalized.amountMinor).toBe('4900');
    expect(normalized.currency).toBe('EUR');
    expect(normalized.paymentId).toBe('10000000-0000-7000-8000-000000000001');
    expect(normalized.providerRef).toBe('cs_test_123');
  });

  it('maps an unpaid Checkout Session to PROCESSING', () => {
    const normalized = normalizeStripeEvent(
      stripeEvent('checkout.session.completed', { ...session, payment_status: 'unpaid' }),
    );

    expect(normalized.status).toBe('PROCESSING');
  });

  it('maps a failed PaymentIntent to FAILED', () => {
    const normalized = normalizeStripeEvent(
      stripeEvent('payment_intent.payment_failed', paymentIntent),
    );

    expect(normalized.status).toBe('FAILED');
    expect(normalized.eventType).toBe('PAYMENT_FAILED');
  });

  it('ignores unrelated event types', () => {
    expect(() => normalizeStripeEvent(stripeEvent('charge.refunded', { id: 'ch_1' }))).toThrow(
      IgnoredWebhookError,
    );
  });
});
