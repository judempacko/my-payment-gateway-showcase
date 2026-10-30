import type {
  CreatePaymentRequest,
  ListPaymentsResponse,
  Payment,
  PaymentEvent,
  PaymentProvider,
  PaymentStats,
  PaymentStatsDays,
  PaymentStatus,
  Product,
  ProviderInfo,
  WebhookRecord,
} from '@pay/contracts';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
export const API_DOCS_URL = `${API_URL.replace(/\/api\/v\d+\/?$/, '')}/docs`;

const DEMO_KEY = process.env.NEXT_PUBLIC_DEMO_API_KEY ?? 'demo_sk_local';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = RequestInit & { mutation?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { mutation = false, headers, ...rest } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...(mutation ? { 'x-demo-key': DEMO_KEY } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;

    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      // Keep the HTTP status text when the body is not JSON.
    }

    throw new ApiError(response.status, message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getProducts(): Promise<Product[]> {
  return request<Product[]>('/products');
}

export function getProviders(): Promise<ProviderInfo[]> {
  return request<ProviderInfo[]>('/providers');
}

export function getPayments(params: {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  limit?: number;
  cursor?: string;
  page?: number;
}): Promise<ListPaymentsResponse> {
  const search = new URLSearchParams();

  if (params.status) search.set('status', params.status);
  if (params.provider) search.set('provider', params.provider);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.page) search.set('page', String(params.page));

  const query = search.toString();
  return request<ListPaymentsResponse>(`/payments${query ? `?${query}` : ''}`);
}

export function getPaymentStats(days: PaymentStatsDays): Promise<PaymentStats> {
  return request<PaymentStats>(`/payments/stats?days=${days}`);
}

export function getPayment(id: string): Promise<Payment> {
  return request<Payment>(`/payments/${id}`);
}

export function getPaymentTimeline(id: string): Promise<PaymentEvent[]> {
  return request<PaymentEvent[]>(`/payments/${id}/timeline`);
}

export function getPaymentWebhooks(id: string): Promise<WebhookRecord[]> {
  return request<WebhookRecord[]>(`/payments/${id}/webhooks`);
}

export function createPayment(
  input: CreatePaymentRequest,
  idempotencyKey: string,
): Promise<Payment> {
  return request<Payment>('/payments', {
    method: 'POST',
    mutation: true,
    headers: { 'idempotency-key': idempotencyKey },
    body: JSON.stringify(input),
  });
}

export function simulatePayment(
  id: string,
  outcome: 'succeeded' | 'failed' | 'expired',
): Promise<{ accepted: boolean; webhookEventId: string | null; duplicate: boolean }> {
  return request(`/payments/${id}/simulate`, {
    method: 'POST',
    mutation: true,
    body: JSON.stringify({ outcome }),
  });
}

export type HealthSnapshot = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  queue: { waiting: number; active: number; failed: number; completed: number };
  latencyMs: number;
  error?: string;
};

export function getHealth(): Promise<HealthSnapshot> {
  return request<HealthSnapshot>('/health');
}
