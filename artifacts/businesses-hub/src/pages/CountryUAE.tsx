import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { ArrowRight, CheckCircle, FileText } from "lucide-react";

const FAQS = [
  {
    q: "What is the VAT rate in the UAE?",
    a: "The UAE introduced VAT (Value Added Tax) on January 1, 2018, at a rate of 5%. This applies to most goods and services. Some supplies are zero-rated (e.g., exports, international transport) or exempt (e.g., residential properties, financial services).",
  },
  {
    q: "What is a TRN number in the UAE?",
    a: "A TRN (Tax Registration Number) is a 15-digit number issued by the Federal Tax Authority (FTA) to VAT-registered businesses in the UAE. It must appear on all tax invoices. The TRN allows buyers to claim input VAT. Format: 100XXXXXXXXX00003.",
  },
  {
    q: "Is an invoice required for all transactions in the UAE?",
    a: "For VAT-registered businesses, a tax invoice is required for all standard-rated and zero-rated supplies above AED 10,000. For supplies below this threshold or to non-registered recipients, a simplified tax invoice may be used.",
  },
  {
    q: "What must a UAE FTA-compliant invoice include?",
    a: 'A UAE FTA-compliant tax invoice must include: the words "Tax Invoice" in Arabic or English, seller\'s name and TRN, buyer\'s name and TRN (if registered), invoice date, description of goods/services, quantity, unit price, discount, taxable amount per tax rate, VAT amount, and total amount payable.',
  },
  {
    q: "Can I create Arabic invoices for UAE clients?",
    a: "Yes. Xuvilo fully supports Arabic RTL invoices. You can create bilingual Arabic-English invoices, Arabic-only invoices, or English-only invoices. All 40+ invoice templates support Arabic typography and RTL layout.",
  },
];

export default function CountryUAE() {
  const seo = PAGE_SEO["/invoice-generator-uae"];

  return (
    <AppLayout>
      <SEOHead
        {...seo}
        path="/invoice-generator-uae"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🇦🇪</span>
            <span className="px-3 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">
              UAE VAT Compliant
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            Free Invoice Generator for UAE
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Create FTA-compliant UAE invoices with AED currency, 5% VAT calculation, TRN number support, and full Arabic RTL layout. Free PDF export — no account needed.
          </p>
          <Link href="/invoice">
            <button className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
              Create UAE Invoice Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          {[
            { label: "Default Currency", value: "AED — UAE Dirham" },
            { label: "VAT Rate", value: "5% (Standard)" },
            { label: "Compliance", value: "FTA Compliant" },
            { label: "Languages", value: "Arabic & English" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{value}</div>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">UAE VAT (5%) Guide for Invoices</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            The United Arab Emirates introduced Value Added Tax (VAT) on January 1, 2018, at a rate of 5%. Administered by the Federal Tax Authority (FTA), UAE VAT applies to most commercial goods and services. Businesses with annual taxable supplies exceeding AED 375,000 must register for VAT.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            When invoicing in the UAE, set your line item tax rate to 5% for standard-rated supplies. Xuvilo automatically calculates the VAT amount, shows it separately on the invoice, and displays the total amount inclusive of VAT.
          </p>
          <ul className="space-y-2">
            {[
              "VAT Registration is mandatory for businesses with taxable supplies > AED 375,000/year",
              "Voluntary registration is available for businesses above AED 187,500",
              "Tax invoices must be issued within 14 days of the supply",
              "Retain invoice records for at least 5 years",
              "International exports are zero-rated (0% VAT)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">TRN (Tax Registration Number) Explained</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            A TRN (Tax Registration Number) is issued by the UAE Federal Tax Authority (FTA) to VAT-registered businesses. It is a 15-digit number (e.g., 100XXXXXXXXX00003) that must appear on all tax invoices issued to VAT-registered customers.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            To include your TRN in a Xuvilo invoice, enter it in the "VAT / Tax Number" field in the Business Information section. It will automatically appear on the invoice and in the PDF export.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            If your customer is also VAT-registered, include their TRN in the Client Information section. This allows them to reclaim input VAT. For retail transactions (B2C), the customer's TRN is not required.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How to Create a FTA-Compliant UAE Invoice</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Select AED as your currency", desc: "Open the Invoice Generator. Select 'AED — UAE Dirham' from the currency dropdown. A banner will appear confirming the standard 5% UAE VAT rate." },
              { step: "2", title: "Enter your TRN in Business Information", desc: "In the Business Information section, enter your 15-digit Tax Registration Number in the VAT / Tax Number field. This will appear on the invoice automatically." },
              { step: "3", title: "Set tax rate to 5% on line items", desc: "For each line item, set the Tax % to 5 for standard-rated supplies. Zero-rated supplies (exports, international services) should have Tax % = 0." },
              { step: "4", title: "Review VAT calculation in real time", desc: "The live preview shows your subtotal, VAT amount, and grand total. Verify all amounts before downloading." },
              { step: "5", title: "Download the PDF invoice", desc: "Click 'Generate & Download Invoice' to export a professional A4 PDF. The invoice includes all FTA-required fields." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">{step}</div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">{title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-10 p-8 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Your UAE Invoice Now</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">AED currency · 5% VAT · TRN support · Arabic RTL · Free PDF</p>
          <Link href="/invoice">
            <button className="px-8 py-3.5 font-bold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full shadow-lg transition-all flex items-center gap-2 mx-auto">
              <FileText className="w-5 h-5" />
              Create UAE Invoice Free
            </button>
          </Link>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions — UAE Invoicing</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex justify-between items-center gap-4">
                  {q}
                  <span className="text-blue-600 group-open:rotate-45 transition-transform text-xl shrink-0">+</span>
                </summary>
                <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Link href="/invoice" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Invoice Generator
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
