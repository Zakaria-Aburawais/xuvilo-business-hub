// AdSlot — a consent-aware container for future Google AdSense units.
//
// HOW TO ACTIVATE (once AdSense is approved):
// 1. The AdSense script is already loaded in index.html (deferred after first paint).
// 2. Replace the <div> below with the <ins> tag from your AdSense dashboard, e.g.:
//      <ins className="adsbygoogle"
//           style={{ display: "block" }}
//           data-ad-client="ca-pub-2841581935998314"
//           data-ad-slot={slot}
//           data-ad-format={format}
//           data-full-width-responsive="true" />
// 3. Add inside a useEffect (only after consent is "accepted"):
//      (window.adsbygoogle = window.adsbygoogle || []).push({})
//
// Ad placement rules (MUST NOT show ads on these routes):
//   /invoice, /quotation, /receipt, /templates,
//   /dashboard, /documents, /settings, /clients, /rfq
// Content-rich pages (blog index, blog articles, calculator pages) MAY
// carry ads — see the AdSense content plan in HANDOVER.md.
//
// Until activated, this component renders an invisible placeholder that
// reserves space in the layout without showing anything to the user.
// When consent is not yet given ("unknown") or rejected, renders nothing at all.

import { cn } from "@/lib/utils";
import { useConsent } from "@/context/ConsentContext";

interface AdSlotProps {
  /** Future AdSense data-ad-slot ID (e.g. "1234567890"). */
  slot?: string;
  /** Ad format hint for sizing the reserved space. */
  format?: "leaderboard" | "rectangle" | "sidebar" | "auto";
  className?: string;
  /** Accessible label for screen readers once the ad is live. */
  label?: string;
}

const FORMAT_MIN_HEIGHT: Record<NonNullable<AdSlotProps["format"]>, string> = {
  leaderboard: "90px",   // 728×90
  rectangle:   "250px",  // 300×250
  sidebar:     "600px",  // 160×600
  auto:        "90px",
};

export function AdSlot({ slot: _slot, format = "auto", className, label = "Advertisement" }: AdSlotProps) {
  const { status } = useConsent();

  // Only reserve space (and eventually serve ads) when user has explicitly accepted.
  if (status !== "accepted") return null;

  return (
    <div
      aria-label={label}
      role="complementary"
      data-ad-placeholder="true"
      data-ad-format={format}
      className={cn("w-full overflow-hidden", className)}
      style={{ minHeight: FORMAT_MIN_HEIGHT[format] }}
    />
  );
}
