import { EVENT_TYPE_BY_STATUS, PaymentProvider, type PaymentStatus } from '@pay/contracts';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { firstHeader } from '../../../common/crypto';
import type { Env } from '../../../config/env';
import { IgnoredWebhookError } from '../ignored-webhook.error';
import type {
  InitializePaymentInput,
  NormalizedWebhookEvent,
  PaymentProviderPort,
  ProviderCapabilities,
  ProviderPaymentResult,
  ProviderPaymentSnapshot,
  ProviderRefundInput,
  ProviderRefundResult,
  RawWebhookContext,
} from '../payment-provider.interface';

function mapSessionStatus(session: Stripe.Checkout.Session): PaymentStatus {
  if (session.status === 'expired') {
    return 'EXPIRED';
  }

  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
    return 'SUCCEEDED';
  }

  if (session.status === 'complete') {
    return 'PROCESSING';
  }

  return 'REQUIRES_ACTION';
}

function mapRefundStatus(status: Stripe.Refund['status']): ProviderRefundResult['status'] {
  if (status === 'succeeded') {
    return 'SUCCEEDED';
  }

  if (status === 'failed' || status === 'canceled') {
    return 'FAILED';
  }

  return 'PENDING';
}

export function normalizeStripeEvent(event: Stripe.Event): NormalizedWebhookEvent {
  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  let status: PaymentStatus | null = null;
  let paymentId: string | null = null;
  let providerRef: string | null = null;
  let amountMinor: number | null = null;
  let currency: string | null = null;

  if (event.type.startsWith('checkout.session.')) {
    const session = object as Stripe.Checkout.Session;
    providerRef = session.id;
    paymentId = session.metadata?.paymentId ?? session.client_reference_id ?? null;
    amountMinor = session.amount_total ?? 0;
    currency = session.currency?.toUpperCase() ?? null;

    if (event.type === 'checkout.session.completed') {
      status = session.payment_status === 'unpaid' ? 'PROCESSING' : 'SUCCEEDED';
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      status = 'SUCCEEDED';
    } else if (event.type === 'checkout.session.async_payment_failed') {
      status = 'FAILED';
    } else if (event.type === 'checkout.session.expired') {
      status = 'EXPIRED';
    }
  } else if (event.type.startsWith('payment_intent.')) {
    const paymentIntent = object as Stripe.PaymentIntent;
    providerRef = paymentIntent.id;
    paymentId = paymentIntent.metadata?.paymentId ?? null;
    amountMinor = paymentIntent.amount_received || paymentIntent.amount || 0;
    currency = paymentIntent.currency?.toUpperCase() ?? null;

    if (event.type === 'payment_intent.succeeded') {
      status = 'SUCCEEDED';
    } else if (event.type === 'payment_intent.payment_failed') {
      status = 'FAILED';
    } else if (event.type === 'payment_intent.canceled') {
      status = 'CANCELED';
    }
  }

  if (!status || !providerRef || !currency) {
    throw new IgnoredWebhookError(`Unsupported or incomplete Stripe event: ${event.type}`);
  }

  return {
    provider: PaymentProvider.STRIPE,
    providerEventId: event.id,
    eventType: EVENT_TYPE_BY_STATUS[status],
    paymentId,
    providerRef,
    status,
    amountMinor: String(amountMinor ?? 0),
    currency,
    occurredAt: new Date(event.created * 1000),
    raw: event as unknown as Record<string, unknown>,
  };
}

@Injectable()
export class StripePaymentProvider implements PaymentProviderPort {
  readonly id = PaymentProvider.STRIPE;
  readonly configured: boolean;

  readonly capabilities: ProviderCapabilities = {
    methods: ['card'],
    currencies: ['EUR', 'USD', 'GBP'],
    countries: ['FR', 'GB', 'US'],
    partialRefunds: true,
    hostedCheckout: true,
    requiresCustomerAction: true,
  };

  private readonly client: Stripe | null;
  private readonly webhookSecret: string | null;
  private readonly webUrl: string;

  constructor(config: ConfigService<Env, true>) {
    const secretKey = config.get('STRIPE_SECRET_KEY', { infer: true })?.trim();
    const webhookSecret = config.get('STRIPE_WEBHOOK_SECRET', { infer: true })?.trim();

    this.webhookSecret = webhookSecret || null;
    this.configured = Boolean(secretKey && webhookSecret);
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
    this.client = secretKey
      ? new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 15_000 })
      : null;
  }

  async initializePayment(input: InitializePaymentInput): Promise<ProviderPaymentResult> {
    const client = this.requireClient();
    const unitAmount = input.amountMinor / BigInt(input.quantity);
    const session = await client.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: input.customer.email,
        client_reference_id: input.paymentId,
        line_items: [
          {
            quantity: input.quantity,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: Number(unitAmount),
              product_data: { name: input.productName },
            },
          },
        ],
        metadata: { paymentId: input.paymentId },
        payment_intent_data: {
          metadata: { paymentId: input.paymentId },
          description: input.productName,
        },
        success_url: `${this.webUrl}/checkout/${input.paymentId}?stripe=success`,
        cancel_url: `${this.webUrl}/checkout/${input.paymentId}?stripe=cancel`,
      },
      { idempotencyKey: `payment_${input.paymentId}_create` },
    );

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout URL');
    }

    return {
      providerRef: session.id,
      status: 'REQUIRES_ACTION',
      nextAction: { type: 'redirect', url: session.url },
      rawStatus: session.status ?? 'open',
      raw: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
      },
    };
  }

  async getPayment(providerRef: string): Promise<ProviderPaymentSnapshot> {
    const client = this.requireClient();
    const session = await client.checkout.sessions.retrieve(providerRef);

    return {
      providerRef,
      status: mapSessionStatus(session),
      amountMinor: BigInt(session.amount_total ?? 0),
      currency: (session.currency ?? 'eur').toUpperCase(),
      updatedAt: new Date(),
    };
  }

  async refund(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    const client = this.requireClient();
    const session = await client.checkout.sessions.retrieve(input.providerRef);
    const paymentIntent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntent) {
      throw new Error('Stripe Checkout session has no PaymentIntent to refund');
    }

    const refund = await client.refunds.create(
      {
        payment_intent: paymentIntent,
        amount: Number(input.amountMinor),
        reason: 'requested_by_customer',
        metadata: { paymentId: input.paymentId },
      },
      {
        idempotencyKey: `refund_${input.paymentId}_${input.amountMinor.toString()}`,
      },
    );

    return {
      providerRefundId: refund.id,
      status: mapRefundStatus(refund.status),
    };
  }

  async verifyWebhook(context: RawWebhookContext): Promise<boolean> {
    if (!this.client || !this.webhookSecret) {
      return false;
    }

    const signature = firstHeader(context.headers['stripe-signature']);

    if (!signature) {
      return false;
    }

    try {
      this.client.webhooks.constructEvent(context.rawBody, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  async parseWebhook(context: RawWebhookContext): Promise<NormalizedWebhookEvent> {
    if (!this.client || !this.webhookSecret) {
      throw new ServiceUnavailableException('Stripe adapter is not configured');
    }

    const signature = firstHeader(context.headers['stripe-signature']);

    if (!signature) {
      throw new Error('Missing Stripe-Signature header');
    }

    const event = this.client.webhooks.constructEvent(
      context.rawBody,
      signature,
      this.webhookSecret,
    );

    return normalizeStripeEvent(event);
  }

  private requireClient(): Stripe {
    if (!this.client) {
      throw new ServiceUnavailableException('Stripe adapter is not configured');
    }

    return this.client;
  }
}
