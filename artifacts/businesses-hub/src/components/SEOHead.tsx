import { Helmet } from "react-helmet-async";
import { SITE_URL, OG_IMAGE, type PageSEO } from "@/lib/seo-config";
import { useLanguage } from "@/context/LanguageContext";

interface SEOHeadProps extends Partial<PageSEO> {
  path?: string;
  noindex?: boolean;
}

export function SEOHead({ title, description, ogType = "website", structuredData, path = "/", noindex }: SEOHeadProps) {
  const { lang } = useLanguage();
  const canonical = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* hreflang — the site serves Arabic and English from the same URL
          (in-app language toggle; there is no /ar/ URL space), so every
          alternate points at the canonical URL. */}
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Open Graph */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:site_name" content="Xuvilo — AI Business Tools Hub" />
      <meta property="og:locale" content={lang === "ar" ? "ar_SA" : "en_US"} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={OG_IMAGE} />

      {/* JSON-LD */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
