import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env';
import { DatabaseModule } from '../infra/db/database.module';
import { QueueModule } from '../infra/queue/queue.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { ProvidersModule } from '../modules/providers/providers.module';
import { ProviderReconciliationService } from './provider-reconciliation.service';
import { WebhookSweeper } from './webhook-sweeper.service';
import { WebhookProcessor } from './webhook.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
      envFilePath: [join(process.cwd(), '../../.env'), join(process.cwd(), '.env')],
    }),
    DatabaseModule,
    QueueModule,
    ProvidersModule,
    PaymentsModule,
  ],
  providers: [WebhookProcessor, WebhookSweeper, ProviderReconciliationService],
})
export class WorkersModule {}
