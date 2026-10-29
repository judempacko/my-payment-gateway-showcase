import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { DemoKeyGuard } from '../../common/guards/demo-key.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import {
  ListPaymentsResponseDto,
  PaymentEventResponseDto,
  PaymentResponseDto,
  SimulatePaymentResponseDto,
  WebhookResponseDto,
} from './dto/payment-response.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @UseGuards(DemoKeyGuard)
  @ApiBearerAuth('demo-key')
  @ApiOperation({
    summary: 'Create a payment',
    description:
      'The amount is always resolved from the server-side product catalog. ' +
      'Client-submitted amounts are ignored. Send an Idempotency-Key for safe retries.',
  })
  @ApiHeader({ name: 'x-demo-key', required: true, description: 'Demo mutation key' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Retry-safe key. Same key + same payload returns the stored response.',
  })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid product, method, currency or provider capability',
  })
  @ApiResponse({ status: 409, description: 'Idempotency-Key reused with a different payload' })
  @ApiResponse({ status: 503, description: 'Requested provider is not configured' })
  create(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    return this.payments.create(dto, idempotencyKey);
  }

  @Get()
  @ApiOperation({ summary: 'List payments with filters and cursor pagination' })
  @ApiOkResponse({ type: ListPaymentsResponseDto })
  list(@Query() query: ListPaymentsQueryDto): Promise<ListPaymentsResponseDto> {
    return this.payments.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseDto })
  get(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.payments.get(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get the append-only payment event timeline' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: [PaymentEventResponseDto] })
  timeline(@Param('id') id: string): Promise<PaymentEventResponseDto[]> {
    return this.payments.timeline(id);
  }

  @Get(':id/webhooks')
  @ApiOperation({ summary: 'Get raw webhook inbox rows for a payment' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: [WebhookResponseDto] })
  webhooks(@Param('id') id: string): Promise<WebhookResponseDto[]> {
    return this.payments.webhookRecords(id);
  }

  @Sse(':id/stream')
  @ApiOperation({
    summary: 'Stream payment updates over Server-Sent Events',
    description: 'The stream completes automatically once the payment reaches a settled state.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiProduces('text/event-stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.payments.stream(id);
  }

  @Post(':id/simulate')
  @UseGuards(DemoKeyGuard)
  @HttpCode(200)
  @ApiBearerAuth('demo-key')
  @ApiOperation({
    summary: 'Simulate a signed mock webhook',
    description:
      'Builds a signed mock provider callback and sends it through the real ingestion pipeline.',
  })
  @ApiHeader({ name: 'x-demo-key', required: true, description: 'Demo mutation key' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SimulatePaymentResponseDto })
  simulate(
    @Param('id') id: string,
    @Body() dto: SimulatePaymentDto,
  ): Promise<SimulatePaymentResponseDto> {
    return this.payments.simulate(id, dto.outcome);
  }
}
