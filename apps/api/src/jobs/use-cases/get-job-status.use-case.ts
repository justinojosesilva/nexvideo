import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOBS_QUEUE_TOKEN } from '../../bullmq/bullmq.module';
import { JobStatusResponse } from '../dto/job-status.response';

interface GetJobStatusInput {
  jobId: string;
  organizationId: string;
}

@Injectable()
export class GetJobStatusUseCase {
  constructor(@Inject(JOBS_QUEUE_TOKEN) private jobsQueue: Queue) {}

  async execute(input: GetJobStatusInput): Promise<JobStatusResponse> {
    const job = await this.jobsQueue.getJob(input.jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify organization ownership of the job
    const jobData = job.data as Record<string, unknown>;
    if (
      jobData.organizationId &&
      jobData.organizationId !== input.organizationId
    ) {
      throw new ForbiddenException('Not authorized to access this job');
    }

    const state = await job.getState();
    const progress = job.progress;

    let status: JobStatusResponse['status'] = 'PENDING';
    if (state === 'completed') {
      status = 'DONE';
    } else if (state === 'failed') {
      status = 'FAILED';
    } else if (state === 'active') {
      status = 'PROCESSING';
    }

    // Extract job type from job name
    const jobType = (job.name as JobStatusResponse['type']) || 'health-check';

    // Extract result from completed job
    let result: JobStatusResponse['result'] | undefined;
    if (status === 'DONE' && (job as any).returnvalue) {
      const jobResult = (job as any).returnvalue;
      // Extract script or narration ID from result
      if (typeof jobResult === 'object' && jobResult !== null) {
        result = {};
        if ((jobResult as any).script?.id) {
          result.scriptId = (jobResult as any).script.id;
        }
        if ((jobResult as any).scriptId) {
          result.scriptId = (jobResult as any).scriptId;
        }
        if ((jobResult as any).narrationId) {
          result.narrationId = (jobResult as any).narrationId;
        }
        // For analyze-trends jobs, surface the full payload so preview
        // mode (no persisted record) can read results from the job.
        if (jobType === 'analyze-trends') {
          result.trendAnalysis = (jobResult as any).trendAnalysis;
          result.finalScore = (jobResult as any).finalScore;
          result.scores = (jobResult as any).scores;
        }
      }
    }

    // Get timestamps from job - BullMQ stores timestamp property
    const createdAt = (job as any).timestamp
      ? new Date((job as any).timestamp)
      : new Date();
    const updatedAt = (job as any).processedOn
      ? new Date((job as any).processedOn)
      : createdAt;

    const response: JobStatusResponse = {
      jobId: job.id!,
      status,
      type: jobType,
      progress: typeof progress === 'number' ? progress : undefined,
      result,
      createdAt,
      updatedAt,
    };

    if (job.failedReason) {
      response.errorMessage = job.failedReason;
    }

    return response;
  }
}
