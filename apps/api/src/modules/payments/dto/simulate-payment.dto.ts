import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { MockOutcome } from '../../providers/mock/mock.provider';

export const MOCK_OUTCOMES: MockOutcome[] = ['succeeded', 'failed', 'expired'];

export class SimulatePaymentDto {
  @ApiProperty({ enum: MOCK_OUTCOMES, example: 'succeeded' })
  @IsIn(MOCK_OUTCOMES)
  outcome!: MockOutcome;
}
