import { describe, expect, it } from 'vitest';
import {
  FAILED_STATUSES,
  IN_FLIGHT_STATUSES,
  PAYMENT_STATUSES,
  PaymentStatus,
  SUCCESS_STATUSES,
  canTransition,
  isSettledStatus,
  isTerminalStatus,
} from './domain';

describe('payment state machine', () => {
  it('allows the normal mock checkout path', () => {
    expect(canTransition(PaymentStatus.CREATED, PaymentStatus.PENDING)).toBe(true);
    expect(canTransition(PaymentStatus.PENDING, PaymentStatus.SUCCEEDED)).toBe(true);
    expect(canTransition(PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED)).toBe(true);
  });

  it('rejects backwards transitions', () => {
    expect(canTransition(PaymentStatus.SUCCEEDED, PaymentStatus.PENDING)).toBe(false);
    expect(canTransition(PaymentStatus.FAILED, PaymentStatus.SUCCEEDED)).toBe(false);
    expect(canTransition(PaymentStatus.REFUNDED, PaymentStatus.SUCCEEDED)).toBe(false);
  });

  it('treats terminal and settled states correctly', () => {
    expect(isTerminalStatus(PaymentStatus.FAILED)).toBe(true);
    expect(isTerminalStatus(PaymentStatus.REFUNDED)).toBe(true);
    expect(isTerminalStatus(PaymentStatus.SUCCEEDED)).toBe(false);
    expect(isSettledStatus(PaymentStatus.SUCCEEDED)).toBe(true);
    expect(isSettledStatus(PaymentStatus.PROCESSING)).toBe(false);
  });

  it('partitions every payment status into exactly one dashboard bucket', () => {
    const buckets = [...SUCCESS_STATUSES, ...FAILED_STATUSES, ...IN_FLIGHT_STATUSES];

    expect(new Set(buckets).size).toBe(buckets.length);
    expect([...buckets].sort()).toEqual([...PAYMENT_STATUSES].sort());
  });
});
