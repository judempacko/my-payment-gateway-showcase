import {
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  type NextAction,
  type PaymentEvent,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentStatus,
} from '@pay/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  country?: string;
}

export class NextActionResponseDto {
  @ApiProperty({ enum: ['mock_approval', 'redirect', 'client_secret', 'ussd', 'none'] })
  type!: NextAction['type'];

  @ApiPropertyOptional()
  paymentId?: string;

  @ApiPropertyOptional()
  providerRef?: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  clientSecret?: string;

  @ApiPropertyOptional()
  publishableKey?: string;

  @ApiPropertyOptional()
  instructions?: string;

  @ApiPropertyOptional()
  expiresAt?: string;
}

export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PAYMENT_STATUSES })
  status!: PaymentStatus;

  @ApiProperty({ enum: PAYMENT_PROVIDERS })
  provider!: PaymentProvider;

  @ApiProperty({ enum: PAYMENT_METHODS })
  method!: PaymentMethod;

  @ApiProperty({ example: '4900', description: 'Amount in minor units' })
  amountMinor!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ type: CustomerResponseDto })
  customer!: CustomerResponseDto;

  @ApiPropertyOptional({ nullable: true, example: 'mock_0190...' })
  providerRef!: string | null;

  @ApiProperty({ type: NextActionResponseDto, nullable: true })
  nextAction!: NextAction | null;

  @ApiProperty({ type: Object })
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  lastEventAt!: string | null;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class PaymentEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  paymentId!: string;

  @ApiProperty({ example: 1 })
  sequence!: number;

  @ApiProperty({ example: 'PAYMENT_SUCCEEDED' })
  type!: PaymentEvent['type'];

  @ApiProperty({ example: 'webhook' })
  source!: string;

  @ApiPropertyOptional({ enum: PAYMENT_STATUSES, nullable: true })
  fromStatus!: PaymentStatus | null;

  @ApiPropertyOptional({ enum: PAYMENT_STATUSES, nullable: true })
  toStatus!: PaymentStatus | null;

  @ApiProperty({ type: Object })
  payload!: Record<string, unknown>;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class WebhookResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PAYMENT_PROVIDERS })
  provider!: PaymentProvider;

  @ApiProperty()
  providerEventId!: string;

  @ApiProperty()
  eventType!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  paymentId!: string | null;

  @ApiProperty()
  signatureValid!: boolean;

  @ApiProperty({ type: Object })
  headers!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  payload!: Record<string, unknown>;

  @ApiProperty()
  rawBody!: string;

  @ApiProperty({ format: 'date-time' })
  receivedAt!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  processedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  processingError!: string | null;

  @ApiProperty()
  attempts!: number;
}

export class ListPaymentsResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items!: PaymentResponseDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor!: string | null;
}

export class SimulatePaymentResponseDto {
  @ApiProperty()
  accepted!: boolean;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  webhookEventId!: string | null;

  @ApiProperty()
  duplicate!: boolean;
}
