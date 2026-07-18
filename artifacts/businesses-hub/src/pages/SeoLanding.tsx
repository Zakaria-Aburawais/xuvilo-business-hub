import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, Globe2, Languages, Shield, FileText } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { SITE_URL } from "@/lib/seo-config";

interface LandingConfig {
  slug: string;          // URL slug (without leading slash)
  forceLang?: "ar" | "en"; // page is locked to this language regardless of toggle
  title: string;
  description: string;
  h1: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;       // tool/template path
  faq?: { q: string; a: string }[];
}

const CONFIGS: Record<string, LandingConfig> = {
  "arabic-invoice-generator": {
    slug: "arabic-invoice-generator",
    title: "Free Arabic Invoice Generator | RTL, VAT, PDF — Xuvilo",
    description: "Create professional Arabic invoices online in seconds. Right-to-left layout, automatic VAT, free PDF export. No signup required.",
    h1: "Free Arabic Invoice Generator",
    intro: "Generate invoices in fluent Arabic with proper RTL formatting, Hijri or Gregorian dates, and automatic VAT for every Arab country. Export a print-ready PDF in one click — no credit card, no signup.",
    bullets: [
      "Native Arabic typography and right-to-left layout",
      "Automatic VAT for SA, AE, EG, JO, BH, OM, KW, QA, LY",
      "Free unlimited PDF export with Arabic numerals",
      "Bilingual templates: switch between Arabic and English",
      "Invoice guides for 50+ countries — VAT rules, compliance, templates",
    ],
    ctaLabel: "Create Arabic Invoice",
    ctaHref: "/invoice?lang=ar",
    faq: [
      { q: "Is it really free?", a: "Yes. The Arabic invoice generator is completely free with no signup required. During our launch phase there are no monthly document limits — create as many invoices as you need at no cost." },
      { q: "Does it support Hijri dates?", a: "Yes — switch the date format from the document settings to use the Hijri calendar." },
      { q: "Can I email or WhatsApp the invoice?", a: "Yes. Every saved invoice has WhatsApp and Email send buttons that open with a pre-filled message." },
    ],
  },
  "zatca-invoice-saudi": {
    slug: "zatca-invoice-saudi",
    title: "ZATCA-Compliant Invoice Generator (Saudi Arabia) — Free, Arabic & English",
    description: "Generate ZATCA Phase 1 and Phase 2 e-invoices for Saudi Arabia with embedded QR code, 15% VAT, bilingual layout, and free PDF download.",
    h1: "ZATCA E-Invoice Generator for Saudi Arabia",
    intro: "Issue ZATCA-compliant tax invoices with the required QR code, seller VAT number, timestamp, and 15% VAT — all auto-calculated. Bilingual Arabic/English layout meets Phase 1 and Phase 2 requirements.",
    bullets: [
      "Embedded ZATCA QR code (TLV / Base64 encoded)",
      "15% VAT auto-applied for SAR currency",
      "Bilingual Arabic-first invoice template",
      "Seller VAT registration number validation",
      "PDF export ready for ZATCA archiving",
    ],
    ctaLabel: "Open ZATCA Invoice Generator",
    ctaHref: "/invoice?country=SA&currency=SAR&zatca=1",
    faq: [
      { q: "Is this ZATCA Phase 2 compliant?", a: "The generated invoice contains the QR code, VAT number, and tax breakdown required by ZATCA. For full Phase 2 e-invoice integration with FATOORA, contact us about the Business plan." },
      { q: "Will the QR code scan correctly?", a: "Yes. We follow the ZATCA TLV encoding spec for the QR payload (seller name, VAT number, timestamp, total, VAT amount)." },
    ],
  },
  "invoice-generator-libya": {
    slug: "invoice-generator-libya",
    title: "Libya Invoice Generator — Arabic, LYD, Free PDF | Xuvilo",
    description: "Free invoice generator for Libyan businesses. Arabic-first, Libyan Dinar (LYD) currency, professional templates, instant PDF download.",
    h1: "Libya Invoice Generator (LYD)",
    intro: "Built for Libyan businesses — Arabic interface, Libyan Dinar formatting, and templates that work for trading, oil & gas, NGOs, and consultancies. Print-ready PDF in seconds.",
    bullets: [
      "Libyan Dinar (LYD) with proper formatting د.ل",
      "Arabic-first templates designed for Libya",
      "Industry packs: oil & gas, trading, NGO, consulting",
      "Free PDF export — no signup, no watermark on saved drafts",
      "Bilingual mode for international clients",
    ],
    ctaLabel: "Create Libya Invoice",
    ctaHref: "/invoice?country=LY&currency=LYD&lang=ar",
  },
  "ngo-invoice-template": {
    slug: "ngo-invoice-template",
    title: "NGO Invoice & Donation Receipt Template — Free, Arabic & English",
    description: "Free invoice and donation receipt templates for NGOs and nonprofits. Bilingual, donor-friendly, with grant/programme line items and PDF export.",
    h1: "NGO Invoice & Donation Receipt Template",
    intro: "Tailored for nonprofits, charities, and humanitarian organisations around the world. Use the donation receipt template for donors, or the programme invoice for partners and grant administrators.",
    bullets: [
      "Donation receipt with tax-deductible language",
      "Programme/grant invoice with cost categories",
      "Bilingual Arabic + English on a single page",
      "Logo, stamp and signature blocks included",
      "Free PDF export — works on any device",
    ],
    ctaLabel: "Open NGO Template",
    ctaHref: "/templates/invoice?industry=ngo",
  },
  "oil-gas-invoice-arabic": {
    slug: "oil-gas-invoice-arabic",
    title: "Oil & Gas Invoice Template (Arabic) — Free | Xuvilo",
    description: "Specialised Arabic invoice template for oil & gas service companies. Crew, equipment, mobilisation, and day-rate line items. Free PDF.",
    h1: "Oil & Gas Invoice Template (Arabic)",
    intro: "Built for upstream and oilfield service contractors across Libya, Saudi Arabia, UAE, Iraq and Egypt. Pre-filled categories for crew, equipment, mobilisation, mileage, and day rates.",
    bullets: [
      "Day-rate, crew, equipment and mobilisation lines",
      "Bilingual headers (Arabic/English) for joint ventures",
      "Multi-currency: USD, SAR, AED, LYD, IQD",
      "Project / PO / well-name reference fields",
      "PDF export sized for A4 portrait or landscape",
    ],
    ctaLabel: "Open Oil & Gas Template",
    ctaHref: "/templates/invoice?industry=oil-gas&lang=ar",
  },
  "فاتورة-ضريبية": {
    slug: "فاتورة-ضريبية",
    forceLang: "ar",
    title: "فاتورة ضريبية مجانية — قالب عربي PDF | Xuvilo",
    description: "أنشئ فاتورة ضريبية مجانية باللغة العربية. متوافقة مع ZATCA، حساب تلقائي للضريبة، تصدير PDF فوري بدون تسجيل.",
    h1: "فاتورة ضريبية مجانية — قالب عربي",
    intro: "أنشئ فاتورة ضريبية احترافية باللغة العربية في ثوانٍ. تصميم من اليمين إلى اليسار، ضريبة قيمة مضافة محسوبة تلقائياً لكل دولة عربية، ورمز QR متوافق مع هيئة الزكاة والضريبة والجمارك السعودية.",
    bullets: [
      "تصميم عربي أصلي من اليمين إلى اليسار",
      "حساب تلقائي للضريبة 15% للسعودية و5% للإمارات وغيرها",
      "رمز QR متوافق مع ZATCA للفواتير الإلكترونية",
      "تصدير PDF مجاني وغير محدود",
      "قوالب ثنائية اللغة (عربي + إنجليزي)",
    ],
    ctaLabel: "أنشئ فاتورة ضريبية الآن",
    ctaHref: "/invoice?lang=ar&country=SA",
    faq: [
      { q: "هل الخدمة مجانية فعلاً؟", a: "نعم، إنشاء وتنزيل الفواتير مجاني بالكامل. الباقة المجانية تتيح حتى 10 مستندات شهرياً، والباقة المدفوعة تفتح الاستخدام غير المحدود وإزالة العلامة المائية." },
      { q: "هل تدعم رمز QR لـ ZATCA؟", a: "نعم، يتم توليد رمز QR تلقائياً بترميز TLV المعتمد من هيئة الزكاة والضريبة والجمارك." },
    ],
  },
  "quotation-generator-arabic": {
    slug: "quotation-generator-arabic",
    title: "Arabic Quotation Generator — Free Bilingual PDF | Xuvilo",
    description: "Generate professional Arabic quotations and proposals with bilingual layout, validity dates, and free PDF download. No signup needed.",
    h1: "Free Arabic Quotation Generator",
    intro: "Send polished quotations to clients anywhere in the world — Arabic-first layout, validity period, terms and conditions, and a one-click PDF that's ready to send by WhatsApp or email.",
    bullets: [
      "Arabic-first quotation layout with optional bilingual mode",
      "Validity period, payment terms, delivery terms",
      "Multi-currency with automatic VAT calculation",
      "WhatsApp and Email send buttons for instant delivery",
      "Convert an approved quotation into an invoice in one click",
    ],
    ctaLabel: "Create Arabic Quotation",
    ctaHref: "/quotation?lang=ar",
  },
};

