import { getAuthToken } from "./billingApi";
import type { Tier } from "@/context/AuthContext";

export type FeatureKey = "tracker";

export interface EntitlementsResponse {
  tier: Tier;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  features: Record<FeatureKey, boolean>;
}

const API_BASE = "/api";

export async function fetchEntitlements(): Promise<EntitlementsResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("not_authenticated");
  }
  const res = await fetch(`${API_BASE}/me/entitlements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`entitlements_failed_${res.status}`);
  }
  return res.json();
}
