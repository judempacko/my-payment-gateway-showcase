import { ConfigService } from '@nestjs/config';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../../config/env';
import {
  PawaPayPaymentProvider,
  mapPawaPayDepositStatus,
  normalizePhone,
} from './pawapay.provider';

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function provider(overrides: Record<string, unknown> = {}): PawaPayPaymentProvider {
  const values: Record<string, unknown> = {
    PAWAPAY_API_TOKEN: 'sandbox-token',
    PAWAPAY_BASE_URL: 'https://api.sandbox.pawapay.io',
    PAWAPAY_DEFAULT_COUNTRY: 'SN',
    PAWAPAY_PUBLIC_KEY: publicKey,
    PAWAPAY_ALLOW_UNSIGNED_CALLBACKS: false,
    ...overrides,
  };
  const config = { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>;
  return new PawaPayPaymentProvider(config);
}

function signedCallback(paymentId: string, depositId: string, bodyOverride?: string) {
  const rawBody =
    bodyOverride ??
    JSON.stringify({
      depositId,
      status: 'COMPLETED',
      amount: '5000',
      currency: 'XOF',
      created: '2026-10-28T12:00:00Z',
      clientReferenceId: paymentId,
      providerTransactionId: 'tx-1',
    });
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureDate = new Date(timestamp * 1000).toISOString();
  const contentType = 'application/json; charset=UTF-8';
  const contentDigest = `sha-256=:${createHash('sha256').update(rawBody).digest('base64')}:`;
  const params =
    `("@method" "@authority" "@path" "signature-date" "content-digest" "content-type")` +
    `;alg="ecdsa-p256-sha256";keyid="test-key";created=${timestamp};expires=${timestamp + 60}`;
  const signatureBase = [
    '"@method": POST',
    '"@authority": localhost:3001',
    '"@path": /api/v1/webhooks/pawapay',
    `"signature-date": ${signatureDate}`,
    `"content-digest": ${contentDigest}`,
    `"content-type": ${contentType}`,
    `"@signature-params": ${params}`,
  ].join('\n');
  const signature = sign('sha256', Buffer.from(signatureBase), privateKey).toString('base64');

  return {
    rawBody,
    headers: {
      signature: `sig-pp=:${signature}:`,
      'signature-input': `sig-pp=${params}`,
      'signature-date': signatureDate,
      'content-digest': contentDigest,
      'content-type': contentType,
      host: 'localhost:3001',
    },
  };
}

describe('PawaPay provider', () => {
  it('verifies and parses an RFC 9421 signed deposit callback', async () => {
    const paymentId = randomUUID();
    const depositId = randomUUID();
    const callback = signedCallback(paymentId, depositId);
    const client = provider();

    await expect(
      client.verifyWebhook({
        headers: callback.headers,
        rawBody: Buffer.from(callback.rawBody),
        method: 'POST',
        path: '/api/v1/webhooks/pawapay',
        authority: 'localhost:3001',
      }),
    ).resolves.toBe(true);

    const normalized = await client.parseWebhook({
      headers: callback.headers,
      rawBody: Buffer.from(callback.rawBody),
      method: 'POST',
      path: '/api/v1/webhooks/pawapay',
      authority: 'localhost:3001',
    });

    expect(normalized.status).toBe('SUCCEEDED');
    expect(normalized.amountMinor).toBe('5000');
    expect(normalized.currency).toBe('XOF');
    expect(normalized.paymentId).toBe(paymentId);
    expect(normalized.providerRef).toBe(depositId);
    expect(normalized.eventType).toBe('PAYMENT_SUCCEEDED');
  });

  it('rejects a tampered callback', async () => {
    const callback = signedCallback(randomUUID(), randomUUID());
    const client = provider();

    await expect(
      client.verifyWebhook({
        headers: callback.headers,
        rawBody: Buffer.from(callback.rawBody.replace('5000', '1')),
        method: 'POST',
        path: '/api/v1/webhooks/pawapay',
        authority: 'localhost:3001',
      }),
    ).resolves.toBe(false);
  });

  it('accepts unsigned callbacks only when explicitly allowed', async () => {
    const context = {
      headers: { 'content-type': 'application/json' },
      rawBody: Buffer.from('{}'),
    };

    await expect(provider().verifyWebhook(context)).resolves.toBe(false);
    await expect(
      provider({ PAWAPAY_ALLOW_UNSIGNED_CALLBACKS: true }).verifyWebhook(context),
    ).resolves.toBe(true);
  });

  it('normalizes phones and statuses', () => {
    expect(normalizePhone('+221 77 345 6789', '221')).toBe('221773456789');
    expect(normalizePhone('0773456789', '221')).toBe('221773456789');
    expect(mapPawaPayDepositStatus('COMPLETED')).toBe('SUCCEEDED');
    expect(mapPawaPayDepositStatus('FAILED')).toBe('FAILED');
    expect(mapPawaPayDepositStatus('PROCESSING')).toBe('PROCESSING');
  });
});
