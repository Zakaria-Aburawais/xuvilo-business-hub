import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { ArrowRight, CheckCircle, FileText } from "lucide-react";

const FAQS = [
  {
    q: "Does Kuwait have VAT?",
    a: "As of 2024, Kuwait has not yet implemented VAT. Kuwait is the only GCC country that has not yet introduced VAT. The government has discussed implementing a 5% VAT rate in alignment with GCC VAT agreements, but no implementation date has been confirmed. For invoices to Kuwaiti clients, set the Tax % to 0 unless otherwise required.",
  },
  {
    q: "What currency is used for Kuwaiti invoices?",
    a: "The Kuwaiti Dinar (KWD) is one of the highest-valued currencies in the world and the official currency of Kuwait. Xuvilo defaults to KWD for Kuwaiti invoices.",
  },
  {
    q: "What are the invoicing requirements in Kuwait?",
    a: "Kuwait does not have specific e-invoicing mandates as of 2024. However, businesses must maintain proper accounting records. A standard Kuwaiti invoice should include seller and buyer details, invoice number, date, description of goods/services, quantities, unit prices, and total amount.",
  },
  {
    q: "Can I create Arabic invoices for Kuwaiti clients?",
    a: "Yes. Xuvilo fully supports Arabic RTL invoices. Arabic is the official language of Kuwait, and professional Arabic invoices are standard business practice. All 40+ invoice templates support proper Arabic typography.",
  },
  {
    q: "Does Kuwait plan to implement ZATCA-like regulations?",
    a: "Kuwait has been in discussion about e-invoicing within the GCC framework. While Saudi Arabia's ZATCA is the most advanced, other GCC countries including Kuwait may follow with similar regulations. Xuvilo is designed to support compliance requirements as they evolve.",
  },
];

export default function CountryKuwait() {
  const seo = PAGE_SEO["/invoice-generator-kuwait"];
  return (
    <AppLayout>
      <SEOHead {...seo} path="/invoice-generator-kuwait"
        structuredData={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🇰🇼</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            Free Invoice Generator for Kuwait
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Create professional Kuwaiti invoices with KWD currency, Arabic RTL support, and instant PDF export. Perfect for Kuwaiti businesses, contractors, and freelancers. Free — no signup required.
          </p>
          <Link href="/invoice">
            <button className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-green-700 to-red-600 hover:opacity-90 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2">
              Create Kuwait Invoice Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          {[
            { label: "Currency", value: "KWD — Kuwaiti Dinar" },
            { label: "VAT", value: "0% (No VAT yet)" },
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Invoicing in Kuwait — Everything You Need to Know</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Kuwait is a unique market in the GCC region — as of 2024, it has not yet introduced Value Added Tax (VAT). While neighboring Saudi Arabia operates at 15% VAT and the UAE at 5%, Kuwait's businesses currently invoice without VAT. This makes invoicing in Kuwait simpler, though proper documentation is still essential for business operations.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            The Kuwaiti Dinar (KWD) is one of the world's strongest currencies. When invoicing Kuwaiti clients, it's important to use KWD unless otherwise agreed upon. Xuvilo supports KWD as the default currency for Kuwaiti invoices.
          </p>
          <ul className="space-y-2">
            {[
              "KWD — Kuwaiti Dinar as default currency",
              "No VAT currently required (set tax to 0%)",
              "Arabic RTL invoices with proper typography",
              "40+ professional templates for Kuwaiti businesses",
              "Bilingual Arabic-English invoice support",
              "Free PDF export — no account required",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Professional Templates for Kuwaiti Businesses</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Xuvilo offers 320+ professional invoice templates specifically designed for MENA businesses. For Kuwaiti clients, the Arabic-first templates with proper right-to-left layout are particularly popular. These templates feature Arabic typography, culturally appropriate business document formatting, and support for Arabic numbers.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            The Corporate Arabic template and the Government Official template are especially well-suited for invoicing Kuwaiti government entities and large corporations, featuring formal document styling consistent with Kuwait's business culture.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            For international Kuwaiti businesses operating with English-speaking clients, Xuvilo also offers bilingual templates that display content in both Arabic and English side by side on a single professional invoice document.
          </p>
        </section>

        <div className="mb-10 p-8 rounded-2xl bg-gradient-to-r from-green-50 to-red-50 dark:from-green-950/20 dark:to-red-950/20 border border-green-200 dark:border-green-800 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Your Kuwait Invoice</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">KWD · No VAT · Arabic RTL · Bilingual · Free PDF</p>
          <Link href="/invoice">
            <button className="px-8 py-3.5 font-bold bg-gradient-to-r from-green-700 to-red-600 text-white rounded-full shadow-lg transition-all flex items-center gap-2 mx-auto hover:opacity-90">
              <FileText className="w-5 h-5" />
              Create Kuwait Invoice Free
            </button>
          </Link>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">FAQ — Kuwaiti Invoicing</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex justify-between items-center gap-4">
                  {q}
                  <span className="text-green-600 group-open:rotate-45 transition-transform text-xl shrink-0">+</span>
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
