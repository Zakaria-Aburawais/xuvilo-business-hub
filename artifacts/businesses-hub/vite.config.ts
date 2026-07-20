import { defineConfig, type Plugin, type HtmlTagDescriptor } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { blogPosts } from "./src/data/blogPosts.ts";

// PORT is only used by the dev / preview servers, not by `vite build`.
// Default to 24130 so production build phases (which don't set PORT) still succeed.
const rawPort = process.env.PORT ?? "24130";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH controls the asset base for built output. Default to "/" so
// the production build doesn't crash if the env var isn't propagated.
const basePath = process.env.BASE_PATH ?? "/";

const SITE_URL = "https://xuvilo.com";
const OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

interface PageMeta { title: string; description: string; }

const PAGE_META: Record<string, PageMeta> = {
  "/": {
    title: "Xuvilo — AI Business Tools Hub | Free Invoices, Quotes & AI Writer (176+ Currencies)",
    description: "Xuvilo is a free AI-powered business tools hub for freelancers, SMEs and logistics. Generate invoices, quotations and receipts, write professional emails, and run 14 calculators in Arabic & English. 176+ currencies.",
  },
  "/ai-writer": {
    title: "AI Business Writer — Professional Emails in Arabic & English | Xuvilo",
    description: "Write payment reminders, invoice follow-ups, quotation emails, supplier requests, complaints and formal business messages with AI. Arabic & English. Free.",
  },
  "/invoice": {
    title: "Free Invoice Generator — Arabic & English | Xuvilo",
    description: "Generate professional invoices in Arabic and English instantly. VAT support, 176+ currencies, ZATCA QR code, free PDF export. No sign-up required.",
  },
  "/quotation": {
    title: "Free Quotation Generator — Professional Quotes in Arabic | Xuvilo",
    description: "Create polished business quotations with validity dates, terms, and bilingual Arabic-English support. Download as PDF instantly.",
  },
  "/receipt": {
    title: "Free Receipt Generator — Instant Payment Receipts | Xuvilo",
    description: "Issue professional payment receipts in seconds. Arabic and English support, PDF export, full business details.",
  },
  "/templates": {
    title: "100+ Free Invoice & Quotation Templates — Arabic & English | Xuvilo",
    description: "Choose from 100+ professional invoice, quotation, and receipt templates. Arabic RTL, bilingual, and English designs for every industry.",
  },
  "/calculators": {
    title: "14 Free Business Calculators — VAT, Profit, Currency | Xuvilo",
    description: "14 essential business calculators: VAT, profit margin, currency exchange, discount, overtime, loan. Free to use.",
  },
  "/pricing": {
    title: "Pricing — Xuvilo | Free & Premium Plans",
    description: "Start for free. Upgrade for unlimited documents, premium templates, and advanced features.",
  },
  "/tools/stamp-maker": {
    title: "Free Business Stamp Maker — Custom Seal Generator | Xuvilo",
    description: "Design custom professional business stamps online. Export as PNG or PDF. Free to use.",
  },
  "/invoice-generator-saudi-arabia": {
    title: "Free Invoice Generator for Saudi Arabia — ZATCA Compliant | Xuvilo",
    description: "Create ZATCA Phase 1 compliant invoices for Saudi Arabian businesses. Arabic & English, SAR currency, 15% VAT, QR code.",
  },
  "/invoice-generator-uae": {
    title: "Free Invoice Generator for UAE — FTA Compliant | Xuvilo",
    description: "Create professional UAE invoices with AED currency, 5% VAT, TRN support. Arabic & English. Instant PDF download.",
  },
  "/invoice-generator-egypt": {
    title: "مولد الفواتير المجاني لمصر — Free Invoice Generator Egypt | Xuvilo",
    description: "أنشئ فواتير احترافية بالجنيه المصري. Create Egyptian invoices with EGP currency. Arabic & English, free PDF.",
  },
  "/invoice-generator-libya": {
    title: "مولد الفواتير المجاني لليبيا — Free Invoice Generator Libya | Xuvilo",
    description: "Create professional Libyan invoices with LYD currency. Arabic & English, free PDF export.",
  },
  "/invoice-generator-jordan": {
    title: "Free Invoice Generator for Jordan — JOD Currency | Xuvilo",
    description: "Create professional Jordanian invoices with JOD currency, Arabic & English support, and instant PDF export.",
  },
  "/invoice-generator-kuwait": {
    title: "Free Invoice Generator for Kuwait — KWD Currency | Xuvilo",
    description: "Generate professional Kuwaiti invoices with KWD currency, Arabic RTL support, and QR codes. Free PDF export.",
  },
};

