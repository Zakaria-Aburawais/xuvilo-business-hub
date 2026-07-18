import { useId, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

type DocType = "invoice" | "quotation" | "receipt";

interface Bi {
  en: string;
  ar: string;
}

interface Faq {
  q: Bi;
  a: Bi;
}

interface Content {
  introHeading: Bi;
  intro: Bi;
  howToHeading: Bi;
  steps: Bi[];
  includedHeading: Bi;
  items: Bi[];
  faqHeading: Bi;
  faqs: Faq[];
}

const FAQ_HEADING: Bi = { en: "Frequently asked questions", ar: "الأسئلة الشائعة" };

const CONTENT: Record<DocType, Content> = {
  invoice: {
    introHeading: { en: "About the invoice generator", ar: "عن مولّد الفواتير" },
    intro: {
      en: "Xuvilo's free invoice generator lets freelancers, small businesses and contractors create a professional, fully formatted invoice in under a minute — in Arabic or English, with proper right-to-left layout, support for 176+ currencies, and instant A4 PDF export. Everything runs in your browser, so your business and customer details stay on your device, and no account is needed for the core flow.",
      ar: "يتيح لك مولّد الفواتير المجاني من Xuvilo إنشاء فاتورة احترافية ومنسّقة بالكامل في أقل من دقيقة — بالعربية أو الإنجليزية، مع تخطيط صحيح من اليمين إلى اليسار، ودعم لأكثر من 176 عملة، وتصدير فوري بصيغة PDF بحجم A4. كل شيء يعمل داخل متصفحك، لذا تبقى بيانات عملك وعملائك على جهازك، ولا حاجة لإنشاء حساب لاستخدام الميزات الأساسية.",
    },
    howToHeading: { en: "How to create an invoice in three steps", ar: "كيفية إنشاء فاتورة في ثلاث خطوات" },
    steps: [
      {
        en: "Enter your business details, logo and tax number once — they are saved in your browser for next time.",
        ar: "أدخل بيانات عملك وشعارك ورقمك الضريبي مرة واحدة — تُحفظ في متصفحك للمرة القادمة.",
      },
      {
        en: "Add your client and line items. Quantity, unit price and tax update the totals automatically, and you can switch between Arabic and English at any moment.",
        ar: "أضف عميلك وبنود الفاتورة. تتحدّث الإجماليات تلقائياً حسب الكمية وسعر الوحدة والضريبة، ويمكنك التبديل بين العربية والإنجليزية في أي لحظة.",
      },
      {
        en: "Click “Download PDF” to get a print-ready A4 invoice you can email to your client or attach to your accounting system.",
        ar: "انقر على «تنزيل PDF» للحصول على فاتورة بحجم A4 جاهزة للطباعة يمكنك إرسالها لعميلك أو إرفاقها بنظامك المحاسبي.",
      },
    ],
    includedHeading: { en: "What's on every invoice", ar: "ما يتضمنه كل فاتورة" },
    items: [
      { en: "The word “Invoice” (or “فاتورة”) clearly displayed.", ar: "كلمة «فاتورة» (أو «Invoice») معروضة بوضوح." },
      { en: "A unique, sequential invoice number and the issue date.", ar: "رقم فاتورة فريد ومتسلسل وتاريخ الإصدار." },
      { en: "Your business name, address, logo and tax/VAT registration number.", ar: "اسم عملك وعنوانك وشعارك ورقم التسجيل الضريبي." },
      { en: "The customer's name, address and tax number where required.", ar: "اسم العميل وعنوانه ورقمه الضريبي عند الحاجة." },
      { en: "Itemised goods or services with quantity, unit price and line total.", ar: "بنود مفصّلة للسلع أو الخدمات مع الكمية وسعر الوحدة وإجمالي البند." },
      { en: "Per-line and overall tax, plus the grand total.", ar: "الضريبة لكل بند وإجمالاً، بالإضافة إلى المجموع الكلي." },
      { en: "Payment terms, accepted methods and the due date.", ar: "شروط الدفع وطرق الدفع المقبولة وتاريخ الاستحقاق." },
    ],
    faqHeading: FAQ_HEADING,
    faqs: [
      {
        q: { en: "Is the invoice generator really free?", ar: "هل مولّد الفواتير مجاني فعلاً؟" },
        a: {
          en: "Yes. You can create and download as many invoices as you want without an account or a payment method.",
          ar: "نعم. يمكنك إنشاء وتنزيل أي عدد من الفواتير دون حساب أو وسيلة دفع.",
        },
      },
      {
        q: { en: "Does it support Arabic?", ar: "هل يدعم اللغة العربية؟" },
        a: {
          en: "Yes — full right-to-left layout, Arabic-friendly fonts, Arabic numerals where appropriate, and a one-click language toggle.",
          ar: "نعم — تخطيط كامل من اليمين إلى اليسار، وخطوط مناسبة للعربية، وأرقام عربية عند الحاجة، وزر واحد لتبديل اللغة.",
        },
      },
      {
        q: { en: "Which currencies are supported?", ar: "ما العملات المدعومة؟" },
        a: {
          en: "176+ currencies including SAR, AED, EGP, USD, EUR and GBP — switch currency on a per-invoice basis.",
          ar: "أكثر من 176 عملة منها الريال السعودي والدرهم الإماراتي والجنيه المصري والدولار واليورو والجنيه الإسترليني — مع إمكانية تغيير العملة لكل فاتورة.",
        },
      },
      {
        q: { en: "Can I add my logo?", ar: "هل يمكنني إضافة شعاري؟" },
        a: {
          en: "Yes — upload a logo and it appears on every invoice you generate.",
          ar: "نعم — ارفع شعارك وسيظهر على كل فاتورة تنشئها.",
        },
      },
      {
        q: { en: "Can I save and edit invoices later?", ar: "هل يمكنني حفظ الفواتير وتعديلها لاحقاً؟" },
        a: {
          en: "Yes — create a free account to save documents, edit them later, and sync them across devices.",
          ar: "نعم — أنشئ حساباً مجانياً لحفظ المستندات وتعديلها لاحقاً ومزامنتها عبر أجهزتك.",
        },
      },
    ],
  },

  quotation: {
    introHeading: { en: "About the quotation generator", ar: "عن مولّد عروض الأسعار" },
    intro: {
      en: "Xuvilo's free quotation generator helps freelancers, agencies and suppliers send professional, branded quotes (also called estimates) in Arabic or English in under a minute. It supports 176+ currencies, includes validity dates and terms-and-conditions blocks, runs entirely in your browser, and exports a clean A4 PDF you can email straight to the customer.",
      ar: "يساعد مولّد عروض الأسعار المجاني من Xuvilo المستقلين والوكالات والموردين على إرسال عروض أسعار احترافية تحمل علامتهم التجارية (تُسمى أيضاً عروضاً تقديرية) بالعربية أو الإنجليزية في أقل من دقيقة. يدعم أكثر من 176 عملة، ويتضمن تواريخ صلاحية وبنود الشروط والأحكام، ويعمل بالكامل داخل متصفحك، ويصدّر ملف PDF بحجم A4 يمكنك إرساله مباشرة إلى العميل.",
    },
    howToHeading: { en: "How to create a quotation in three steps", ar: "كيفية إنشاء عرض سعر في ثلاث خطوات" },
    steps: [
      {
        en: "Enter your business details and logo once, then pick a template.",
        ar: "أدخل بيانات عملك وشعارك مرة واحدة، ثم اختر قالباً.",
      },
      {
        en: "Add the customer, your line items and your terms, and set a validity period so the offer doesn't stay open forever.",
        ar: "أضف العميل وبنودك وشروطك، وحدّد فترة صلاحية حتى لا يبقى العرض مفتوحاً إلى الأبد.",
      },
      {
        en: "Click “Download PDF” and email the quote. When the customer accepts, convert it into an invoice in seconds.",
        ar: "انقر على «تنزيل PDF» وأرسل العرض بالبريد. وعند قبول العميل، حوّله إلى فاتورة في ثوانٍ.",
      },
    ],
    includedHeading: { en: "What's on every quotation", ar: "ما يتضمنه كل عرض سعر" },
    items: [
      { en: "The word “Quotation”, “Estimate” or “عرض سعر” clearly displayed.", ar: "كلمة «عرض سعر» (أو «Quotation») معروضة بوضوح." },
      { en: "A unique quotation number and issue date.", ar: "رقم عرض فريد وتاريخ الإصدار." },
      { en: "A validity period so both sides know when the offer expires.", ar: "فترة صلاحية ليعرف الطرفان موعد انتهاء العرض." },
      { en: "Your business details, logo and contact information.", ar: "بيانات عملك وشعارك ومعلومات التواصل." },
      { en: "Itemised goods or services with quantity, unit price, taxes and discounts.", ar: "بنود مفصّلة للسلع أو الخدمات مع الكمية وسعر الوحدة والضرائب والخصومات." },
      { en: "Subtotal, tax, discounts and grand total.", ar: "المجموع الفرعي والضريبة والخصومات والمجموع الكلي." },
      { en: "Terms and conditions and a customer acceptance line.", ar: "الشروط والأحكام وسطر لموافقة العميل." },
    ],
    faqHeading: FAQ_HEADING,
    faqs: [
      {
        q: { en: "Is the quotation generator free?", ar: "هل مولّد عروض الأسعار مجاني؟" },
        a: {
          en: "Yes — create as many quotes as you want, in any of 176+ currencies, without an account.",
          ar: "نعم — أنشئ أي عدد من العروض بأي من أكثر من 176 عملة دون حساب.",
        },
      },
      {
        q: { en: "Does it support Arabic?", ar: "هل يدعم اللغة العربية؟" },
        a: {
          en: "Yes — full right-to-left layout, Arabic-friendly fonts and a one-click language toggle.",
          ar: "نعم — تخطيط كامل من اليمين إلى اليسار وخطوط مناسبة للعربية وزر واحد لتبديل اللغة.",
        },
      },
      {
        q: { en: "Can I add my own terms and conditions?", ar: "هل يمكنني إضافة شروطي وأحكامي؟" },
        a: {
          en: "Yes — write them once and Xuvilo can pre-fill them on every future quote.",
          ar: "نعم — اكتبها مرة واحدة ويمكن لـ Xuvilo تعبئتها تلقائياً في كل عرض مستقبلي.",
        },
      },
      {
        q: { en: "Can I convert a quote into an invoice?", ar: "هل يمكنني تحويل العرض إلى فاتورة؟" },
        a: {
          en: "Yes — when the customer accepts, open the quote and start a matching invoice with the same line items.",
          ar: "نعم — عند قبول العميل، افتح العرض وابدأ فاتورة مطابقة بنفس البنود.",
        },
      },
      {
        q: { en: "Does it work for international clients?", ar: "هل يعمل مع العملاء الدوليين؟" },
        a: {
          en: "Yes — pick any of 176+ currencies and totals are formatted correctly for your customer's market.",
          ar: "نعم — اختر أياً من أكثر من 176 عملة وتُنسّق الإجماليات بشكل صحيح لسوق عميلك.",
        },
      },
    ],
  },

  receipt: {
    introHeading: { en: "About the receipt generator", ar: "عن مولّد الإيصالات" },
    intro: {
      en: "Xuvilo's free receipt generator lets you issue a professional payment receipt in under a minute whenever a customer pays — full or partial, cash, card, bank transfer or digital wallet. It runs in your browser, supports 176+ currencies, lets you reference the underlying invoice or order, and exports a clean A4 PDF you can hand over or email immediately.",
      ar: "يتيح لك مولّد الإيصالات المجاني من Xuvilo إصدار إيصال دفع احترافي في أقل من دقيقة كلما دفع العميل — كاملاً أو جزئياً، نقداً أو بالبطاقة أو بالتحويل البنكي أو بالمحفظة الرقمية. يعمل داخل متصفحك، ويدعم أكثر من 176 عملة، ويتيح لك الإشارة إلى الفاتورة أو الطلب الأصلي، ويصدّر ملف PDF بحجم A4 يمكنك تسليمه أو إرساله بالبريد فوراً.",
    },
    howToHeading: { en: "How to create a receipt in three steps", ar: "كيفية إنشاء إيصال في ثلاث خطوات" },
    steps: [
      {
        en: "Confirm your business details — you only enter them once and they are saved in your browser.",
        ar: "أكّد بيانات عملك — تُدخلها مرة واحدة فقط وتُحفظ في متصفحك.",
      },
      {
        en: "Add the customer, the amount, the currency, the payment method and the invoice or order reference.",
        ar: "أضف العميل والمبلغ والعملة وطريقة الدفع ومرجع الفاتورة أو الطلب.",
      },
      {
        en: "Click “Download PDF” and email or hand the receipt to the customer immediately.",
        ar: "انقر على «تنزيل PDF» وأرسل الإيصال أو سلّمه للعميل فوراً.",
      },
    ],
    includedHeading: { en: "What's on every receipt", ar: "ما يتضمنه كل إيصال" },
    items: [
      { en: "The word “Receipt”, “Payment Receipt” or “إيصال” clearly displayed.", ar: "كلمة «إيصال» (أو «Receipt») معروضة بوضوح." },
      { en: "A unique receipt number and the date of payment.", ar: "رقم إيصال فريد وتاريخ الدفع." },
      { en: "Your business name, address, logo and tax number where required.", ar: "اسم عملك وعنوانك وشعارك ورقمك الضريبي عند الحاجة." },
      { en: "The customer's name.", ar: "اسم العميل." },
      { en: "The amount received, the currency and the payment method.", ar: "المبلغ المستلم والعملة وطريقة الدفع." },
      { en: "A reference to the underlying invoice or order, if any.", ar: "إشارة إلى الفاتورة أو الطلب الأصلي إن وُجد." },
      { en: "Any tax breakdown required by your local tax authority.", ar: "أي تفصيل ضريبي تتطلبه هيئة الضرائب المحلية." },
    ],
    faqHeading: FAQ_HEADING,
    faqs: [
      {
        q: { en: "Is the receipt generator free?", ar: "هل مولّد الإيصالات مجاني؟" },
        a: {
          en: "Yes — issue as many receipts as you want, in any of 176+ currencies, without an account.",
          ar: "نعم — أصدر أي عدد من الإيصالات بأي من أكثر من 176 عملة دون حساب.",
        },
      },
      {
        q: { en: "Does it support Arabic?", ar: "هل يدعم اللغة العربية؟" },
        a: {
          en: "Yes — full right-to-left layout, Arabic-friendly fonts and a one-click language toggle.",
          ar: "نعم — تخطيط كامل من اليمين إلى اليسار وخطوط مناسبة للعربية وزر واحد لتبديل اللغة.",
        },
      },
      {
        q: { en: "Can I issue a receipt for a partial payment?", ar: "هل يمكنني إصدار إيصال لدفعة جزئية؟" },
        a: {
          en: "Yes — enter the amount actually received and reference the original invoice so both sides have a clean record.",
          ar: "نعم — أدخل المبلغ المستلم فعلاً وأشر إلى الفاتورة الأصلية ليحتفظ الطرفان بسجل واضح.",
        },
      },
      {
        q: { en: "Can I add my logo?", ar: "هل يمكنني إضافة شعاري؟" },
        a: {
          en: "Yes — upload your logo and it appears on every receipt.",
          ar: "نعم — ارفع شعارك وسيظهر على كل إيصال.",
        },
      },
      {
        q: { en: "What if I need to reissue a receipt?", ar: "ماذا لو احتجت إعادة إصدار إيصال؟" },
        a: {
          en: "Create a free account to save documents and reissue them later from any device.",
          ar: "أنشئ حساباً مجانياً لحفظ المستندات وإعادة إصدارها لاحقاً من أي جهاز.",
        },
      },
    ],
  },
};

function pick(b: Bi, isAr: boolean): string {
  return isAr ? b.ar : b.en;
}

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const buttonId = `${baseId}-btn`;
  const panelId = `${baseId}-panel`;
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        id={buttonId}
        className="w-full text-start px-5 py-4 flex justify-between items-center gap-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium text-gray-900 dark:text-gray-100"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span>{q}</span>
        <span className="text-xl leading-none flex-shrink-0 text-blue-600" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="px-5 py-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-white dark:bg-gray-900 text-start"
        >
          {a}
        </div>
      )}
    </div>
  );
}

