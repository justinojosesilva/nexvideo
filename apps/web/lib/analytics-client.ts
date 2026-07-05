import { getApiClient } from "./api-client";

export type AnalyticsPeriodDays = 7 | 30 | 90;

export interface AnalyticsSeriesPoint {
  date: string;
  views: number;
  watchTime: number;
  impressions: number;
  ctr: number;
}

export interface AnalyticsProjectRow {
  projectId: string;
  projectTitle: string;
  views: number;
  watchTime: number;
  impressions: number;
  ctr: number;
}

export interface AnalyticsTotals {
  views: number;
  watchTime: number;
  impressions: number;
  ctr: number;
  videos: number;
}

export interface VideoPerformanceResponse {
  periodDays: AnalyticsPeriodDays;
  from: string;
  to: string;
  totals: AnalyticsTotals;
  series: AnalyticsSeriesPoint[];
  byProject: AnalyticsProjectRow[];
}

export async function fetchVideoPerformance(
  days: AnalyticsPeriodDays,
): Promise<VideoPerformanceResponse> {
  const client = getApiClient();
  const response = await client.get<VideoPerformanceResponse>(
    `/analytics/video-performance`,
    { params: { days } },
  );
  return response.data;
}
