import { createContext, useContext, useState, useEffect } from "react";
import { en } from "@/i18n/en";
import { ar } from "@/i18n/ar";

export type Language = "en" | "ar";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const translations: Record<Language, Record<string, string>> = { en, ar };

// MENA region two-letter ISO country codes for Arabic-first detection.
const ARABIC_REGIONS = new Set([
  "SA", "AE", "KW", "QA", "BH", "OM", "LY", "EG", "IQ", "YE", "SY", "JO", "LB",
  "DZ", "MA", "TN", "SD", "MR", "PS",
]);

// Best-effort timezone → ISO country code mapping for the MENA region.
const TZ_TO_REGION: Record<string, string> = {
  "Asia/Riyadh": "SA",
  "Asia/Dubai": "AE",
  "Asia/Kuwait": "KW",
  "Asia/Qatar": "QA",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Africa/Tripoli": "LY",
  "Africa/Cairo": "EG",
  "Asia/Baghdad": "IQ",
  "Asia/Aden": "YE",
  "Asia/Damascus": "SY",
  "Asia/Amman": "JO",
  "Asia/Beirut": "LB",
  "Africa/Algiers": "DZ",
  "Africa/Casablanca": "MA",
  "Africa/Tunis": "TN",
  "Africa/Khartoum": "SD",
  "Africa/Nouakchott": "MR",
  "Asia/Hebron": "PS",
  "Asia/Gaza": "PS",
};

function detectArabicFirst(): boolean {
  try {
    // 1) Explicit Arabic in any of the user's preferred locales.
    const langs: string[] = Array.isArray((navigator as Navigator).languages)
      ? Array.from((navigator as Navigator).languages)
      : [navigator.language];
    if (langs.some((l) => typeof l === "string" && l.toLowerCase().startsWith("ar"))) {
      return true;
    }
    // 2) Locale region tag (e.g. en-SA, fr-MA) maps to a MENA country.
    for (const l of langs) {
      const m = l.match(/[-_]([A-Za-z]{2})$/);
      if (m && ARABIC_REGIONS.has(m[1].toUpperCase())) return true;
    }
    // 3) Browser timezone resolves to a MENA country.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const region = TZ_TO_REGION[tz];
    if (region && ARABIC_REGIONS.has(region)) return true;
    // 4) Cookie-style hint set by edge proxies (cf-ipcountry mirror).
    const m = document.cookie.match(/(?:^|;\s*)bh_country=([A-Za-z]{2})/);
    if (m && ARABIC_REGIONS.has(m[1].toUpperCase())) return true;
  } catch {
    // ignore
  }
  return false;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem("bh_lang") as Language | null;
    if (stored === "en" || stored === "ar") return stored;
    return detectArabicFirst() ? "ar" : "en";
  });

  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("bh_lang", l);
  };

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.documentElement.style.setProperty(
      "--app-font-sans",
      lang === "ar" ? "'Cairo', sans-serif" : "'Inter', sans-serif"
    );
  }, [lang, dir]);

  const t = (key: string): string => {
    return translations[lang][key] ?? translations["en"][key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
