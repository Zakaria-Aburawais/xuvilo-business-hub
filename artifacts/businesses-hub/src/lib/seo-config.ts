import {
  CURRENCY_COUNT_DISPLAY,
  TEMPLATE_COUNT, TEMPLATE_COUNT_DISPLAY,
  CALCULATOR_COUNT,
} from "@/lib/site-stats";

export const SITE_URL = "https://xuvilo.com";
export const OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

// Shared "last reviewed" date shown on evergreen SEO pages.
// Keep in sync with CONTENT_LAST_REVIEWED_* in server.ts.
export const CONTENT_LAST_REVIEWED = {
  en: "July 17, 2026",
  ar: "17 يوليو 2026",
};

export interface PageSEO {
  title: string;
  description: string;
  ogType?: string;
  structuredData?: object;
}

export const PAGE_SEO: Record<string, PageSEO> = {
  "/": {
    title: `Xuvilo — Free Invoice Generator | Arabic & English`,
    description:
      `Create professional invoices, quotations, and receipts in Arabic and English. Free PDF export, ZATCA compliant, ${CURRENCY_COUNT_DISPLAY} currencies. No sign-up required.`,
    ogType: "website",
    // No structuredData here: the homepage WebApplication / WebSite /
    // SoftwareApplication / Organization schema is injected server-side
    // (getJsonLdForPath in server.ts). The homepage FAQPage is added
    // client-side in Home.tsx so it matches the visible FAQ text exactly.
  },
  "/invoice": {
    title: "Free Invoice Generator — Arabic & English | Xuvilo",
    description:
      `Generate professional invoices in Arabic and English instantly. VAT support, ${CURRENCY_COUNT_DISPLAY} currencies, ZATCA QR code, free PDF export. No sign-up required.`,
  },
  "/quotation": {
    title: "Free Quotation Generator — Arabic & English | Xuvilo",
    description:
      "Create polished business quotations with validity dates, terms, and bilingual Arabic-English support. Download as PDF instantly.",
  },
  "/receipt": {
    title: "Free Receipt Generator — Instant Payment Receipts | Xuvilo",
    description:
      "Issue professional payment receipts in seconds. Arabic and English support, PDF export, full business details.",
  },
  "/templates": {
    title: `${TEMPLATE_COUNT_DISPLAY} Free Invoice & Quote Templates | Xuvilo`,
    description:
      `Choose from ${TEMPLATE_COUNT_DISPLAY} professional invoice, quotation, and receipt templates. Arabic RTL, bilingual, and English designs for every industry and business type.`,
  },
  "/templates/invoice": {
    title: `${TEMPLATE_COUNT_DISPLAY} Free Invoice Templates — Arabic & English | Xuvilo`,
    description:
      `Browse ${TEMPLATE_COUNT}+ professional invoice templates with Arabic RTL support, bilingual layouts, and industry-specific designs. Free PDF export.`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Free Invoice Templates",
      description: "Professional invoice templates with Arabic RTL and bilingual support",
      numberOfItems: TEMPLATE_COUNT,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Classic Minimal Invoice", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 2, name: "Corporate Dark Header", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 3, name: "Arabic First RTL Invoice", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 4, name: "Bilingual Arabic-English Invoice", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 5, name: "Government Official Arabic", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 6, name: "Modern Gradient Invoice", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 7, name: "Compact Single Page Invoice", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 8, name: "Professional Blue Corporate", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 9, name: "Digital Tech Invoice", url: `${SITE_URL}/templates/invoice` },
        { "@type": "ListItem", position: 10, name: "Thermal POS Invoice", url: `${SITE_URL}/templates/invoice` },
      ],
    },
  },
  "/templates/quotation": {
    title: "Free Quotation Templates — Professional & Arabic | Xuvilo",
    description:
      "35+ business quotation templates including Arabic-first, bilingual, and government tender layouts. Free to use, instant PDF.",
  },
  "/templates/receipt": {
    title: "Free Receipt Templates — Instant Download | Xuvilo",
    description:
      "25+ receipt templates including thermal POS, professional, and Arabic bilingual layouts. Free PDF export.",
  },
  "/calculators": {
    title: `${CALCULATOR_COUNT} Free Business Calculators — VAT & More | Xuvilo`,
    description:
      `${CALCULATOR_COUNT} essential business calculators: VAT calculator, profit margin, currency exchange, discount, overtime, loan, and more. Free to use.`,
  },
  "/pricing": {
    title: "Pricing — Xuvilo | Free & Premium Plans",
    description:
      "Start for free. Upgrade for unlimited documents, premium templates, and advanced features. Plans for freelancers and growing businesses.",
  },
  "/tools/stamp-maker": {
    title: "Free Business Stamp Maker — Custom Seal Generator | Xuvilo",
    description:
      "Design custom professional business stamps online. Choose shape, text, logo, and color. Export as PNG or PDF. Free to use.",
  },
  "/tools/temp-email": {
    title: "Free Temporary Email Generator — Disposable Inbox | Xuvilo",
    description:
      "Generate instant disposable email addresses. No signup required. Auto-refreshing inbox. Perfect for protecting your real email.",
  },
  "/tools/tracker": {
    title: "Document Tracker — Invoice & Receipt Management | Xuvilo",
    description:
      "Track all your invoices, quotations, and receipts. Get due-date reminders. Never miss a payment again.",
  },
  "/invoice-generator-saudi-arabia": {
    title: "ZATCA Invoice Generator for Saudi Arabia | Xuvilo",
    description:
      "Create ZATCA Phase 1 compliant invoices for Saudi Arabian businesses. Arabic & English, SAR currency, 15% VAT auto-calculation, QR code. Free PDF export.",
  },
  "/invoice-generator-uae": {
    title: "Free Invoice Generator for UAE Freelancers | Xuvilo",
    description:
      "Create professional UAE invoices with AED currency, 5% VAT, TRN number support. Arabic & English bilingual. Instant PDF download.",
  },
  "/invoice-generator-egypt": {
    title: "Free Invoice Generator for Egypt | Xuvilo",
    description:
      "أنشئ فواتير احترافية بالجنيه المصري. عربي وإنجليزي، تصدير PDF مجاني. Create Egyptian invoices with EGP currency.",
  },
  "/invoice-generator-libya": {
    title: "Free Invoice Generator for Libya — LYD | Xuvilo",
    description:
      "أنشئ فواتير احترافية بالدينار الليبي. Create professional Libyan invoices with LYD currency. Arabic & English, free PDF.",
  },
  "/invoice-generator-jordan": {
    title: "Free Invoice Generator for Jordan | Xuvilo",
    description:
      "Create professional Jordanian invoices with JOD currency, Arabic & English support, and instant PDF export. Free to use.",
  },
  "/calculators/vat-tax": {
    title: "VAT Calculator Saudi Arabia — How to Calculate | Xuvilo",
    description:
      "Free VAT calculator for Saudi Arabia (15%) and other VAT rates worldwide. Add or remove VAT instantly with the breakdown shown.",
  },
  "/calculators/profit-margin": {
    title: "Profit Margin Calculator for Traders | Xuvilo",
    description:
      "Free profit margin and markup calculator for traders around the world. Compute margin, markup, cost, and selling price.",
  },
  "/calculators/discount": {
    title: "Discount Calculator — % Off & Final Price | Xuvilo",
    description:
      "Calculate the final price after a percent or fixed discount, the amount saved, and the effective discount. Free online tool.",
  },
  "/calculators/currency-exchange": {
    title: "Currency Exchange Calculator — 176+ Currencies | Xuvilo",
    description:
      "Convert between 176+ world currencies with daily-updated rates. USD, EUR, SAR, AED, EGP, KWD and more. Free online converter.",
  },
  "/calculators/shipping-cbm": {
    title: "Shipping CBM Calculator — Cargo Volume | Xuvilo",
    description:
      "Calculate cubic metres (CBM) for sea and air freight shipments from carton dimensions, plus volumetric weight. Free tool.",
  },
  "/calculators/overtime": {
    title: "Overtime Pay Calculator — Saudi & UAE Rules | Xuvilo",
    description:
      "Calculate overtime pay under Saudi labour law (1.5×), UAE rules (1.25×/1.5×) and other MENA rates. Free online calculator.",
  },
  "/calculators/leave-balance": {
    title: "Leave Balance Calculator — Annual Leave | Xuvilo",
    description:
      "Calculate annual leave balance and leave pay for GCC and MENA employees under local labour rules. Free online tool.",
  },
  "/calculators/import-cost": {
    title: "Import Cost Calculator — Landed Cost & Duty | Xuvilo",
    description:
      "Calculate the full landed cost of imported goods: product cost, freight, customs duty, VAT and clearance fees. Free tool.",
  },
  "/calculators/break-even": {
    title: "Break-Even Point Calculator | Xuvilo",
    description:
      "Find the sales volume where revenue covers fixed and variable costs. Break-even units and revenue, instantly. Free tool.",
  },
  "/calculators/markup-margin": {
    title: "Markup & Margin Calculator | Xuvilo",
    description:
      "Convert between markup and margin, and compute the selling price from cost. Side-by-side breakdown for traders. Free tool.",
  },
  "/calculators/loan": {
    title: "Loan EMI Calculator — Monthly Payment | Xuvilo",
    description:
      "Calculate monthly loan instalments (EMI), total interest and amortisation for any loan amount, rate and tenor. Free tool.",
  },
  "/calculators/invoice-aging": {
    title: "Invoice Aging Calculator — Overdue Buckets | Xuvilo",
    description:
      "Sort outstanding invoices into aging buckets (30/60/90+ days) and see overdue totals at a glance. Free online tool.",
  },
  "/calculators/salary-cost": {
    title: "Salary Cost Calculator — Employee Cost | Xuvilo",
    description:
      "Calculate the total cost of an employee: gross salary, allowances, end-of-service accrual and employer contributions. Free tool.",
  },
  "/calculators/freight-cbw": {
    title: "Chargeable Weight Calculator — Air Freight | Xuvilo",
    description:
      "Calculate air freight chargeable weight from actual and volumetric weight, with per-carton dimensions supported. Free tool.",
  },
  "/invoice-generator-kuwait": {
    title: "Free Invoice Generator for Kuwait — KWD Currency | Xuvilo",
    description:
      "Generate professional Kuwaiti invoices with KWD currency, Arabic RTL support, and ZATCA-ready QR codes. Free PDF export.",
  },
};

