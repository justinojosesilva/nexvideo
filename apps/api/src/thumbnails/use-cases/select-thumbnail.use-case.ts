import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SelectThumbnailInput {
  organizationId: string;
  projectId: string;
  thumbnailUrl: string;
}

@Injectable()
export class SelectThumbnailUseCase {
  private readonly logger = new Logger(SelectThumbnailUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: SelectThumbnailInput): Promise<{ thumbnailUrl: string }> {
    const project = await this.prisma.client.contentProject.findFirst({
      where: { id: input.projectId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!project) {
      throw new ForbiddenException('Project not found in this organization');
    }

    if (!/^https?:\/\//i.test(input.thumbnailUrl)) {
      throw new BadRequestException('Invalid thumbnail URL');
    }

    await this.prisma.client.publicationMetadata.upsert({
      where: { projectId: input.projectId },
      create: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        platform: 'youtube',
        thumbnailUrl: input.thumbnailUrl,
      },
      update: { thumbnailUrl: input.thumbnailUrl },
    });

    this.logger.log(
      { organizationId: input.organizationId, projectId: input.projectId },
      'Thumbnail selected',
    );

    return { thumbnailUrl: input.thumbnailUrl };
  }
}
