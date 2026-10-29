import {
  EVENT_TYPE_BY_STATUS,
  PaymentProvider,
  decimalToMinorString,
  minorToDecimalString,
  type PaymentStatus,
} from '@pay/contracts';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createPublicKey,
  randomUUID,
  timingSafeEqual,
  verify as verifySignature,
} from 'node:crypto';
import { z } from 'zod';
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

type CountryConfig = {
  country: string;
  provider: string;
  dialingCode: string;
};

export const PAWAPAY_COUNTRIES: Record<string, CountryConfig> = {
  SN: { country: 'SEN', provider: 'ORANGE_SEN', dialingCode: '221' },
  CI: { country: 'CIV', provider: 'ORANGE_CIV', dialingCode: '225' },
  CM: { country: 'CMR', provider: 'MTN_MOMO_CMR', dialingCode: '237' },
  NG: { country: 'NGA', provider: 'MTN_MOMO_NGA', dialingCode: '234' },
  GH: { country: 'GHA', provider: 'MTN_MOMO_GHA', dialingCode: '233' },
  ZM: { country: 'ZMB', provider: 'MTN_MOMO_ZMB', dialingCode: '260' },
  KE: { country: 'KEN', provider: 'MPESA_KEN', dialingCode: '254' },
  BJ: { country: 'BEN', provider: 'MTN_MOMO_BEN', dialingCode: '229' },
  BF: { country: 'BFA', provider: 'ORANGE_BFA', dialingCode: '226' },
  CD: { country: 'COD', provider: 'VODACOM_MPESA_COD', dialingCode: '243' },
  RW: { country: 'RWA', provider: 'MTN_MOMO_RWA', dialingCode: '250' },
  UG: { country: 'UGA', provider: 'MTN_MOMO_UGA', dialingCode: '256' },
  MW: { country: 'MWI', provider: 'AIRTEL_MWI', dialingCode: '265' },
  MZ: { country: 'MOZ', provider: 'MOVITEL_MOZ', dialingCode: '258' },
  SL: { country: 'SLE', provider: 'ORANGE_SLE', dialingCode: '232' },
  LS: { country: 'LSO', provider: 'MPESA_LSO', dialingCode: '266' },
  ET: { country: 'ETH', provider: 'MPESA_ETH', dialingCode: '251' },
  ZW: { country: 'ZWE', provider: 'ECOCASH_ZWE', dialingCode: '263' },
  GA: { country: 'GAB', provider: 'AIRTEL_GAB', dialingCode: '241' },
  CG: { country: 'COG', provider: 'AIRTEL_COG', dialingCode: '242' },
  TZ: { country: 'TZA', provider: 'AIRTEL_TZA', dialingCode: '255' },
};

const PAWAPAY_CURRENCIES = [
  'XOF',
  'XAF',
  'NGN',
  'GHS',
  'KES',
  'ZMW',
  'CDF',
  'RWF',
  'UGX',
  'MWK',
  'MZN',
  'SLE',
  'LSL',
  'ETB',
  'USD',
];

const depositInitiationSchema = z.object({
  depositId: z.string().uuid(),
  status: z.enum(['ACCEPTED', 'REJECTED', 'DUPLICATE_IGNORED']),
  created: z.string().optional(),
  failureReason: z
    .object({
      failureCode: z.string(),
      failureMessage: z.string().optional(),
    })
    .optional(),
});

const depositSearchSchema = z.object({
  status: z.enum(['FOUND', 'NOT_FOUND']),
  data: z
    .object({
      depositId: z.string(),
      status: z.enum(['ACCEPTED', 'PROCESSING', 'IN_RECONCILIATION', 'COMPLETED', 'FAILED']),
      amount: z.string(),
      currency: z.string().length(3),
      created: z.string().optional(),
    })
    .optional(),
});

const depositCallbackSchema = z
  .object({
    depositId: z.string().uuid(),
    status: z.string(),
    amount: z.string(),
    currency: z.string().length(3),
    created: z.string().optional(),
    clientReferenceId: z.string().optional(),
    providerTransactionId: z.string().optional(),
    metadata: z.unknown().optional(),
  })
  .passthrough();

const refundResponseSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'DUPLICATE_IGNORED']),
  failureReason: z
    .object({
      failureCode: z.string(),
      failureMessage: z.string().optional(),
    })
    .optional(),
  rejectionReason: z
    .object({
      rejectionCode: z.string(),
      rejectionMessage: z.string().optional(),
    })
    .optional(),
});

type PublicKey = { id: string; key: string };

