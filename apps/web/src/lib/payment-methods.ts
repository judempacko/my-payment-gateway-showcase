import type { PaymentMethod, PaymentProvider, Product, ProviderInfo } from '@pay/contracts';

export type ShopperPaymentMethod = {
  id: 'card' | 'mobile_money';
  method: PaymentMethod;
  provider: PaymentProvider;
  mode: 'live' | 'demo';
  labelKey: string;
  descriptionKey: string;
  requiresPhone: boolean;
  requiresCountry: boolean;
};

const ZERO_DECIMAL_CURRENCIES = new Set(['XOF', 'XAF']);

export function buildPaymentMethods(
  product: Product | undefined,
  providers: ProviderInfo[],
): ShopperPaymentMethod[] {
  if (!product) {
    return [];
  }

  const stripe = providers.find(
    (provider) =>
      provider.id === 'stripe' &&
      provider.methods.includes('card') &&
      provider.currencies.includes(product.currency),
  );
  const pawapay = providers.find(
    (provider) =>
      provider.id === 'pawapay' &&
      provider.methods.includes('mobile_money') &&
      provider.currencies.includes(product.currency),
  );

  const methods: ShopperPaymentMethod[] = [];

  if (stripe) {
    methods.push({
      id: 'card',
      method: 'card',
      provider: 'stripe',
      mode: 'live',
      labelKey: 'checkout.payment.card',
      descriptionKey: 'checkout.payment.cardDescription',
      requiresPhone: false,
      requiresCountry: false,
    });
  }

  if (pawapay) {
    methods.push({
      id: 'mobile_money',
      method: 'mobile_money',
      provider: 'pawapay',
      mode: 'live',
      labelKey: 'checkout.payment.mobileMoney',
      descriptionKey: 'checkout.payment.mobileMoneyDescription',
      requiresPhone: true,
      requiresCountry: true,
    });
  }

  if (methods.length === 0) {
    const mobileMoney = ZERO_DECIMAL_CURRENCIES.has(product.currency.toUpperCase());

    methods.push(
      mobileMoney
        ? {
            id: 'mobile_money',
            method: 'mobile_money',
            provider: 'mock',
            mode: 'demo',
            labelKey: 'checkout.payment.mobileMoneyDemo',
            descriptionKey: 'checkout.payment.mobileMoneyDemoDescription',
            requiresPhone: true,
            requiresCountry: true,
          }
        : {
            id: 'card',
            method: 'card',
            provider: 'mock',
            mode: 'demo',
            labelKey: 'checkout.payment.cardDemo',
            descriptionKey: 'checkout.payment.cardDemoDescription',
            requiresPhone: false,
            requiresCountry: false,
          },
    );
  }

  return methods;
}

export function isDemoMethod(method: ShopperPaymentMethod | undefined): boolean {
  return method?.mode === 'demo';
}