const STATIC_HTML: Record<string, string> = {
  "/ai-writer": `<div class="seo-fallback">
    <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">AI Business Writer — Professional Emails in Arabic &amp; English</h1>
    <p style="color:#444;font-size:1.05em">Generate payment reminders, invoice follow-ups, quotation cover emails, supplier requests, complaints, thank-you notes, cold introductions and apology messages with AI. Pick a tone (formal, friendly, firm or warm) and language (English or Arabic). Free.</p>
    <ul style="color:#555;padding-left:1.2em;line-height:2;margin-top:12px">
      <li>8 message types tailored for freelancers and SMEs</li>
      <li>Arabic and English output</li>
      <li>4 tone presets</li>
      <li>Copy or download as a text file</li>
    </ul>
  </div>`,
  "/": `<div class="seo-fallback">
    <h1 style="font-size:2.2em;font-weight:800;margin-bottom:16px">Free invoices, quotations and receipts for businesses worldwide — in Arabic and English</h1>
    <p style="font-size:1.1em;color:#444;margin-bottom:20px">Xuvilo is a free online invoice generator, quotation maker, and receipt creator for freelancers and SMEs worldwide. Supports Arabic &amp; English, 176+ currencies, ZATCA Phase 1 compliance, and instant PDF export. No signup required.</p>
    <ul style="list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:12px">
      <li><a href="/invoice" style="color:#2563eb;font-weight:600">Free Invoice Generator</a></li>
      <li><a href="/quotation" style="color:#2563eb;font-weight:600">Free Quotation Generator</a></li>
      <li><a href="/receipt" style="color:#2563eb;font-weight:600">Free Receipt Generator</a></li>
      <li><a href="/calculators" style="color:#2563eb;font-weight:600">Business Calculators</a></li>
      <li><a href="/templates/invoice" style="color:#2563eb;font-weight:600">Invoice Templates</a></li>
      <li><a href="/pricing" style="color:#2563eb;font-weight:600">Pricing</a></li>
    </ul>
    <p style="margin-top:20px;color:#666;font-size:.9em">Available for Saudi Arabia, UAE, Egypt, Libya, Jordan, Kuwait and 170+ countries worldwide.</p>
  </div>`,
  "/invoice": `<div class="seo-fallback">
    <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">Free Invoice Generator — Arabic &amp; English</h1>
    <p style="color:#444;font-size:1.05em">Create professional invoices with PDF export, 176+ currencies, ZATCA QR code for Saudi Arabia, and full Arabic RTL support. No signup required. Instant download.</p>
  </div>`,
  "/quotation": `<div class="seo-fallback">
    <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">Free Quotation Generator — Professional Business Quotes</h1>
    <p style="color:#444;font-size:1.05em">Create polished quotations with validity dates, terms, and bilingual Arabic-English support. Download as PDF instantly.</p>
  </div>`,
  "/receipt": `<div class="seo-fallback">
    <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">Free Receipt Generator — Instant Payment Receipts</h1>
    <p style="color:#444;font-size:1.05em">Issue professional payment receipts in seconds. Arabic and English support, PDF export, full business details.</p>
  </div>`,
  "/templates": `<div class="seo-fallback">
    <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">100+ Free Invoice &amp; Quotation Templates</h1>
    <p style="color:#444;font-size:1.05em">Choose from 100+ professional invoice, quotation, and receipt templates. Arabic RTL, bilingual, and English designs for every industry.</p>
  </div>`,
  "/pricing": `<div class="seo-fallback">
    <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">Pricing — Xuvilo</h1>
    <p style="color:#444;font-size:1.05em">Start for free. Upgrade for unlimited documents, premium templates, and advanced features. No credit card required.</p>
  </div>`,
  "/calculators": `<div class="seo-fallback">
    <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">14 Free Business Calculators</h1>
    <p style="color:#444;font-size:1.05em">VAT calculator, profit margin, currency exchange, discount, overtime, loan calculator and more. Free to use online.</p>
  </div>`,
  // Country pages (/invoice-generator-<slug>) are intentionally NOT listed
  // here. They are handled by slugToCountryHtml() below, which generates rich
  // SEO content for all 56 countries. Adding explicit STATIC_HTML keys for
  // them would override the dynamic generator and re-introduce thin content.
};

