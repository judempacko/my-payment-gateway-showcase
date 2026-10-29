import { describe, expect, it } from 'vitest';
import { formatMoney, formatTime, orderNumber, shortId } from './format';

describe('format', () => {
  it('formats EUR in French', () => {
    expect(formatMoney('96900', 'EUR', 'fr-FR')).toContain('969');
    expect(formatMoney('96900', 'EUR', 'fr-FR')).toContain('€');
  });

  it('formats EUR in English', () => {
    expect(formatMoney('96900', 'EUR', 'en-US')).toContain('969');
    expect(formatMoney('96900', 'EUR', 'en-US')).toContain('€');
  });

  it('formats XOF without decimals', () => {
    const value = formatMoney('129900', 'XOF', 'fr-FR');
    expect(value).toContain('129');
    expect(value).not.toContain('.00');
  });

  it('builds a readable order number', () => {
    expect(orderNumber('01a186b5-51fd-76a4-9009-d54083820621')).toBe('ORB-01A186B5');
  });

  it('keeps the unique suffix in short ids', () => {
    expect(shortId('10000000-0000-7000-8000-000000000001')).toBe('00000001');
  });

  it('formats a time for the active locale', () => {
    expect(formatTime('2026-10-29T15:38:00.000Z', 'fr-FR')).toMatch(/\d{2}:\d{2}/);
  });
});
