import { Injectable, Logger, Optional } from '@nestjs/common';
import { YoutubeOAuthService } from '../../auth/services/youtube-oauth.service';
import { YoutubeQuotaService } from '../services/youtube-quota.service';
import { YouTubeApiError } from '../exceptions/youtube-api.error';
import {
  IYouTubeUploadPort,
  VideoMetadata,
  UploadMetadataResult,
  SetThumbnailResult,
} from '../interfaces/youtube-upload.port';

const DATA_API_BASE = 'https://www.googleapis.com/youtube/v3';
const THUMBNAILS_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set';

// YouTube Data API v3 quota costs
const QUOTA_VIDEOS_UPDATE = 50;
const QUOTA_THUMBNAILS_SET = 50;

@Injectable()
export class YouTubeUploadAdapter implements IYouTubeUploadPort {
  private readonly logger = new Logger(YouTubeUploadAdapter.name);

  constructor(
    private readonly youtubeOAuth: YoutubeOAuthService,
    @Optional() private readonly quotaService: YoutubeQuotaService | null,
  ) {}

  async updateVideoMetadata(
    organizationId: string,
    videoId: string,
    metadata: VideoMetadata,
  ): Promise<UploadMetadataResult> {
    await this.assertQuota(QUOTA_VIDEOS_UPDATE, 'videos.update');

    const accessToken = await this.youtubeOAuth.getValidAccessToken(organizationId);

    const body = {
      id: videoId,
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags ?? [],
        categoryId: metadata.categoryId ?? '22',
      },
      status: {
        privacyStatus: metadata.privacyStatus ?? 'private',
      },
    };

    const url = new URL(`${DATA_API_BASE}/videos`);
    url.searchParams.set('part', 'snippet,status');

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.handleApiError(data, response.status, 'videos.update');
    }

    void this.quotaService?.track('VIDEOS_UPDATE');

    this.logger.log({ organizationId, videoId }, 'Video metadata updated');

    return {
      videoId: data['id'] as string,
      title: (data['snippet'] as Record<string, string>)?.['title'] ?? metadata.title,
      status: (data['status'] as Record<string, string>)?.['privacyStatus'] ?? 'private',
    };
  }

  async setThumbnail(
    organizationId: string,
    videoId: string,
    imageBuffer: Buffer,
    mimeType: 'image/jpeg' | 'image/png' | 'image/bmp',
  ): Promise<SetThumbnailResult> {
    await this.assertQuota(QUOTA_THUMBNAILS_SET, 'thumbnails.set');

    const accessToken = await this.youtubeOAuth.getValidAccessToken(organizationId);

    const url = new URL(THUMBNAILS_UPLOAD_BASE);
    url.searchParams.set('videoId', videoId);
    url.searchParams.set('uploadType', 'media');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
        'Content-Length': String(imageBuffer.length),
      },
      body: imageBuffer.buffer as ArrayBuffer,
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      this.handleApiError(data, response.status, 'thumbnails.set');
    }

    void this.quotaService?.track('VIDEOS_UPDATE'); // thumbnails.set cost = 50 units (same bucket)

    const items = data['items'] as Array<Record<string, Record<string, string>>> | undefined;
    const thumbnailUrl =
      items?.[0]?.['high']?.['url'] ??
      items?.[0]?.['medium']?.['url'] ??
      items?.[0]?.['default']?.['url'] ??
      '';

    this.logger.log({ organizationId, videoId, thumbnailUrl }, 'Thumbnail set');

    return { videoId, thumbnailUrl };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async assertQuota(requiredUnits: number, operation: string): Promise<void> {
    if (!this.quotaService) return;

    const status = await this.quotaService.getStatus();

    if (status.remainingUnits < requiredUnits) {
      this.logger.warn(
        { operation, requiredUnits, remaining: status.remainingUnits, resetAt: status.resetAtUtc },
        'YouTube quota insufficient — operation blocked',
      );
      throw new YouTubeApiError(
        `YouTube API quota exhausted (${status.remainingUnits} units remaining, ` +
          `${requiredUnits} required for ${operation}). ` +
          `Quota resets at ${status.resetAtUtc}.`,
        true,
        429,
      );
    }
  }

  private handleApiError(data: Record<string, unknown>, status: number, operation: string): never {
    const apiError = data['error'] as Record<string, unknown> | undefined;
    const message = (apiError?.['message'] as string) ?? 'Unknown YouTube API error';
    const errors = (apiError?.['errors'] as Array<Record<string, string>>) ?? [];

    const isQuota =
      status === 403 &&
      (errors.some((e) => e['reason'] === 'quotaExceeded' || (e['message'] ?? '').includes('quota')) ||
        message.includes('quota'));

    this.logger.error({ operation, status, message }, 'YouTube Data API error');

    throw new YouTubeApiError(
      isQuota
        ? `YouTube API quota exceeded during ${operation}. Please retry after quota reset.`
        : `YouTube API error during ${operation}: ${message}`,
      isQuota,
      status,
    );
  }
}
