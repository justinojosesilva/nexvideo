import { Injectable, Logger } from '@nestjs/common';
import {
  IImageGenerationPort,
  ImageGenerationRequest,
  ImageGenerationResult,
} from '../interfaces/image-generation.port';

/**
 * Fallback image generator: wraps a primary provider and on failure produces
 * a deterministic SVG placeholder so the user flow never breaks.
 */
@Injectable()
export class FallbackImageAdapter implements IImageGenerationPort {
  private readonly logger = new Logger(FallbackImageAdapter.name);

  constructor(private readonly primary: IImageGenerationPort) {}

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      return await this.primary.generate(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        { err: message },
        'Primary image provider failed — using SVG placeholder',
      );

      const svg = this.buildPlaceholderSvg(req.prompt);
      return {
        buffer: Buffer.from(svg, 'utf-8'),
        contentType: 'image/png',
        provider: 'fallback:svg-placeholder',
        estimatedCostUsd: 0,
      };
    }
  }

  private buildPlaceholderSvg(prompt: string): string {
    const headline = (prompt.split('\n').find((l) => l.includes('"')) ?? prompt)
      .replace(/[<>&"]/g, '')
      .slice(0, 60);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f1147"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <text x="640" y="360" font-family="Inter, Arial, sans-serif" font-size="84" font-weight="800" text-anchor="middle" fill="#ffffff">
    ${headline || 'Thumbnail indisponível'}
  </text>
  <text x="640" y="440" font-family="Inter, Arial, sans-serif" font-size="32" text-anchor="middle" fill="#cbb7ff">
    Fallback placeholder
  </text>
</svg>`;
  }
}
