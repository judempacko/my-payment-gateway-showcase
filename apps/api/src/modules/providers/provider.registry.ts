import type { PaymentProvider } from '@pay/contracts';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MockPaymentProvider } from './mock/mock.provider';
import { PawaPayPaymentProvider } from './pawapay/pawapay.provider';
import { StripePaymentProvider } from './stripe/stripe.provider';
import type { PaymentProviderPort, ProviderCapabilities } from './payment-provider.interface';

@Injectable()
export class ProviderRegistry {
  private readonly providers = new Map<string, PaymentProviderPort>();

  constructor(
    mock: MockPaymentProvider,
    stripe: StripePaymentProvider,
    pawaPay: PawaPayPaymentProvider,
  ) {
    for (const provider of [mock, stripe, pawaPay]) {
      if (provider.configured) {
        this.register(provider);
      }
    }
  }

  register(provider: PaymentProviderPort): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): PaymentProviderPort {
    const provider = this.providers.get(id);

    if (!provider) {
      throw new ServiceUnavailableException(
        `Payment provider "${id}" is not configured. Available: ${[...this.providers.keys()].join(', ')}`,
      );
    }

    return provider;
  }

  list(): Array<
    Omit<ProviderCapabilities, 'methods' | 'currencies' | 'countries'> & {
      id: PaymentProvider;
      methods: string[];
      currencies: string[];
      countries: string[];
    }
  > {
    return [...this.providers.values()].map((provider) => ({
      id: provider.id,
      methods: [...provider.capabilities.methods],
      currencies: [...provider.capabilities.currencies],
      countries: [...provider.capabilities.countries],
      partialRefunds: provider.capabilities.partialRefunds,
      hostedCheckout: provider.capabilities.hostedCheckout,
      requiresCustomerAction: provider.capabilities.requiresCustomerAction,
    }));
  }
}
