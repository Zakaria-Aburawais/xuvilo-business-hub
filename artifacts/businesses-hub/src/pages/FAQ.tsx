import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ_AR, FAQ_EN } from "@/data/faqContent";

export default function FAQPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const faqs = isAR ? FAQ_AR : FAQ_EN;

  // JSON-LD FAQ structured data improves search visibility.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <AppLayout>
      <SEOHead
        title={
          isAR
            ? "الأسئلة الشائعة — Xuvilo"
            : "Frequently Asked Questions (FAQ) — Xuvilo"
        }
        description={
          isAR
            ? "إجابات على الأسئلة الشائعة عن Xuvilo: مولّد الفواتير، عروض الأسعار، الإيصالات، الحاسبات، الأسعار، الحسابات، والمزيد."
            : "Answers to common questions about Xuvilo: invoice generator, quotations, receipts, calculators, pricing, accounts, and more."
        }
        path="/faq"
        structuredData={structuredData}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {isAR
              ? "إجابات سريعة عن أكثر الأسئلة شيوعاً حول Xuvilo وأدواتنا."
              : "Quick answers to the most common questions about Xuvilo and our tools."}
          </p>
        </header>

        <Accordion type="single" collapsible className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="px-5">
              <AccordionTrigger className="text-start text-gray-900 dark:text-white font-medium">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900 text-center">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
            {isAR ? "لم تجد إجابتك؟" : "Didn't find your answer?"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {isAR ? "تواصل معنا وسنرد عليك في أقرب وقت." : "Get in touch and we'll get back to you as soon as we can."}
          </p>
          <Link href="/contact" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {isAR ? "تواصل مع الدعم →" : "Contact support →"}
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
