import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { CONTENT_LAST_REVIEWED } from "@/lib/seo-config";
import type { CountryData } from "@/data/countries";

interface Props {
  country: CountryData;
}

const GENERIC_FAQS = [
  { q: "Is Xuvilo free?", a: "Yes, core features are completely free with no sign-up required. Create unlimited invoices, quotations, and receipts at no cost." },
  { q: "Can I export to PDF?", a: "Yes, all documents export instantly as professional A4 PDFs ready to print or share by email." },
  { q: "Does it support Arabic and English?", a: "Yes. Xuvilo is fully bilingual with Arabic RTL and English LTR layout switching. All document fields support both languages." },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-5 py-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors font-medium text-gray-900 dark:text-gray-100"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="text-xl leading-none ml-4 flex-shrink-0 text-blue-600">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-5 py-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-white dark:bg-gray-900">
          {a}
        </div>
      )}
    </div>
  );
}

export default function CountryPage({ country }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const h1 = isAr && country.h1Ar ? country.h1Ar : country.h1En;
  const vatLabel = country.vatRate > 0
    ? `${country.vatRate}% ${country.vatName}`
    : country.vatName;

  const invoiceUrl = `/invoice?currency=${country.currency}&vatRate=${country.vatRate}&zatca=${country.zatcaCompliant ? "1" : "0"}`;

  const allFaqs = [...country.faqItems, ...GENERIC_FAQS];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <AppLayout>
      <SEOHead
        title={`${country.h1En} — Free PDF | Xuvilo — AI Business Tools Hub`}
        description={country.metaDescription}
        path={`/invoice-generator-${country.slug}`}
        structuredData={jsonLd}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{country.flag}</span>
            {country.zatcaCompliant && (
              <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
                ZATCA Phase 1 Compliant
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            {h1}
          </h1>
          {isAr && country.h1Ar && (
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-4 font-medium" dir="rtl">{country.h1Ar}</p>
          )}
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-2 font-medium">
            Free &bull; {country.currency} — {country.currencySymbol} &bull; {vatLabel} &bull; PDF Export &bull; Arabic &amp; English
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-3 max-w-2xl">
            {country.metaDescription}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
            {isAr
              ? `فريق التحرير في Xuvilo · آخر مراجعة: ${CONTENT_LAST_REVIEWED.ar}`
              : `By the Xuvilo Editorial Team · Last reviewed: ${CONTENT_LAST_REVIEWED.en}`}
          </p>
          <Link
            href={invoiceUrl}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors"
          >
            Create Free {country.nameEn} Invoice →
          </Link>
        </div>
      </section>

      {/* Quick facts */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "DEFAULT CURRENCY", value: `${country.currency} — ${country.currencySymbol}` },
            { label: country.vatName !== "No VAT" && country.vatName !== "No Federal VAT" ? country.vatName : "TAX SYSTEM", value: country.vatRate > 0 ? `${country.vatRate}%` : "No VAT" },
            { label: "COMPLIANCE", value: country.zatcaCompliant ? "ZATCA Phase 1" : "Standard" },
            { label: "LANGUAGES", value: country.nameAr ? "Arabic & English" : "English" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto px-4 py-8 space-y-10 prose dark:prose-invert max-w-none">

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Invoicing in {country.nameEn}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Creating professional invoices in {country.nameEn} requires using the correct local currency ({country.currency}),
            applying the right tax rate{country.vatRate > 0 ? ` (${country.vatRate}% ${country.vatName})` : ""}, and ensuring your documents
            meet both local business norms and any legal requirements. Xuvilo makes this easy — choose {country.nameEn}
            as your market and the tool automatically configures the correct defaults so you can focus on your business.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            Whether you are a freelancer, consultant, small business, or growing SME in {country.nameEn}, professional invoices
            build trust with your clients and help you get paid faster. A well-formatted invoice includes your business name,
            contact details, client information, itemized services or products, tax calculations, and clear payment terms.
            Xuvilo handles all of this in a clean, modern A4 layout.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {country.nameEn} Tax &amp; VAT Guide
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {country.complianceNote}
            {country.vatRate > 0 ? (
              ` In ${country.nameEn}, the standard ${country.vatName} rate is ${country.vatRate}%. This is automatically
              applied to your invoice line items when you select ${country.currency} as your currency.
              You can adjust the tax rate per line item if you have products or services that attract a different rate,
              such as zero-rated goods or reduced-rate categories.`
            ) : (
              ` Without a VAT or sales tax requirement, businesses in ${country.nameEn} can issue simple, clean invoices
              without tax fields — or add custom tax lines if needed for specific transactions.`
            )}
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            Always consult a qualified accountant or tax advisor in {country.nameEn} to ensure your invoices meet the latest
            legal requirements. Tax laws change, and compliance protects your business from penalties and disputes.
            Xuvilo gives you the structural tools — your tax professional provides the legal guidance.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            How to Use Xuvilo in {country.nameEn}
          </h2>
          <ol className="space-y-3 text-gray-600 dark:text-gray-300">
            {[
              `Click "Create Free ${country.nameEn} Invoice →" above — the tool opens with ${country.currency} pre-selected.`,
              "Enter your business name, address, VAT/tax number, and optional logo in the Business Information section.",
              "Add your client's name and contact details in the Client Information section.",
              `Add your line items — services, products, or expenses. The ${country.vatRate > 0 ? `${country.vatRate}% ${country.vatName}` : "tax"} rate is ${country.vatRate > 0 ? "pre-filled" : "optional"}.`,
              "Set the invoice date and payment due date. Add optional payment terms or notes.",
              "Preview your invoice live on the right side. Switch between Arabic and English at any time.",
              'Click "Download PDF" to get your professional A4 invoice instantly — no sign-up required.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Why {country.nameEn} Businesses Choose Xuvilo
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: "Correct local currency", desc: `${country.currency} (${country.currencySymbol}) is pre-configured with proper formatting and placement.` },
              { title: country.vatRate > 0 ? "Auto tax calculation" : "Flexible tax options", desc: country.vatRate > 0 ? `${country.vatRate}% ${country.vatName} is automatically calculated on all line items.` : "No mandatory tax fields — keep invoices clean or add custom tax lines." },
              { title: "Arabic & English support", desc: "Instant language switch with full RTL layout support for Arabic-speaking clients and markets." },
              { title: "Professional PDF in seconds", desc: "A4 PDFs with your logo, brand colors, and all required fields — downloaded instantly, no account needed." },
              { title: "176+ currencies", desc: "Bill international clients in any currency while keeping your base in " + country.currency + "." },
              { title: "320+ templates", desc: "Choose from classic, modern, minimal, and industry-specific invoice designs." },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-emerald-500 font-bold text-lg flex-shrink-0">✓</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{title}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* FAQ */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Frequently Asked Questions — {country.nameEn}
        </h2>
        <div className="space-y-2">
          {allFaqs.map(({ q, a }, i) => (
            <AccordionItem key={i} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-blue-600 dark:bg-blue-800">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Start creating free invoices for {country.nameEn}
          </h2>
          <p className="text-blue-100 mb-6 text-lg">
            No sign-up · No credit card · Instant PDF download
          </p>
          <Link
            href={invoiceUrl}
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors"
          >
            {country.flag} Create Free {country.nameEn} Invoice →
          </Link>
          <div className="mt-6 flex justify-center gap-6 text-sm text-blue-200">
            <span>✓ Free forever</span>
            <span>✓ {country.currency} currency</span>
            {country.vatRate > 0 && <span>✓ {country.vatRate}% {country.vatName}</span>}
            <span>✓ PDF export</span>
          </div>
        </div>
      </section>

      {/* Internal links to nearby countries */}
    </AppLayout>
  );
}
