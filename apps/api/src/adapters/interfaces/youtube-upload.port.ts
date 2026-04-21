export interface VideoMetadata {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;      // YouTube category ID (e.g. "22" = People & Blogs)
  privacyStatus?: 'public' | 'private' | 'unlisted';
}

export interface UploadMetadataResult {
  videoId: string;
  title: string;
  status: string;
}

export interface SetThumbnailResult {
  videoId: string;
  thumbnailUrl: string;
}

export interface IYouTubeUploadPort {
  /**
   * Updates title, description, tags, category and privacy of an existing video.
   * Cost: 50 quota units.
   */
  updateVideoMetadata(
    organizationId: string,
    videoId: string,
    metadata: VideoMetadata,
  ): Promise<UploadMetadataResult>;

  /**
   * Uploads a thumbnail image (JPEG/PNG/BMP, max 2MB) for an existing video.
   * Cost: 50 quota units.
   */
  setThumbnail(
    organizationId: string,
    videoId: string,
    imageBuffer: Buffer,
    mimeType: 'image/jpeg' | 'image/png' | 'image/bmp',
  ): Promise<SetThumbnailResult>;
}
