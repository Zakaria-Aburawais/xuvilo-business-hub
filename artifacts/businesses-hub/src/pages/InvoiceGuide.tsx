import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function InvoiceGuidePage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const faqs = isAR
    ? [
        { q: "ما الفرق بين الفاتورة وعرض السعر؟", a: "عرض السعر هو عرض مبدئي للأسعار قبل الاتفاق، بينما الفاتورة هي طلب رسمي للدفع بعد تقديم الخدمة أو تسليم البضاعة." },
        { q: "هل يجب أن تحتوي الفاتورة على رقم ضريبي؟", a: "إذا كنت مسجّلاً في ضريبة القيمة المضافة في بلدك، فنعم — يجب إظهار رقمك الضريبي. تحقق من قواعد بلدك." },
        { q: "كم من الوقت يجب الاحتفاظ بنسخ الفواتير؟", a: "يختلف حسب الدولة، لكن معظم الدول تتطلب الاحتفاظ بسجلات الفواتير لمدة 5 إلى 10 سنوات." },
        { q: "هل الفاتورة الإلكترونية مقبولة قانونياً؟", a: "في معظم الدول نعم، طالما أنها تحتوي على كل البيانات المطلوبة وتم إصدارها وفق متطلبات البلد. تحقق من قواعد بلدك المحددة." },
      ]
    : [
        { q: "What's the difference between an invoice and a quotation?", a: "A quotation is an upfront price offer before agreement; an invoice is a formal payment request after the service has been delivered or goods supplied." },
        { q: "Does an invoice need to include a tax number?", a: "If you're VAT-registered in your country, yes — you must show your tax number. Check your country's rules." },
        { q: "How long should I keep invoice copies?", a: "It varies by country, but most jurisdictions require keeping invoice records for 5 to 10 years." },
        { q: "Is an electronic invoice legally accepted?", a: "In most countries yes, provided it contains all required fields and was issued per the country's rules. Check your specific local regulations." },
      ];

  const fields = isAR
    ? ["رقم الفاتورة الفريد", "تاريخ الإصدار وتاريخ الاستحقاق", "بيانات البائع (الاسم، العنوان، الرقم الضريبي)", "بيانات المشتري (الاسم، العنوان، الرقم الضريبي إن وجد)", "قائمة العناصر مع الوصف، الكمية، وسعر الوحدة", "المجموع الفرعي قبل الضريبة", "نسبة الضريبة والقيمة الضريبية", "الخصومات إن وجدت", "المبلغ الإجمالي المستحق", "العملة", "طريقة الدفع وتفاصيل الحساب البنكي", "ملاحظات أو شروط الدفع"]
    : ["Unique invoice number", "Issue date and due date", "Seller details (name, address, tax number)", "Buyer details (name, address, tax number if applicable)", "Itemized list with description, quantity, and unit price", "Subtotal before tax", "Tax rate and tax amount", "Discounts if any", "Total amount due", "Currency", "Payment method and bank account details", "Notes or payment terms"];

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "دليل الفاتورة — كل ما تحتاج معرفته | Xuvilo" : "Invoice Guide — Everything You Need to Know | Xuvilo"}
        description={
          isAR
            ? "دليل شامل عن الفواتير: ما هي، متى تستخدمها، الحقول الأساسية، الأخطاء الشائعة، وكيف تنشئ فاتورة احترافية مع Xuvilo."
            : "Complete guide to invoices: what they are, when to use them, essential fields, common mistakes, and how to create a professional invoice with Xuvilo."
        }
        path="/invoice-guide"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "دليل الفاتورة الشامل" : "The complete invoice guide"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {isAR
              ? "كل ما يحتاج صاحب العمل أو المستقل معرفته عن إنشاء فاتورة احترافية واضحة وكاملة."
              : "Everything a business owner or freelancer needs to know about creating a clear, complete, professional invoice."}
          </p>
        </header>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h2>{isAR ? "ما هي الفاتورة؟" : "What is an invoice?"}</h2>
          <p>
            {isAR
              ? "الفاتورة هي مستند تجاري رسمي يصدره البائع للمشتري، يوضّح تفاصيل المنتجات أو الخدمات المقدّمة، الكميات، الأسعار، الضرائب، والمبلغ الإجمالي المستحق. تعمل الفاتورة كسجل قانوني للمعاملة وتُستخدم للمحاسبة، التدقيق، والإقرارات الضريبية."
              : "An invoice is a formal commercial document issued by a seller to a buyer that itemizes the products or services provided, quantities, prices, taxes, and total amount due. An invoice serves as a legal record of the transaction and is used for accounting, audits, and tax filings."}
          </p>

          <h2>{isAR ? "متى تُصدر فاتورة؟" : "When to issue an invoice"}</h2>
          <ul>
            <li>{isAR ? "بعد تسليم منتج أو إكمال خدمة" : "After delivering a product or completing a service"}</li>
            <li>{isAR ? "عند طلب الدفع من العميل" : "When requesting payment from a client"}</li>
            <li>{isAR ? "في نهاية فترة محاسبية للعقود المستمرة" : "At the end of a billing cycle for ongoing contracts"}</li>
            <li>{isAR ? "عند بيع البضائع للأعمال (B2B)" : "When selling goods business-to-business (B2B)"}</li>
          </ul>

          <h2>{isAR ? "الحقول الأساسية في الفاتورة" : "Essential invoice fields"}</h2>
          <ul>
            {fields.map((f) => (<li key={f}>{f}</li>))}
          </ul>

          <h2>{isAR ? "أخطاء شائعة يجب تجنّبها" : "Common mistakes to avoid"}</h2>
          <ul>
            <li>{isAR ? "نسيان رقم الفاتورة الفريد أو تكراره" : "Forgetting the unique invoice number or duplicating it"}</li>
            <li>{isAR ? "أخطاء في حساب الضريبة أو استخدام نسبة خاطئة" : "Tax calculation errors or using the wrong rate"}</li>
            <li>{isAR ? "غياب تاريخ الاستحقاق وشروط الدفع" : "Missing due date and payment terms"}</li>
            <li>{isAR ? "بيانات عميل أو بائع غير كاملة" : "Incomplete client or seller details"}</li>
            <li>{isAR ? "عدم تطابق العملة الموضحة مع البلد" : "Currency that doesn't match the country"}</li>
            <li>{isAR ? "عدم إرسال الفاتورة في الوقت المناسب" : "Not sending the invoice on time"}</li>
          </ul>

          <h2>{isAR ? "كيف تساعدك Xuvilo" : "How Xuvilo helps"}</h2>
          <p>
            {isAR
              ? "مولّد الفواتير في Xuvilo يحسب لك الإجماليات والضرائب تلقائيًا، يدعم 176+ عملة، ويوفّر قوالب احترافية للعربية والإنجليزية. يمكنك تصدير الفاتورة كـ PDF عالي الجودة في ثوانٍ، وإرسالها للعميل عبر البريد الإلكتروني أو واتساب أو طباعتها مباشرة."
              : "Xuvilo's invoice generator calculates totals and taxes automatically, supports 176+ currencies, and offers professional Arabic and English templates. You can export your invoice as a high-quality PDF in seconds and send it to a client via email, WhatsApp, or print it directly."}
          </p>
        </article>

        <section className="my-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isAR ? "جاهز لإنشاء فاتورتك؟" : "Ready to create your invoice?"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isAR ? "ابدأ مجانًا — لا تحتاج إلى حساب." : "Get started for free — no account needed."}
          </p>
          <Button asChild size="lg"><Link href="/invoice">{isAR ? "افتح مولّد الفواتير" : "Open Invoice Generator"}</Link></Button>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "أسئلة شائعة عن الفواتير" : "Invoice FAQs"}
          </h2>
          <Accordion type="single" collapsible className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f-${i}`} className="px-5">
                <AccordionTrigger className="text-start text-gray-900 dark:text-white font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400 text-center">
          {isAR ? "اقرأ أيضاً: " : "See also: "}
          <Link href="/quotation-guide" className="text-blue-600 hover:underline">{isAR ? "دليل عروض الأسعار" : "Quotation Guide"}</Link>
          {" · "}
          <Link href="/receipt-guide" className="text-blue-600 hover:underline">{isAR ? "دليل الإيصالات" : "Receipt Guide"}</Link>
        </p>
      </div>
    </AppLayout>
  );
}
