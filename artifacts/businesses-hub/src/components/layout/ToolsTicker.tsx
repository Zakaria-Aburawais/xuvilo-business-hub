import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";

interface TickerTool {
  href: string;
  icon: string;
  labelKey: string;
}

const TICKER_TOOLS: TickerTool[] = [
  { href: "/invoice", icon: "🧾", labelKey: "ticker.tool.invoice" },
  { href: "/quotation", icon: "📋", labelKey: "ticker.tool.quotation" },
  { href: "/receipt", icon: "🧮", labelKey: "ticker.tool.receipt" },
  { href: "/templates/invoice", icon: "📑", labelKey: "ticker.tool.templates" },
  { href: "/tools/stamp-maker", icon: "🖋", labelKey: "ticker.tool.stamp" },
  { href: "/tools/business-card", icon: "💳", labelKey: "ticker.tool.business_card" },
  { href: "/tools/company-profile", icon: "📘", labelKey: "ticker.tool.company_profile" },
  { href: "/tools/temp-email", icon: "📧", labelKey: "ticker.tool.temp_email" },
  { href: "/tools/tracker", icon: "📂", labelKey: "ticker.tool.tracker" },
  { href: "/calculators/vat-tax", icon: "💰", labelKey: "ticker.tool.vat" },
  { href: "/calculators/currency-exchange", icon: "💱", labelKey: "ticker.tool.currency" },
  { href: "/calculators/profit-margin", icon: "📈", labelKey: "ticker.tool.profit_margin" },
  { href: "/calculators/discount", icon: "🏷", labelKey: "ticker.tool.discount" },
  { href: "/calculators/shipping-cbm", icon: "📦", labelKey: "ticker.tool.cbm" },
  { href: "/calculators/loan", icon: "🏦", labelKey: "ticker.tool.loan" },
  { href: "/calculators", icon: "🧰", labelKey: "ticker.tool.calculators" },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function Row({ idPrefix, t }: { idPrefix: string; t: (k: string) => string }) {
  return (
    <span className="inline-flex items-center">
      {TICKER_TOOLS.map((tool) => (
        <span key={`${idPrefix}-${tool.href}`} className="inline-flex items-center">
          <Link
            href={tool.href}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
            data-testid={`ticker-${tool.href.replace(/\//g, "-")}`}
          >
            <span aria-hidden className="text-sm">{tool.icon}</span>
            <span>{t(tool.labelKey)}</span>
          </Link>
          <span aria-hidden className="text-gray-300 dark:text-gray-600 text-[10px] mx-2 select-none">
            •
          </span>
        </span>
      ))}
    </span>
  );
}

export function ToolsTicker() {
  const { t, isRTL } = useLanguage();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      className="tools-ticker relative w-full bg-gradient-to-r from-blue-50/80 via-violet-50/80 to-blue-50/80 dark:from-gray-900/80 dark:via-gray-800/80 dark:to-gray-900/80 border-b border-gray-200/70 dark:border-gray-800/70 overflow-hidden shrink-0"
      role="region"
      aria-label={t("ticker.aria.label")}
      data-testid="tools-ticker"
    >
      <div className="flex items-center min-w-0 overflow-hidden">
        <span
          className="hidden sm:inline-flex items-center gap-1 ps-3 pe-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-white/60 dark:bg-gray-900/60 border-e border-gray-200/70 dark:border-gray-800/70 flex-shrink-0"
          aria-hidden
        >
          ✦ {t("ticker.label")}
        </span>
        <div className="ticker-viewport flex-1 min-w-0 overflow-hidden py-1">
          {reduced ? (
            <div className="ticker-track-static overflow-x-auto whitespace-nowrap">
              <Row idPrefix="static" t={t} />
            </div>
          ) : (
            <div
              className={`ticker-track inline-flex flex-nowrap items-center ${isRTL ? "ticker-track-rtl" : "ticker-track-ltr"}`}
            >
              <Row idPrefix="a" t={t} />
              <Row idPrefix="b" t={t} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
