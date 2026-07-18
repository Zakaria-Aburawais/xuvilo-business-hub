import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Percent, RefreshCw, Truck, Clock, Coins, FileBarChart, Landmark } from "lucide-react";

export default function BusinessCalculatorsGuidePage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const calcs = [
    {
      icon: Percent, href: "/calculators/profit-margin",
      title: isAR ? "حاسبة هامش الربح" : "Profit Margin Calculator",
      body: isAR
        ? "احسب هامش الربح بناءً على سعر التكلفة وسعر البيع. تساعدك على تسعير منتجاتك بشكل مربح."
        : "Calculate profit margin from cost and sale price. Helps you price products profitably.",
    },
    {
      icon: Calculator, href: "/calculators/markup-margin",
      title: isAR ? "حاسبة هامش الزيادة" : "Markup Calculator",
      body: isAR
        ? "احسب نسبة الزيادة المطلوب إضافتها على التكلفة لتحقيق هامش ربح معين."
        : "Compute the markup percentage needed on cost to hit a target profit margin.",
    },
    {
      icon: Percent, href: "/calculators/discount",
      title: isAR ? "حاسبة الخصم" : "Discount Calculator",
      body: isAR
        ? "احسب السعر النهائي بعد الخصم، وكم وفّر العميل، وكم انخفض هامش ربحك."
        : "Compute the final price after discount, how much the customer saves, and how it affects margin.",
    },
    {
      icon: Landmark, href: "/calculators/vat-tax",
      title: isAR ? "حاسبة ضريبة القيمة المضافة" : "VAT / Tax Calculator",
      body: isAR
        ? "احسب الضريبة بطريقتين: إضافة الضريبة على المبلغ، أو استخراجها من مبلغ شامل."
        : "Compute VAT two ways: adding tax to a net amount, or extracting tax from a gross amount.",
    },
    {
      icon: RefreshCw, href: "/calculators/currency-exchange",
      title: isAR ? "حاسبة تحويل العملات" : "Currency Exchange Calculator",
      body: isAR
        ? "حوّل بين 176+ عملة بأحدث الأسعار. مفيدة للمصدّرين، المستوردين، والشركات الدولية."
        : "Convert between 176+ currencies with the latest rates. Useful for exporters, importers, and global businesses.",
    },
    {
      icon: Truck, href: "/calculators/shipping-cbm",
      title: isAR ? "حاسبة الشحن (CBM / حجمي)" : "Shipping CBM / Volumetric Calculator",
      body: isAR
        ? "احسب حجم الشحنة (متر مكعب) لتحديد تكلفة الشحن البحري أو الجوي بدقة."
        : "Calculate shipment volume (cubic meters) to price sea or air freight accurately.",
    },
    {
      icon: Clock, href: "/calculators/overtime",
      title: isAR ? "حاسبة العمل الإضافي" : "Overtime Calculator",
      body: isAR
        ? "احسب أجر ساعات العمل الإضافي بناءً على معدل الأجر الأساسي ونسبة الأوفر تايم."
        : "Compute overtime pay based on the base hourly rate and the overtime rate."
    },
    {
      icon: Clock, href: "/calculators/leave-balance",
      title: isAR ? "حاسبة رصيد الإجازة" : "Leave Balance Calculator",
      body: isAR
        ? "احسب رصيد الإجازة المستحق للموظف بناءً على تاريخ الالتحاق وأيام الإجازة المستخدمة."
        : "Calculate an employee's earned leave balance based on join date and days used.",
    },
    {
      icon: Coins, href: "/calculators/loan",
      title: isAR ? "حاسبة القرض" : "Loan Calculator",
      body: isAR
        ? "احسب القسط الشهري، إجمالي الفوائد، وجدول السداد لأي قرض."
        : "Compute the monthly installment, total interest, and amortization schedule for any loan.",
    },
    {
      icon: FileBarChart, href: "/calculators/break-even",
      title: isAR ? "حاسبة نقطة التعادل" : "Break-Even Calculator",
      body: isAR
        ? "اعرف عدد الوحدات أو حجم المبيعات الذي تحتاجه لتغطية تكاليفك الثابتة والمتغيرة."
        : "Find the unit volume or sales amount you need to cover fixed and variable costs.",
    },
  ];

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "دليل حاسبات الأعمال — Xuvilo" : "Business Calculators Guide — Xuvilo"}
        description={
          isAR
            ? "تعرّف على حاسبات Xuvilo التجارية: ربح، خصم، ضريبة، شحن، عملات، عمل إضافي، إجازة، قروض، نقطة التعادل. مع شرح متى تستخدم كل واحدة."
            : "Learn about Xuvilo's business calculators: profit, discount, tax, shipping, currency, overtime, leave, loan, break-even. Includes when to use each one."
        }
        path="/business-calculators-guide"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "دليل حاسبات الأعمال" : "Business Calculators Guide"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {isAR
              ? "حاسبات تجارية مجانية تساعدك على اتخاذ قرارات أعمال أذكى — تسعير، ضرائب، شحن، رواتب، قروض، والمزيد."
              : "Free business calculators that help you make smarter business decisions — pricing, taxes, shipping, payroll, loans, and more."}
          </p>
        </header>

        <section className="prose prose-gray dark:prose-invert max-w-none mb-10">
          <h2>{isAR ? "لماذا تحتاج حاسبات الأعمال؟" : "Why business calculators matter"}</h2>
          <p>
            {isAR
              ? "أصحاب الأعمال الصغيرة والمستقلون يتخذون عشرات القرارات يومياً تتعلق بالأرقام: كم أربح من هذا المنتج؟ كم سأدفع ضريبة؟ كم تكلفة شحن هذه الطلبية؟ ما هو القسط الشهري لهذا القرض؟ تساعدك حاسبات Xuvilo على الإجابة على هذه الأسئلة بسرعة ودقة، مما يوفّر وقتك ويمنع الأخطاء المكلفة."
              : "Small business owners and freelancers make dozens of number-driven decisions every day: How much do I earn on this product? How much tax will I pay? What does shipping this order cost? What's the monthly payment on this loan? Xuvilo's calculators help you answer these questions quickly and accurately — saving time and preventing costly mistakes."}
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {calcs.map((c) => (
            <Card key={c.href} className="border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <Link href={c.href}>
                <CardContent className="p-6 cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
                    <c.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{c.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{c.body}</p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </section>

        <section className="prose prose-gray dark:prose-invert max-w-none mb-10">
          <h2>{isAR ? "ملاحظة مهمة عن دقة الحاسبات" : "Important note on calculator accuracy"}</h2>
          <p>
            {isAR
              ? "كل نتائج الحاسبات هي تقديرات تستند إلى المدخلات التي تقدّمها وإلى معادلات قياسية. أسعار صرف العملات، معدلات الضرائب، تكاليف الشحن، وأسعار الفائدة تتغيّر باستمرار، ويجب التحقق من المصادر الرسمية أو استشارة متخصص قبل اتخاذ قرارات أعمال نهائية. لا تُعتبر هذه الحاسبات بديلاً عن مشورة محاسب أو مستشار ضريبي مؤهّل."
              : "All calculator results are estimates based on the inputs you provide and on standard formulas. Exchange rates, tax rates, shipping costs, and interest rates change constantly — verify with official sources or consult a professional before making final business decisions. These calculators are not a substitute for advice from a qualified accountant or tax advisor."}
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isAR ? "استكشف كل الحاسبات" : "Explore all calculators"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isAR ? "14 حاسبة تجارية مجانية في مكان واحد." : "14 free business calculators in one place."}
          </p>
          <Button asChild size="lg"><Link href="/calculators">{isAR ? "افتح صفحة الحاسبات" : "Open Calculators Hub"}</Link></Button>
        </section>
      </div>
    </AppLayout>
  );
}
