import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Import custom exception

// Mock PrismaService BEFORE importing PlanLimitsGuard to avoid DATABASE_URL requirement
const mockPrismaService = {
  client: {
    organization: {
      findUnique: jest.fn(),
    },
    usageLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
};

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn(() => mockPrismaService),
}));

import { PlanLimitsGuard } from './plan-limits.guard';

describe('PlanLimitsGuard', () => {
  let guard: PlanLimitsGuard;
  let reflector: Reflector;
  let executionContext: ExecutionContext;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as any;

    jest.clearAllMocks();

    guard = new PlanLimitsGuard(reflector, mockPrismaService as any);
  });

  describe('canActivate', () => {
    it('should pass when @CheckPlanLimit is not applied', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce(undefined);

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
    });

    it('should allow script creation for Free tier with usage under limit', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'free',
        activeSubscription: {
          plan: {
            slug: 'free',
            scriptLimit: 5,
            narrationLimit: 5,
            exportLimit: 3,
          },
        },
      });

      (mockPrismaService.client.usageLog.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: 'org-123',
        month: '2026-04',
        scripts: 3,
        narrations: 2,
        exports: 1,
      });

      (mockPrismaService.client.usageLog.update as jest.Mock).mockResolvedValueOnce({
        scripts: 4,
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(mockPrismaService.client.usageLog.update).toHaveBeenCalledWith({
        where: { organizationId_month: { organizationId: 'org-123', month: expect.any(String) } },
        data: { scripts: 4 },
      });
    });

    it('should block script creation for Free tier at limit', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'free',
        activeSubscription: {
          plan: {
            slug: 'free',
            scriptLimit: 5,
            narrationLimit: 5,
            exportLimit: 3,
          },
        },
      });

      (mockPrismaService.client.usageLog.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: 'org-123',
        month: '2026-04',
        scripts: 5,
        narrations: 2,
        exports: 1,
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      try {
        await guard.canActivate(executionContext);
        fail('Should throw exception');
      } catch (error) {
        expect((error as any).message).toBeDefined();
      }
    });

    it('should block narration creation for Free tier at limit', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'narrations',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'free',
        activeSubscription: {
          plan: {
            slug: 'free',
            scriptLimit: 5,
            narrationLimit: 5,
            exportLimit: 3,
          },
        },
      });

      (mockPrismaService.client.usageLog.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: 'org-123',
        month: '2026-04',
        scripts: 2,
        narrations: 5,
        exports: 1,
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      await expect(guard.canActivate(executionContext)).rejects.toThrow();
    });

    it('should block export creation for Free tier at limit', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'exports',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'free',
        activeSubscription: {
          plan: {
            slug: 'free',
            scriptLimit: 5,
            narrationLimit: 5,
            exportLimit: 3,
          },
        },
      });

      (mockPrismaService.client.usageLog.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: 'org-123',
        month: '2026-04',
        scripts: 2,
        narrations: 2,
        exports: 3,
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      await expect(guard.canActivate(executionContext)).rejects.toThrow();
    });

    it('should always allow Creator tier (unlimited)', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'creator',
        activeSubscription: {
          plan: {
            slug: 'creator',
            scriptLimit: null,
            narrationLimit: null,
            exportLimit: null,
          },
        },
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      // Should not call usageLog for unlimited plans
      expect(mockPrismaService.client.usageLog.findUnique).not.toHaveBeenCalled();
    });

    it('should create usage log if not found', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'free',
        activeSubscription: {
          plan: {
            slug: 'free',
            scriptLimit: 5,
            narrationLimit: 5,
            exportLimit: 3,
          },
        },
      });

      (mockPrismaService.client.usageLog.findUnique as jest.Mock).mockResolvedValueOnce(null);

      (mockPrismaService.client.usageLog.create as jest.Mock).mockResolvedValueOnce({
        organizationId: 'org-123',
        month: '2026-04',
        scripts: 0,
        narrations: 0,
        exports: 0,
      });

      (mockPrismaService.client.usageLog.update as jest.Mock).mockResolvedValueOnce({
        scripts: 1,
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
      expect(mockPrismaService.client.usageLog.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when JWT organizationId is missing', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {},
          }),
        }),
      } as any;

      await expect(guard.canActivate(executionContext)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when organization not found', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce(null);

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-nonexistent' },
          }),
        }),
      } as any;

      await expect(guard.canActivate(executionContext)).rejects.toThrow(BadRequestException);
    });

    it('should include plan information in 402 error response', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'free',
        activeSubscription: {
          plan: {
            slug: 'free',
            scriptLimit: 5,
            narrationLimit: 5,
            exportLimit: 3,
          },
        },
      });

      (mockPrismaService.client.usageLog.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: 'org-123',
        month: '2026-04',
        scripts: 5,
        narrations: 2,
        exports: 1,
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      try {
        await guard.canActivate(executionContext);
        fail('Should throw exception');
      } catch (error) {
        // Check error response contains expected fields
        const response = (error as any).getResponse?.();
        expect(response).toBeDefined();
        expect((error as any).status).toBe(402);
      }
    });

    it('should allow Starter tier with higher limits', async () => {
      (reflector.get as jest.Mock).mockReturnValueOnce({
        resourceType: 'scripts',
      });

      (mockPrismaService.client.organization.findUnique as jest.Mock).mockResolvedValueOnce({
        plan: 'starter',
        activeSubscription: {
          plan: {
            slug: 'starter',
            scriptLimit: 30,
            narrationLimit: 30,
            exportLimit: 20,
          },
        },
      });

      (mockPrismaService.client.usageLog.findUnique as jest.Mock).mockResolvedValueOnce({
        organizationId: 'org-123',
        month: '2026-04',
        scripts: 29,
        narrations: 20,
        exports: 15,
      });

      (mockPrismaService.client.usageLog.update as jest.Mock).mockResolvedValueOnce({
        scripts: 30,
      });

      executionContext = {
        getHandler: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { organizationId: 'org-123' },
          }),
        }),
      } as any;

      const result = await guard.canActivate(executionContext);

      expect(result).toBe(true);
    });
  });
});
