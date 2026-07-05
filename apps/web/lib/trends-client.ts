import { getApiClient } from "./api-client";

export interface TrendDataPoint {
  date: string;
  interest: number;
}

export interface TopVideo {
  videoId: string;
  title: string;
  channel: string;
  views: number;
  publishedAt: string;
  url: string;
}

export interface TrendAnalysisData {
  finalScore: number;
  classification: "PUBLISH" | "EVALUATE" | "AVOID";
  scores: {
    demand: number;
    saturation: number;
    monetization: number;
    qualityGap: number;
  };
  weights: {
    dimension1: number;
    dimension2: number;
    dimension3: number;
    dimension4: number;
  };
  geo: string;
  niche: string;
  analyzedAt: string;
  trendData?: TrendDataPoint[];
  topVideos?: TopVideo[];
}

export interface TrendAnalysis {
  id: string;
  organizationId: string;
  projectId: string;
  keyword: string;
  data: TrendAnalysisData;
  analyzedAt: string;
  createdAt: string;
}

export interface AnalyzeTrendsRequest {
  projectId: string;
  keyword: string;
  geo: string;
  niche: string;
}

export interface JobStatus {
  id?: string;
  jobId?: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  progress?: number;
  data?: unknown;
  result?: {
    trendAnalysis?: TrendAnalysis;
    finalScore?: number;
    scores?: TrendAnalysisData["scores"];
    [key: string]: unknown;
  };
  failedReason?: string;
  errorMessage?: string;
}

export async function initiateTrendAnalysis(
  payload: AnalyzeTrendsRequest,
): Promise<{ jobId: string }> {
  const client = getApiClient();
  const response = await client.post("/trends/analyze", payload);
  return response.data;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const client = getApiClient();
  const response = await client.get(`/jobs/${jobId}`);
  return response.data;
}

export async function getTrendAnalysis(
  projectId: string,
): Promise<TrendAnalysis> {
  const client = getApiClient();
  const response = await client.get(`/trends/${projectId}`);
  return response.data;
}
