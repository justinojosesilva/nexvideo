import { Inject, Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  thumbnailImagePrompt,
  type ThumbnailImageInput,
} from '@nexvideo/prompts';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IImageGenerationPort,
  ImageGenerationResult,
} from '../../adapters/interfaces/image-generation.port';
import { IStoragePort } from '../../adapters/interfaces/storage.port';

export interface GenerateThumbnailInput extends ThumbnailImageInput {
  organizationId: string;
  projectId?: string;
  maxCostUsd?: number;
}

export interface GenerateThumbnailOutput {
  url: string;
  provider: string;
  estimatedCostUsd: number;
  fallbackUsed: boolean;
  prompt: string;
}

const DEFAULT_MAX_COST_USD = 0.1;

@Injectable()
export class GenerateThumbnailUseCase {
  private readonly logger = new Logger(GenerateThumbnailUseCase.name);

  constructor(
    @Inject('IImageGenerationPort')
    private readonly imageGen: IImageGenerationPort,
    @Inject('IStoragePort')
    private readonly storage: IStoragePort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: GenerateThumbnailInput): Promise<GenerateThumbnailOutput> {
    if (input.projectId) {
      const owned = await this.prisma.client.contentProject.findFirst({
        where: { id: input.projectId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!owned) {
        throw new ForbiddenException('Project not found in this organization');
      }
    }

    const prompt = thumbnailImagePrompt({
      topic: input.topic,
      niche: input.niche,
      primaryText: input.primaryText,
      secondaryText: input.secondaryText,
      template: input.template,
      style: input.style,
      palette: input.palette,
    });

    const result: ImageGenerationResult = await this.imageGen.generate({
      prompt,
      size: '1792x1024',
      maxCostUsd: input.maxCostUsd ?? DEFAULT_MAX_COST_USD,
    });

    const ext = result.contentType === 'image/jpeg' ? 'jpg' : 'png';
    const filename = `thumbnails/${input.organizationId}/${Date.now()}-${randomUUID()}.${ext}`;
    const url = await this.storage.uploadFile(
      result.buffer,
      filename,
      result.contentType,
    );

    const fallbackUsed = result.provider.startsWith('fallback:');

    if (input.projectId) {
      await this.prisma.client.publicationMetadata.upsert({
        where: { projectId: input.projectId },
        create: {
          organizationId: input.organizationId,
          projectId: input.projectId,
          platform: 'youtube',
          thumbnailUrl: url,
        },
        update: { thumbnailUrl: url },
      });
    }

    this.logger.log(
      {
        organizationId: input.organizationId,
        projectId: input.projectId,
        provider: result.provider,
        cost: result.estimatedCostUsd,
        fallbackUsed,
      },
      'Thumbnail generated',
    );

    return {
      url,
      provider: result.provider,
      estimatedCostUsd: result.estimatedCostUsd,
      fallbackUsed,
      prompt,
    };
  }
}
