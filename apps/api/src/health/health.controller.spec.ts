jest.mock('@nexvideo/database', () => ({ prisma: {} }));
jest.mock('../prisma/prisma.service');

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

const mockSimpleHealth = {
  status: 'ok' as const,
  uptime: 123,
  timestamp: '2026-04-18T20:00:00.000Z',
};

const mockDeepHealth = {
  status: 'healthy' as const,
  timestamp: '2026-04-18T20:00:00.000Z',
  redis: { status: 'ok' as const, responseTime: 2 },
  database: { status: 'ok' as const, responseTime: 5 },
  workers: { status: 'ok' as const, activeCount: 0 },
};

describe('HealthController', () => {
  let controller: HealthController;
  let service: jest.Mocked<HealthService>;

  beforeEach(async () => {
    service = {
      getSimpleHealth: jest.fn().mockReturnValue(mockSimpleHealth),
      getHealth: jest.fn().mockResolvedValue(mockDeepHealth),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: service }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('returns basic status without I/O checks', () => {
      const result = controller.getHealth();

      expect(result).toEqual(mockSimpleHealth);
      expect(service.getSimpleHealth).toHaveBeenCalledTimes(1);
      expect(service.getHealth).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/deep', () => {
    it('returns full infrastructure status', async () => {
      const result = await controller.getDeepHealth();

      expect(result).toEqual(mockDeepHealth);
      expect(service.getHealth).toHaveBeenCalledTimes(1);
    });

    it('propagates degraded status from service', async () => {
      service.getHealth.mockResolvedValueOnce({
        ...mockDeepHealth,
        status: 'degraded',
        redis: { status: 'error', error: 'connection refused' },
      });

      const result = await controller.getDeepHealth();

      expect(result.status).toBe('degraded');
      expect(result.redis.status).toBe('error');
    });
  });
});