// Minimal country data for SSR (slug → display info)
const COUNTRY_SSR: Record<string, { name: string; currency: string; vat: string; zatca?: boolean; ar?: string }> = {
  "saudi-arabia":    { name: "Saudi Arabia",      currency: "SAR",  vat: "15% VAT (ZATCA)", zatca: true, ar: "المملكة العربية السعودية" },
  "uae":             { name: "UAE",                currency: "AED",  vat: "5% VAT (FTA)",    ar: "الإمارات العربية المتحدة" },
  "egypt":           { name: "Egypt",              currency: "EGP",  vat: "14% VAT",         ar: "مصر" },
  "libya":           { name: "Libya",              currency: "LYD",  vat: "No VAT",          ar: "ليبيا" },
  "jordan":          { name: "Jordan",             currency: "JOD",  vat: "16% GST",         ar: "الأردن" },
  "kuwait":          { name: "Kuwait",             currency: "KWD",  vat: "No VAT",          ar: "الكويت" },
  "qatar":           { name: "Qatar",              currency: "QAR",  vat: "No VAT",          ar: "قطر" },
  "bahrain":         { name: "Bahrain",            currency: "BHD",  vat: "10% VAT",         ar: "البحرين" },
  "oman":            { name: "Oman",               currency: "OMR",  vat: "5% VAT",          ar: "عُمان" },
  "iraq":            { name: "Iraq",               currency: "IQD",  vat: "No VAT",          ar: "العراق" },
  "syria":           { name: "Syria",              currency: "SYP",  vat: "11% VAT",         ar: "سوريا" },
  "lebanon":         { name: "Lebanon",            currency: "LBP",  vat: "11% VAT",         ar: "لبنان" },
  "morocco":         { name: "Morocco",            currency: "MAD",  vat: "20% TVA",         ar: "المغرب" },
  "algeria":         { name: "Algeria",            currency: "DZD",  vat: "19% TVA",         ar: "الجزائر" },
  "tunisia":         { name: "Tunisia",            currency: "TND",  vat: "19% TVA",         ar: "تونس" },
  "sudan":           { name: "Sudan",              currency: "SDG",  vat: "17% VAT",         ar: "السودان" },
  "yemen":           { name: "Yemen",              currency: "YER",  vat: "No VAT",          ar: "اليمن" },
  "palestine":       { name: "Palestine",          currency: "USD",  vat: "No VAT",          ar: "فلسطين" },
  "somalia":         { name: "Somalia",            currency: "SOS",  vat: "No VAT",          ar: "الصومال" },
  "mauritania":      { name: "Mauritania",         currency: "MRU",  vat: "16% TVA",         ar: "موريتانيا" },
  "djibouti":        { name: "Djibouti",           currency: "DJF",  vat: "10% TVA",         ar: "جيبوتي" },
  "comoros":         { name: "Comoros",            currency: "KMF",  vat: "10% TVA",         ar: "جزر القمر" },
  "nigeria":         { name: "Nigeria",            currency: "NGN",  vat: "7.5% VAT" },
  "ghana":           { name: "Ghana",              currency: "GHS",  vat: "15% VAT" },
  "kenya":           { name: "Kenya",              currency: "KES",  vat: "16% VAT" },
  "south-africa":    { name: "South Africa",       currency: "ZAR",  vat: "15% VAT" },
  "ethiopia":        { name: "Ethiopia",           currency: "ETB",  vat: "15% VAT" },
  "tanzania":        { name: "Tanzania",           currency: "TZS",  vat: "18% VAT" },
  "senegal":         { name: "Senegal",            currency: "XOF",  vat: "18% TVA" },
  "uganda":          { name: "Uganda",             currency: "UGX",  vat: "18% VAT" },
  "cameroon":        { name: "Cameroon",           currency: "XAF",  vat: "19.25% TVA" },
  "cote-divoire":    { name: "Côte d'Ivoire",      currency: "XOF",  vat: "18% TVA" },
  "zimbabwe":        { name: "Zimbabwe",           currency: "ZWL",  vat: "15% VAT" },
  "rwanda":          { name: "Rwanda",             currency: "RWF",  vat: "18% VAT" },
  "united-kingdom":  { name: "United Kingdom",     currency: "GBP",  vat: "20% VAT" },
  "usa":             { name: "United States",      currency: "USD",  vat: "No Federal VAT" },
  "canada":          { name: "Canada",             currency: "CAD",  vat: "5% GST" },
  "australia":       { name: "Australia",          currency: "AUD",  vat: "10% GST" },
  "germany":         { name: "Germany",            currency: "EUR",  vat: "19% MwSt" },
  "france":          { name: "France",             currency: "EUR",  vat: "20% TVA" },
  "india":           { name: "India",              currency: "INR",  vat: "18% GST" },
  "pakistan":        { name: "Pakistan",           currency: "PKR",  vat: "17% GST" },
  "turkey":          { name: "Turkey",             currency: "TRY",  vat: "20% KDV" },
  "malaysia":        { name: "Malaysia",           currency: "MYR",  vat: "8% SST" },
  "indonesia":       { name: "Indonesia",          currency: "IDR",  vat: "11% PPN" },
  "bangladesh":      { name: "Bangladesh",         currency: "BDT",  vat: "15% VAT" },
  "philippines":     { name: "Philippines",        currency: "PHP",  vat: "12% VAT" },
  "spain":           { name: "Spain",              currency: "EUR",  vat: "21% IVA" },
  "italy":           { name: "Italy",              currency: "EUR",  vat: "22% IVA" },
  "netherlands":     { name: "Netherlands",        currency: "EUR",  vat: "21% BTW" },
  "japan":           { name: "Japan",              currency: "JPY",  vat: "10% Consumption Tax" },
  "singapore":       { name: "Singapore",          currency: "SGD",  vat: "9% GST" },
  "brazil":          { name: "Brazil",             currency: "BRL",  vat: "17% ICMS" },
  "mexico":          { name: "Mexico",             currency: "MXN",  vat: "16% IVA" },
  "china":           { name: "China",              currency: "CNY",  vat: "13% VAT" },
  "sweden":          { name: "Sweden",             currency: "SEK",  vat: "25% Moms" },
  "switzerland":     { name: "Switzerland",        currency: "CHF",  vat: "8.1% MWST" },
};

