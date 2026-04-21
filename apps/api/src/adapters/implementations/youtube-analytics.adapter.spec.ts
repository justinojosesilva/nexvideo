jest.mock('../../auth/services/youtube-oauth.service', () => ({
  YoutubeOAuthService: jest.fn(),
}));

import { YouTubeAnalyticsAdapter } from './youtube-analytics.adapter';

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockOAuth = {
  getValidAccessToken: jest.fn(),
};

const ORG_ID = 'org-1';
const FILTERS = { startDate: '2026-01-01', endDate: '2026-01-31' };
const FILTERS_WITH_VIDEO = { ...FILTERS, videoId: 'abc123' };

const makeRows = (rows: number[][]): { rows: number[][] } => ({ rows });

function mockFetch(body: object, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Forbidden',
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as any);
}

describe('YouTubeAnalyticsAdapter', () => {
  let adapter: YouTubeAnalyticsAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new YouTubeAnalyticsAdapter(mockOAuth as any, mockCache as any);

    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockOAuth.getValidAccessToken.mockResolvedValue('access-token-123');
  });

  it('returns cached metrics without calling API', async () => {
    const cached = { views: 100, watchTimeSeconds: 3600, impressions: 500, ctr: 0.05 };
    mockCache.get.mockResolvedValue(cached);

    const result = await adapter.getMetrics(ORG_ID, FILTERS);

    expect(result).toEqual(cached);
    expect(mockOAuth.getValidAccessToken).not.toHaveBeenCalled();
  });

  it('aggregates rows and returns correct metrics', async () => {
    // rows: [day, views, minutesWatched, impressions, ctr]
    mockFetch(makeRows([
      [20260101, 1000, 500, 5000, 0.05],
      [20260102, 2000, 1000, 8000, 0.10],
    ]));

    const result = await adapter.getMetrics(ORG_ID, FILTERS);

    expect(result.views).toBe(3000);
    expect(result.watchTimeSeconds).toBe(Math.round(1500 * 60));
    expect(result.impressions).toBe(13000);
    expect(result.ctr).toBeCloseTo(0.075, 3);
  });

  it('caches the result after a successful API call', async () => {
    mockFetch(makeRows([[20260101, 500, 100, 2000, 0.03]]));

    await adapter.getMetrics(ORG_ID, FILTERS);

    expect(mockCache.set).toHaveBeenCalledWith(
      expect.stringContaining('youtube:analytics:'),
      expect.objectContaining({ views: 500 }),
      3600,
    );
  });

  it('includes videoId filter in cache key when provided', async () => {
    mockFetch(makeRows([[20260101, 100, 50, 1000, 0.02]]));

    await adapter.getMetrics(ORG_ID, FILTERS_WITH_VIDEO);

    expect(mockCache.set).toHaveBeenCalledWith(
      expect.stringContaining('abc123'),
      expect.any(Object),
      3600,
    );
  });

  it('passes videoId as filter param to the API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(makeRows([])),
    } as any);

    await adapter.getMetrics(ORG_ID, FILTERS_WITH_VIDEO);

    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('filters=video%3D%3Dabc123');
  });

  it('returns zeros when API returns no rows', async () => {
    mockFetch({ rows: [] });

    const result = await adapter.getMetrics(ORG_ID, FILTERS);

    expect(result).toEqual({ views: 0, watchTimeSeconds: 0, impressions: 0, ctr: 0 });
  });

  it('throws when API responds with an error status', async () => {
    mockFetch({ error: { message: 'Forbidden' } }, false, 403);

    await expect(adapter.getMetrics(ORG_ID, FILTERS)).rejects.toThrow(
      'YouTube Analytics API error',
    );
  });
});
