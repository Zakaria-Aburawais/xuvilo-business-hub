import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { ArrowRight, CheckCircle, FileText } from "lucide-react";

const FAQS = [
  {
    q: "What is the VAT rate in Jordan?",
    a: "Jordan's General Sales Tax (GST) is the equivalent of VAT, set at 16% for most goods and services. Some essential goods may have reduced rates (4% or 0%). Always verify current rates with the Income and Sales Tax Department of Jordan.",
  },
  {
    q: "What currency is used for Jordanian invoices?",
    a: "The Jordanian Dinar (JOD) is the official currency of Jordan. Xuvilo defaults to JOD for this landing page, though you can switch to any of the 176+ supported currencies.",
  },
  {
    q: "What is required on a Jordanian tax invoice?",
    a: "A valid Jordanian tax invoice must include: seller name and Tax Identification Number (TIN), buyer details, invoice number and date, itemized list of goods/services, applicable tax rates, GST amount, and total amount including tax.",
  },
  {
    q: "Does Jordan require electronic invoicing?",
    a: "Jordan launched its e-invoicing system (Integrated Invoice System) in phases starting 2024. The system is being rolled out to large businesses first. Xuvilo generates professional invoices compatible with Jordan's invoicing requirements.",
  },
  {
    q: "Can I create Arabic invoices for Jordanian clients?",
    a: "Yes. Xuvilo supports full Arabic RTL invoices for Jordanian businesses. Arabic is the official language of Jordan, and all 40+ invoice templates support Arabic typography and right-to-left layout.",
  },
];

export default function CountryJordan() {
  const seo = PAGE_SEO["/invoice-generator-jordan"];
  return (
    <AppLayout>
      <SEOHead {...seo} path="/invoice-generator-jordan"
        structuredData={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🇯🇴</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            Free Invoice Generator for Jordan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Create professional Jordanian invoices with JOD currency, 16% GST calculation, Arabic RTL support, and instant PDF export. No account needed — completely free.
          </p>
          <Link href="/invoice">
            <button className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-black to-gray-700 hover:opacity-90 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2">
              Create Jordan Invoice Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          {[
            { label: "Currency", value: "JOD — Jordanian Dinar" },
            { label: "GST / Tax Rate", value: "16% (Standard)" },
            { label: "Languages", value: "Arabic & English" },
            { label: "Export", value: "Free PDF" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{value}</div>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Invoicing in Jordan — What You Need to Know</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Jordan uses a General Sales Tax (GST) system, similar to VAT in other countries. The standard rate is 16%, administered by the Income and Sales Tax Department (ISTD). Businesses must register for GST when annual sales exceed a specified threshold and issue proper tax invoices for all taxable supplies.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            With Xuvilo, you can create complete Jordanian invoices with all required fields. The Jordanian Dinar (JOD) is pre-selected as the currency, and you can set the GST rate to 16% on your line items.
          </p>
          <ul className="space-y-2">
            {[
              "JOD — Jordanian Dinar as default currency",
              "Automatic 16% GST calculation",
              "Arabic RTL invoices with proper typography",
              "Bilingual Arabic-English invoice templates",
              "Tax Registration Number field in business info",
              "Free PDF export — no watermarks",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-gray-700 dark:text-gray-400 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How to Create a Jordanian Invoice with Xuvilo</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Open the Invoice Generator", desc: "Click the Create button above. The currency will be set to JOD — Jordanian Dinar by default." },
              { step: "2", title: "Add your business details", desc: "Enter your business name, address, and Tax Identification Number (TIN) in the Business Information section." },
              { step: "3", title: "Add line items with 16% GST", desc: "Add your products or services. Set the Tax % field to 16 for standard-rated supplies in Jordan." },
              { step: "4", title: "Review and customize", desc: "Use the live preview to check all details. Select from 40+ professional templates including Arabic-first layouts." },
              { step: "5", title: "Download as PDF", desc: "Click Generate & Download Invoice to export a professional A4 PDF invoice ready to send to your Jordanian clients." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm flex items-center justify-center shrink-0">{step}</div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">{title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-10 p-8 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Start Invoicing in Jordan</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">JOD · 16% GST · Arabic RTL · Free PDF</p>
          <Link href="/invoice">
            <button className="px-8 py-3.5 font-bold bg-gradient-to-r from-gray-800 to-black text-white rounded-full shadow-lg transition-all flex items-center gap-2 mx-auto hover:opacity-90">
              <FileText className="w-5 h-5" />
              Create Jordan Invoice Free
            </button>
          </Link>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">FAQ — Jordanian Invoicing</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex justify-between items-center gap-4">
                  {q}
                  <span className="text-gray-600 group-open:rotate-45 transition-transform text-xl shrink-0">+</span>
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