function slugToCountryHtml(slug: string): string {
  const c = COUNTRY_SSR[slug];
  if (!c) return "";
  const zatcaBadge = c.zatca
    ? ' <span style="background:#d1fae5;color:#065f46;font-size:.75em;padding:2px 8px;border-radius:9999px;font-weight:700;vertical-align:middle">ZATCA Phase 1</span>'
    : "";
  const langs = c.ar ? "Arabic &amp; English" : "English";
  const arLine = c.ar
    ? `<p dir="rtl" lang="ar"><strong>مولد الفواتير المجاني لـ ${c.ar}</strong> — أنشئ فواتيرك الاحترافية بـ ${c.currency} باللغتين العربية والإنجليزية، مع تصدير PDF فوري وبدون تسجيل.</p>`
    : "";
  const zatcaSection = c.zatca
    ? `<h2>ZATCA Phase 1 compliance for ${c.name}</h2>
    <p>The Saudi Arabia invoice generator produces invoices that meet ZATCA Phase 1 ("Generation") requirements. Each invoice includes a Base64-encoded TLV QR code carrying the seller's name, VAT registration number, invoice timestamp, total with VAT and the VAT amount, alongside the standard fields the Zakat, Tax and Customs Authority requires: a unique sequential invoice number, the issue and supply dates, the seller's and buyer's tax registration numbers, an itemised line-by-line breakdown, the VAT rate (15%) and amount per line, and the grand total in SAR. Output is bilingual Arabic and English so it is acceptable to ZATCA, your customers and your accountant on the first try.</p>`
    : "";
  const taxLine = /^0%/i.test(c.vat) || /no\s*vat/i.test(c.vat)
    ? `<p>${c.name} does not currently apply VAT or sales tax to most goods and services, so Xuvilo defaults the tax rate to zero on the ${c.name} invoice. If a specific transaction requires a different rate (for example a regional or municipal levy), you can override the tax rate per line at any time.</p>`
    : `<p>${c.name} applies ${c.vat} on most invoiced goods and services, so Xuvilo defaults the tax rate to ${c.vat} on the ${c.name} invoice. You can override the rate per line, exclude exempt items, or add multiple tax components if your business requires it.</p>`;
  return `<div class="seo-fallback">
    <h1>Free Invoice Generator for ${c.name}${zatcaBadge}</h1>
    ${arLine}
    <p>Xuvilo's free invoice generator for ${c.name} is a browser-based tool that lets freelancers, traders, contractors and small businesses create a professional, compliant invoice in under sixty seconds. The ${c.name} invoice generator pre-loads the correct currency (${c.currency}) and the local tax rate (${c.vat}), supports both ${langs} with proper layout, runs entirely in your browser so your customer information stays on your device, and exports a clean A4 PDF you can email or print. There is nothing to install, no account is required for the core flow, and you can issue unlimited invoices for free.</p>
    <p><a href="/invoice?currency=${c.currency}">Create your free ${c.name} invoice now →</a></p>

    <h2>Why ${c.name} businesses choose Xuvilo</h2>
    <ul>
      <li><strong>Pre-configured for ${c.name}.</strong> ${c.currency} currency and ${c.vat} tax are loaded by default — no fiddling with locale settings before your first invoice.</li>
      <li><strong>${c.ar ? "Bilingual Arabic and English" : "Designed for international customers"}.</strong> ${c.ar ? "Switch the document language with one click; Arabic uses proper right-to-left layout, Arabic-friendly fonts and the right number formatting." : `Send invoices in English to ${c.name} customers and overseas clients alike, with clean professional formatting.`}</li>
      <li><strong>Truly free for the core flow.</strong> Issue unlimited invoices, quotations and receipts in ${c.currency} without entering a payment method or creating an account.</li>
      <li><strong>176+ currencies on demand.</strong> If you invoice in ${c.currency} domestically and another currency for foreign clients, switch currency on a per-invoice basis without losing your business profile.</li>
      <li><strong>Privacy-first.</strong> Documents are generated in your browser; we don't sell your data and we don't share it with advertisers beyond what's described in our <a href="/privacy">Privacy Policy</a>.</li>
    </ul>

    <h2>What's on every ${c.name} invoice</h2>
    <ul>
      <li>The word "Invoice"${c.ar ? ' or "فاتورة"' : ""} clearly displayed at the top.</li>
      <li>A unique, sequential invoice number that you control.</li>
      <li>The invoice date and (where relevant) the date of supply.</li>
      <li>Your business name, address, logo, and tax/VAT registration number.</li>
      <li>The customer's name, address and tax number where required.</li>
      <li>An itemised list of goods or services with quantity, unit price and line total.</li>
      <li>Per-line and overall tax (${c.vat}) with rate and amount, plus the grand total in ${c.currency}.</li>
      <li>Payment terms, accepted methods and the due date.</li>
      ${c.zatca ? "<li>The ZATCA Phase 1 QR code, required for Saudi Arabia.</li>" : ""}
    </ul>

    <h2>How to create a ${c.name} invoice in three steps</h2>
    <p><strong>Step 1.</strong> Open the <a href="/invoice?currency=${c.currency}">${c.name} invoice generator</a>. Currency and tax are pre-loaded for you. Fill in your business details and logo the first time — they are remembered for next time.</p>
    <p><strong>Step 2.</strong> Add your customer and your line items. Quantity, unit price and tax update the totals automatically. Switch language between ${langs} as needed; Xuvilo flips the layout to RTL or LTR for you.</p>
    <p><strong>Step 3.</strong> Click "Download PDF". Your ${c.name} invoice is generated as a print-ready A4 file in ${c.currency}, ready to email to the client or attach to your accounting system.</p>

    <h2>Tax in ${c.name}</h2>
    ${taxLine}
    ${zatcaSection}

    <h2>Beyond invoices — quotations and receipts for ${c.name}</h2>
    <p>Xuvilo isn't only an invoice generator. The same business profile powers a free <a href="/quotation">quotation generator</a> for sending price quotes before a deal is signed, a free <a href="/receipt">receipt generator</a> for confirming payments after they're made, and a <a href="/templates/invoice">100+ template library</a> for industry-specific designs. Most ${c.name} businesses go through quote → invoice → receipt for every project, and Xuvilo covers all three.</p>

    <h2>Frequently asked questions</h2>
    <p><strong>Is the ${c.name} invoice generator really free?</strong> Yes — issue unlimited invoices in ${c.currency} without an account or a payment method.</p>
    <p><strong>${c.ar ? "Does it support Arabic?" : "Does it support English-language invoices?"}</strong> ${c.ar ? "Yes — full right-to-left layout, Arabic-friendly fonts, Arabic numerals where appropriate, and a one-click language toggle." : `Yes — Xuvilo issues clean professional invoices in English for ${c.name} businesses and their international customers.`}</p>
    <p><strong>Can I change the currency?</strong> Yes — ${c.currency} is the default for ${c.name}, but you can switch to any of 176+ currencies on a per-invoice basis.</p>
    <p><strong>Can I add my logo?</strong> Yes — upload a logo and it appears on every ${c.name} invoice you generate.</p>
    ${c.zatca ? "<p><strong>Are the invoices ZATCA compliant?</strong> The Saudi Arabia generator is designed to meet ZATCA Phase 1 requirements, including the QR code, seller details, VAT registration number and itemised tax breakdown. Always confirm compliance with your accountant or a certified tax advisor.</p>" : ""}

    <p>Looking for a different country? See <a href="/countries">all 56 country invoice generators</a>, or jump straight to the popular ones: <a href="/invoice-generator-saudi-arabia">Saudi Arabia</a>, <a href="/invoice-generator-uae">UAE</a>, <a href="/invoice-generator-egypt">Egypt</a>, <a href="/invoice-generator-libya">Libya</a>, <a href="/invoice-generator-jordan">Jordan</a>, <a href="/invoice-generator-kuwait">Kuwait</a>.</p>
  </div>`;
}

