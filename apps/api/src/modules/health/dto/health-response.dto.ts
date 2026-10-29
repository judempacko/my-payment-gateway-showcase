import { ApiProperty } from '@nestjs/swagger';

export class QueueCountsDto {
  @ApiProperty({ example: 0 })
  waiting!: number;

  @ApiProperty({ example: 0 })
  active!: number;

  @ApiProperty({ example: 0 })
  failed!: number;

  @ApiProperty({ example: 12 })
  completed!: number;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ enum: ['up', 'down'] })
  database!: 'up' | 'down';

  @ApiProperty({ type: QueueCountsDto })
  queue!: QueueCountsDto;

  @ApiProperty({ example: 4 })
  latencyMs!: number;

  @ApiProperty({ required: false })
  error?: string;
}
