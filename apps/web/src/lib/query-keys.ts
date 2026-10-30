import type { PaymentProvider, PaymentStatsDays, PaymentStatus } from '@pay/contracts';

export const queryKeys = {
  products: ['products'] as const,
  providers: ['providers'] as const,
  health: ['health'] as const,
  stats: (days: PaymentStatsDays) => ['payments', 'stats', days] as const,
  payments: (filters: { status?: PaymentStatus; provider?: PaymentProvider }) =>
    ['payments', filters] as const,
  payment: (id: string) => ['payment', id] as const,
  timeline: (id: string) => ['timeline', id] as const,
  webhooks: (id: string) => ['webhooks', id] as const,
};
