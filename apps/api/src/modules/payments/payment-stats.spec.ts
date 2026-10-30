import { describe, expect, it } from 'vitest';
import { buildPaymentStats } from './payment-stats';

describe('buildPaymentStats', () => {
  const now = new Date('2026-10-30T12:00:00.000Z');

  it('summarizes lifetime totals, currencies and providers', () => {
    const stats = buildPaymentStats({
      now,
      days: 7,
      totals: [
        {
          provider: 'mock',
          status: 'SUCCEEDED',
          currency: 'EUR',
          count: 2,
          amountMinor: '99800',
        },
        { provider: 'mock', status: 'FAILED', currency: 'EUR', count: 1, amountMinor: '4900' },
        {
          provider: 'stripe',
          status: 'PENDING',
          currency: 'EUR',
          count: 1,
          amountMinor: '4900',
        },
        {
          provider: 'pawapay',
          status: 'REFUNDED',
          currency: 'XOF',
          count: 1,
          amountMinor: '1500000',
        },
      ],
      series: [],
      webhooks: {
        processed: 4,
        pending: 1,
        failed: 0,
        lastReceivedAt: '2026-10-30T11:59:00.000Z',
        lastErrorAt: null,
      },
    });

    expect(stats.totals).toMatchObject({
      payments: 5,
      succeeded: 3,
      failed: 1,
      inFlight: 1,
      settled: 4,
      successRate: 75,
    });
    expect(stats.totals.volume).toEqual([
      { currency: 'EUR', amountMinor: '99800' },
      { currency: 'XOF', amountMinor: '1500000' },
    ]);
    expect(stats.providers).toEqual([
      { provider: 'mock', payments: 3, succeeded: 2, successRate: 67 },
      { provider: 'pawapay', payments: 1, succeeded: 1, successRate: 100 },
      { provider: 'stripe', payments: 1, succeeded: 0, successRate: null },
    ]);
    expect(stats.webhooks).toEqual({
      processed: 4,
      pending: 1,
      failed: 0,
      lastReceivedAt: '2026-10-30T11:59:00.000Z',
      lastErrorAt: null,
    });
  });

  it('fills empty days so the chart keeps a stable axis', () => {
    const stats = buildPaymentStats({
      now,
      days: 7,
      totals: [],
      series: [
        { date: '2026-10-29', status: 'SUCCEEDED', count: 2 },
        { date: '2026-10-29', status: 'FAILED', count: 1 },
        { date: '2026-10-30', status: 'CREATED', count: 3 },
      ],
      webhooks: {
        processed: 0,
        pending: 0,
        failed: 0,
        lastReceivedAt: null,
        lastErrorAt: null,
      },
    });

    expect(stats.window.since).toBe('2026-10-24T00:00:00.000Z');
    expect(stats.window.series).toHaveLength(7);
    expect(stats.window.series[0]).toEqual({
      date: '2026-10-24',
      succeeded: 0,
      failed: 0,
    });
    expect(stats.window.series[5]).toEqual({
      date: '2026-10-29',
      succeeded: 2,
      failed: 1,
    });
    expect(stats.window.series[6]).toEqual({
      date: '2026-10-30',
      succeeded: 0,
      failed: 0,
    });
  });

  it('returns a null success rate when nothing is settled', () => {
    const stats = buildPaymentStats({
      now,
      days: 30,
      totals: [
        {
          provider: 'mock',
          status: 'REQUIRES_ACTION',
          currency: 'EUR',
          count: 1,
          amountMinor: '4900',
        },
      ],
      series: [],
      webhooks: {
        processed: 0,
        pending: 0,
        failed: 0,
        lastReceivedAt: null,
        lastErrorAt: null,
      },
    });

    expect(stats.totals.successRate).toBeNull();
    expect(stats.providers[0]?.successRate).toBeNull();
  });
});
