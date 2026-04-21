import { ConfigService } from '@nestjs/config';
import { YouTubeDataAdapter } from './youtube-data.adapter';
import { YouTubeApiError } from '../exceptions/youtube-api.error';
import { Platform } from '@nexvideo/shared';

describe('YouTubeDataAdapter', () => {
  let adapter: YouTubeDataAdapter;
  let configService: Partial<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'YOUTUBE_API_KEY') {
          return 'test-api-key';
        }
        return undefined;
      }),
    };

    adapter = new YouTubeDataAdapter(configService as ConfigService, null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(adapter).toBeDefined();
    });

    it('should throw if YOUTUBE_API_KEY is not set', () => {
      const emptyConfig = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService;

      expect(() => {
        new YouTubeDataAdapter(emptyConfig, null);
      }).toThrow('YOUTUBE_API_KEY is not set');
    });
  });

  describe('searchVideos', () => {
    it('should search videos and return formatted results', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { videoId: 'video1' },
            snippet: {
              title: 'Video 1',
              description: 'Description 1',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { high: { url: 'http://example.com/thumb.jpg' } },
              channelTitle: 'Channel 1',
            },
          },
        ],
      };

      const mockVideoResponse = {
        items: [
          {
            id: 'video1',
            snippet: {
              title: 'Video 1',
              description: 'Description 1',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { high: { url: 'http://example.com/thumb.jpg' } },
            },
            contentDetails: { duration: 'PT10M30S' },
            statistics: {
              viewCount: '1000',
              likeCount: '100',
              commentCount: '10',
            },
          },
        ],
      };

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVideoResponse,
        } as Response);

      const result = await adapter.searchVideos('test query', 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        videoId: 'video1',
        title: 'Video 1',
        platform: Platform.YOUTUBE,
        views: 1000,
        likes: 100,
        comments: 10,
      });
      expect(result[0].duration).toBe(630); // 10 minutes 30 seconds
    });

    it('should use default maxResults of 10', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

      await adapter.searchVideos('query');

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(fetchUrl).toContain('maxResults=10');
    });

    it('should return empty array if no videos found', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

      const result = await adapter.searchVideos('query with no results');

      expect(result).toEqual([]);
    });

    it('should detect rate limit error (quota exceeded)', async () => {
      const mockErrorResponse = {
        error: {
          code: 403,
          message:
            'The request cannot be completed because you have exceeded your quota.',
          errors: [
            {
              reason: 'quotaExceeded',
              message: 'quotaExceeded',
            },
          ],
        },
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      } as Response);

      try {
        await adapter.searchVideos('query');
        fail('Should have thrown YouTubeApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(YouTubeApiError);
        if (error instanceof YouTubeApiError) {
          expect(error.isRateLimited).toBe(true);
          expect(error.message).toContain('quota exceeded');
        }
      }
    });

    it('should throw YouTubeApiError on API failure', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: 400,
            message: 'Invalid query',
          },
        }),
      } as Response);

      await expect(adapter.searchVideos('query')).rejects.toThrow(
        YouTubeApiError,
      );
    });

    it('should throw YouTubeApiError on network error', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.searchVideos('query')).rejects.toThrow(
        YouTubeApiError,
      );
    });
  });

  describe('getVideoStats', () => {
    it('should fetch and return video statistics', async () => {
      const mockResponse = {
        items: [
          {
            id: 'video1',
            snippet: {
              title: 'Test Video',
              description: 'Test Description',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { medium: { url: 'http://example.com/thumb.jpg' } },
            },
            contentDetails: { duration: 'PT1H5M' },
            statistics: {
              viewCount: '5000',
              likeCount: '500',
              commentCount: '50',
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await adapter.getVideoStats('video1');

      expect(result).toMatchObject({
        videoId: 'video1',
        title: 'Test Video',
        views: 5000,
        likes: 500,
        comments: 50,
        duration: 3900, // 1 hour 5 minutes
        platform: Platform.YOUTUBE,
      });
    });

    it('should handle missing likes/comments', async () => {
      const mockResponse = {
        items: [
          {
            id: 'video1',
            snippet: {
              title: 'Restricted Video',
              description: 'Old video',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { default: { url: 'http://example.com/thumb.jpg' } },
            },
            contentDetails: { duration: 'PT30S' },
            statistics: {
              viewCount: '100',
              // likeCount and commentCount may be missing for restricted videos
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await adapter.getVideoStats('video1');

      expect(result.likes).toBe(0);
      expect(result.comments).toBe(0);
    });

    it('should throw error if video not found', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

      await expect(adapter.getVideoStats('nonexistent')).rejects.toThrow(
        YouTubeApiError,
      );
    });

    it('should detect rate limit on stats fetch', async () => {
      const mockErrorResponse = {
        error: {
          code: 403,
          message: 'quota exceeded',
          errors: [{ reason: 'quotaExceeded' }],
        },
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      } as Response);

      try {
        await adapter.getVideoStats('video1');
        fail('Should have thrown');
      } catch (error) {
        if (error instanceof YouTubeApiError) {
          expect(error.isRateLimited).toBe(true);
        }
      }
    });
  });

  describe('duration parsing', () => {
    it('should parse ISO 8601 duration format correctly', async () => {
      const testCases = [
        { duration: 'PT10M30S', expected: 630 },
        { duration: 'PT1H', expected: 3600 },
        { duration: 'PT1H5M30S', expected: 3930 },
        { duration: 'PT5S', expected: 5 },
        { duration: 'PT0S', expected: 0 },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          items: [
            {
              id: 'test',
              snippet: {
                title: 'Test',
                description: 'Test',
                publishedAt: '2024-01-01T00:00:00Z',
                thumbnails: {
                  default: { url: 'http://example.com/thumb.jpg' },
                },
              },
              contentDetails: { duration: testCase.duration },
              statistics: {
                viewCount: '0',
              },
            },
          ],
        };

        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await adapter.getVideoStats('test');
        expect(result.duration).toBe(testCase.expected);
      }
    });
  });

  describe('API request format', () => {
    it('should build correct search URL with parameters', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

      await adapter.searchVideos('test query', 5);

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('https://www.googleapis.com/youtube/v3/search');
      expect(url).toContain('q=test+query');
      expect(url).toContain('type=video');
      expect(url).toContain('maxResults=5');
      expect(url).toContain('key=test-api-key');
    });

    it('should include all required parts in video details request', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'test',
              snippet: {
                title: 'Test',
                description: 'Test',
                publishedAt: '2024-01-01T00:00:00Z',
                thumbnails: { default: { url: 'http://example.com' } },
              },
              contentDetails: { duration: 'PT1M' },
              statistics: { viewCount: '0' },
            },
          ],
        }),
      } as Response);

      await adapter.getVideoStats('test');

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain(
        'part=snippet%2CcontentDetails%2Cstatistics%2Cstatus',
      );
    });
  });
});
