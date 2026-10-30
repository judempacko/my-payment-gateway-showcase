import { PAYMENT_PROVIDERS, type PaymentProvider, type PaymentStatsDays } from '@pay/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentStatsMoneyDto {
  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: '245000', description: 'Amount in minor units' })
  amountMinor!: string;
}

export class PaymentStatsTotalsDto {
  @ApiProperty()
  payments!: number;

  @ApiProperty()
  succeeded!: number;

  @ApiProperty()
  inFlight!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  settled!: number;

  @ApiPropertyOptional({ nullable: true, example: 92 })
  successRate!: number | null;

  @ApiProperty({ type: [PaymentStatsMoneyDto] })
  volume!: PaymentStatsMoneyDto[];
}

export class PaymentStatsTrendPointDto {
  @ApiProperty({ example: '2026-10-24' })
  date!: string;

  @ApiProperty()
  succeeded!: number;

  @ApiProperty()
  failed!: number;
}

export class PaymentStatsWindowDto {
  @ApiProperty({ enum: [7, 30] })
  days!: PaymentStatsDays;

  @ApiProperty({ format: 'date-time' })
  since!: string;

  @ApiProperty({ format: 'date-time' })
  until!: string;

  @ApiProperty({ type: [PaymentStatsTrendPointDto] })
  series!: PaymentStatsTrendPointDto[];
}

export class PaymentStatsProviderDto {
  @ApiProperty({ enum: PAYMENT_PROVIDERS })
  provider!: PaymentProvider;

  @ApiProperty()
  payments!: number;

  @ApiProperty()
  succeeded!: number;

  @ApiPropertyOptional({ nullable: true, example: 92 })
  successRate!: number | null;
}

export class PaymentStatsWebhooksDto {
  @ApiProperty()
  processed!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  failed!: number;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  lastReceivedAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  lastErrorAt!: string | null;
}

export class PaymentStatsResponseDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;

  @ApiProperty({ type: PaymentStatsTotalsDto })
  totals!: PaymentStatsTotalsDto;

  @ApiProperty({ type: PaymentStatsWindowDto })
  window!: PaymentStatsWindowDto;

  @ApiProperty({ type: [PaymentStatsProviderDto] })
  providers!: PaymentStatsProviderDto[];

  @ApiProperty({ type: PaymentStatsWebhooksDto })
  webhooks!: PaymentStatsWebhooksDto;
}
