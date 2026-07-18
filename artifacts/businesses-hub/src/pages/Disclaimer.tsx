import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";

export default function DisclaimerPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "إخلاء المسؤولية — Xuvilo" : "Disclaimer — Xuvilo"}
        description={
          isAR
            ? "إخلاء مسؤولية Xuvilo: أدوات الأعمال، القوالب، والحاسبات هي للأغراض العامة فقط ولا تُعدّ مشورة قانونية أو ضريبية أو محاسبية."
            : "Xuvilo disclaimer: our business tools, templates, and calculators are provided for general use only and do not constitute legal, tax, or accounting advice."
        }
        path="/disclaimer"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>{isAR ? "إخلاء المسؤولية" : "Disclaimer"}</h1>
          <p className="text-sm text-gray-500">
            {isAR ? "آخر تحديث: أبريل 2026" : "Last updated: April 2026"}
          </p>

          <h2>{isAR ? "1. الأدوات والقوالب للاستخدام العام" : "1. General-purpose tools and templates"}</h2>
          <p>
            {isAR
              ? "توفر Xuvilo أدوات أعمال عامة وقوالب مستندات (فواتير، عروض أسعار، إيصالات، حاسبات) مصمّمة لمساعدة الشركات الصغيرة والمستقلين على إنشاء مستنداتهم بسرعة. هذه الأدوات والقوالب للاستخدام العام، وقد لا تتوافق تلقائياً مع كل الأنظمة المحلية في كل دولة أو ولاية قضائية."
              : "Xuvilo provides general business tools and document templates (invoices, quotations, receipts, calculators) designed to help small businesses and freelancers create documents quickly. These tools and templates are for general use and may not automatically match every local regulation in every country or jurisdiction."}
          </p>

          <h2>{isAR ? "2. التحقق من المتطلبات المحلية" : "2. Verify local requirements"}</h2>
          <p>
            {isAR
              ? "أنت مسؤول عن التحقق من المتطلبات القانونية والضريبية والفوترة في بلدك. على سبيل المثال، قد تتطلب بعض الدول ميادين فاتورة محددة، أو رموز QR ضريبية، أو معدلات ضريبة محددة، أو تنسيقات اعتماد. تأكد دائماً من أن مستنداتك تلبي هذه المتطلبات قبل إصدارها لعميلك."
              : "You are responsible for verifying the legal, tax, and invoicing requirements in your own country. For example, some countries require specific invoice fields, tax QR codes, specific tax rates, or accreditation formats. Always make sure your documents meet these requirements before issuing them to a client."}
          </p>

          <h2>{isAR ? "3. الحاسبات تقدّم تقديرات فقط" : "3. Calculators provide estimates only"}</h2>
          <p>
            {isAR
              ? "تقدّم حاسبات Xuvilo (مثل ضريبة القيمة المضافة، هامش الربح، تحويل العملات، الشحن، الإجازة، العمل الإضافي، إلخ) نتائج تقديرية بناءً على المدخلات التي تقدّمها. هذه النتائج ليست مشورة مالية أو ضريبية أو قانونية. أسعار الصرف، معدلات الضريبة، والتكاليف تتغيّر بمرور الوقت — تحقق دائماً من المصدر الرسمي قبل اتخاذ قرارات أعمال مهمة."
              : "Xuvilo calculators (such as VAT, profit margin, currency exchange, shipping, leave, overtime, etc.) provide estimated results based on the inputs you give. These results are not financial, tax, or legal advice. Exchange rates, tax rates, and costs change over time — always confirm with an official source before making important business decisions."}
          </p>

          <h2>{isAR ? "4. القوالب قد تحتاج إلى تعديل" : "4. Templates may need adjustment"}</h2>
          <p>
            {isAR
              ? "قوالب المستندات لدينا للاستخدام العام وقد تحتاج إلى تخصيص لتتناسب مع علامتك التجارية، صناعتك، ولوائح بلدك. لا تعتبر القوالب بديلاً عن المشورة المحاسبية أو القانونية المخصّصة."
              : "Our document templates are for general use and may need to be customized to match your branding, industry, and country's regulations. Templates are not a substitute for tailored accounting or legal advice."}
          </p>

          <h2>{isAR ? "5. مسؤوليتك عن البيانات المُدخلة" : "5. Your responsibility for entered data"}</h2>
          <p>
            {isAR
              ? "أنت المسؤول الوحيد عن دقة البيانات التي تُدخلها في أدوات Xuvilo، بما في ذلك الأسماء، الأرقام، الأسعار، الكميات، نسب الضرائب، والخصومات. راجع كل مستند بعناية قبل إرساله أو طباعته أو مشاركته."
              : "You are solely responsible for the accuracy of the data you enter into Xuvilo's tools, including names, numbers, prices, quantities, tax rates, and discounts. Review every document carefully before sending, printing, or sharing it."}
          </p>

          <h2>{isAR ? "6. عدم تحمّل المسؤولية" : "6. No liability for losses"}</h2>
          <p>
            {isAR
              ? "Xuvilo ليست مسؤولة عن أي خسائر تجارية، أو غرامات، أو مطالبات تنشأ من إدخال بيانات غير صحيحة، أو سوء استخدام الأدوات، أو الاعتماد على نتائج الحاسبات دون التحقق منها."
              : "Xuvilo is not responsible for any business losses, penalties, or claims arising from incorrect data entry, misuse of the tools, or relying on calculator results without verifying them."}
          </p>

          <h2>{isAR ? "7. استشر متخصصاً عند الحاجة" : "7. Consult a qualified professional"}</h2>
          <p>
            {isAR
              ? "للأسئلة الجادة المتعلقة بالضرائب، المحاسبة، الفوترة، أو الامتثال القانوني، استشر دائماً محاسباً أو محامياً أو مستشاراً ضريبياً مؤهلاً في ولايتك القضائية."
              : "For serious questions about tax, accounting, invoicing, or legal compliance, always consult a qualified accountant, lawyer, or tax advisor in your jurisdiction."}
          </p>

          <h2>{isAR ? "8. التواصل" : "8. Contact"}</h2>
          <p>
            {isAR ? "للاستفسارات بخصوص هذا الإخلاء، راسلنا على " : "For questions about this disclaimer, email us at "}
            <a href="mailto:support@xuvilo.com">support@xuvilo.com</a>.
          </p>
        </article>
      </div>
    </AppLayout>
  );
}
