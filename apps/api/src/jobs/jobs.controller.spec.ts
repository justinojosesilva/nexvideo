import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { EnqueueHealthCheckUseCase } from './use-cases/enqueue-health-check.use-case';
import { GetJobStatusUseCase } from './use-cases/get-job-status.use-case';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';

describe('JobsController', () => {
  let controller: JobsController;
  let enqueueHealthCheckUseCase: EnqueueHealthCheckUseCase;
  let getJobStatusUseCase: GetJobStatusUseCase;

  const mockUser: JwtPayload = {
    sub: 'user-1',
    organizationId: 'org-1',
    role: 'MEMBER',
    email: 'user@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: EnqueueHealthCheckUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue('health-check-123'),
          },
        },
        {
          provide: GetJobStatusUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    enqueueHealthCheckUseCase = module.get<EnqueueHealthCheckUseCase>(
      EnqueueHealthCheckUseCase,
    );
    getJobStatusUseCase = module.get<GetJobStatusUseCase>(GetJobStatusUseCase);
  });

  describe('healthCheck', () => {
    it('should enqueue health check job and return jobId', async () => {
      const result = await controller.healthCheck();

      expect(result).toEqual({ jobId: 'health-check-123' });

      expect(enqueueHealthCheckUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return job status', async () => {
      const mockStatus = {
        jobId: 'job-123',
        status: 'DONE' as const,
        type: 'generate-script' as const,
        progress: 100,
        createdAt: new Date('2026-04-08T12:00:00Z'),
        updatedAt: new Date('2026-04-08T12:05:00Z'),
      };

      (getJobStatusUseCase.execute as jest.Mock).mockResolvedValue(mockStatus);

      const result = await controller.getStatus('job-123', mockUser);

      expect(result).toEqual(mockStatus);

      expect(getJobStatusUseCase.execute).toHaveBeenCalledWith({
        jobId: 'job-123',
        organizationId: 'org-1',
      });
    });

    it('should throw NotFoundException when job does not exist', async () => {
      (getJobStatusUseCase.execute as jest.Mock).mockRejectedValue(
        new NotFoundException('Job not found'),
      );

      await expect(
        controller.getStatus('nonexistent', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when user is not authenticated', async () => {
      await expect(
        controller.getStatus('job-123', undefined),
      ).rejects.toThrow('User not authenticated');
    });
  });
});
