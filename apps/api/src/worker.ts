import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkersModule } from './workers/workers.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkersModule);
  app.enableShutdownHooks();
  Logger.log('Payment worker started', 'WorkerBootstrap');
}

void bootstrap();
