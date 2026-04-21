import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YouTubeVideo, NicheCategory, Platform } from '@nexvideo/shared';
import { IYouTubePort } from '../interfaces/youtube.port';
import { YouTubeApiError } from '../exceptions/youtube-api.error';
import { YoutubeQuotaService } from '../services/youtube-quota.service';

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    channelTitle: string;
  };
}

interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
}

/**
 * YouTube Data API v3 adapter
 * Implements IYouTubePort for searching videos and fetching statistics
 */
@Injectable()
export class YouTubeDataAdapter implements IYouTubePort {
  private readonly logger = new Logger(YouTubeDataAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly defaultNiche = NicheCategory.OTHER;

  constructor(
    private configService: ConfigService,
    @Optional() private readonly quotaService: YoutubeQuotaService | null,
  ) {
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY')!;

    if (!this.apiKey) {
      throw new Error('YOUTUBE_API_KEY is not set in environment variables');
    }
  }

  async searchVideos(
    query: string,
    maxResults: number = 10,
  ): Promise<YouTubeVideo[]> {
    try {
      this.logger.debug(`Searching YouTube for: ${query}`);

      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.append('key', this.apiKey);
      url.searchParams.append('q', query);
      url.searchParams.append('type', 'video');
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('maxResults', maxResults.toString());
      url.searchParams.append('order', 'relevance');

      const response = await fetch(url.toString());
      const data = (await response.json()) as any;

      if (!response.ok) {
        return this.handleApiError(data);
      }

      // search.list = 100 units per call
      void this.quotaService?.track('SEARCH_LIST');

      const items: YouTubeSearchItem[] = data.items || [];
      const videoIds = items
        .map((item) => item.id.videoId)
        .filter((id) => id !== undefined);

      if (videoIds.length === 0) {
        return [];
      }

      // Fetch detailed statistics for each video
      const videos = await Promise.all(
        videoIds.map((videoId) => this.getVideoStats(videoId)),
      );

      return videos;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        throw error;
      }

      this.logger.error(`Search failed: ${error}`);
      throw new YouTubeApiError(
        `Failed to search YouTube videos: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getVideoStats(videoId: string): Promise<YouTubeVideo> {
    try {
      this.logger.debug(`Fetching stats for video: ${videoId}`);

      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.append('key', this.apiKey);
      url.searchParams.append('id', videoId);
      url.searchParams.append(
        'part',
        'snippet,contentDetails,statistics,status',
      );

      const response = await fetch(url.toString());
      const data = (await response.json()) as any;

      if (!response.ok) {
        return this.handleApiError(data);
      }

      // videos.list = 1 unit per call
      void this.quotaService?.track('VIDEOS_LIST');

      if (!data.items || data.items.length === 0) {
        throw new YouTubeApiError(`Video not found: ${videoId}`);
      }

      const video: YouTubeVideoDetails = data.items[0];

      return this.mapToYouTubeVideo(video);
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        throw error;
      }

      this.logger.error(`Failed to fetch stats for ${videoId}: ${error}`);
      throw new YouTubeApiError(
        `Failed to fetch video stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Maps YouTube API response to internal YouTubeVideo model
   */
  private mapToYouTubeVideo(video: YouTubeVideoDetails): YouTubeVideo {
    const duration = this.parseDuration(video.contentDetails.duration);
    const views = parseInt(video.statistics.viewCount, 10) || 0;
    const likes = video.statistics.likeCount
      ? parseInt(video.statistics.likeCount, 10)
      : 0;
    const comments = video.statistics.commentCount
      ? parseInt(video.statistics.commentCount, 10)
      : 0;

    return {
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl:
        video.snippet.thumbnails.high?.url ||
        video.snippet.thumbnails.medium?.url ||
        video.snippet.thumbnails.default?.url ||
        '',
      url: `https://www.youtube.com/watch?v=${video.id}`,
      publishedAt: new Date(video.snippet.publishedAt),
      duration,
      views,
      likes,
      comments,
      niche: this.defaultNiche,
      platform: Platform.YOUTUBE,
    };
  }

  /**
   * Parse ISO 8601 duration format (e.g., PT1H23M45S) to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) {
      return 0;
    }

    const hours = parseInt(match[1], 10) || 0;
    const minutes = parseInt(match[2], 10) || 0;
    const seconds = parseInt(match[3], 10) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Handle API errors and detect rate limiting
   */
  private handleApiError(data: any): never {
    const errors = data.error?.errors || [];
    const errorMessage = data.error?.message || 'Unknown API error';
    const statusCode = data.error?.code;

    // Check for quota exceeded (rate limit)
    const isRateLimited =
      statusCode === 403 &&
      (errors.some(
        (e: any) =>
          e.reason === 'quotaExceeded' || e.message?.includes('quota'),
      ) ||
        errorMessage.includes('quota'));

    if (isRateLimited) {
      this.logger.warn('YouTube API quota exceeded - rate limited');
      throw new YouTubeApiError(
        'YouTube API quota exceeded. Please try again later.',
        true,
        403,
      );
    }

    this.logger.error(`YouTube API error [${statusCode}]: ${errorMessage}`);
    throw new YouTubeApiError(
      `YouTube API error: ${errorMessage}`,
      false,
      statusCode,
    );
  }
}
