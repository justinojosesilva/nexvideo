import { getApiClient } from "./api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanInfo {
  slug: string;
  name: string;
  priceMonthlyBrl: string;
  limits: {
    scripts: number | null;
    narrations: number | null;
    exports: number | null;
  };
}

export interface GetPlansResponse {
  plans: PlanInfo[];
}

export interface UsageInfo {
  scripts: number;
  narrations: number;
  exports: number;
}

export interface LimitsInfo {
  scripts: number | null;
  narrations: number | null;
  exports: number | null;
}

export interface PercentUsedInfo {
  scripts: number;
  narrations: number;
  exports: number;
}

export interface GetSubscriptionResponse {
  plan: {
    slug: string;
    name: string;
    priceMonthlyBrl: string;
  };
  usage: UsageInfo;
  limits: LimitsInfo;
  percentUsed: PercentUsedInfo;
}

export interface GetBillingStatusResponse {
  plan: {
    slug: string;
    name: string;
    priceMonthlyBrl: string;
  };
  status: string;
  nextBillingDate: string;
  cancelAtPeriodEnd: boolean;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

/** Public — no auth required */
export async function fetchPlans(): Promise<GetPlansResponse> {
  const response = await fetch(`${API_URL}/billing/plans`);
  if (!response.ok) {
    throw new Error("Erro ao buscar planos");
  }
  return response.json() as Promise<GetPlansResponse>;
}

export async function fetchSubscription(): Promise<GetSubscriptionResponse> {
  const client = getApiClient();
  const response =
    await client.get<GetSubscriptionResponse>("/billing/subscription");
  return response.data;
}

export async function fetchBillingStatus(): Promise<GetBillingStatusResponse> {
  const client = getApiClient();
  const response =
    await client.get<GetBillingStatusResponse>("/billing/status");
  return response.data;
}

export async function createCheckoutSession(
  planSlug: string,
): Promise<{ checkoutUrl: string }> {
  const client = getApiClient();
  const response = await client.post<{ checkoutUrl: string }>(
    "/billing/checkout",
    { planSlug },
  );
  return response.data;
}

export async function createPortalSession(): Promise<{ portalUrl: string }> {
  const client = getApiClient();
  const response = await client.post<{ portalUrl: string }>("/billing/portal");
  return response.data;
}

// ─── Usage history ────────────────────────────────────────────────────────────

export interface UsageHistoryEntry {
  month: string;
  scripts: number;
  narrations: number;
  exports: number;
  total: number;
}

export interface UsageHistoryTotals {
  scripts: number;
  narrations: number;
  exports: number;
  total: number;
}

export interface UsageHistoryResponse {
  months: UsageHistoryEntry[];
  totals: UsageHistoryTotals;
}

export async function fetchUsageHistory(
  months: number = 12,
): Promise<UsageHistoryResponse> {
  const client = getApiClient();
  const response = await client.get<UsageHistoryResponse>(
    "/billing/usage-history",
    { params: { months } },
  );
  return response.data;
}
