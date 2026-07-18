import { useEffect } from "react";
import { useLocation } from "wouter";
import { useConsent } from "@/context/ConsentContext";
import { isGAConfigured, loadGA, trackPageView } from "@/lib/analytics";

/**
 * Loads GA4 (gtag.js) once consent is granted and fires a `page_view` event
 * on the initial render and on every wouter route change.
 *
 * Renders nothing. Must be mounted inside a wouter Router.
 */
export function AnalyticsTracker() {
  const [location] = useLocation();
  const { status } = useConsent();

  useEffect(() => {
    if (status !== "accepted") return;
    if (!isGAConfigured()) return;
    let cancelled = false;
    loadGA()
      .then(() => {
        if (cancelled) return;
        const path =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : location;
        trackPageView(path);
      })
      .catch(() => {
        // Network blocked, ad blocker, etc. — silently ignore.
      });
    return () => {
      cancelled = true;
    };
  }, [location, status]);

  return null;
}
