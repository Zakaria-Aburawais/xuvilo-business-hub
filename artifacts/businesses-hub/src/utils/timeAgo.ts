import type { Language } from "@/context/LanguageContext";

const UNITS_EN: { limit: number; div: number; one: string; other: string }[] = [
  { limit: 60, div: 1, one: "1 second ago", other: "{n} seconds ago" },
  { limit: 3600, div: 60, one: "1 minute ago", other: "{n} minutes ago" },
  { limit: 86400, div: 3600, one: "1 hour ago", other: "{n} hours ago" },
  { limit: 604800, div: 86400, one: "yesterday", other: "{n} days ago" },
  { limit: 2629800, div: 604800, one: "1 week ago", other: "{n} weeks ago" },
  { limit: 31557600, div: 2629800, one: "1 month ago", other: "{n} months ago" },
  { limit: Infinity, div: 31557600, one: "1 year ago", other: "{n} years ago" },
];

const UNITS_AR: { limit: number; div: number; one: string; two: string; few: string; many: string }[] = [
  { limit: 60, div: 1, one: "قبل ثانية", two: "قبل ثانيتين", few: "قبل {n} ثوانٍ", many: "قبل {n} ثانية" },
  { limit: 3600, div: 60, one: "قبل دقيقة", two: "قبل دقيقتين", few: "قبل {n} دقائق", many: "قبل {n} دقيقة" },
  { limit: 86400, div: 3600, one: "قبل ساعة", two: "قبل ساعتين", few: "قبل {n} ساعات", many: "قبل {n} ساعة" },
  { limit: 604800, div: 86400, one: "أمس", two: "قبل يومين", few: "قبل {n} أيام", many: "قبل {n} يومًا" },
  { limit: 2629800, div: 604800, one: "قبل أسبوع", two: "قبل أسبوعين", few: "قبل {n} أسابيع", many: "قبل {n} أسبوعًا" },
  { limit: 31557600, div: 2629800, one: "قبل شهر", two: "قبل شهرين", few: "قبل {n} أشهر", many: "قبل {n} شهرًا" },
  { limit: Infinity, div: 31557600, one: "قبل سنة", two: "قبل سنتين", few: "قبل {n} سنوات", many: "قبل {n} سنة" },
];

function pluralAr(n: number, u: typeof UNITS_AR[number]): string {
  if (n === 1) return u.one;
  if (n === 2) return u.two;
  if (n >= 3 && n <= 10) return u.few.replace("{n}", String(n));
  return u.many.replace("{n}", String(n));
}

export function timeAgo(iso: string | undefined | null, lang: Language = "en"): string {
  if (!iso) return lang === "ar" ? "—" : "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return lang === "ar" ? "—" : "—";
  const diff = Math.max(0, Math.floor((Date.now() - t) / 1000));

  if (diff < 5) return lang === "ar" ? "الآن" : "just now";

  if (lang === "ar") {
    for (const u of UNITS_AR) {
      if (diff < u.limit) {
        const n = Math.floor(diff / u.div);
        return pluralAr(n, u);
      }
    }
  } else {
    for (const u of UNITS_EN) {
      if (diff < u.limit) {
        const n = Math.floor(diff / u.div);
        return n === 1 ? u.one : u.other.replace("{n}", String(n));
      }
    }
  }
  return iso;
}
