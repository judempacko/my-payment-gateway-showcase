import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ProvidersModule } from '../providers/providers.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PaymentStateService } from './payment-state.service';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [CatalogModule, ProvidersModule, WebhooksModule],
  controllers: [PaymentsController],
  providers: [PaymentsRepository, PaymentsService, PaymentStateService],
  exports: [PaymentsService, PaymentStateService],
})
export class PaymentsModule {}
