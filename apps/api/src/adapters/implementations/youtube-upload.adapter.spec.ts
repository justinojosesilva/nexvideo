jest.mock('../../auth/services/youtube-oauth.service', () => ({
  YoutubeOAuthService: jest.fn(),
}));

import { YouTubeUploadAdapter } from './youtube-upload.adapter';

const ORG_ID = 'org-1';
const VIDEO_ID = 'vid-abc';
const ACCESS_TOKEN = 'ya29.access';

const mockOAuth = {
  getValidAccessToken: jest.fn().mockResolvedValue(ACCESS_TOKEN),
};

const mockQuota = {
  getStatus: jest.fn(),
  track: jest.fn().mockResolvedValue(undefined),
};

function mockFetch(body: object, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as any);
}

const METADATA = {
  title: 'Test Video',
  description: 'Description here',
  tags: ['tag1'],
  categoryId: '22',
  privacyStatus: 'private' as const,
};

describe('YouTubeUploadAdapter', () => {
  let adapter: YouTubeUploadAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuota.getStatus.mockResolvedValue({ remainingUnits: 5000, resetAtUtc: '2026-04-21T08:00:00.000Z' });
    adapter = new YouTubeUploadAdapter(mockOAuth as any, mockQuota as any);
  });

  // ─── updateVideoMetadata ──────────────────────────────────────────────────

  describe('updateVideoMetadata', () => {
    it('calls YouTube Data API with correct body and returns result', async () => {
      mockFetch({
        id: VIDEO_ID,
        snippet: { title: METADATA.title },
        status: { privacyStatus: 'private' },
      });

      const result = await adapter.updateVideoMetadata(ORG_ID, VIDEO_ID, METADATA);

      expect(result.videoId).toBe(VIDEO_ID);
      expect(result.title).toBe(METADATA.title);
      expect(result.status).toBe('private');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/youtube/v3/videos');
      expect(options.method).toBe('PUT');
      expect(options.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`);
    });

    it('tracks quota after successful update', async () => {
      mockFetch({ id: VIDEO_ID, snippet: { title: METADATA.title }, status: { privacyStatus: 'private' } });
      await adapter.updateVideoMetadata(ORG_ID, VIDEO_ID, METADATA);
      expect(mockQuota.track).toHaveBeenCalledWith('VIDEOS_UPDATE');
    });

    it('throws YouTubeApiError with isRateLimited=true on quota API error', async () => {
      mockFetch(
        { error: { message: 'The caller exceeded the quota.', code: 403, errors: [{ reason: 'quotaExceeded' }] } },
        false,
        403,
      );

      await expect(adapter.updateVideoMetadata(ORG_ID, VIDEO_ID, METADATA)).rejects.toMatchObject({
        isRateLimited: true,
        statusCode: 403,
      });
    });

    it('throws with clear message on generic API error', async () => {
      mockFetch({ error: { message: 'videoNotFound', code: 404, errors: [] } }, false, 404);

      await expect(adapter.updateVideoMetadata(ORG_ID, VIDEO_ID, METADATA)).rejects.toThrow(
        'YouTube API error during videos.update: videoNotFound',
      );
    });

    it('blocks operation and throws when quota is insufficient', async () => {
      mockQuota.getStatus.mockResolvedValue({ remainingUnits: 10, resetAtUtc: '2026-04-21T08:00:00.000Z' });

      await expect(adapter.updateVideoMetadata(ORG_ID, VIDEO_ID, METADATA)).rejects.toMatchObject({
        isRateLimited: true,
        statusCode: 429,
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ─── setThumbnail ────────────────────────────────────────────────────────

  describe('setThumbnail', () => {
    const imageBuffer = Buffer.from('fake-image-data');

    it('calls thumbnails upload endpoint and returns thumbnail URL', async () => {
      mockFetch({
        items: [{ high: { url: 'https://i.ytimg.com/vi/vid-abc/hqdefault.jpg' } }],
      });

      const result = await adapter.setThumbnail(ORG_ID, VIDEO_ID, imageBuffer, 'image/jpeg');

      expect(result.videoId).toBe(VIDEO_ID);
      expect(result.thumbnailUrl).toContain('ytimg.com');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('thumbnails/set');
      expect(url).toContain(`videoId=${VIDEO_ID}`);
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('image/jpeg');
    });

    it('returns empty thumbnailUrl when API returns no items', async () => {
      mockFetch({ items: [] });

      const result = await adapter.setThumbnail(ORG_ID, VIDEO_ID, imageBuffer, 'image/png');
      expect(result.thumbnailUrl).toBe('');
    });

    it('throws YouTubeApiError on quota API error during thumbnail upload', async () => {
      mockFetch(
        { error: { message: 'quota exceeded', code: 403, errors: [{ reason: 'quotaExceeded' }] } },
        false,
        403,
      );

      await expect(
        adapter.setThumbnail(ORG_ID, VIDEO_ID, imageBuffer, 'image/jpeg'),
      ).rejects.toMatchObject({ isRateLimited: true });
    });

    it('blocks thumbnail upload when quota is insufficient', async () => {
      mockQuota.getStatus.mockResolvedValue({ remainingUnits: 5, resetAtUtc: '2026-04-21T08:00:00.000Z' });

      await expect(
        adapter.setThumbnail(ORG_ID, VIDEO_ID, imageBuffer, 'image/jpeg'),
      ).rejects.toMatchObject({ isRateLimited: true, statusCode: 429 });
    });
  });
});
