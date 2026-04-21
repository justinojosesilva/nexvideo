import { getApiClient } from "./api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface GetMembersResponse {
  members: Member[];
  count: number;
}

export interface InviteMemberResponse {
  id: string;
  email: string;
  expiresAt: string;
}

// ─── Member limits per plan (mirrors backend) ─────────────────────────────────

export const MEMBER_LIMITS: Record<string, number | null> = {
  free: 1,
  starter: 3,
  professional: null,
  enterprise: null,
  creator: null,
};

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function fetchMembers(): Promise<GetMembersResponse> {
  const client = getApiClient();
  const response = await client.get<GetMembersResponse>("/organizations/members");
  return response.data;
}

export async function inviteMember(email: string): Promise<InviteMemberResponse> {
  const client = getApiClient();
  const response = await client.post<InviteMemberResponse>("/organizations/invite", {
    email,
  });
  return response.data;
}

export async function removeMember(memberId: string): Promise<{ removed: boolean }> {
  const client = getApiClient();
  const response = await client.delete<{ removed: boolean }>(`/organizations/members/${memberId}`);
  return response.data;
}

export async function updateMemberRole(
  memberId: string,
  role: string,
): Promise<{ id: string; role: string }> {
  const client = getApiClient();
  const response = await client.patch<{ id: string; role: string }>(
    `/organizations/members/${memberId}/role`,
    { role },
  );
  return response.data;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Gerente',
  creator: 'Criador',
  viewer: 'Visualizador',
  member: 'Membro',
};

export const ASSIGNABLE_ROLES = ['admin', 'manager', 'creator', 'viewer', 'member'] as const;
