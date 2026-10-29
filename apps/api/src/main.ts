import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService<Env, true>);
  const prefix = config.get('API_PREFIX', { infer: true });
  const port = config.get('PORT', { infer: true });
  const corsOrigins = config
    .get('CORS_ORIGIN', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    exposedHeaders: ['Idempotent-Replay'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Payment Gateway Showcase API')
    .setDescription(
      [
        'Multi-provider payment gateway demo.',
        '',
        '**Money** is always expressed in minor units and a currency code.',
        '**Webhooks** are verified on the raw body, persisted in an inbox, then processed asynchronously.',
        '**Mock** is the default provider and requires no external credentials.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'demo API key',
        description: 'Send the demo API key as `x-demo-key` header (or Bearer token).',
      },
      'demo-key',
    )
    .addTag('catalog', 'Server-side product catalog')
    .addTag('payments', 'Payment intents, timeline and SSE stream')
    .addTag('providers', 'Configured payment providers')
    .addTag('webhooks', 'Raw provider callbacks')
    .addTag('health', 'Liveness and readiness')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Payment Gateway Showcase API',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on http://localhost:${port}/${prefix}`, 'Bootstrap');
  Logger.log(`Swagger available on http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
