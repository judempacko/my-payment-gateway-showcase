import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Queue } from 'bullmq';
import { DatabaseService } from '../../infra/db/database.service';
import { WEBHOOK_QUEUE } from '../../infra/queue/queue.constants';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness and queue snapshot' })
  @ApiOkResponse({ type: HealthResponseDto })
  async check(): Promise<HealthResponseDto> {
    return this.snapshot();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ schema: { type: 'object', properties: { status: { type: 'string' } } } })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (database + queue)' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'Database or queue unavailable' })
  async ready(): Promise<HealthResponseDto> {
    const snapshot = await this.snapshot();

    if (snapshot.status !== 'ok') {
      throw new ServiceUnavailableException(snapshot);
    }

    return snapshot;
  }

  private async snapshot(): Promise<HealthResponseDto> {
    const startedAt = Date.now();

    try {
      await this.database.ping();
      const counts = await this.queue.getJobCounts('waiting', 'active', 'failed', 'completed');

      return {
        status: 'ok',
        database: 'up',
        queue: {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
        },
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'degraded',
        database: 'down',
        queue: { waiting: 0, active: 0, failed: 0, completed: 0 },
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
