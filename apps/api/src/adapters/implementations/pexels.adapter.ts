import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaAsset } from '@nexvideo/shared';
import { ICachePort } from '../../cache/interfaces/cache.port';
import { IPexelsPort } from '../interfaces/media.port';
import { createHash } from 'crypto';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  full_res: boolean;
  tags: string[];
  url: string;
  image: string;
  video_files: Array<{
    id: number;
    quality: string;
    type: string;
    width: number;
    height: number;
    link: string;
  }>;
  video_pictures: Array<{
    id: number;
    nr: number;
    picture: string;
  }>;
}

interface PexelsResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  photos?: PexelsPhoto[];
  videos?: PexelsVideo[];
  next_page?: string;
}

@Injectable()
export class PexelsAdapter implements IPexelsPort {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.pexels.com/v1';
  private readonly pageSize = 15;

  constructor(
    private configService: ConfigService,
    @Inject('CACHE_PORT') private cachePort: ICachePort,
  ) {
    this.apiKey = this.configService.get<string>('PEXELS_API_KEY')!;
  }

  async searchImages(query: string, page: number = 1): Promise<MediaAsset[]> {
    const cacheKey = this.getCacheKey('image', query, page);

    // Try cache first
    const cached = await this.cachePort.get<MediaAsset[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.fetchPhotos(query, page);
    const assets = this.transformPhotos(response.photos || []);

    // Cache for 6 hours
    await this.cachePort.set(cacheKey, assets, 6 * 60 * 60);

    return assets;
  }

  async searchVideos(query: string, page: number = 1): Promise<MediaAsset[]> {
    const cacheKey = this.getCacheKey('video', query, page);

    // Try cache first
    const cached = await this.cachePort.get<MediaAsset[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.fetchVideos(query, page);
    const assets = this.transformVideos(response.videos || []);

    // Cache for 6 hours
    await this.cachePort.set(cacheKey, assets, 6 * 60 * 60);

    return assets;
  }

  private async fetchPhotos(
    query: string,
    page: number,
  ): Promise<PexelsResponse> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.append('query', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', this.pageSize.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchVideos(
    query: string,
    page: number,
  ): Promise<PexelsResponse> {
    const url = new URL(`${this.baseUrl}/videos/search`);
    url.searchParams.append('query', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', this.pageSize.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    return response.json();
  }

  private transformPhotos(photos: PexelsPhoto[]): MediaAsset[] {
    return photos
      .filter((photo) => this.hasCommercialLicense(photo))
      .map((photo) => ({
        id: photo.id.toString(),
        url: photo.src.original,
        thumbnailUrl: photo.src.medium,
        provider: 'pexels' as const,
        license: 'commercial' as const,
        type: 'image' as const,
      }));
  }

  private transformVideos(videos: PexelsVideo[]): MediaAsset[] {
    return videos
      .filter((video) => this.hasCommercialLicense(video))
      .map((video) => {
        // Get highest quality video file
        const videoFile =
          video.video_files.find((f) => f.quality === 'hd') ||
          video.video_files.find((f) => f.quality === 'sd') ||
          video.video_files[0];

        return {
          id: video.id.toString(),
          url: videoFile?.link || video.url,
          thumbnailUrl: video.image,
          provider: 'pexels' as const,
          license: 'commercial' as const,
          type: 'video' as const,
          duration: video.duration,
        };
      });
  }

  /**
   * Pexels photos/videos are generally free for commercial use
   * All Pexels content is under CC0 license (public domain)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private hasCommercialLicense(_asset: PexelsPhoto | PexelsVideo): boolean {
    return true;
  }

  private getCacheKey(type: string, query: string, page: number): string {
    const hash = createHash('sha256')
      .update(`${query}:${page}:${type}`)
      .digest('hex');
    return `media:pexels:${hash}`;
  }
}
