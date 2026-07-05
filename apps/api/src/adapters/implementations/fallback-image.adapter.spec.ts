import { BadRequestException } from '@nestjs/common';
import { FallbackImageAdapter } from './fallback-image.adapter';
import { IImageGenerationPort } from '../interfaces/image-generation.port';

describe('FallbackImageAdapter', () => {
  let primary: jest.Mocked<IImageGenerationPort>;
  let adapter: FallbackImageAdapter;

  const testRequest = { prompt: 'a video thumbnail', maxCostUsd: 0.01 };

  beforeEach(() => {
    primary = { generate: jest.fn() };
    adapter = new FallbackImageAdapter(primary);
  });

  it('returns the primary result when generation succeeds', async () => {
    const result = {
      buffer: Buffer.from('img'),
      contentType: 'image/png' as const,
      provider: 'openai:dall-e-3',
      estimatedCostUsd: 0.04,
    };
    primary.generate.mockResolvedValue(result);

    await expect(adapter.generate(testRequest)).resolves.toEqual(result);
  });

  it('falls back to an SVG placeholder when the provider fails', async () => {
    primary.generate.mockRejectedValue(new Error('OpenAI API is down'));

    const result = await adapter.generate(testRequest);

    expect(result.provider).toBe('fallback:svg-placeholder');
    expect(result.estimatedCostUsd).toBe(0);
    expect(result.buffer.toString('utf-8')).toContain('<svg');
  });

  it('propagates BadRequestException instead of masking it with a fallback', async () => {
    const budgetError = new BadRequestException(
      'Image cost 0.08 USD exceeds budget 0.01 USD for size 1792x1024',
    );
    primary.generate.mockRejectedValue(budgetError);

    await expect(adapter.generate(testRequest)).rejects.toBe(budgetError);
  });
});
