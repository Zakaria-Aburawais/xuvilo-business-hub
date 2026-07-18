import { Link } from "wouter";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tier } from "@/context/AuthContext";

interface UpgradePromptProps {
  feature?: string;
  requiredTier?: Tier;
  title?: string;
  description?: string;
  compact?: boolean;
}

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

const TIER_COLORS: Record<Tier, string> = {
  free: "blue",
  pro: "violet",
  business: "amber",
};

export function UpgradePrompt({ requiredTier = "pro", title, description, compact = false }: UpgradePromptProps) {
  const tierLabel = TIER_LABELS[requiredTier];
  const color = TIER_COLORS[requiredTier];

  const defaultTitle = `${tierLabel} Plan Feature`;
  const defaultDesc = `This feature is available on the ${tierLabel} plan. Upgrade to unlock it.`;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-200 dark:border-${color}-800`}>
        <Lock className={`w-4 h-4 text-${color}-500 flex-shrink-0`} />
        <span className={`text-xs text-${color}-700 dark:text-${color}-300 flex-1`}>
          {title || defaultTitle}
        </span>
        <Link href="/pricing">
          <Button size="sm" variant="outline" className="h-6 text-xs px-2">
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className={`w-16 h-16 rounded-2xl bg-${color}-50 dark:bg-${color}-950/30 flex items-center justify-center mx-auto mb-4 border border-${color}-200 dark:border-${color}-800`}>
        <Sparkles className={`w-8 h-8 text-${color}-500`} />
      </div>
      <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">{title || defaultTitle}</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">{description || defaultDesc}</p>
      <Link href="/pricing">
        <Button className="gap-2">
          <Sparkles className="w-4 h-4" />
          Upgrade to {tierLabel}
        </Button>
      </Link>
    </div>
  );
}
