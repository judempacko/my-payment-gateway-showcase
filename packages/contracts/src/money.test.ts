import { describe, expect, it } from 'vitest';
import { currencyExponent, decimalToMinorString, minorToDecimalString } from './domain';

describe('money helpers', () => {
  it('handles zero-decimal currencies', () => {
    expect(currencyExponent('XOF')).toBe(0);
    expect(minorToDecimalString('5000', 'XOF')).toBe('5000');
    expect(decimalToMinorString('5000', 'XOF')).toBe('5000');
  });

  it('handles two-decimal currencies', () => {
    expect(currencyExponent('EUR')).toBe(2);
    expect(minorToDecimalString('4900', 'EUR')).toBe('49.00');
    expect(minorToDecimalString('5', 'EUR')).toBe('0.05');
    expect(decimalToMinorString('49.00', 'EUR')).toBe('4900');
    expect(decimalToMinorString('0.05', 'EUR')).toBe('5');
  });

  it('rejects unsupported precision', () => {
    expect(() => decimalToMinorString('1.234', 'EUR')).toThrow();
    expect(() => decimalToMinorString('1.5', 'XOF')).toThrow();
  });
});
