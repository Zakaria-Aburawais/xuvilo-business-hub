import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const faqs = isAR
    ? [
        { q: "ما هي Xuvilo؟", a: "Xuvilo هي منصة أدوات أعمال مجانية تساعد الشركات الصغيرة والمستقلين على إنشاء فواتير، عروض أسعار، إيصالات، واستخدام حاسبات تجارية مخصّصة باللغتين العربية والإنجليزية." },
        { q: "هل Xuvilo مجانية الاستخدام؟", a: "نعم. جميع الأدوات الأساسية مجانية تماماً — بدون حساب، بدون بطاقة ائتمانية، بدون حدود زمنية. أنشئ فواتير وعروض أسعار وإيصالات، واستخدم جميع الحاسبات الـ١٤، وصل إلى أكثر من ٣٢٠ قالباً مجاناً. حفظ المستندات في حسابك مجاني أيضاً." },
        { q: "هل يمكنني إنشاء فواتير عبر الإنترنت؟", a: "نعم. مولّد الفواتير لدينا يتيح لك إنشاء فاتورة احترافية في دقائق مع دعم العملات المتعددة، حساب الضرائب التلقائي، والتصدير إلى PDF." },
        { q: "هل يمكنني إنشاء عروض أسعار؟", a: "نعم. مولّد عروض الأسعار يدعم تواريخ الصلاحية، الشروط والأحكام، وكل الحقول التي تحتاجها لإرسال عرض احترافي للعميل." },
        { q: "هل يمكنني إنشاء إيصالات؟", a: "نعم. يمكنك إصدار إيصالات دفع تتضمن طريقة الدفع، المبلغ المدفوع، والرصيد المتبقي إن وجد، وتصديرها كـ PDF فورًا." },
        { q: "هل يمكنني تنزيل المستندات بصيغة PDF؟", a: "نعم. كل المستندات التي تنشئها يمكن تنزيلها كـ PDF بجودة طباعة عالية، أو طباعتها مباشرة من المتصفح." },
        { q: "هل تدعم Xuvilo اللغتين العربية والإنجليزية؟", a: "نعم. كل الأدوات تدعم العربية والإنجليزية بشكل كامل، بما في ذلك تخطيط من اليمين إلى اليسار للعربية، وقوالب ثنائية اللغة." },
        { q: "هل يمكنني استخدام Xuvilo لشركتي الصغيرة؟", a: "بالتأكيد. صُمّمت Xuvilo خصيصًا للشركات الصغيرة والمستقلين والتجار والمقاولين والشركات الناشئة." },
        { q: "هل الحاسبات دقيقة؟", a: "حاسباتنا تستخدم معادلات قياسية وتعطي نتائج دقيقة بناءً على المدخلات التي تقدّمها. لكن أسعار الصرف ومعدلات الضرائب تتغير، لذا تحقق دائمًا من المصادر الرسمية قبل اتخاذ قرارات نهائية." },
        { q: "هل تقدم Xuvilo مشورة ضريبية أو محاسبية؟", a: "لا. Xuvilo توفر أدوات وقوالب فقط. لا نقدّم مشورة قانونية أو ضريبية أو محاسبية أو مالية. لقرارات مهمة، استشر متخصصًا مؤهلاً." },
        { q: "هل أحتاج إلى حساب لاستخدام Xuvilo؟", a: "لا تحتاج إلى حساب لاستخدام أدواتنا الأساسية. الحساب مفيد فقط إذا كنت تريد حفظ المستندات أو استخدام ميزات الخطة المدفوعة." },
        { q: "هل هناك خدعة — لماذا كل شيء مجاني؟", a: "لا توجد خدعة. أدوات الفواتير وعروض الأسعار والإيصالات والحاسبات مجانية للأبد. ندعم المنصة من خلال إعلانات Google AdSense التي تظهر في بعض الصفحات. الحساب الاختياري يتيح لك حفظ مستنداتك وإدارتها." },
      ]
    : [
        { q: "What is Xuvilo?", a: "Xuvilo is a free business tools platform that helps small businesses and freelancers create invoices, quotations, receipts, and use specialized business calculators — in both Arabic and English." },
        { q: "Is Xuvilo free to use?", a: "Yes. All core tools are completely free — no account, no credit card, no time limit. Create invoices, quotations, and receipts, use all 14 calculators, and access 320+ templates at no cost. Saving documents to your account is also free." },
        { q: "Can I create invoices online?", a: "Yes. Our invoice generator lets you create a professional invoice in minutes with multi-currency support, automatic tax calculation, and PDF export." },
        { q: "Can I create quotations online?", a: "Yes. Our quotation generator supports validity dates, terms and conditions, and every field you need to send a polished quote to a client." },
        { q: "Can I create receipts online?", a: "Yes. You can issue payment receipts that include the payment method, amount paid, and balance owed, then export to PDF instantly." },
        { q: "Can I download documents as PDF?", a: "Yes. Every document you create can be downloaded as a high-quality print-ready PDF, or printed directly from your browser." },
        { q: "Does Xuvilo support Arabic and English?", a: "Yes. Every tool fully supports Arabic and English, including right-to-left layout for Arabic and bilingual templates." },
        { q: "Can I use Xuvilo for my small business?", a: "Absolutely. Xuvilo is designed specifically for small businesses, freelancers, traders, contractors, and startups." },
        { q: "Are the calculators accurate?", a: "Our calculators use standard formulas and return accurate results based on the inputs you provide. However, exchange rates and tax rates change, so always verify with official sources before making final decisions." },
        { q: "Does Xuvilo provide tax or accounting advice?", a: "No. Xuvilo provides tools and templates only. We do not provide legal, tax, accounting, or financial advice. For important decisions, consult a qualified professional." },
        { q: "Do I need an account?", a: "You don't need an account to use our core tools. An account is only useful if you want to save documents or use paid-plan features." },
        { q: "Is there a catch — why is it all free?", a: "No catch. Our core invoicing, quotation, receipt, and calculator tools are free forever. We support the platform through Google AdSense advertising shown on some pages. An optional account lets you save and manage your documents." },
      ];

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