function getStaticHtmlForPath(p: string): string {
  const clean = p.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (STATIC_HTML[clean]) return STATIC_HTML[clean];
  if (clean.startsWith("/templates/")) return STATIC_HTML["/templates"] || "";
  if (clean.startsWith("/calculators/")) return STATIC_HTML["/calculators"] || "";
  if (clean.startsWith("/invoice-generator-")) {
    const slug = clean.replace("/invoice-generator-", "");
    const html = slugToCountryHtml(slug);
    if (html) return html;
  }
  if (clean === "/countries") {
    return `<div class="seo-fallback">
      <h1 style="font-size:2em;font-weight:800;margin-bottom:16px">Invoice Generator by Country — 57 Countries</h1>
      <p style="color:#444;font-size:1.05em">Free invoice generators pre-configured for 57+ countries with local currency, tax rates, and compliance support. Arabic, English, and more.</p>
    </div>`;
  }
  return STATIC_HTML["/"] || "";
}

function getJsonLdForPath(p: string): object | object[] | null {
  const clean = p.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (clean === "/") {
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Xuvilo",
        url: SITE_URL,
        inLanguage: ["en", "ar"],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Xuvilo",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: "Free invoice, quotation and receipt generator for businesses worldwide with Arabic RTL support",
        inLanguage: ["en", "ar"],
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Xuvilo Business Hub",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: "Free invoice generator, quotation maker, receipt creator and business calculators for freelancers and SMEs worldwide.",
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Xuvilo",
        alternateName: "Xuvilo Business Hub",
        url: SITE_URL,
        logo: `${SITE_URL}/xuvilo-logo.png`,
        email: "support@xuvilo.com",
        sameAs: [] as string[],
      },
    ];
  }
  // FAQPage for country pages (/invoice-generator-<slug>) is emitted client-side
  // by CountryPage.tsx from the same visible FAQ data, so the structured data
  // matches the on-page text exactly. Emitting a second (generic) FAQPage here
  // would conflict with it, so SSR intentionally omits FAQPage for these paths.
  return null;
}

