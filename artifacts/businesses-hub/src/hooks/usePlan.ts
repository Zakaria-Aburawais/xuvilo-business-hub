import { useAuth, type Tier } from "@/context/AuthContext";

const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, business: 2 };

const FEATURE_MIN_TIER: Record<string, Tier> = {
  "save_documents":       "pro",
  "premium_templates":    "pro",
  "workspaces":           "business",
  "team_members":         "business",
  "analytics":            "business",
  "api_keys":             "business",
  "dedicated_support":    "business",
};

// When VITE_BILLING_ENABLED is not "true", all features are unlocked for
// every signed-in user regardless of their stored tier (launch-mode free plan).
const BILLING_ENABLED = import.meta.env["VITE_BILLING_ENABLED"] === "true";

export function usePlan() {
  const { user } = useAuth();
  const tier: Tier = user?.tier ?? "free";

  function can(feature: string): boolean {
    if (!BILLING_ENABLED) return true;
    const required = FEATURE_MIN_TIER[feature];
    if (!required) return true;
    return TIER_RANK[tier] >= TIER_RANK[required];
  }

  function minTierFor(feature: string): Tier {
    if (!BILLING_ENABLED) return "free";
    return FEATURE_MIN_TIER[feature] ?? "free";
  }

  return { tier, can, minTierFor };
}
