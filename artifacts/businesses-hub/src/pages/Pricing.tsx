import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ChevronDown, Loader2, Settings as SettingsIcon, Check, Minus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth, type Tier, type Interval } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { startCheckout, openBillingPortal } from "@/lib/billingApi";
import {
  PRICING_CURRENCIES,
  formatUsdInCurrency,
  getStoredPricingCurrency,
  storePricingCurrency,
  useFxRates,
} from "@/lib/pricing-fx";
import { getCurrencyByCode } from "@/lib/currencies";

// When VITE_BILLING_ENABLED is not "true", paid plans are shown as "Coming Soon"
// and no checkout flow is triggered. Matches the backend BILLING_ENABLED flag.
const BILLING_ENABLED = import.meta.env["VITE_BILLING_ENABLED"] === "true";

type Bilingual = { en: string; ar: string };
type CompareCell = boolean | Bilingual;

interface PlanDef {
  key: string;
  tier: Tier;
  monthly: number;
  yearly: number;
  ctaKey: string;
  popular: boolean;
  tagline: Bilingual;
  /** Optional summary line prepended to the card bullets (e.g. "Everything in Pro"). */
  summaryBullet?: Bilingual;
}

interface FeatureEntry {
  /** Row label in the comparison table. */
  compareLabel: Bilingual;
  /** Cell value per tier in the comparison table. */
  cells: Record<Tier, CompareCell>;
  /**
   * Per-tier card bullet text. If a tier has no entry here, this feature
   * is not shown as a bullet on that tier's card. The comparison table
   * still always renders one row per feature.
   */
  cardText?: Partial<Record<Tier, Bilingual>>;
}

const PLANS: PlanDef[] = [
  {
    key: "pricing.free",
    tier: "free",
    monthly: 0,
    yearly: 0,
    ctaKey: "pricing.cta_free",
    popular: false,
    tagline: {
      en: "Try the basics, no signup needed",
      ar: "جرّب الأساسيات بدون تسجيل",
    },
  },
  {
    key: "pricing.pro",
    tier: "pro",
    monthly: 9,
    yearly: 79,
    ctaKey: "pricing.cta_pro",
    popular: true,
    tagline: {
      en: "Everything you need to run your business",
      ar: "كل ما تحتاجه لإدارة أعمالك",
    },
  },
  {
    key: "pricing.business",
    tier: "business",
    monthly: 24,
    yearly: 199,
    ctaKey: "pricing.cta_business",
    popular: false,
    tagline: {
      en: "Built for teams and growing companies",
      ar: "مصممة للفرق والشركات النامية",
    },
    summaryBullet: { en: "Everything in Pro", ar: "كل ما في خطة Pro" },
  },
];

/**
 * Single source of truth for tier features. The card bullets and the comparison
 * table are both derived from this list, so the two sections cannot drift out
 * of sync. Order here is the order both sections render in.
 */
