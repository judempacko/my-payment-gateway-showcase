import type { Product, ProviderInfo } from '@pay/contracts';
import { describe, expect, it } from 'vitest';
import { buildPaymentMethods } from './payment-methods';

function product(currency: string): Product {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    slug: 'test-product',
    name: 'Test product',
    description: '',
    amountMinor: '1000',
    currency,
  };
}

const stripe: ProviderInfo = {
  id: 'stripe',
  methods: ['card'],
  currencies: ['EUR', 'USD'],
  countries: ['FR', 'US'],
  partialRefunds: true,
  hostedCheckout: true,
  requiresCustomerAction: true,
};

const pawapay: ProviderInfo = {
  id: 'pawapay',
  methods: ['mobile_money'],
  currencies: ['XOF', 'USD'],
  countries: ['SN'],
  partialRefunds: true,
  hostedCheckout: false,
  requiresCustomerAction: true,
};

describe('payment method routing', () => {
  it('falls back to a demo card for EUR without providers', () => {
    expect(buildPaymentMethods(product('EUR'), [])).toMatchObject([
      { id: 'card', provider: 'mock', mode: 'demo', method: 'card' },
    ]);
  });

  it('falls back to a demo mobile money for XOF without providers', () => {
    expect(buildPaymentMethods(product('XOF'), [])).toMatchObject([
      { id: 'mobile_money', provider: 'mock', mode: 'demo', method: 'mobile_money' },
    ]);
  });

  it('uses Stripe for EUR when configured', () => {
    expect(buildPaymentMethods(product('EUR'), [stripe])).toMatchObject([
      { id: 'card', provider: 'stripe', mode: 'live', method: 'card' },
    ]);
  });

  it('uses PawaPay for XOF when configured', () => {
    expect(buildPaymentMethods(product('XOF'), [pawapay])).toMatchObject([
      { id: 'mobile_money', provider: 'pawapay', mode: 'live', method: 'mobile_money' },
    ]);
  });

  it('shows both live methods when the currency is supported by both', () => {
    expect(buildPaymentMethods(product('USD'), [stripe, pawapay])).toHaveLength(2);
  });
});
