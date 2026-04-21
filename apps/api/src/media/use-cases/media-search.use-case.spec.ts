import { BadRequestException } from '@nestjs/common';
import { MediaAsset } from '@nexvideo/shared';
import { prisma } from '@nexvideo/database';
import { MediaSearchUseCase } from './media-search.use-case';
import { MediaAdapter } from '../../adapters/implementations/media.adapter';

// Mock prisma
jest.mock('@nexvideo/database', () => ({
  prisma: {
    script: {
      findUnique: jest.fn(),
    },
    mediaSuggestion: {
      create: jest.fn(),
    },
  },
}));

// Mock mediaQueryPrompt
jest.mock('@nexvideo/shared', () => {
  const actual = jest.requireActual('@nexvideo/shared');
  return {
    ...actual,
    mediaQueryPrompt: jest.fn(({ blockContent }) => `search for ${blockContent.substring(0, 20)}`),
  };
});

describe('MediaSearchUseCase', () => {
  let useCase: MediaSearchUseCase;
  let mediaAdapter: Partial<MediaAdapter>;

  const mockMediaAsset = (id: string, provider: 'pexels' | 'pixabay'): MediaAsset => ({
    id,
    url: `https://${provider}.com/${id}.jpg`,
    thumbnailUrl: `https://${provider}.com/${id}-thumb.jpg`,
    provider,
    license: 'commercial',
    type: 'image',
  });

  const mockVideoAsset = (id: string): MediaAsset => ({
    id,
    url: `https://example.com/${id}.mp4`,
    thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
    provider: 'pexels',
    license: 'commercial',
    type: 'video',
    duration: 120,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mediaAdapter = {
      searchImages: jest.fn(),
      searchVideos: jest.fn(),
    };

    useCase = new MediaSearchUseCase(mediaAdapter as MediaAdapter);
  });

  describe('execute', () => {
    const validInput = {
      scriptId: 'script-123',
      blockId: 'block-456',
      query: 'financial strategies',
      type: 'image' as const,
      organizationId: 'org-789',
      niche: 'finance',
      tone: 'professional',
    };

    it('should search and save media assets', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [
          { id: 'block-456', content: 'Financial strategies for beginners' },
        ],
      };

      const mockAssets = [
        mockMediaAsset('img-1', 'pexels'),
        mockMediaAsset('img-2', 'pixabay'),
      ];

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);
      (mediaAdapter.searchImages as jest.Mock).mockResolvedValueOnce(mockAssets);
      (prisma.mediaSuggestion.create as jest.Mock).mockResolvedValue({ id: 'sugg-1' });

      const result = await useCase.execute(validInput);

      expect(result).toHaveLength(2);
      expect(result[0].provider).toBe('pexels');
      expect(result[1].provider).toBe('pixabay');
      expect(mediaAdapter.searchImages).toHaveBeenCalledWith('financial strategies', 1);
      expect(prisma.mediaSuggestion.create).toHaveBeenCalledTimes(2);
    });

    it('should search videos when type is video', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [{ id: 'block-456', content: 'Video content' }],
      };

      const mockVideos = [mockVideoAsset('vid-1'), mockVideoAsset('vid-2')];

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);
      (mediaAdapter.searchVideos as jest.Mock).mockResolvedValueOnce(mockVideos);
      (prisma.mediaSuggestion.create as jest.Mock).mockResolvedValue({ id: 'sugg-1' });

      const input = { ...validInput, type: 'video' as const };
      const result = await useCase.execute(input);

      expect(result).toHaveLength(2);
      expect(mediaAdapter.searchVideos).toHaveBeenCalledWith('financial strategies', 1);
      expect(result[0].type).toBe('video');
      expect(result[0].duration).toBe(120);
    });

    it('should generate query if not provided', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [{ id: 'block-456', content: 'Test content' }],
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { query: _removed, ...inputWithoutQuery } = validInput;

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);
      (mediaAdapter.searchImages as jest.Mock).mockResolvedValueOnce([mockMediaAsset('img-1', 'pexels')]);
      (prisma.mediaSuggestion.create as jest.Mock).mockResolvedValue({ id: 'sugg-1' });

      await useCase.execute(inputWithoutQuery);

      expect(mediaAdapter.searchImages).toHaveBeenCalled();
      // Verify query was generated (mediaQueryPrompt was called)
    });

    it('should limit results to 8 maximum', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [{ id: 'block-456', content: 'Content' }],
      };

      const manyAssets = Array.from({ length: 15 }, (_, i) =>
        mockMediaAsset(`img-${i + 1}`, i % 2 === 0 ? 'pexels' : 'pixabay'),
      );

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);
      (mediaAdapter.searchImages as jest.Mock).mockResolvedValueOnce(manyAssets);
      (prisma.mediaSuggestion.create as jest.Mock).mockResolvedValue({ id: 'sugg-1' });

      const result = await useCase.execute(validInput);

      expect(result).toHaveLength(8);
      expect(prisma.mediaSuggestion.create).toHaveBeenCalledTimes(8);
    });

    it('should save asset metadata correctly', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [{ id: 'block-456', content: 'Content' }],
      };

      const mockAssets = [mockMediaAsset('img-1', 'pexels')];

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);
      (mediaAdapter.searchImages as jest.Mock).mockResolvedValueOnce(mockAssets);
      (prisma.mediaSuggestion.create as jest.Mock).mockResolvedValue({ id: 'sugg-1' });

      await useCase.execute(validInput);

      expect(prisma.mediaSuggestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-789',
          projectId: 'project-123',
          prompt: 'financial strategies',
          url: expect.stringContaining('pexels.com'),
          metadata: expect.objectContaining({
            blockId: 'block-456',
            provider: 'pexels',
            license: 'commercial',
            commercialUse: true,
          }),
        }),
      });
    });

    it('should throw if script not found', async () => {
      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if scriptId or blockId missing', async () => {
      const invalidInput = { ...validInput, scriptId: '' };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        'Missing scriptId or blockId',
      );
    });

    it('should throw if block not found in script', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [{ id: 'different-block', content: 'Content' }],
      };

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);

      await expect(useCase.execute(validInput)).rejects.toThrow(
        'Script block not found or empty',
      );
    });

    it('should throw if invalid media type', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [{ id: 'block-456', content: 'Content' }],
      };

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);

      const invalidInput = { ...validInput, type: 'audio' as any };

      await expect(useCase.execute(invalidInput)).rejects.toThrow(
        'Invalid media type',
      );
    });

    it('should handle empty search results', async () => {
      const mockScript = {
        id: 'script-123',
        projectId: 'project-123',
        blocks: [{ id: 'block-456', content: 'Content' }],
      };

      (prisma.script.findUnique as jest.Mock).mockResolvedValueOnce(mockScript);
      (mediaAdapter.searchImages as jest.Mock).mockResolvedValueOnce([]);

      const result = await useCase.execute(validInput);

      expect(result).toHaveLength(0);
      expect(prisma.mediaSuggestion.create).not.toHaveBeenCalled();
    });
  });
});
