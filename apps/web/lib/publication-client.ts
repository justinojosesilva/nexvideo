import { getApiClient } from "./api-client";

export interface TitleVariant {
  title: string;
  ctReason: string;
  score: number;
}

export interface TagGroup {
  category: "primary" | "secondary" | "niche" | "trend";
  tags: string[];
}

export interface PublicationMetadata {
  id: string;
  projectId: string;
  title: string | null;
  tags: string[];
  thumbnailUrl?: string | null;
  titleVariants?: TitleVariant[];
  tagGroups?: TagGroup[];
  platform?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchPublicationMetadata(
  projectId: string,
): Promise<PublicationMetadata | null> {
  const client = getApiClient();
  try {
    const response = await client.get<PublicationMetadata | null>(
      `/publication/${projectId}`,
    );
    return response.data;
  } catch {
    return null;
  }
}

export async function selectTitle(
  projectId: string,
  selectedTitle: string,
): Promise<{ success: boolean }> {
  const client = getApiClient();
  const response = await client.patch<{ success: boolean }>(
    `/publication/${projectId}/title`,
    { selectedTitle },
  );
  return response.data;
}

export async function generatePublicationMetadata(
  projectId: string,
  scriptId: string,
): Promise<{ jobId: string }> {
  const client = getApiClient();
  const response = await client.post<{ jobId: string }>("/publication/generate", {
    projectId,
    scriptId,
  });
  return response.data;
}
