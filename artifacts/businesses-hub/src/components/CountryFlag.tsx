import { memo } from "react";

type Size = "sm" | "md" | "lg";

const SIZE_PX: Record<Size, { w: number; h: number; cdn: string }> = {
  sm: { w: 18, h: 14, cdn: "20x15" },
  md: { w: 22, h: 16, cdn: "24x18" },
  lg: { w: 28, h: 21, cdn: "32x24" },
};

const COUNTRY_NAMES: Record<string, { en: string; ar: string }> = {
  sa: { en: "Saudi Arabia", ar: "السعودية" },
  ae: { en: "United Arab Emirates", ar: "الإمارات" },
  eg: { en: "Egypt", ar: "مصر" },
  qa: { en: "Qatar", ar: "قطر" },
  kw: { en: "Kuwait", ar: "الكويت" },
  bh: { en: "Bahrain", ar: "البحرين" },
  om: { en: "Oman", ar: "عُمان" },
  jo: { en: "Jordan", ar: "الأردن" },
  lb: { en: "Lebanon", ar: "لبنان" },
  ly: { en: "Libya", ar: "ليبيا" },
  ma: { en: "Morocco", ar: "المغرب" },
  dz: { en: "Algeria", ar: "الجزائر" },
  tn: { en: "Tunisia", ar: "تونس" },
  sd: { en: "Sudan", ar: "السودان" },
  iq: { en: "Iraq", ar: "العراق" },
  ye: { en: "Yemen", ar: "اليمن" },
  gb: { en: "United Kingdom", ar: "المملكة المتحدة" },
  us: { en: "United States", ar: "الولايات المتحدة" },
  eu: { en: "European Union", ar: "الاتحاد الأوروبي" },
};

interface CountryFlagProps {
  code: string;
  size?: Size;
  lang?: "en" | "ar";
  className?: string;
}

function CountryFlagBase({ code, size = "md", lang = "en", className = "" }: CountryFlagProps) {
  const lower = code.toLowerCase();
  const dims = SIZE_PX[size];
  const name = COUNTRY_NAMES[lower];
  const title = name ? (lang === "ar" ? name.ar : name.en) : lower.toUpperCase();

  return (
    <img
      src={`https://flagcdn.com/${dims.cdn}/${lower}.png`}
      srcSet={`https://flagcdn.com/${dims.cdn}/${lower}.png 1x, https://flagcdn.com/${
        size === "sm" ? "40x30" : size === "md" ? "48x36" : "64x48"
      }/${lower}.png 2x`}
      width={dims.w}
      height={dims.h}
      alt={title}
      title={title}
      loading="lazy"
      decoding="async"
      className={`inline-block rounded-sm shadow-sm ring-1 ring-black/5 dark:ring-white/10 object-cover ${className}`}
      data-testid={`flag-${lower}`}
    />
  );
}

export const CountryFlag = memo(CountryFlagBase);
