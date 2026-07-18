const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA4_MEASUREMENT_ID ?? "").trim();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;
let loading: Promise<void> | null = null;

function isValidId(id: string): boolean {
  return /^G-[A-Z0-9]+$/i.test(id);
}

export function isGAConfigured(): boolean {
  return isValidId(GA_MEASUREMENT_ID);
}

export function isGALoaded(): boolean {
  return loaded;
}

export function loadGA(): Promise<void> {
  if (!isGAConfigured()) return Promise.resolve();
  if (loaded) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.dataset.cookieConsent = "ga4";
    script.onload = () => {
      window.dataLayer = window.dataLayer || [];
      const gtag = (...args: unknown[]) => {
        window.dataLayer!.push(args);
      };
      window.gtag = gtag as typeof window.gtag;
      gtag("js", new Date());
      gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: false,
        anonymize_ip: true,
      });
      loaded = true;
      resolve();
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Failed to load gtag.js"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

export function trackPageView(path: string): void {
  if (!isGAConfigured() || !loaded || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/**
 * Custom GA4 event catalogue
 * ──────────────────────────
 * All events are gated by the existing consent flow: this function no-ops
 * unless GA is configured AND `loadGA()` has resolved, and `loadGA()` is
 * only invoked by `AnalyticsTracker` once the user accepts cookies. So no
 * extra consent check is needed here.
 *
 * Documented events (keep this list in sync when adding new ones):
 *
 *   pdf_download        — Invoice/Quotation/Receipt PDF download
 *                         params: { tool: "invoice" | "quotation" | "receipt", language: "en" | "ar" }
 *
 *   stamp_export        — Stamp Maker export
 *                         params: { format: "png" | "svg" | "pdf", language: "en" | "ar" }
 *
 *   business_card_export — Business Card export
 *                          params: { format: "png" | "pdf", side?: "front" | "back" | "both", language: "en" | "ar" }
 *
 *   ai_writer_generated — AI Writer draft successfully generated
 *                         params: { purpose: string, language: "en" | "ar", tone: string, length: string }
 *
 *   signup_completed    — New account created (free tier — paid users go via
 *                         Stripe redirect and complete signup off-site)
 *                         params: { tier: "free" | "pro" | "business", language: "en" | "ar" }
 *
 *   calculator_used     — A business calculator produced a result (fired on
 *                         Calculate; the live Currency converter fires once
 *                         per visit on the first valid conversion)
 *                         params: { calculator: "vat" | "profit-margin" | "markup-margin"
 *                                   | "break-even" | "discount" | "loan" | "currency"
 *                                   | "salary-cost" | "overtime" | "leave-balance"
 *                                   | "import-cost" | "shipping-cbm" | "freight-cbw"
 *                                   | "invoice-aging",
 *                                   language: "en" | "ar" }
 *
 *   company_profile_export — Company Profile PDF successfully generated
 *                            params: { language: "en" | "ar" }
 *
 *   temp_email_created  — Temp Email disposable inbox successfully created
 *                         params: { language: "en" | "ar" }
 *
 *   tracker_invoice_marked_paid — Invoice Tracker entry marked as paid
 *                                 params: { language: "en" | "ar" }
 *
 * Event names use snake_case as required by GA4. Parameter values should be
 * short, low-cardinality strings — never include user content (names,
 * emails, message bodies) here.
 */
export function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {},
): void {
  if (!isGAConfigured() || !loaded || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
