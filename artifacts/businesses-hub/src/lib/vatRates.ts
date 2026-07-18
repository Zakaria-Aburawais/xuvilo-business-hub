// Auto VAT rate lookup by ISO country code or currency code.
// Source: official 2024-2026 standard VAT/GST rates per spec table.

export interface VatInfo {
  rate: number;       // percent (0-25)
  country: string;    // ISO-2 country code
  countryName: string;
  countryAr: string;
  source: string;
}

const COUNTRY_VAT: Record<string, VatInfo> = {
  SA: { rate: 15, country: "SA", countryName: "Saudi Arabia", countryAr: "السعودية", source: "ZATCA" },
  AE: { rate: 5,  country: "AE", countryName: "UAE",          countryAr: "الإمارات",  source: "FTA" },
  EG: { rate: 14, country: "EG", countryName: "Egypt",        countryAr: "مصر",       source: "ETA" },
  LY: { rate: 0,  country: "LY", countryName: "Libya",        countryAr: "ليبيا",     source: "—" },
  KW: { rate: 0,  country: "KW", countryName: "Kuwait",       countryAr: "الكويت",    source: "—" },
  QA: { rate: 0,  country: "QA", countryName: "Qatar",        countryAr: "قطر",       source: "—" },
  BH: { rate: 10, country: "BH", countryName: "Bahrain",      countryAr: "البحرين",   source: "NBR" },
  OM: { rate: 5,  country: "OM", countryName: "Oman",         countryAr: "عُمان",      source: "OTA" },
  JO: { rate: 16, country: "JO", countryName: "Jordan",       countryAr: "الأردن",    source: "ISTD" },
  GB: { rate: 20, country: "GB", countryName: "United Kingdom", countryAr: "المملكة المتحدة", source: "HMRC" },
  IQ: { rate: 0,  country: "IQ", countryName: "Iraq",         countryAr: "العراق",    source: "—" },
  YE: { rate: 5,  country: "YE", countryName: "Yemen",        countryAr: "اليمن",     source: "—" },
  SY: { rate: 0,  country: "SY", countryName: "Syria",        countryAr: "سوريا",     source: "—" },
  LB: { rate: 11, country: "LB", countryName: "Lebanon",      countryAr: "لبنان",     source: "MOF" },
  DZ: { rate: 19, country: "DZ", countryName: "Algeria",      countryAr: "الجزائر",   source: "DGI" },
  MA: { rate: 20, country: "MA", countryName: "Morocco",      countryAr: "المغرب",    source: "DGI" },
  TN: { rate: 19, country: "TN", countryName: "Tunisia",      countryAr: "تونس",      source: "DGI" },
  SD: { rate: 17, country: "SD", countryName: "Sudan",        countryAr: "السودان",   source: "TCA" },
  US: { rate: 0,  country: "US", countryName: "United States", countryAr: "الولايات المتحدة", source: "—" },
};

// Default EU rate (used if currency=EUR but no country known).
const EU_DEFAULT: VatInfo = { rate: 20, country: "EU", countryName: "Europe (default)", countryAr: "أوروبا", source: "EU" };

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  SAR: "SA", AED: "AE", EGP: "EG", LYD: "LY", KWD: "KW", QAR: "QA", BHD: "BH",
  OMR: "OM", JOD: "JO", GBP: "GB", IQD: "IQ", YER: "YE", SYP: "SY", LBP: "LB",
  DZD: "DZ", MAD: "MA", TND: "TN", SDG: "SD", USD: "US",
};

export function vatForCountry(country?: string | null): VatInfo | null {
  if (!country) return null;
  return COUNTRY_VAT[country.toUpperCase()] ?? null;
}

export function vatForCurrency(currency?: string | null): VatInfo | null {
  if (!currency) return null;
  const c = currency.toUpperCase();
  if (c === "EUR") return EU_DEFAULT;
  const country = CURRENCY_TO_COUNTRY[c];
  return country ? COUNTRY_VAT[country] ?? null : null;
}

export function listSupportedVatCountries(): VatInfo[] {
  return Object.values(COUNTRY_VAT).sort((a, b) => a.countryName.localeCompare(b.countryName));
}
