import { Injectable, Inject, Logger } from '@nestjs/common';
import { MediaAsset } from '@nexvideo/shared';
import { IPexelsPort, IPixabayPort } from '../interfaces/media.port';

/**
 * High-level adapter combining Pexels and Pixabay with fallback logic
 */
@Injectable()
export class MediaAdapter {
  private readonly logger = new Logger(MediaAdapter.name);

  constructor(
    @Inject('IPexelsPort')
    private pexelsAdapter: IPexelsPort,
    @Inject('IPixabayPort')
    private pixabayAdapter: IPixabayPort,
  ) {}

  /**
   * Search for images with Pexels primary, Pixabay fallback
   * Fallback triggered if Pexels returns < 3 results
   */
  async searchImages(query: string, page: number = 1): Promise<MediaAsset[]> {
    try {
      const pexelsResults = await this.pexelsAdapter.searchImages(query, page);

      // Fallback to Pixabay if insufficient results
      if (pexelsResults.length < 3) {
        const pixabayResults = await this.pixabayAdapter.searchImages(
          query,
          page,
        );
        return [...pexelsResults, ...pixabayResults];
      }

      return pexelsResults;
    } catch (error) {
      // On Pexels error, try Pixabay
      this.logger.warn({ err: error }, 'Pexels search failed, falling back to Pixabay');
      return this.pixabayAdapter.searchImages(query, page);
    }
  }

  /**
   * Search for videos with Pexels primary, Pixabay fallback
   * Fallback triggered if Pexels returns < 3 results
   */
  async searchVideos(query: string, page: number = 1): Promise<MediaAsset[]> {
    try {
      const pexelsResults = await this.pexelsAdapter.searchVideos(query, page);

      // Fallback to Pixabay if insufficient results
      if (pexelsResults.length < 3) {
        const pixabayResults = await this.pixabayAdapter.searchVideos(
          query,
          page,
        );
        return [...pexelsResults, ...pixabayResults];
      }

      return pexelsResults;
    } catch (error) {
      // On Pexels error, try Pixabay
      this.logger.warn({ err: error }, 'Pexels search failed, falling back to Pixabay');
      return this.pixabayAdapter.searchVideos(query, page);
    }
  }
}
