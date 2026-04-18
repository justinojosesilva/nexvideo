import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { StructuredLoggerService } from './structured-logger.service';

const mockPinoLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('StructuredLoggerService', () => {
  let service: StructuredLoggerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StructuredLoggerService,
        {
          provide: getLoggerToken(StructuredLoggerService.name),
          useValue: mockPinoLogger,
        },
      ],
    }).compile();

    service = module.get<StructuredLoggerService>(StructuredLoggerService);
  });

  describe('logJob', () => {
    it('should call info for INFO level', () => {
      const jobLog = {
        timestamp: '2026-04-08T20:30:00Z',
        level: 'INFO' as const,
        jobId: 'job-123',
        organizationId: 'org-1',
        type: 'script' as const,
        status: 'completed' as const,
        durationMs: 5000,
        costBrl: 1.5,
        provider: 'openai',
      };

      service.logJob(jobLog);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-123', costBrl: 1.5 }),
        'job_event',
      );
    });

    it('should call warn for WARN level', () => {
      service.logJob({
        level: 'WARN',
        jobId: 'job-123',
        type: 'script',
        status: 'completed',
      });

      expect(mockPinoLogger.warn).toHaveBeenCalled();
    });

    it('should call error for ERROR level', () => {
      service.logJob({
        level: 'ERROR',
        jobId: 'job-123',
        type: 'script',
        status: 'failed',
      });

      expect(mockPinoLogger.error).toHaveBeenCalled();
    });

    it('should add timestamp if not provided', () => {
      service.logJob({
        level: 'INFO',
        jobId: 'job-123',
        type: 'script',
        status: 'completed',
      });

      const [fields] = mockPinoLogger.info.mock.calls[0];
      expect(fields.timestamp).toBeDefined();
      expect(fields.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('logCostWarning', () => {
    it('should log warning when cost exceeds 80% of max', () => {
      service.logCostWarning('job-123', 'org-1', 1.6, 2.0);

      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'COST_WARNING',
          costBrl: 1.6,
        }),
        'job_event',
      );
    });

    it('should include percentage in warning message', () => {
      service.logCostWarning('job-123', 'org-1', 1.8, 2.0);

      const [fields] = mockPinoLogger.warn.mock.calls[0];
      expect(fields.errorMessage).toContain('90.0%');
    });
  });

  describe('logApiError', () => {
    it('should log API error with provider and error code', () => {
      service.logApiError('job-123', 'org-1', 'elevenlabs', 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 'narration');

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          provider: 'elevenlabs',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          type: 'narration',
        }),
        'job_event',
      );
    });

    it('should sanitize sensitive data from error messages', () => {
      service.logApiError('job-123', 'org-1', 'openai', 'AUTH_ERROR', 'API error: api_key=sk_live_1234567890abcdefghij');

      const [fields] = mockPinoLogger.error.mock.calls[0];
      expect(fields.errorMessage).not.toContain('sk_live_');
      expect(fields.errorMessage).toContain('***');
    });

    it('should sanitize Bearer tokens', () => {
      service.logApiError('job-123', 'org-1', 'external-api', 'AUTH_ERROR', 'Auth failed: Bearer abc123def456xyz');

      const [fields] = mockPinoLogger.error.mock.calls[0];
      expect(fields.errorMessage).not.toContain('abc123def456xyz');
      expect(fields.errorMessage).toContain('bearer ***');
    });
  });

  describe('logJobStart', () => {
    it('should log job start with queue wait time', () => {
      service.logJobStart('job-123', 'org-1', 'script', 1500);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'started', queueWaitMs: 1500 }),
        'job_event',
      );
    });
  });

  describe('logJobCompletion', () => {
    it('should log job completion with all metrics', () => {
      service.logJobCompletion('job-123', 'org-1', 'narration', 3000, 0.75, 'elevenlabs');

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          processingMs: 3000,
          durationMs: 3000,
          costBrl: 0.75,
          provider: 'elevenlabs',
          type: 'narration',
        }),
        'job_event',
      );
    });
  });
});