const FEATURES: FeatureEntry[] = [
  {
    compareLabel: { en: "Documents per month", ar: "المستندات شهرياً" },
    cells: {
      free: { en: "5 of each", ar: "٥ من كل نوع" },
      pro: { en: "Unlimited", ar: "غير محدود" },
      business: { en: "Unlimited", ar: "غير محدود" },
    },
    cardText: {
      free: {
        en: "5 invoices, 5 quotations, 5 receipts per month",
        ar: "٥ فواتير و٥ عروض أسعار و٥ إيصالات شهرياً",
      },
      pro: { en: "Unlimited documents", ar: "مستندات غير محدودة" },
    },
  },
  {
    compareLabel: { en: "Calculator tools", ar: "أدوات الحاسبات" },
    cells: {
      free: { en: "3", ar: "٣" },
      pro: { en: "All 14+", ar: "جميع الحاسبات (١٤+)" },
      business: { en: "All 14+", ar: "جميع الحاسبات (١٤+)" },
    },
    cardText: {
      free: { en: "3 calculator tools", ar: "٣ أدوات حاسبة" },
      pro: { en: "All 14+ calculators", ar: "جميع الحاسبات (١٤+)" },
    },
  },
  {
    compareLabel: { en: "Templates", ar: "القوالب" },
    cells: {
      free: { en: "5 basic", ar: "٥ أساسية" },
      pro: { en: "100+ premium", ar: "أكثر من ١٠٠ مميز" },
      business: { en: "100+ premium", ar: "أكثر من ١٠٠ مميز" },
    },
    cardText: {
      free: { en: "Basic templates (5 designs)", ar: "قوالب أساسية (٥ تصاميم)" },
      pro: { en: "100+ premium templates", ar: "أكثر من ١٠٠ قالب مميز" },
    },
  },
  {
    compareLabel: { en: "Watermark-free PDFs", ar: "ملفات PDF بدون علامة مائية" },
    cells: { free: false, pro: true, business: true },
    cardText: {
      free: { en: "PDF with Xuvilo watermark", ar: "PDF بعلامة Xuvilo المائية" },
      pro: { en: "No watermark on PDFs", ar: "بدون علامة مائية على ملفات PDF" },
    },
  },
  {
    compareLabel: { en: "No account required", ar: "لا يتطلب حساباً" },
    cells: { free: true, pro: false, business: false },
    cardText: {
      free: { en: "No account required", ar: "لا يتطلب حساباً" },
    },
  },
  {
    compareLabel: { en: "Saved document history", ar: "سجل المستندات المحفوظة" },
    cells: { free: false, pro: true, business: true },
    cardText: {
      pro: { en: "Saved document history", ar: "سجل المستندات المحفوظة" },
    },
  },
  {
    compareLabel: { en: "Client address book", ar: "دفتر عناوين العملاء" },
    cells: { free: false, pro: true, business: true },
    cardText: {
      pro: { en: "Client address book", ar: "دفتر عناوين العملاء" },
    },
  },
  {
    compareLabel: { en: "Send invoices by email", ar: "إرسال الفواتير بالبريد الإلكتروني" },
    cells: { free: false, pro: true, business: true },
    cardText: {
      pro: { en: "Send invoices by email", ar: "إرسال الفواتير بالبريد الإلكتروني" },
    },
  },
  {
    compareLabel: { en: "Priority support", ar: "دعم ذو أولوية" },
    cells: { free: false, pro: true, business: true },
    cardText: {
      pro: { en: "Priority support", ar: "دعم ذو أولوية" },
    },
  },
  {
    compareLabel: { en: "Team member seats", ar: "مقاعد أعضاء الفريق" },
    cells: {
      free: false,
      pro: false,
      business: { en: "3 included", ar: "٣ مشمولة" },
    },
    cardText: {
      business: { en: "3 team member seats", ar: "٣ مقاعد لأعضاء الفريق" },
    },
  },
  {
    compareLabel: { en: "AI Writer", ar: "AI Writer" },
    cells: { free: false, pro: false, business: true },
    cardText: {
      business: { en: "AI Writer included", ar: "AI Writer مشمول" },
    },
  },
  {
    compareLabel: { en: "Custom branding on PDFs", ar: "علامة تجارية مخصصة على PDF" },
    cells: { free: false, pro: false, business: true },
    cardText: {
      business: { en: "Custom branding on PDFs", ar: "علامة تجارية مخصصة على PDF" },
    },
  },
  {
    compareLabel: { en: "ZATCA Phase 2 support", ar: "دعم زاتكا (المرحلة الثانية)" },
    cells: { free: false, pro: false, business: true },
    cardText: {
      business: { en: "ZATCA Phase 2 support", ar: "دعم زاتكا (المرحلة الثانية)" },
    },
  },
  {
    compareLabel: { en: "API access", ar: "وصول API" },
    cells: { free: false, pro: false, business: true },
    cardText: {
      business: { en: "API access", ar: "وصول API" },
    },
  },
];

const PRICING_FAQ = [
  { qKey: "pricing.faq.1.q", aKey: "pricing.faq.1.a" },
  { qKey: "pricing.faq.2.q", aKey: "pricing.faq.2.a" },
  { qKey: "pricing.faq.3.q", aKey: "pricing.faq.3.a" },
  { qKey: "pricing.faq.4.q", aKey: "pricing.faq.4.a" },
  { qKey: "pricing.faq.5.q", aKey: "pricing.faq.5.a" },
];

