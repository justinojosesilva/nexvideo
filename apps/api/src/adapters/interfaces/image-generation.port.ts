/**
 * Port for AI-powered image generation (e.g. DALL·E, Stability, etc.).
 */
export interface ImageGenerationRequest {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  maxCostUsd?: number;
}

export interface ImageGenerationResult {
  buffer: Buffer;
  contentType: 'image/png' | 'image/jpeg';
  provider: string;
  estimatedCostUsd: number;
}

export interface IImageGenerationPort {
  generate(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
