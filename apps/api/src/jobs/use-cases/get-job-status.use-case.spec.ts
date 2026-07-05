import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetJobStatusUseCase } from './get-job-status.use-case';
import { JOBS_QUEUE_TOKEN } from '../../bullmq/bullmq.module';

describe('GetJobStatusUseCase', () => {
  let useCase: GetJobStatusUseCase;

  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetJobStatusUseCase,
        {
          provide: JOBS_QUEUE_TOKEN,
          useValue: mockQueue,
        },
      ],
    }).compile();

    useCase = module.get<GetJobStatusUseCase>(GetJobStatusUseCase);
  });

  describe('execute', () => {
    it('should return job with status DONE and scriptId when completed', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'generate-script',
        data: { organizationId: 'org-1' },
        progress: 100,
        timestamp: 1712580000000,
        processedOn: 1712580300000,
        returnvalue: { scriptId: 'script-xyz' },
        getState: jest.fn().mockResolvedValue('completed'),
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await useCase.execute({
        jobId: 'job-123',
        organizationId: 'org-1',
      });

      expect(result.jobId).toBe('job-123');
      expect(result.status).toBe('DONE');
      expect(result.type).toBe('generate-script');
      expect(result.progress).toBe(100);
      expect(result.result?.scriptId).toBe('script-xyz');
    });

    it('should surface trend analysis payload for analyze-trends jobs', async () => {
      const mockJob = {
        id: 'job-trend',
        name: 'analyze-trends',
        data: { organizationId: 'org-1' },
        progress: 100,
        returnvalue: {
          trendAnalysis: { id: 'ta-1' },
          finalScore: 75,
          scores: { demand: 80 },
        },
        getState: jest.fn().mockResolvedValue('completed'),
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await useCase.execute({
        jobId: 'job-trend',
        organizationId: 'org-1',
      });

      expect(result.result?.trendAnalysis).toEqual({ id: 'ta-1' });
      expect(result.result?.finalScore).toBe(75);
      expect(result.result?.scores).toEqual({ demand: 80 });
    });

    it('should return job with status PROCESSING when active', async () => {
      const mockJob = {
        id: 'job-456',
        name: 'generate-narration',
        data: {},
        progress: 50,
        getState: jest.fn().mockResolvedValue('active'),
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await useCase.execute({
        jobId: 'job-456',
        organizationId: 'org-1',
      });

      expect(result.status).toBe('PROCESSING');
      expect(result.progress).toBe(50);
    });

    it('should return job with status PENDING by default', async () => {
      const mockJob = {
        id: 'job-789',
        name: 'health-check',
        data: {},
        progress: undefined,
        getState: jest.fn().mockResolvedValue('waiting'),
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await useCase.execute({
        jobId: 'job-789',
        organizationId: 'org-1',
      });

      expect(result.status).toBe('PENDING');
    });

    it('should return job with status FAILED and errorMessage when failed', async () => {
      const mockJob = {
        id: 'job-fail',
        name: 'generate-script',
        data: {},
        progress: undefined,
        failedReason: 'Job execution error',
        getState: jest.fn().mockResolvedValue('failed'),
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await useCase.execute({
        jobId: 'job-fail',
        organizationId: 'org-1',
      });

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Job execution error');
    });

    it('should throw NotFoundException when job does not exist', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      await expect(
        useCase.execute({ jobId: 'nonexistent', organizationId: 'org-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when job belongs to another organization', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'generate-script',
        data: { organizationId: 'org-2' },
        progress: 0,
        getState: jest.fn().mockResolvedValue('waiting'),
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      await expect(
        useCase.execute({ jobId: 'job-123', organizationId: 'org-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
