import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { LayoutGrid, FileEdit, Users, Calculator, Eye, Download } from "lucide-react";

export default function HowItWorksPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const steps = [
    {
      icon: LayoutGrid,
      title: isAR ? "1. اختر الأداة" : "1. Choose your tool",
      body: isAR
        ? "اختر الأداة التي تحتاجها من القائمة الرئيسية: مولّد الفواتير، عروض الأسعار، الإيصالات، أو إحدى الحاسبات التجارية."
        : "Pick the tool you need from the main menu: invoice generator, quotation generator, receipt generator, or one of our business calculators.",
    },
    {
      icon: FileEdit,
      title: isAR ? "2. أدخل تفاصيل عملك" : "2. Enter your business details",
      body: isAR
        ? "أضف اسم شركتك، شعارك، عنوانك، وبيانات التواصل. تُحفظ هذه التفاصيل تلقائيًا في متصفحك للاستخدام التالي."
        : "Add your business name, logo, address, and contact details. These are saved in your browser for next time.",
    },
    {
      icon: Users,
      title: isAR ? "3. أضف بيانات العميل" : "3. Add the client's details",
      body: isAR
        ? "أدخل اسم العميل، عنوانه، ورقم الضريبة إن وجد. كل هذا يظهر في المستند تلقائيًا."
        : "Enter the client's name, address, and tax number if applicable. All of this appears on the document automatically.",
    },
    {
      icon: Calculator,
      title: isAR ? "4. أضف العناصر، الكميات، والأسعار" : "4. Add items, quantities, and prices",
      body: isAR
        ? "أضف صفوف العناصر مع الكمية، السعر، الخصم، والضريبة. نحسب الإجماليات تلقائيًا أثناء الكتابة."
        : "Add line items with quantity, price, discount, and tax. We calculate totals automatically as you type.",
    },
    {
      icon: Eye,
      title: isAR ? "5. عاين المستند" : "5. Preview the document",
      body: isAR
        ? "شاهد كيف سيبدو مستندك في الوقت الفعلي. غيّر القالب، الألوان، والعملة بنقرة واحدة."
        : "See how your document looks in real time. Change the template, colors, and currency with one click.",
    },
    {
      icon: Download,
      title: isAR ? "6. حمّل أو اطبع PDF" : "6. Download or print as PDF",
      body: isAR
        ? "حمّل المستند كـ PDF بجودة عالية، أو اطبعه مباشرة، أو شاركه عبر البريد الإلكتروني أو واتساب."
        : "Download as a high-quality PDF, print directly, or share via email or WhatsApp.",
    },
  ];

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "كيف تعمل Xuvilo — دليل خطوة بخطوة" : "How It Works — Step-by-Step Guide | Xuvilo"}
        description={
          isAR
            ? "تعرّف على كيفية إنشاء فواتير، عروض أسعار، وإيصالات احترافية باستخدام Xuvilo في 6 خطوات بسيطة."
            : "Learn how to create professional invoices, quotations, and receipts with Xuvilo in 6 simple steps."
        }
        path="/how-it-works"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "كيف تعمل Xuvilo" : "How Xuvilo works"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {isAR
              ? "ست خطوات بسيطة لإنشاء مستند أعمال احترافي — بدون تنزيل برامج وبدون إنشاء حساب."
              : "Six simple steps to create a professional business document — no downloads, no sign-up required."}
          </p>
        </header>

        <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {steps.map((s) => (
            <li key={s.title} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>

        <section className="prose prose-gray dark:prose-invert max-w-none mb-12">
          <h2>{isAR ? "هل أحتاج إلى حساب؟" : "Do I need an account?"}</h2>
          <p>
            {isAR
              ? "لا. كل أدواتنا الأساسية تعمل مباشرة في متصفحك دون الحاجة لإنشاء حساب. إذا أردت حفظ المستندات، إدارة قائمة العملاء، أو الوصول للقوالب المميّزة، يمكنك إنشاء حساب اختياريًا."
              : "No. All our core tools work directly in your browser without an account. If you want to save documents, manage a client list, or access premium templates, you can optionally create an account."}
          </p>

          <h2>{isAR ? "هل بياناتي آمنة؟" : "Is my data safe?"}</h2>
          <p>
            {isAR
              ? "نعم. عند استخدامك للأدوات المجانية، تبقى بيانات المستندات في متصفحك — لا نخزنها على خوادمنا. عند استخدام الميزات المدفوعة (مثل حفظ المستندات أو قائمة العملاء)، نخزن البيانات بشكل آمن ويمكنك حذفها في أي وقت."
              : "Yes. When you use the free tools, document data stays in your browser — we don't store it on our servers. When you use paid features (like saving documents or a client list), we store the data securely and you can delete it at any time."}
          </p>

          <h2>{isAR ? "هل تدعم العربية؟" : "Does it support Arabic?"}</h2>
          <p>
            {isAR
              ? "نعم، دعمًا كاملًا. كل الأدوات والقوالب تعمل بالعربية مع تخطيط من اليمين إلى اليسار، ولدينا قوالب ثنائية اللغة (عربي/إنجليزي) جاهزة للاستخدام."
              : "Yes, fully. All tools and templates work in Arabic with right-to-left layout, and we have bilingual (Arabic/English) templates ready to use."}
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isAR ? "جاهز للبدء؟" : "Ready to start?"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xl mx-auto">
            {isAR ? "اختر أداة وابدأ في إنشاء مستندك الآن." : "Pick a tool and create your first document now."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild><Link href="/invoice">{isAR ? "إنشاء فاتورة" : "Create an Invoice"}</Link></Button>
            <Button asChild variant="outline"><Link href="/quotation">{isAR ? "إنشاء عرض سعر" : "Create a Quotation"}</Link></Button>
            <Button asChild variant="outline"><Link href="/receipt">{isAR ? "إنشاء إيصال" : "Create a Receipt"}</Link></Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
