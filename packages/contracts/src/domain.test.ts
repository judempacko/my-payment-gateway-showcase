import { describe, expect, it } from 'vitest';
import { PaymentStatus, canTransition, isSettledStatus, isTerminalStatus } from './domain';

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
});
