import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../../config/env';
import { MockPaymentProvider } from './mock.provider';

const payment = {
  id: '10000000-0000-7000-8000-000000000001',
  providerRef: 'mock_provider_ref',
  amountMinor: 4900n,
  currency: 'EUR',
  customer: { name: 'Ada Lovelace', email: 'ada@example.com' },
};

function createProvider(): MockPaymentProvider {
  const config = {
    get: () => 'whsec_test_secret',
  } as unknown as ConfigService<Env, true>;

  return new MockPaymentProvider(config);
}

describe('MockPaymentProvider webhooks', () => {
  it('signs and parses a valid callback', async () => {
    const provider = createProvider();
    const webhook = provider.buildSignedWebhook(payment, 'succeeded');
    const context = {
      headers: webhook.headers,
      rawBody: Buffer.from(webhook.rawBody, 'utf8'),
    };

    await expect(provider.verifyWebhook(context)).resolves.toBe(true);

    const parsed = await provider.parseWebhook(context);
    expect(parsed.providerEventId).toBeTruthy();
    expect(parsed.paymentId).toBe(payment.id);
    expect(parsed.status).toBe('SUCCEEDED');
    expect(parsed.amountMinor).toBe('4900');
    expect(parsed.currency).toBe('EUR');
  });

  it('rejects a tampered body', async () => {
    const provider = createProvider();
    const webhook = provider.buildSignedWebhook(payment, 'succeeded');
    const tampered = Buffer.from(webhook.rawBody.replace('4900', '1'), 'utf8');

    await expect(
      provider.verifyWebhook({ headers: webhook.headers, rawBody: tampered }),
    ).resolves.toBe(false);
  });

  it('rejects a stale timestamp', async () => {
    const provider = createProvider();
    const webhook = provider.buildSignedWebhook(payment, 'succeeded');
    const stale = webhook.headers['x-mock-signature']?.replace(
      /t=\d+/,
      `t=${Math.floor(Date.now() / 1000) - 3_600}`,
    );

    await expect(
      provider.verifyWebhook({
        headers: { ...webhook.headers, 'x-mock-signature': stale ?? '' },
        rawBody: Buffer.from(webhook.rawBody, 'utf8'),
      }),
    ).resolves.toBe(false);
  });
});
