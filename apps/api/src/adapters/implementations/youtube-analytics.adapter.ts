import { Injectable, Logger, Inject } from '@nestjs/common';
import { ICachePort } from '../../cache/interfaces/cache.port';
import { YoutubeOAuthService } from '../../auth/services/youtube-oauth.service';
import {
  IYouTubeAnalyticsPort,
  AnalyticsFilters,
  VideoAnalyticsMetrics,
} from '../interfaces/youtube-analytics.port';

const ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2/reports';
const CACHE_TTL_SEC = 60 * 60; // 1 hour — analytics data changes slowly

@Injectable()
export class YouTubeAnalyticsAdapter implements IYouTubeAnalyticsPort {
  private readonly logger = new Logger(YouTubeAnalyticsAdapter.name);

  constructor(
    private readonly youtubeOAuth: YoutubeOAuthService,
    @Inject('ICachePort') private readonly cache: ICachePort,
  ) {}

  async getMetrics(
    organizationId: string,
    filters: AnalyticsFilters,
  ): Promise<VideoAnalyticsMetrics> {
    const cacheKey = this.buildCacheKey(organizationId, filters);
    const cached = await this.cache.get<VideoAnalyticsMetrics>(cacheKey);
    if (cached) return cached;

    const accessToken = await this.youtubeOAuth.getValidAccessToken(organizationId);

    const params = new URLSearchParams({
      ids: 'channel==MINE',
      startDate: filters.startDate,
      endDate: filters.endDate,
      metrics: 'views,estimatedMinutesWatched,impressions,impressionClickThroughRate',
      dimensions: 'day',
      sort: 'day',
    });

    if (filters.videoId) {
      params.set('filters', `video==${filters.videoId}`);
    }

    const response = await fetch(`${ANALYTICS_BASE}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`YouTube Analytics API error [${response.status}]: ${body}`);
      throw new Error(`YouTube Analytics API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      rows?: number[][];
    };

    const metrics = this.aggregateRows(data.rows ?? []);
    await this.cache.set(cacheKey, metrics, CACHE_TTL_SEC);
    return metrics;
  }

  private aggregateRows(rows: number[][]): VideoAnalyticsMetrics {
    // Each row: [day, views, estimatedMinutesWatched, impressions, impressionClickThroughRate]
    let views = 0;
    let watchTimeMinutes = 0;
    let impressions = 0;
    let ctrSum = 0;

    for (const row of rows) {
      views += row[1] ?? 0;
      watchTimeMinutes += row[2] ?? 0;
      impressions += row[3] ?? 0;
      ctrSum += row[4] ?? 0;
    }

    const avgCtr = rows.length > 0 ? ctrSum / rows.length : 0;

    return {
      views,
      watchTimeSeconds: Math.round(watchTimeMinutes * 60),
      impressions,
      ctr: Number(avgCtr.toFixed(4)),
    };
  }

  private buildCacheKey(organizationId: string, filters: AnalyticsFilters): string {
    const video = filters.videoId ?? 'all';
    return `youtube:analytics:${organizationId}:${filters.startDate}:${filters.endDate}:${video}`;
  }
}
