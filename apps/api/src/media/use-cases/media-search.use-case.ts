import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { MediaAsset } from '@nexvideo/shared';
import { mediaQueryPrompt } from '@nexvideo/prompts';
import { prisma } from '@nexvideo/database';
import { SearchMediaDto } from '../dto/search-media.dto';
import { MediaAdapter } from '../../adapters/implementations/media.adapter';

interface SearchMediaInput extends SearchMediaDto {
  organizationId: string;
  niche: string;
  tone: string;
}

@Injectable()
export class MediaSearchUseCase {
  private readonly logger = new Logger(MediaSearchUseCase.name);

  constructor(private readonly mediaAdapter: MediaAdapter) {}

  async execute(input: SearchMediaInput): Promise<MediaAsset[]> {
    const { scriptId, blockId, query: providedQuery, type, organizationId, niche, tone } =
      input;

    if (!scriptId || !blockId) {
      throw new BadRequestException('Missing scriptId or blockId');
    }

    // Fetch script from database
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      throw new BadRequestException('Script not found');
    }

    // Extract block content from script.blocks (JSON array)
    let blockContent = '';
    if (Array.isArray(script.blocks)) {
      const block = (script.blocks as any[]).find((b: any) => b.id === blockId);
      if (block && typeof block.content === 'string') {
        blockContent = block.content;
      }
    }

    if (!blockContent) {
      throw new BadRequestException('Script block not found or empty');
    }

    // Generate query if not provided
    let query = providedQuery || '';
    if (!query) {
      query = mediaQueryPrompt({
        blockContent,
        niche,
        tone,
      }).trim();
    }

    this.logger.debug(
      `Searching ${type} for script ${scriptId} block ${blockId} with query: "${query}"`,
    );

    // Search for media based on type
    let results: MediaAsset[] = [];
    if (type === 'image') {
      results = await this.mediaAdapter.searchImages(query, 1);
    } else if (type === 'video') {
      results = await this.mediaAdapter.searchVideos(query, 1);
    } else {
      throw new BadRequestException('Invalid media type. Must be "image" or "video"');
    }

    // Limit to 8 results, already ordered by relevance from adapter
    const limitedResults = results.slice(0, 8);

    // Save suggestions to database
    for (const asset of limitedResults) {
      await prisma.mediaSuggestion.create({
        data: {
          organizationId,
          projectId: script.projectId,
          type: type === 'image' ? 'thumbnail_image' : 'video',
          prompt: query,
          url: asset.url,
          metadata: {
            blockId,
            provider: asset.provider,
            license: asset.license,
            commercialUse: asset.license === 'commercial',
            assetId: asset.id,
            duration: asset.duration,
          },
        },
      });
    }

    this.logger.debug(
      `Found ${limitedResults.length} media suggestions for script ${scriptId}`,
    );

    return limitedResults;
  }
}
