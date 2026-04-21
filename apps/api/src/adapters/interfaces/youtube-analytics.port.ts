export interface AnalyticsFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  videoId?: string;
}

export interface VideoAnalyticsMetrics {
  views: number;
  watchTimeSeconds: number;
  ctr: number;         // 0–1
  impressions: number;
  date?: string;
}

export interface IYouTubeAnalyticsPort {
  getMetrics(
    organizationId: string,
    filters: AnalyticsFilters,
  ): Promise<VideoAnalyticsMetrics>;
}
