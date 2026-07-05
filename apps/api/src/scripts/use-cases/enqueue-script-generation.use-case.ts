import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOBS_QUEUE_TOKEN } from '../../bullmq/bullmq.module';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScriptQueueDto } from '../dto/create-script-queue.dto';

export interface EnqueueScriptGenerationInput extends CreateScriptQueueDto {
  organizationId: string;
}

export interface EnqueueScriptGenerationOutput {
  jobId: string;
  status: 'PENDING';
}

@Injectable()
export class EnqueueScriptGenerationUseCase {
  constructor(
    @Inject(JOBS_QUEUE_TOKEN) private jobsQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async execute(
    input: EnqueueScriptGenerationInput,
  ): Promise<EnqueueScriptGenerationOutput> {
    // Verify project exists and belongs to organization
    const project = await this.prisma.client.contentProject.findUnique({
      where: { id: input.projectId },
      select: { id: true, organizationId: true },
    });

    if (!project) {
      throw new BadRequestException(`Project ${input.projectId} not found`);
    }

    if (project.organizationId !== input.organizationId) {
      throw new BadRequestException(
        `Project does not belong to organization ${input.organizationId}`,
      );
    }

    // Verify trend analysis exists and belongs to the same project and organization
    const trendAnalysis = await this.prisma.client.trendAnalysis.findUnique({
      where: { id: input.trendAnalysisId },
      select: { id: true, projectId: true, organizationId: true },
    });

    if (!trendAnalysis) {
      throw new BadRequestException(
        `Trend analysis ${input.trendAnalysisId} not found`,
      );
    }

    if (trendAnalysis.projectId !== input.projectId) {
      throw new BadRequestException(
        `Trend analysis does not belong to project ${input.projectId}`,
      );
    }

    if (trendAnalysis.organizationId !== input.organizationId) {
      throw new BadRequestException(
        `Trend analysis does not belong to organization ${input.organizationId}`,
      );
    }

    // Enqueue job with deterministic ID
    const jobId = `generate-script-${input.projectId}-${input.trendAnalysisId}-${Date.now()}`;
    const job = await this.jobsQueue.add(
      'generate-script',
      {
        projectId: input.projectId,
        organizationId: input.organizationId,
        trendAnalysisId: input.trendAnalysisId,
        formatType: input.formatType,
        tone: input.tone,
        keyword: input.keyword,
      },
      { jobId, removeOnComplete: false },
    );

    return {
      jobId: job.id!,
      status: 'PENDING',
    };
  }
}
