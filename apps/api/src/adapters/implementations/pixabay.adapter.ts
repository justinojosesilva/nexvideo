import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaAsset } from '@nexvideo/shared';
import { ICachePort } from '../../cache/interfaces/cache.port';
import { IPixabayPort } from '../interfaces/media.port';
import { createHash } from 'crypto';

interface PixabayImage {
  id: number;
  pageURL: string;
  type: 'photo';
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  collections: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabayVideo {
  id: number;
  pageURL: string;
  type: 'video';
  tags: string;
  duration: number;
  videos: {
    large?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    medium?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    small?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    tiny?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
  thumbnail: string;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabayResponse<T> {
  total: number;
  totalHits: number;
  hits: T[];
}

@Injectable()
export class PixabayAdapter implements IPixabayPort {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://pixabay.com/api';
  private readonly pageSize = 20;

  constructor(
    private configService: ConfigService,
    @Inject('CACHE_PORT') private cachePort: ICachePort,
  ) {
    this.apiKey = this.configService.get<string>('PIXABAY_API_KEY')!;
  }

  async searchImages(query: string, page: number = 1): Promise<MediaAsset[]> {
    const cacheKey = this.getCacheKey('image', query, page);

    // Try cache first
    const cached = await this.cachePort.get<MediaAsset[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.fetchImages(query, page);
    const assets = this.transformImages(response.hits);

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
    const assets = this.transformVideos(response.hits);

    // Cache for 6 hours
    await this.cachePort.set(cacheKey, assets, 6 * 60 * 60);

    return assets;
  }

  private async fetchImages(
    query: string,
    page: number,
  ): Promise<PixabayResponse<PixabayImage>> {
    const url = new URL(`${this.baseUrl}`);
    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('q', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', this.pageSize.toString());
    url.searchParams.append('image_type', 'photo');
    url.searchParams.append('safesearch', 'true');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchVideos(
    query: string,
    page: number,
  ): Promise<PixabayResponse<PixabayVideo>> {
    const url = new URL(`${this.baseUrl}/videos`);
    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('q', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', this.pageSize.toString());
    url.searchParams.append('safesearch', 'true');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.statusText}`);
    }

    return response.json();
  }

  private transformImages(images: PixabayImage[]): MediaAsset[] {
    return images
      .filter((image) => this.hasCommercialLicense(image))
      .map((image) => ({
        id: image.id.toString(),
        url: image.largeImageURL,
        thumbnailUrl: image.webformatURL,
        provider: 'pixabay' as const,
        license: 'commercial' as const,
        type: 'image' as const,
      }));
  }

  private transformVideos(videos: PixabayVideo[]): MediaAsset[] {
    return videos
      .filter((video) => this.hasCommercialLicense(video))
      .map((video) => {
        // Get highest quality video file
        const videoFile =
          video.videos.large ||
          video.videos.medium ||
          video.videos.small ||
          video.videos.tiny;

        return {
          id: video.id.toString(),
          url: videoFile?.url || '',
          thumbnailUrl: video.thumbnail,
          provider: 'pixabay' as const,
          license: 'commercial' as const,
          type: 'video' as const,
          duration: video.duration,
        };
      });
  }

  /**
   * All Pixabay content is free for commercial use under Pixabay License
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private hasCommercialLicense(_asset: PixabayImage | PixabayVideo): boolean {
    return true;
  }

  private getCacheKey(type: string, query: string, page: number): string {
    const hash = createHash('sha256')
      .update(`${query}:${page}:${type}`)
      .digest('hex');
    return `media:pixabay:${hash}`;
  }
}
