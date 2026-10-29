import {
  BadRequestException,
  Controller,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhookIngestService } from './webhook-ingest.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly ingest: WebhookIngestService) {}

  @Post(':provider')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive a provider webhook',
    description:
      'Verifies the raw-body signature, persists the event in PostgreSQL, then enqueues it. ' +
      'This endpoint never applies business logic synchronously.',
  })
  @ApiParam({ name: 'provider', enum: ['mock', 'stripe', 'pawapay'] })
  @ApiBody({
    description: 'Provider-specific raw payload. Signature headers are required.',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiHeader({
    name: 'x-mock-signature',
    required: false,
    description: 'Mock HMAC-SHA256 signature: t=<unix>,v1=<hex>',
  })
  @ApiHeader({
    name: 'stripe-signature',
    required: false,
    description: 'Stripe-Signature header',
  })
  @ApiHeader({
    name: 'signature',
    required: false,
    description: 'RFC 9421 signature header used by PawaPay',
  })
  @ApiHeader({
    name: 'signature-input',
    required: false,
    description: 'RFC 9421 Signature-Input header used by PawaPay',
  })
  @ApiHeader({
    name: 'signature-date',
    required: false,
    description: 'RFC 9421 Signature-Date header used by PawaPay',
  })
  @ApiHeader({
    name: 'content-digest',
    required: false,
    description: 'RFC 9421 Content-Digest header used by PawaPay',
  })
  @ApiResponse({ status: 200, description: 'Webhook accepted, duplicated, or persisted for retry' })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @ApiResponse({ status: 400, description: 'Malformed payload' })
  async handle(
    @Param('provider') provider: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: true; id: string | null; duplicate: boolean; ignored: boolean }> {
    if (!request.rawBody) {
      throw new BadRequestException('Raw body is required');
    }

    const authority = request.get('x-forwarded-host')?.split(',')[0]?.trim() ?? request.get('host');

    const result = await this.ingest.ingest(provider, {
      headers: request.headers,
      rawBody: request.rawBody,
      method: request.method,
      path: request.originalUrl.split('?')[0] ?? request.path,
      authority,
    });

    return { received: true, ...result };
  }
}
