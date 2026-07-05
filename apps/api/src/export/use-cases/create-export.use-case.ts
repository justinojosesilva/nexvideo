import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { prisma } from '@nexvideo/database';
import { JOBS_QUEUE_TOKEN } from '../../bullmq/bullmq.module';
import { ExportJobRepository } from '../../repositories/export-job.repository';
import { evaluateExportChecklist } from '../export-checklist';

interface CreateExportInput {
  projectId: string;
  organizationId: string;
}

export interface CreateExportOutput {
  exportJobId: string;
  bullmqJobId: string;
}

@Injectable()
export class CreateExportUseCase {
  private readonly logger = new Logger(CreateExportUseCase.name);

  constructor(
    private readonly exportJobRepo: ExportJobRepository,
    @Inject(JOBS_QUEUE_TOKEN) private readonly jobsQueue: Queue,
  ) {}

  async execute(input: CreateExportInput): Promise<CreateExportOutput> {
    const { projectId, organizationId } = input;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // 1. Verify project belongs to organization
    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // 2. Gather signals: approved script, completed narration, selected media, publication metadata
    const script = await prisma.script.findFirst({
      where: { projectId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });

    let narration: any = null;
    if (script) {
      narration = await prisma.narration.findFirst({
        where: { scriptId: script.id, status: 'completed' },
        orderBy: { createdAt: 'desc' },
      });
    }

    const selectedAssets = await prisma.mediaSuggestion.findMany({
      where: {
        projectId,
        organizationId,
        metadata: { path: ['selected'], equals: true },
      },
    });

    const pubMeta = await prisma.publicationMetadata.findUnique({
      where: { projectId },
    });

    // 3. Run full pre-publication checklist (compliance, thumbnail, tags, ...) — blocks on critical
    const checklist = evaluateExportChecklist({
      hasApprovedScript: script !== null,
      hasCompletedNarration: narration !== null,
      selectedAssetsCount: selectedAssets.length,
      publicationTitle: pubMeta?.title ?? null,
      thumbnailUrl: pubMeta?.thumbnailUrl ?? null,
      tagsCount: pubMeta?.tags?.length ?? 0,
      complianceScore: pubMeta?.complianceScore ?? null,
    });

    if (!checklist.canExport || !script || !narration) {
      throw new UnprocessableEntityException({
        message: 'Project does not meet export requirements',
        missing: checklist.blocking,
        items: checklist.items,
      });
    }

    // 6. Create ExportJob entity
    const exportJob = await this.exportJobRepo.create({
      organizationId,
      projectId,
      assetType: 'metadata',
    });

    // 7. Enqueue BullMQ job
    const bullmqJob = await this.jobsQueue.add(
      'process-export',
      {
        exportJobId: exportJob.id,
        projectId,
        scriptId: script.id,
        narrationId: narration.id,
        organizationId,
      },
      {
        jobId: `process-export-${projectId}-${Date.now()}`,
      },
    );

    this.logger.debug(
      `Export job created: ${exportJob.id}, BullMQ job: ${bullmqJob.id}`,
    );

    return {
      exportJobId: exportJob.id,
      bullmqJobId: bullmqJob.id!,
    };
  }
}
