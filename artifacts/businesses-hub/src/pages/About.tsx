import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calculator, FileCheck, LayoutTemplate, Globe, ShieldCheck, BookOpen, Users, Award } from "lucide-react";

export default function AboutPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const values = [
    {
      icon: FileText,
      title: isAR ? "أدوات احترافية" : "Professional tools",
      body: isAR
        ? "فواتير، عروض أسعار، وإيصالات بمظهر احترافي وقوالب جاهزة لكل مجال."
        : "Invoices, quotations, and receipts that look polished, with ready-to-use templates for every industry.",
    },
    {
      icon: Globe,
      title: isAR ? "ثنائي اللغة" : "Truly bilingual",
      body: isAR
        ? "دعم كامل للعربية والإنجليزية مع تخطيط من اليمين إلى اليسار وتجربة مستخدم مدروسة."
        : "Full Arabic and English support with right-to-left layout and carefully designed user experience.",
    },
    {
      icon: ShieldCheck,
      title: isAR ? "بسيط وآمن" : "Simple and safe",
      body: isAR
        ? "بياناتك الخاصة بالأدوات المجانية تبقى داخل متصفحك. لا حاجة لإنشاء حساب لاستخدام الأساسيات."
        : "Data in our free tools stays in your browser. No account needed to use the essentials.",
    },
  ];

  return (
    <AppLayout>
      <SEOHead
        title={
          isAR
            ? "عن Xuvilo — أدوات أعمال مجانية للشركات الصغيرة | Xuvilo"
            : "About Xuvilo — Free Business Tools for Small Businesses | Xuvilo"
        }
        description={
          isAR
            ? "تعرّف على Xuvilo، منصة أدوات الأعمال المجانية للمستقلين والشركات الصغيرة والمقاولين والشركات الناشئة. فواتير، عروض أسعار، إيصالات، حاسبات، وقوالب — بالعربية والإنجليزية."
            : "Learn about Xuvilo, the free online business tools platform for freelancers, small businesses, traders, contractors, and startups. Invoices, quotations, receipts, calculators, and templates — in Arabic and English."
        }
        path="/about"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "عن Xuvilo" : "About Xuvilo"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {isAR
              ? "منصة أدوات أعمال على الإنترنت تساعد الشركات الصغيرة والمستقلين على إدارة أعمالهم اليومية بشكل أبسط وأسرع."
              : "An online business tools platform that helps small businesses and freelancers handle daily admin work more simply and quickly."}
          </p>
        </header>

        {/* Stats bar */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { num: "320+", label: isAR ? "قالب جاهز" : "Ready templates" },
            { num: "14", label: isAR ? "حاسبة تجارية" : "Business calculators" },
            { num: "82+", label: isAR ? "مقال ودليل" : "Articles & guides" },
            { num: "59+", label: isAR ? "دولة مدعومة" : "Countries covered" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-center">
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-1">{s.num}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </section>

        <section className="prose prose-gray dark:prose-invert max-w-none mb-12">
          <h2>{isAR ? "ما هي Xuvilo؟" : "What is Xuvilo?"}</h2>
          <p>
            {isAR
              ? "Xuvilo هي منصة أدوات أعمال مجانية على الإنترنت مصمّمة للشركات الصغيرة والمستقلين والتجار والمقاولين والشركات الناشئة في منطقة الشرق الأوسط وشمال أفريقيا والعالم. نوفر مجموعة من الأدوات التي تساعدك على إنشاء مستندات أعمالك بسرعة، وحساب الأرقام المهمة لعملك، وإدارة سير عمل بسيط دون الحاجة إلى برامج معقّدة أو اشتراكات مكلفة."
              : "Xuvilo is a free online business tools platform built for small businesses, freelancers, traders, contractors, and startups across the Middle East, North Africa, and beyond. We offer a suite of tools that help you create business documents quickly, calculate the numbers that matter, and manage a simple workflow — without complicated software or expensive subscriptions."}
          </p>

          <h2>{isAR ? "ما الذي نقدّمه؟" : "What we offer"}</h2>
          <ul>
            <li>{isAR ? "مولّد فواتير مجاني مع دعم ZATCA وأكثر من 176 عملة وتصدير PDF فوري" : "Free invoice generator with ZATCA support, 176+ currencies, and instant PDF export"}</li>
            <li>{isAR ? "مولّد عروض الأسعار والإيصالات مع قوالب احترافية لكل قطاع" : "Quotation and receipt generators with 320+ professional templates across every industry"}</li>
            <li>{isAR ? "14 حاسبة تجارية: ضريبة القيمة المضافة، هامش الربح، العملات، تكلفة الشحن، وغيرها" : "14 business calculators covering VAT, profit margin, currency, shipping, loan, break-even, and more"}</li>
            <li>{isAR ? "أدلة وموارد تحريرية شاملة باللغتين العربية والإنجليزية" : "82+ editorial guides and resources in both Arabic and English"}</li>
            <li>{isAR ? "أدوات مساعدة: الطوابع التجارية، بطاقات الأعمال، الملف التجاري، البريد المؤقت" : "Utility tools: stamp maker, business card, company profile, and temporary email"}</li>
          </ul>

          <h2>{isAR ? "لمن صُمّمت Xuvilo؟" : "Who Xuvilo is for"}</h2>
          <ul>
            <li>{isAR ? "المستقلون والعاملون لحسابهم الخاص" : "Freelancers and self-employed professionals"}</li>
            <li>{isAR ? "الشركات الصغيرة والمتوسطة في منطقة الشرق الأوسط وشمال أفريقيا وخارجها" : "Small and medium-sized businesses across MENA and beyond"}</li>
            <li>{isAR ? "التجّار وأصحاب المتاجر والمستوردون والمصدّرون" : "Traders, importers, and exporters"}</li>
            <li>{isAR ? "المقاولون ومزوّدو الخدمات والاستشاريون" : "Contractors, service providers, and consultants"}</li>
            <li>{isAR ? "المنظمات غير الحكومية والشركات الناشئة التي تحتاج تقارير مالية موثّقة" : "NGOs and startups that need auditable financial reports"}</li>
          </ul>

          <h2>{isAR ? "مهمتنا" : "Our mission"}</h2>
          <p>
            {isAR
              ? "نسعى لجعل أعمال الإدارة اليومية للشركات الصغيرة أبسط وأسرع وأكثر إتاحة للجميع. نؤمن أن إنشاء فاتورة أو عرض سعر أو إجراء حساب تجاري لا يجب أن يكون مهمّة معقدة، ولذلك نوفر أدوات نظيفة وسهلة الاستخدام مجاناً للجميع."
              : "We aim to make day-to-day business admin simpler, faster, and more accessible for everyone. We believe creating an invoice, sending a quotation, or running a business calculation should not be a complicated task — so we provide clean, easy-to-use tools, free for everyone."}
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {values.map((v) => (
            <Card key={v.title} className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
                  <v.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Editorial team & content standards */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isAR ? "الفريق التحريري والمحتوى" : "Our editorial team & content"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {isAR
              ? "محتوى Xuvilo — من أدلة الفواتير إلى تفاصيل أنظمة ضريبة القيمة المضافة — يُنشئه فريق تحريري متخصص يمتلك خبرة ميدانية في الأعمال التجارية والمحاسبة والتشريعات في منطقة الشرق الأوسط وشمال أفريقيا. نستند دائماً إلى المصادر الرسمية ونراجع محتوانا بانتظام للحفاظ على دقته."
              : "Xuvilo's content — from invoice guides to VAT rate specifics — is produced by a specialist editorial team with hands-on experience in business operations, accounting, and regulatory compliance across the MENA region. We cite official sources and review our content regularly to keep it accurate."}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Users,
                title: isAR ? "خبرة متخصصة" : "Domain expertise",
                body: isAR
                  ? "كتّابنا لديهم خلفية عملية في الفوترة والضرائب وقانون العمل والتجارة الدولية."
                  : "Our writers have hands-on backgrounds in invoicing, taxation, labor law, and international trade.",
              },
              {
                icon: BookOpen,
                title: isAR ? "مصادر موثوقة" : "Primary sources",
                body: isAR
                  ? "نستند إلى هيئات الضرائب الرسمية (ZATCA, FTA, ETA) ووزارات العمل والتشريعات المعتمدة."
                  : "We cite official tax authorities (ZATCA, FTA, ETA), ministries of labor, and enacted legislation.",
              },
              {
                icon: Award,
                title: isAR ? "تحديث منتظم" : "Regularly updated",
                body: isAR
                  ? "المحتوى الحساس للتشريعات يُراجَع كل ثلاثة أشهر ويُحدَّث فور صدور تغييرات رسمية."
                  : "Regulatory content is reviewed every quarter and updated promptly when official changes are announced.",
              },
            ].map((item) => (
              <Card key={item.title} className="border-gray-200 dark:border-gray-800">
                <CardContent className="p-5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
            {isAR ? "تعرّف على معايير المحتوى التفصيلية في " : "Read our detailed content standards in the "}
            <Link href="/editorial-policy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              {isAR ? "السياسة التحريرية" : "Editorial Policy"}
            </Link>
            {isAR ? " أو تعرّف على " : " or learn about the "}
            <Link href="/author/xuvilo-team" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              {isAR ? "الفريق التحريري" : "editorial team"}
            </Link>
            {isAR ? "." : "."}
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isAR ? "ابدأ مجاناً الآن" : "Get started for free"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xl mx-auto">
            {isAR
              ? "اختر الأداة التي تحتاجها وابدأ في إنشاء مستندك خلال دقائق — بدون تسجيل، بدون بطاقة ائتمانية."
              : "Pick the tool you need and start building your document in minutes — no sign-up, no credit card required."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild><Link href="/invoice">{isAR ? "مولّد الفواتير" : "Invoice Generator"}</Link></Button>
            <Button asChild variant="outline"><Link href="/quotation">{isAR ? "مولّد عروض الأسعار" : "Quotation Generator"}</Link></Button>
            <Button asChild variant="outline"><Link href="/receipt">{isAR ? "مولّد الإيصالات" : "Receipt Generator"}</Link></Button>
            <Button asChild variant="outline"><Link href="/calculators">{isAR ? "الحاسبات" : "Calculators"}</Link></Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
