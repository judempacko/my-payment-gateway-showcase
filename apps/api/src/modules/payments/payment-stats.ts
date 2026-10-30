import {
  FAILED_STATUSES,
  IN_FLIGHT_STATUSES,
  SUCCESS_STATUSES,
  type PaymentProvider,
  type PaymentStats,
  type PaymentStatsDays,
  type PaymentStatus,
} from '@pay/contracts';

export type PaymentTotalsRow = {
  provider: PaymentProvider;
  status: PaymentStatus;
  currency: string;
  count: number;
  amountMinor: string;
};

export type PaymentDayRow = {
  date: string;
  status: PaymentStatus;
  count: number;
};

export type WebhookPipelineRow = {
  processed: number;
  pending: number;
  failed: number;
  lastReceivedAt: Date | string | null;
  lastErrorAt: Date | string | null;
};

const SUCCESS = new Set<PaymentStatus>(SUCCESS_STATUSES);
const FAILED = new Set<PaymentStatus>(FAILED_STATUSES);
const IN_FLIGHT = new Set<PaymentStatus>(IN_FLIGHT_STATUSES);

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function statsWindowStart(now: Date, days: PaymentStatsDays): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
}

export function buildPaymentStats(input: {
  totals: PaymentTotalsRow[];
  series: PaymentDayRow[];
  webhooks: WebhookPipelineRow;
  days: PaymentStatsDays;
  now?: Date;
}): PaymentStats {
  const now = input.now ?? new Date();
  const since = statsWindowStart(now, input.days);
  const counts = { payments: 0, succeeded: 0, inFlight: 0, failed: 0 };
  const volumes = new Map<string, bigint>();
  const providers = new Map<
    PaymentProvider,
    { payments: number; succeeded: number; failed: number }
  >();

  for (const row of input.totals) {
    const count = Number(row.count);
    counts.payments += count;

    const provider = providers.get(row.provider) ?? {
      payments: 0,
      succeeded: 0,
      failed: 0,
    };
    provider.payments += count;

    if (SUCCESS.has(row.status)) {
      counts.succeeded += count;
      provider.succeeded += count;
      volumes.set(row.currency, (volumes.get(row.currency) ?? 0n) + BigInt(row.amountMinor ?? '0'));
    } else if (FAILED.has(row.status)) {
      counts.failed += count;
      provider.failed += count;
    } else if (IN_FLIGHT.has(row.status)) {
      counts.inFlight += count;
    }

    providers.set(row.provider, provider);
  }

  const settled = counts.succeeded + counts.failed;
  const dayBuckets = new Map<string, { succeeded: number; failed: number }>();

  for (const row of input.series) {
    const bucket = dayBuckets.get(row.date) ?? { succeeded: 0, failed: 0 };

    if (SUCCESS.has(row.status)) {
      bucket.succeeded += Number(row.count);
    } else if (FAILED.has(row.status)) {
      bucket.failed += Number(row.count);
    }

    dayBuckets.set(row.date, bucket);
  }

  const series = Array.from({ length: input.days }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    const key = dayKey(date);
    const bucket = dayBuckets.get(key) ?? { succeeded: 0, failed: 0 };

    return { date: key, succeeded: bucket.succeeded, failed: bucket.failed };
  });

  return {
    generatedAt: now.toISOString(),
    totals: {
      ...counts,
      settled,
      successRate: settled > 0 ? Math.round((counts.succeeded / settled) * 100) : null,
      volume: Array.from(volumes.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([currency, amountMinor]) => ({
          currency,
          amountMinor: amountMinor.toString(),
        })),
    },
    window: {
      days: input.days,
      since: since.toISOString(),
      until: now.toISOString(),
      series,
    },
    providers: Array.from(providers.entries())
      .map(([provider, value]) => {
        const providerSettled = value.succeeded + value.failed;

        return {
          provider,
          payments: value.payments,
          succeeded: value.succeeded,
          successRate:
            providerSettled > 0 ? Math.round((value.succeeded / providerSettled) * 100) : null,
        };
      })
      .sort(
        (left, right) =>
          right.payments - left.payments || left.provider.localeCompare(right.provider),
      ),
    webhooks: {
      processed: Number(input.webhooks.processed),
      pending: Number(input.webhooks.pending),
      failed: Number(input.webhooks.failed),
      lastReceivedAt: toIsoString(input.webhooks.lastReceivedAt),
      lastErrorAt: toIsoString(input.webhooks.lastErrorAt),
    },
  };
}