export const SEO_LANDING_SLUGS = Object.keys(CONFIGS);

export function getSeoLandingConfig(slug: string): LandingConfig | undefined {
  return CONFIGS[slug];
}

interface PageProps { slug: string }

export function SeoLandingPage({ slug }: PageProps) {
  const cfg = CONFIGS[slug];
  const { lang } = useLanguage();
  if (!cfg) return null;
  const pageLang = cfg.forceLang ?? lang;
  const isAr = pageLang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const canonical = `${SITE_URL}/${encodeURI(cfg.slug)}`;

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
      <Helmet>
        <html lang={pageLang} dir={dir} />
        <title>{cfg.title}</title>
        <meta name="description" content={cfg.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={cfg.title} />
        <meta property="og:description" content={cfg.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content={isAr ? "ar_SA" : "en_US"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={cfg.title} />
        <meta name="twitter:description" content={cfg.description} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: cfg.h1,
          description: cfg.description,
          inLanguage: isAr ? "ar" : "en",
          url: canonical,
          isPartOf: { "@type": "WebSite", name: "Xuvilo — AI Business Tools Hub", url: SITE_URL },
          ...(cfg.faq ? {
            mainEntity: {
              "@type": "FAQPage",
              mainEntity: cfg.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          } : {}),
        })}</script>
      </Helmet>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16" data-testid={`seo-landing-${cfg.slug}`}>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-5">
            <Globe2 className="w-3.5 h-3.5" />
            {isAr ? "يستخدمها أعمال في +40 دولة" : "Used by businesses in 40+ countries"}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight" data-testid="seo-h1">
            {cfg.h1}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">{cfg.intro}</p>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {isAr ? "بدون تسجيل" : "No signup"}</span>
            <span aria-hidden="true">•</span>
            <span className="flex items-center gap-1"><Languages className="w-3.5 h-3.5" /> {isAr ? "عربي + إنجليزي" : "Arabic + English"}</span>
          </div>
          <div className="mt-7">
            <Link href={cfg.ctaHref}>
              <button
                className="inline-flex items-center gap-2 min-h-[48px] px-7 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold shadow-lg transition"
                data-testid="seo-cta"
              >
                <FileText className="w-4 h-4" />
                {cfg.ctaLabel}
                <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
              </button>
            </Link>
          </div>
        </div>

        {/* Embedded tool quick link */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-8 shadow-sm mb-10">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-5">
            {isAr ? "ما يميز هذه الأداة" : "What you get"}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cfg.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
            <Link href={cfg.ctaHref}>
              <button
                className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-lg bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold"
                data-testid="seo-cta-secondary"
              >
                {isAr ? "ابدأ الآن — مجاناً" : "Start now — it's free"}
                <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
              </button>
            </Link>
          </div>
        </div>

        {cfg.faq && cfg.faq.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-5">
              {isAr ? "أسئلة شائعة" : "Frequently asked questions"}
            </h2>
            <dl className="space-y-5">
              {cfg.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold text-gray-900 dark:text-white mb-1">{f.q}</dt>
                  <dd className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="text-center mt-10 text-sm text-gray-500 dark:text-gray-400">
          {isAr ? "هل تحتاج إلى صيغة مختلفة؟" : "Need a different format?"}{" "}
          <Link href="/templates/invoice" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            {isAr ? "تصفّح كل القوالب" : "Browse all templates"}
          </Link>
        </div>
      </main>
    </div>
  );
}

// Export thin per-route components — keeps App.tsx terse and lets Wouter route by path.
export const ArabicInvoiceLanding   = () => <SeoLandingPage slug="arabic-invoice-generator" />;
export const ZatcaSaudiLanding      = () => <SeoLandingPage slug="zatca-invoice-saudi" />;
export const LibyaInvoiceLanding    = () => <SeoLandingPage slug="invoice-generator-libya" />;
export const NgoInvoiceLanding      = () => <SeoLandingPage slug="ngo-invoice-template" />;
export const OilGasInvoiceLanding   = () => <SeoLandingPage slug="oil-gas-invoice-arabic" />;
export const ArabicTaxInvoiceLanding = () => <SeoLandingPage slug="فاتورة-ضريبية" />;
export const ArabicQuotationLanding = () => <SeoLandingPage slug="quotation-generator-arabic" />;
