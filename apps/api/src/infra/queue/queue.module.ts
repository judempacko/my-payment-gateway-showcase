import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../../config/env';
import { WEBHOOK_QUEUE } from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const connection = new Redis(config.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: null,
          lazyConnect: false,
        });

        return { connection };
      },
    }),
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
