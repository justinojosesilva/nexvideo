import { getApiClient } from "./api-client";

export interface ScriptBlockData {
  id: string;
  label: string;
  content: string;
  startTime: number;
  duration: number;
  notes?: string;
  order: number;
}

export interface ScriptData {
  id: string;
  projectId: string;
  status: "draft" | "reviewing" | "approved" | "published";
  formatType: string;
  blocks: ScriptBlockData[];
  wordCount?: number;
  estimatedDurationSec?: number;
  originalityScore?: number;
  estimatedCostBrl?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateScriptDto {
  blocks?: ScriptBlockData[];
  status?: string;
  wordCount?: number;
  estimatedDurationSec?: number;
}

export async function fetchScriptsByProject(
  projectId: string,
): Promise<ScriptData[]> {
  const client = getApiClient();
  const response = await client.get<ScriptData[]>(
    `/scripts/project/${projectId}`,
  );
  return response.data;
}

export async function fetchScript(id: string): Promise<ScriptData> {
  const client = getApiClient();
  const response = await client.get<ScriptData>(`/scripts/${id}`);
  return response.data;
}

export async function updateScript(
  id: string,
  data: UpdateScriptDto,
): Promise<ScriptData> {
  const client = getApiClient();
  const response = await client.patch<ScriptData>(`/scripts/${id}`, data);
  return response.data;
}

export interface CreateScriptDto {
  projectId: string;
  formatType: string;
  tone: string;
  trendAnalysisId: string;
  /** Optional keyword override; falls back to project/trend analysis keyword. */
  keyword?: string;
}

export interface CreateScriptResponse {
  id: string;
  jobId?: string;
}

export async function createScript(
  data: CreateScriptDto,
): Promise<CreateScriptResponse> {
  const client = getApiClient();
  const response = await client.post<CreateScriptResponse>("/scripts", data);
  return response.data;
}
