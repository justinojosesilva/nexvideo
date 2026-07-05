import { Inject, Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  thumbnailImagePrompt,
  type ThumbnailImageInput,
  type ThumbnailTemplate,
  type ThumbnailStyle,
} from '@nexvideo/prompts';
import { PrismaService } from '../../prisma/prisma.service';
import { IImageGenerationPort } from '../../adapters/interfaces/image-generation.port';
import { IStoragePort } from '../../adapters/interfaces/storage.port';

export interface PreviewThumbnailsInput
  extends Omit<ThumbnailImageInput, 'template' | 'style'> {
  organizationId: string;
  projectId: string;
  count: number;
  template?: ThumbnailTemplate;
  style?: ThumbnailStyle;
  maxCostUsd?: number;
}

export interface ThumbnailVariant {
  id: string;
  url: string;
  template: ThumbnailTemplate;
  style: ThumbnailStyle;
  provider: string;
  estimatedCostUsd: number;
  fallbackUsed: boolean;
}

export interface PreviewThumbnailsOutput {
  variants: ThumbnailVariant[];
  totalCostUsd: number;
}

const DEFAULT_TEMPLATES: ThumbnailTemplate[] = [
  'face-reaction',
  'text-only',
  'object-centric',
];
const DEFAULT_MAX_COST_USD = 0.1;

@Injectable()
export class PreviewThumbnailsUseCase {
  private readonly logger = new Logger(PreviewThumbnailsUseCase.name);

  constructor(
    @Inject('IImageGenerationPort')
    private readonly imageGen: IImageGenerationPort,
    @Inject('IStoragePort')
    private readonly storage: IStoragePort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: PreviewThumbnailsInput): Promise<PreviewThumbnailsOutput> {
    const owned = await this.prisma.client.contentProject.findFirst({
      where: { id: input.projectId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!owned) {
      throw new ForbiddenException('Project not found in this organization');
    }

    const count = Math.max(1, Math.min(3, input.count));
    const baseStyle: ThumbnailStyle = input.style ?? 'dark';
    const templates: ThumbnailTemplate[] = Array.from({ length: count }).map(
      (_, i) => input.template ?? DEFAULT_TEMPLATES[i % DEFAULT_TEMPLATES.length]!,
    );

    const variants: ThumbnailVariant[] = [];
    let totalCost = 0;

    for (const template of templates) {
      const prompt = thumbnailImagePrompt({
        topic: input.topic,
        niche: input.niche,
        primaryText: input.primaryText,
        secondaryText: input.secondaryText,
        palette: input.palette,
        template,
        style: baseStyle,
      });

      const result = await this.imageGen.generate({
        prompt,
        size: '1792x1024',
        maxCostUsd: input.maxCostUsd ?? DEFAULT_MAX_COST_USD,
      });

      const ext = result.contentType === 'image/jpeg' ? 'jpg' : 'png';
      const id = randomUUID();
      const filename = `thumbnails/${input.organizationId}/preview/${Date.now()}-${id}.${ext}`;
      const url = await this.storage.uploadFile(
        result.buffer,
        filename,
        result.contentType,
      );

      variants.push({
        id,
        url,
        template,
        style: baseStyle,
        provider: result.provider,
        estimatedCostUsd: result.estimatedCostUsd,
        fallbackUsed: result.provider.startsWith('fallback:'),
      });

      totalCost += result.estimatedCostUsd;
    }

    this.logger.log(
      {
        organizationId: input.organizationId,
        projectId: input.projectId,
        count: variants.length,
        totalCost,
      },
      'Thumbnail preview variants generated',
    );

    return { variants, totalCostUsd: totalCost };
  }
}
