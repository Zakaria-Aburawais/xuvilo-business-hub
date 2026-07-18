import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { ArrowRight, CheckCircle, FileText } from "lucide-react";

const FAQS = [
  {
    q: "ما هو معدل ضريبة القيمة المضافة في مصر؟ / What is the VAT rate in Egypt?",
    a: "معدل ضريبة القيمة المضافة القياسي في مصر هو 14%، مع وجود معدلات مخفضة لبعض السلع. Standard VAT rate in Egypt is 14%, with reduced rates for certain goods and services.",
  },
  {
    q: "هل يمكنني إنشاء فاتورة باللغة العربية لمصر؟ / Can I create Arabic invoices for Egypt?",
    a: "نعم، يدعم Xuvilo الفواتير باللغة العربية الكاملة مع تخطيط RTL الصحيح. Yes, Xuvilo fully supports Arabic RTL invoices for Egyptian businesses.",
  },
  {
    q: "What currency should I use for Egyptian invoices?",
    a: "Egyptian Pound (EGP — £E) is the standard currency for domestic transactions in Egypt. Xuvilo supports EGP along with 175+ other currencies including USD for international invoicing.",
  },
  {
    q: "What details are required on an Egyptian invoice?",
    a: "An Egyptian invoice should include: seller name and tax registration number, buyer details, invoice date and number, description of goods/services, quantities and prices, VAT amount, and total amount. For businesses registered with the Egyptian Tax Authority, the Tax Registration Number (TRN) must appear on all invoices.",
  },
];

export default function CountryEgypt() {
  const seo = PAGE_SEO["/invoice-generator-egypt"];
  return (
    <AppLayout>
      <SEOHead {...seo} path="/invoice-generator-egypt"
        structuredData={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🇪🇬</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            مولد الفواتير المجاني لمصر<br />
            <span className="text-3xl font-bold text-gray-600 dark:text-gray-400">Free Invoice Generator for Egypt</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            أنشئ فواتير احترافية بالجنيه المصري مع دعم كامل للغة العربية وتصدير PDF مجاني. Create professional Egyptian invoices with EGP currency, Arabic RTL support, and instant PDF export.
          </p>
          <Link href="/invoice">
            <button className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2">
              إنشاء فاتورة مجاناً / Create Invoice Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          {[
            { label: "Currency / العملة", value: "EGP — الجنيه المصري" },
            { label: "VAT Rate / ضريبة القيمة المضافة", value: "14% (Standard)" },
            { label: "Languages / اللغات", value: "Arabic & English" },
            { label: "Export / تصدير", value: "PDF Free" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{value}</div>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">إنشاء فاتورة مصرية احترافية / Create a Professional Egyptian Invoice</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            يوفر Xuvilo أداة مجانية لإنشاء الفواتير الاحترافية للشركات المصرية والمستقلين. يمكنك إنشاء فواتير بالجنيه المصري (EGP) مع دعم كامل للغة العربية وتخطيط RTL الصحيح.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Xuvilo provides a free professional invoice generator for Egyptian businesses and freelancers. Create invoices in Egyptian Pound (EGP) with full Arabic RTL support, 14% VAT calculation, and instant PDF export.
          </p>
          <ul className="space-y-2 mb-4">
            {[
              "العملة الافتراضية: الجنيه المصري (EGP) — Default currency: EGP",
              "حساب ضريبة القيمة المضافة التلقائي (14%) — Auto 14% VAT calculation",
              "قوالب احترافية عربية وإنجليزية — Arabic & English professional templates",
              "تصدير PDF مجاني فوري — Instant free PDF export",
              "لا يلزم التسجيل — No signup required",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Egyptian Invoice Requirements / متطلبات الفاتورة المصرية</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            In Egypt, the Egyptian Tax Authority (ETA) requires VAT-registered businesses to issue tax invoices for all taxable supplies. The Egyptian e-invoicing system, launched in 2020, mandates electronic invoices for large taxpayers with digital integration through the ETA portal.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            A valid Egyptian tax invoice must include the taxpayer's Tax Registration Number (TRN), both the seller's and buyer's details, a unique invoice number, date, description of goods or services, quantities, VAT base, VAT rate (standard 14%), VAT amount, and total amount inclusive of VAT.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            For small businesses and freelancers not yet integrated with the ETA portal, Xuvilo generates professional invoices with all required fields that can be presented to clients and retained for accounting purposes.
          </p>
        </section>

        <div className="mb-10 p-8 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-800 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ابدأ الآن / Start Now</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">EGP · 14% VAT · Arabic RTL · Free PDF</p>
          <Link href="/invoice">
            <button className="px-8 py-3.5 font-bold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-full shadow-lg transition-all flex items-center gap-2 mx-auto">
              <FileText className="w-5 h-5" />
              إنشاء فاتورة / Create Invoice
            </button>
          </Link>
        </div>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">الأسئلة الشائعة / FAQ</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex justify-between items-center gap-4">
                  {q}
                  <span className="text-red-600 group-open:rotate-45 transition-transform text-xl shrink-0">+</span>
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
