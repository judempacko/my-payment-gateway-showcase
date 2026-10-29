#!/usr/bin/env node

import { createHmac, randomUUID } from 'node:crypto';

const API_URL = process.env.API_URL ?? 'http://localhost:3001/api/v1';
const DEMO_KEY = process.env.DEMO_API_KEY ?? 'demo_sk_local';
const SECRET = process.env.MOCK_WEBHOOK_SECRET ?? 'whsec_mock_local_secret';
const REQUESTS = Number(process.env.RACE_REQUESTS ?? 50);

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} -> ${response.status}: ${body?.message ?? ''}`,
    );
  }

  return body;
}

function signedWebhook(payment) {
  const payload = {
    eventId: randomUUID(),
    type: 'payment.succeeded',
    paymentId: payment.id,
    providerRef: payment.providerRef,
    status: 'SUCCEEDED',
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    occurredAt: new Date().toISOString(),
  };
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', SECRET).update(`${timestamp}.${rawBody}`).digest('hex');

  return {
    rawBody,
    headers: { 'x-mock-signature': `t=${timestamp},v1=${signature}` },
  };
}

async function main() {
  console.log(`API: ${API_URL}`);
  console.log(`Sending ${REQUESTS} concurrent signed webhooks…`);

  const payment = await request('/payments', {
    method: 'POST',
    headers: {
      'x-demo-key': DEMO_KEY,
      'idempotency-key': `race-${randomUUID()}`,
    },
    body: JSON.stringify({
      productId: '00000000-0000-7000-8000-000000000001',
      quantity: 1,
      provider: 'mock',
      method: 'card',
      customer: { name: 'Race Condition', email: 'race@example.com' },
    }),
  });

  if (payment.status !== 'PENDING') {
    throw new Error(`Expected PENDING after creation, got ${payment.status}`);
  }

  const webhooks = Array.from({ length: REQUESTS }, () => signedWebhook(payment));

  const statuses = await Promise.all(
    webhooks.map(({ rawBody, headers }) =>
      request('/webhooks/mock', { method: 'POST', headers, body: rawBody }).then(
        () => '200',
        (error) => `error:${error.message}`,
      ),
    ),
  );

  const accepted = statuses.filter((status) => status === '200').length;
  console.log(`Accepted webhooks: ${accepted}/${REQUESTS}`);

  let finalPayment = payment;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    finalPayment = await request(`/payments/${payment.id}`);
    if (finalPayment.status === 'SUCCEEDED') break;
  }

  const timeline = await request(`/payments/${payment.id}/timeline`);
  const transitions = timeline.filter((event) => event.type === 'PAYMENT_SUCCEEDED');
  const webhookRows = await request(`/payments/${payment.id}/webhooks`);

  console.log(`Payment: ${payment.id}`);
  console.log(`Final status: ${finalPayment.status} (version ${finalPayment.version})`);
  console.log(`PAYMENT_SUCCEEDED transitions: ${transitions.length}`);
  console.log(`Webhook inbox rows: ${webhookRows.length}`);

  const pass =
    accepted === REQUESTS &&
    finalPayment.status === 'SUCCEEDED' &&
    transitions.length === 1 &&
    webhookRows.length === REQUESTS;

  if (!pass) {
    console.error('FAIL: expected exactly one success transition and one inbox row per webhook.');
    process.exitCode = 1;
    return;
  }

  console.log('PASS: concurrency did not double-credit the payment.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
