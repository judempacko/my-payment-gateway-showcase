import { currencyExponent, minorToDecimalString } from '@pay/contracts';

export function formatMoney(amountMinor: string, currency: string, locale = 'fr'): string {
  const digits = currencyExponent(currency);
  const decimal = minorToDecimalString(amountMinor, currency);
  const amount = Number(decimal);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateTime(value: string | null, locale = 'fr'): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatRelative(value: string, locale = 'fr'): string {
  const date = new Date(value).getTime();
  const deltaSeconds = Math.round((date - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(deltaSeconds) < 60) {
    return formatter.format(deltaSeconds, 'second');
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, 'minute');
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, 'hour');
  }

  return formatter.format(Math.round(deltaHours / 24), 'day');
}

export function formatTime(value: string | null, locale = 'fr'): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(value));
}

export function shortId(id: string): string {
  return id.slice(-8);
}

export function orderNumber(id: string): string {
  return `ORB-${id.slice(0, 8).toUpperCase()}`;
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
