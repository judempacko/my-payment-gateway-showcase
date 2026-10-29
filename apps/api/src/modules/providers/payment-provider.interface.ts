import type {
  Customer,
  NextAction,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@pay/contracts';

export type RawWebhookContext = {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
  method?: string;
  path?: string;
  authority?: string;
};

export type ProviderCapabilities = {
  methods: readonly PaymentMethod[];
  currencies: readonly string[];
  countries: readonly string[];
  partialRefunds: boolean;
  hostedCheckout: boolean;
  requiresCustomerAction: boolean;
};

export type InitializePaymentInput = {
  paymentId: string;
  amountMinor: bigint;
  currency: string;
  method: PaymentMethod;
  productName: string;
  quantity: number;
  customer: Customer;
  metadata: Record<string, unknown>;
};

export type ProviderPaymentResult = {
  providerRef: string;
  status: PaymentStatus;
  nextAction: NextAction | null;
  rawStatus?: string;
  raw?: Record<string, unknown>;
};

export type ProviderPaymentSnapshot = {
  providerRef: string;
  status: PaymentStatus;
  amountMinor: bigint;
  currency: string;
  updatedAt: Date;
};

export type ProviderRefundInput = {
  paymentId: string;
  providerRef: string;
  amountMinor: bigint;
  currency: string;
  reason?: string;
};

export type ProviderRefundResult = {
  providerRefundId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
};

export type NormalizedWebhookEvent = {
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  paymentId: string | null;
  providerRef: string | null;
  status: PaymentStatus;
  amountMinor: string;
  currency: string;
  occurredAt: Date;
  raw: Record<string, unknown>;
};

export interface PaymentProviderPort {
  readonly id: PaymentProvider;
  readonly configured: boolean;
  readonly capabilities: ProviderCapabilities;
  initializePayment(input: InitializePaymentInput): Promise<ProviderPaymentResult>;
  getPayment(providerRef: string): Promise<ProviderPaymentSnapshot>;
  refund(input: ProviderRefundInput): Promise<ProviderRefundResult>;
  verifyWebhook(context: RawWebhookContext): Promise<boolean>;
  parseWebhook(context: RawWebhookContext): Promise<NormalizedWebhookEvent>;
}