/**
 * FAQPage JSON-LD for a tool page, built from the SAME CONTENT[doc].faqs that
 * ToolSeoContent renders on-screen — so the structured data matches the visible
 * FAQ text exactly. Emitted client-side via SEOHead on the tool pages.
 */
export function toolFaqJsonLd(doc: DocType, isAr: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CONTENT[doc].faqs.map((f) => ({
      "@type": "Question",
      name: pick(f.q, isAr),
      acceptedAnswer: { "@type": "Answer", text: pick(f.a, isAr) },
    })),
  };
}

export function ToolSeoContent({ doc }: { doc: DocType }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const c = CONTENT[doc];

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="border-t border-gray-200 dark:border-gray-800 mt-4 text-start"
    >
      <section className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{pick(c.introHeading, isAr)}</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{pick(c.intro, isAr)}</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{pick(c.howToHeading, isAr)}</h2>
          <ol className="space-y-3 text-gray-600 dark:text-gray-300">
            {c.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{pick(s, isAr)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{pick(c.includedHeading, isAr)}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {c.items.map((it, i) => (
              <div
                key={i}
                className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <span className="text-emerald-500 font-bold text-lg flex-shrink-0">✓</span>
                <span className="text-gray-600 dark:text-gray-300 text-sm">{pick(it, isAr)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{pick(c.faqHeading, isAr)}</h2>
          <div className="space-y-2">
            {c.faqs.map((f, i) => (
              <AccordionItem key={i} q={pick(f.q, isAr)} a={pick(f.a, isAr)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
