import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { ArrowRight, CheckCircle, Shield, FileText } from "lucide-react";

const FAQS = [
  {
    q: "Is ZATCA Phase 1 e-invoicing mandatory in Saudi Arabia?",
    a: "Yes. Since December 4, 2021, all VAT-registered businesses in Saudi Arabia are required to issue electronic invoices compliant with ZATCA Phase 1 regulations. The invoice must contain a QR code encoded with your seller name, VAT registration number, invoice date, total amount, and VAT amount.",
  },
  {
    q: "What is the VAT rate in Saudi Arabia?",
    a: "The standard VAT rate in Saudi Arabia is 15%, effective from July 1, 2020. Some goods and services may be zero-rated or exempt. Always verify with ZATCA's official guidelines for specific exemptions.",
  },
  {
    q: "What is a VAT Registration Number (VRN) in Saudi Arabia?",
    a: "A VAT Registration Number (VRN) in Saudi Arabia is a 15-digit number starting with '3', issued by ZATCA to VAT-registered businesses. It must appear on all tax invoices. Example format: 3XXXXXXXXXXXXXX.",
  },
  {
    q: "Does the Xuvilo invoice generator support ZATCA Phase 2?",
    a: "Currently, Xuvilo fully supports ZATCA Phase 1 requirements including TLV-encoded QR codes. Phase 2 (integration with ZATCA's Fatoora portal) is planned for a future update.",
  },
  {
    q: "Can I create Arabic invoices for Saudi Arabia?",
    a: "Yes. Xuvilo fully supports Arabic RTL invoices with proper Arabic typography. You can toggle between English, Arabic, and bilingual invoice templates. All 40+ invoice templates support Arabic.",
  },
];

export default function CountrySAR() {
  const seo = PAGE_SEO["/invoice-generator-saudi-arabia"];

  return (
    <AppLayout>
      <SEOHead
        {...seo}
        path="/invoice-generator-saudi-arabia"
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
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🇸🇦</span>
            <span className="px-3 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-700">
              ZATCA Phase 1 Compliant
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            Free Invoice Generator for Saudi Arabia
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Create ZATCA-compliant invoices for your Saudi Arabian business — with automatic QR code generation, 15% VAT calculation, and full Arabic RTL support. No signup required.
          </p>
          <Link href="/invoice">
            <button className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
              Create Saudi Invoice Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          {[
            { label: "Default Currency", value: "SAR — Saudi Riyal" },
            { label: "VAT Rate", value: "15% (Standard)" },
            { label: "Compliance", value: "ZATCA Phase 1" },
            { label: "Languages", value: "Arabic & English" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{value}</div>
            </div>
          ))}
        </div>

        {/* Section 1: What is ZATCA */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            What is a ZATCA Compliant Invoice?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            ZATCA (Zakat, Tax and Customs Authority) is Saudi Arabia's authority responsible for e-invoicing regulations. Under Phase 1 of the e-invoicing mandate (effective December 4, 2021), every VAT-registered business in Saudi Arabia must issue electronic invoices (Fatoora) that contain a QR code with specific TLV-encoded data.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            A ZATCA Phase 1 compliant invoice must include:
          </p>
          <ul className="space-y-2 mb-4">
            {[
              "Seller's name (as registered with ZATCA)",
              "VAT Registration Number (15 digits, starting with 3)",
              "Invoice date and time in ISO 8601 format",
              "Total invoice amount including VAT",
              "VAT amount (calculated at 15%)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            All five fields are encoded in TLV (Tag-Length-Value) format and Base64-encoded into a scannable QR code that appears at the bottom of every invoice. Xuvilo automatically generates this QR code when you enable ZATCA mode.
          </p>
        </section>

        {/* Section 2: Saudi VAT */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Saudi Arabia VAT (15%) Explained
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Saudi Arabia introduced VAT (Value Added Tax) on January 1, 2018, at 5%. On July 1, 2020, the rate was increased to 15% to support the government's fiscal policies. As of today, the standard VAT rate in Saudi Arabia remains 15%.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            When creating an invoice for a Saudi client or business, you should:
          </p>
          <ul className="space-y-2 mb-4">
            {[
              "Set the line item tax percentage to 15% for standard-rated supplies",
              "Include your VAT Registration Number (VRN) on the invoice",
              "Display the VAT amount separately from the subtotal",
              "Show the grand total including VAT",
              "Add the ZATCA QR code at the bottom-left of the invoice",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Xuvilo automatically calculates VAT when you enter a tax percentage per line item. The subtotal, VAT amount, and grand total are all clearly displayed in both the form and the live invoice preview.
          </p>
        </section>

        {/* Section 3: How to use */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            How to Add Your VAT Registration Number
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Open the Invoice Generator", desc: 'Click "Create Saudi Invoice Free" above or navigate to the Invoice Generator. The currency will default to SAR — Saudi Riyal.' },
              { step: "2", title: "Fill in Business Information", desc: "Enter your business name, address, and VAT Registration Number in the Business Information section. Your VRN is a 15-digit number starting with 3, issued by ZATCA." },
              { step: "3", title: "Enable ZATCA Compliance Mode", desc: 'Scroll to the bottom of the form and toggle "ZATCA Compliant Invoice" to ON. Enter your VAT Registration Number if not already filled. A QR code will be generated immediately.' },
              { step: "4", title: "Add Line Items with 15% VAT", desc: "Add your products or services as line items. Set the Tax % field to 15 for each standard-rated item. The VAT amount is calculated automatically." },
              { step: "5", title: "Download Your Invoice PDF", desc: 'Click "Generate & Download Invoice" to export your ZATCA-compliant invoice as a professional A4 PDF. The QR code appears at the bottom-left corner.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">{title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mb-10 p-8 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
          <Shield className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ready to Create Your ZATCA Invoice?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Free to use. No account required. SAR currency. 15% VAT. ZATCA QR code. Arabic RTL.
          </p>
          <Link href="/invoice">
            <button className="px-8 py-3.5 font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto">
              <FileText className="w-5 h-5" />
              Create Saudi Invoice Free
            </button>
          </Link>
        </div>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Frequently Asked Questions — Saudi Arabia Invoicing
          </h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex justify-between items-center gap-4">
                  {q}
                  <span className="text-emerald-600 group-open:rotate-45 transition-transform text-xl shrink-0">+</span>
                </summary>
                <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Back link */}
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
          <Link href="/invoice" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Invoice Generator
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
