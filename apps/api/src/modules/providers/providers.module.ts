import { Module } from '@nestjs/common';
import { MockPaymentProvider } from './mock/mock.provider';
import { PawaPayPaymentProvider } from './pawapay/pawapay.provider';
import { ProviderRegistry } from './provider.registry';
import { ProvidersController } from './providers.controller';
import { StripePaymentProvider } from './stripe/stripe.provider';

@Module({
  controllers: [ProvidersController],
  providers: [MockPaymentProvider, StripePaymentProvider, PawaPayPaymentProvider, ProviderRegistry],
  exports: [ProviderRegistry, MockPaymentProvider, StripePaymentProvider, PawaPayPaymentProvider],
})
export class ProvidersModule {}
