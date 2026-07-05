import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { prisma } from '@nexvideo/database';
import {
  ChecklistResult,
  evaluateExportChecklist,
} from '../export-checklist';

interface GetExportChecklistInput {
  projectId: string;
  organizationId: string;
}

@Injectable()
export class GetExportChecklistUseCase {
  private readonly logger = new Logger(GetExportChecklistUseCase.name);

  async execute(input: GetExportChecklistInput): Promise<ChecklistResult> {
    const { projectId, organizationId } = input;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    const project = await prisma.contentProject.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const [script, selectedAssetsCount, pubMeta] = await Promise.all([
      prisma.script.findFirst({
        where: { projectId, status: 'approved' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
      prisma.mediaSuggestion.count({
        where: {
          projectId,
          organizationId,
          metadata: { path: ['selected'], equals: true },
        },
      }),
      prisma.publicationMetadata.findUnique({
        where: { projectId },
        select: {
          title: true,
          tags: true,
          thumbnailUrl: true,
          complianceScore: true,
        },
      }),
    ]);

    let hasCompletedNarration = false;
    if (script) {
      const narration = await prisma.narration.findFirst({
        where: { scriptId: script.id, status: 'completed' },
        select: { id: true },
      });
      hasCompletedNarration = narration !== null;
    }

    const result = evaluateExportChecklist({
      hasApprovedScript: script !== null,
      hasCompletedNarration,
      selectedAssetsCount,
      publicationTitle: pubMeta?.title ?? null,
      thumbnailUrl: pubMeta?.thumbnailUrl ?? null,
      tagsCount: pubMeta?.tags?.length ?? 0,
      complianceScore: pubMeta?.complianceScore ?? null,
    });

    this.logger.debug(
      `Checklist for project ${projectId}: canExport=${result.canExport} blocking=${result.blocking.join(',') || 'none'}`,
    );

    return result;
  }
}
