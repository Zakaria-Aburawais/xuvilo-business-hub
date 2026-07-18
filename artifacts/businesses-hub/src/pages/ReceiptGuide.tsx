import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ReceiptGuidePage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const faqs = isAR
    ? [
        { q: "ما الفرق بين الفاتورة والإيصال؟", a: "الفاتورة تطلب الدفع، والإيصال يؤكّد أن الدفع قد تم. غالباً ما تُصدر الفاتورة قبل الدفع، والإيصال بعده." },
        { q: "هل يجب إصدار إيصال لكل دفعة؟", a: "نعم، يُفضّل دائمًا إصدار إيصال للعميل كدليل على الدفع. هذا يحمي الطرفين قانونياً ومحاسبياً." },
        { q: "هل يجب أن يحتوي الإيصال على رقم الضريبة؟", a: "إذا كنت مسجّلاً ضريبيًا، فمن الجيد إظهار رقمك الضريبي على الإيصال، خاصةً في المعاملات بين الشركات." },
        { q: "هل الإيصال الإلكتروني صالح؟", a: "نعم، الإيصالات الإلكترونية مقبولة في معظم الدول طالما أنها تحتوي على البيانات المطلوبة وتم إصدارها بشكل صحيح." },
      ]
    : [
        { q: "What's the difference between an invoice and a receipt?", a: "An invoice requests payment; a receipt confirms payment was made. The invoice is usually issued before payment, the receipt after." },
        { q: "Should I issue a receipt for every payment?", a: "Yes, it's always best to issue a receipt to the client as proof of payment. It protects both sides legally and for accounting." },
        { q: "Should the receipt include a tax number?", a: "If you're tax-registered, it's good practice to show your tax number on the receipt, especially in business-to-business transactions." },
        { q: "Is an electronic receipt valid?", a: "Yes, electronic receipts are accepted in most countries as long as they contain the required information and were issued correctly." },
      ];

  const fields = isAR
    ? ["رقم الإيصال الفريد", "تاريخ الدفع", "بيانات شركتك", "بيانات العميل أو الدافع", "تفاصيل ما تم الدفع مقابله (وصف، رقم الفاتورة المرجعية)", "المبلغ المدفوع", "العملة", "طريقة الدفع (نقدي، بطاقة، تحويل بنكي، شيك)", "الرصيد المتبقي إن وجد", "ضريبة القيمة المضافة إن انطبقت", "توقيع أو ختم (اختياري)", "ملاحظات"]
    : ["Unique receipt number", "Payment date", "Your business details", "Client/payer details", "Description of what was paid for (description, reference invoice number)", "Amount paid", "Currency", "Payment method (cash, card, bank transfer, cheque)", "Remaining balance if any", "VAT if applicable", "Signature or stamp (optional)", "Notes"];

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "دليل الإيصال — كل ما تحتاج معرفته | Xuvilo" : "Receipt Guide — Everything You Need to Know | Xuvilo"}
        description={
          isAR
            ? "دليل شامل عن إيصالات الدفع: متى تُصدر، الفرق بين الإيصال والفاتورة، الحقول الأساسية، الأخطاء الشائعة، وكيف تنشئ إيصالًا احترافيًا مع Xuvilo."
            : "Complete guide to payment receipts: when to issue them, the difference between a receipt and an invoice, essential fields, common mistakes, and how to create a professional receipt with Xuvilo."
        }
        path="/receipt-guide"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "دليل الإيصال الشامل" : "The complete receipt guide"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {isAR
              ? "تعرّف على كيف ومتى تُصدر إيصالًا احترافيًا يحمي حقوقك وحقوق عملائك."
              : "Learn how and when to issue a professional receipt that protects your rights and your clients'."}
          </p>
        </header>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h2>{isAR ? "ما هو الإيصال؟" : "What is a receipt?"}</h2>
          <p>
            {isAR
              ? "الإيصال هو مستند يثبت أن الدفع قد تمّ مقابل سلعة أو خدمة. يوضّح المبلغ المدفوع، طريقة الدفع، تاريخ المعاملة، وأي رصيد متبقٍ. يخدم الإيصال كدليل قانوني للمشتري ووثيقة محاسبية للبائع."
              : "A receipt is a document that proves payment has been made for a good or service. It shows the amount paid, the payment method, the date of the transaction, and any remaining balance. The receipt serves as legal proof for the buyer and an accounting record for the seller."}
          </p>

          <h2>{isAR ? "متى تُصدر إيصالًا؟" : "When to issue a receipt"}</h2>
          <ul>
            <li>{isAR ? "بعد استلام أي دفعة من العميل" : "After receiving any payment from a client"}</li>
            <li>{isAR ? "للدفعات الجزئية لتوضيح ما تم دفعه وما تبقّى" : "For partial payments, to clarify what's been paid and what's outstanding"}</li>
            <li>{isAR ? "للدفعات النقدية بشكل خاص حيث لا يوجد سجل بنكي" : "Especially for cash payments where there's no bank record"}</li>
            <li>{isAR ? "عند طلب العميل إثبات الدفع" : "When the client asks for proof of payment"}</li>
          </ul>

          <h2>{isAR ? "الفرق بين الإيصال والفاتورة" : "Receipt vs. invoice"}</h2>
          <p>
            {isAR
              ? "الفاتورة تُصدر قبل الدفع — تطلب من العميل أن يدفع. الإيصال يُصدر بعد الدفع — يثبت أن العميل قد دفع. الفاتورة تحتوي على مبلغ مستحق، بينما الإيصال يحتوي على مبلغ مدفوع وأي رصيد متبقٍ."
              : "An invoice is issued before payment — it asks the client to pay. A receipt is issued after payment — it confirms the client has paid. The invoice shows an amount due; the receipt shows an amount paid and any remaining balance."}
          </p>

          <h2>{isAR ? "الحقول الأساسية في الإيصال" : "Essential receipt fields"}</h2>
          <ul>
            {fields.map((f) => (<li key={f}>{f}</li>))}
          </ul>

          <h2>{isAR ? "أخطاء شائعة يجب تجنّبها" : "Common mistakes to avoid"}</h2>
          <ul>
            <li>{isAR ? "غياب رقم إيصال فريد للتتبع" : "Missing a unique receipt number for tracking"}</li>
            <li>{isAR ? "عدم ذكر طريقة الدفع" : "Not stating the payment method"}</li>
            <li>{isAR ? "خلط بين المبلغ المدفوع والمبلغ المستحق الكلي" : "Confusing amount paid with total amount due"}</li>
            <li>{isAR ? "عدم ربط الإيصال بفاتورة مرجعية" : "Not linking the receipt to a reference invoice"}</li>
            <li>{isAR ? "عدم إصدار إيصال للدفعات النقدية" : "Not issuing a receipt for cash payments"}</li>
          </ul>

          <h2>{isAR ? "كيف تساعدك Xuvilo" : "How Xuvilo helps"}</h2>
          <p>
            {isAR
              ? "مولّد الإيصالات في Xuvilo يجعل إصدار إيصال احترافي عملية في ثوانٍ. يدعم كل طرق الدفع، يحسب الرصيد المتبقي تلقائياً، ويصدر إيصالات بصيغة PDF يمكن إرسالها للعميل فوراً عبر البريد الإلكتروني أو واتساب."
              : "Xuvilo's receipt generator turns issuing a professional receipt into a seconds-long task. It supports all payment methods, calculates the remaining balance automatically, and exports PDF receipts you can send to a client instantly via email or WhatsApp."}
          </p>
        </article>

        <section className="my-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {isAR ? "جاهز لإصدار إيصالك؟" : "Ready to issue your receipt?"}
          </h2>
          <Button asChild size="lg"><Link href="/receipt">{isAR ? "افتح مولّد الإيصالات" : "Open Receipt Generator"}</Link></Button>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "أسئلة شائعة عن الإيصالات" : "Receipt FAQs"}
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
          <Link href="/quotation-guide" className="text-blue-600 hover:underline">{isAR ? "دليل عروض الأسعار" : "Quotation Guide"}</Link>
        </p>
      </div>
    </AppLayout>
  );
}
