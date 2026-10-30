import type { PaymentStatsDays } from '@pay/contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class PaymentStatsQueryDto {
  @ApiPropertyOptional({
    enum: [7, 30],
    default: 7,
    description: 'Length of the chart window in days. Totals are always lifetime values.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30])
  days?: PaymentStatsDays;
}