export function getPageSEO(pathname: string): PageSEO {
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (PAGE_SEO[clean]) return PAGE_SEO[clean];
  if (clean.startsWith("/calculators/")) {
    return {
      title: "Business Calculator — Free Online Tool | Xuvilo",
      description:
        "Free business calculator for professionals worldwide. Calculate VAT, profit margins, discounts, currencies, and more.",
    };
  }
  return {
    title: "Xuvilo — AI Business Tools Hub for Freelancers & SMEs",
    description:
      `Professional invoice generator, quotation maker, receipt generator, and business calculators. Arabic & English, ${CURRENCY_COUNT_DISPLAY} currencies.`,
  };
}

export const ALL_ROUTES = [
  "/",
  "/invoice",
  "/quotation",
  "/receipt",
  "/templates/invoice",
  "/templates/quotation",
  "/templates/receipt",
  "/calculators",
  "/calculators/profit-margin",
  "/calculators/discount",
  "/calculators/vat-tax",
  "/calculators/currency-exchange",
  "/calculators/shipping-cbm",
  "/calculators/overtime",
  "/calculators/leave-balance",
  "/calculators/import-cost",
  "/calculators/break-even",
  "/calculators/markup-margin",
  "/calculators/loan",
  "/calculators/invoice-aging",
  "/calculators/salary-cost",
  "/calculators/freight-cbw",
  "/pricing",
  "/tools/stamp-maker",
  "/tools/temp-email",
  "/tools/tracker",
  "/invoice-generator-saudi-arabia",
  "/invoice-generator-uae",
  "/invoice-generator-egypt",
  "/invoice-generator-libya",
  "/invoice-generator-jordan",
  "/invoice-generator-kuwait",
];