function getMetaForPath(p: string): PageMeta {
  const clean = p.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (PAGE_META[clean]) return PAGE_META[clean];
  if (clean.startsWith("/templates/")) {
    return {
      title: "Invoice Templates — Arabic & English | Xuvilo",
      description: "Professional invoice and quotation templates with Arabic RTL support.",
    };
  }
  if (clean.startsWith("/calculators/")) {
    return {
      title: "Business Calculator — Free Online Tool | Xuvilo",
      description: "Free business calculator for professionals.",
    };
  }
  if (clean === "/countries") {
    return {
      title: "Invoice Generator by Country — 57+ Countries | Xuvilo",
      description: "Free invoice generators for 57+ countries. Local currency, VAT rates, compliance. Arabic, English, and more. Instant PDF export.",
    };
  }
  if (clean.startsWith("/invoice-generator-")) {
    const slug = clean.replace("/invoice-generator-", "");
    const c = COUNTRY_SSR[slug];
    if (c) {
      return {
        title: `Free Invoice Generator for ${c.name} — ${c.currency} | Xuvilo`,
        description: `Create professional ${c.name} invoices with ${c.currency} currency and ${c.vat}. Arabic & English support, free PDF export. No sign-up required.`,
      };
    }
  }
  return PAGE_META["/"];
}

