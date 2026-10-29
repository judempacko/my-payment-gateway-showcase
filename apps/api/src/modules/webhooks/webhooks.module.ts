import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module';
import { WebhookController } from './webhook.controller';
import { WebhookIngestService } from './webhook-ingest.service';

@Module({
  imports: [ProvidersModule],
  controllers: [WebhookController],
  providers: [WebhookIngestService],
  exports: [WebhookIngestService],
})
export class WebhooksModule {}