export default function PricingPage() {
  const { t, lang } = useLanguage();
  const { user, refreshBilling } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAR = lang === "ar";
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [interval, setInterval] = useState<Interval>("month");
  const [currency, setCurrency] = useState<string>(() => getStoredPricingCurrency());
  const [busyPlan, setBusyPlan] = useState<Tier | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, business: 2 };
  const currentTierRank = user ? TIER_RANK[user.tier] : -1;

  const pick = (b: Bilingual) => (isAR ? b.ar : b.en);

  /** Bullets for a tier's card, derived from the FEATURES catalog. */
  const cardBullets = (tier: Tier): Bilingual[] =>
    FEATURES
      .map((f) => f.cardText?.[tier])
      .filter((x): x is Bilingual => !!x);

  // Highest savings across paid plans, used for the toggle's "Save up to N%" badge.
  const maxYearlyDiscount = useMemo(() => {
    let best = 0;
    for (const p of PLANS) {
      if (p.tier === "free") continue;
      const fullYear = p.monthly * 12;
      if (fullYear <= 0) continue;
      const pct = Math.round(((fullYear - p.yearly) / fullYear) * 100);
      if (pct > best) best = pct;
    }
    return best;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "cancelled") {
      toast({
        title: isAR ? "تم إلغاء عملية الدفع" : "Checkout cancelled",
        description: isAR ? "لم يتم تحصيل أي مبلغ. يمكنك المحاولة مجدداً في أي وقت." : "No charge was made. You can try again anytime.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goCheckout = async (tier: Tier) => {
    if (tier === "free") return;
    if (!user) {
      navigate(`/signup?plan=${tier}&interval=${interval}`);
      return;
    }
    setBusyPlan(tier);
    try {
      const { url } = await startCheckout({
        name: user.name,
        plan: tier,
        interval,
        currency,
      });
      window.location.href = url;
    } catch (err) {
      const msg = isAR
        ? "تعذّر بدء عملية الدفع. يرجى المحاولة مرة أخرى لاحقاً."
        : err instanceof Error && err.message
          ? err.message
          : "Checkout failed. Please try again later.";
      toast({
        title: isAR ? "تعذّر بدء الدفع" : "Could not start checkout",
        description: msg,
        variant: "destructive",
      });
      setBusyPlan(null);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;
    setPortalBusy(true);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      const msg = isAR
        ? "تعذّر فتح بوابة الفوترة. يرجى المحاولة مرة أخرى لاحقاً."
        : err instanceof Error && err.message
          ? err.message
          : "Could not open billing portal. Please try again later.";
      toast({
        title: isAR ? "تعذّر فتح بوابة الفوترة" : "Could not open billing portal",
        description: msg,
        variant: "destructive",
      });
      setPortalBusy(false);
    }
  };

  const isUSD = currency === "USD";
  const fxRates = useFxRates();

  const changeCurrency = (code: string) => {
    setCurrency(code);
    storePricingCurrency(code);
  };

  const formatPrice = (plan: PlanDef) => {
    if (plan.tier === "free") return isUSD ? "$0" : formatUsdInCurrency(0, currency, fxRates);
    const dollars = interval === "year" ? plan.yearly : plan.monthly;
    return isUSD ? `$${dollars}` : formatUsdInCurrency(dollars, currency, fxRates);
  };

  const intervalLabel = interval === "year"
    ? (isAR ? "/سنة" : "/year")
    : (isAR ? "/شهر" : "/month");

  // Refresh billing when returning from portal
  useEffect(() => {
    if (user) {
      void refreshBilling();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderCompareCell = (cell: CompareCell) => {
    if (typeof cell === "boolean") {
      return cell
        ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" aria-label={isAR ? "نعم" : "Yes"} />
        : <Minus className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" aria-label={isAR ? "لا" : "No"} />;
    }
    return <span className="text-sm text-foreground">{pick(cell)}</span>;
  };

  return (
    <AppLayout>
      <SEOHead {...PAGE_SEO["/pricing"]} path="/pricing" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Launch banner — shown while billing is not yet active */}
        {!BILLING_ENABLED && (
          <div className="mb-10 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-base">
                {isAR ? "كل الميزات مجانية خلال مرحلة الإطلاق" : "All features free during our launch phase"}
              </span>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {isAR
                ? "استمتع بوصول كامل بدون رسوم. الخطط المدفوعة ستُطلق قريباً."
                : "Enjoy full access at no cost. Paid plans are coming soon — no credit card ever needed right now."}
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3">{t("pricing.title")}</h1>
          <p className="text-muted-foreground text-lg">{t("pricing.subtitle")}</p>
        </div>

        {/* Monthly/Yearly toggle */}
        <div className="flex items-center justify-center gap-3 mb-6" data-testid="billing-interval-toggle">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              interval === "month"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
            data-testid="interval-month"
          >
            {isAR ? "شهري" : "Monthly"}
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              interval === "year"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
            data-testid="interval-year"
          >
            {isAR ? "سنوي" : "Yearly"}
            {maxYearlyDiscount > 0 && (
              <span className="ms-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {isAR ? `وفّر حتى ${maxYearlyDiscount}%` : `Save up to ${maxYearlyDiscount}%`}
              </span>
            )}
          </button>
        </div>

        {/* Currency selector */}
        <div className="flex items-center justify-center gap-2 mb-4" data-testid="pricing-currency-selector">
          <label htmlFor="pricing-currency" className="text-sm text-muted-foreground">
            {isAR ? "العملة:" : "Currency:"}
          </label>
          <select
            id="pricing-currency"
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors"
            data-testid="pricing-currency-select"
          >
            {PRICING_CURRENCIES.map((code) => {
              const c = getCurrencyByCode(code);
              return (
                <option key={code} value={code}>
                  {c ? `${c.flag} ${code} — ${isAR ? c.nameAr : c.name}` : code}
                </option>
              );
            })}
          </select>
        </div>
        {!isUSD && (
          <p className="text-center text-xs text-muted-foreground mb-4" data-testid="pricing-usd-note">
            {isAR
              ? "الأسعار المعروضة تقريبية بعملتك. عند الدفع، سيتم تحصيل المبلغ بعملتك المختارة إن كانت مدعومة، وإلا فبالدولار الأمريكي (USD)."
              : "Prices shown are approximate in your currency. At checkout you'll be charged in your selected currency where supported, otherwise in US dollars (USD)."}
          </p>
        )}

        {/* Trust bar */}
        <p
          className="text-center text-sm text-muted-foreground mb-10"
          data-testid="pricing-trust-bar"
        >
          {t("pricing.trust_bar")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const planRank = TIER_RANK[plan.tier];
            const isCurrentPlan = !!user && user.tier === plan.tier
              && (plan.tier === "free" || user.billingInterval === interval);
            const isDowngrade = !!user && planRank < currentTierRank;
            const isLoading = busyPlan === plan.tier;
            const bullets = plan.summaryBullet
              ? [plan.summaryBullet, ...cardBullets(plan.tier)]
              : cardBullets(plan.tier);

            return (
              <Card
                key={plan.key}
                className={`relative flex flex-col ${plan.popular ? "border-primary border-2 shadow-xl md:scale-[1.04] z-10" : ""}`}
                data-testid={`plan-${plan.key}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t("pricing.popular")}
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{t(plan.key)}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 min-h-[2.25rem]">
                    {pick(plan.tagline)}
                  </p>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">{formatPrice(plan)}</span>
                    {plan.tier !== "free" && (
                      <span className="text-muted-foreground">{intervalLabel}</span>
                    )}
                    {plan.tier === "free" && (
                      <span className="text-muted-foreground">{t("pricing.month")}</span>
                    )}
                  </div>
                  {plan.tier !== "free" && interval === "year" && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      {isAR
                        ? `يعادل $${(plan.yearly / 12).toFixed(2)} شهرياً`
                        : `≈ $${(plan.yearly / 12).toFixed(2)}/mo`}
                    </p>
                  )}
                  {plan.tier !== "free" && !isUSD && (
                    <p className="text-[11px] text-muted-foreground mt-1" data-testid={`plan-usd-price-${plan.key}`}>
                      {isAR
                        ? `يعادل $${interval === "year" ? plan.yearly : plan.monthly} بالدولار الأمريكي`
                        : `Equivalent to $${interval === "year" ? plan.yearly : plan.monthly} USD`}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {bullets.map((b) => (
                      <li key={b.en} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{pick(b)}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.tier === "free" && !user ? (
                    <Link href="/signup">
                      <Button variant="outline" className="w-full" data-testid={`plan-cta-${plan.key}`}>
                        {t(plan.ctaKey)}
                      </Button>
                    </Link>
                  ) : isCurrentPlan ? (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full opacity-60 cursor-default"
                        disabled
                        data-testid={`plan-cta-${plan.key}`}
                      >
                        {isAR ? "خطتك الحالية" : "Current Plan"}
                      </Button>
                      {plan.tier !== "free" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={handleManageBilling}
                          disabled={portalBusy}
                          data-testid={`plan-manage-${plan.key}`}
                        >
                          {portalBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <SettingsIcon className="w-3.5 h-3.5 me-1.5" />
                              {isAR ? "إدارة الفوترة" : "Manage billing"}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ) : isDowngrade && plan.tier === "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManageBilling}
                      disabled={portalBusy}
                      data-testid={`plan-cta-${plan.key}`}
                    >
                      {portalBusy
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : (isAR ? "إلغاء الاشتراك" : "Cancel subscription")}
                    </Button>
                  ) : !BILLING_ENABLED && plan.tier !== "free" ? (
                    <Button
                      variant="outline"
                      className="w-full opacity-60 cursor-default"
                      disabled
                      data-testid={`plan-cta-${plan.key}`}
                    >
                      {isAR ? "قريباً" : "Coming soon"}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? "default" : "outline"}
                      className="w-full"
                      onClick={() => goCheckout(plan.tier)}
                      disabled={isLoading || plan.tier === "free"}
                      data-testid={`plan-cta-${plan.key}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !user ? (
                        t(plan.ctaKey)
                      ) : isDowngrade ? (
                        isAR ? "تخفيض الخطة" : "Downgrade"
                      ) : (
                        isAR ? "ترقية الخطة" : `Upgrade to ${t(plan.key)}`
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t("pricing.footnote")}
        </p>

        {/* ── Feature comparison table ───────────────────────────────────── */}
        <section className="mt-20" data-testid="pricing-comparison">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isAR ? "قارن جميع الميزات" : "Compare all features"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isAR
                ? "نظرة تفصيلية على ما تحصل عليه في كل خطة."
                : "A detailed look at what you get on every plan."}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th
                    scope="col"
                    className="text-start font-semibold text-gray-900 dark:text-white px-4 py-3 w-2/5"
                  >
                    {isAR ? "الميزة" : "Feature"}
                  </th>
                  {PLANS.map((plan) => (
                    <th
                      key={plan.key}
                      scope="col"
                      className={`px-4 py-3 text-center font-semibold ${
                        plan.popular
                          ? "text-primary"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {t(plan.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Price row for quick reference */}
                <tr className="bg-white dark:bg-gray-900/30">
                  <td className="px-4 py-3 text-muted-foreground">
                    {isAR ? "السعر" : "Price"}
                  </td>
                  {PLANS.map((plan) => (
                    <td key={plan.key} className="px-4 py-3 text-center font-medium">
                      {formatPrice(plan)}
                      {plan.tier !== "free" && (
                        <span className="text-muted-foreground text-xs ms-0.5">
                          {intervalLabel}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                {FEATURES.map((row, idx) => (
                  <tr
                    key={row.compareLabel.en}
                    className={idx % 2 === 0 ? "bg-gray-50/60 dark:bg-gray-900/10" : "bg-white dark:bg-gray-900/30"}
                    data-testid={`compare-row-${idx}`}
                  >
                    <td className="px-4 py-3 text-foreground">{pick(row.compareLabel)}</td>
                    {PLANS.map((plan) => (
                      <td key={plan.key} className="px-4 py-3 text-center">
                        {renderCompareCell(row.cells[plan.tier])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t("pricing.faq.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("pricing.faq.subtitle")}
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {PRICING_FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {t(item.qKey)}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
                      {t(item.aKey)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            {t("pricing.faq.contact_prompt")}{" "}
            <a href="mailto:support@businesseshub.com" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              {t("pricing.faq.contact_link")}
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