export function normalizePhone(phone: string | undefined, dialingCode: string): string {
  if (!phone) {
    throw new BadRequestException('A phone number is required for mobile money');
  }

  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!digits.startsWith(dialingCode)) {
    digits = `${dialingCode}${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) {
    throw new BadRequestException('Phone number must be a valid MSISDN');
  }

  return digits;
}

export function mapPawaPayDepositStatus(status: string): PaymentStatus {
  switch (status) {
    case 'ACCEPTED':
      return 'PENDING';
    case 'PROCESSING':
    case 'IN_RECONCILIATION':
      return 'PROCESSING';
    case 'COMPLETED':
      return 'SUCCEEDED';
    case 'FAILED':
    case 'REJECTED':
      return 'FAILED';
    default:
      throw new IgnoredWebhookError(`Unsupported PawaPay deposit status: ${status}`);
  }
}

@Injectable()
export class PawaPayPaymentProvider implements PaymentProviderPort {
  readonly id = PaymentProvider.PAWAPAY;
  readonly configured: boolean;

  readonly capabilities: ProviderCapabilities = {
    methods: ['mobile_money'],
    currencies: PAWAPAY_CURRENCIES,
    countries: Object.keys(PAWAPAY_COUNTRIES),
    partialRefunds: true,
    hostedCheckout: false,
    requiresCustomerAction: true,
  };

  private readonly logger = new Logger(PawaPayPaymentProvider.name);
  private readonly token: string | null;
  private readonly baseUrl: string;
  private readonly defaultCountry: string;
  private readonly providerOverride: string | null;
  private readonly publicKeyPem: string | null;
  private readonly allowUnsignedCallbacks: boolean;
  private publicKeysCache: { fetchedAt: number; keys: PublicKey[] } | null = null;
  private publicKeysPromise: Promise<PublicKey[]> | null = null;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get('PAWAPAY_API_TOKEN', { infer: true })?.trim() || null;
    this.baseUrl = config.get('PAWAPAY_BASE_URL', { infer: true }).replace(/\/$/, '');
    this.defaultCountry = config.get('PAWAPAY_DEFAULT_COUNTRY', { infer: true }).toUpperCase();
    this.providerOverride =
      config.get('PAWAPAY_PROVIDER', { infer: true })?.trim().toUpperCase() || null;
    this.publicKeyPem = config.get('PAWAPAY_PUBLIC_KEY', { infer: true })?.trim() || null;
    this.allowUnsignedCallbacks = config.get('PAWAPAY_ALLOW_UNSIGNED_CALLBACKS', {
      infer: true,
    });
    this.configured = Boolean(this.token);

    if (this.allowUnsignedCallbacks) {
      this.logger.warn(
        'PawaPay unsigned callbacks are enabled. Use this only for local sandbox testing.',
      );
    }
  }

  async initializePayment(input: InitializePaymentInput): Promise<ProviderPaymentResult> {
    const { provider, dialingCode } = this.resolveProvider(input.customer.country);
    const phoneNumber = normalizePhone(input.customer.phone, dialingCode);
    const depositId = randomUUID();

    const response = await this.request<z.infer<typeof depositInitiationSchema>>('/v2/deposits', {
      method: 'POST',
      body: JSON.stringify({
        depositId,
        amount: minorToDecimalString(input.amountMinor, input.currency),
        currency: input.currency.toUpperCase(),
        payer: {
          type: 'MMO',
          accountDetails: { phoneNumber, provider },
        },
        clientReferenceId: input.paymentId,
        customerMessage: 'Payment showcase',
      }),
    });

    const parsed = depositInitiationSchema.safeParse(response);

    if (!parsed.success) {
      throw new Error('PawaPay returned an invalid deposit initiation response');
    }

    const status: PaymentStatus = parsed.data.status === 'REJECTED' ? 'FAILED' : 'PENDING';

    return {
      providerRef: parsed.data.depositId,
      status,
      nextAction:
        status === 'PENDING'
          ? {
              type: 'ussd',
              instructions: `Approve the ${minorToDecimalString(input.amountMinor, input.currency)} ${input.currency} payment on your phone.`,
            }
          : null,
      rawStatus: parsed.data.status,
      raw: parsed.data as Record<string, unknown>,
    };
  }

  async getPayment(providerRef: string): Promise<ProviderPaymentSnapshot> {
    const response = await this.request<z.infer<typeof depositSearchSchema>>(
      `/v2/deposits/${encodeURIComponent(providerRef)}`,
      { method: 'GET' },
    );
    const parsed = depositSearchSchema.safeParse(response);

    if (!parsed.success || parsed.data.status !== 'FOUND' || !parsed.data.data) {
      throw new Error(`PawaPay deposit ${providerRef} was not found`);
    }

    return {
      providerRef,
      status: mapPawaPayDepositStatus(parsed.data.data.status),
      amountMinor: BigInt(decimalToMinorString(parsed.data.data.amount, parsed.data.data.currency)),
      currency: parsed.data.data.currency.toUpperCase(),
      updatedAt: parsed.data.data.created ? new Date(parsed.data.data.created) : new Date(),
    };
  }

  async refund(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    const refundId = randomUUID();
    const response = await this.request<z.infer<typeof refundResponseSchema>>('/v2/refunds', {
      method: 'POST',
      body: JSON.stringify({
        refundId,
        depositId: input.providerRef,
        amount: minorToDecimalString(input.amountMinor, input.currency),
        currency: input.currency.toUpperCase(),
      }),
    });
    const parsed = refundResponseSchema.safeParse(response);

    if (!parsed.success) {
      throw new Error('PawaPay returned an invalid refund response');
    }

    return {
      providerRefundId: refundId,
      status: parsed.data.status === 'REJECTED' ? 'FAILED' : 'PENDING',
    };
  }

  async verifyWebhook(context: RawWebhookContext): Promise<boolean> {
    const signature = firstHeader(context.headers['signature']);
    const signatureInput = firstHeader(context.headers['signature-input']);

    if (!signature || !signatureInput) {
      return this.allowUnsignedCallbacks;
    }

    try {
      return await this.verifyRfc9421Signature(context, signature, signatureInput);
    } catch (error) {
      this.logger.warn(`PawaPay webhook signature verification failed: ${String(error)}`);
      return false;
    }
  }

  async parseWebhook(context: RawWebhookContext): Promise<NormalizedWebhookEvent> {
    let body: Record<string, unknown>;

    try {
      const parsed = JSON.parse(context.rawBody.toString('utf8')) as unknown;

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Payload is not an object');
      }

      body = parsed as Record<string, unknown>;
    } catch {
      throw new IgnoredWebhookError('Malformed PawaPay callback');
    }

    if (typeof body.refundId === 'string' || typeof body.payoutId === 'string') {
      throw new IgnoredWebhookError('PawaPay refund callbacks are handled separately');
    }

    const parsed = depositCallbackSchema.safeParse(body);

    if (!parsed.success) {
      throw new IgnoredWebhookError('Unsupported PawaPay callback');
    }

    const status = mapPawaPayDepositStatus(parsed.data.status);
    const metadata =
      parsed.data.metadata &&
      typeof parsed.data.metadata === 'object' &&
      !Array.isArray(parsed.data.metadata)
        ? (parsed.data.metadata as Record<string, unknown>)
        : undefined;
    const metadataPaymentId = typeof metadata?.paymentId === 'string' ? metadata.paymentId : null;
    const occurredAt = parsed.data.created ? new Date(parsed.data.created) : new Date();

    return {
      provider: this.id,
      providerEventId: `${parsed.data.depositId}:${parsed.data.status}`,
      eventType: EVENT_TYPE_BY_STATUS[status],
      paymentId: parsed.data.clientReferenceId ?? metadataPaymentId,
      providerRef: parsed.data.depositId,
      status,
      amountMinor: decimalToMinorString(parsed.data.amount, parsed.data.currency),
      currency: parsed.data.currency.toUpperCase(),
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      raw: body,
    };
  }

  private resolveProvider(countryCode: string | undefined): CountryConfig {
    const requested = (countryCode || this.defaultCountry).toUpperCase();
    const entry =
      requested.length === 3
        ? Object.entries(PAWAPAY_COUNTRIES).find(([, value]) => value.country === requested)
        : undefined;
    const alpha2 = entry?.[0] ?? requested;
    const config = PAWAPAY_COUNTRIES[alpha2];

    if (!config) {
      throw new BadRequestException(
        `PawaPay does not support country ${requested} in this demo. Configure PAWAPAY_PROVIDER or use a supported country.`,
      );
    }

    return {
      ...config,
      provider: this.providerOverride ?? config.provider,
    };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.token) {
      throw new ServiceUnavailableException('PawaPay adapter is not configured');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      const reason =
        (body?.failureReason as Record<string, unknown> | undefined)?.failureMessage ??
        (body?.failureReason as Record<string, unknown> | undefined)?.failureCode ??
        (body?.rejectionReason as Record<string, unknown> | undefined)?.rejectionMessage ??
        response.statusText;
      throw new Error(`PawaPay ${response.status}: ${String(reason)}`);
    }

    return body as T;
  }

  private async verifyRfc9421Signature(
    context: RawWebhookContext,
    signatureHeader: string,
    signatureInput: string,
  ): Promise<boolean> {
    const signatureDate = firstHeader(context.headers['signature-date']);
    const contentDigest = firstHeader(context.headers['content-digest']);
    const contentType = firstHeader(context.headers['content-type']);

    if (!signatureDate || !contentDigest || !contentType) {
      return false;
    }

    const equalsIndex = signatureInput.indexOf('=');

    if (equalsIndex <= 0) {
      return false;
    }

    const label = signatureInput.slice(0, equalsIndex).trim();
    const signatureParams = signatureInput.slice(equalsIndex + 1).trim();
    const algorithm = signatureParams.match(/alg="([^"]+)"/)?.[1];
    const keyId = signatureParams.match(/keyid="([^"]+)"/)?.[1];
    const created = Number(signatureParams.match(/(?:^|;)\s*created=(\d+)/)?.[1] ?? NaN);
    const expires = Number(signatureParams.match(/(?:^|;)\s*expires=(\d+)/)?.[1] ?? NaN);
    const now = Math.floor(Date.now() / 1000);

    if (algorithm !== 'ecdsa-p256-sha256') {
      return false;
    }

    if (Number.isFinite(expires) && now > expires + 30) {
      return false;
    }

    if (Number.isFinite(created) && now < created - 30) {
      return false;
    }

    const digestMatch = contentDigest.match(/sha-(256|512)=:([^:]+):/);

    if (!digestMatch) {
      return false;
    }

    const digestAlgorithm = `sha${digestMatch[1]}`;
    const expectedDigest = Buffer.from(digestMatch[2] ?? '', 'base64');
    const actualDigest = createHash(digestAlgorithm).update(context.rawBody).digest();

    if (
      expectedDigest.length !== actualDigest.length ||
      !timingSafeEqual(expectedDigest, actualDigest)
    ) {
      return false;
    }

    const signatureMatch =
      signatureHeader.match(new RegExp(`${escapeRegExp(label)}=:([^:]+):`)) ??
      signatureHeader.match(/=:([^:]+):/);

    if (!signatureMatch?.[1]) {
      return false;
    }

    const authority = (
      context.authority ??
      firstHeader(context.headers['x-forwarded-host']) ??
      firstHeader(context.headers.host) ??
      ''
    )
      .split(',')[0]
      ?.trim();
    const path = (context.path ?? '/api/v1/webhooks/pawapay').split('?')[0] ?? '';
    const method = (context.method ?? 'POST').toUpperCase();
    const signatureBase = [
      `"@method": ${method}`,
      `"@authority": ${authority}`,
      `"@path": ${path}`,
      `"signature-date": ${signatureDate}`,
      `"content-digest": ${contentDigest}`,
      `"content-type": ${contentType}`,
      `"@signature-params": ${signatureParams}`,
    ].join('\n');

    const pem = await this.getPublicKey(keyId);

    if (!pem) {
      return false;
    }

    try {
      return verifySignature(
        'sha256',
        Buffer.from(signatureBase),
        { key: createPublicKey(pem), dsaEncoding: 'der' },
        Buffer.from(signatureMatch[1], 'base64'),
      );
    } catch {
      return false;
    }
  }

  private async getPublicKey(keyId: string | undefined): Promise<string | null> {
    if (this.publicKeyPem) {
      return this.publicKeyPem;
    }

    const keys = await this.fetchPublicKeys();
    return (keyId ? keys.find((key) => key.id === keyId) : keys[0])?.key ?? keys[0]?.key ?? null;
  }

  private async fetchPublicKeys(): Promise<PublicKey[]> {
    if (this.publicKeysCache && Date.now() - this.publicKeysCache.fetchedAt < 300_000) {
      return this.publicKeysCache.keys;
    }

    if (this.publicKeysPromise) {
      return this.publicKeysPromise;
    }

    this.publicKeysPromise = (async () => {
      const response = await fetch(`${this.baseUrl}/v2/public-key/http`, {
        headers: { authorization: `Bearer ${this.token ?? ''}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`PawaPay public key endpoint returned ${response.status}`);
      }

      const keys = (await response.json()) as PublicKey[];
      this.publicKeysCache = { fetchedAt: Date.now(), keys };
      return keys;
    })();

    try {
      return await this.publicKeysPromise;
    } finally {
      this.publicKeysPromise = null;
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
