import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService, type HealthStatus, type SimpleHealthStatus } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Lightweight liveness probe — returns 200 if the process is running. No I/O checks performed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      example: { status: 'ok', uptime: 42, timestamp: '2026-04-18T20:00:00.000Z' },
    },
  })
  getHealth(): SimpleHealthStatus {
    return this.healthService.getSimpleHealth();
  }

  @Public()
  @Get('deep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deep infrastructure health check',
    description:
      'Readiness probe — checks Postgres, Redis, and BullMQ worker queues. Use this endpoint for uptime monitors.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status returned (may be healthy, degraded, or unhealthy)',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2026-04-18T20:00:00.000Z',
        redis: { status: 'ok', responseTime: 2 },
        database: { status: 'ok', responseTime: 5 },
        workers: { status: 'ok', activeCount: 0 },
      },
    },
  })
  async getDeepHealth(): Promise<HealthStatus> {
    return await this.healthService.getHealth();
  }
}
