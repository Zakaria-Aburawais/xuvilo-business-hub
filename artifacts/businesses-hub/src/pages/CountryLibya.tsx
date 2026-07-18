import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { ArrowRight, CheckCircle, FileText } from "lucide-react";

const FAQS = [
  {
    q: "ما هو الدينار الليبي؟ / What is the Libyan Dinar?",
    a: "الدينار الليبي (LYD) هو العملة الرسمية لليبيا. The Libyan Dinar (LYD) is the official currency of Libya. It is issued by the Central Bank of Libya.",
  },
  {
    q: "هل يمكنني إنشاء فاتورة بالدينار الليبي؟ / Can I create invoices in Libyan Dinar?",
    a: "نعم، يدعم Xuvilo الدينار الليبي (LYD) كعملة افتراضية لصفحة مولد الفواتير الليبية. Yes, Xuvilo supports LYD and all 176+ world currencies.",
  },
  {
    q: "What information should a Libyan invoice include?",
    a: "A Libyan business invoice should include: seller name and address, buyer name and address, invoice number and date, description of goods or services, quantities, unit prices, total amount, and any applicable taxes. Arabic is the official language for business documents in Libya.",
  },
  {
    q: "Does Libya have VAT?",
    a: "Libya does not currently have a VAT system in place. However, there are various taxes and fees applicable to certain business transactions. For businesses serving Libyan clients, the Tax % field can be set to 0 or adjusted as needed per your business type.",
  },
  {
    q: "Can I create bilingual Arabic-English invoices for Libya?",
    a: "Yes. Xuvilo supports fully bilingual invoices that display content in both Arabic and English side by side. This is ideal for international businesses working with Libyan clients.",
  },
];

export default function CountryLibya() {
  const seo = PAGE_SEO["/invoice-generator-libya"];
  return (
    <AppLayout>
      <SEOHead {...seo} path="/invoice-generator-libya"
        structuredData={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🇱🇾</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            مولد الفواتير المجاني لليبيا<br />
            <span className="text-3xl font-bold text-gray-600 dark:text-gray-400">Free Invoice Generator for Libya</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            أنشئ فواتير احترافية بالدينار الليبي مع دعم كامل للغة العربية وتصدير PDF مجاني. Create professional invoices with LYD currency, full Arabic RTL support, and free PDF export.
          </p>
          <Link href="/invoice">
            <button className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-green-600 to-black hover:opacity-90 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2">
              إنشاء فاتورة / Create Invoice Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          {[
            { label: "Currency / العملة", value: "LYD — الدينار الليبي" },
            { label: "Languages / اللغات", value: "Arabic & English" },
            { label: "Export / تصدير", value: "PDF Free" },
            { label: "Templates / قوالب", value: "40+ Professional" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</div>
              <div className="font-bold text-gray-900 dark:text-white text-sm">{value}</div>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">إنشاء فاتورة ليبية احترافية / Professional Libyan Invoice</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            يوفر Xuvilo أداة مجانية لإنشاء الفواتير الاحترافية للشركات الليبية والمستقلين. قم بإنشاء فواتير بالدينار الليبي (LYD) مع دعم كامل للغة العربية RTL وتصدير PDF مجاني فوري.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Xuvilo offers free professional invoice generation for Libyan businesses and freelancers. Create invoices in Libyan Dinar (LYD) with Arabic right-to-left layout, multiple professional templates, and instant PDF export.
          </p>
          <ul className="space-y-2">
            {[
              "الدينار الليبي (LYD) كعملة افتراضية — LYD as default currency",
              "تخطيط RTL عربي كامل — Full Arabic RTL layout",
              "أكثر من 40 قالب احترافي — 40+ professional templates",
              "دعم ثنائي اللغة (عربي-إنجليزي) — Bilingual Arabic-English support",
              "تصدير PDF مجاني — Free PDF export",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why Libyan Businesses Choose Xuvilo</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            Xuvilo was built specifically for MENA businesses, with Arabic as a first-class language. Unlike generic invoice generators that treat Arabic as an afterthought, every template in Xuvilo was designed with proper Arabic typography, RTL text direction, and culturally appropriate business document formatting.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            For Libyan businesses operating across borders, Xuvilo supports all 176+ world currencies. Switch between LYD, USD, EUR, or any other currency instantly. Bilingual invoices (Arabic + English) are supported natively for international clients.
          </p>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            No subscription required. All invoice generation features are completely free. Create, customize, preview, and download your invoice as a professional A4 PDF in seconds.
          </p>
        </section>

        <div className="mb-10 p-8 rounded-2xl bg-gradient-to-r from-green-50 to-gray-50 dark:from-green-950/30 dark:to-gray-950/30 border border-green-200 dark:border-green-800 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ابدأ الآن / Start Creating</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">LYD · Arabic RTL · Bilingual · Free PDF</p>
          <Link href="/invoice">
            <button className="px-8 py-3.5 font-bold bg-gradient-to-r from-green-600 to-green-800 hover:opacity-90 text-white rounded-full shadow-lg transition-all flex items-center gap-2 mx-auto">
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
