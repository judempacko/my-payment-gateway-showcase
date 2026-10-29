import type { Payment, PaymentEvent, Product, ProviderInfo, WebhookRecord } from '@pay/contracts';

const API_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

async function serverRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getProductsServer(): Promise<Product[]> {
  return serverRequest<Product[]>('/products');
}

export function getProvidersServer(): Promise<ProviderInfo[]> {
  return serverRequest<ProviderInfo[]>('/providers');
}

export function getPaymentServer(id: string): Promise<Payment> {
  return serverRequest<Payment>(`/payments/${id}`);
}

export function getPaymentTimelineServer(id: string): Promise<PaymentEvent[]> {
  return serverRequest<PaymentEvent[]>(`/payments/${id}/timeline`);
}

export function getPaymentWebhooksServer(id: string): Promise<WebhookRecord[]> {
  return serverRequest<WebhookRecord[]>(`/payments/${id}/webhooks`);
}
