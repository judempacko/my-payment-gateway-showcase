import {
  EVENT_TYPE_BY_STATUS,
  PAYMENT_STATUSES,
  PaymentProvider,
  type Customer,
  type PaymentStatus,
} from '@pay/contracts';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import { firstHeader, safeEqual } from '../../../common/crypto';
import type { Env } from '../../../config/env';
import type {
  InitializePaymentInput,
  NormalizedWebhookEvent,
  PaymentProviderPort,
  ProviderCapabilities,
  ProviderPaymentResult,
  ProviderRefundInput,
  ProviderRefundResult,
  RawWebhookContext,
} from '../payment-provider.interface';

const statusSchema = z.enum([...PAYMENT_STATUSES] as [PaymentStatus, ...PaymentStatus[]]);

const mockWebhookSchema = z.object({
  eventId: z.string().uuid(),
  type: z.string().min(1),
  paymentId: z.string().uuid(),
  providerRef: z.string().min(1),
  status: statusSchema,
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3),
  occurredAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date'),
});

export type MockOutcome = 'succeeded' | 'failed' | 'expired';

export type MockWebhook = {
  headers: Record<string, string>;
  rawBody: string;
};

type MockPayment = {
  id: string;
  providerRef: string | null;
  amountMinor: bigint;
  currency: string;
  customer: Customer;
};

const OUTCOME_STATUS: Record<MockOutcome, PaymentStatus> = {
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
  expired: 'EXPIRED',
};

@Injectable()
export class MockPaymentProvider implements PaymentProviderPort {
  readonly id = PaymentProvider.MOCK;
  readonly configured = true;

  readonly capabilities: ProviderCapabilities = {
    methods: ['card', 'mobile_money', 'mock'],
    currencies: ['EUR', 'USD', 'XOF', 'XAF'],
    countries: ['FR', 'GB', 'US', 'SN', 'CI', 'CM', 'NG'],
    partialRefunds: false,
    hostedCheckout: false,
    requiresCustomerAction: true,
  };

  private readonly secret: string;

  constructor(config: ConfigService<Env, true>) {
    this.secret = config.get('MOCK_WEBHOOK_SECRET', { infer: true });
  }

  async initializePayment(input: InitializePaymentInput): Promise<ProviderPaymentResult> {
    const providerRef = `mock_${uuidv7()}`;

    return {
      providerRef,
      status: 'PENDING',
      nextAction: {
        type: 'mock_approval',
        paymentId: input.paymentId,
        providerRef,
      },
      rawStatus: 'PENDING',
    };
  }

  getPayment(): Promise<never> {
    throw new NotImplementedException('The mock provider does not expose status polling');
  }

  refund(_input: ProviderRefundInput): Promise<ProviderRefundResult> {
    throw new NotImplementedException('Mock refunds arrive in Phase 2');
  }

  async verifyWebhook(context: RawWebhookContext): Promise<boolean> {
    const header = firstHeader(context.headers['x-mock-signature']);
    const parsed = this.parseSignatureHeader(header);

    if (!parsed) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parsed.timestamp) > 300) {
      return false;
    }

    const expected = createHmac('sha256', this.secret)
      .update(`${parsed.timestamp}.${context.rawBody.toString('utf8')}`)
      .digest('hex');

    return safeEqual(expected, parsed.signature);
  }

  async parseWebhook(context: RawWebhookContext): Promise<NormalizedWebhookEvent> {
    const parsed = mockWebhookSchema.parse(JSON.parse(context.rawBody.toString('utf8')));

    return {
      provider: this.id,
      providerEventId: parsed.eventId,
      eventType: EVENT_TYPE_BY_STATUS[parsed.status],
      paymentId: parsed.paymentId,
      providerRef: parsed.providerRef,
      status: parsed.status,
      amountMinor: parsed.amountMinor,
      currency: parsed.currency,
      occurredAt: new Date(parsed.occurredAt),
      raw: parsed,
    };
  }

  buildSignedWebhook(payment: MockPayment, outcome: MockOutcome): MockWebhook {
    const status = OUTCOME_STATUS[outcome];
    const payload = {
      eventId: uuidv7(),
      type: `payment.${outcome}`,
      paymentId: payment.id,
      providerRef: payment.providerRef ?? 'mock_unknown',
      status,
      amountMinor: payment.amountMinor.toString(),
      currency: payment.currency,
      occurredAt: new Date().toISOString(),
      customer: payment.customer,
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', this.secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    return {
      headers: {
        'content-type': 'application/json',
        'x-mock-signature': `t=${timestamp},v1=${signature}`,
      },
      rawBody,
    };
  }

  private parseSignatureHeader(
    header: string | undefined,
  ): { timestamp: number; signature: string } | null {
    if (!header) {
      return null;
    }

    const parts = Object.fromEntries(
      header.split(',').map((part) => {
        const [key, ...rest] = part.trim().split('=');
        return [key ?? '', rest.join('=')];
      }),
    );

    const timestamp = Number(parts.t);
    const signature = parts.v1;

    if (!Number.isInteger(timestamp) || !signature) {
      return null;
    }

    return { timestamp, signature };
  }
}
