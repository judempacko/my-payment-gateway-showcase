export const PaymentProvider = {
  MOCK: 'mock',
  STRIPE: 'stripe',
  PAWAPAY: 'pawapay',
} as const;

export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];
export const PAYMENT_PROVIDERS = Object.values(PaymentProvider);

export const PaymentMethod = {
  CARD: 'card',
  MOBILE_MONEY: 'mobile_money',
  MOCK: 'mock',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PAYMENT_METHODS = Object.values(PaymentMethod);

export const PaymentStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  REQUIRES_ACTION: 'REQUIRES_ACTION',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELED: 'CANCELED',
  REFUND_PENDING: 'REFUND_PENDING',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export const PAYMENT_STATUSES = Object.values(PaymentStatus);

export const PaymentEventType = {
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_REQUIRES_ACTION: 'PAYMENT_REQUIRES_ACTION',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  PAYMENT_SUCCEEDED: 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
  PAYMENT_CANCELED: 'PAYMENT_CANCELED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_SUCCEEDED: 'REFUND_SUCCEEDED',
  REFUND_FAILED: 'REFUND_FAILED',
} as const;

export type PaymentEventType = (typeof PaymentEventType)[keyof typeof PaymentEventType];

export const EVENT_TYPE_BY_STATUS: Record<PaymentStatus, PaymentEventType> = {
  CREATED: 'PAYMENT_CREATED',
  PENDING: 'PAYMENT_PENDING',
  REQUIRES_ACTION: 'PAYMENT_REQUIRES_ACTION',
  PROCESSING: 'PAYMENT_PROCESSING',
  SUCCEEDED: 'PAYMENT_SUCCEEDED',
  FAILED: 'PAYMENT_FAILED',
  EXPIRED: 'PAYMENT_EXPIRED',
  CANCELED: 'PAYMENT_CANCELED',
  REFUND_PENDING: 'REFUND_REQUESTED',
  PARTIALLY_REFUNDED: 'REFUND_SUCCEEDED',
  REFUNDED: 'REFUND_SUCCEEDED',
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  CREATED: ['PENDING', 'REQUIRES_ACTION', 'PROCESSING', 'FAILED', 'EXPIRED', 'CANCELED'],
  PENDING: ['REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED'],
  REQUIRES_ACTION: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED'],
  PROCESSING: ['SUCCEEDED', 'FAILED', 'EXPIRED'],
  SUCCEEDED: ['REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  FAILED: [],
  EXPIRED: [],
  CANCELED: [],
  REFUND_PENDING: ['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUND_PENDING', 'REFUNDED'],
  REFUNDED: [],
};

export const TERMINAL_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
  PaymentStatus.CANCELED,
  PaymentStatus.REFUNDED,
];

export const SETTLED_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
  PaymentStatus.CANCELED,
  PaymentStatus.REFUNDED,
];

export const SUCCESS_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.SUCCEEDED,
  PaymentStatus.REFUND_PENDING,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
];

export const FAILED_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
  PaymentStatus.CANCELED,
];

export const IN_FLIGHT_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.CREATED,
  PaymentStatus.PENDING,
  PaymentStatus.REQUIRES_ACTION,
  PaymentStatus.PROCESSING,
];

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isSettledStatus(status: PaymentStatus): boolean {
  return SETTLED_STATUSES.includes(status);
}

export type Customer = {
  name: string;
  email: string;
  phone?: string;
  country?: string;
};

export type Money = {
  amountMinor: string;
  currency: string;
};

export type NextAction =
  | { type: 'mock_approval'; paymentId: string; providerRef: string }
  | { type: 'redirect'; url: string }
  | { type: 'client_secret'; clientSecret: string; publishableKey?: string }
  | { type: 'ussd'; instructions: string; expiresAt?: string }
  | { type: 'none' };

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  amountMinor: string;
  currency: string;
};

export type Payment = {
  id: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  method: PaymentMethod;
  amountMinor: string;
  currency: string;
  productId: string;
  quantity: number;
  customer: Customer;
  providerRef: string | null;
  nextAction: NextAction | null;
  metadata: Record<string, unknown>;
  lastEventAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PaymentEvent = {
  id: string;
  paymentId: string;
  sequence: number;
  type: PaymentEventType;
  source: string;
  fromStatus: PaymentStatus | null;
  toStatus: PaymentStatus | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ProviderInfo = {
  id: PaymentProvider;
  methods: PaymentMethod[];
  currencies: string[];
  countries: string[];
  partialRefunds: boolean;
  hostedCheckout: boolean;
  requiresCustomerAction: boolean;
};

export type WebhookRecord = {
  id: string;
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  paymentId: string | null;
  signatureValid: boolean;
  headers: Record<string, unknown>;
  payload: Record<string, unknown>;
  rawBody: string;
  receivedAt: string;
  processedAt: string | null;
  processingError: string | null;
  attempts: number;
};

export type CreatePaymentRequest = {
  productId: string;
  quantity: number;
  provider: PaymentProvider;
  method: PaymentMethod;
  customer: Customer;
  metadata?: Record<string, unknown>;
};

export type ListPaymentsQuery = {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  limit?: number;
  cursor?: string;
  page?: number;
};

export type ListPaymentsResponse = {
  items: Payment[];
  nextCursor: string | null;
  page?: number;
  pageSize?: number;
  total?: number;
  pageCount?: number;
};

export type PaymentStatsDays = 7 | 30;

export type PaymentStatsMoney = {
  currency: string;
  amountMinor: string;
};

export type PaymentStatsTrendPoint = {
  date: string;
  succeeded: number;
  failed: number;
};

export type PaymentStatsProvider = {
  provider: PaymentProvider;
  payments: number;
  succeeded: number;
  successRate: number | null;
};

export type PaymentStatsWebhooks = {
  processed: number;
  pending: number;
  failed: number;
  lastReceivedAt: string | null;
  lastErrorAt: string | null;
};

export type PaymentStats = {
  generatedAt: string;
  totals: {
    payments: number;
    succeeded: number;
    inFlight: number;
    failed: number;
    settled: number;
    successRate: number | null;
    volume: PaymentStatsMoney[];
  };
  window: {
    days: PaymentStatsDays;
    since: string;
    until: string;
    series: PaymentStatsTrendPoint[];
  };
  providers: PaymentStatsProvider[];
  webhooks: PaymentStatsWebhooks;
};

export type ApiError = {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId?: string;
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function currencyExponent(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

export function minorToDecimalString(amountMinor: bigint | string, currency: string): string {
  const value = typeof amountMinor === 'bigint' ? amountMinor : BigInt(amountMinor);
  const digits = currencyExponent(currency);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const prefix = negative ? '-' : '';

  if (digits === 0) {
    return `${prefix}${absolute.toString()}`;
  }

  const padded = absolute.toString().padStart(digits + 1, '0');
  return `${prefix}${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}

export function decimalToMinorString(amount: string, currency: string): string {
  const normalized = amount.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal amount: ${amount}`);
  }

  const [whole = '0', fraction = ''] = normalized.split('.');
  const digits = currencyExponent(currency);

  if (fraction.length > digits) {
    throw new Error(`Currency ${currency} supports at most ${digits} decimal places`);
  }

  const padded = fraction.padEnd(digits, '0');
  const minor = BigInt(whole) * 10n ** BigInt(digits) + BigInt(padded || '0');
  return minor.toString();
}