function seoMetaPlugin(): Plugin {
  return {
    name: "seo-meta-injection",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const typedCtx = ctx as { path?: string; originalUrl?: string };
        // In build mode originalUrl is undefined — skip body injection so the
        // built index.html stays clean for the Express production server to
        // inject the correct per-route content at request time.
        if (!typedCtx.originalUrl) return html;
        const rawPath = typedCtx.originalUrl || typedCtx.path || "/";
        const urlPath = rawPath.split("?")[0].replace(/\/index\.html$/, "") || "/";
        const meta = getMetaForPath(urlPath);
        const canonical = `${SITE_URL}${urlPath === "/" ? "" : urlPath}`;

        const staticContent = getStaticHtmlForPath(urlPath);
        const modifiedHtml = html
          .replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`)
          .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);

        const tags: HtmlTagDescriptor[] = [
          { tag: "meta", attrs: { name: "description", content: meta.description }, injectTo: "head" },
          { tag: "link", attrs: { rel: "canonical", href: canonical }, injectTo: "head" },
          { tag: "meta", attrs: { property: "og:title", content: meta.title }, injectTo: "head" },
          { tag: "meta", attrs: { property: "og:description", content: meta.description }, injectTo: "head" },
          { tag: "meta", attrs: { property: "og:type", content: "website" }, injectTo: "head" },
          { tag: "meta", attrs: { property: "og:url", content: canonical }, injectTo: "head" },
          { tag: "meta", attrs: { property: "og:image", content: OG_IMAGE }, injectTo: "head" },
          { tag: "meta", attrs: { property: "og:site_name", content: "Xuvilo" }, injectTo: "head" },
          { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" }, injectTo: "head" },
          { tag: "meta", attrs: { name: "twitter:title", content: meta.title }, injectTo: "head" },
          { tag: "meta", attrs: { name: "twitter:description", content: meta.description }, injectTo: "head" },
          { tag: "meta", attrs: { name: "twitter:image", content: OG_IMAGE }, injectTo: "head" },
          // The whole site serves Arabic and English from the same URL
          // (in-app language toggle; there is no /ar/ URL space), so every
          // hreflang alternate points at the canonical URL.
          { tag: "link", attrs: { rel: "alternate", hreflang: "en", href: canonical }, injectTo: "head" },
          { tag: "link", attrs: { rel: "alternate", hreflang: "ar", href: canonical }, injectTo: "head" },
          { tag: "link", attrs: { rel: "alternate", hreflang: "x-default", href: canonical }, injectTo: "head" },
        ];

        const jsonLd = getJsonLdForPath(urlPath);
        if (jsonLd) {
          tags.push({ tag: "script", attrs: { type: "application/ld+json" }, children: JSON.stringify(jsonLd), injectTo: "head" });
        }

        return { html: modifiedHtml, tags };
      },
    },
  };
}

function sitemapDevPlugin(): Plugin {
  // Static routes matching production server.ts exactly — keep both in sync.
  const STATIC_ROUTES = [
    "/", "/invoice", "/quotation", "/receipt",
    // /templates 301s to /templates/invoice — omit the hub URL from the sitemap.
    "/templates/invoice", "/templates/quotation", "/templates/receipt",
    // Regional / language SEO landing pages
    "/arabic-invoice-generator",
    "/zatca-invoice-saudi",
    "/quotation-generator-arabic",
    "/oil-gas-invoice-arabic",
    "/ngo-invoice-template",
    "/فاتورة-ضريبية",
    // Calculators hub
    "/calculators",
    // Author / E-E-A-T
    "/author/xuvilo-team",
    // Free public tools
    "/tools/stamp-maker", "/tools/tracker", "/tools/temp-email",
    "/tools/business-card", "/tools/company-profile",
    "/ai-writer",
    "/blog",
    "/countries", "/pricing",
    "/about", "/contact", "/how-it-works", "/faq",
    "/privacy", "/terms", "/disclaimer", "/editorial-policy",
    "/invoice-guide", "/quotation-guide", "/receipt-guide",
    "/business-calculators-guide",
  ];

  // Mirrors CALCULATOR_SEO_PAGES slugs in server.ts so the dev sitemap matches
  // the production (server.ts) sitemap exactly. Keep both lists in sync.
  const CALCULATOR_SEO_SLUGS = [
    "vat-calculator", "profit-margin-calculator", "currency-converter",
    "discount-calculator", "loan-calculator", "overtime-calculator",
    "break-even-calculator", "markup-calculator", "invoice-calculator",
    "tax-calculator", "salary-calculator", "tip-calculator",
    "percentage-calculator", "compound-interest-calculator",
  ];

  // The 14 live calculator tool URLs — mirrors CALC_TOOL_SLUGS in server.ts.
  // These are real public pages whitelisted by isKnownPath() but were previously
  // absent from the sitemap. Keep in sync with server.ts CALC_TOOL_SLUGS.
  const CALC_TOOL_SLUGS_ARRAY = [
    "profit-margin", "discount", "vat-tax", "currency-exchange",
    "shipping-cbm", "overtime", "leave-balance", "import-cost",
    "break-even", "markup-margin", "loan", "invoice-aging",
    "salary-cost", "freight-cbw",
  ];

  // Build AR↔EN sibling map for hreflang — mirrors BLOG_SIBLING_SLUG in server.ts.
  // Computed once at plugin init so buildSitemap() is fast.
  const DEV_ARABIC_RE = /[\u0600-\u06FF]/;
  const devBySlug = new Map(blogPosts.map((p) => [p.slug, p]));
  const DEV_SIBLING_SLUG = new Map<string, string>();
  for (const post of blogPosts) {
    const postIsAr = DEV_ARABIC_RE.test(post.slug);
    for (const rel of post.relatedSlugs) {
      const sib = devBySlug.get(rel);
      if (!sib) continue;
      if (DEV_ARABIC_RE.test(sib.slug) !== postIsAr) {
        DEV_SIBLING_SLUG.set(post.slug, sib.slug);
        break;
      }
    }
  }

  function buildSitemap(): string {
    // Fixed content-review date so lastmod is stable between server restarts.
    const sitemapLastmod = "2026-07-17";
    const encLoc = (r: string): string =>
      r.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c));
    const routePriority = (r: string): string => {
      if (r === "/") return "1.0";
      if (["/invoice", "/quotation", "/receipt"].includes(r) || r.startsWith("/templates")) return "0.9";
      if (["/privacy", "/terms", "/disclaimer"].includes(r)) return "0.5";
      if (r.startsWith("/tools/") || ["/invoice-guide", "/quotation-guide", "/receipt-guide", "/business-calculators-guide", "/how-it-works", "/author/xuvilo-team"].includes(r)) return "0.7";
      return "0.8";
    };
    const routeChangefreq = (r: string): string => {
      if (r === "/") return "daily";
      if (["/invoice", "/quotation", "/receipt", "/templates", "/templates/invoice", "/templates/quotation", "/templates/receipt"].includes(r)) return "weekly";
      if (["/privacy", "/terms", "/disclaimer"].includes(r)) return "yearly";
      return "monthly";
    };
    const countryRoutes = Object.keys(COUNTRY_SSR).map(
      (slug) => `/invoice-generator-${slug}`
    );
    const calculatorSeoRoutes = CALCULATOR_SEO_SLUGS.map(
      (slug) => `/calculators/${slug}`
    );
    const calcToolRoutes = CALC_TOOL_SLUGS_ARRAY.map(
      (slug) => `/calculators/${slug}`
    );
    const staticXml = STATIC_ROUTES.map(
      (route) => `  <url>
    <loc>${SITE_URL}${encLoc(route)}</loc>
    <changefreq>${routeChangefreq(route)}</changefreq>
    <priority>${routePriority(route)}</priority>
    <lastmod>${sitemapLastmod}</lastmod>
  </url>`
    ).join("\n");
    const countryXml = countryRoutes.map(
      (route) => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${sitemapLastmod}</lastmod>
  </url>`
    ).join("\n");
    const calcXml = calculatorSeoRoutes.map(
      (route) => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${sitemapLastmod}</lastmod>
  </url>`
    ).join("\n");
    const calcToolXml = calcToolRoutes.map(
      (route) => `  <url>
    <loc>${SITE_URL}${route}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${sitemapLastmod}</lastmod>
  </url>`
    ).join("\n");

    const blog = blogPosts
      .map((post) => {
        const url = `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`;
        const lastmod = post.date || sitemapLastmod;
        const sibSlug = DEV_SIBLING_SLUG.get(post.slug);
        let hreflang: string;
        if (sibSlug) {
          const sibIsAr = DEV_ARABIC_RE.test(sibSlug);
          const arSlug = sibIsAr ? sibSlug : post.slug;
          const enSlug = sibIsAr ? post.slug : sibSlug;
          const arUrl = `${SITE_URL}/blog/${encodeURIComponent(arSlug)}`;
          const enUrl = `${SITE_URL}/blog/${encodeURIComponent(enSlug)}`;
          hreflang =
            `    <xhtml:link rel="alternate" hreflang="ar" href="${arUrl}" />\n` +
            `    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />\n` +
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />`;
        } else if (DEV_ARABIC_RE.test(post.slug)) {
          hreflang =
            `    <xhtml:link rel="alternate" hreflang="ar" href="${url}" />\n` +
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${url}" />`;
        } else {
          hreflang =
            `    <xhtml:link rel="alternate" hreflang="en" href="${url}" />\n` +
            `    <xhtml:link rel="alternate" hreflang="x-default" href="${url}" />`;
        }
        return `  <url>
    <loc>${url}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${lastmod}</lastmod>
${hreflang}
  </url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${staticXml}\n${countryXml}\n${calcXml}\n${calcToolXml}\n${blog}\n</urlset>`;
  }

  const PERMANENT_REDIRECTS: Record<string, string> = {
    "/privacy-policy":   "/privacy",
    "/terms-of-use":     "/terms",
    "/home":             "/",
    "/index":            "/",
    "/index.html":       "/",
    "/stamp-maker":      "/tools/stamp-maker",
    "/temp-email":       "/tools/temp-email",
    "/business-card":    "/tools/business-card",
    "/company-profile":  "/tools/company-profile",
    "/tracker":          "/tools/tracker",
    "/document-tracker": "/tools/tracker",
    "/invoice-tracker":  "/tools/tracker",
    "/calculator":       "/calculators",
  // /templates is not a real hub page — matches the server.ts 301.
    "/templates":        "/templates/invoice",
  };

  return {
    name: "sitemap-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const fullUrl = req.url || "";
        const qIdx = fullUrl.indexOf("?");
        const url = qIdx >= 0 ? fullUrl.slice(0, qIdx) : fullUrl;
        const search = qIdx >= 0 ? fullUrl.slice(qIdx) : "";

        let lookup = url;
        if (lookup.length > 1 && lookup.endsWith("/")) lookup = lookup.slice(0, -1);
        const target = PERMANENT_REDIRECTS[lookup];
        if (target) {
          res.statusCode = 301;
          res.setHeader("Location", `${target}${search}`);
          res.end();
          return;
        }

        if (url === "/sitemap.xml") {
          res.setHeader("Content-Type", "application/xml");
          res.end(buildSitemap());
          return;
        }
        if (url === "/robots.txt") {
          res.setHeader("Content-Type", "text/plain");
          res.end(`User-agent: *\nAllow: /\n\nDisallow: /dashboard\nDisallow: /settings\nDisallow: /clients\nDisallow: /account\nDisallow: /billing\nDisallow: /documents\nDisallow: /login\nDisallow: /signup\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    sitemapDevPlugin(),
    seoMetaPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Split large, stable dependencies into their own cacheable chunks so
        // the browser can download them in parallel with the app shell and
        // cache them independently between deploys.
        manualChunks(id) {
          // React core + scheduler — change only on React upgrades.
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-is/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
          // i18n translation dictionaries — separate chunk so both locales
          // are downloaded in parallel with the app shell (and cached
          // independently from app-code changes).
          if (id.includes("/src/i18n/")) {
            return "i18n";
          }
          // @tanstack/react-query + react-helmet — stable shared libs.
          if (
            id.includes("/node_modules/@tanstack/") ||
            id.includes("/node_modules/react-helmet-async/") ||
            id.includes("/node_modules/helmet/")
          ) {
            return "query-vendor";
          }
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api-proxy": {
        target: "http://localhost:8080",
        rewrite: (path) => path.replace(/^\/api-proxy/, ""),
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
