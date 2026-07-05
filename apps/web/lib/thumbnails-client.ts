import { getApiClient } from "./api-client";

export type ThumbnailTemplate =
  | "face-reaction"
  | "text-only"
  | "split-screen"
  | "object-centric"
  | "before-after";

export type ThumbnailStyle =
  | "dark"
  | "bright"
  | "minimal"
  | "vibrant"
  | "cinematic";

export interface ThumbnailVariant {
  id: string;
  url: string;
  template: ThumbnailTemplate;
  style: ThumbnailStyle;
  provider: string;
  estimatedCostUsd: number;
  fallbackUsed: boolean;
}

export interface PreviewThumbnailsRequest {
  topic: string;
  niche: string;
  primaryText: string;
  secondaryText?: string;
  template?: ThumbnailTemplate;
  style?: ThumbnailStyle;
  palette?: [string, string, string];
  count: number;
}

export interface PreviewThumbnailsResponse {
  variants: ThumbnailVariant[];
  totalCostUsd: number;
}

export async function previewThumbnails(
  projectId: string,
  body: PreviewThumbnailsRequest,
): Promise<PreviewThumbnailsResponse> {
  const client = getApiClient();
  const response = await client.post<PreviewThumbnailsResponse>(
    `/thumbnails/${projectId}/preview`,
    body,
  );
  return response.data;
}

export async function selectThumbnail(
  projectId: string,
  thumbnailUrl: string,
): Promise<{ thumbnailUrl: string }> {
  const client = getApiClient();
  const response = await client.patch<{ thumbnailUrl: string }>(
    `/thumbnails/${projectId}/select`,
    { thumbnailUrl },
  );
  return response.data;
}
