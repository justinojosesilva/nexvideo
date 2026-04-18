import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

export interface SimpleHealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  redis: {
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  };
  database: {
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  };
  workers: {
    status: 'ok' | 'error';
    activeCount?: number;
    error?: string;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_INSTANCE') private readonly redis: Redis,
  ) {}

  getSimpleHealth(): SimpleHealthStatus {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async getHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check Redis
    const redisCheck = await this.checkRedis();
    if (redisCheck.status === 'error') {
      overallStatus = 'degraded';
    }

    // Check Database
    const databaseCheck = await this.checkDatabase();
    if (databaseCheck.status === 'error') {
      overallStatus = databaseCheck.status === 'error' ? 'unhealthy' : 'degraded';
    }

    // Check Workers (optional - try to get queue info from Redis)
    const workersCheck = await this.checkWorkers();

    // If both critical services down, it's unhealthy
    if (redisCheck.status === 'error' && databaseCheck.status === 'error') {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      timestamp,
      redis: redisCheck,
      database: databaseCheck,
      workers: workersCheck,
    };
  }

  private async checkRedis(): Promise<{
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: errorMessage,
      };
    }
  }

  private async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    responseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      // Simple query to verify database connection
      await this.prisma.client.$queryRawUnsafe('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: errorMessage,
      };
    }
  }

  private async checkWorkers(): Promise<{
    status: 'ok' | 'error';
    activeCount?: number;
    error?: string;
  }> {
    try {
      // Try to get queue length from Redis
      // This is an approximation of worker health based on queue activity
      const queueLength = await this.redis.llen('nexvideo-jobs');

      return {
        status: 'ok',
        activeCount: Math.max(0, queueLength),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        error: errorMessage,
      };
    }
  }
}
