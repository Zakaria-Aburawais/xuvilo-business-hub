import { useEffect, useState } from "react";
import { getCurrencyByCode, formatAmount } from "@/lib/currencies";

/**
 * Approximate USD exchange rates used for displaying indicative
 * localized prices on the Pricing page. Checkout charges in the
 * selected currency where supported (Stripe Prices seeded with
 * currency_options), falling back to USD otherwise.
 *
 * KEEP IN SYNC with scripts/src/seed-stripe-products.ts
 * (CURRENCY_RATES) so displayed and charged amounts match.
 *
 * Gulf currencies are pegged to the USD, so those rates are exact.
 * Others are approximations (updated July 2026) and are labeled as
 * approximate in the UI.
 */
export const PRICING_FX_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  SAR: 3.75, // pegged
  AED: 3.6725, // pegged
  QAR: 3.64, // pegged
  BHD: 0.376, // pegged
  OMR: 0.3845, // pegged
  KWD: 0.31,
  JOD: 0.709, // pegged
  EGP: 48.5,
};

/** Currencies offered in the Pricing page selector, in display order. */
export const PRICING_CURRENCIES = Object.keys(PRICING_FX_RATES);

/**
 * USD-pegged currencies always use the exact static rate — a live
 * feed can only add noise to a hard peg.
 */
const PEGGED_CURRENCIES = new Set(["USD", "SAR", "AED", "QAR", "BHD", "OMR", "JOD"]);

const FX_CACHE_KEY = "pricing_fx_rates_v1";
const FX_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // refresh daily
const FX_API_URL = "https://open.er-api.com/v6/latest/USD";
/**
 * Reject a live rate that deviates more than this fraction from the
 * static table — protects the display against a bad API response.
 */
const FX_MAX_DEVIATION = 0.25;

type CachedRates = { ts: number; rates: Record<string, number> };

function readCachedRates(): CachedRates | null {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (
      typeof parsed?.ts !== "number" ||
      typeof parsed?.rates !== "object" ||
      parsed.rates === null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeLiveRates(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of PRICING_CURRENCIES) {
    if (PEGGED_CURRENCIES.has(code)) continue;
    const fallback = PRICING_FX_RATES[code]!;
    const live = raw[code];
    if (
      typeof live === "number" &&
      Number.isFinite(live) &&
      live > 0 &&
      Math.abs(live - fallback) / fallback <= FX_MAX_DEVIATION
    ) {
      out[code] = live;
    }
  }
  return out;
}

let fetchPromise: Promise<Record<string, number>> | null = null;

/**
 * Return the effective display rates: the static table overlaid with
 * live rates for non-pegged currencies (EUR, GBP, KWD, EGP), fetched
 * from a free FX API and cached in localStorage for 24h. Always
 * resolves — on any failure it falls back to the static table.
 */
export function getLiveFxRates(): Promise<Record<string, number>> {
  const cached = readCachedRates();
  if (cached && Date.now() - cached.ts < FX_CACHE_TTL_MS) {
    return Promise.resolve({ ...PRICING_FX_RATES, ...sanitizeLiveRates(cached.rates) });
  }
  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const res = await fetch(FX_API_URL);
        if (!res.ok) throw new Error(`FX API ${res.status}`);
        const data = (await res.json()) as { result?: string; rates?: Record<string, unknown> };
        if (data.result !== "success" || !data.rates) throw new Error("FX API bad payload");
        const live = sanitizeLiveRates(data.rates);
        if (Object.keys(live).length > 0) {
          try {
            localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: live }));
          } catch {
            // storage unavailable — still use the fetched rates this session
          }
        }
        return { ...PRICING_FX_RATES, ...live };
      } catch {
        // Network/API failure — use stale cache if present, else static table
        const stale = readCachedRates();
        if (stale) return { ...PRICING_FX_RATES, ...sanitizeLiveRates(stale.rates) };
        return PRICING_FX_RATES;
      } finally {
        fetchPromise = null;
      }
    })();
  }
  return fetchPromise;
}

/**
 * React hook: starts with the static table for instant paint, then
 * swaps in live rates once available.
 */
export function useFxRates(): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>(PRICING_FX_RATES);
  useEffect(() => {
    let cancelled = false;
    void getLiveFxRates().then((r) => {
      if (!cancelled) setRates(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return rates;
}

const STORAGE_KEY = "pricing_currency";

/**
 * Country/region code → supported pricing currency.
 * Only countries whose local currency is in PRICING_FX_RATES are
 * listed; everyone else falls back to USD.
 */
const REGION_CURRENCY: Record<string, string> = {
  SA: "SAR",
  AE: "AED",
  QA: "QAR",
  BH: "BHD",
  OM: "OMR",
  KW: "KWD",
  JO: "JOD",
  EG: "EGP",
  GB: "GBP",
  // Eurozone
  AT: "EUR",
  BE: "EUR",
  HR: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
};

/**
 * Guess the visitor's currency from their browser locale region
 * (e.g. "ar-SA" → SAR, "en-AE" → AED). Returns null when no
 * supported currency can be inferred.
 */
export function guessPricingCurrencyFromLocale(): string | null {
  try {
    const locales =
      typeof navigator !== "undefined"
        ? navigator.languages && navigator.languages.length > 0
          ? navigator.languages
          : navigator.language
            ? [navigator.language]
            : []
        : [];
    for (const tag of locales) {
      let region: string | undefined;
      try {
        region = new Intl.Locale(tag).region;
      } catch {
        // malformed tag — try a simple parse below
      }
      if (!region) {
        const m = /-([A-Za-z]{2})(?:-|$)/.exec(tag);
        if (m) region = m[1].toUpperCase();
      }
      if (region) {
        const code = REGION_CURRENCY[region];
        if (code && PRICING_FX_RATES[code]) return code;
      }
    }
  } catch {
    // navigator/Intl unavailable — fall through
  }
  return null;
}

/**
 * Currency to show on the Pricing page: an explicit user selection
 * (localStorage) always wins; otherwise guess from the browser
 * locale's region; USD is the safe fallback.
 */
export function getStoredPricingCurrency(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && PRICING_FX_RATES[v]) return v;
  } catch {
    // localStorage unavailable (SSR/privacy mode) — fall through
  }
  return guessPricingCurrencyFromLocale() ?? "USD";
}

export function storePricingCurrency(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

/**
 * Convert a USD amount and format it in the target currency.
 * Currencies with 0–2 decimals round to whole numbers for a clean
 * marketing display (e.g. "SAR 34" not "SAR 33.75"); 3-decimal
 * currencies (KWD, BHD, OMR) keep 2 decimals for accuracy.
 */
export function formatUsdInCurrency(
  usd: number,
  code: string,
  rates: Record<string, number> = PRICING_FX_RATES,
): string {
  const rate = rates[code] ?? PRICING_FX_RATES[code];
  const currency = getCurrencyByCode(code);
  if (!rate || !currency) return `$${usd}`;
  const converted = usd * rate;
  if (currency.decimals >= 3) {
    return formatAmount(Math.round(converted * 100) / 100, { ...currency, decimals: 2 });
  }
  return formatAmount(Math.round(converted), { ...currency, decimals: 0 });
}
