import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function QuotationGuidePage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const faqs = isAR
    ? [
        { q: "ما الفرق بين عرض السعر والفاتورة؟", a: "عرض السعر هو عرض مبدئي بالأسعار يُرسل قبل أن يقرر العميل الشراء. الفاتورة تُرسل بعد تأكيد الطلب وتطلب الدفع." },
        { q: "كم يجب أن تكون مدة صلاحية عرض السعر؟", a: "تختلف حسب الصناعة، لكن من الشائع 7 إلى 30 يومًا. اذكر تاريخ انتهاء الصلاحية بوضوح." },
        { q: "هل عرض السعر ملزم قانونياً؟", a: "بشكل عام، عرض السعر ليس عقدًا ملزمًا حتى يقبله العميل كتابيًا. لكن بعض الدول تعتبره عرضًا قابلاً للقبول خلال فترة الصلاحية." },
        { q: "هل يجب تضمين الضريبة في عرض السعر؟", a: "نعم، يُفضّل دائمًا توضيح ما إذا كانت الأسعار شاملة أو غير شاملة للضريبة لتجنّب أي لبس." },
      ]
    : [
        { q: "What's the difference between a quotation and an invoice?", a: "A quotation is an upfront price offer sent before the client decides to buy. An invoice is sent after the order is confirmed and requests payment." },
        { q: "How long should a quotation be valid?", a: "It varies by industry, but 7 to 30 days is common. State the expiry date clearly." },
        { q: "Is a quotation legally binding?", a: "Generally, a quotation isn't a binding contract until the client accepts it in writing. However, some jurisdictions treat it as an open offer during the validity period." },
        { q: "Should I include tax in the quotation?", a: "Yes, always make it clear whether prices are tax-inclusive or tax-exclusive to avoid confusion." },
      ];

  const fields = isAR
    ? ["رقم عرض السعر الفريد", "تاريخ الإصدار وتاريخ انتهاء الصلاحية", "بيانات شركتك (الاسم، العنوان، التواصل، الرقم الضريبي)", "بيانات العميل", "وصف تفصيلي للمنتجات أو الخدمات المعروضة", "الكمية، السعر، والمجموع الفرعي لكل بند", "إجمالي الخصومات إن وجدت", "نسبة الضريبة والقيمة الضريبية", "الإجمالي النهائي", "العملة", "شروط الدفع (مقدّم، عند التسليم، شبكة معينة)", "شروط وأحكام (التسليم، الإلغاء، الضمان)", "ملاحظات إضافية"]
    : ["Unique quotation number", "Issue date and validity expiry date", "Your company details (name, address, contact, tax number)", "Client details", "Detailed description of products or services offered", "Quantity, price, and subtotal for each line", "Total discounts if applicable", "Tax rate and tax amount", "Final total", "Currency", "Payment terms (advance, on delivery, specific network)", "Terms and conditions (delivery, cancellation, warranty)", "Additional notes"];

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "دليل عرض السعر — كل ما تحتاج معرفته | Xuvilo" : "Quotation Guide — Everything You Need to Know | Xuvilo"}
        description={
          isAR
            ? "دليل شامل عن عروض الأسعار: ما هي، متى تُرسل، الفرق عن الفاتورة، الحقول الأساسية، الأخطاء الشائعة، وكيف تنشئ عرضًا احترافيًا مع Xuvilo."
            : "Complete guide to quotations: what they are, when to send them, how they differ from invoices, essential fields, common mistakes, and how to create a professional quote with Xuvilo."
        }
        path="/quotation-guide"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "دليل عرض السعر الشامل" : "The complete quotation guide"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {isAR
              ? "كل ما تحتاج معرفته لإنشاء عرض سعر احترافي يقنع العميل ويبني الثقة."
              : "Everything you need to know to create a professional quote that wins the client and builds trust."}
          </p>
        </header>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h2>{isAR ? "ما هو عرض السعر؟" : "What is a quotation?"}</h2>
          <p>
            {isAR
              ? "عرض السعر (المعروف أيضاً بـ \"كوتيشن\" أو \"عرض الأسعار\") هو مستند رسمي يقدّمه البائع للعميل المحتمل قبل إتمام عملية البيع. يوضّح المنتجات أو الخدمات المعروضة، أسعارها، شروط الدفع، ومدة صلاحية العرض. يُستخدم عرض السعر كأساس لقرار العميل بقبول الصفقة أو رفضها."
              : "A quotation (also called a \"quote\") is a formal document a seller gives to a prospective client before a sale is finalized. It outlines the products or services on offer, their prices, payment terms, and the validity period of the offer. The quotation forms the basis for the client's decision to accept or reject the deal."}
          </p>

          <h2>{isAR ? "الفرق بين عرض السعر والفاتورة" : "Quotation vs. invoice"}</h2>
          <p>
            {isAR
              ? "عرض السعر يُرسل قبل البيع — هو دعوة من البائع للمشتري للموافقة على شروط معينة. الفاتورة تُرسل بعد البيع — هي طلب رسمي للدفع مقابل سلع تم تسليمها أو خدمة تم إنجازها. عرض السعر اختياري بطبيعته (يمكن للعميل قبوله أو رفضه)، بينما الفاتورة هي مطالبة قانونية بالدفع."
              : "A quotation is sent before the sale — it's an invitation from seller to buyer to agree on specific terms. An invoice is sent after the sale — it's a formal request for payment for goods delivered or services completed. A quotation is optional in nature (the client can accept or reject), while an invoice is a legal demand for payment."}
          </p>

          <h2>{isAR ? "متى تُرسل عرض سعر؟" : "When to send a quotation"}</h2>
          <ul>
            <li>{isAR ? "عندما يطلب العميل تقدير سعر مفصّل قبل القرار" : "When the client asks for a detailed price estimate before deciding"}</li>
            <li>{isAR ? "في الصفقات الكبيرة أو المعقّدة" : "On larger or more complex deals"}</li>
            <li>{isAR ? "عند المنافسة على مشروع مع موردين آخرين" : "When competing for a project with other suppliers"}</li>
            <li>{isAR ? "عند الحاجة لتوثيق الشروط قبل البدء بالعمل" : "Whenever you need to document the terms before starting work"}</li>
          </ul>

          <h2>{isAR ? "الحقول الأساسية في عرض السعر" : "Essential quotation fields"}</h2>
          <ul>
            {fields.map((f) => (<li key={f}>{f}</li>))}
          </ul>

          <h2>{isAR ? "أخطاء شائعة يجب تجنّبها" : "Common mistakes to avoid"}</h2>
          <ul>
            <li>{isAR ? "عدم ذكر تاريخ انتهاء الصلاحية" : "Not stating an expiry date"}</li>
            <li>{isAR ? "أوصاف بنود غامضة أو غير محددة" : "Vague or undefined item descriptions"}</li>
            <li>{isAR ? "عدم توضيح ما إذا كانت الأسعار شاملة أو غير شاملة للضريبة" : "Not clarifying whether prices include or exclude tax"}</li>
            <li>{isAR ? "غياب الشروط والأحكام" : "Missing terms and conditions"}</li>
            <li>{isAR ? "إغفال شروط الدفع وطريقة التسليم" : "Omitting payment terms and delivery method"}</li>
            <li>{isAR ? "تنسيق غير احترافي يضعف الثقة" : "Unprofessional formatting that undermines trust"}</li>
          </ul>

          <h2>{isAR ? "كيف تساعدك Xuvilo" : "How Xuvilo helps"}</h2>
          <p>
            {isAR
              ? "مولّد عروض الأسعار في Xuvilo يضم قوالب احترافية مع حقول مدمجة للصلاحية، الشروط، والملاحظات. تحسب الإجماليات والضرائب تلقائيًا، وتدعم العربية والإنجليزية، ويمكنك التحويل من عرض سعر إلى فاتورة بنقرة واحدة عند قبول العميل."
              : "Xuvilo's quotation generator includes professional templates with built-in fields for validity, terms, and notes. Totals and taxes are calculated automatically, Arabic and English are fully supported, and you can convert a quote to an invoice with one click once the client accepts."}
          </p>
        </article>

        <section className="my-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isAR ? "جاهز لإرسال عرض السعر؟" : "Ready to send your quote?"}
          </h2>
          <Button asChild size="lg"><Link href="/quotation">{isAR ? "افتح مولّد عروض الأسعار" : "Open Quotation Generator"}</Link></Button>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "أسئلة شائعة" : "Quotation FAQs"}
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
          <Link href="/invoice-guide" className="text-blue-600 hover:underline">{isAR ? "دليل الفواتير" : "Invoice Guide"}</Link>
          {" · "}
          <Link href="/receipt-guide" className="text-blue-600 hover:underline">{isAR ? "دليل الإيصالات" : "Receipt Guide"}</Link>
        </p>
      </div>
    </AppLayout>
  );
}
