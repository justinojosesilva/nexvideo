import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IImageGenerationPort,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../interfaces/image-generation.port';

/**
 * DALL·E 3 image generation adapter.
 * Costs (2024 pricing reference): 1024x1024 standard ≈ $0.040, 1792x1024 ≈ $0.080.
 */
@Injectable()
export class OpenAIImageAdapter implements IImageGenerationPort {
  private readonly logger = new Logger(OpenAIImageAdapter.name);
  private readonly client: OpenAI;

  private static readonly MODEL = 'dall-e-3';
  private static readonly MAX_PROMPT_LEN = 1000;
  private static readonly COST_BY_SIZE: Record<string, number> = {
    '1024x1024': 0.04,
    '1792x1024': 0.08,
    '1024x1792': 0.08,
  };

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const size = req.size ?? '1792x1024';
    const cost = OpenAIImageAdapter.COST_BY_SIZE[size] ?? 0.08;

    if (req.maxCostUsd !== undefined && cost > req.maxCostUsd) {
      throw new BadRequestException(
        `Image cost ${cost} USD exceeds budget ${req.maxCostUsd} USD for size ${size}`,
      );
    }

    if (req.prompt.length > OpenAIImageAdapter.MAX_PROMPT_LEN) {
      throw new BadRequestException(
        `Prompt exceeds ${OpenAIImageAdapter.MAX_PROMPT_LEN} chars`,
      );
    }

    this.logger.debug(
      `Generating image with ${OpenAIImageAdapter.MODEL} size=${size} cost~$${cost}`,
    );

    const response = await this.client.images.generate({
      model: OpenAIImageAdapter.MODEL,
      prompt: req.prompt,
      n: 1,
      size,
      response_format: 'b64_json',
      quality: 'standard',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('OpenAI returned no image data');
    }

    return {
      buffer: Buffer.from(b64, 'base64'),
      contentType: 'image/png',
      provider: 'openai:dall-e-3',
      estimatedCostUsd: cost,
    };
  }
}
