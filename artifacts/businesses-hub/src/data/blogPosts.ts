export type BlogCategoryKey = "invoices" | "taxes" | "business" | "laws" | "tips";

export const BLOG_CATEGORIES: BlogCategoryKey[] = [
  "invoices",
  "taxes",
  "business",
  "laws",
  "tips",
];

export const BLOG_CATEGORY_LABELS: Record<BlogCategoryKey, { ar: string; en: string }> = {
  invoices: { ar: "الفواتير", en: "Invoices" },
  taxes: { ar: "الضرائب", en: "Taxes" },
  business: { ar: "الأعمال", en: "Business" },
  laws: { ar: "قوانين", en: "Laws" },
  tips: { ar: "نصائح", en: "Tips" },
};

export interface BlogPost {
  slug: string;
  titleAr: string;
  titleEn: string;
  /** Optional shorter SEO meta title (≤60 chars including brand suffix).
   *  When set, the rendered <title>/og:title use this string as-is instead
   *  of the visible H1 + " — Xuvilo" pattern. */
  metaTitleAr?: string;
  metaTitleEn?: string;
  excerptAr: string;
  excerptEn: string;
  date: string;
  readTime: number;
  category: BlogCategoryKey;
  keywordAr: string;
  keywordEn: string;
  relatedSlugs: string[];
  contentAr: string;
  contentEn: string;
  cover?: string;
}

export const BLOG_CATEGORY_COVERS: Record<BlogCategoryKey, string> = {
  invoices: "blog/cover-invoices.png",
  taxes: "blog/cover-taxes.png",
  business: "blog/cover-business.png",
  laws: "blog/cover-laws.png",
  tips: "blog/cover-tips.png",
};

export function getPostCover(post: BlogPost): string {
  return post.cover ?? BLOG_CATEGORY_COVERS[post.category];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "كيف-تصدر-فاتورة-ضريبية-في-ليبيا",
    cover: "blog/cover-libya-tax-invoice.png",
    titleAr: "كيف تصدر فاتورة ضريبية في ليبيا؟",
    titleEn: "How to Issue a Tax Invoice in Libya",
    excerptAr:
      "دليل شامل لإصدار الفواتير الضريبية في ليبيا، متطلبات مصلحة الضرائب، العملة الليبية، والحقول الإلزامية.",
    excerptEn:
      "A complete guide to issuing tax invoices in Libya — Tax Authority requirements, the Libyan dinar, and every mandatory field you need on the document.",
    date: "2026-04-01",
    readTime: 7,
    category: "invoices",
    keywordAr: "فاتورة ضريبية ليبيا",
    keywordEn: "Libya tax invoice",
    relatedSlugs: [
      "الفرق-بين-الفاتورة-وعرض-السعر",
      "انشاء-فاتورة-مجانية-اونلاين",
      "اخطاء-الفواتير-الشائعة",
    ],
    contentAr: `
## ما هي الفاتورة الضريبية في ليبيا؟

الفاتورة الضريبية في ليبيا هي مستند رسمي يُصدره البائع أو مقدم الخدمة لإثبات المعاملة التجارية وتحديد المبالغ المستحقة بما فيها الضرائب المقررة. تُعدّ الفاتورة الضريبية ركيزةً أساسية في المنظومة الضريبية الليبية التي تشرف عليها مصلحة الضرائب التابعة للحكومة الليبية.

في ظل التطورات الاقتصادية التي تشهدها ليبيا، باتت الفوترة المنظّمة ضرورةً قانونية لكل منشأة تجارية، سواء أكانت شركة كبرى أم مقاولاً مستقلاً.

## المتطلبات القانونية للفاتورة في ليبيا

### الحقول الإلزامية في الفاتورة الليبية

وفقاً للتشريعات الضريبية الليبية، يجب أن تشتمل الفاتورة الضريبية الصحيحة على البيانات التالية:

**١. بيانات البائع (مُصدر الفاتورة):**
- الاسم الكامل للشركة أو المنشأة
- العنوان التجاري الرسمي (المدينة، الشارع، الرمز البريدي إن وُجد)
- الرقم الضريبي الصادر من مصلحة الضرائب الليبية
- رقم التسجيل التجاري
- أرقام التواصل (هاتف، بريد إلكتروني)

**٢. بيانات المشتري (العميل):**
- اسم العميل أو الشركة
- عنوان العميل
- الرقم الضريبي للعميل (إن كان مسجلاً ضريبياً)

**٣. تفاصيل الفاتورة:**
- رقم الفاتورة (تسلسلي وفريد)
- تاريخ الإصدار
- وصف تفصيلي للسلع أو الخدمات
- الكميات والأسعار لكل بند
- نسبة الضريبة المطبقة على كل بند
- المجموع قبل الضريبة
- مبلغ الضريبة
- المجموع الكلي شاملاً الضريبة

### العملة المستخدمة

تُصدر الفواتير الليبية بالعملة الوطنية الدينار الليبي (LYD). وفي حالة المعاملات الدولية، يُسمح بإدراج قيمة مزدوجة بالعملات الأجنبية مع ذكر سعر الصرف المعتمد.

## الضرائب المطبقة في ليبيا

### ضريبة الدخل على الأنشطة التجارية

تفرض ليبيا ضريبة دخل على أرباح الشركات والمنشآت التجارية. تتراوح النسب بحسب حجم النشاط التجاري وطبيعة المنشأة. يُستحسن مراجعة مصلحة الضرائب الليبية دورياً لمعرفة أحدث النسب المعمول بها.

### ضريبة الدمغة

تُطبَّق ضريبة الدمغة على بعض العقود والمستندات التجارية. تحقق من تطبيقها على نشاطك التجاري تحديداً.

## خطوات إصدار الفاتورة الضريبية في ليبيا

**الخطوة الأولى:** جمع بيانات المنشأة قبل إصدار أي فاتورة، تأكد من توفر رقمك الضريبي الصادر من مصلحة الضرائب وسجلك التجاري ساري المفعول.

**الخطوة الثانية:** تحديد تفاصيل المعاملة سجّل جميع السلع أو الخدمات المقدمة مع الأسعار والكميات بدقة.

**الخطوة الثالثة:** احتساب الضرائب طبّق نسب الضريبة المناسبة على كل بند، واحتسب المجاميع بدقة.

**الخطوة الرابعة:** تعيين رقم تسلسلي للفاتورة يجب أن تكون أرقام الفواتير متسلسلة ولا تتكرر.

**الخطوة الخامسة:** الاحتفاظ بنسخ احتفظ بنسخة من كل فاتورة لمدة لا تقل عن خمس سنوات.

## نصائح عملية لأصحاب الأعمال في ليبيا

- **الرقمنة أفضل من الورق:** استخدام برامج الفوترة الإلكترونية يقلل الأخطاء
- **راجع النسب الضريبية دورياً:** التشريعات الضريبية قد تتغير، ابقَ على اطلاع
- **استشر محاسباً قانونياً:** لا سيما عند بدء النشاط التجاري أو عند التوسع
- **استخدم قالب موحداً:** القالب الموحد يضمن عدم نسيان أي حقل إلزامي

## مثال عملي: فاتورة لمقاول بناء ليبي

| البند | الكمية | السعر للوحدة (LYD) | الإجمالي |
|-------|--------|-------------------|---------|
| أعمال البناء | 1 | 45,000 | 45,000 |
| مواد البناء | 1 | 12,000 | 12,000 |
| **المجموع قبل الضريبة** | | | **57,000** |
| ضريبة الدخل (15%) | | | 8,550 |
| **الإجمالي النهائي** | | | **65,550** |

## كيف يساعدك Xuvilo في الفوترة الليبية؟

يوفر Xuvilo قوالب فواتير جاهزة باللغة العربية والإنجليزية، تدعم الدينار الليبي (LYD) وأكثر من 176 عملة عالمية. يمكنك:

- إدخال بيانات شركتك وحفظها تلقائياً
- إضافة بنود متعددة مع الضرائب تلقائياً
- تصدير الفاتورة بصيغة PDF احترافية
- مشاركتها مع عميلك عبر رابط مباشر أو واتساب

ابدأ الآن مجاناً بدون تسجيل — [أنشئ فاتورتك الليبية الأولى](/invoice?currency=LYD)
    `.trim(),
    contentEn: `
## What is a Tax Invoice in Libya?

A tax invoice in Libya is an official document issued by the seller or service provider to record a commercial transaction and the amounts due, including any applicable taxes. The tax invoice is a cornerstone of the Libyan tax system, which is supervised by the Libyan Tax Authority.

With the economic developments Libya is going through, structured invoicing has become a legal requirement for every business — from large companies to independent contractors.

## Legal Requirements for Invoices in Libya

### Mandatory Fields on a Libyan Invoice

Under Libyan tax legislation, a valid tax invoice must include the following information:

**1. Seller details (the issuer):**
- Full company or entity name
- Official commercial address (city, street, postal code if any)
- Tax number issued by the Libyan Tax Authority
- Commercial registration number
- Contact details (phone, email)

**2. Buyer details (the customer):**
- Client name or company
- Client address
- Client tax number (if tax-registered)

**3. Invoice details:**
- Invoice number (sequential and unique)
- Date of issue
- Detailed description of goods or services
- Quantity and price for each line item
- Tax rate applied to each line item
- Subtotal before tax
- Tax amount
- Grand total including tax

### Currency

Libyan invoices are issued in the national currency, the Libyan dinar (LYD). For international transactions, dual-currency values are allowed as long as the agreed exchange rate is shown.

## Taxes Applied in Libya

### Income Tax on Business Activity

Libya levies an income tax on the profits of companies and commercial entities. Rates vary by the size and type of activity. Always review the Libyan Tax Authority's published rates for the latest figures.

### Stamp Duty

Stamp duty applies to certain commercial contracts and documents. Check whether it applies to your specific business activity.

## Steps to Issue a Tax Invoice in Libya

**Step 1:** Gather your business details. Before issuing any invoice, make sure your tax number and commercial registration are valid and on hand.

**Step 2:** Capture the transaction. Record every product or service supplied with accurate prices and quantities.

**Step 3:** Calculate taxes. Apply the appropriate tax rate to each line item and compute totals carefully.

**Step 4:** Assign a sequential invoice number. Numbers must be sequential and never repeat.

**Step 5:** Keep copies. Retain a copy of every invoice for at least five years, on paper or electronically.

## Practical Tips for Business Owners in Libya

- **Digital beats paper:** Electronic invoicing tools reduce errors and create a safe archive.
- **Review tax rates regularly:** Tax rules change — stay informed.
- **Consult a chartered accountant:** Especially when starting out or expanding.
- **Use a unified template:** A standard template ensures no mandatory field is forgotten.

## Worked Example: A Libyan Contractor's Invoice

| Item | Qty | Unit price (LYD) | Total |
|------|-----|------------------|-------|
| Construction works | 1 | 45,000 | 45,000 |
| Building materials | 1 | 12,000 | 12,000 |
| **Subtotal** | | | **57,000** |
| Income tax (15%) | | | 8,550 |
| **Grand total** | | | **65,550** |

## How Xuvilo Helps with Libyan Invoicing

Xuvilo gives you ready-to-use invoice templates in Arabic and English, with support for the Libyan dinar (LYD) and 176+ global currencies. You can:

- Enter and auto-save your company details
- Add multiple line items with automatic tax handling
- Export to professional PDF
- Share with your client by direct link or WhatsApp

Start free, no signup needed — [create your first Libyan invoice](/invoice?currency=LYD).
    `.trim(),
  },

  {
    slug: "فاتورة-ضريبية-zatca-السعودية",
    cover: "blog/cover-zatca-ksa.png",
    titleAr: "كل ما تحتاج معرفته عن فاتورة زاتكا في السعودية",
    titleEn: "Complete Guide to ZATCA E-Invoicing in Saudi Arabia",
    metaTitleEn: "ZATCA Invoice Requirements Saudi Arabia 2026 | Xuvilo",
    excerptAr:
      "دليل شامل لنظام الفوترة الإلكترونية زاتكا في المملكة العربية السعودية، متطلبات المرحلة الأولى والثانية، رمز QR، والعقوبات.",
    excerptEn:
      "A complete guide to ZATCA e-invoicing in Saudi Arabia — Phase 1 and Phase 2 requirements, the QR code, and the penalties for non-compliance.",
    date: "2026-04-05",
    readTime: 9,
    category: "laws",
    keywordAr: "فاتورة زاتكا",
    keywordEn: "ZATCA e-invoice",
    relatedSlugs: [
      "كيف-تصدر-فاتورة-ضريبية-في-ليبيا",
      "ضريبة-القيمة-المضافة-الامارات",
      "اخطاء-الفواتير-الشائعة",
    ],
    contentAr: `
## نظام فاتورة زاتكا — الفوترة الإلكترونية في المملكة العربية السعودية

أطلقت هيئة الزكاة والضريبة والجمارك (زاتكا - ZATCA) نظام الفوترة الإلكترونية الإلزامي ليحلّ محل الفواتير الورقية التقليدية، وذلك في إطار رؤية المملكة 2030 لرقمنة الاقتصاد السعودي.

يُعدّ هذا النظام من أشمل منظومات الفوترة الإلكترونية في منطقة الشرق الأوسط وشمال أفريقيا، وقد أُلزمت جميع المنشآت الخاضعة لضريبة القيمة المضافة بتبنّيه.

## المرحلة الأولى من زاتكا (الإصدار)

### ما الذي طُبِّق في المرحلة الأولى؟

بدأت المرحلة الأولى في **4 ديسمبر 2021**، وتشمل:

**متطلبات الفاتورة الإلكترونية الأساسية:**
- إصدار الفواتير إلكترونياً بدلاً من الورق
- استخدام رمز QR (Quick Response Code) على كل فاتورة
- تضمين البيانات التالية في رمز QR:
  - اسم البائع
  - رقم السجل الضريبي (15 رقماً يبدأ بـ 3)
  - تاريخ ووقت الفاتورة
  - إجمالي الفاتورة شاملاً الضريبة
  - مبلغ ضريبة القيمة المضافة

**الفواتير المشمولة:**
- الفواتير الضريبية (B2B - بين الشركات)
- فواتير المبسطة (B2C - للأفراد) وتشمل رمز QR

### المرحلة الثانية (التكامل والربط)

بدأت المرحلة الثانية تدريجياً اعتباراً من **يناير 2023** وتشتمل على:
- ربط أنظمة الفوترة مباشرةً بمنصة زاتكا (Fatoora)
- إرسال الفواتير إلكترونياً للموافقة قبل تسليمها للعميل
- استخدام تنسيق XML أو PDF/A-3 المضمّن فيه XML
- توقيع رقمي إلزامي على كل فاتورة

## متطلبات رمز QR في فواتير زاتكا

يُشفَّر رمز QR في فواتير زاتكا وفق معيار TLV (Tag-Length-Value) مشفّراً بـ Base64. البيانات المطلوبة هي:

| الرقم | الحقل | الوصف |
|-------|-------|-------|
| 01 | اسم البائع | الاسم التجاري المسجل |
| 02 | الرقم الضريبي | 15 رقماً يبدأ بـ 3 |
| 03 | التاريخ والوقت | بتنسيق ISO 8601 |
| 04 | الإجمالي شاملاً الضريبة | بالريال السعودي |
| 05 | مبلغ الضريبة | بالريال السعودي |

## العقوبات على مخالفة نظام زاتكا

لا تتهاون زاتكا في تطبيق العقوبات على المخالفين:

**غرامات عدم الامتثال:**
- إصدار فاتورة ورقية بدلاً من إلكترونية: غرامة تبدأ من **5,000 ريال** وقد تصل إلى **50,000 ريال**
- عدم تضمين رمز QR: غرامة مالية
- التلاعب بالفواتير: عقوبات مشددة قد تصل للملاحقة القضائية

## خطوات الامتثال لزاتكا — دليل عملي

**الخطوة الأولى: التحقق من التسجيل** تأكد من تسجيلك في منظومة ضريبة القيمة المضافة وحصولك على رقم ضريبي صالح مؤلف من 15 رقماً.

**الخطوة الثانية: اختيار نظام فوترة متوافق** اختر برنامج فوترة يدعم متطلبات زاتكا ويولّد رمز QR الصحيح تلقائياً.

**الخطوة الثالثة: الاختبار والتطبيق** اختبر الفواتير على بيئة الاختبار (Sandbox) التي توفرها زاتكا قبل الإطلاق الفعلي.

**الخطوة الرابعة: الربط للمرحلة الثانية** إن كانت مؤسستك مشمولة بالمرحلة الثانية، تواصل مع زاتكا لبدء إجراءات الربط.

## ضريبة القيمة المضافة في السعودية — أساسيات

- **النسبة الحالية:** 15% (رُفعت من 5% في يوليو 2020)
- **حد التسجيل:** إيرادات تتجاوز 375,000 ريال سنوياً
- **حد التسجيل الاختياري:** 187,500 ريال
- **دورية الإقرارات:** شهرية للمنشآت الكبيرة، ربع سنوية للصغيرة

## كيف يدعم Xuvilo الامتثال لزاتكا؟

**✅ رمز QR متوافق مع زاتكا:**
- يولّد رمز QR بتنسيق TLV/Base64 الصحيح تلقائياً
- يظهر على الفاتورة في المعاينة وعند التصدير PDF

**✅ حقول زاتكا الإلزامية:**
- رقم التسجيل الضريبي (15 رقماً مع التحقق)
- تفاصيل البائع والمشتري الكاملة
- ضريبة القيمة المضافة 15% تلقائياً على المنتجات السعودية

**✅ مجاني وبدون تسجيل:** ابدأ الآن — [أنشئ فاتورة زاتكا مجاناً](/invoice?currency=SAR&zatca=1)
    `.trim(),
    contentEn: `
## ZATCA E-Invoicing — Electronic Invoicing in Saudi Arabia

The Zakat, Tax and Customs Authority (ZATCA) launched mandatory e-invoicing to replace traditional paper invoices, in line with the Kingdom's Vision 2030 to digitise the Saudi economy.

This is one of the most comprehensive e-invoicing programs in the MENA region, and every VAT-registered business is required to adopt it.

## ZATCA Phase 1 (Generation)

### What was rolled out in Phase 1?

Phase 1 went live on **4 December 2021** and includes:

**Core e-invoice requirements:**
- Issue invoices electronically instead of on paper
- Print a QR code on every invoice
- Encode the following data inside the QR code:
  - Seller name
  - Tax registration number (15 digits starting with 3)
  - Invoice date and time
  - Invoice total including VAT
  - VAT amount

**Invoices in scope:**
- Tax invoices (B2B)
- Simplified invoices (B2C) — must also include the QR code

### Phase 2 (Integration)

Phase 2 has been rolling out in waves since **January 2023** and adds:
- Direct integration of invoicing systems with the ZATCA platform (Fatoora)
- Electronic clearance of invoices before delivery to the customer
- XML format, or PDF/A-3 with embedded XML
- Mandatory digital signature on every invoice

## QR Code Requirements

ZATCA QR codes are encoded in TLV (Tag-Length-Value) format and Base64-encoded. The required fields are:

| Tag | Field | Description |
|-----|-------|-------------|
| 01 | Seller name | Registered trade name |
| 02 | Tax number | 15 digits starting with 3 |
| 03 | Date and time | ISO 8601 format |
| 04 | Total incl. VAT | In Saudi riyals |
| 05 | VAT amount | In Saudi riyals |

## Penalties for Non-Compliance

ZATCA enforces penalties strictly:

- Issuing a paper invoice instead of an electronic one: fine starting at **SAR 5,000** and up to **SAR 50,000**
- Missing QR code: monetary fine
- Tampering with invoices: severe penalties, potentially criminal prosecution

## Practical Steps to Become Compliant

**Step 1: Confirm your registration.** Make sure you're registered for VAT and hold a valid 15-digit tax number.

**Step 2: Pick a compliant invoicing tool** that supports ZATCA's rules and generates the correct QR code automatically.

**Step 3: Test in the sandbox.** ZATCA provides a sandbox environment — test there before going live.

**Step 4: Integrate for Phase 2** if your entity is in scope.

## Saudi VAT Basics

- **Current rate:** 15% (raised from 5% in July 2020)
- **Mandatory registration threshold:** Revenue above SAR 375,000 per year
- **Voluntary threshold:** SAR 187,500
- **Filing frequency:** Monthly for large businesses, quarterly for small

## How Xuvilo Helps with ZATCA Compliance

**✅ ZATCA-compliant QR code:** Generated automatically in correct TLV/Base64 format and shown both in the preview and on the exported PDF.

**✅ Required fields out of the box:** 15-digit tax number with validation, full seller and buyer details, automatic 15% VAT for Saudi documents.

**✅ Free, no signup:** Start now — [create a ZATCA invoice for free](/invoice?currency=SAR&zatca=1).
    `.trim(),
  },

  {
    slug: "كيف-تكتب-عرض-سعر-احترافي",
    cover: "blog/cover-quote-writing.png",
    titleAr: "كيف تكتب عرض سعر احترافي؟",
    titleEn: "How to Write a Professional Quotation",
    metaTitleEn: "Write a Professional Quotation | Free Template | Xuvilo",
    excerptAr:
      "دليل خطوة بخطوة لكتابة عرض سعر احترافي، ما يجب تضمينه، مدة الصلاحية، والشروط والأحكام.",
    excerptEn:
      "A step-by-step guide to writing a professional quotation: what to include, how to set the validity period, and which terms and conditions matter most.",
    date: "2026-04-08",
    readTime: 6,
    category: "business",
    keywordAr: "عرض سعر احترافي",
    keywordEn: "professional quotation",
    relatedSlugs: [
      "الفرق-بين-الفاتورة-وعرض-السعر",
      "نموذج-فاتورة-عربي-انجليزي",
      "فاتورة-المقاولين-والمستقلين",
    ],
    contentAr: `
## ما هو عرض السعر ولماذا يهمك؟

عرض السعر (Quotation أو Quote) هو مستند رسمي يُقدّمه البائع أو مقدم الخدمة للعميل المحتمل، ويتضمن تفاصيل السلع أو الخدمات المقترحة مع أسعارها. يختلف عرض السعر عن الفاتورة في أنه **مقترح وليس طلب دفع**، والعميل له حرية القبول أو الرفض.

عرض السعر الاحترافي يعكس مصداقية شركتك ويزيد فرص إتمام الصفقة.

## العناصر الأساسية في عرض السعر الاحترافي

### ١. ترويسة الشركة (Header)

- **شعار الشركة** (Logo)
- **اسم الشركة** الكامل
- **بيانات التواصل:** العنوان، الهاتف، البريد الإلكتروني، الموقع
- **رقم السجل التجاري** أو الرقم الضريبي إن وجد

### ٢. بيانات التعريف بعرض السعر

| الحقل | التفاصيل |
|-------|----------|
| رقم عرض السعر | رقم تسلسلي فريد مثل QT-2026-001 |
| تاريخ الإصدار | اليوم الذي أرسلته فيه للعميل |
| تاريخ انتهاء الصلاحية | عادةً 30 يوماً من الإصدار |
| مُقدَّم إلى | اسم العميل وبياناته |

### ٣. جدول البنود التفصيلية

\`\`\`
| البند | الوصف | الكمية | السعر | الإجمالي |
|-------|-------|--------|-------|---------|
| 1 | تصميم شعار | 1 | 500 | 500 |
| 2 | تصميم هوية بصرية | 1 | 1,500 | 1,500 |
\`\`\`

**نصيحة مهمة:** كن تفصيلياً في الوصف. "تصميم موقع إلكتروني" أضعف من "تصميم موقع متجاوب بـ 5 صفحات بلوحة تحكم WordPress مع شهر دعم فني."

### ٤. المجاميع والضرائب

- المجموع قبل الضريبة
- نسبة الضريبة (VAT/GST) إن وُجدت
- أي خصومات
- **الإجمالي النهائي** بالخط الثقيل

### ٥. مدة الصلاحية (Validity Period)

> "هذا العرض ساري المفعول لمدة 30 يوماً من تاريخ الإصدار"

### ٦. الشروط والأحكام

- **شروط الدفع:** هل مقدم؟ 50/50؟ عند الاستلام؟
- **وقت التسليم:** التاريخ المتوقع للإنجاز
- **نطاق العمل:** ما المشمول وما غير المشمول
- **تعديلات إضافية:** رسوم أي تغييرات خارج الاتفاق الأصلي
- **الضمان:** مدة الضمان إن وُجد

### ٧. التوقيع وقبول العرض

أضف حقلاً للعميل ليوقّع قبوله. هذا يحوّل عرض السعر إلى اتفاقية ملزمة.

## أخطاء شائعة في عروض الأسعار

**❌ إغفال تاريخ الانتهاء** — قد يعود العميل بعد عام يطالبك بنفس السعر.

**❌ الأسعار المبهمة** — "حوالي 5,000 دولار" ليست سعراً.

**❌ نسيان الضرائب** — إن كتبت السعر صافياً، وضّح ذلك صراحة.

**❌ عدم متابعة عرض السعر** — تابع بعد 3-5 أيام.

## نموذج عرض سعر احترافي — مثال عملي

\`\`\`
شركة تِك بلس للتقنية
عرض سعر رقم: QT-2026-042
تاريخ الإصدار: 2026-04-10
صالح حتى: 2026-05-10
مقدم إلى: شركة النجاح للتجارة

البنود:
1. تصميم تجربة المستخدم (UI/UX): 3,000 ر.س
2. تطوير تطبيق iOS + Android: 18,000 ر.س
3. تكامل API مع نظام ERP: 4,500 ر.س
4. الاختبار والإطلاق: 2,500 ر.س

المجموع: 28,000 ر.س
ضريبة القيمة المضافة (15%): 4,200 ر.س
الإجمالي: 32,200 ر.س
\`\`\`

## أنشئ عرض سعرك الآن مجاناً

[جرّب منشئ عروض الأسعار](/quotation) في Xuvilo مجاناً، بدون تسجيل، مع تصدير PDF فوري.
    `.trim(),
    contentEn: `
## What Is a Quotation and Why Does It Matter?

A quotation (or quote) is a formal document the seller or service provider gives to a prospective client, listing the proposed goods or services and their prices. Unlike an invoice, a quotation is **a proposal, not a payment request** — the client is free to accept or decline.

A professional quotation signals credibility and improves your chances of winning the deal.

## Core Elements of a Professional Quotation

### 1. Company header

- **Company logo**
- **Full company name**
- **Contact details:** address, phone, email, website
- **Commercial registration** or tax number if any

### 2. Quotation metadata

| Field | Details |
|-------|---------|
| Quotation number | A unique sequential number, e.g. QT-2026-001 |
| Issue date | The day you send it |
| Valid until | Usually 30 days from issue |
| Prepared for | Client name and details |

### 3. Detailed line item table

\`\`\`
| # | Description | Qty | Price | Total |
|---|-------------|-----|-------|-------|
| 1 | Logo design | 1 | 500 | 500 |
| 2 | Brand identity | 1 | 1,500 | 1,500 |
\`\`\`

**Tip:** be specific. "Website design" is weaker than "Responsive 5-page website on WordPress CMS with 1 month of technical support."

### 4. Totals and taxes

- Subtotal before tax
- Tax rate (VAT/GST) if any
- Any discounts
- **Final total** in bold

### 5. Validity period

> "This quotation is valid for 30 days from the issue date."

This protects you from price fluctuations and nudges the client to decide.

### 6. Terms and conditions

- **Payment terms:** Upfront? 50/50? On delivery?
- **Delivery time:** Expected completion date
- **Scope of work:** What's included and what isn't
- **Change requests:** Fees for anything outside the original scope
- **Warranty:** Duration if applicable

### 7. Signature and acceptance

Add a signature line so the client can accept the quote — this turns it into a binding agreement.

## Common Quotation Mistakes

**❌ No expiry date** — the client could come back a year later quoting the same price.

**❌ Vague pricing** — "around 5,000 USD" is not a price.

**❌ Forgetting taxes** — if the price is net, say so explicitly.

**❌ No follow-up** — chase after 3–5 days.

## Sample Professional Quotation

\`\`\`
TechPlus Technology Co.
Quotation No: QT-2026-042
Issue date: 2026-04-10
Valid until: 2026-05-10
Prepared for: Success Trading Co.

Line items:
1. UI/UX design — 4 main screens: SAR 3,000
2. iOS + Android app development: SAR 18,000
3. ERP API integration: SAR 4,500
4. Testing and launch: SAR 2,500

Subtotal: SAR 28,000
VAT (15%): SAR 4,200
Total: SAR 32,200
\`\`\`

## Build Your Quotation for Free

You can create a professional quotation with no technical or accounting background — [try the quotation builder](/quotation) on Xuvilo for free, no signup, with instant PDF export.
    `.trim(),
  },

  {
    slug: "الفرق-بين-الفاتورة-وعرض-السعر",
    cover: "blog/cover-invoice-vs-quote.png",
    titleAr: "ما الفرق بين الفاتورة وعرض السعر؟",
    titleEn: "Invoice vs Quotation — What's the Difference?",
    metaTitleEn: "Invoice vs Quotation: Key Differences | Xuvilo",
    excerptAr:
      "شرح واضح مع أمثلة عملية للفرق بين الفاتورة وعرض السعر، متى تستخدم كل منهما في سياق الأعمال العربية.",
    excerptEn:
      "A clear, example-driven explanation of how invoices and quotations differ, and when to use each one in your business.",
    date: "2026-04-10",
    readTime: 5,
    category: "business",
    keywordAr: "الفرق بين الفاتورة وعرض السعر",
    keywordEn: "invoice vs quotation",
    relatedSlugs: [
      "كيف-تكتب-عرض-سعر-احترافي",
      "انشاء-فاتورة-مجانية-اونلاين",
      "فاتورة-المقاولين-والمستقلين",
    ],
    contentAr: `
## الفاتورة وعرض السعر — الفرق الجوهري

يخلط كثير من أصحاب الأعمال الصغيرة والمستقلين بين الفاتورة (Invoice) وعرض السعر (Quotation)، مما يؤدي إلى نزاعات تجارية ومشكلات قانونية يمكن تجنبها بسهولة.

**الفرق الجوهري في جملة واحدة:**
- **عرض السعر:** "هذا ما سأقدمه لك بهذا السعر — هل تقبل؟"
- **الفاتورة:** "لقد قدمتُ لك هذا — يُرجى الدفع."

## مقارنة تفصيلية: الفاتورة vs عرض السعر

| المعيار | الفاتورة | عرض السعر |
|---------|---------|-----------|
| **التوقيت** | بعد تقديم الخدمة أو تسليم المنتج | قبل البدء في العمل |
| **الهدف** | طلب الدفع | اقتراح السعر |
| **الإلزامية** | ملزمة قانونياً | غير ملزمة (قابلة للتفاوض) |
| **الصلاحية** | لا تنتهي | تنتهي (عادةً 30 يوماً) |
| **يُستدل بها** | في المحاكم والنزاعات | لإبرام العقد عند القبول |
| **الرقم الضريبي** | إلزامي عادةً | اختياري في الغالب |

## متى أستخدم عرض السعر؟

**١. يسألك العميل "بكم هذا؟" قبل الاتفاق** — لا تعطِ سعراً شفهياً يمكن نسيانه.

**٢. المشاريع الكبيرة والمعقدة** — توثيق كل بند أكثر أهمية.

**٣. التفاوض على السعر** — عرض السعر يفتح باب التفاوض.

**٤. المناقصات الرسمية (Tenders)** — تشترط المناقصات الحكومية تقديم عروض أسعار رسمية.

## متى أستخدم الفاتورة؟

**١. أتممتَ العمل أو سلّمتَ البضاعة.**

**٢. تحتاج لتسجيل المعاملة ضريبياً.**

**٣. الدفع المسبق (Advance Payment)** — أصدر فاتورة دفعة مقدمة.

**٤. دفعات جزئية** — للمشاريع الطويلة، أصدر فاتورة عند كل مرحلة.

## مثال عملي: مصمم جرافيك مستقل

**المرحلة الأولى — عرض السعر:**
العميل يطلب تصميم هوية بصرية. يُرسل المصمم عرض سعر يتضمن:
- تصميم شعار: 800 دولار
- بطاقة أعمال: 200 دولار
- ورق رسائل: 150 دولار
- صالح لمدة 30 يوماً

**المرحلة الثانية — الفاتورة:**
بعد تسليم الهوية البصرية الكاملة، يُصدر المصمم فاتورة بقيمة 1,150 دولار.

## الإيصال (Receipt) — ثالث الثلاثي

- **الإيصال** يُصدر بعد **استلام الدفع**
- يُثبت أن العميل دفع فعلاً
- لا يُغني الإيصال عن الفاتورة في السجلات الضريبية

| المستند | متى؟ | لماذا؟ |
|---------|------|--------|
| عرض السعر | قبل العمل | للاتفاق على السعر |
| الفاتورة | بعد العمل | لطلب الدفع |
| الإيصال | بعد الدفع | لإثبات الاستلام |

## مواقف عملية: متى تستخدم أيّ مستند؟

| السيناريو | عرض سعر | فاتورة | إيصال |
|----------|---------|--------|-------|
| تاجر مواد بناء يطلب زبون عرضاً لكميات ضخمة | ✅ ابدأ هنا | بعد التسليم | بعد الدفع |
| مستقل تصميم ينفّذ عملاً صغيراً معروف السعر | غير ضروري | ✅ مباشرة | بعد التحويل |
| مقاول يعمل بدفعات على مراحل | ✅ للنطاق الكامل | فاتورة لكل مرحلة | إيصال لكل دفعة |
| صاحب متجر إلكتروني يبيع منتجاً جاهزاً | غير ضروري | ✅ تلقائياً مع الطلب | تأكيد الدفع |
| مستشار يقدّم اشتراكاً شهرياً | ✅ مرة واحدة في البداية | شهرية متكررة | شهرياً مع الإيصال |

## أمثلة من ثلاث مهن مختلفة

### مقاول صيانة كهربائية

يصل إلى موقع الزبون، يعاين العمل، ثم يُرسل عرض سعر يفصّل: قطع الغيار، ساعات العمل، وفترة الضمان. بعد إنجاز العمل تتحوّل البنود نفسها إلى فاتورة، ثم يُسلَّم إيصال نقدي عند تحصيل المبلغ.

### تاجر جملة

يطلب الزبون عرضاً للكمية والسعر والشحن. يُرسل التاجر عرضاً ساري المفعول 14 يوماً بسبب تقلّب الأسعار. عند موافقة الزبون يُحوَّل العرض إلى فاتورة، وتُسجَّل ضمن المخزون والمحاسبة.

### مستقل ترجمة

يستلم نصاً، يقدّر عدد الكلمات والوقت، ثم يُرسل عرضاً مختصراً. للأعمال المتكررة مع نفس العميل قد يُلغي عرض السعر ويعتمد على فاتورة شهرية مباشرة.

## أخطاء شائعة عند الخلط بين المستندين

- إصدار فاتورة قبل بدء العمل ثم استخدامها كأنها عرض — يُسبّب التزاماً ضريبياً قبل التحصيل.
- اعتبار عرض السعر عقداً ملزماً دون توقيع العميل عليه.
- عدم تحديث رقم العرض إلى رقم فاتورة منفصل عند التحويل.

## أسئلة شائعة (FAQ)

**هل يتحوّل عرض السعر تلقائياً إلى فاتورة؟**
لا. يجب إصدار فاتورة جديدة برقم تسلسلي مستقل، حتى لو كانت البنود متطابقة.

**هل يمكن أن يكون السعر في الفاتورة مختلفاً عن عرض السعر؟**
نعم إن وافق الطرفان كتابياً، أو إذا تغيّر النطاق، أو انتهت صلاحية العرض. يُفضَّل توثيق التغيير برسالة.

**هل عرض السعر إلزامي للأعمال الصغيرة؟**
ليس قانونياً في معظم الدول، لكنه عملياً ضروري لأي مشروع تتجاوز قيمته يوم عمل واحد، لتفادي النزاعات.

**ما الفرق بين عرض السعر والفاتورة المبدئية (Proforma)؟**
الفاتورة المبدئية أقرب لعرض سعر بصيغة فاتورة وتُستخدم غالباً للجمارك والاستيراد، بينما عرض السعر هو مستند تفاوضي.

**أين أحفظ كل هذه المستندات؟**
استخدم [القوالب الجاهزة](/templates) للحصول على تنسيق موحّد، وأنشئ ملفات منفصلة لكل عميل بأرقام تسلسلية واضحة.

## أنشئ مستنداتك بشكل احترافي

- [فاتورة احترافية بالعربي والإنجليزي](/invoice)
- [عرض سعر مميز مع مدة صلاحية](/quotation)
- [إيصال دفع فوري](/receipt)
    `.trim(),
    contentEn: `
## Invoice vs Quotation — The Core Difference

Many small business owners and freelancers mix up invoices and quotations, which leads to commercial disputes and legal headaches that are easy to avoid.

**The difference in one line:**
- **Quotation:** "Here's what I'll deliver, at this price — do you accept?"
- **Invoice:** "I've delivered this — please pay."

## Detailed Comparison: Invoice vs Quotation

| Criterion | Invoice | Quotation |
|-----------|---------|-----------|
| **Timing** | After delivery of goods/services | Before work starts |
| **Purpose** | Request payment | Propose a price |
| **Binding?** | Legally binding | Not binding (negotiable) |
| **Validity** | Doesn't expire | Expires (usually 30 days) |
| **Used as evidence** | In court and disputes | To form a contract once accepted |
| **Tax number** | Usually mandatory | Often optional |

## When to Use a Quotation

**1. The client asks "how much?"** — never give a verbal price that can be forgotten or denied.

**2. Large or complex projects** — the bigger the project, the more important it is to document each line.

**3. Price negotiation** — a quotation opens the door for back-and-forth.

**4. Formal tenders** — government and large enterprise tenders require official quotations.

## When to Use an Invoice

**1. You've delivered the work** — the invoice proves you fulfilled what was agreed.

**2. You need to record the transaction for tax purposes.**

**3. Advance payment** — issue an advance-payment invoice if you require a deposit.

**4. Milestone payments** — for long projects, invoice at each completed milestone.

## A Practical Example: Freelance Graphic Designer

**Phase 1 — Quotation:**
The client asks for brand identity design. The designer sends a quotation with:
- Logo design: USD 800
- Business cards: USD 200
- Letterhead: USD 150
- Valid 30 days

The client signs. The quotation now anchors the contract.

**Phase 2 — Invoice:**
After delivering the full identity, the designer issues an invoice for USD 1,150 (less any deposit already paid).

## Receipts — The Third Document

- A **receipt** is issued **after payment is received**
- It proves the client actually paid
- A receipt does not replace an invoice in tax records

| Document | When? | Why? |
|----------|-------|------|
| Quotation | Before the work | Agree on the price |
| Invoice | After the work | Request payment |
| Receipt | After payment | Confirm receipt of funds |

## Practical Scenarios: Which Document, When?

| Scenario | Quotation | Invoice | Receipt |
|----------|-----------|---------|---------|
| A building-materials trader is asked for a bulk price | ✅ start here | After delivery | After payment |
| A designer doing a small fixed-price job | Not needed | ✅ direct | After transfer |
| A contractor working in milestones | ✅ for full scope | One per milestone | One per payment |
| An e-commerce store selling stock items | Not needed | ✅ on order | Payment confirmation |
| A consultant on a monthly retainer | ✅ once at start | Monthly recurring | Monthly with receipt |

## Examples From Three Different Trades

### Electrical maintenance contractor

Visits the site, inspects the job, then sends a quote that itemises spare parts, labour hours and the warranty period. Once the work is done, the same lines become an invoice, and a paper receipt is handed over when cash changes hands.

### Wholesale trader

The buyer asks for a quote covering price, quantity and shipping. The trader sends one valid for 14 days because raw-material prices move quickly. When the buyer agrees, the quote is converted into an invoice and recorded in stock and bookkeeping.

### Freelance translator

Receives a text, estimates word count and turnaround, then sends a short quote. For repeat clients the freelancer often skips the quote stage and works straight from a monthly invoice.

## Common Mistakes Mixing the Two

- Issuing an invoice before work starts and using it as a "quote" — this creates a tax obligation before any money is collected.
- Treating an unsigned quotation as a binding contract.
- Forgetting to give the invoice a brand-new sequential number once the quote is accepted.

## Frequently Asked Questions

**Does a quotation automatically become an invoice?**
No. A new invoice with its own sequential number must be issued, even if every line item is identical.

**Can the invoice price differ from the quote?**
Yes, if both parties agree in writing, the scope changes, or the quote has expired. Document the change in a short email.

**Are quotations mandatory for small businesses?**
Rarely required by law, but in practice they are essential for any project worth more than a day's work — they prevent disputes.

**What's the difference between a quotation and a proforma invoice?**
A proforma is a quotation styled as an invoice and is mostly used for customs and import paperwork, whereas a quotation is a negotiation tool.

**Where should I keep all these documents?**
Use the [ready-made templates](/templates) for consistent formatting, and keep one folder per client with clear sequential numbering.

## Create Your Documents Professionally

- [Professional invoice in Arabic and English](/invoice)
- [Polished quotation with validity period](/quotation)
- [Instant payment receipt](/receipt)

All templates are free and no signup is required.
    `.trim(),
  },

  {
    slug: "ضريبة-القيمة-المضافة-الامارات",
    cover: "blog/cover-uae-vat.png",
    titleAr: "دليل ضريبة القيمة المضافة في الإمارات للشركات الصغيرة",
    titleEn: "UAE VAT Guide for Small Businesses",
    metaTitleAr: "دليل ضريبة القيمة المضافة في الإمارات | Xuvilo",
    excerptAr:
      "كل ما تحتاج معرفته عن ضريبة القيمة المضافة 5% في الإمارات، رقم TRN، متطلبات هيئة الضرائب FTA، وكيفية إدراجها في فواتيرك.",
    excerptEn:
      "Everything you need to know about UAE 5% VAT — TRN registration, FTA requirements, and how to include VAT correctly on every invoice you issue.",
    date: "2026-04-12",
    readTime: 8,
    category: "taxes",
    keywordAr: "ضريبة القيمة المضافة الإمارات",
    keywordEn: "UAE VAT",
    relatedSlugs: [
      "فاتورة-ضريبية-zatca-السعودية",
      "اخطاء-الفواتير-الشائعة",
      "انشاء-فاتورة-مجانية-اونلاين",
    ],
    contentAr: `
## ضريبة القيمة المضافة في الإمارات — لمحة شاملة

طبّقت دولة الإمارات العربية المتحدة ضريبة القيمة المضافة (VAT) في **الأول من يناير 2018** بنسبة **5%**، لتصبح بذلك إلى جانب المملكة العربية السعودية من أوائل دول الخليج في تطبيق هذه الضريبة.

يُشرف على الضريبة في الإمارات **الهيئة الاتحادية للضرائب (FTA — Federal Tax Authority)**، وتخضع كل المنشآت التجارية المسجلة ضريبياً لمتطلباتها.

## من يجب عليه التسجيل في ضريبة القيمة المضافة؟

### التسجيل الإلزامي

- **إجمالي الإمدادات الخاضعة للضريبة** خلال 12 شهراً يتجاوز **375,000 درهم إماراتي**
- أو يُتوقع أن يتجاوز هذا المبلغ خلال الـ 30 يوماً القادمة

### التسجيل الاختياري

يُمكنك التسجيل طوعياً إذا كانت إمداداتك تتجاوز **187,500 درهم** سنوياً.

### من هم المعفيون؟

- المنشآت الصغيرة التي لا تبلغ العتبة
- بعض القطاعات كالرعاية الصحية والتعليم (معفاة أو بنسبة صفر)

## رقم TRN — ما هو وكيف تحصل عليه؟

رقم **TRN (Tax Registration Number)** هو الرقم الضريبي الذي تُصدره هيئة الضرائب الإماراتية عند التسجيل. يتكون من **15 رقماً** وهو إلزامي على جميع الفواتير الضريبية.

### خطوات التسجيل والحصول على TRN:

1. زيارة بوابة هيئة الضرائب: [uaefta.gov.ae](https://www.uaefta.gov.ae)
2. إنشاء حساب في البوابة الإلكترونية (EmaraTax)
3. تقديم طلب التسجيل مع المستندات المطلوبة:
   - رخصة تجارية سارية
   - جوازات سفر الشركاء/المديرين
   - كشوف حسابات بنكية
   - إثبات عنوان تجاري
4. الانتظار 20 يوم عمل للحصول على رقم TRN

## متطلبات فاتورة ضريبة القيمة المضافة الإماراتية

**البيانات الإلزامية:**
- ✅ كلمة "فاتورة ضريبية" أو "Tax Invoice" بشكل واضح
- ✅ تاريخ الإصدار
- ✅ رقم الفاتورة التسلسلي الفريد
- ✅ اسم المورد وعنوانه و**رقم TRN**
- ✅ اسم العميل وعنوانه (ورقم TRN للعميل في معاملات B2B)
- ✅ وصف السلع أو الخدمات
- ✅ الكمية والسعر لكل بند
- ✅ نسبة الضريبة لكل بند (5% أو معفي أو صفر)
- ✅ مبلغ الضريبة لكل بند
- ✅ الإجمالي بدون ضريبة
- ✅ إجمالي مبلغ الضريبة
- ✅ المبلغ الإجمالي شاملاً الضريبة

**العملة:** بالدرهم الإماراتي (AED). إذا استخدمت عملة أجنبية، وضّح سعر الصرف.

## احتساب ضريبة القيمة المضافة 5% — أمثلة

### مثال 1: خدمات استشارية

| البند | المبلغ (AED) |
|-------|------------|
| رسوم الاستشارة | 10,000 |
| VAT 5% | 500 |
| **الإجمالي** | **10,500** |

### مثال 2: بيع بضاعة مختلطة (بعضها معفى)

| البند | المبلغ | الضريبة |
|-------|--------|---------|
| منتجات غذائية (معفى) | 2,000 | 0 |
| إلكترونيات (5%) | 5,000 | 250 |
| **الإجمالي** | **7,000** | **250** |

## الإقرارات الضريبية VAT Return

- **الشركات الكبيرة:** شهرياً
- **الشركات المتوسطة والصغيرة:** كل 3 أشهر (ربع سنوي)

**المهلة:** خلال 28 يوماً من نهاية الفترة الضريبية.

**العقوبات:**
- التأخر في التقديم: 1,000 درهم (1,500 درهم للمرة الثانية)
- أخطاء في الإقرار: نسبة مئوية من الضريبة غير المسددة

## أنشئ فواتير VAT إماراتية بسهولة

في Xuvilo، يمكنك إنشاء فواتير ضريبية متوافقة مع متطلبات FTA الإماراتية بضغطة زر. الدرهم الإماراتي (AED) متاح مع تطبيق VAT 5% تلقائياً.

[أنشئ فاتورتك الإماراتية الآن](/invoice?currency=AED)
    `.trim(),
    contentEn: `
## UAE VAT — A Comprehensive Overview

The United Arab Emirates introduced Value Added Tax (VAT) on **1 January 2018** at a rate of **5%**, making it (alongside Saudi Arabia) one of the first GCC countries to apply VAT.

VAT in the UAE is overseen by the **Federal Tax Authority (FTA)**, and every tax-registered business must comply with its requirements.

## Who Has to Register for VAT?

### Mandatory registration

- **Taxable supplies over 12 months exceed AED 375,000**
- Or are expected to exceed that amount in the next 30 days

### Voluntary registration

You may register voluntarily if your supplies exceed **AED 187,500** per year. Voluntary registration is useful if you want to recover input VAT.

### Who's exempt?

- Small businesses below the threshold
- Certain sectors such as healthcare and education (exempt or zero-rated)

## TRN — What It Is and How to Get One

The **TRN (Tax Registration Number)** is the tax number issued by the FTA when you register. It is **15 digits long** and is mandatory on every tax invoice.

### Registration steps:

1. Visit the FTA portal: [uaefta.gov.ae](https://www.uaefta.gov.ae)
2. Create an EmaraTax account
3. Submit your registration with supporting documents:
   - Valid trade licence
   - Passports of partners/managers
   - Bank statements proving activity
   - Proof of commercial address
4. Wait around 20 working days to receive your TRN

## UAE VAT Invoice Requirements

**Mandatory fields:**
- ✅ The words "Tax Invoice" clearly visible
- ✅ Issue date
- ✅ Unique sequential invoice number
- ✅ Supplier name, address and **TRN**
- ✅ Customer name and address (and TRN for B2B)
- ✅ Description of goods or services
- ✅ Quantity and price per line
- ✅ Tax rate per line (5%, exempt, or zero)
- ✅ Tax amount per line
- ✅ Total before tax
- ✅ Total tax amount
- ✅ Grand total including tax

**Currency:** AED (UAE dirham). If you use a foreign currency, also show the exchange rate.

## Calculating 5% VAT — Examples

### Example 1: Consulting services

| Line | Amount (AED) |
|------|--------------|
| Consulting fee | 10,000 |
| VAT 5% | 500 |
| **Total** | **10,500** |

### Example 2: Mixed sale (some exempt items)

| Line | Amount | Tax |
|------|--------|-----|
| Food products (exempt) | 2,000 | 0 |
| Electronics (5%) | 5,000 | 250 |
| **Total** | **7,000** | **250** |

## VAT Returns

- **Large businesses:** monthly
- **Small/medium businesses:** quarterly

**Deadline:** within 28 days of the end of the tax period.

**Penalties:**
- Late filing: AED 1,000 (AED 1,500 for the second offence)
- Errors in the return: a percentage of the unpaid tax

## Issue UAE VAT Invoices Easily

With Xuvilo you can create FTA-compliant tax invoices in one click. The UAE dirham (AED) is supported with 5% VAT applied automatically on UAE documents.

[Create your UAE invoice now](/invoice?currency=AED)
    `.trim(),
  },

  {
    slug: "انشاء-فاتورة-مجانية-اونلاين",
    cover: "blog/cover-free-online-invoice.png",
    titleAr: "كيف تنشئ فاتورة مجانية أونلاين بدون تسجيل؟",
    titleEn: "How to Create a Free Online Invoice — Step by Step",
    excerptAr:
      "دليل خطوة بخطوة لإنشاء فاتورة احترافية مجاناً عبر الإنترنت بدون تسجيل أو دفع، مع تصدير PDF فوري.",
    excerptEn:
      "A step-by-step walkthrough for creating a professional invoice online for free — no signup, no fees, with instant PDF export.",
    date: "2026-04-14",
    readTime: 5,
    category: "invoices",
    keywordAr: "انشاء فاتورة مجانية",
    keywordEn: "free online invoice",
    relatedSlugs: [
      "الفرق-بين-الفاتورة-وعرض-السعر",
      "نموذج-فاتورة-عربي-انجليزي",
      "اخطاء-الفواتير-الشائعة",
    ],
    contentAr: `
## لماذا إنشاء الفواتير أون لاين أفضل من Word أو Excel؟

- **أخطاء في الحسابات:** خاصة حساب الضرائب والخصومات
- **تنسيق غير احترافي:** يختلف من فاتورة لأخرى
- **صعوبة التتبع:** تنتشر الملفات في أماكن مختلفة
- **لا يدعم العربية بشكل صحيح:** مشاكل في الاتجاه RTL

## خطوات إنشاء فاتورة مجانية في Xuvilo

### الخطوة الأولى: فتح صفحة الفاتورة

انتقل إلى [businesseshub.com/invoice](/invoice). لا تحتاج لإنشاء حساب أو تسجيل.

### الخطوة الثانية: إدخال بيانات شركتك

- **اسم شركتك أو اسمك التجاري**
- **العنوان:** المدينة، الدولة، الرمز البريدي
- **رقم الهاتف**
- **البريد الإلكتروني**
- **الرقم الضريبي** (إن وُجد)
- **الشعار (Logo):** اضغط "رفع صورة" وحمّل شعارك

**نصيحة:** بياناتك تُحفظ تلقائياً في المتصفح.

### الخطوة الثالثة: إدخال بيانات العميل

- اسم العميل أو الشركة
- عنوانه
- بريده الإلكتروني

### الخطوة الرابعة: تفاصيل الفاتورة

- **رقم الفاتورة:** النظام يولّده تلقائياً
- **تاريخ الإصدار:** اليوم افتراضياً
- **تاريخ الاستحقاق:** مثلاً بعد 30 يوماً
- **العملة:** اختر من بين 176+ عملة (SAR, AED, LYD, USD, EUR...)

### الخطوة الخامسة: إضافة بنود الفاتورة

- **الوصف:** مثلاً "خدمات تصميم جرافيك — مارس 2026"
- **الكمية:** مثلاً 1 أو 3
- **السعر للوحدة:** مثلاً 500
- **نسبة الضريبة:** (اختياري)
- **الخصم:** (اختياري)

### الخطوة السادسة: اختيار القالب (اختياري)

- قوالب كلاسيكية وحديثة
- قوالب عربية RTL
- قوالب مناسبة للمقاولين والشركات
- قوالب رسمية للمناقصات

### الخطوة السابعة: معاينة وتصدير PDF

اضغط زر "تحميل PDF" في أسفل الصفحة وسيُولَّد ملف عالي الجودة جاهز للطباعة.

## خصائص مميزة في Xuvilo

**✅ دعم كامل للعربية والإنجليزية**

**✅ ZATCA لفواتير السعودية**

**✅ رابط دفع و QR**

**✅ مشاركة عبر واتساب**

## أخطاء شائعة عند إنشاء أول فاتورة أونلاين

كثير من المستقلين الجدد يرتكبون الأخطاء التالية في أول فاتورة:

- **رقم فاتورة عشوائي:** ابدأ بتسلسل واضح مثل 2026-001 ولا تكسره.
- **نسيان تاريخ الاستحقاق:** بدون تاريخ صريح يصبح الدفع مفتوحاً.
- **خلط العملات:** اختر عملة واحدة لكل فاتورة وكُن واضحاً في الرمز (SAR، AED، USD).
- **حقل ضريبة فارغ:** إن كنت غير مسجَّل اكتب "غير خاضع للضريبة" بدلاً من تركه فارغاً.
- **عنوان عميل ناقص:** يصعّب على العميل تسجيلها في حساباته.
- **بنود مبهمة:** "خدمات استشارية" أضعف من "ساعتا استشارة تسويقية - 12 مارس".

## كيف يساعد حفظ بيانات العميل لاحقاً؟

عند حفظ بيانات العميل من أول فاتورة، تختصر دقائق على كل فاتورة قادمة وتقلّل أخطاء الكتابة. الفائدة الأكبر تظهر مع الوقت:

- **سرعة:** فواتير الزبائن المتكررة تُصدَر بنقرتين.
- **اتساق:** نفس العنوان والاسم القانوني في كل مرة، وهو ما يطلبه المحاسبون.
- **تتبّع:** ترى كل فواتير عميل واحد في مكان واحد.
- **تذكيرات:** يسهل تذكير العميل بالفاتورة المستحقة عندما تكون بياناته جاهزة.

يمكن لاحقاً تحويل بيانات العميل إلى [إيصال دفع](/receipt) أو [عرض سعر جديد](/quotation) دون إعادة إدخال شيء.

## مثال عملي: المحاسبة الذاتية لمستقل

1. أصدر الفاتورة فور تسليم العمل.
2. صدّر PDF واحفظه في مجلد باسم العميل.
3. حدّث جدولاً بسيطاً (شيت أو [حاسبة](/calculators)) بأرقام الفواتير وتواريخها وحالة الدفع.
4. في نهاية الشهر اجمع المدفوع والمستحق — هذا تقريرك المالي الأساسي.

## أسئلة شائعة (FAQ)

**هل ملف PDF يبقى خاصاً بي؟**
نعم. عند إنشاء الفاتورة في المتصفح يبقى الملف على جهازك حتى تختار مشاركته.

**هل القوالب تدعم العربية والإنجليزية معاً؟**
نعم، قوالب ثنائية اللغة جاهزة في صفحة [القوالب](/templates) لاستخدام المعاملات الدولية والمحلية في وقت واحد.

**هل يمكن تعديل الفاتورة بعد التصدير؟**
نعم، أعد فتح الصفحة، عدّل الحقل المطلوب، ثم صدّر نسخة جديدة. احرص على تغيير رقم النسخة (مثلاً INV-001-A).

**ما حجم الفاتورة المناسب للطباعة؟**
A4 افتراضياً. القوالب الجاهزة معدّة للطباعة المباشرة بدون اقتطاع.

**هل أحتاج حساباً للحصول على رقم تسلسلي؟**
لا. يكفي اختيار نمط ثابت (مثل 2026-XXX) والاستمرار به في كل فاتورة جديدة.

## كم يكلف هذا؟

**لا شيء.** Xuvilo مجاني تماماً للاستخدام الأساسي. للاطّلاع على ما تقدّمه الباقات الموسَّعة عند نمو عملك، راجع [صفحة الأسعار](/pricing).

ابدأ الآن — [أنشئ فاتورتك الأولى](/invoice)
    `.trim(),
    contentEn: `
## Why Online Invoicing Beats Word or Excel

For decades, small business owners have built invoices in Microsoft Word or Excel — but the approach has problems:

- **Calculation errors,** especially with tax and discounts
- **Inconsistent formatting** from invoice to invoice
- **Hard to track** when files are scattered everywhere
- **Poor Arabic support** — RTL is rarely correct

A dedicated online tool fixes all of this at once.

## How to Create a Free Invoice on Xuvilo

### Step 1: Open the invoice page

Go to [businesseshub.com/invoice](/invoice). No account or signup needed — the form is right there.

### Step 2: Enter your business details

In the "Business Info" section enter:
- **Business or trade name**
- **Address:** city, country, postal code
- **Phone**
- **Email**
- **Tax number** (if any)
- **Logo:** click "Upload" and add a PNG/JPG up to 2 MB

**Tip:** your details are saved in the browser automatically. Next time everything is pre-filled.

### Step 3: Enter the client details

- Client name or company
- Address
- Email (so you can send the invoice directly)

### Step 4: Invoice details

- **Invoice number:** generated automatically (editable)
- **Issue date:** today by default
- **Due date:** typically 30 days out
- **Currency:** choose from 176+ currencies (SAR, AED, LYD, USD, EUR...)

### Step 5: Add line items

For each item enter:
- **Description**, e.g. "Graphic design services — March 2026"
- **Quantity**, e.g. 1 or 3
- **Unit price**, e.g. 500
- **Tax rate** (optional)
- **Discount** (optional)

Totals are calculated instantly as you type.

### Step 6: Pick a template (optional)

At the top of the page, click "Change template" to choose from 320+ professional designs:
- Classic and modern templates
- Arabic RTL templates
- Designs suited to contractors and SMEs
- Formal tender templates

### Step 7: Preview and export PDF

Switch to the "Preview" tab to see how the invoice looks. If you're happy, click "Download PDF" to generate a high-quality, print-ready file.

## Standout Features

**✅ Full Arabic and English support** — proper RTL plus Eastern Arabic numerals.

**✅ ZATCA mode** for Saudi invoices, with the QR code generated for you.

**✅ Payment link and QR** — embed PayPal/Tap/Stripe.

**✅ WhatsApp sharing** with a pre-formatted message.

## Common Mistakes on Your First Online Invoice

Most new freelancers make the same handful of mistakes on their first invoice:

- **Random invoice number:** start with a clear sequence like 2026-001 and never break it.
- **Missing due date:** without an explicit date the payment window stays open forever.
- **Mixed currencies:** pick one currency per invoice and use a clear code (SAR, AED, USD).
- **Empty tax field:** if you aren't tax-registered, write "Not subject to tax" instead of leaving it blank.
- **Incomplete client address:** makes it harder for the client to record the invoice in their books.
- **Vague line items:** "Consulting services" is weaker than "Two hours of marketing consultancy — 12 March."

## Why Saving Client Details Pays Off Later

Saving client details on the first invoice cuts minutes off every future invoice and removes typing errors. The bigger benefit shows up over time:

- **Speed:** repeat-client invoices issue with two clicks.
- **Consistency:** same legal name and address every time, which is exactly what bookkeepers want.
- **Tracking:** you see every invoice for a single client in one place.
- **Easy reminders:** chasing payment is faster when client details are already loaded.

You can later turn the same client into a [payment receipt](/receipt) or a fresh [quotation](/quotation) without re-entering anything.

## A Practical Example: Self-Bookkeeping for a Freelancer

1. Issue the invoice the moment the work is delivered.
2. Export the PDF and save it in a folder named after the client.
3. Update a small spreadsheet (or one of the [calculators](/calculators)) with invoice number, date and payment status.
4. At month end, sum what's paid and what's outstanding — that's your basic financial report.

## Frequently Asked Questions

**Does the PDF stay private to me?**
Yes. When the invoice is built in the browser, the file stays on your device until you choose to share it.

**Do the templates support Arabic and English together?**
Yes. Bilingual templates are ready on the [templates](/templates) page for handling international and local transactions side by side.

**Can I edit the invoice after exporting?**
Yes. Reopen the page, change the field, and export a new version. Just bump the version number (e.g. INV-001-A) so the two copies are not mistaken for duplicates.

**What size should I print?**
A4 by default. The included templates are sized to print without clipping.

**Do I need an account to get a sequential number?**
No. Pick a fixed pattern (e.g. 2026-XXX) and keep it for every new invoice.

## How Much Does It Cost?

**Nothing.** Xuvilo is completely free for basic use. Create unlimited invoices and export to PDF without paying or subscribing. If your business grows and you'd like to compare extended plans, see the [pricing page](/pricing).

Start now — [create your first invoice](/invoice).
    `.trim(),
  },

  {
    slug: "نموذج-فاتورة-عربي-انجليزي",
    cover: "blog/cover-bilingual-invoice.png",
    titleAr: "نموذج فاتورة عربي إنجليزي جاهز للتحميل",
    titleEn: "Arabic-English Bilingual Invoice Template — Free Download",
    metaTitleEn: "Bilingual Arabic-English Invoice Template | Xuvilo",
    excerptAr:
      "نماذج فواتير ثنائية اللغة عربي وإنجليزي جاهزة للاستخدام، لماذا تحتاج فاتورة بلغتين، وكيف تنشئها مجاناً.",
    excerptEn:
      "Ready-to-use bilingual invoice templates in Arabic and English — why you need a dual-language invoice and how to build one for free.",
    date: "2026-04-15",
    readTime: 6,
    category: "invoices",
    keywordAr: "نموذج فاتورة عربي انجليزي",
    keywordEn: "bilingual invoice template",
    relatedSlugs: [
      "انشاء-فاتورة-مجانية-اونلاين",
      "كيف-تكتب-عرض-سعر-احترافي",
      "برنامج-فواتير-للشركات-الصغيرة",
    ],
    contentAr: `
## لماذا تحتاج فاتورة ثنائية اللغة عربي-إنجليزي؟

**١. التعامل مع العملاء الأجانب** — عملاؤك الأجانب لا يقرؤون العربية.

**٢. متطلبات التخليص الجمركي** — صادرات البضائع تستلزم وثائق بالإنجليزية.

**٣. المعاملات مع البنوك والجهات الدولية** — تفضل الوثائق الإنجليزية أو الثنائية.

**٤. الاحترافية والمصداقية** — تمنح انطباعاً احترافياً راقياً.

## عناصر نموذج الفاتورة العربي-الإنجليزي

### هيكل الفاتورة المثالية ثنائية اللغة

**الترويسة (Header):**
\`\`\`
اسم الشركة / Company Name
العنوان / Address
هاتف / Phone: +XXX XXX XXX
بريد إلكتروني / Email: info@company.com
الرقم الضريبي / Tax ID: XXXXXXX
\`\`\`

**رأس الفاتورة:**
\`\`\`
فاتورة / INVOICE
رقم الفاتورة / Invoice No: INV-2026-001
تاريخ الإصدار / Issue Date: 2026-04-15
تاريخ الاستحقاق / Due Date: 2026-05-15
\`\`\`

**جدول البنود:**
\`\`\`
الوصف / Description | الكمية / Qty | السعر / Price | الإجمالي / Total
\`\`\`

**القسم المالي:**
\`\`\`
المجموع / Subtotal: XXXX
ضريبة القيمة المضافة / VAT (5%): XX
الإجمالي الكلي / Grand Total: XXXX
\`\`\`

## أفضل الممارسات في تصميم الفاتورة ثنائية اللغة

### التخطيط البصري

**الخيار الأول: جانبان متوازيان** — العربية على اليمين والإنجليزية على اليسار.

**الخيار الثاني: ثنائي في كل حقل** — "اسم العميل / Client Name".

**الخيار الثالث: نسختان في صفحتين** — صفحة بالعربية وصفحة بالإنجليزية.

### الخطوط المناسبة

- **Cairo** (مجاني من Google Fonts)
- **Noto Sans Arabic**
- **IBM Plex Arabic**

### الأرقام

استخدم الأرقام العربية الغربية (0-9) في الفواتير الدولية، والأرقام العربية الشرقية (٠-٩) في الفواتير المحلية.

## نماذج فواتير جاهزة للتحميل

في Xuvilo، نوفر أكثر من 20 قالب فاتورة احترافي، بعضها ثنائي اللغة عربي-إنجليزي.

**القوالب المتاحة:**
- **Classic Arabic:** تصميم كلاسيكي بالعربية مع دعم إنجليزي
- **Modern Blue:** قالب عصري أزرق متوافق مع Arabic RTL
- **Formal Tender:** قالب رسمي للمناقصات مع حقول ثنائية اللغة
- **Compact:** قالب مضغوط مثالي للفواتير البسيطة

## كيفية إنشاء فاتورة عربية-إنجليزية في Xuvilo

1. افتح [Xuvilo Invoice](/invoice)
2. اختر قالب "Arabic" من معرض القوالب
3. أدخل بيانات شركتك وعميلك
4. غيّر اللغة باستخدام زر EN/عربي في أعلى الصفحة
5. صدّر PDF جاهز للإرسال أو الطباعة

كل هذا **مجاناً وبدون تسجيل** — [ابدأ الآن](/invoice)
    `.trim(),
    contentEn: `
## Why You Need a Bilingual Arabic-English Invoice

In the international business environment of MENA, a bilingual (Arabic-English) invoice is indispensable.

**1. Foreign clients** don't read Arabic — a bilingual invoice removes any ambiguity about amounts and terms.

**2. Customs clearance** for exports usually requires documents in English as the international trade language.

**3. International banks and corporates** prefer English or bilingual paperwork.

**4. Professionalism and credibility** — a bilingual invoice signals a polished operation and builds client trust.

## Elements of a Bilingual Invoice Template

### Ideal structure

**Header:**
\`\`\`
اسم الشركة / Company Name
العنوان / Address
هاتف / Phone: +XXX XXX XXX
بريد إلكتروني / Email: info@company.com
الرقم الضريبي / Tax ID: XXXXXXX
\`\`\`

**Invoice header:**
\`\`\`
فاتورة / INVOICE
رقم الفاتورة / Invoice No: INV-2026-001
تاريخ الإصدار / Issue Date: 2026-04-15
تاريخ الاستحقاق / Due Date: 2026-05-15
\`\`\`

**Line item table:**
\`\`\`
الوصف / Description | الكمية / Qty | السعر / Price | الإجمالي / Total
\`\`\`

**Totals block:**
\`\`\`
المجموع / Subtotal: XXXX
VAT (5%): XX
الإجمالي الكلي / Grand Total: XXXX
\`\`\`

## Bilingual Invoice Design Best Practices

### Visual layout

**Option 1: Side-by-side columns** — Arabic RTL on the right, English LTR on the left. Best for quick comparisons.

**Option 2: Bilingual labels in every field** — "اسم العميل / Client Name" followed by the value. Most readable.

**Option 3: Two pages** — Arabic on page one, English on page two. Best for formal documents.

### Suitable fonts

For bilingual invoices, choose fonts that support both Latin and Arabic:
- **Cairo** (free from Google Fonts)
- **Noto Sans Arabic**
- **IBM Plex Arabic**

### Numerals

Use Western Arabic numerals (0–9) in international invoices. Use Eastern Arabic numerals (٠–٩) only for purely local Arabic invoices.

## Ready-Made Templates

Xuvilo ships 320+ professional invoice templates, several of which switch to bilingual mode automatically when you select Arabic.

**Available templates:**
- **Classic Arabic** — classic Arabic layout with English support
- **Modern Blue** — modern blue template compatible with Arabic RTL
- **Formal Tender** — formal tender template with bilingual fields
- **Compact** — minimal layout great for simple invoices

## How to Create a Bilingual Invoice on Xuvilo

1. Open [Xuvilo Invoice](/invoice)
2. Pick an "Arabic" template from the gallery
3. Fill in your business and client details
4. Toggle the language with the EN/عربي switch at the top
5. Export the PDF, ready to send or print

All of this is **free and signup-free** — [get started](/invoice).
    `.trim(),
  },

  {
    slug: "برنامج-فواتير-للشركات-الصغيرة",
    cover: "blog/cover-sme-invoicing-software.png",
    titleAr: "أفضل برامج الفواتير للشركات الصغيرة في المنطقة العربية",
    titleEn: "Best Invoice Software for Small Businesses in the Arab World",
    metaTitleAr: "أفضل برامج الفواتير للشركات الصغيرة | Xuvilo",
    metaTitleEn: "Best Invoice Software for Small Businesses | Xuvilo",
    excerptAr:
      "مقارنة بين أفضل برامج وأدوات الفواتير للشركات الصغيرة والمستقلين في منطقة الشرق الأوسط وشمال أفريقيا.",
    excerptEn:
      "A side-by-side comparison of the best invoicing software for small businesses and freelancers in the MENA region.",
    date: "2026-04-16",
    readTime: 8,
    category: "business",
    keywordAr: "برنامج فواتير مجاني",
    keywordEn: "free invoicing software",
    relatedSlugs: [
      "انشاء-فاتورة-مجانية-اونلاين",
      "نموذج-فاتورة-عربي-انجليزي",
      "فاتورة-المقاولين-والمستقلين",
    ],
    contentAr: `
## لماذا تحتاج برنامجاً متخصصاً للفواتير؟

- **احتساب آلي للضرائب والخصومات**
- **أرقام فواتير تلقائية ومتسلسلة**
- **قوالب احترافية جاهزة**
- **تصدير PDF بجودة عالية**
- **تتبع المدفوعات والمتأخرات**
- **دعم متعدد العملات**

## معايير اختيار برنامج الفواتير المناسب لمنطقة MENA

| المعيار | الأهمية |
|---------|---------|
| دعم اللغة العربية و RTL | ✅ ضروري جداً |
| دعم الريال السعودي والدرهم والدينار | ✅ ضروري |
| توافق مع زاتكا (السعودية) | ✅ للسوق السعودية |
| التصدير بصيغة PDF | ✅ أساسي |
| المجانية أو التكلفة المعقولة | ✅ مهم للشركات الناشئة |
| سهولة الاستخدام | ✅ مهم |
| الخصوصية والأمان | ✅ مهم |

## مقارنة أشهر برامج الفواتير

### ١. Xuvilo — الأفضل للسوق العربية

- ✅ دعم كامل لـ 176+ عملة بما فيها SAR, AED, LYD, KWD
- ✅ واجهة عربية كاملة مع RTL
- ✅ توافق ZATCA لفواتير السعودية مع رمز QR التلقائي
- ✅ أرقام عربية شرقية (١٢٣)
- ✅ أكثر من 20 قالب احترافي
- ✅ مجاني تماماً بدون تسجيل
- ✅ خصوصية تامة — البيانات في المتصفح فقط

**القيود:**
- لا يزامن البيانات عبر أجهزة متعددة (حتى الآن)
- لا يوجد تطبيق موبايل مخصص

**مناسب لـ:** المستقلون، الشركات الصغيرة، من يحتاج ZATCA

### ٢. Zoho Invoice — الحل المتكامل

- دعم عربي جيد
- متكامل مع منظومة Zoho الكاملة
- تطبيق موبايل
- تتبع الوقت والمصاريف

**القيود:**
- ❌ مدفوع بعد تجربة مجانية محدودة
- ❌ الواجهة العربية أقل اكتمالاً

**السعر:** مجاني حتى حد معين، ثم يبدأ من ~$20/شهر

### ٣. FreshBooks — الأشهر عالمياً

- واجهة استخدام ممتازة
- تكامل مع المحاسبة

**القيود:**
- ❌ لا دعم حقيقي للعربية
- ❌ لا يدعم ZATCA
- ❌ مكلف (من $17/شهر)

### ٤. QuickBooks — للشركات الأكبر

- محاسبة متكاملة
- قوارير ضريبية شاملة

**القيود:**
- ❌ معقد جداً للشركات الصغيرة
- ❌ مكلف جداً (من $30/شهر)

### ٥. Wave (مجاني) — خيار مقبول

- مجاني كلياً
- محاسبة أساسية

**القيود:**
- ❌ لا دعم للعربية
- ❌ لا دعم للعملات العربية

## الخلاصة — أي برنامج تختار؟

| إذا كنت... | استخدم |
|-----------|--------|
| مستقلاً في السعودية أو الإمارات أو ليبيا | **Xuvilo** |
| شركة صغيرة تحتاج محاسبة متكاملة | **Zoho Invoice** |
| شركة متوسطة تحتاج ERP كامل | **QuickBooks** |
| تعمل مع عملاء أمريكيين/أوروبيين بالدولار | **FreshBooks** |

**للشركات الصغيرة في المنطقة العربية، يبقى Xuvilo الخيار الأفضل مجاناً بسبب الدعم الكامل للسوق العربية.**

[جرّب Xuvilo مجاناً الآن](/invoice)
    `.trim(),
    contentEn: `
## Why You Need Dedicated Invoicing Software

Many small business owners start out building invoices in Word or Excel and quickly hit limits. Dedicated invoicing software gives you:

- **Automatic tax and discount calculation**
- **Automatic, sequential invoice numbers**
- **Ready-made professional templates**
- **High-quality PDF export**
- **Payment and overdue tracking**
- **Multi-currency support**

## How to Choose the Right Tool for the MENA Market

| Criterion | Importance |
|-----------|-----------|
| Arabic language and RTL support | ✅ Critical |
| SAR, AED, KWD support | ✅ Required |
| ZATCA compliance (Saudi Arabia) | ✅ Required for KSA |
| PDF export | ✅ Essential |
| Free or affordable | ✅ Important for startups |
| Easy to use | ✅ Important |
| Privacy and security | ✅ Important |

## Side-by-Side Comparison

### 1. Xuvilo — best for the Arab market

- ✅ 176+ currencies including SAR, AED, LYD, KWD, QAR, BHD
- ✅ Full Arabic UI with proper RTL
- ✅ ZATCA-compliant Saudi invoices with automatic QR code
- ✅ Eastern Arabic numerals (١٢٣) and Persian (۱۲۳)
- ✅ 320+ professional templates
- ✅ Completely free, no signup
- ✅ Total privacy — data stays in your browser

**Limits:**
- No cross-device sync (yet)
- No dedicated mobile app

**Best for:** freelancers, small businesses, anyone who needs ZATCA.

### 2. Zoho Invoice — the all-in-one suite

- Decent Arabic support
- Integrated with the wider Zoho ecosystem (CRM, Books)
- Mobile app
- Time and expense tracking

**Limits:**
- ❌ Paid after a limited free tier
- ❌ Arabic UI is less polished
- ❌ Pricey for very small businesses

**Price:** free up to a limit, then from ~$20/month.

### 3. FreshBooks — the global favourite

- Excellent UX
- Accounting integrations

**Limits:**
- ❌ No real Arabic support
- ❌ No ZATCA support
- ❌ Expensive (from $17/month)

**Best for:** businesses dealing in USD/EUR only.

### 4. QuickBooks — for larger businesses

- Full accounting suite
- Comprehensive tax reports

**Limits:**
- ❌ Overkill for small businesses
- ❌ Very expensive (from $30/month)
- ❌ Limited MENA support

### 5. Wave (free) — a decent option

- Completely free
- Basic accounting
- Unlimited invoices

**Limits:**
- ❌ No Arabic
- ❌ No GCC currencies
- ❌ Not available in some MENA countries

## Bottom Line — Which Tool Should You Pick?

| If you are... | Use |
|---------------|-----|
| A freelancer in KSA, UAE or Libya | **Xuvilo** |
| A small business that needs full accounting | **Zoho Invoice** |
| A mid-size business needing a full ERP | **QuickBooks** |
| Working with US/EU clients in USD | **FreshBooks** |

**For SMEs around the world, Xuvilo remains the best free choice thanks to its deep multi-currency and MENA-region support.**

[Try Xuvilo free](/invoice)
    `.trim(),
  },

  {
    slug: "فاتورة-المقاولين-والمستقلين",
    cover: "blog/cover-freelancer-invoice.png",
    titleAr: "دليل الفواتير للمقاولين والمستقلين — كل ما تحتاج معرفته",
    titleEn: "Complete Invoice Guide for Freelancers and Contractors",
    metaTitleAr: "دليل الفواتير للمقاولين والمستقلين | Xuvilo",
    metaTitleEn: "Invoice Guide for Freelancers & Contractors | Xuvilo",
    excerptAr:
      "دليل شامل للمستقلين والمقاولين عن كيفية إنشاء الفواتير الاحترافية، شروط الدفع، المتابعة، وحماية حقوقك.",
    excerptEn:
      "A comprehensive guide for freelancers and contractors: how to build professional invoices, set payment terms, follow up, and protect your rights.",
    date: "2026-04-17",
    readTime: 9,
    category: "tips",
    keywordAr: "فاتورة مستقل",
    keywordEn: "freelancer invoice",
    relatedSlugs: [
      "كيف-تكتب-عرض-سعر-احترافي",
      "اخطاء-الفواتير-الشائعة",
      "انشاء-فاتورة-مجانية-اونلاين",
    ],
    contentAr: `
## لماذا الفاتورة المهنية ضرورة وليست رفاهية للمستقل؟

- **مشاكل قانونية:** بدون فاتورة، يصعب إثبات حقك في المحكمة
- **مشاكل ضريبية:** الجهات الضريبية تطلب فواتير موثقة
- **سمعة مهنية:** العملاء الكبار يشترطون فواتير رسمية
- **تتبع المستحقات:** من سيتذكر بعد 3 أشهر من دفع ومن لم يدفع؟

## ما يجب أن تشتمل عليه فاتورة المستقل

### المعلومات الأساسية

**بياناتك الشخصية/التجارية:**
- اسمك الكامل أو اسمك التجاري
- عنوانك (أو صندوق بريد إن أردت الخصوصية)
- رقم هاتفك المهني
- بريدك الإلكتروني المهني
- موقعك الإلكتروني (إن وُجد)
- رقمك الضريبي (إن كنت مسجلاً ضريبياً)

**بيانات العميل:**
- اسم الشركة أو الشخص
- اسم جهة الاتصال المسؤولة عن الدفع
- عنوان الشركة
- البريد الإلكتروني المالي

### تفاصيل العمل المنجز

**❌ وصف ضعيف:** "تصميم موقع — 5,000 ريال"

**✅ وصف قوي:** "تصميم وتطوير موقع إلكتروني متجاوب لشركة الأفق — يشمل: تصميم 7 صفحات رئيسية، نظام إدارة محتوى WordPress، تكامل نموذج تواصل، تهيئة SEO أساسي، شهر دعم فني — حسب العرض المعتمد رقم QT-2026-018"

### شروط الدفع المقترحة للمستقلين

| نوع المشروع | شروط الدفع المقترحة |
|------------|-------------------|
| مشروع صغير (أقل من 1,000 دولار) | 100% عند التسليم |
| مشروع متوسط (1,000-5,000) | 50% مقدم، 50% عند التسليم |
| مشروع كبير (أكثر من 5,000) | 30% مقدم، 40% منتصف، 30% نهاية |
| عميل جديد (أي مبلغ) | 50% مقدم على الأقل |
| عميل منتظم موثوق | Net 30 (دفع خلال 30 يوماً) |

## أخطاء الفوترة الأكثر شيوعاً بين المستقلين

### ١. إرسال الفاتورة بعد وقت طويل من إتمام العمل

أرسل الفاتورة **في اليوم ذاته** الذي تُسلّم فيه العمل.

### ٢. عدم وضع تاريخ استحقاق

اكتب: "مستحق الدفع بتاريخ 15 مايو 2026".

### ٣. التردد في المتابعة

إذا لم يتم الدفع في الموعد، أرسل تذكيراً بعد 3 أيام، ثم بعد أسبوع، ثم اتصل.

### ٤. عدم الاحتفاظ بنسخ

احتفظ بنسخة من كل فاتورة — PDF في Google Drive أو على جهازك.

### ٥. نسيان فاتورة التعديلات

إذا طلب العميل تعديلات خارج نطاق الاتفاق الأصلي، أصدر فاتورة إضافية.

## نصائح متقدمة لمن يتعامل مع عملاء دوليين

### اختيار العملة

حدد العملة صراحة في الفاتورة (SAR / AED / USD ...).

### سعر الصرف

للمعاملات بعملات مختلفة، حدد سعر الصرف المعتمد وتاريخه.

### SWIFT/IBAN للدفعات الدولية

أدرج في الفاتورة:
- اسم البنك والفرع
- رقم الحساب أو IBAN
- رمز SWIFT/BIC
- اسم صاحب الحساب كما هو في البنك

## نموذج فاتورة مستقل: مصمم جرافيك سعودي

\`\`\`
مصطفى أحمد — مصمم جرافيك مستقل
موبايل: +966 5X XXX XXXX
البريد: mostafa@design-pro.sa
الرقم الضريبي: 310XXXXXXXXXXX

فاتورة رقم: MOST-2026-019
تاريخ الإصدار: 2026-04-17
تاريخ الاستحقاق: 2026-05-17

مُقدَّمة إلى: شركة النخيل للتسويق، الرياض

البنود:
تصميم كتالوج منتجات (28 صفحة A4): 3,200 ر.س
توريد ملفات مفتوحة (AI + PSD): 400 ر.س

المجموع: 3,600 ر.س
ضريبة القيمة المضافة (15%): 540 ر.س
الإجمالي: 4,140 ر.س

شروط الدفع: تحويل بنكي خلال 30 يوماً
\`\`\`

## ابدأ بفوترة احترافية اليوم — مجاناً

[أنشئ أول فاتورة مستقل احترافية الآن](/invoice)
    `.trim(),
    contentEn: `
## Why a Professional Invoice Is a Necessity for Freelancers, Not a Luxury

Many new freelancers and contractors think a WhatsApp message or simple email is enough. That's a costly mistake:

- **Legal trouble:** without an invoice, it's hard to prove your claim in court
- **Tax trouble:** tax authorities require documented invoices
- **Reputation:** larger clients require formal invoices
- **Receivables tracking:** who's going to remember three months later who paid and who didn't?

## What to Include in a Freelancer Invoice

### Core information

**Your personal/business details:**
- Full name or trade name
- Address (or PO box if you want privacy)
- Professional phone
- Professional email (avoid free domains in larger deals)
- Website if any
- Tax number if you're registered

**Client details:**
- Company or contact name
- Name of the person responsible for paying
- Company address
- Finance email

### Description of the work

**❌ Weak:** "Website design — SAR 5,000"

**✅ Strong:** "Design and build a responsive website for Al-Ufuq Co. — 7 main pages, WordPress CMS, contact form integration, basic SEO setup, 1 month of support — per approved quotation QT-2026-018."

### Recommended Payment Terms

| Project size | Suggested terms |
|--------------|-----------------|
| Small (< $1,000) | 100% on delivery |
| Medium ($1,000–5,000) | 50% upfront, 50% on delivery |
| Large (> $5,000) | 30% upfront, 40% midpoint, 30% final |
| New client (any size) | 50% upfront minimum |
| Trusted ongoing client | Net 30 (paid within 30 days) |

## Most Common Freelancer Invoicing Mistakes

### 1. Sending the invoice long after the work

Send the invoice **the same day** you deliver.

### 2. No due date

"Please pay as soon as possible" means nothing — write "Payment due 15 May 2026."

### 3. Hesitating to follow up

If payment doesn't arrive on the due date, send a reminder after 3 days, another after a week, then call.

### 4. Not keeping copies

Keep a PDF copy of every invoice in Google Drive or on your machine.

### 5. Forgetting change-request invoices

If the client asks for work outside the original scope, raise a separate invoice.

## Advanced Tips for International Clients

### Currency

State the currency explicitly. If you're in Saudi Arabia and the client is in Dubai, decide whether the bill is in SAR or AED.

### Exchange rate

For mixed-currency deals, lock in and state the agreed exchange rate and its date.

### SWIFT/IBAN for international payments

On the invoice include:
- Bank name and branch
- Account number / IBAN
- SWIFT/BIC code
- Account holder name exactly as on the bank account

## Sample Freelancer Invoice (Saudi Graphic Designer)

\`\`\`
Mostafa Ahmed — Freelance Graphic Designer
Mobile: +966 5X XXX XXXX
Email: mostafa@design-pro.sa
Tax No: 310XXXXXXXXXXX

Invoice No: MOST-2026-019
Issue date: 2026-04-17
Due date: 2026-05-17

Bill to: Al-Nakheel Marketing Co., Riyadh

Line items:
Product catalog design (28 A4 pages): SAR 3,200
Open source files (AI + PSD): SAR 400

Subtotal: SAR 3,600
VAT (15%): SAR 540
Total: SAR 4,140

Payment terms: bank transfer within 30 days
\`\`\`

## Start Invoicing Professionally Today — Free

Xuvilo provides invoice templates designed specifically for freelancers and contractors in the Arab market. Enter your details once and they're saved for every future invoice.

[Create your first professional freelance invoice](/invoice)
    `.trim(),
  },

  {
    slug: "اخطاء-الفواتير-الشائعة",
    cover: "blog/cover-invoice-mistakes.png",
    titleAr: "١٠ أخطاء شائعة في الفواتير يجب تجنبها",
    titleEn: "10 Common Invoicing Mistakes to Avoid",
    excerptAr:
      "أكثر 10 أخطاء شيوعاً يرتكبها أصحاب الأعمال في فواتيرهم، وكيف تتجنبها لضمان الحصول على مستحقاتك في الوقت المحدد.",
    excerptEn:
      "The 10 most common invoicing mistakes business owners make — and how to avoid each one so you actually get paid on time.",
    date: "2026-04-19",
    readTime: 7,
    category: "tips",
    keywordAr: "اخطاء الفواتير",
    keywordEn: "invoicing mistakes",
    relatedSlugs: [
      "فاتورة-المقاولين-والمستقلين",
      "انشاء-فاتورة-مجانية-اونلاين",
      "كيف-تكتب-عرض-سعر-احترافي",
    ],
    contentAr: `
## مقدمة: الفاتورة المعيبة تكلفك أكثر مما تتخيل

- **تأخر الدفع أسابيع أو أشهراً**
- **رفض الدفع كلياً بسبب خطأ إجرائي**
- **غرامات ضريبية بسبب عدم الامتثال**
- **نزاعات قانونية مكلفة**

## الخطأ الأول: غياب تاريخ الاستحقاق

**الحل:** ضع دائماً تاريخاً صريحاً مثل "مستحق الدفع: 15 مايو 2026".

## الخطأ الثاني: وصف مبهم للخدمات

**الحل:** كُن تفصيلياً دائماً.

\`\`\`
إدارة حسابات التواصل الاجتماعي — مارس 2026
• إنشاء 20 منشور أسبوعي (انستغرام + لينكدإن)
• رد على التعليقات يومياً (3 ساعات/أسبوع)
• تقرير أداء شهري
\`\`\`

## الخطأ الثالث: الأرقام الضريبية الخاطئة أو المنسية

**العواقب:** في السعودية، هذا مخالف لنظام ZATCA. في الإمارات، يخالف اشتراطات FTA.

**الحل:** ضع رقمك الضريبي في قالب الفاتورة كعنصر ثابت.

## الخطأ الرابع: أرقام فواتير غير متسلسلة

**الحل:** استخدم نظام ترقيم واضح:
- **السنة-الرقم:** 2026-001، 2026-002 ...
- **النوع-السنة-الرقم:** INV-2026-001 / QT-2026-001

## الخطأ الخامس: نسيان رسوم التأخر في السداد

**الحل:** أضف في شروط الدفع:
> "تُفرض رسوم تأخير قدرها 2% شهرياً على أي مبلغ غير مسدد بعد تاريخ الاستحقاق."

## الخطأ السادس: الاستهانة بضريبة القيمة المضافة

**الحل:** دائماً أظهر الضريبة منفصلة:
\`\`\`
الإجمالي قبل الضريبة: 10,000 ر.س
ضريبة القيمة المضافة (15%): 1,500 ر.س
الإجمالي النهائي: 11,500 ر.س
\`\`\`

## الخطأ السابع: إرسال الفاتورة متأخراً

**الحل:** أرسل الفاتورة في نفس يوم إتمام العمل أو تسليم البضاعة.

## الخطأ الثامن: عدم متابعة الفواتير غير المدفوعة

| التوقيت | الإجراء |
|---------|---------|
| يوم الاستحقاق | إيميل تذكير ودي |
| +3 أيام | رسالة واتساب قصيرة |
| +7 أيام | إيميل رسمي مع نسخة الفاتورة |
| +14 يوم | اتصال هاتفي مباشر |
| +30 يوم | إشعار رسمي أو استشارة قانونية |

## الخطأ التاسع: الفاتورة باللغة الخاطئة

**الحل:** استخدم فاتورة ثنائية اللغة عربي-إنجليزي كحل شامل.

## الخطأ العاشر: بيانات بنكية أو دفع غير واضحة

**الحل:** أضف قسم "طريقة الدفع" يتضمن:
- بيانات التحويل البنكي (IBAN, SWIFT, اسم البنك)
- رابط الدفع الإلكتروني (PayPal/Tap/Stripe)
- أرقام المحافظ الإلكترونية إن وُجدت

## الحل الأشمل: استخدم Xuvilo

- ✅ ترقيم تلقائي متسلسل للفواتير
- ✅ خانة استحقاق إلزامية
- ✅ حساب الضرائب آلياً وعرضها منفصلة
- ✅ قسم بيانات بنكية ورابط دفع مدمج
- ✅ دعم ZATCA ورمز QR تلقائي
- ✅ تصدير PDF احترافي

[أنشئ فاتورة خالية من الأخطاء الآن](/invoice) — مجاناً وبدون تسجيل.
    `.trim(),
    contentEn: `
## Intro: A Faulty Invoice Costs You More Than You Think

An invoice isn't just a piece of paper requesting money — it's a legal document that protects your money. A faulty or incomplete invoice can lead to:

- **Payment delays of weeks or months**
- **Outright refusal to pay over a procedural mistake**
- **Tax penalties for non-compliance**
- **Costly legal disputes**

Here are the 10 most common mistakes and how to avoid each one.

## Mistake 1: No Due Date

**Fix:** always include an explicit date such as "Payment due: 15 May 2026." The default in MENA is Net 30 (30 days from issue).

## Mistake 2: Vague Service Description

**Fix:** be specific.

\`\`\`
Social media management — March 2026
• 20 posts/week (Instagram + LinkedIn)
• Daily comment replies (3h/week)
• Monthly performance report
\`\`\`

## Mistake 3: Wrong or Missing Tax Numbers

**Consequence:** in Saudi Arabia this breaches ZATCA. In the UAE it breaches FTA requirements. Either way the client may reject the invoice and ask for a re-issue.

**Fix:** put your tax number into the invoice template as a fixed element so you can never forget it.

## Mistake 4: Non-Sequential Invoice Numbers

**Fix:** use a clear numbering scheme:
- **Year-number:** 2026-001, 2026-002 …
- **Type-year-number:** INV-2026-001 / QT-2026-001

## Mistake 5: Forgetting Late Payment Fees

**Fix:** add to your payment terms:
> "A late fee of 2% per month applies to any amount unpaid after the due date."

## Mistake 6: Treating VAT Loosely

**Fix:** always show VAT separately:
\`\`\`
Subtotal: SAR 10,000
VAT (15%): SAR 1,500
Grand total: SAR 11,500
\`\`\`

## Mistake 7: Sending the Invoice Late

**Fix:** send the invoice the same day you deliver the work.

## Mistake 8: No Follow-Up on Unpaid Invoices

| When | Action |
|------|--------|
| Due date | Friendly email reminder |
| +3 days | Short WhatsApp message |
| +7 days | Formal email with invoice attached |
| +14 days | Direct phone call |
| +30 days | Formal notice or legal consultation |

## Mistake 9: Wrong Language

**Fix:** use a bilingual Arabic-English invoice as a catch-all.

## Mistake 10: Unclear Payment Details

**Fix:** add a "Payment method" section with:
- Bank transfer details (IBAN, SWIFT, bank name)
- Online payment link (PayPal/Tap/Stripe)
- E-wallet numbers if applicable

## The Comprehensive Fix: Use Xuvilo

Xuvilo is built to prevent all 10 mistakes automatically:

- ✅ Automatic sequential invoice numbers
- ✅ Required due date field
- ✅ Automatic tax calculation, shown separately
- ✅ Built-in bank details + payment link section
- ✅ ZATCA support with auto QR code
- ✅ Crisp PDF export

[Create an error-free invoice now](/invoice) — free and signup-free.
    `.trim(),
  },

  {
    slug: "ضريبة-الدخل-للمستقلين",
    cover: "blog/cover-freelancer-income-tax.png",
    titleAr: "دليل ضريبة الدخل للمستقلين في المنطقة العربية",
    titleEn: "Income Tax Guide for Freelancers in the Arab Region",
    excerptAr:
      "كيف تحسب ضريبة الدخل كمستقل في الخليج وشمال أفريقيا، النفقات القابلة للخصم، ومتى يجب التسجيل ضريبياً.",
    excerptEn:
      "How freelancers calculate income tax across the Gulf and North Africa, what expenses are deductible, and when you need to register with the tax authority.",
    date: "2026-04-20",
    readTime: 7,
    category: "taxes",
    keywordAr: "ضريبة دخل المستقل",
    keywordEn: "freelancer income tax",
    relatedSlugs: [
      "فاتورة-المقاولين-والمستقلين",
      "ضريبة-القيمة-المضافة-الامارات",
      "اخطاء-الفواتير-الشائعة",
    ],
    contentAr: `
## لماذا ضريبة الدخل مهمة للمستقل؟

كثير من المستقلين يعتقدون أنهم لا يخضعون لضريبة الدخل لأنهم لا يعملون لحساب شركة. هذا فهم خاطئ في معظم الدول.

## نظرة على ضرائب الدخل في المنطقة

| الدولة | ضريبة الدخل الشخصي | ملاحظات |
|--------|--------------------|---------|
| السعودية | لا يوجد للمواطنين والمقيمين | ضريبة استقطاع للمدفوعات للخارج |
| الإمارات | لا يوجد للأفراد | ضريبة الشركات 9% (2023) |
| الكويت | لا يوجد للأفراد | — |
| مصر | تصاعدية حتى 27.5% | إعفاء حتى 30,000 جنيه |
| المغرب | تصاعدية حتى 38% | شطر معفى أول 30,000 درهم |
| الأردن | تصاعدية حتى 30% | إعفاء حتى 9,000 دينار |
| ليبيا | تصاعدية حتى 10% | على الدخل التجاري |

## ما الذي يُعتبر دخلاً خاضعاً للضريبة؟

- إيرادات المشاريع
- العمولات
- الفوائد البنكية (في بعض الدول)
- الإيجارات
- مكاسب رأسمالية

## النفقات القابلة للخصم

- إيجار المكتب
- الأدوات والبرامج
- تكاليف التسويق
- تكاليف السفر للعمل
- اشتراكات مهنية
- تأمين صحي للأعمال

## متى يجب التسجيل ضريبياً؟

في معظم الدول، التسجيل إلزامي عندما:
- تتجاوز إيراداتك حداً معيناً (مثل 500,000 جنيه في مصر)
- تستلم دفعات من جهات حكومية
- تفتح حساباً بنكياً تجارياً

## نصائح للمستقل لتنظيم ضرائبه

**١. افتح حساباً بنكياً منفصلاً للعمل** — سيسهّل التتبع.

**٢. احتفظ بكل الفواتير** — للنفقات والإيرادات.

**٣. استخدم برنامج فوترة** — يولّد تقارير سنوية تلقائياً.

**٤. خصص نسبة من كل دفعة** — مثلاً 25% في حساب منفصل للضريبة.

**٥. استشر محاسباً سنوياً** — على الأقل قبل الإقرار الضريبي.

## تنبيه مهم قبل المتابعة

المعلومات في هذا المقال للتوعية العامة فقط، وليست استشارة ضريبية أو قانونية. الأنظمة الضريبية تختلف من دولة لأخرى وتُحدَّث باستمرار. تحقّق دائماً من القواعد المطبَّقة في بلدك عبر الجهة الرسمية، واستشر محاسباً أو مستشاراً مرخّصاً قبل اتخاذ أي قرار يتعلّق بالتسجيل أو الإقرار.

## لماذا تحفظ السجلات حتى لو لم تكن مسجَّلاً ضريبياً؟

ربط الإيرادات بالنفقات يحميك في ثلاث حالات شائعة:

- عند تجاوزك للحد الذي يستلزم التسجيل في المستقبل — تكون البيانات جاهزة دون رجعة بعينك للوراء.
- عند طلب البنوك كشفاً ماليّاً للحصول على بطاقة ائتمان أو تمويل صغير.
- عند نزاع مع عميل حول مبلغ مدفوع أو خدمة مقدَّمة — الفواتير والإيصالات هي دليلك الأول.

## أمثلة بسيطة لتسجيل الدخل والنفقات

### مثال على سجل دخل شهري لمصمم مستقل

| التاريخ | العميل | رقم الفاتورة | المبلغ | وسيلة الاستلام |
|--------|--------|-------------|-------|----------------|
| 2026-04-03 | عميل أ | INV-2026-021 | 3,200 | تحويل بنكي |
| 2026-04-12 | عميل ب | INV-2026-022 | 1,500 | محفظة إلكترونية |
| 2026-04-20 | عميل ج | INV-2026-023 | 2,800 | شيك |

### مثال على سجل النفقات

| التاريخ | البند | المورّد | المبلغ | الفئة |
|--------|------|---------|-------|--------|
| 2026-04-02 | اشتراك تصميم | برنامج خارجي | 60 | أدوات |
| 2026-04-10 | إيجار مكتب مشترك | الجهة المؤجِّرة | 700 | إيجار |
| 2026-04-18 | بطاقة إنترنت | شركة الاتصال | 150 | اتصالات |

استخدم [القوالب الجاهزة](/templates) لإصدار فواتيرك بنفس البنية كل شهر، وراجع الإجمالي عبر [الحاسبات](/calculators) المتاحة.

## نصائح عامة لتنظيم سجلاتك (دون استبدال محاسب)

- استخدم رقماً تسلسلياً واحداً لفواتيرك ولا تتخطَّ أرقاماً.
- احفظ نسخة PDF لكل [فاتورة](/invoice) وكل [إيصال](/receipt).
- افصل النفقات الشخصية عن نفقات العمل من اليوم الأول.
- راجع السجل أسبوعياً لمدة 10 دقائق بدلاً من تأجيل كل شيء لنهاية السنة.

## أسئلة شائعة (FAQ)

**هل يجب أن أسجِّل ضريبياً إذا كان عملي عرضياً؟**
يعتمد ذلك على بلدك وعلى حجم الإيرادات. تحقَّق من شروط التسجيل عبر الجهة الرسمية المحلية.

**ما هو الحد الأدنى من السجلات التي يجب الاحتفاظ بها؟**
في معظم الدول: نسخة من كل فاتورة، إيصال دفع، إثبات النفقات، وكشوف بنكية شهرية. مدة الحفظ تختلف من دولة لأخرى (غالباً 5–10 سنوات).

**هل النفقات الشخصية تُخصم من الدخل؟**
لا في العموم. النفقات القابلة للخصم هي تلك المرتبطة مباشرة بالعمل، وفق ما يحدّده القانون المحلي.

**كيف أتحقّق من النسبة المطبَّقة في بلدي؟**
الموقع الرسمي للجهة الضريبية في بلدك هو المرجع الموثوق الوحيد. لا تعتمد على معلومات قديمة من المنتديات.

**هل أحتاج محاسباً منذ البداية؟**
ليس دائماً، لكن استشارة سنوية واحدة قد توفّر عليك أخطاء مكلفة، خاصة في أول إقرار.

## كيف يساعدك Xuvilo؟

- تتبع كل فواتيرك بصيغة منظمة
- تصدير تقارير سنوية للإيرادات
- تسجيل النفقات في لوحة التحكم
- إجمالي الضريبة المستحقة بضغطة زر

[ابدأ تنظيم ضرائبك مجاناً](/dashboard)
    `.trim(),
    contentEn: `
## Why Income Tax Matters for Freelancers

Many freelancers assume they don't owe income tax because they don't work for a company. In most countries that's not true.

## Income Tax at a Glance Across the Region

| Country | Personal income tax | Notes |
|---------|--------------------|-------|
| Saudi Arabia | None for citizens/residents | Withholding tax on outbound payments |
| UAE | None on individuals | 9% corporate tax (2023) |
| Kuwait | None on individuals | — |
| Egypt | Progressive up to 27.5% | Exemption up to EGP 30,000 |
| Morocco | Progressive up to 38% | First MAD 30,000 exempt |
| Jordan | Progressive up to 30% | Exemption up to JOD 9,000 |
| Libya | Progressive up to 10% | On business income |

## What Counts as Taxable Income?

- Project revenues
- Commissions
- Bank interest (in some countries)
- Rental income
- Capital gains

## Deductible Expenses

- Office rent
- Tools and software
- Marketing costs
- Business travel
- Professional subscriptions
- Business health insurance

## When Do You Have to Register?

In most countries you must register once you:
- Exceed a revenue threshold (e.g. EGP 500,000 in Egypt)
- Receive payments from government bodies
- Open a commercial bank account

## Tips for Freelancers Organising Their Taxes

**1. Open a separate business bank account** — it makes tracking far easier.

**2. Keep every receipt and invoice** — both for expenses and revenues.

**3. Use invoicing software** — automatic annual reports are a lifesaver.

**4. Set aside a percentage of every payment** — for example 25% in a separate tax account.

**5. Consult an accountant once a year** — at least before filing.

## Important Disclaimer

This article is general awareness content, not tax or legal advice. Tax rules differ from country to country and change often. Always verify the rules that apply in your country through the official tax authority, and consult a licensed accountant or tax advisor before any registration or filing decision.

## Why Keep Records Even If You're Not Yet Registered

Linking revenues to expenses protects you in three common situations:

- When your turnover crosses a threshold and registration becomes required — your data is already in order rather than reconstructed under pressure.
- When a bank asks for a financial statement to issue a credit card or small loan.
- When a client disputes a payment or a deliverable — your invoices and receipts are your first line of evidence.

## Simple Examples of Income and Expense Records

### Monthly income log for a freelance designer

| Date | Client | Invoice # | Amount | Channel |
|------|--------|-----------|--------|---------|
| 2026-04-03 | Client A | INV-2026-021 | 3,200 | Bank transfer |
| 2026-04-12 | Client B | INV-2026-022 | 1,500 | E-wallet |
| 2026-04-20 | Client C | INV-2026-023 | 2,800 | Cheque |

### Expense log

| Date | Item | Vendor | Amount | Category |
|------|------|--------|--------|----------|
| 2026-04-02 | Design subscription | Software vendor | 60 | Tools |
| 2026-04-10 | Coworking rent | Landlord | 700 | Rent |
| 2026-04-18 | Internet | Telco | 150 | Communications |

Use the [ready-made templates](/templates) to issue invoices in the same structure every month, and tally totals using the available [calculators](/calculators).

## General Tips for Organising Your Records (Not a Substitute for an Accountant)

- Use one continuous sequential number for invoices and never skip a number.
- Save a PDF copy of every [invoice](/invoice) and every [receipt](/receipt).
- Separate personal and business spend from day one.
- Review the log for 10 minutes a week instead of leaving everything to year-end.

## Frequently Asked Questions

**Do I have to register if my work is occasional?**
That depends on your country and your turnover. Check registration thresholds through your local tax authority.

**What's the minimum set of records to keep?**
In most countries: a copy of every invoice, every payment receipt, expense proofs and monthly bank statements. Retention periods vary (often 5–10 years).

**Are personal expenses deductible?**
Generally no. Deductible expenses are those directly related to running your business, as defined by your local law.

**How do I check the rate that applies in my country?**
The official tax authority website in your country is the only reliable reference. Don't rely on outdated forum posts.

**Do I need an accountant from day one?**
Not always — but one annual consultation can save you costly mistakes, especially on the first filing.

## How Xuvilo Helps

- Tracks all your invoices in one organised place
- Annual revenue reports on export
- Expense logging from the dashboard
- One-click total of tax due

[Start organising your taxes for free](/dashboard).
    `.trim(),
  },

  {
    slug: "كيف-تتبع-المدفوعات-المتأخرة",
    cover: "blog/cover-late-payments.png",
    titleAr: "كيف تتبع المدفوعات المتأخرة وتحصّلها بأدب وحزم؟",
    titleEn: "How to Chase Late Payments — Politely but Firmly",
    metaTitleEn: "Get Paid Faster as a UAE Freelancer | Xuvilo",
    excerptAr:
      "نصوص جاهزة وأساليب فعّالة لمتابعة الفواتير المتأخرة من العملاء، من التذكير الودي حتى الإجراءات القانونية.",
    excerptEn:
      "Ready-to-use scripts and proven tactics for chasing overdue invoices — from the friendly nudge to formal legal action.",
    date: "2026-04-21",
    readTime: 6,
    category: "tips",
    keywordAr: "تحصيل الفواتير",
    keywordEn: "invoice collection",
    relatedSlugs: [
      "اخطاء-الفواتير-الشائعة",
      "فاتورة-المقاولين-والمستقلين",
      "كيف-تكتب-عرض-سعر-احترافي",
    ],
    contentAr: `
## لماذا التحصيل مهم بقدر البيع نفسه؟

ربح بدون تحصيل = خسارة. كل فاتورة غير مدفوعة هي قرض بدون فوائد للعميل.

## بروتوكول المتابعة المهني

| التوقيت | القناة | النبرة |
|---------|--------|--------|
| 3 أيام قبل الاستحقاق | إيميل | تذكير لطيف |
| يوم الاستحقاق | إيميل | احترافي محايد |
| +3 أيام | واتساب | شخصي ولكن رسمي |
| +7 أيام | اتصال هاتفي | حازم |
| +14 يوم | إيميل رسمي مع تذكير بالفائدة | أكثر حزماً |
| +30 يوم | إنذار قانوني | حازم وقاطع |

## نموذج تذكير ودّي قبل الاستحقاق

> مرحباً [اسم العميل]،
>
> هذا تذكير ودي بأن الفاتورة رقم INV-2026-XXX بقيمة [المبلغ] مستحقة في [التاريخ].
>
> إن كنت قد سددت بالفعل، تجاهل هذه الرسالة. شكراً لتعاونك.

## نموذج إيميل في يوم الاستحقاق

> مرحباً [اسم العميل]،
>
> الفاتورة رقم INV-2026-XXX مستحقة الدفع اليوم. إن واجهت أي مشكلة، سعيد بمساعدتك.
>
> بيانات الدفع: [IBAN / رابط]

## نموذج إيميل بعد 14 يوم تأخير

> مرحباً [اسم العميل]،
>
> الفاتورة INV-2026-XXX متأخرة بـ 14 يوماً. سيتم تطبيق رسوم تأخير 2% شهرياً ابتداءً من اليوم.
>
> أرجو السداد خلال 7 أيام لتجنب رسوم إضافية.

## كيف تتجنب التأخر أصلاً؟

- **اطلب دفعة مقدمة** للعملاء الجدد
- **حدد رسوم تأخير صراحة** في الشروط
- **اشترط الدفع قبل تسليم الملفات النهائية** للمصممين والمطورين
- **استخدم برنامج فوترة** يرسل تذكيرات تلقائية

## متى تلجأ للقضاء؟

- بعد 60 يوماً من التأخر بدون استجابة
- عند انكار العميل للالتزام
- إذا كان المبلغ يستحق التكلفة القانونية

في معظم دول الخليج، يمكنك رفع شكوى تجارية بسيطة عبر منصات حكومية إلكترونية بتكلفة بسيطة.

## نظام تتبع بسيط في 4 حالات

استخدم 4 حالات فقط لكل فاتورة في دفترك أو لوحتك:

| الحالة | معنى | الإجراء التالي |
|--------|------|----------------|
| **أُرسلت** | الفاتورة وصلت للعميل ولم يحن موعد استحقاقها | راقب فقط |
| **مستحقة** | اليوم هو تاريخ الاستحقاق | أرسل تذكير اليوم |
| **متأخرة** | تجاوزت تاريخ الاستحقاق | ابدأ سلسلة المتابعة |
| **مدفوعة** | استلمت المبلغ كاملاً | أصدر [إيصال دفع](/receipt) فوراً |

أبسط جدول يكفي: عمود لرقم الفاتورة، عمود للعميل، عمود للحالة، عمود لتاريخ آخر تواصل.

## مثال على رسالة قصيرة عبر واتساب (بعد 7 أيام)

> مرحباً [اسم العميل]، فقط للتذكير: الفاتورة [INV-XXX] متأخرة منذ أسبوع. هل أرسل لك نسخة جديدة منها؟ شاكر تعاونك.

نبرة الرسالة مهمة: قصيرة، محترمة، وتنتهي بسؤال مفتوح يسهّل الرد.

## مثال على متابعة هاتفية مهنية (بعد 14 يوماً)

- ابدأ بسؤال إن كان وقت مناسب.
- اذكر رقم الفاتورة والمبلغ بدقة.
- اسأل عن سبب التأخّر بدلاً من توجيه الاتهام.
- اقترح حلاً عملياً (تقسيط، تمديد، تحويل جزئي).
- أنهِ المكالمة بتاريخ التزام واضح.

## أدوات بسيطة لتسهيل المتابعة

- [قوالب تذكير جاهزة](/templates) للنسخ واللصق المباشر.
- [حاسبات تقادم الفاتورة](/calculators) لاحتساب أيام التأخّر ورسوم التأخير.
- ملف [إيصالات دفع](/receipt) مرتَّب يثبت أن العميل دفع جزئياً ويحدد المتبقي.
- إذا كنت بحاجة إلى تتبّع آلي وتقارير أعمق مع نمو محفظة العملاء، راجع خيارات الباقات في [صفحة الأسعار](/pricing).

## أسئلة شائعة (FAQ)

**متى أرسل أول تذكير؟**
قبل تاريخ الاستحقاق بيوم أو يومين، نبرته ودّية: تذكير لطيف لا اتهام.

**هل أرسل التذكير عبر إيميل أم واتساب؟**
ابدأ بالإيميل لأنه يبقى موثَّقاً، ثم استخدم واتساب بعد التأخّر للوصول الأسرع.

**ماذا أفعل إذا تجاهلني العميل تماماً؟**
بعد 30 يوماً من التأخّر دون رد، أرسل إنذاراً رسمياً بإيميل عنوانه واضح "إنذار قبل الإجراء القانوني"، ثم استشر محامياً قبل الذهاب للقضاء.

**هل يمكنني فرض رسوم تأخير دون ذكرها مسبقاً؟**
لا. يجب أن تكون الرسوم مذكورة في الفاتورة الأصلية أو في عرض السعر المُوقَّع.

**هل تذكير العميل يُفسد العلاقة؟**
بالعكس. التذكير المهني المنتظم يبيّن أنك جدّي ومنظَّم، وهذا يحترمه العملاء الجادون.

## كيف يساعد Xuvilo؟

- لوحة تحكم تظهر الفواتير المتأخرة فوراً
- مولّد إيميلات تذكير جاهزة
- حاسبة تقادم الفاتورة لاحتساب الرسوم

[تتبع فواتيرك المتأخرة هنا](/dashboard)
    `.trim(),
    contentEn: `
## Why Collection Matters as Much as the Sale

Revenue without collection = loss. Every unpaid invoice is an interest-free loan you've given the client.

## A Professional Follow-Up Protocol

| When | Channel | Tone |
|------|---------|------|
| 3 days before due | Email | Friendly nudge |
| Due date | Email | Neutral and professional |
| +3 days | WhatsApp | Personal but formal |
| +7 days | Phone call | Firm |
| +14 days | Formal email mentioning late fees | More assertive |
| +30 days | Legal notice | Decisive |

## Friendly Pre-Due Reminder Template

> Hi [client name],
>
> Just a friendly reminder that invoice INV-2026-XXX for [amount] is due on [date].
>
> If you've already paid, please ignore this. Thanks for your cooperation.

## Due-Date Email Template

> Hi [client name],
>
> Invoice INV-2026-XXX is due today. Happy to help if you've hit any payment issues.
>
> Payment details: [IBAN / link]

## 14-Days-Late Email Template

> Hi [client name],
>
> Invoice INV-2026-XXX is now 14 days overdue. As per our terms, a 2% monthly late fee will apply from today.
>
> Please settle within 7 days to avoid additional charges.

## How to Prevent Late Payment in the First Place

- **Require an upfront deposit** from new clients
- **State late fees explicitly** in your terms
- **Hold the final files** (designers/developers) until paid
- **Use invoicing software** that sends automatic reminders

## When to Take Legal Action

- After 60 days of silence
- When the client denies the obligation
- If the amount justifies the legal cost

In most GCC countries you can file a simple commercial claim through electronic government platforms at a low cost.

## A Simple 4-State Tracking System

Use only four states per invoice in your notebook or dashboard:

| State | Meaning | Next action |
|-------|---------|-------------|
| **Sent** | Invoice has reached the client, due date not yet | Just monitor |
| **Due** | Today is the due date | Send a same-day reminder |
| **Overdue** | Past the due date | Start the follow-up sequence |
| **Paid** | Full payment received | Issue a [payment receipt](/receipt) right away |

The simplest table is enough: invoice number, client, state, last contact date.

## Sample Short WhatsApp Message (After 7 Days)

> Hi [client name], just a quick reminder: invoice [INV-XXX] has been outstanding for a week. Want me to resend a copy? Thanks for your help.

Tone matters: short, respectful, and ends with an open question that makes a reply easy.

## Sample Professional Phone Follow-Up (After 14 Days)

- Open by asking if it's a good time.
- State the invoice number and amount precisely.
- Ask about the reason for the delay instead of accusing.
- Suggest a practical solution (instalments, extension, partial transfer).
- End with a clear committed date.

## Simple Tools That Make Follow-Up Easier

- [Ready-made reminder templates](/templates) for direct copy-paste.
- [Invoice aging calculators](/calculators) to compute days overdue and late fees.
- A tidy [payment receipts](/receipt) folder that proves any partial payment and clarifies what is left.

## Frequently Asked Questions

**When should I send the first reminder?**
A day or two before the due date, with a friendly tone — a gentle nudge rather than an accusation.

**Should I send the reminder by email or WhatsApp?**
Start with email because it leaves a written trail, then switch to WhatsApp once the invoice is overdue for faster reach.

**What if the client ignores me completely?**
After 30 days of silence, send a formal notice with a clear subject line such as "Notice before legal action," then consult a lawyer before going to court.

**Can I add late fees that weren't mentioned upfront?**
No. Late fees must appear on the original invoice or on the signed quotation.

**Does chasing damage the relationship?**
The opposite. Professional, consistent reminders show that you are organised and serious, which serious clients respect.

## How Xuvilo Helps

- Dashboard surfaces overdue invoices instantly
- Pre-built reminder email templates
- Invoice aging calculator for late-fee math

[Track your overdue invoices here](/dashboard).
    `.trim(),
  },

  {
    slug: "اختيار-اسم-تجاري-للشركة",
    cover: "blog/cover-business-name.png",
    titleAr: "كيف تختار اسماً تجارياً قوياً لشركتك الناشئة؟",
    titleEn: "How to Choose a Strong Brand Name for Your Startup",
    excerptAr:
      "دليل عملي لاختيار اسم تجاري لا يُنسى وقابل للتسجيل قانونياً، يناسب اللغتين العربية والإنجليزية.",
    excerptEn:
      "A practical guide to picking a memorable, legally registrable brand name that works in both Arabic and English.",
    date: "2026-04-22",
    readTime: 6,
    category: "business",
    keywordAr: "اسم تجاري",
    keywordEn: "brand name",
    relatedSlugs: [
      "كيف-تكتب-عرض-سعر-احترافي",
      "برنامج-فواتير-للشركات-الصغيرة",
      "نموذج-فاتورة-عربي-انجليزي",
    ],
    contentAr: `
## أهمية الاسم التجاري

الاسم التجاري هو الانطباع الأول. الأسماء القوية تختصر سنوات من التسويق.

## ٧ معايير لاختيار اسم تجاري ممتاز

### ١. سهل النطق بالعربي والإنجليزي

تجنّب أصواتاً تربك الأجانب أو الشباب العرب الذين يعتمدون على الترجمة الصوتية.

### ٢. سهل الكتابة والتذكر

اختبره: لو سمعه شخص للمرة الأولى، هل يستطيع كتابته دون توضيح؟

### ٣. متاح كنطاق .com

تحقق من توفر الاسم على [namecheap.com](https://namecheap.com) أو مماثلها.

### ٤. متاح كاسم تجاري قانونياً

ابحث في سجلات الشركات في بلدك (مثل وزارة التجارة في السعودية أو DED في دبي).

### ٥. لا يحمل معنى سلبياً بلغة أخرى

أمثلة شهيرة: لا تطلق اسماً يعني شيئاً مسيئاً بالإسبانية أو الفرنسية إن كنت تستهدف أسواقاً متعددة.

### ٦. مرن للنمو

تجنب أسماء تربطك بمنتج واحد. "كتب الرياض" يحدّك إذا أردت بيع أي شيء آخر.

### ٧. يقول قصة

أفضل الأسماء توحي بالخدمة دون شرح.

## أنماط شائعة لتسمية الشركات

| النمط | مثال | متى تستخدمه |
|-------|------|-------------|
| كلمات حقيقية | Apple, Shell | حين توحي بالقيمة |
| كلمات مدمجة | Microsoft, FedEx | للتقنية |
| اختصارات | IBM, BMW | حين تكون الكلمات طويلة |
| أسماء مخترعة | Kodak, Xerox | للتفرد المطلق |
| أسماء عائلية | Ford, Disney | للأعمال العائلية |

## أدوات مساعدة

- **Namelix** — مولّد أسماء AI
- **Namecheap Domain Search** — للنطاقات
- **Trademark Search** للأسماء التجارية المسجلة
- **Google Translate** للتحقق من المعاني بلغات متعددة

## أخطاء شائعة في تسمية الشركات

- ❌ اسم طويل جداً (أكثر من 3 مقاطع)
- ❌ يستخدم أرقاماً وحروفاً معاً (Bus1ness)
- ❌ ينطق بطريقتين مختلفتين بالعربية والإنجليزية
- ❌ مرتبط بترند مؤقت (ChatGPTBakery)
- ❌ يصعب البحث عنه في Google لأنه شائع جداً

## قائمة تحقق نهائية قبل التسجيل الرسمي

اعتبر الاسم جاهزاً للتسجيل فقط بعد تخطّي كل النقاط التالية:

- ☐ نطقه واضح بصوت عالٍ أمام 5 أشخاص دون توضيح.
- ☐ اسم النطاق .com متاح، أو على الأقل .co أو نطاق دولتك.
- ☐ معرّف Instagram و X (تويتر سابقاً) و TikTok متاحون أو قريبون.
- ☐ لا يطابق علامة تجارية مسجَّلة في سجل وزارة التجارة بدولتك.
- ☐ لا يحمل دلالة سلبية في العربية الفصحى أو لهجات الدول التي تستهدفها.
- ☐ سهل الكتابة في شريط البحث على الجوال (لا حروف متشابهة، لا أرقام بدل حروف).
- ☐ يبدو جيداً كشعار مكتوب وكنص عادي.
- ☐ لا يحدّك بمنتج أو فئة واحدة عند التوسّع.

## أمثلة على أسماء قوية وأسماء ضعيفة

| اسم قوي | لماذا قوي؟ | اسم ضعيف | لماذا ضعيف؟ |
|---------|------------|----------|-------------|
| نون | قصير، عربي، سهل النطق دولياً | شركة الخدمات الرقمية المتطوّرة | طويل ووصفي |
| سدرة | معنى أصيل، مميَّز | TechSolutions24 | مولّد شائع، يصعب البحث عنه |
| طلبات | يصف الفعل بسلاسة | كتب الرياض | يحدّك جغرافياً ومنتجياً |
| كريم | اسم بسيط، علامة بصرية واضحة | InV0iceMaster | حروف وأرقام معاً، صعب التذكّر |

## تذكير: النطاق ووسائل التواصل أولاً

قبل التوقيع على عقد التأسيس، احجز:

1. اسم النطاق الرئيسي (حتى لو أرجأت بناء الموقع).
2. معرّف موحَّد على Instagram و X و LinkedIn.
3. إيميل احترافي على نطاقك (info@…).

من الأفضل التراجع عن اسم في مرحلة الفكرة من تغييره بعد طباعة 5,000 بطاقة عمل و[فواتير](/invoice) بهويته.

## أسئلة شائعة (FAQ)

**هل يجب تسجيل الاسم التجاري قبل بدء العمل؟**
نعم لو كنت تتعامل بفواتير رسمية أو تفتح حساباً بنكياً تجارياً. أما النشاط الفردي العرضي فقد يكون مرناً وفق قوانين بلدك.

**هل يمكن تغيير الاسم لاحقاً؟**
ممكن لكنه مكلف: سجلات حكومية، عقود، حسابات بنكية، طباعة، مواقع، وصورة العملاء عنك. التغيير المتأخّر قد يكلّف عشرة أضعاف الاختيار الجيّد منذ البداية.

**كيف أحجز الاسم بسرعة في الإمارات أو السعودية؟**
في السعودية عبر منصة وزارة التجارة، وفي الإمارات عبر دائرة الاقتصاد المعنية بالإمارة. الإجراء غالباً إلكتروني وسريع.

**ما الفرق بين الاسم التجاري والعلامة التجارية؟**
الاسم التجاري هو هويتك القانونية. العلامة التجارية هي الشكل/الشعار/الكلمة المُسجَّلة لحماية تميّزك في السوق.

**هل أحتاج محامياً للتسجيل؟**
ليس إلزامياً للأسماء البسيطة، لكنه مفيد عند التشابه مع علامات قائمة، وعند التسجيل الدولي. استخدم [القوالب](/templates) لتوحيد المستندات الأولى.

## ابدأ تأسيس هويتك التجارية

بعد اختيار الاسم، تحتاج إلى:
- شعار احترافي
- ألوان موحدة
- قوالب فواتير ومستندات بالهوية

[أنشئ فاتورتك بهويتك التجارية الجديدة](/invoice)
    `.trim(),
    contentEn: `
## Why Your Brand Name Matters

A brand name is the first impression. Strong names compress years of marketing into a single word.

## 7 Criteria for a Great Brand Name

### 1. Easy to pronounce in Arabic and English

Avoid sounds that confuse non-Arab speakers or younger Arabs who rely on transliteration.

### 2. Easy to spell and remember

Test it: if someone hears it once, can they spell it without help?

### 3. Available as a .com

Check availability on [namecheap.com](https://namecheap.com) or a similar registrar.

### 4. Legally registrable

Search the corporate registry in your country (e.g. KSA Ministry of Commerce or Dubai DED).

### 5. No negative meaning in other languages

Famous mistakes: don't pick a name that means something offensive in Spanish or French if you target multiple markets.

### 6. Flexible enough to grow

Avoid names that lock you to a single product. "Riyadh Books" boxes you in if you ever want to sell anything else.

### 7. Tells a story

The best names hint at the service without spelling it out.

## Common Naming Patterns

| Pattern | Example | When to use it |
|---------|---------|----------------|
| Real words | Apple, Shell | When the word evokes value |
| Mash-ups | Microsoft, FedEx | Tech and modern brands |
| Acronyms | IBM, BMW | When full names are too long |
| Coined words | Kodak, Xerox | For total uniqueness |
| Family names | Ford, Disney | For family businesses |

## Useful Tools

- **Namelix** — AI name generator
- **Namecheap Domain Search** — domain checks
- **Trademark Search** for registered marks
- **Google Translate** to sanity-check meanings in other languages

## Common Naming Mistakes

- ❌ Too long (more than 3 syllables)
- ❌ Mixing letters and digits (Bus1ness)
- ❌ Pronounced differently in Arabic and English
- ❌ Tied to a temporary trend (ChatGPTBakery)
- ❌ Too generic to find on Google

## Final Checklist Before Official Registration

Treat the name as ready for registration only after every box below is ticked:

- ☐ Spoken clearly out loud in front of 5 people without further explanation.
- ☐ The .com domain is available, or at least .co or your country's TLD.
- ☐ Instagram, X (formerly Twitter) and TikTok handles are free or close.
- ☐ No conflict with a registered trademark on your country's commercial registry.
- ☐ No negative meaning in Standard Arabic or the dialects of the countries you target.
- ☐ Easy to type on a mobile search bar (no lookalike characters, no digits in place of letters).
- ☐ Looks good both as a designed logo and as plain text.
- ☐ Does not box you into one product or category as you grow.

## Strong vs Weak Name Examples

| Strong name | Why strong | Weak name | Why weak |
|-------------|------------|-----------|----------|
| Noon | Short, Arabic, easy globally | Advanced Digital Services Co. | Long and descriptive |
| Sidra | Authentic meaning, distinctive | TechSolutions24 | Generated, hard to search |
| Talabat | Describes the verb naturally | Riyadh Books | Locks you into geography and product |
| Careem | Simple, clear visual mark | InV0iceMaster | Mixes letters and digits, hard to remember |

## Reminder: Lock the Domain and Social Handles First

Before signing the incorporation papers, secure:

1. The main domain name (even if you delay building the site).
2. A unified handle on Instagram, X and LinkedIn.
3. A professional email on your domain (info@…).

It's much cheaper to drop a name at the idea stage than to change it after you've printed 5,000 business cards and [invoices](/invoice) in its identity.

## Frequently Asked Questions

**Do I have to register the name before starting?**
Yes if you'll issue formal invoices or open a commercial bank account. A casual side activity may have more flexibility depending on local law.

**Can I change the name later?**
Possible but expensive: government records, contracts, bank accounts, printed assets, websites and customer perception all change with it. A late switch can cost ten times more than choosing well from the start.

**How do I quickly reserve a name in the UAE or Saudi Arabia?**
In Saudi Arabia through the Ministry of Commerce platform; in the UAE through the relevant emirate's economic department. The process is usually online and quick.

**What's the difference between a trade name and a trademark?**
A trade name is your legal identity. A trademark is the registered word/logo/mark that protects your distinctiveness in the marketplace.

**Do I need a lawyer to register?**
Not strictly for simple names, but useful when there is similarity to existing marks or for international registration. Use the [templates](/templates) to standardise your first set of documents.

## Start Building Your Brand

Once the name is chosen, you'll need:
- A professional logo
- A consistent colour palette
- Branded invoice and document templates

[Create your invoice with your new brand](/invoice).
    `.trim(),
  },

  {
    slug: "حماية-بيانات-العملاء",
    cover: "blog/cover-customer-data-protection.png",
    titleAr: "كيف تحمي بيانات عملائك في عملك الصغير؟",
    titleEn: "How to Protect Customer Data in Your Small Business",
    excerptAr:
      "أساسيات حماية البيانات لأصحاب الأعمال الصغيرة والمستقلين، من كلمات السر إلى التشفير وقوانين الخصوصية.",
    excerptEn:
      "Data protection basics for small business owners and freelancers — from passwords to encryption and privacy laws.",
    date: "2026-04-23",
    readTime: 6,
    category: "business",
    keywordAr: "حماية بيانات العملاء",
    keywordEn: "customer data protection",
    relatedSlugs: [
      "برنامج-فواتير-للشركات-الصغيرة",
      "اخطاء-الفواتير-الشائعة",
      "انشاء-فاتورة-مجانية-اونلاين",
    ],
    contentAr: `
## لماذا حماية بيانات العملاء مسؤولية وليست خياراً؟

- **قانوناً:** قوانين حماية البيانات منتشرة عالمياً (GDPR في أوروبا، PDPL في السعودية)
- **سمعةً:** اختراق بياناتك يُدمّر ثقة العملاء
- **مالياً:** الغرامات قد تصل لملايين الدولارات في GDPR

## ٨ خطوات أساسية لحماية بيانات العملاء

### ١. كلمات سر قوية ومدير كلمات سر

استخدم 1Password أو Bitwarden. اجعل كل كلمة سر فريدة وعشوائية وأطول من 16 حرفاً.

### ٢. التحقق بخطوتين (2FA)

فعّله على كل حساب مهم — البريد، البنك، أدوات العمل.

### ٣. التشفير

استخدم HTTPS دائماً. شفّر الأقراص الصلبة (BitLocker على Windows، FileVault على macOS).

### ٤. النسخ الاحتياطي المنتظم

قاعدة 3-2-1: 3 نسخ، 2 على وسائط مختلفة، 1 خارج الموقع.

### ٥. الحد الأدنى من البيانات

لا تجمع بيانات لا تحتاجها. كل بيانات إضافية = مخاطر إضافية.

### ٦. تدريب الفريق

أكثر الاختراقات تأتي من خطأ بشري — التصيّد الإلكتروني (Phishing).

### ٧. سياسة خصوصية واضحة

اشرح للعميل ما تجمعه، لماذا، وكيف تحميه.

### ٨. تحديث البرامج

البرامج القديمة بها ثغرات معروفة. حدّث كل شيء بانتظام.

## قوانين حماية البيانات في المنطقة

| الدولة | القانون | السنة |
|--------|---------|------|
| السعودية | PDPL | 2021 |
| الإمارات | UAE Data Protection Law | 2021 |
| البحرين | PDPL | 2018 |
| قطر | Data Privacy Law | 2016 |
| المغرب | Loi 09-08 | 2009 |
| مصر | قانون حماية البيانات الشخصية | 2020 |

## ماذا تفعل عند حدوث اختراق؟

1. **العزل الفوري** — افصل النظام المخترق
2. **التقييم** — ما البيانات المتأثرة؟
3. **الإبلاغ** — أبلغ الجهة المختصة (خلال 72 ساعة في GDPR)
4. **إعلام العملاء** — شفافية كاملة
5. **التحقيق والإصلاح**

## ما هي البيانات الحساسة التي تحتاج حماية إضافية؟

ليست كل البيانات بنفس الأهمية. تعامل مع هذه الفئات بحرص خاص:

- **بيانات الدفع:** أرقام البطاقات، تفاصيل البنك، صور الإيصالات.
- **الهوية الرسمية:** صور الهوية الوطنية، جواز السفر، الرخص التجارية.
- **بيانات صحية:** أي معلومة طبية يشاركها العميل ضمن الخدمة.
- **مراسلات داخلية:** تعليقات حول العميل مكتوبة بين فريقك.
- **سجلات الموقع والجلسة:** عناوين IP، بصمة الجهاز، سلوك التصفّح.

كلما زادت حساسية البيانات، قلَّ عدد الأشخاص الذين يجب أن يصلوا إليها.

## قائمة تحقق سريعة لحماية البيانات في عملك الصغير

- ☐ كلمات سر فريدة لكل خدمة عبر مدير كلمات سر.
- ☐ تفعيل التحقّق بخطوتين على البريد، البنك، والأدوات الإدارية.
- ☐ تشفير القرص الصلب على كل جهاز يحتوي بيانات العملاء.
- ☐ نسخ احتياطي أسبوعي على وسيط منفصل.
- ☐ حذف بيانات العملاء القدامى الذين انتهت علاقتك بهم وفق القانون المحلي.
- ☐ سياسة خصوصية مكتوبة على موقعك تشرح ما تجمعه ولماذا.
- ☐ صلاحيات وصول محددة: من يرى ماذا داخل فريقك.
- ☐ بريد عمل منفصل عن البريد الشخصي.

## نصائح آمنة لمشاركة المستندات مع العملاء

- لا ترسل [فاتورة](/invoice) أو [إيصالاً](/receipt) يحتوي بيانات حساسة عبر قنوات عامة دون كلمة سر للملف.
- عند المشاركة عبر التخزين السحابي، استخدم رابطاً ينتهي بعد فترة، لا رابطاً دائماً للجميع.
- احذف الملفات المؤقتة من سطح المكتب بعد إرسالها.
- استخدم [القوالب](/templates) المعتمدة بدلاً من ملفات قديمة قد تحتوي بيانات عملاء سابقين.

## مثال عملي: مشاركة فاتورة بأمان

1. أنشئ الفاتورة في المتصفح.
2. صدّرها كـ PDF.
3. شفّرها بكلمة سر بسيطة (متاح في معظم برامج القراءة).
4. أرسل الملف عبر البريد، وأرسل كلمة السر عبر قناة مختلفة (واتساب أو رسالة نصية).
5. تأكَّد من حذف الملف من المرفقات بعد فترة محدّدة.

## أسئلة شائعة (FAQ)

**هل يحق للعميل طلب حذف بياناته؟**
نعم في معظم القوانين الحديثة (مثل PDPL وGDPR). أعدَّ مساراً واضحاً للحذف وثبّت زمناً للاستجابة.

**كم من الوقت يجب الاحتفاظ بفواتير العملاء؟**
تختلف المدة من بلد لآخر، وغالباً تتراوح بين 5 و10 سنوات لأغراض ضريبية ومحاسبية. تحقّق من مدّة الحفظ في بلدك.

**هل واتساب آمن لمشاركة الفواتير؟**
المراسلات مشفّرة من طرف لطرف، لكن الملفات تبقى على جهاز العميل. لا ترسل بيانات بطاقات أو هوية عبره.

**ماذا أفعل لو فقدت جهازي الذي به بيانات العملاء؟**
فعّل ميزة المسح عن بُعد فوراً، غيّر كل كلمات السر، وأبلغ الجهة المنظِّمة لو كان القانون يُلزمك.

**هل أحتاج موظف أمن معلومات في عمل صغير؟**
ليس بالضرورة. الالتزام بالقائمة أعلاه يكفي لمعظم الأعمال الصغيرة، مع مراجعة سنوية لمختصّ.

## كيف يضمن Xuvilo خصوصية بياناتك؟

- ✅ معالجة كل البيانات في متصفحك (Client-side)
- ✅ لا يُرسل إلى خوادم بدون موافقتك
- ✅ تخزين محلي مشفّر
- ✅ بدون تسجيل = بدون قاعدة بيانات تحوي معلوماتك

[ابدأ بأمان كامل](/invoice) مع Xuvilo.
    `.trim(),
    contentEn: `
## Why Customer Data Protection Is a Responsibility, Not an Option

- **Legally:** data protection laws are now widespread (GDPR in Europe, PDPL in Saudi Arabia, similar laws across MENA)
- **Reputationally:** a single breach destroys customer trust
- **Financially:** GDPR fines can reach millions of dollars

## 8 Basic Steps to Protect Customer Data

### 1. Strong passwords + a password manager

Use 1Password or Bitwarden. Every password must be unique, random and at least 16 characters long.

### 2. Two-factor authentication (2FA)

Turn it on for every important account — email, bank, business tools.

### 3. Encryption

Always use HTTPS. Encrypt your hard drives (BitLocker on Windows, FileVault on macOS).

### 4. Regular backups

The 3-2-1 rule: 3 copies, 2 different media, 1 off-site.

### 5. Collect the minimum

Don't store data you don't need. Extra data = extra risk.

### 6. Train your team

Most breaches come from human error — phishing.

### 7. A clear privacy policy

Tell the client what you collect, why, and how you protect it.

### 8. Keep software up to date

Old software has known vulnerabilities. Update everything regularly.

## Data Protection Laws in the Region

| Country | Law | Year |
|---------|-----|------|
| Saudi Arabia | PDPL | 2021 |
| UAE | UAE Data Protection Law | 2021 |
| Bahrain | PDPL | 2018 |
| Qatar | Data Privacy Law | 2016 |
| Morocco | Loi 09-08 | 2009 |
| Egypt | Personal Data Protection Law | 2020 |

## What to Do When a Breach Happens

1. **Contain immediately** — isolate the compromised system
2. **Assess** — what data was affected?
3. **Notify the regulator** (within 72 hours under GDPR)
4. **Inform customers** — full transparency
5. **Investigate and remediate**

## Which Data Categories Need Extra Protection?

Not every piece of data carries the same weight. Treat these categories with extra care:

- **Payment data:** card numbers, bank details, scanned receipts.
- **Official ID:** copies of national ID, passport, trade licences.
- **Health-related data:** any medical information shared as part of the service.
- **Internal communication:** notes about clients written within your team.
- **Site and session logs:** IP addresses, device fingerprints, browsing behaviour.

The more sensitive the data, the fewer people should have access to it.

## A Quick Data-Protection Checklist for a Small Business

- ☐ Unique passwords for every service via a password manager.
- ☐ Two-factor authentication on email, banking and admin tools.
- ☐ Disk encryption on every device that stores client data.
- ☐ Weekly backups to a separate medium.
- ☐ Delete data of clients you no longer work with, in line with local law.
- ☐ A written privacy policy on your site explaining what you collect and why.
- ☐ Defined access permissions: who sees what within your team.
- ☐ A work email kept separate from personal email.

## Safe Tips for Sharing Documents With Clients

- Don't send an [invoice](/invoice) or a [receipt](/receipt) containing sensitive data over public channels without password-protecting the file.
- When sharing via cloud storage, use an expiring link rather than a permanent share-with-anyone URL.
- Delete temporary files from your desktop after sending.
- Use approved [templates](/templates) instead of recycling old files that may still contain previous client data.

## Practical Example: Sharing an Invoice Securely

1. Create the invoice in the browser.
2. Export it as a PDF.
3. Encrypt it with a simple password (most readers support this).
4. Send the file by email and the password through a different channel (WhatsApp or SMS).
5. Make sure the file is removed from attachments after a defined period.

## Frequently Asked Questions

**Can clients ask to delete their data?**
Yes, in most modern laws (e.g. PDPL and GDPR). Set up a clear deletion path and a defined response time.

**How long should I keep client invoices?**
This varies by country and is usually 5 to 10 years for tax and accounting purposes. Verify the retention period in your jurisdiction.

**Is WhatsApp safe for sharing invoices?**
Messages are end-to-end encrypted, but files end up on the client's device. Don't share card or ID data through it.

**What if I lose a device that holds client data?**
Trigger remote wipe immediately, change all passwords, and notify the regulator if the law requires you to.

**Do I need an information-security officer in a small business?**
Not necessarily. Following the checklist above is enough for most small businesses, with an annual review by a specialist.

## How Xuvilo Protects Your Data

- ✅ All processing happens in your browser (client-side)
- ✅ Nothing is sent to a server without your consent
- ✅ Encrypted local storage
- ✅ No signup means no central database with your data

[Start safely](/invoice) with Xuvilo.
    `.trim(),
  },

  {
    slug: "تأسيس-شركة-في-الامارات",
    cover: "blog/cover-uae-company-formation.png",
    titleAr: "كيف تؤسس شركة في الإمارات: الأنواع والتكاليف والخطوات",
    titleEn: "How to Set Up a Company in the UAE: Types, Costs and Steps",
    metaTitleAr: "كيف تؤسس شركة في الإمارات | Xuvilo",
    metaTitleEn: "How to Set Up a Company in the UAE | Xuvilo",
    excerptAr:
      "دليل مبسّط لتأسيس شركة في الإمارات — Mainland مقابل Free Zone، الخطوات، التكاليف الحقيقية، والتوصيات للمستقلين.",
    excerptEn:
      "A simplified guide to setting up a UAE company — Mainland vs Free Zone, the steps, the real costs, and recommendations for freelancers.",
    date: "2026-04-23",
    readTime: 8,
    category: "laws",
    keywordAr: "تأسيس شركة في الامارات",
    keywordEn: "company formation UAE",
    relatedSlugs: [
      "ضريبة-القيمة-المضافة-الامارات",
      "اختيار-اسم-تجاري-للشركة",
      "ضريبة-الدخل-للمستقلين",
    ],
    contentAr: `
## أنواع الشركات في الإمارات

### Mainland (البر الرئيسي)

- يسمح بالعمل في كل الإمارات
- تطلب رخصة من الدائرة الاقتصادية في الإمارة (DED في دبي)
- منذ 2021 يُسمح بـ 100% ملكية أجنبية في معظم الأنشطة

### Free Zone (المنطقة الحرة)

- 100% ملكية أجنبية
- إعفاءات ضريبية لفترات محددة
- لا يمكن العمل مباشرة مع السوق المحلي بدون موزع
- أمثلة: DMCC, JAFZA, ADGM, IFZA

### Offshore

- لأغراض حماية الأصول والاستثمار
- لا تشغيل عمليات داخل الإمارات
- مثل JAFZA Offshore و RAK ICC

## مقارنة: Mainland vs Free Zone

| المعيار | Mainland | Free Zone |
|---------|----------|-----------|
| الملكية الأجنبية | 100% (معظم الأنشطة) | 100% |
| العمل المحلي | مباشر | عبر موزع |
| المكتب الفعلي | إلزامي | مكتب افتراضي ممكن |
| التأشيرات | غير محدود | محدود حسب الباقة |
| التكلفة الأولية | متوسطة-عالية | منخفضة-متوسطة |
| المرونة في الأنشطة | عالية | محدودة بقائمة |

## التكاليف التقديرية (2026)

- **Free Zone Freelance permit:** AED 7,500 - 15,000/سنة
- **Free Zone Company:** AED 12,500 - 30,000/سنة
- **Mainland LLC:** AED 25,000 - 50,000/سنة
- **مكتب فعلي:** AED 15,000+ سنوياً
- **تأشيرة موظف:** AED 4,000 - 6,000

## خطوات التأسيس

### الخطوة ١: اختيار النشاط

اطلع على القائمة الرسمية من DED أو المنطقة الحرة. ليست كل الأنشطة مسموحة في كل منطقة.

### الخطوة ٢: اختيار الاسم التجاري

- لا يحوي ألفاظ دينية أو سياسية
- متاح في النظام
- يطابق نشاطك

### الخطوة ٣: التسجيل المبدئي

تقديم الطلب مع نسخ جوازات السفر للشركاء.

### الخطوة ٤: الموافقة الأولية

تستغرق 1-3 أيام عمل عادةً.

### الخطوة ٥: المستندات النهائية

- عقد التأسيس
- إثبات العنوان
- الموافقات الإضافية حسب النشاط

### الخطوة ٦: استلام الرخصة

تستلم الرخصة التجارية ويبدأ نشاطك رسمياً.

### الخطوة ٧: التأشيرات والحسابات البنكية

- تأشيرة المستثمر
- تأشيرات الموظفين
- فتح حساب بنكي تجاري (يستغرق 2-6 أسابيع)

## نصائح للمستقلين

- ابدأ بـ **Freelance Permit** في منطقة حرة قبل LLC
- اختر منطقة حرة قريبة من عملائك (DMCC, IFZA لدبي)
- احتسب تكاليف التجديد السنوي قبل اتخاذ القرار
- استشر مستشاراً قانونياً متخصصاً

## كيف يساعدك Xuvilo بعد التأسيس؟

- فواتير متوافقة مع FTA الإماراتية
- VAT 5% تلقائي
- TRN مدمج في القالب
- دعم AED والدرهم بشكل كامل

[ابدأ بفوترة شركتك الإماراتية الجديدة](/invoice?currency=AED)
    `.trim(),
    contentEn: `
## Types of UAE Companies

### Mainland

- Allows trading anywhere in the UAE
- Requires a licence from the Department of Economic Development (DED in Dubai)
- Since 2021, 100% foreign ownership is allowed in most activities

### Free Zone

- 100% foreign ownership
- Tax incentives for set periods
- Can't trade directly with the local market without a distributor
- Examples: DMCC, JAFZA, ADGM, IFZA

### Offshore

- For asset protection and holding purposes
- No operations inside the UAE
- e.g. JAFZA Offshore and RAK ICC

## Mainland vs Free Zone Comparison

| Criterion | Mainland | Free Zone |
|-----------|----------|-----------|
| Foreign ownership | 100% (most activities) | 100% |
| Local trading | Direct | Through a distributor |
| Physical office | Required | Virtual office possible |
| Visas | Unlimited | Capped by package |
| Initial cost | Medium-high | Low-medium |
| Activity flexibility | High | Limited to a list |

## Estimated Costs (2026)

- **Free Zone freelance permit:** AED 7,500 – 15,000/year
- **Free Zone company:** AED 12,500 – 30,000/year
- **Mainland LLC:** AED 25,000 – 50,000/year
- **Physical office:** AED 15,000+ per year
- **Employee visa:** AED 4,000 – 6,000

## Setup Steps

### Step 1: Pick your activity

Check the official list from the DED or your chosen Free Zone — not every activity is permitted in every zone.

### Step 2: Choose a trade name

- No religious or political terms
- Available in the registry
- Matches your activity

### Step 3: Initial submission

Submit the application with passport copies of partners.

### Step 4: Initial approval

Usually takes 1–3 working days.

### Step 5: Final documents

- Memorandum of Association
- Proof of address
- Activity-specific approvals

### Step 6: Receive the licence

You receive your trade licence and can start trading.

### Step 7: Visas and bank accounts

- Investor visa
- Employee visas
- Open a corporate bank account (typically 2–6 weeks)

## Tips for Freelancers

- Start with a **Freelance Permit** in a Free Zone before forming an LLC
- Pick a Free Zone close to your client base (DMCC, IFZA for Dubai)
- Factor annual renewal cost into your decision
- Consult a specialised legal adviser

## How Xuvilo Helps After Setup

- FTA-compliant invoices
- Automatic 5% VAT
- TRN field built into the template
- Full AED and dirham support

[Start invoicing your new UAE company](/invoice?currency=AED)
    `.trim(),
  },

  {
    slug: "افضل-طرق-الدفع-اونلاين",
    cover: "blog/cover-online-payments.png",
    titleAr: "أفضل طرق الدفع الإلكتروني للشركات الصغيرة في الخليج",
    titleEn: "Best Online Payment Methods for Gulf Small Businesses",
    metaTitleAr: "أفضل طرق الدفع الإلكتروني للشركات | Xuvilo",
    metaTitleEn: "Best Online Payment Methods for Gulf SMBs | Xuvilo",
    excerptAr:
      "مقارنة بين بوابات الدفع المتاحة في الخليج: Tap, Stripe, PayTabs, HyperPay، رسومها، وأيها يناسب نشاطك.",
    excerptEn:
      "A comparison of payment gateways available in the Gulf — Tap, Stripe, PayTabs, HyperPay — their fees and which one fits your business.",
    date: "2026-04-23",
    readTime: 7,
    category: "business",
    keywordAr: "بوابات الدفع الخليج",
    keywordEn: "Gulf payment gateways",
    relatedSlugs: [
      "برنامج-فواتير-للشركات-الصغيرة",
      "كيف-تتبع-المدفوعات-المتأخرة",
      "انشاء-فاتورة-مجانية-اونلاين",
    ],
    contentAr: `
## لماذا تحتاج بوابة دفع إلكتروني؟

- ✅ دفع فوري بدلاً من انتظار التحويل البنكي
- ✅ تسجيل تلقائي للمعاملات
- ✅ تجربة عميل أفضل
- ✅ سجل دفع موثق للضرائب

## أشهر بوابات الدفع في الخليج

### ١. Tap Payments — الأكثر استخداماً

- يدعم: السعودية، الإمارات، الكويت، البحرين، قطر، عمان
- العملات: SAR, AED, KWD, BHD, QAR, OMR, USD, EUR
- الرسوم: 2.85% + رسوم ثابتة بالعملة المحلية
- مدة الاستلام: 2-3 أيام عمل
- يدعم: Mada, Visa, Mastercard, Apple Pay, KNET, Benefit

### ٢. PayTabs — الخيار السعودي

- يدعم: السعودية، الإمارات، مصر، الأردن
- الرسوم: 2.75% + 1 ريال
- مدة الاستلام: 1-2 يوم عمل
- ممتاز لـ: Mada، التسجيل في السعودية بسرعة

### ٣. HyperPay — للأعمال الكبيرة

- يدعم: السعودية، الإمارات، الأردن، لبنان، مصر
- الرسوم: تفاوضية حسب الحجم
- يدعم: Mada, Apple Pay, مرنة في التكامل API
- ممتاز لـ: المتاجر الكبيرة، المؤسسات

### ٤. Stripe — للشركات الدولية

- ⚠️ يعمل في الإمارات، لكن غير متاح رسمياً في معظم دول الخليج
- الرسوم: 2.9% + 0.30 USD
- ممتاز لـ: عملاء أمريكيين/أوروبيين، متجر دولي
- ⚠️ بعض البنوك العربية لا تستلم منه مباشرة

### ٥. PayPal — للأفراد والمستقلين

- متاح للاستلام في معظم دول الخليج
- الرسوم: 4.4% + رسوم تحويل عملة
- مدة الاستلام: فوري في PayPal، 3-5 أيام للسحب البنكي
- ⚠️ رسوم أعلى لكن مناسب للمستقلين الذين يخدمون عملاء دوليين

## مقارنة سريعة

| المعيار | Tap | PayTabs | Stripe | PayPal |
|---------|-----|---------|--------|--------|
| التغطية الخليجية | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| الرسوم | متوسطة | منخفضة | متوسطة | عالية |
| دعم Mada | ✅ | ✅ | ❌ | ❌ |
| سهولة التكامل | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| العملاء الدوليون | جيد | جيد | ممتاز | ممتاز |

## كيف تختار البوابة المناسبة؟

- **متجر سعودي محلي:** Tap أو PayTabs (دعم Mada ضروري)
- **متجر إماراتي:** Tap أو HyperPay
- **مستقل دولي:** PayPal + حساب بنكي محلي
- **شركة SaaS تستهدف العالم:** Stripe + PayTabs
- **متجر يبيع في GCC كله:** Tap الأول

## دمج رابط الدفع في فواتيرك

في Xuvilo، يمكنك إضافة رابط الدفع مع رمز QR في الفاتورة مباشرة:

1. أنشئ فاتورة [في Xuvilo](/invoice)
2. في قسم "بيانات الدفع"، الصق رابط Tap/PayTabs/Stripe
3. سيُنشأ رمز QR تلقائياً
4. العميل يدفع بفتح الكاميرا أو النقر على الرابط

## نصائح أمان للمدفوعات الإلكترونية

- ✅ لا تخزن بيانات بطاقات العملاء أبداً (دع البوابة تفعل ذلك)
- ✅ استخدم HTTPS دائماً
- ✅ فعّل 3D Secure
- ✅ راجع المعاملات يومياً
- ✅ اضبط حدوداً يومية للمعاملات

[ابدأ بقبول الدفع الإلكتروني في فواتيرك](/invoice)
    `.trim(),
    contentEn: `
## Why You Need an Online Payment Gateway

- ✅ Instant payment instead of waiting for a bank transfer
- ✅ Automatic transaction logging
- ✅ Better customer experience
- ✅ A documented payment record for tax purposes

## The Top Gulf Payment Gateways

### 1. Tap Payments — the most popular

- Supports: Saudi Arabia, UAE, Kuwait, Bahrain, Qatar, Oman
- Currencies: SAR, AED, KWD, BHD, QAR, OMR, USD, EUR
- Fees: 2.85% + a fixed fee in local currency
- Settlement: 2–3 business days
- Supports: Mada, Visa, Mastercard, Apple Pay, KNET, Benefit

### 2. PayTabs — the Saudi favourite

- Supports: Saudi Arabia, UAE, Egypt, Jordan
- Fees: 2.75% + SAR 1
- Settlement: 1–2 business days
- Best for: Mada and quick registration in KSA

### 3. HyperPay — for larger businesses

- Supports: Saudi Arabia, UAE, Jordan, Lebanon, Egypt
- Fees: negotiable by volume
- Supports: Mada, Apple Pay, flexible API integration
- Best for: large stores and enterprises

### 4. Stripe — for international businesses

- ⚠️ Works in the UAE but isn't officially available in most GCC countries
- Fees: 2.9% + USD 0.30
- Best for: US/EU customers and international storefronts
- ⚠️ Some Arab banks don't accept Stripe payouts directly

### 5. PayPal — for individuals and freelancers

- Receivable in most GCC countries
- Fees: 4.4% + currency conversion
- Settlement: instant inside PayPal, 3–5 days for bank withdrawal
- ⚠️ Higher fees but ideal for freelancers serving international clients

## Quick Comparison

| Criterion | Tap | PayTabs | Stripe | PayPal |
|-----------|-----|---------|--------|--------|
| Gulf coverage | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Fees | Medium | Low | Medium | High |
| Mada support | ✅ | ✅ | ❌ | ❌ |
| Integration ease | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| International clients | Good | Good | Excellent | Excellent |

## How to Pick the Right Gateway

- **Local Saudi store:** Tap or PayTabs (Mada support is essential)
- **UAE store:** Tap or HyperPay
- **International freelancer:** PayPal + a local bank account
- **Global SaaS company:** Stripe + PayTabs
- **GCC-wide store:** Tap first

## Embed a Payment Link in Your Invoices

In Xuvilo you can add a payment link with a QR code directly to the invoice:

1. Create an invoice in [Xuvilo](/invoice)
2. In the "Payment details" section, paste a Tap/PayTabs/Stripe link
3. A QR code is generated automatically
4. The customer pays by scanning or tapping the link

## Security Tips for Online Payments

- ✅ Never store customer card data (let the gateway handle it)
- ✅ Always use HTTPS
- ✅ Enable 3D Secure
- ✅ Review transactions daily
- ✅ Set daily transaction limits

[Start accepting online payments on your invoices](/invoice).
    `.trim(),
  },

  {
    slug: "ادارة-التدفق-النقدي",
    cover: "blog/cover-cash-flow.png",
    titleAr: "إدارة التدفق النقدي للأعمال الصغيرة — الدليل العملي",
    titleEn: "Cash Flow Management for Small Businesses — A Practical Guide",
    metaTitleAr: "إدارة التدفق النقدي للأعمال الصغيرة | Xuvilo",
    metaTitleEn: "Cash Flow Management for Small Businesses | Xuvilo",
    excerptAr:
      "كيف تحافظ على سيولة عملك الصغير، تتجنب الأزمات النقدية، وتقرأ تقاريرك المالية بسهولة.",
    excerptEn:
      "How to keep your small business liquid, avoid cash crunches, and read your financial reports without an accounting degree.",
    date: "2026-04-23",
    readTime: 7,
    category: "tips",
    keywordAr: "التدفق النقدي",
    keywordEn: "cash flow",
    relatedSlugs: [
      "كيف-تتبع-المدفوعات-المتأخرة",
      "اخطاء-الفواتير-الشائعة",
      "برنامج-فواتير-للشركات-الصغيرة",
    ],
    contentAr: `
## ما هو التدفق النقدي ولماذا قد يقتل عملك؟

التدفق النقدي = النقد الداخل ناقص النقد الخارج. الربح على الورق لا يساوي شيئاً إن كانت السيولة عندك صفر.

> 82% من الأعمال الصغيرة تفلس بسبب مشاكل تدفق نقدي وليس بسبب نقص الأرباح.

## مكونات التدفق النقدي

| النوع | التعريف | أمثلة |
|-------|---------|------|
| تدفق تشغيلي | من النشاط الأساسي | فواتير العملاء، رواتب |
| تدفق استثماري | شراء/بيع أصول | معدات، استثمارات |
| تدفق تمويلي | قروض ودين | قرض بنكي، توزيعات |

## ٧ مبادئ لإدارة تدفق نقدي صحي

### ١. اطلب دفعات مقدمة

50% مقدم من العملاء الجدد قاعدة ذهبية.

### ٢. قصّر مدة استحقاق فواتيرك

Net 30 → Net 15 → Net 7. كل يوم أقصر = سيولة أسرع.

### ٣. أطل مدة دفع موردين (بحدود)

تفاوض على Net 30 أو Net 45 مع الموردين.

### ٤. حافظ على احتياطي نقدي

3-6 أشهر من المصاريف التشغيلية في حساب منفصل.

### ٥. تجنب الإفراط في المخزون

المخزون الزائد = نقد عالق.

### ٦. راقب تقادم الفواتير أسبوعياً

أي فاتورة تتجاوز 30 يوماً متأخرة، اضغط فوراً.

### ٧. تنبأ بالتدفق النقدي 3 أشهر للأمام

اعرف موعد الذروة وموعد الانخفاض.

## كيف تقرأ بيان التدفق النقدي؟

\`\`\`
رصيد بداية الفترة:    50,000
+ المقبوضات:          120,000
- المدفوعات:          (90,000)
─────────────────────
صافي التدفق:           30,000
رصيد نهاية الفترة:     80,000
\`\`\`

إن كان صافي التدفق سالباً لأشهر متتالية، عندك مشكلة.

## مؤشرات تحذيرية

- ❌ متوسط أيام التحصيل يزداد
- ❌ معدّل دوران المخزون ينخفض
- ❌ تستخدم بطاقة ائتمانية لرواتب
- ❌ تأجيل دفع الموردين أصبح عادة
- ❌ تأخذ قرضاً لسد قرض

## أدوات وقوالب مساعدة

- **جدول إكسل بسيط** يكفي للبدء
- **QuickBooks / Zoho Books** للأعمال الأكبر
- **Xuvilo Dashboard** للمستقلين والشركات الصغيرة
- **حاسبة تقادم الفاتورة** ضمن Xuvilo

## نصيحة الذهبية

> "Cash is king" — حتى لو كانت أرباحك مرتفعة، السيولة هي ما يبقيك حياً.

## ابدأ تتبّع تدفقك النقدي اليوم

[لوحة تحكم Xuvilo](/dashboard) تعطيك تقرير مدفوعات بسيط وفعّال — مجاني للمستقلين.
    `.trim(),
    contentEn: `
## What Is Cash Flow and Why Can It Kill Your Business?

Cash flow = cash in minus cash out. Profit on paper means nothing if your bank account is empty.

> 82% of small businesses fail because of cash flow problems, not because they aren't profitable.

## Components of Cash Flow

| Type | Definition | Examples |
|------|------------|----------|
| Operating | From core activities | Customer invoices, salaries |
| Investing | Buying/selling assets | Equipment, investments |
| Financing | Loans and debt | Bank loan, dividends |

## 7 Principles for Healthy Cash Flow

### 1. Ask for upfront deposits

50% upfront from new clients is a golden rule.

### 2. Shorten your invoice payment terms

Net 30 → Net 15 → Net 7. Every day shaved is faster cash.

### 3. Lengthen payment terms with suppliers (within reason)

Negotiate Net 30 or Net 45 with suppliers.

### 4. Keep a cash reserve

3–6 months of operating expenses in a separate account.

### 5. Avoid overstocking

Excess inventory = trapped cash.

### 6. Watch invoice aging weekly

Any invoice more than 30 days overdue: chase immediately.

### 7. Forecast cash flow 3 months ahead

Know when your peak and trough will be.

## How to Read a Cash Flow Statement

\`\`\`
Opening balance:       50,000
+ Receipts:           120,000
- Payments:           (90,000)
──────────────────────
Net cash flow:         30,000
Closing balance:       80,000
\`\`\`

If net cash flow is negative for several months in a row, you have a problem.

## Warning Signs

- ❌ Average days-to-collect keeps climbing
- ❌ Inventory turnover dropping
- ❌ You're paying salaries with a credit card
- ❌ Postponing supplier payments has become routine
- ❌ Taking out a loan to pay off another loan

## Helpful Tools and Templates

- **A simple Excel sheet** is enough to start
- **QuickBooks / Zoho Books** for larger businesses
- **Xuvilo Dashboard** for freelancers and SMEs
- **Invoice aging calculator** inside Xuvilo

## The Golden Rule

> "Cash is king" — even with strong profits, liquidity is what keeps you alive.

## Start Tracking Your Cash Flow Today

The [Xuvilo Dashboard](/dashboard) gives you a simple, effective payments report — free for freelancers.
    `.trim(),
  },

  {
    slug: "تسعير-الخدمات-للمستقلين",
    cover: "blog/cover-freelancer-pricing.png",
    titleAr: "كيف تسعّر خدماتك كمستقل بثقة وذكاء؟",
    titleEn: "How to Price Your Freelance Services with Confidence",
    metaTitleEn: "How to Price Freelance Services | Xuvilo",
    excerptAr:
      "صيغ ومنهجيات لتسعير خدماتك بناءً على القيمة، الوقت، أو السوق — وكيف تتجنب البخس بنفسك.",
    excerptEn:
      "Formulas and methodologies for pricing your services based on value, time or market rates — and how to stop underselling yourself.",
    date: "2026-04-23",
    readTime: 6,
    category: "tips",
    keywordAr: "تسعير خدمات",
    keywordEn: "service pricing",
    relatedSlugs: [
      "كيف-تكتب-عرض-سعر-احترافي",
      "فاتورة-المقاولين-والمستقلين",
      "ادارة-التدفق-النقدي",
    ],
    contentAr: `
## لماذا تسعير المستقل أصعب من تسعير المنتج؟

المنتج له تكلفة واضحة. خدمتك تكلفتها = وقتك + خبرتك + قيمتها للعميل. والأخير صعب القياس.

## ٤ منهجيات للتسعير

### ١. التسعير بالساعة (Hourly)

- اقسم دخلك المستهدف الشهري على ساعات العمل المتاحة
- مثلاً: تريد 15,000 ر.س شهرياً، تعمل 80 ساعة قابلة للفوترة → 187 ر.س/ساعة

**السلبية:** يعاقبك على الكفاءة.

### ٢. التسعير بالمشروع (Project-Based)

- اعرف عدد الساعات المتوقعة
- اضرب في سعرك الساعي
- أضف 30-50% للمخاطر والتعديلات

### ٣. التسعير بالقيمة (Value-Based)

- اسأل: كم سيوفر/يربح العميل من هذا العمل؟
- اطلب 10-20% من القيمة المُضافة

**مثال:** موقع يربح للعميل 100,000 ر.س سنوياً → سعّر بـ 10,000-20,000.

### ٤. التسعير بالاحتفاظ (Retainer)

- اتفاق شهري ثابت مقابل عدد ساعات محدد
- استقرار للطرفين
- مناسب للخدمات المستمرة كالتسويق والاستشارة

## ٥ أخطاء قاتلة في التسعير

### ١. مقارنة نفسك بالمستقلين الأرخص

دائماً يوجد أرخص. لا تنافس على السعر، نافس على القيمة.

### ٢. عدم احتساب وقت غير مفوتر

اجتماعات، مقترحات، تسويق، محاسبة — كلها تقتطع من ساعاتك القابلة للفوترة.

### ٣. عدم رفع أسعارك دورياً

ارفع أسعارك 10-20% سنوياً للعملاء الجدد. للقدامى: 5-10%.

### ٤. الخصومات بدون مقابل

إذا أعطيت خصماً، اطلب شيئاً مقابله: شهادة، توصية، عقد أطول.

### ٥. عدم وضع شروط للتعديلات

3 جولات تعديل مجانية، ثم 100 ر.س لكل جولة إضافية.

## كيف تحدد سعرك المثالي؟

**المعادلة:**
\`\`\`
السعر الساعي = (الدخل المستهبف + النفقات + الضرائب + الادخار) ÷ الساعات المفوترة شهرياً
\`\`\`

**مثال عملي:**
- الدخل المرغوب: 20,000 ر.س
- النفقات (مكتب، أدوات): 3,000
- ضرائب وادخار: 5,000
- المجموع: 28,000
- ساعات مفوترة شهرياً: 100
- **السعر الساعي = 280 ر.س**

## نصائح ذكية

- اعرض دائماً 3 خيارات (ذهبي، فضي، برونزي) — معظم الناس يختارون الأوسط
- اذكر السعر الكلي، لا السعر الساعي
- اطلب نصف القيمة مقدماً
- لا تتفاوض على السعر، تفاوض على نطاق العمل

## أصدر عرض سعرك الآن

[منشئ عروض الأسعار](/quotation) في Xuvilo يساعدك على تقديم أسعارك بشكل احترافي.
    `.trim(),
    contentEn: `
## Why Pricing Freelance Work Is Harder Than Pricing a Product

A product has a clear cost. Your service costs = your time + your expertise + the value to the client. The last one is hard to measure.

## 4 Pricing Methodologies

### 1. Hourly pricing

- Divide your target monthly income by available billable hours
- Example: target SAR 15,000/month, 80 billable hours → SAR 187/hour

**Downside:** punishes you for being efficient.

### 2. Project-based pricing

- Estimate the hours required
- Multiply by your hourly rate
- Add 30–50% for risk and revisions

### 3. Value-based pricing

- Ask: how much will the client save or earn from this work?
- Charge 10–20% of the value created

**Example:** a website that earns the client SAR 100,000/year → price at SAR 10,000–20,000.

### 4. Retainer pricing

- A fixed monthly agreement for a set number of hours
- Stability for both parties
- Suits ongoing services like marketing or consulting

## 5 Fatal Pricing Mistakes

### 1. Comparing yourself to cheaper freelancers

There's always someone cheaper. Don't compete on price — compete on value.

### 2. Forgetting non-billable time

Meetings, proposals, marketing, accounting — all eat into your billable hours.

### 3. Not raising prices regularly

Raise prices 10–20% per year for new clients. For existing ones: 5–10%.

### 4. Discounts with no exchange

If you give a discount, ask for something in return: a testimonial, a referral, a longer contract.

### 5. Not setting revision limits

3 free revision rounds, then SAR 100 per additional round.

## How to Pick Your Ideal Price

**Formula:**
\`\`\`
Hourly rate = (target income + expenses + tax + savings) ÷ monthly billable hours
\`\`\`

**Worked example:**
- Desired income: SAR 20,000
- Expenses (office, tools): 3,000
- Tax + savings: 5,000
- Total: 28,000
- Billable hours per month: 100
- **Hourly rate = SAR 280**

## Smart Tips

- Always present 3 options (gold, silver, bronze) — most people pick the middle one
- Quote the total price, not the hourly rate
- Ask for half upfront
- Don't negotiate on price — negotiate on scope

## Issue Your Quote Now

The [quotation builder](/quotation) on Xuvilo helps you present your pricing professionally.
    `.trim(),
  },

  {
    slug: "قانون-حماية-المستهلك-السعودية",
    cover: "blog/cover-ksa-consumer-law.png",
    titleAr: "قانون حماية المستهلك في السعودية — ما يجب أن يعرفه أصحاب الأعمال",
    titleEn: "Consumer Protection Law in Saudi Arabia — What Business Owners Must Know",
    metaTitleAr: "قانون حماية المستهلك في السعودية | Xuvilo",
    metaTitleEn: "Consumer Protection Law in Saudi Arabia | Xuvilo",
    excerptAr:
      "ملخص لحقوق المستهلك السعودي والتزامات البائع: الإرجاع، الضمان، الإعلانات الزائفة، والعقوبات.",
    excerptEn:
      "A summary of Saudi consumer rights and seller obligations — returns, warranties, false advertising, and penalties.",
    date: "2026-04-23",
    readTime: 7,
    category: "laws",
    keywordAr: "حماية المستهلك السعودية",
    keywordEn: "Saudi consumer protection",
    relatedSlugs: [
      "فاتورة-ضريبية-zatca-السعودية",
      "اخطاء-الفواتير-الشائعة",
      "برنامج-فواتير-للشركات-الصغيرة",
    ],
    contentAr: `
## نظام حماية المستهلك السعودي

ينظم العلاقة بين البائع والمشتري في السعودية ويحدد حقوق المستهلك وواجبات التاجر. تُشرف عليه **وزارة التجارة**.

## ٧ حقوق أساسية للمستهلك السعودي

### ١. الحق في معرفة السعر

السعر يجب أن يكون واضحاً وظاهراً قبل الشراء، شاملاً للضرائب.

### ٢. الحق في الفاتورة

كل عملية بيع تستوجب فاتورة (ZATCA إلكترونية إن كانت B2B).

### ٣. الحق في الإرجاع والاستبدال

- الإرجاع خلال 7 أيام للمنتج المعيب
- الاستبدال خلال 14 يوم للمنتجات السليمة (حسب سياسة المتجر)

### ٤. الحق في الضمان

- ضمان المنتج: حسب نوعه (سنة للأجهزة الكهربائية على الأقل)
- ضمان الخدمة: حسب الاتفاق

### ٥. الحق في معلومات صحيحة

- ممنوع الإعلان المضلل
- ممنوع إخفاء عيوب المنتج
- يجب ذكر بلد المنشأ

### ٦. الحق في الأمان

المنتج يجب ألا يشكل خطراً على الصحة أو السلامة.

### ٧. الحق في الشكوى

يمكن للمستهلك تقديم شكوى عبر **بلاغ تجاري (1900)** أو منصة وزارة التجارة.

## التزامات صاحب العمل

- ✅ لصق الأسعار بشكل واضح
- ✅ إصدار فواتير شاملة للضريبة
- ✅ احترام الضمانات المعلنة
- ✅ توفير معلومات دقيقة عن المنتج
- ✅ احترام سياسة الإرجاع المعلنة
- ✅ التواصل بالعربية مع المستهلك

## العقوبات على المخالفات

- **إعلان مضلل:** غرامة تصل إلى 1,000,000 ريال
- **بيع منتج معيب مع علم:** تصل إلى 100,000 ريال
- **رفض الفاتورة:** غرامات إدارية + احتمال إغلاق
- **الغش التجاري:** غرامة + سجن قد يصل لسنتين

## نصائح للتاجر للالتزام

### ١. انشر سياسة إرجاع مكتوبة

في الموقع، الفاتورة، والمحل.

### ٢. وثّق كل معاملة

الفواتير ZATCA الإلكترونية تحميك في النزاعات.

### ٣. استخدم لغة واضحة في الإعلانات

تجنب المبالغات: "الأفضل في العالم" قابلة للنقد قانونياً.

### ٤. درّب موظفيك

اجعلهم يعرفون حقوق المستهلك وكيف يتعاملون مع الشكاوى.

### ٥. تعامل مع الشكاوى بسرعة

الشكوى المُحلّة سريعاً = عميل عائد. الشكوى المُهملة = شكوى رسمية.

## كيف يساعدك Xuvilo في الامتثال؟

- ✅ فواتير ZATCA متوافقة تلقائياً
- ✅ قوالب فاتورة تظهر سياسة الإرجاع
- ✅ الأسعار تُحسب شاملة الضريبة بوضوح
- ✅ نسخ محفوظة لكل فاتورة كدليل قانوني

[ابدأ بفوترة قانونية احترافية](/invoice?currency=SAR)
    `.trim(),
    contentEn: `
## The Saudi Consumer Protection System

The system regulates the relationship between sellers and buyers in Saudi Arabia and sets out consumer rights and trader duties. It is supervised by the **Ministry of Commerce**.

## 7 Fundamental Saudi Consumer Rights

### 1. The right to know the price

Prices must be clear and visible before purchase, inclusive of tax.

### 2. The right to an invoice

Every sale requires an invoice (electronic ZATCA invoice for B2B).

### 3. The right to return and exchange

- Returns within 7 days for defective products
- Exchange within 14 days for non-defective products (per store policy)

### 4. The right to a warranty

- Product warranty: per category (at least one year for electrical appliances)
- Service warranty: as agreed

### 5. The right to accurate information

- Misleading advertising is forbidden
- Hiding product defects is forbidden
- Country of origin must be disclosed

### 6. The right to safety

Products must not endanger health or safety.

### 7. The right to complain

Consumers can file a complaint via **1900 Commercial Report** or the Ministry of Commerce platform.

## Business Owner Obligations

- ✅ Display prices clearly
- ✅ Issue tax-inclusive invoices
- ✅ Honour declared warranties
- ✅ Provide accurate product information
- ✅ Respect your published return policy
- ✅ Communicate with consumers in Arabic

## Penalties for Violations

- **Misleading advertising:** fine up to SAR 1,000,000
- **Knowingly selling defective products:** up to SAR 100,000
- **Refusing to issue an invoice:** administrative fines + possible closure
- **Commercial fraud:** fine + up to two years imprisonment

## Trader Compliance Tips

### 1. Publish a written return policy

On your website, on invoices, and in-store.

### 2. Document every transaction

ZATCA electronic invoices protect you in disputes.

### 3. Use clear language in advertising

Avoid hyperbole: "the best in the world" is legally challengeable.

### 4. Train your staff

Make sure they know consumer rights and how to handle complaints.

### 5. Resolve complaints quickly

A complaint resolved fast = returning customer. A neglected complaint = formal regulator complaint.

## How Xuvilo Helps You Stay Compliant

- ✅ Automatically ZATCA-compliant invoices
- ✅ Invoice templates that surface your return policy
- ✅ Tax-inclusive prices shown clearly
- ✅ Saved copies of every invoice as a legal record

[Start invoicing professionally and legally](/invoice?currency=SAR).
    `.trim(),
  },

  {
    slug: "الفرق-بين-الايصال-والفاتورة",
    titleAr: "ما الفرق بين الإيصال والفاتورة؟",
    titleEn: "Receipt vs Invoice — What's the Difference?",
    metaTitleAr: "الفرق بين الإيصال والفاتورة | Xuvilo",
    metaTitleEn: "Receipt vs Invoice: Key Differences | Xuvilo",
    excerptAr:
      "شرح عملي للفرق بين الإيصال والفاتورة، متى تُصدر كلاً منهما، وكيف يكمّلان بعضهما في السجلات الضريبية والمحاسبية.",
    excerptEn:
      "A practical breakdown of how receipts and invoices differ, when to issue each one, and how they work together in your accounting and tax records.",
    date: "2026-04-25",
    readTime: 5,
    category: "business",
    keywordAr: "الفرق بين الإيصال والفاتورة",
    keywordEn: "receipt vs invoice",
    relatedSlugs: [
      "الفرق-بين-الفاتورة-وعرض-السعر",
      "انشاء-فاتورة-مجانية-اونلاين",
      "اخطاء-الفواتير-الشائعة",
    ],
    contentAr: `
## الإيصال والفاتورة — الفرق الجوهري

كثير من أصحاب الأعمال يستخدمون كلمتَي "إيصال" و"فاتورة" وكأنهما الشيء نفسه، لكن المعنى القانوني والمحاسبي مختلف تماماً. الخلط بينهما يُربك سجلاتك الضريبية ويُضعف موقفك عند أي نزاع مع العميل.

**الفرق في جملة واحدة:**
- **الفاتورة (Invoice):** "لقد قدمتُ لك هذا — يُرجى الدفع."
- **الإيصال (Receipt):** "تسلّمتُ منك المبلغ — شكراً لك."

أي أن الفاتورة تطلب الدفع، والإيصال يُثبت أن الدفع تمّ.

## مقارنة تفصيلية: الإيصال vs الفاتورة

| المعيار | الفاتورة | الإيصال |
|---------|---------|---------|
| **التوقيت** | بعد تقديم الخدمة أو تسليم البضاعة | بعد استلام المبلغ فعلاً |
| **الهدف** | طلب الدفع وتوثيق الالتزام | إثبات أن الدفع تمّ |
| **المبلغ المعروض** | المبلغ المستحق | المبلغ المُستلَم (قد يكون جزئياً) |
| **الإلزامية الضريبية** | إلزامية في معظم الأنظمة | غالباً اختيارية ضريبياً |
| **يُستدل بها** | لإثبات الدين على العميل | لإثبات السداد من العميل |
| **حالة الحساب** | مفتوح / مستحق | مغلق كلياً أو جزئياً |
| **الترقيم** | تسلسل خاص بالفواتير | تسلسل مستقل للإيصالات |

## متى تُصدر فاتورة؟

**١. أنجزتَ العمل أو سلّمتَ البضاعة.**

**٢. تحتاج لتسجيل الإيراد محاسبياً** حتى لو لم يُسدَّد بعد.

**٣. العميل سيدفع لاحقاً** (بالأجل، أو دفعات، أو تحويل بنكي يستغرق أياماً).

**٤. متطلبات ضريبية** — مثل فواتير ZATCA في السعودية أو فواتير VAT في الإمارات.

## متى تُصدر إيصالاً؟

**١. وصلك المبلغ نقداً.**

**٢. تأكّد التحويل البنكي** أو إشعار البطاقة.

**٣. دفعة مقدمة (Advance)** قبل بدء العمل — أصدر إيصالاً بالدفعة، ولا تخلطه بالفاتورة النهائية.

**٤. دفعة جزئية** ضمن خطة أقساط — كل قسط يحتاج إيصالاً مستقلاً.

## مثال عملي: ورشة صيانة سيارات

**اليوم 1 — الفاتورة:**
العميل يستلم سيارته بعد إصلاح كامل. تُصدر الورشة فاتورة بقيمة 1,500 ريال (قطع غيار + أجور + ضريبة القيمة المضافة).

**اليوم 1 — إيصال الدفعة الأولى:**
يدفع العميل 800 ريال نقداً ويعد بدفع الباقي خلال أسبوع. تُصدر الورشة إيصالاً بقيمة 800 ريال، ويبقى الرصيد المستحق 700 ريال على الفاتورة.

**اليوم 7 — إيصال الدفعة الثانية:**
يحوّل العميل 700 ريال بنكياً. تُصدر الورشة إيصالاً ثانياً، وتُغلق الفاتورة كمسدّدة بالكامل.

> **ملاحظة:** الفاتورة واحدة، لكن قد تقابلها عدة إيصالات. هذا أمر طبيعي ولا يُعدّ خطأً ضريبياً.

## هل يُغني الإيصال عن الفاتورة؟

**لا.** هذا من أكثر الأخطاء شيوعاً عند أصحاب المحلات الصغيرة.

- الإيصال يُثبت **حركة نقدية** فقط.
- الفاتورة تُثبت **المعاملة التجارية** بكل تفاصيلها (البنود، الأسعار، الضريبة، رقم العميل الضريبي).
- في أي تدقيق ضريبي، تُطلب الفواتير لا الإيصالات.
- في الأنظمة الإلكترونية مثل **ZATCA السعودية** و**FTA الإماراتية**، الفاتورة الضريبية إلزامية، والإيصال مكمّل لها.

## ثلاث مستندات تتكامل: عرض السعر، الفاتورة، الإيصال

| المستند | متى؟ | لماذا؟ |
|---------|------|--------|
| عرض السعر | قبل العمل | للاتفاق على السعر |
| الفاتورة | بعد العمل | لطلب الدفع |
| الإيصال | بعد الدفع | لإثبات الاستلام |

اقرأ المزيد في دليل [الفرق بين الفاتورة وعرض السعر](/blog/الفرق-بين-الفاتورة-وعرض-السعر).

## أخطاء شائعة عند الخلط بين الإيصال والفاتورة

- **استخدام الإيصال بدل الفاتورة** عند بيع B2B — يُسبّب رفض العميل خصم الضريبة.
- **عدم إصدار إيصال عند استلام دفعة مقدمة** — يصعب لاحقاً إثبات أنك استلمتها.
- **إعطاء الإيصال نفس رقم الفاتورة** — يُربك السجلات والتدقيق.
- **اعتبار الفاتورة دليلاً على السداد** — الفاتورة لا تُثبت إلا الدين، لا التحصيل.

## أسئلة شائعة (FAQ)

**هل الإيصال إلزامي قانونياً؟**
في معظم الدول العربية، الإيصال إلزامي في المعاملات النقدية لحماية المستهلك، لكنه ليس بديلاً عن الفاتورة الضريبية.

**هل أصدر إيصالاً عند التحويل البنكي؟**
يُفضَّل ذلك. حتى لو كان لدى العميل إشعار البنك، يبقى الإيصال الرسمي منك دليلاً موحّداً يربط الدفعة بفاتورة محددة.

**ما رقم الفاتورة الذي يُكتب على الإيصال؟**
اكتب رقم الفاتورة الأصلية كـ"مرجع"، لكن أعطِ الإيصال رقمه التسلسلي المستقل.

**هل يحلّ "إيصال الدفع الإلكتروني" من البنك محل الإيصال الرسمي؟**
لا. إشعار البنك يُثبت الحركة، أما الإيصال الرسمي فيربطها بفاتورة وعميل ضمن سجلاتك.

**هل تُسجَّل الإيصالات في الإقرار الضريبي؟**
الإيرادات تُسجَّل من الفواتير، أما الإيصالات فتُستخدم لمطابقة التدفق النقدي مع تلك الفواتير.

## أنشئ مستنداتك بشكل احترافي

- [فاتورة احترافية بالعربي والإنجليزي](/invoice)
- [إيصال دفع فوري بدون تسجيل](/receipt)
- [عرض سعر مع مدة صلاحية](/quotation)

كل القوالب مجانية ولا تتطلب تسجيلاً.
    `.trim(),
    contentEn: `
## Receipt vs Invoice — The Core Difference

Many business owners use the words "receipt" and "invoice" as if they were the same thing, but their legal and accounting meanings are completely different. Mixing them up muddles your tax records and weakens your position in any dispute with a customer.

**The difference in one line:**
- **Invoice:** "I've delivered this — please pay."
- **Receipt:** "I've received your payment — thank you."

In other words, an **invoice requests payment**, while a **receipt proves payment was made**.

## Detailed Comparison: Receipt vs Invoice

| Criterion | Invoice | Receipt |
|-----------|---------|---------|
| **Timing** | After delivery of goods/services | After money is actually received |
| **Purpose** | Request payment, document the obligation | Prove that payment was made |
| **Amount shown** | Amount owed | Amount received (may be partial) |
| **Tax requirement** | Mandatory in most systems | Usually optional for tax purposes |
| **Used as evidence** | Of the customer's debt to you | Of the customer having paid |
| **Account status** | Open / outstanding | Fully or partially closed |
| **Numbering** | Its own invoice sequence | A separate receipt sequence |

## When to Issue an Invoice

**1. You've delivered the work or shipped the goods.**

**2. You need to record the revenue** in your books, even if it hasn't been paid yet.

**3. The customer will pay later** — on credit, in instalments, or via a bank transfer that takes a few days.

**4. Tax requirements** apply — for example, ZATCA invoices in Saudi Arabia or VAT invoices in the UAE.

## When to Issue a Receipt

**1. Cash has come in.**

**2. A bank transfer is confirmed**, or a card payment notification has cleared.

**3. An advance / deposit** is paid before the work starts — issue a receipt for the deposit, and don't confuse it with the final invoice.

**4. A milestone or instalment** within a payment plan — every instalment deserves its own receipt.

## A Practical Example: Auto Repair Shop

**Day 1 — Invoice:**
The customer collects the car after a full repair. The shop issues an invoice for SAR 1,500 (parts + labour + VAT).

**Day 1 — Receipt for first payment:**
The customer pays SAR 800 in cash and promises to settle the rest within a week. The shop issues a receipt for SAR 800. The remaining balance on the invoice is SAR 700.

**Day 7 — Receipt for second payment:**
The customer transfers SAR 700 by bank. The shop issues a second receipt and marks the invoice as fully paid.

> **Note:** One invoice may correspond to multiple receipts. That is perfectly normal and not a tax mistake.

## Does a Receipt Replace an Invoice?

**No.** This is one of the most common mistakes small shop owners make.

- A receipt only proves a **cash movement**.
- An invoice proves the full **commercial transaction** — the line items, prices, tax, and the buyer's tax number.
- In any tax audit, **invoices** are requested, not receipts.
- In e-invoicing systems such as **Saudi ZATCA** and the **UAE FTA**, the tax invoice is mandatory and the receipt is only complementary.

## Three Documents That Work Together: Quotation, Invoice, Receipt

| Document | When? | Why? |
|----------|-------|------|
| Quotation | Before the work | Agree on the price |
| Invoice | After the work | Request payment |
| Receipt | After payment | Confirm receipt of funds |

For more, read our deep dive on [Invoice vs Quotation](/blog/الفرق-بين-الفاتورة-وعرض-السعر).

## Common Mistakes Mixing Receipts and Invoices

- **Giving a receipt instead of an invoice on a B2B sale** — the buyer can't reclaim VAT, and may refuse the transaction.
- **Not issuing a receipt when an advance is paid** — later it becomes hard to prove you received it.
- **Using the same number for the receipt and the invoice** — this confuses bookkeeping and audits.
- **Treating an invoice as proof of payment** — an invoice only proves the debt, never the collection.

## Frequently Asked Questions

**Are receipts legally mandatory?**
In most Arab countries, receipts are required for cash transactions to protect the consumer, but they never replace a tax invoice.

**Should I issue a receipt for a bank transfer?**
Yes — even though the customer has the bank notification, an official receipt from you is the unified proof that links the payment to a specific invoice.

**What invoice number should appear on the receipt?**
Reference the original invoice number, but give the receipt its own independent sequential number.

**Does an electronic bank payment notice replace an official receipt?**
No. The bank notification proves the movement of money; only your official receipt links it to a specific invoice and customer in your records.

**Are receipts recorded in the tax return?**
Revenue is reported from invoices. Receipts are used to reconcile cash flow against those invoices.

## Create Your Documents Professionally

- [Professional invoice in Arabic and English](/invoice)
- [Instant payment receipt — no signup](/receipt)
- [Quotation with a validity period](/quotation)

All templates are free and require no signup.
    `.trim(),
  },

  {
    slug: "purchase-order-guide",
    titleAr: "ما هو أمر الشراء؟ دليل شامل لشركات منطقة الشرق الأوسط",
    titleEn: "What Is a Purchase Order? Complete Guide for MENA Businesses",
    metaTitleEn: "What Is a Purchase Order? MENA Guide | Xuvilo",
    excerptAr:
      "دليل شامل لأمر الشراء (PO) للشركات في الشرق الأوسط: التعريف، الحقول، الفرق عن الفاتورة، نموذج جاهز، وأفضل الممارسات لتجنّب النزاعات.",
    excerptEn:
      "A complete purchase order guide for MENA businesses: what a PO is, how it differs from an invoice, mandatory fields, a ready template, and best practices.",
    date: "2026-05-06",
    readTime: 8,
    category: "business",
    keywordAr: "أمر شراء",
    keywordEn: "purchase order",
    relatedSlugs: ["ما-هو-أمر-الشراء-دليل-شامل"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [دليل أمر الشراء بالعربية](/blog/ما-هو-أمر-الشراء-دليل-شامل) للتعريف الكامل، الفرق عن الفاتورة، الحقول الإلزامية، وأفضل الممارسات.",
    contentEn: `
## What Is a Purchase Order?

A purchase order (PO) is a formal document a buyer sends to a supplier to authorise the purchase of specific goods or services at agreed prices, quantities, and delivery terms. Once the supplier accepts the PO, it becomes a binding commercial contract — the supplier promises to deliver, and the buyer promises to pay according to the stated terms.

For freelancers and SMEs across the MENA region, purchase orders are how bigger customers (corporates, government bodies, and procurement departments) prefer to buy. If you sell to enterprise clients in Saudi Arabia, the UAE, Egypt, Kuwait, Jordan, or Libya, expect a PO to land in your inbox before any work starts. Issuing your own POs to suppliers also brings discipline to your spending and keeps your accounts payable clean.

## Purchase Order vs Invoice — The Key Difference

The two documents look similar, but they sit on opposite sides of a transaction:

- A **purchase order** is issued by the **buyer** *before* the goods or services are delivered. It says "please supply these items at these prices."
- An **invoice** is issued by the **seller** *after* delivery. It says "you owe us this amount, please pay by this date."

A clean workflow goes: buyer issues PO → supplier confirms → supplier delivers → supplier issues invoice referencing the PO number → buyer pays. The PO number printed on the invoice is what lets the buyer's accounts team match the bill to the original authorisation. Many enterprise customers in the GCC will refuse to pay an invoice that does not reference the original PO.

## Mandatory Fields on a Purchase Order

A professional PO should include every field below. Missing data is the most common reason POs get rejected or invoices later end up disputed.

### Header information
- A clear "Purchase Order" label at the top of the document
- A unique, sequential PO number (for example PO-2026-0001)
- The PO issue date and the requested delivery date
- The buyer's full legal name, address, tax registration number, and contact person
- The supplier's name, address, and contact details

### Line items
- A clear description of every product or service being ordered
- Quantity, unit of measure (each, hour, kilogram, square metre)
- Unit price in the agreed currency
- Line total, subtotal, applicable tax (such as 15% VAT in Saudi Arabia or 5% VAT in the UAE), and grand total

### Commercial terms
- Payment terms (net 30, net 60, advance payment, milestone-based)
- Delivery address and Incoterm (DAP, EXW, FOB) for cross-border trade
- Currency of the transaction
- Any quality, packaging, or warranty requirements
- Authorised signature from the buyer's procurement team

## How a PO Workflow Looks in Practice

A small construction supplier in Jeddah might receive a PO from a contractor for 200 bags of cement at SAR 22 per bag, delivered to a site in Riyadh by the 15th of the month, payment net 30. The supplier confirms the PO in writing, delivers, and issues a tax invoice that references "PO-2026-0142" in the header. The contractor's finance team scans the invoice, finds the matching PO in their system, verifies the price and quantity, and releases payment within 30 days. No disputes, no chasing, no awkward emails.

Without a PO, the same transaction relies on WhatsApp messages, verbal prices, and trust. When something goes wrong — a price mismatch, a short delivery, a delayed payment — there is nothing to anchor the conversation, and the supplier almost always loses.

## When You Should Use Purchase Orders

You do not need a PO for every transaction. As a rule of thumb, use them when:

- You are selling to a corporate, government, or large enterprise customer who requires one
- The order value is above a threshold you set (many SMEs require an internal PO above USD 1,000)
- The order involves multiple line items, scheduled deliveries, or complex pricing
- You want a paper trail for audit, tax, or internal-control reasons
- You are buying from a supplier on credit and want to fix the price in writing before they ship

For small, one-off cash sales — a freelancer invoicing a SAR 500 design job — a clean invoice on its own is usually enough.

## Best Practices for Issuing Purchase Orders

1. **Number them sequentially.** Auditors and tax authorities expect a clean, gap-free PO log. Skipping numbers raises questions.
2. **Lock prices in writing.** Every line price on the PO should match the supplier's quotation. If it does not, the supplier can refuse to deliver at the lower price.
3. **State delivery dates explicitly.** "ASAP" is not a date. Use a calendar date and an Incoterm.
4. **Match the PO currency to the supplier's invoice currency.** Currency mismatches are a leading cause of late payments across the GCC.
5. **Retain copies for at least five years.** Most MENA tax regimes require records to be kept for between 5 and 10 years.
6. **Convert your accepted quotation into a PO.** If you are the buyer, the cleanest workflow is to ask suppliers for a quotation, then issue a PO that mirrors the accepted quotation line for line.

## Generating Purchase Orders With Xuvilo

Xuvilo is built around the same data model that powers our [free invoice generator](/invoice) and [quotation generator](/quotation), so issuing a PO is structurally identical to issuing a quotation: pick a template, enter buyer and supplier details, add line items with prices and tax, and export a clean PDF. The same 320 templates that power our invoices and quotations work for POs — there is no separate paywall.

If your supplier sent you a [quotation](/quotation) you want to convert to a PO, copy the line items across exactly, change the document title to "Purchase Order", and add a unique PO number. When the supplier delivers and issues their invoice, they should reference your PO number on the [invoice](/invoice) — and the loop closes cleanly.

For repeat purchases, save your supplier as a contact and reuse it across documents. Xuvilo also supports the same currencies and tax rules as our invoice generator, including 15% VAT for Saudi Arabia, 5% VAT for the UAE, and zero-rated currencies for cross-border trade. For deeper reading on the wider documentation flow, see our other guides on the [Xuvilo Blog](/blog).

## Frequently Asked Questions

### Is a purchase order legally binding?
Yes — once a supplier accepts a PO (in writing or by performance, such as starting delivery), it becomes a binding commercial contract under most MENA legal systems. The PO together with the supplier's confirmation forms the offer and acceptance required for an enforceable agreement.

### What is the difference between a PO and a contract?
A PO is a short-form commercial contract for a single transaction. A master contract (or framework agreement) sets out the long-term legal relationship between two parties — payment terms, indemnities, IP, dispute resolution — and individual POs are then issued under that master contract.

### Do I need a PO if I already have an invoice?
You do not strictly need one, but enterprise customers usually require it. The PO authorises the spend internally before the invoice arrives; the invoice is the supplier's request for payment. Most procurement systems will not pay an invoice that does not match an open PO.

### Can I issue a PO to a freelancer?
Absolutely. POs are not limited to physical goods. A digital marketing agency in Cairo can issue a PO to a freelance copywriter for "10 blog posts at USD 80 each, delivered by the 30th, net-15 payment." The structure is identical to a goods PO.

### How long should I keep purchase orders?
Most MENA tax authorities require commercial records to be kept for at least five years (six in Saudi Arabia under the VAT Implementing Regulations, 10 years in some Egyptian contexts). Keep both the original PO and the matched invoice together — auditors will want to see the pair.

Ready to issue your first PO? Open the [Xuvilo invoice generator](/invoice), pick a template from the [320 free templates](/templates), and switch the document title to "Purchase Order". For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "invoice-generator-kuwait",
    titleAr: "منشئ فواتير مجاني للكويت | Xuvilo",
    titleEn: "Free Invoice Generator for Kuwait",
    metaTitleEn: "Free Invoice Generator for Kuwait | Xuvilo",
    excerptAr:
      "أنشئ فواتير احترافية للكويت بالدينار الكويتي والعربية والإنجليزية. تصدير PDF مجاني وقوالب جاهزة للمستقلين والشركات الصغيرة.",
    excerptEn:
      "Create professional Kuwait invoices in Kuwaiti dinar, Arabic and English. Free PDF export and ready templates for freelancers and small businesses in Kuwait.",
    date: "2026-05-06",
    readTime: 8,
    category: "invoices",
    keywordAr: "فاتورة الكويت",
    keywordEn: "Kuwait invoice generator",
    relatedSlugs: ["منشئ-فواتير-مجاني-للكويت"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [منشئ فواتير مجاني للكويت بالعربية](/blog/منشئ-فواتير-مجاني-للكويت) لتفاصيل الدينار الكويتي والامتثال والقوالب.",
    contentEn: `
## Free Invoice Generator for Kuwait

If you run a small business or freelance in Kuwait, your invoices are the thinnest line between your work and getting paid. They are also one of the few documents your clients, your accountant, and the Ministry of Finance all look at. Getting them right matters — and you do not need a paid accounting suite to do it. The Xuvilo [free invoice generator](/invoice?currency=KWD) is pre-configured for Kuwait: the Kuwaiti dinar (KWD), Arabic and English bilingual layout, and clean PDF export, all with no sign-up required.

This guide explains what a Kuwait invoice should contain, how to handle the local currency and tax landscape, and the small details that make Kuwaiti business buyers take you seriously.

## Why a Kuwait-Specific Invoice Generator Matters

Most generic invoice tools are built for the US or Europe. They default to USD, do not understand the Kuwaiti dinar's three decimal places (1 KWD = 1000 fils), do not render Arabic correctly, and bury the bilingual layout that Kuwait business buyers expect. The result is invoices that look like they were drafted abroad — unprofessional in a market where appearance matters.

A Kuwait-tuned invoice generator handles all of this for you out of the box:

- Defaults the currency to Kuwaiti dinar (KWD) with three-decimal precision
- Renders Arabic right-to-left alongside English on the same page
- Produces print-ready A4 PDFs that look the way Kuwaiti accountants and procurement teams expect
- Supports the local civil ID and commercial registration fields business buyers ask for
- Carries forward your branding (logo, colours, signature) across every invoice

## What a Kuwait Invoice Should Contain

Kuwait does not currently have a value-added tax, but commercial invoices still need a clear, professional structure. The fields below are the standard set Kuwaiti buyers — and the Ministry of Finance, when an audit lands — expect to see.

### Seller (your) details
- Your full legal name or trading name
- Commercial registration (CR) number, if you trade as a licensed business
- Civil ID number, if you operate as a freelancer
- Full address (governorate, area, block, street, building)
- Phone, email, and (optionally) Instagram or WhatsApp business contact

### Buyer details
- Buyer's name or company name
- Buyer's CR number, if a registered business
- Delivery and billing addresses, when different

### Invoice details
- The word "Invoice" (or فاتورة) clearly at the top
- A unique, sequential invoice number
- Issue date and due date
- Itemised description of goods or services with quantity and unit price
- Subtotal, any applicable tax or service charge, and the grand total in KWD
- Payment terms — bank transfer details, KNet, or wallet identifiers

## The Kuwaiti Dinar in Practice

The KWD is one of the strongest currencies in the world and is quoted to **three decimal places**. A KWD 1.500 invoice is one and a half dinars; a KWD 0.250 invoice is 250 fils. Generic tools that round to two decimals create real billing errors here. Xuvilo's [free invoice generator](/invoice?currency=KWD) preserves the third decimal everywhere — line items, tax fields, totals, and the PDF output — so you never short-bill or over-bill a customer because of rounding.

For cross-border invoices to clients in Saudi Arabia, the UAE, or further afield, you can switch the currency at the top of the form and Xuvilo will handle the formatting automatically. The same template works for KWD, USD, EUR, AED, SAR, and 170+ other currencies.

## Tax and Compliance Notes for Kuwait

- **VAT.** Kuwait has not yet introduced a federal VAT regime. Plan for it eventually — the GCC framework agreement was signed years ago — but as of 2026 you do not need to charge VAT on a Kuwait-to-Kuwait sale.
- **Corporate income tax.** Most Kuwaiti-owned businesses are not subject to corporate income tax. Foreign-owned entities (and certain GCC structures) are, at 15%. Your accountant will tell you which side of the line you sit on.
- **Zakat and contributions.** Listed companies pay Zakat at 1% of profits and the Kuwait Foundation for the Advancement of Sciences contribution at 1%. Most freelancers and SMEs are not affected.
- **Record retention.** Keep every invoice (and the matching bank entry) for at least five years.

If you also sell into Saudi Arabia or the UAE, you will need to charge their respective VAT rates on those invoices. Switching country in Xuvilo flips the tax defaults automatically.

## Step-By-Step: Issuing Your First Kuwait Invoice

1. Open the [free Xuvilo invoice generator](/invoice?currency=KWD).
2. Pick a template from the [free template library](/templates) — or stay on the default. There are 320 designs to choose from.
3. Add your business details: trading name, CR number or civil ID, address, and logo.
4. Add the customer's details (name, CR if business, address).
5. Enter line items: description, quantity, unit price in KWD. Use three decimal places where needed.
6. Add payment terms — bank transfer details (IBAN, swift), KNet link, or wallet handle.
7. Preview the bilingual Arabic and English layout, then export the PDF.
8. Send by email, WhatsApp, or share a direct link.

The whole process takes under three minutes once your business profile is saved.

## Tips That Get Kuwait Invoices Paid Faster

- **Send the invoice the day the work is delivered.** Late invoices get paid late.
- **Use a clean sequential number.** A jumpy number sequence makes accounts teams nervous.
- **Include a payment QR code.** Kuwaiti buyers increasingly expect a one-tap payment option.
- **Add a polite, specific due date.** "Payable by 25 May 2026" beats "due upon receipt".
- **Follow up on day 3 after the due date.** A short, polite email recovers more cash than a stern letter on day 30.

## Frequently Asked Questions

### Is the Xuvilo invoice generator really free for Kuwait?
Yes. Issuing, previewing, and exporting Kuwait invoices to PDF is free with no sign-up. Premium features (cloud storage, custom branding upgrades, team accounts) are optional.

### Does it support Arabic and English on the same invoice?
Yes. Every Kuwait template renders Arabic right-to-left alongside English in a single, clean A4 layout. You can also issue Arabic-only or English-only invoices.

### Can I save customers and reuse them?
Yes. Save customers, items, and bank details once, then reuse them across every future invoice. There is also an [AI Writer](/ai-writer) for drafting professional notes and reminders in Arabic or English.

### Do I need to charge VAT in Kuwait?
Not as of 2026. Kuwait has no federal VAT regime. If you sell to customers in Saudi Arabia or the UAE, you must charge their local VAT — Xuvilo flips the rate when you change country.

### What other tools should I pair with my invoices?
Pair invoices with [quotations](/quotation), [receipts](/receipt), and the [14 free business calculators](/calculators) — including a profit margin calculator and a VAT calculator. They all share the same clean Xuvilo design.

Ready to bill a Kuwaiti customer? Open the [free invoice generator](/invoice?currency=KWD) and pick a template from the [free template library](/templates). For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "invoice-generator-libya",
    titleAr: "منشئ فواتير مجاني لليبيا | Xuvilo",
    titleEn: "Free Invoice Generator for Libya",
    metaTitleEn: "Free Invoice Generator for Libya | Xuvilo",
    excerptAr:
      "أنشئ فواتير احترافية لليبيا بالدينار الليبي LYD، عربية وإنجليزية. قوالب جاهزة، تصدير PDF مجاني، ودعم متطلبات مصلحة الضرائب.",
    excerptEn:
      "Create professional Libya invoices in Libyan dinar (LYD), Arabic and English. Free PDF export, ready templates and Libyan Tax Authority field support.",
    date: "2026-05-06",
    readTime: 8,
    category: "invoices",
    keywordAr: "فاتورة ليبيا",
    keywordEn: "Libya invoice generator",
    relatedSlugs: ["منشئ-فواتير-مجاني-لليبيا", "كيف-تصدر-فاتورة-ضريبية-في-ليبيا"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [منشئ فواتير مجاني لليبيا بالعربية](/blog/منشئ-فواتير-مجاني-لليبيا) لتفاصيل الدينار الليبي ومتطلبات مصلحة الضرائب.",
    contentEn: `
## Free Invoice Generator for Libya

Doing business in Libya means working across a fragmented banking system, a recovering economy, and a tax authority that is steadily formalising its rules. The single document that ties it all together is the invoice. A clean, compliant Libyan invoice gets you paid faster, keeps you on the right side of the Libyan Tax Authority, and signals to international clients that you are the kind of supplier they can rely on.

The Xuvilo [free invoice generator](/invoice?currency=LYD) is pre-configured for Libya: Libyan dinar (LYD) currency, bilingual Arabic and English layout, and clean PDF export, all with no sign-up required.

## Why a Libya-Specific Invoice Generator Matters

Generic invoice tools default to USD, format dates the wrong way, and either ignore Arabic entirely or render it left-to-right. Libyan buyers, banks, and the Tax Authority all expect documents that look local. A Libya-tuned invoice generator handles this automatically:

- Defaults the currency to Libyan dinar (LYD)
- Renders Arabic right-to-left alongside English on the same page
- Produces print-ready A4 PDFs in the layout Libyan accountants expect
- Supports the commercial registration and tax registration fields the Tax Authority requires
- Works offline-friendly: download the PDF once and email or print as you wish

## What a Libya Invoice Should Contain

Under the Libyan Income Tax Law and the Tax Authority's commercial guidelines, a valid tax invoice includes the fields below. Missing any of them is the most common reason invoices get rejected by larger Libyan buyers and government bodies.

### Seller (your) details
- Full company or trading name
- Commercial registration number issued by the Ministry of Economy
- Tax registration number issued by the Libyan Tax Authority
- Full address (city, district, street)
- Phone and email contact

### Buyer details
- Buyer's name or company name
- Buyer's tax number (if registered)
- Buyer's full address

### Invoice details
- The word "Invoice" (or فاتورة) clearly at the top
- A unique, sequential invoice number
- Invoice issue date and date of supply
- Itemised description of every good or service
- Quantity, unit price, and line total
- Subtotal, any applicable tax or stamp duty, and grand total in LYD
- Payment terms — bank transfer details, cash on delivery, or other

For a deeper walk-through of the Libyan tax invoice rules, see our long-form companion article ["How to Issue a Tax Invoice in Libya"](/blog/كيف-تصدر-فاتورة-ضريبية-في-ليبيا), which covers stamp duty, retention rules, and worked examples.

## The Libyan Dinar in Practice

The Libyan dinar (LYD) is the only legal tender for invoices issued inside Libya. It is divided into 1000 dirhams, but day-to-day commercial invoices are usually rounded to whole dinars or to two decimals (LYD 1,250.50 is one thousand two hundred and fifty dinars and fifty dirhams).

For exports and contracts denominated in foreign currency, the Tax Authority allows dual-currency invoices showing both the LYD value and the foreign currency value at the agreed exchange rate. Xuvilo's [free invoice generator](/invoice?currency=LYD) supports the Libyan dinar by default and lets you switch to USD, EUR, AED, or any of 170+ currencies for export work — the formatting and decimal precision adjust automatically.

## Tax and Compliance Notes for Libya

- **Income tax.** Libya levies corporate income tax on business profits, with rates varying by activity and entity size. Always check the latest rate with the Tax Authority or your accountant before invoicing.
- **Stamp duty.** A small stamp duty applies to certain commercial documents and contracts. Many Libyan buyers will deduct it at source — show it as a separate line on the invoice when relevant.
- **Customs and import duties.** Imported goods carry customs duties that should be reflected in cost of goods on the invoice, not as a tax line.
- **Record retention.** Keep every invoice for at least five years; the Tax Authority can request records on audit.

## Step-By-Step: Issuing Your First Libya Invoice

1. Open the [free Xuvilo invoice generator](/invoice?currency=LYD).
2. Pick one of the 320 free designs from the [template library](/templates).
3. Add your business details: trading name, commercial registration, tax number, address, and logo.
4. Add the customer's details (name, tax number if registered, address).
5. Enter line items: description, quantity, unit price in LYD.
6. Add payment terms — bank transfer details (IBAN), cash, or wallet handle.
7. Preview the bilingual Arabic and English layout, then export the PDF.
8. Send by email, WhatsApp, or share a direct link.

The first invoice takes about five minutes; subsequent invoices take under a minute once your business profile is saved.

## Tips That Get Libyan Invoices Paid Faster

- **Send the invoice the same day you deliver.** Late invoices anchor late payments.
- **Always include the buyer's tax number.** Many Libyan corporates and government bodies will not pay an invoice missing the buyer's tax number.
- **Issue Arabic-primary invoices for local buyers.** Arabic on top, English on the side, looks the most professional.
- **Use a clean sequential number sequence.** Gaps and resets are red flags for auditors.
- **Confirm bank details by phone before the first invoice.** Libyan banking can be sensitive to typos in account numbers.

## Beyond Invoices

Once your invoicing is in order, pair it with the rest of the Xuvilo toolkit:

- [Quotations](/quotation) — give Libyan buyers a clean, validity-period-stamped price upfront, then convert to an invoice on order.
- [Receipts](/receipt) — issue a payment receipt the moment you are paid; Libyan corporates love this.
- [Business calculators](/calculators) — 14 free calculators including profit margin, currency converter, and VAT calculator.
- [Stamp maker](/tools/stamp-maker) — design and download a digital company stamp to embed on your invoices.

## Frequently Asked Questions

### Is the Xuvilo invoice generator really free for Libya?
Yes. Generating, previewing, and exporting Libya invoices to PDF is free with no sign-up. Premium features (cloud storage, branding upgrades, team accounts) are optional.

### Can I issue an invoice in foreign currency from Libya?
Yes — but for taxable transactions you should also show the Libyan dinar value at the agreed exchange rate. Xuvilo supports dual-currency display in the line items and totals.

### Do I need a tax number to issue invoices in Libya?
If you operate as a registered business, yes — your Libyan Tax Authority registration number must appear on every invoice. Unregistered freelancers can still issue invoices, but larger corporates will usually require a registration number before paying.

### How long should I keep my Libya invoices?
At least five years, both as printed PDF and as accounting entry. The Tax Authority can request records during an audit, and missing records lead to penalties.

### What if my buyer rejects the invoice for missing fields?
Reissue with the same invoice number and a clear "rev 2" note, or cancel the original (with a credit note) and issue a new sequential invoice. Never just delete and reissue the same number — that breaks the audit trail.

Ready to bill a Libyan customer? Open the [free invoice generator](/invoice?currency=LYD) and pick a template from the [free template library](/templates). For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "business-calculator-guide",
    titleAr: "14 حاسبة أعمال مجانية تحتاجها كل شركة في الشرق الأوسط",
    titleEn: "14 Free Business Calculators Every MENA Business Needs",
    metaTitleEn: "14 Free Business Calculators for MENA | Xuvilo",
    excerptAr:
      "دليل شامل لـ14 حاسبة أعمال مجانية يحتاجها أصحاب الأعمال في الشرق الأوسط: ضريبة القيمة المضافة، هامش الربح، التحويل، وأكثر.",
    excerptEn:
      "A complete guide to the 14 free business calculators every MENA freelancer and SME needs — VAT, profit margin, currency, loan, payroll, tax, and more.",
    date: "2026-05-06",
    readTime: 9,
    category: "business",
    keywordAr: "حاسبات الأعمال",
    keywordEn: "business calculators",
    relatedSlugs: ["14-حاسبة-أعمال-مجانية-للشرق-الأوسط"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [14 حاسبة أعمال مجانية بالعربية](/blog/14-حاسبة-أعمال-مجانية-للشرق-الأوسط) لاستعراض الحاسبات الأربع عشرة بالتفصيل.",
    contentEn: `
## 14 Free Business Calculators Every MENA Business Needs

Running a small business or freelance practice in the MENA region means doing a dozen calculations a day in your head — VAT on a Saudi sale, profit margin on an Egyptian order, the dollar value of a Lebanese pound invoice, the monthly payment on a UAE car-finance deal. Every one of those calculations is somewhere a small mistake can quietly drain your profits.

Xuvilo bundles 14 free business calculators in one place at [/calculators](/calculators). They all run in the browser, none require sign-up, and they support Arabic and English. This guide walks through what each one does, who it is for, and the most common mistake it prevents.

## 1. VAT Calculator

Compute the VAT amount on any net or gross figure. Pre-set rates for Saudi Arabia (15%), the UAE (5%), Egypt (14%), and any custom rate you enter. Both directions are supported: net to gross and gross to net. Open the [VAT calculator](/calculators/vat-calculator) and pair it with the [free invoice generator](/invoice) to bill the calculated amount in one flow.

**Common mistake it prevents.** Confusing inclusive and exclusive prices. A SAR 1,150 gross sale at 15% VAT contains SAR 150 of VAT, not SAR 172.50.

## 2. Profit Margin Calculator

Enter cost and selling price; get gross margin in both percentage and currency. Or enter the margin you want and let the calculator give you the price you should charge. The [profit margin calculator](/calculators/profit-margin-calculator) is the single most useful tool for freelancers pricing services and resellers pricing inventory.

**Common mistake it prevents.** Confusing margin with markup. A 50% markup on cost is only a 33% margin on price.

## 3. Currency Converter

Convert between 170+ currencies including USD, EUR, AED, SAR, EGP, KWD, JOD, LYD, OMR, BHD, and QAR. The [currency converter](/calculators/currency-converter) uses recent reference rates and is ideal for cross-border quoting and invoicing.

**Common mistake it prevents.** Quoting in the wrong currency direction (1 USD = 3.75 SAR is not the same as 3.75 USD = 1 SAR).

## 4. Discount Calculator

Apply percentage or fixed-amount discounts and see the resulting price and savings. The [discount calculator](/calculators/discount-calculator) is most useful for retailers running seasonal sales and freelancers offering volume discounts to repeat clients.

**Common mistake it prevents.** Stacking discounts incorrectly — two consecutive 10% discounts are 19%, not 20%.

## 5. Loan Calculator

Compute monthly instalments, total interest, and the amortisation schedule for any loan. The [loan calculator](/calculators/loan-calculator) handles car finance, home finance, working capital loans, and SME credit lines from MENA banks.

**Common mistake it prevents.** Comparing flat interest to reducing-balance interest. A "5% flat" rate is closer to 9–10% reducing-balance — the calculator shows both.

## 6. Overtime Calculator

Compute overtime pay for hourly and salaried staff. Pre-set multipliers for the standard 1.5x and 2.0x rates used across most MENA labour codes. The [overtime calculator](/calculators/overtime-calculator) is essential for any business with shift workers, drivers, retail staff, or hourly contractors.

**Common mistake it prevents.** Underpaying public-holiday overtime, which in many MENA jurisdictions is 2.5x or even 3x the base rate.

## 7. Break-Even Calculator

Enter fixed costs, variable cost per unit, and selling price; see how many units you need to sell to break even. The [break-even calculator](/calculators/break-even-calculator) is the right first calculation for anyone launching a new product, opening a shop, or pricing a service line.

**Common mistake it prevents.** Forgetting fixed costs (rent, salaries, software) when pricing.

## 8. Markup Calculator

Enter cost and the markup percentage; get the selling price. Or enter cost and selling price; get the markup. The [markup calculator](/calculators/markup-calculator) is the resale equivalent of the margin calculator.

**Common mistake it prevents.** Mixing margin and markup percentages on the same product line.

## 9. Invoice Calculator

Build a multi-line invoice total in seconds — line item subtotals, tax, discount, and grand total. The [invoice calculator](/calculators/invoice-calculator) is for anyone drafting an invoice on paper or in a chat first and wanting the maths checked before they format it. Once the numbers look right, transfer them to the [free invoice generator](/invoice) and export a PDF.

**Common mistake it prevents.** Manually adding lines and getting the tax wrong on the discounted subtotal.

## 10. Tax Calculator

A general-purpose income tax estimator with presets for several MENA jurisdictions and the ability to enter custom brackets. The [tax calculator](/calculators/tax-calculator) is for end-of-quarter and end-of-year planning, not for filing — always confirm with your accountant.

**Common mistake it prevents.** Assuming a flat tax rate when brackets apply.

## 11. Salary Calculator

Convert between gross and net salary, factor in social insurance, end-of-service benefits, and income tax where applicable. The [salary calculator](/calculators/salary-calculator) is essential for hiring staff and benchmarking offers across the GCC and Egypt.

**Common mistake it prevents.** Quoting an offer in gross when the candidate is comparing to a net package, or vice versa.

## 12. Tip Calculator

Split a bill, add a tip percentage, and get per-person totals. The [tip calculator](/calculators/tip-calculator) sounds trivial — until you are splitting a 12-person business dinner four ways across two cards.

## 13. Percentage Calculator

The most versatile tool of the set: percentage of a number, percentage change, percentage difference, or what-percent-is-X-of-Y. The [percentage calculator](/calculators/percentage-calculator) is a daily driver for anyone doing reporting, pricing, or analytics.

**Common mistake it prevents.** Confusing percentage points with percentage changes ("up 5 points" vs "up 5%").

## 14. Compound Interest Calculator

Project the future value of savings, investments, or end-of-service gratuity under monthly, quarterly, or annual compounding. The [compound interest calculator](/calculators/compound-interest-calculator) is essential for personal financial planning and for projecting business reserves.

**Common mistake it prevents.** Ignoring compounding frequency. Monthly vs annual compounding can differ by several percent over a 10-year horizon.

## How These Calculators Fit Together

The calculators are deliberately designed to feed each other and the wider Xuvilo toolset:

- **Pricing flow.** Profit margin → markup → invoice calculator → [invoice generator](/invoice).
- **Tax flow.** VAT calculator → invoice calculator → [invoice generator](/invoice) with the rate baked in.
- **Cross-border flow.** Currency converter → invoice calculator → [invoice generator](/invoice) with the right currency selected.
- **Hiring flow.** Salary calculator → overtime calculator → [quotation](/quotation) for staffing services.
- **Planning flow.** Break-even calculator → loan calculator → compound interest calculator.

All of them save your last input locally so you can step away and come back without losing your numbers.

## Frequently Asked Questions

### Are the Xuvilo calculators really free?
Yes. All 14 calculators are free to use, with no sign-up. They run entirely in your browser, so your data stays on your device.

### Do they work offline?
Once a calculator page is loaded, it works offline for the rest of the session. The shared layout and templates are cached aggressively for repeat use.

### Are the results accurate enough for tax filing?
The calculators are accurate, but they are estimators — not substitutes for your accountant. For VAT filing, payroll runs, or income tax returns, always confirm with a qualified professional in your jurisdiction.

### Can I embed the results in an invoice?
Yes. The [VAT calculator](/calculators/vat-calculator), [profit margin calculator](/calculators/profit-margin-calculator), and [invoice calculator](/calculators/invoice-calculator) are designed to feed straight into the [free invoice generator](/invoice).

### Which calculator should I use first?
Most freelancers start with the profit margin calculator (to set their pricing) and the VAT calculator (to issue compliant invoices). SMEs usually start with the break-even calculator and the salary calculator.

Open the full [calculator hub](/calculators) and bookmark the ones you use most. For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "stamp-maker-guide",
    titleAr: "صانع الأختام المجاني للوثائق التجارية",
    titleEn: "Free Online Stamp Maker for Business Documents",
    metaTitleEn: "Free Online Stamp Maker for Business | Xuvilo",
    excerptAr:
      "صمّم ختماً رقمياً احترافياً مجاناً لشركتك واطبعه على فواتيرك وعروض الأسعار وعقودك بالعربية والإنجليزية.",
    excerptEn:
      "Design a professional digital company stamp for free. Add it to your invoices, quotations, contracts, and PDFs in Arabic or English in under a minute.",
    date: "2026-05-06",
    readTime: 7,
    category: "tips",
    keywordAr: "صانع ختم",
    keywordEn: "online stamp maker",
    relatedSlugs: ["صانع-أختام-مجاني-للوثائق-التجارية"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [دليل صانع الأختام المجاني بالعربية](/blog/صانع-أختام-مجاني-للوثائق-التجارية) لتعلم تصميم ختم رقمي احترافي لشركتك.",
    contentEn: `
## Free Online Stamp Maker for Business Documents

A company stamp — the round, two-line, blue or red mark you stamp onto invoices, contracts, and delivery notes — is still a daily fact of business life across the MENA region. Banks ask for it, government departments ask for it, large corporates ask for it. A clean stamp signals legitimacy; a sloppy one undermines the whole document. The Xuvilo [free stamp maker](/tools/stamp-maker) lets you design and download a professional digital stamp in under a minute, with no sign-up.

This guide explains why digital stamps still matter, what a professional stamp should contain, and how to design one that survives both print and PDF embedding.

## Why Digital Stamps Still Matter

In a fully paperless world, an electronic signature would replace the company stamp entirely. In MENA, paper and PDF coexist with electronic workflows for the foreseeable future:

- **Banks and government departments** routinely require a stamped, signed document — even if you submit it as a PDF.
- **Procurement teams** at large corporates often check for the supplier stamp on every invoice and delivery note.
- **Construction, logistics, and trading businesses** use stamps on delivery notes and shipping documents as the cheapest possible proof-of-handover.
- **International clients** find a clean MENA-style stamp distinctive and reassuring — it signals you are operating to local norms.

A digital stamp is simply a high-resolution image of a stamp design that you save once and embed on every PDF you generate. Because Xuvilo stamps are vector-quality PNGs, they print and scan cleanly at any size.

## What a Professional Company Stamp Should Contain

A good stamp packs identity into a small visual footprint. Standard ingredients include:

- **Company name.** The full legal trading name, in Arabic or English (or both).
- **A second descriptive line.** "General Trading", "Engineering Consultants", "Marketing Services" — one line that explains what you do.
- **Commercial registration number** or license number, if you want to bake legitimacy directly into the mark.
- **City or country.** Helpful for businesses with multiple branches.
- **A single colour.** Traditional MENA stamps use blue or red. Black is used for monochrome printing.
- **A clean shape.** Round is the most common; oval and rectangular stamps are also widely used.

Avoid: gradients, photos, drop shadows, and any small text under 8pt — none of them survive a fax or a low-resolution scan.

## Round, Oval, or Rectangular?

The Xuvilo [stamp maker](/tools/stamp-maker) supports the three most common shapes:

- **Round.** The default for company-wide stamps. Best for general-purpose use.
- **Oval.** Often used for departmental sub-stamps ("Accounts Department", "Quality Control").
- **Rectangular.** Common for "RECEIVED", "PAID", and "APPROVED" stamps that overlay the document.

Most businesses keep one round company stamp and one or two rectangular workflow stamps. You can design and download as many as you like — Xuvilo stores nothing on your device unless you choose to save.

## Step-By-Step: Designing Your Stamp

1. Open the [free stamp maker](/tools/stamp-maker).
2. Pick a shape (round, oval, or rectangular).
3. Type the top line — usually the full company name in your primary language.
4. Type the bottom line — the descriptive subtitle or registration number.
5. (Optional) Add a centre symbol — initials, a small logo mark, or a year.
6. Pick the colour: blue, red, or black.
7. Adjust the border thickness and font weight.
8. Preview at full resolution, then download as a transparent-background PNG.
9. Embed the PNG on your invoice template, contract footer, or delivery-note signature block.

The download is a high-resolution PNG with a transparent background, so it sits cleanly on top of any document — white, coloured, or watermarked.

## How to Use the Stamp on Xuvilo Invoices

Inside the [free invoice generator](/invoice), the stamp slots into the signature area at the bottom right of the invoice. Save it once on your business profile and it appears automatically on every invoice you issue. The same stamp also embeds on:

- [Quotations](/quotation)
- [Receipts](/receipt)
- Purchase orders generated from the invoice template
- Custom PDF templates from the [template library](/templates)

If you have multiple stamps (for example, one round company stamp and a separate "PAID" rectangle), upload each as a saved branding asset and switch between them per document.

## Tips for a Stamp That Looks Real

- **Pick a single dominant colour.** Royal blue or cinnabar red are the safest choices.
- **Keep all text legible at thumbnail size.** If you cannot read it at 100×100 pixels, neither can your customer's accountant.
- **Centre the rotation.** A slightly off-centre stamp design looks intentional; a heavily skewed one looks fake.
- **Stick to two lines plus a small centre symbol.** Anything more becomes a logo, not a stamp.
- **Avoid Latin and Arabic on the same line.** They mix poorly. Use one line in Arabic, one in English, in two separate rings if you need bilingual.

## Legal and Compliance Notes

A digital stamp is not a digital signature — it does not, on its own, prove the identity of the person who applied it. For high-value contracts, pair the stamp with a real signature (or a verified e-signature service). For invoices, delivery notes, and most day-to-day commercial paperwork, a stamp plus a printed name and signature line is the standard MENA format and is widely accepted by banks and government bodies.

Some jurisdictions require the stamp to include the company commercial registration number — check your local rules before designing yours. The Xuvilo stamp maker has dedicated fields for the CR number and tax registration number for exactly this reason.

## Beyond the Stamp

Pair the stamp maker with the rest of the Xuvilo toolkit for a full business documentation flow:

- [Invoice generator](/invoice) — embed the stamp on every invoice automatically.
- [Quotation generator](/quotation) — issue a clean, validity-stamped quote.
- [Receipt generator](/receipt) — issue a payment receipt with the stamp the moment you are paid.
- [320 free templates](/templates) — design-led document templates compatible with your stamp.
- [AI Writer](/ai-writer) — draft the cover note that accompanies the stamped document.

## Frequently Asked Questions

### Is the Xuvilo stamp maker really free?
Yes. Designing, previewing, and downloading the stamp PNG is free with no sign-up. Saving the stamp to your Xuvilo business profile is a free account feature.

### What file format does the stamp download in?
A high-resolution PNG with a transparent background. The PNG embeds cleanly on top of any document, scales without artefacts, and prints sharply at 300 DPI.

### Can I add a logo or initials in the centre of the stamp?
Yes. The [stamp maker](/tools/stamp-maker) supports a centre text element (such as your initials or year) and a centre symbol slot for a small logo mark.

### Is a digital stamp legally valid?
A stamp on its own is a visual mark, not a legal signature. For contracts, pair it with a printed name and signature; for invoices and delivery notes, it is widely accepted across MENA as a standard authenticity mark.

### Can I create multiple stamps (company, paid, received)?
Yes. Create one design at a time, download each, and reuse them as you need. There is no limit on the number of stamps you can create.

Ready to design your company stamp? Open the [free stamp maker](/tools/stamp-maker) and download your design in under a minute. For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "how-to-send-invoice-email",
    titleAr: "كيف ترسل فاتورة احترافية بالبريد الإلكتروني (مع قوالب)",
    titleEn: "How to Send a Professional Invoice by Email (With Templates)",
    metaTitleEn: "How to Send an Invoice by Email | Xuvilo",
    excerptAr:
      "دليل عملي لإرسال الفواتير بالبريد الإلكتروني: قوالب رسائل جاهزة، توقيت الإرسال، طرق المتابعة، ونصائح لتسريع الدفع.",
    excerptEn:
      "A practical guide to sending invoices by email — copy-paste templates in Arabic and English, the right timing, follow-up tactics, and tips to get paid faster.",
    date: "2026-05-06",
    readTime: 8,
    category: "tips",
    keywordAr: "إرسال فاتورة بالبريد",
    keywordEn: "send invoice by email",
    relatedSlugs: ["كيف-ترسل-فاتورة-احترافية-بالبريد-الإلكتروني"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [كيف ترسل فاتورة احترافية بالبريد الإلكتروني بالعربية](/blog/كيف-ترسل-فاتورة-احترافية-بالبريد-الإلكتروني) للقوالب الجاهزة لرسائل الفواتير.",
    contentEn: `
## How to Send a Professional Invoice by Email

The invoice itself is only half the work. The email you wrap around it decides how fast you get paid and how the customer remembers your brand. A polished, well-timed invoice email gets paid days — sometimes weeks — faster than a one-line "see attached" message. This guide walks through the timing, the structure, and the exact wording that gets MENA invoices paid on time.

## When to Send the Invoice

The single biggest predictor of getting paid on time is sending the invoice on the same day the work is delivered. Every day you wait shifts the customer's payment cycle by an equal day. If you finish a project on Tuesday and invoice on Friday, you have already moved their pay run from this month to next month.

Practical timing rules:

- **Same-day for deliverables.** Send the invoice within hours of finishing the work.
- **First of the month for recurring services.** Retainers and subscriptions are best invoiced on the 1st so customers can include them in the same monthly pay run.
- **At project milestones for long engagements.** Match invoices to milestones agreed in the [quotation](/quotation), not to calendar months.
- **Before the customer's pay-run cutoff.** Most MENA corporates run payments twice a month (15th and end-of-month). Get your invoice in three working days before the cutoff.

## Anatomy of a Professional Invoice Email

A great invoice email has six elements, in this order:

1. **A clear subject line** containing the invoice number and the customer's PO reference.
2. **A polite, specific opening** that reminds the customer who you are and what the invoice is for.
3. **The amount and the due date** stated in plain language up front.
4. **The PDF attachment** generated by the [free invoice generator](/invoice).
5. **A direct payment link or bank details** so they can pay without leaving the email.
6. **A friendly close** with your name, company, and contact details.

A weak invoice email forces the customer to open the PDF to find the basics. A strong one tells them everything they need in the body of the email.

## Subject Line Templates That Work

Subject lines are read first and decide whether the email gets opened today or buried in tomorrow's queue. Use a structured format: company name, document type, number, customer reference, amount, due date.

Examples:

- "Xuvilo invoice INV-2026-0142 — PO 88241 — SAR 4,500 due 25 May"
- "Invoice INV-2026-0014 from [Your Company] — AED 1,200 — net 30"
- "Monthly retainer invoice INV-2026-0007 — KWD 350 due 15 May"

Three principles:

- Lead with what the email **is**, not with niceties.
- Always include the invoice number and the customer's PO or reference number.
- State the amount and due date in the subject. The customer should be able to triage without opening.

## Email Body Templates

### Template 1 — Standard delivery invoice

> **Subject:** Invoice INV-2026-0142 — PO 88241 — SAR 4,500 due 25 May
>
> Hi [First Name],
>
> Thanks again for [project / order]. Please find invoice **INV-2026-0142** attached for **SAR 4,500**, due **25 May 2026** as agreed.
>
> The invoice references your PO **88241**. Bank transfer details and a direct payment link are in the PDF; we accept KNet, IBAN transfer, and Visa/Mastercard.
>
> Let me know if you need anything reformatted for your accounts team — happy to reissue with extra references at no charge.
>
> Best,
> [Your Name]
> [Your Company] · [phone] · [email]

### Template 2 — Retainer / monthly invoice

> **Subject:** Monthly retainer invoice INV-2026-0007 — KWD 350 due 15 May
>
> Hi [First Name],
>
> Sending across this month's retainer invoice — **INV-2026-0007** for **KWD 350**, covering [period]. Due **15 May 2026**.
>
> Same bank details as the last few months; payment link is in the PDF.
>
> A short summary of what we delivered this month is on page 2 of the invoice for your records.
>
> Best,
> [Your Name]

### Template 3 — Polite first-day-late follow-up

> **Subject:** Quick check — invoice INV-2026-0142 (SAR 4,500)
>
> Hi [First Name],
>
> Quick note that invoice **INV-2026-0142** was due yesterday (25 May) and I have not seen the payment yet. Could you check whether it has cleared on your side, or whether your accounts team needs anything else from me?
>
> Original invoice attached for convenience.
>
> Best,
> [Your Name]

### Template 4 — Firm second follow-up (day 7 late)

> **Subject:** Second reminder — invoice INV-2026-0142 (SAR 4,500), now 7 days overdue
>
> Hi [First Name],
>
> Following up on invoice **INV-2026-0142**, which is now 7 days past its due date of 25 May. Could you confirm a date by which payment will be released, and whether there is anything outstanding on your side that I can resolve?
>
> Bank details and the original invoice are attached.
>
> Best,
> [Your Name]

## Practical Email Hygiene

- **Always cc your own accounts inbox** so you have a record without forwarding later.
- **Use a recognisable from-name.** "Ahmed at [Company]" beats a generic "[Company] noreply".
- **Attach the PDF, not a link to a cloud drive.** Many MENA corporates block external file shares.
- **Include both Arabic and English in the email body** when the buyer is in Arabic-speaking jurisdictions; mirror the bilingual format of the invoice itself.
- **Send during business hours in the buyer's timezone.** A Sunday-morning Riyadh-time email is read; a Friday-night Jeddah-time email is buried.

## Use the Built-In Tools

The [Xuvilo free invoice generator](/invoice) generates the PDF, embeds your stamp, and gives you a copy-ready download. The [AI Writer](/ai-writer) can draft and translate the cover email in Arabic or English. The [320 templates](/templates) make sure the PDF itself looks the part. And once payment lands, issue a [receipt](/receipt) the same day to close the loop.

## Frequently Asked Questions

### Should I send the invoice as a PDF or as plain text?
Always PDF. PDFs preserve layout, embed your branding, and are required by most procurement systems. Use the [free invoice generator](/invoice) to export the PDF; do not paste invoice details into the email body alone.

### Should I cc anyone on the invoice email?
Cc your own accounts inbox so you have a record. If the customer has named an accounts contact, cc them too. Avoid cc-ing the buyer's manager on the first send; reserve it for the second follow-up.

### What if the customer does not respond?
Send a polite reminder one day after the due date. Send a firmer reminder seven days after. Pick up the phone after fourteen days. Most overdue invoices clear at the second reminder.

### Can I send invoices in Arabic?
Yes — the [free invoice generator](/invoice) renders Arabic right-to-left and English alongside it. The [AI Writer](/ai-writer) drafts cover emails in Arabic or English and can translate one to the other.

### How do I follow up without sounding rude?
Stay neutral, factual, and brief. State the invoice number, the amount, the original due date, and ask a specific question. Avoid emotional language; let the timeline carry the weight.

Ready to issue and send your next invoice? Open the [free invoice generator](/invoice), pick a [template](/templates), and use one of the email templates above. For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "small-business-invoicing-guide",
    titleAr: "دليل الفوترة الكامل للشركات الصغيرة في الشرق الأوسط",
    titleEn: "Complete Invoicing Guide for Small Businesses in MENA",
    metaTitleEn: "Small Business Invoicing Guide MENA | Xuvilo",
    excerptAr:
      "دليل شامل للفوترة لأصحاب الأعمال الصغيرة في الشرق الأوسط: ترقيم الفواتير، الضرائب، شروط الدفع، والمتابعة.",
    excerptEn:
      "A complete invoicing guide for small businesses in MENA — numbering, currency, VAT, payment terms, follow-ups, and the free tools to handle it all in minutes.",
    date: "2026-05-06",
    readTime: 9,
    category: "invoices",
    keywordAr: "فوترة الشركات الصغيرة",
    keywordEn: "small business invoicing",
    relatedSlugs: ["دليل-الفوترة-الكامل-للشركات-الصغيرة-MENA"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [دليل الفوترة الكامل للشركات الصغيرة بالعربية](/blog/دليل-الفوترة-الكامل-للشركات-الصغيرة-MENA) للدليل الشامل من الترقيم إلى المتابعة.",
    contentEn: `
## Complete Invoicing Guide for Small Businesses in MENA

Invoicing is the single biggest source of preventable cash-flow pain for small businesses across the MENA region. Late payments, rejected invoices, and disputes almost always trace back to weak invoicing habits — not to bad customers. This guide is the all-in-one playbook: how to structure invoices, what to charge, when to send them, and how to follow up. Everything in it can be done for free with the [Xuvilo invoice generator](/invoice) and the [calculator hub](/calculators).

## Step 1 — Set Up Your Invoice Foundation

Before you issue your first invoice, lock down five foundations:

1. **A consistent invoice format.** Pick one [template](/templates) and stick to it. Switching designs every quarter signals chaos.
2. **A clean invoice numbering scheme.** Sequential, year-prefixed, no gaps: INV-2026-0001, INV-2026-0002, and so on. Auditors notice gaps.
3. **A standard payment terms policy.** Net 14 for new customers, net 30 for trusted ones, net 60 for enterprise where unavoidable. Decide once, apply everywhere.
4. **A standard set of payment methods.** Bank transfer (IBAN), KNet, card, wallet. Add a payment link or QR code on every invoice.
5. **A saved business profile.** Logo, stamp, signature, full legal details. Save it once in your [business profile](/invoice) so it appears on every invoice.

These five take an hour to set up. They save dozens of hours over the year.

## Step 2 — Build the Invoice Itself

Every MENA invoice should contain the fields below. Whether you operate in the UAE, Saudi Arabia, Egypt, Kuwait, Jordan, Libya, or anywhere else in the region, the structure is the same; only the tax line and currency change.

### Header
- The word "Invoice" or "Tax Invoice" clearly at the top
- A unique sequential invoice number
- Issue date and due date

### Seller details
- Your full legal name or trading name
- Commercial registration and tax registration numbers
- Address and contact details

### Buyer details
- Buyer's full name or company name
- Buyer's tax registration number (essential for B2B)
- Buyer's billing address

### Line items
- A clear description of every product or service
- Quantity, unit price, line total
- Subtotal, applicable tax (15% in Saudi Arabia, 5% in the UAE, 14% in Egypt, none currently in Kuwait), and grand total in the agreed currency

### Footer
- Payment terms and methods
- Bank account details
- Notes and any reference number (PO, contract, project code)
- Stamp and signature

## Step 3 — Pick the Right Currency and Tax

If you sell domestically, default to your local currency: SAR, AED, EGP, KWD, JOD, LYD, OMR, BHD, or QAR. The [free invoice generator](/invoice) supports every MENA currency natively, with the right number of decimal places (three for KWD, two for most others).

For cross-border invoices, agree the currency in the [quotation](/quotation) before the work starts. If you invoice in foreign currency, also show the local-currency equivalent so your bank can match the inbound payment.

For VAT, set it on the invoice based on the destination country, not your own. A Saudi business selling to a UAE customer charges 5% UAE VAT (with the right registration); a UAE business selling to a Saudi customer charges 15% Saudi VAT under the GCC framework.

The [VAT calculator](/calculators/vat-calculator) handles every regional rate. Pair it with the [free invoice generator](/invoice) to bake the right rate into every line.

## Step 4 — Set Smart Payment Terms

Payment terms decide how much working capital your business needs. Tighten them and your cash flow improves; loosen them and you are effectively financing your customer for free.

Sensible defaults:

- **Net 14 for new customers.** Two weeks is enough time for an honest customer; longer invites delay.
- **Net 30 for trusted recurring customers.** The MENA corporate norm.
- **50% upfront, 50% on delivery for project work.** Standard for design, marketing, and IT services.
- **Milestone-based for projects over USD 10,000.** Tie each milestone to a deliverable and an invoice.

Always include a clear due date on the invoice — "Net 30" alone is ambiguous. Write "Payable by 25 May 2026" in addition.

## Step 5 — Send the Invoice the Right Way

Send by email, with the PDF attached, on the day the work is delivered. The subject line should contain the invoice number, the customer's PO, the amount, and the due date. The body should restate the same five facts so the customer can triage without opening the PDF. We have a full guide on [sending invoices by email](/blog/how-to-send-invoice-email) with copy-paste templates.

## Step 6 — Follow Up Methodically

A simple cadence collects most overdue invoices without damaging the relationship:

- **Day 0 (issue date):** Send the invoice.
- **Day 7:** Polite reminder one week later if the invoice is large or the customer is new.
- **Day 1 after due date:** Polite "did this clear on your side?" check-in.
- **Day 7 after due date:** Firmer second follow-up, copying the buyer's accounts inbox.
- **Day 14 after due date:** Phone call.
- **Day 30 after due date:** Formal demand letter; consider a payment-on-account suspension for ongoing services.

Track everything in a simple spreadsheet or CRM — every email sent, every reply received, every promised payment date. Documentation wins disputes.

## Step 7 — Issue Receipts on Payment

The moment a payment lands, issue a [receipt](/receipt) and email it back. This is the single fastest way to build trust with new customers — most freelancers skip it, so doing it sets you apart. The receipt also closes the loop on the invoice in your accounts.

## Step 8 — Keep Everything for Five Years

Most MENA tax authorities require commercial records — invoices, receipts, supporting POs, bank statements — to be kept for five years (six in Saudi Arabia under the VAT Implementing Regulations, longer in some Egyptian contexts). Save every PDF in cloud storage, organised by year and by customer. Audit-ready means audit-painless.

## Common Pitfalls and How to Avoid Them

- **Resetting numbers each month.** Use one continuous sequence per year. Auditors expect it.
- **Editing issued invoices.** If a number is wrong, issue a credit note and a new invoice. Never edit and resend the same number.
- **Skipping the buyer tax number.** B2B invoices missing the buyer's tax number get rejected by enterprise procurement systems.
- **Quoting in the wrong currency.** Match the invoice currency to the agreed quotation currency; do not switch silently.
- **Forgetting the late-fee clause.** Add a small "1.5% per month after due date" line to every invoice. Most customers will not pay it; some will, and all of them will pay faster knowing it exists.

## The Xuvilo Toolkit for Small Business Invoicing

Everything in this guide is free with Xuvilo:

- [Free invoice generator](/invoice) — build, brand, and export the PDF
- [Quotation generator](/quotation) — agree the work before you invoice it
- [Receipt generator](/receipt) — close the loop on every payment
- [320 free templates](/templates) — pick a design that suits your brand
- [14 free calculators](/calculators) including [VAT](/calculators/vat-calculator) and [profit margin](/calculators/profit-margin-calculator)
- [Stamp maker](/tools/stamp-maker) — add a clean digital stamp to every PDF
- [AI Writer](/ai-writer) — draft cover emails and follow-up notes in Arabic or English

## Frequently Asked Questions

### How often should I issue invoices?
The same day work is delivered. For retainers and subscriptions, on the 1st of every month so customers can include them in their monthly pay run.

### What is the safest invoice numbering scheme?
Year-prefixed sequential numbers: INV-2026-0001, INV-2026-0002. One sequence per year, no resets, no gaps.

### Do I need to charge VAT?
Depends on jurisdiction. Saudi Arabia: 15%. UAE: 5%. Egypt: 14%. Kuwait: none currently. Bahrain: 10%. Oman: 5%. Qatar: none. Use the [VAT calculator](/calculators/vat-calculator) to compute the right amount and the [invoice generator](/invoice) to apply it.

### What payment terms should I offer?
Net 14 for new customers, net 30 for trusted recurring ones. Avoid net 60 unless you are paid a premium for the financing.

### How do I get paid faster?
Send the invoice the same day, follow up on day 1 after the due date, accept multiple payment methods, and always include a clear due date written in plain language.

For a deeper dive, read the [send-invoice-by-email guide](/blog/how-to-send-invoice-email) and the [purchase order guide](/blog/purchase-order-guide). For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "delivery-note-guide",
    titleAr: "ما هي مذكرة التسليم؟ دليل لشركات الشرق الأوسط",
    titleEn: "What Is a Delivery Note? Guide for MENA Businesses",
    metaTitleEn: "What Is a Delivery Note? MENA Guide | Xuvilo",
    excerptAr:
      "دليل شامل لمذكرة التسليم: التعريف، الفرق عن الفاتورة، الحقول الإلزامية، وأفضل الممارسات للشركات في الشرق الأوسط.",
    excerptEn:
      "A complete guide to delivery notes for MENA SMEs — what they are, how they differ from invoices, mandatory fields, and best practices for clean handover.",
    date: "2026-05-06",
    readTime: 7,
    category: "business",
    keywordAr: "مذكرة تسليم",
    keywordEn: "delivery note",
    relatedSlugs: ["ما-هي-مذكرة-التسليم-دليل-الشركات"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [ما هي مذكرة التسليم بالعربية](/blog/ما-هي-مذكرة-التسليم-دليل-الشركات) للدليل الشامل: التعريف، الفرق عن الفاتورة، الحقول الإلزامية، وأفضل الممارسات.",
    contentEn: `
## What Is a Delivery Note?

A delivery note is a document that travels with goods from the seller to the buyer and proves what was physically handed over, when, and to whom. It is the unsung paperwork hero of MENA logistics: the document that decides who pays for a missing carton, who is responsible for damage in transit, and which invoice gets paid in full versus reduced.

For any business that ships physical goods — wholesalers, distributors, e-commerce sellers, contractors, and trading companies across Saudi Arabia, the UAE, Egypt, Kuwait, Jordan, Libya, and beyond — a clean delivery note is non-negotiable.

## Delivery Note vs Invoice — The Key Difference

The two documents are issued by the same seller, often on the same day, and look similar. The legal and commercial role is very different:

- A **delivery note** evidences **physical handover**. It says "these specific goods, in these quantities, were delivered to this address on this date and signed for by this person." It does not request payment.
- An **invoice** is the **request for payment**. It restates the same line items, adds prices and tax, and is the document the buyer pays against.

In a typical MENA distribution flow: the buyer issues a [purchase order](/blog/purchase-order-guide), the seller picks the goods and ships them, the delivery driver hands the goods over with a delivery note signed by the warehouse receiver, and the seller sends the invoice the same day or the next morning. The signed delivery note is the seller's primary protection if the buyer later disputes quantities.

## Mandatory Fields on a Delivery Note

A complete delivery note includes the fields below. Missing data is the most common reason buyers reject deliveries — or pay only for what is documented.

### Header
- The words "Delivery Note" clearly at the top
- A unique, sequential delivery note number
- The matching purchase order number and (if known) the upcoming invoice number
- Date of dispatch and expected date of delivery

### Seller details
- Full company name and address
- Commercial registration number
- Contact details for the dispatch team

### Buyer / consignee details
- Buyer's name and billing address
- **Delivery address** if different from billing address (this is the address that matters)
- On-site contact name and phone number

### Line items
- A clear description of every item delivered
- Quantity, unit of measure, and any batch or serial numbers
- (Optional) unit weight and total weight for shipping disputes

### Handover section
- Driver name and signature
- Receiver name, signature, and date
- "Received in good order" tick box (or noted exceptions)
- Any condition notes (damaged carton, missing seal, partial delivery)

The handover section is the single most valuable part of the document. Without a signed receiver section, the delivery note is half-evidence at best.

## Why Delivery Notes Matter in MENA Logistics

- **Handover proof.** When a buyer claims they only received 8 of 10 boxes, the signed delivery note settles the question in the seller's favour.
- **Damage attribution.** If goods arrive damaged and the receiver signs without noting it, the cost typically falls on the buyer.
- **Cross-border customs.** Many GCC border posts ask for a delivery note (or its sibling, the consignment note) alongside the invoice and packing list.
- **Compliant inventory management.** Auditors and tax authorities sample delivery notes against invoices to confirm that revenue matches actual goods movement.
- **Cleaner invoice disputes.** When the invoice and the signed delivery note match, payment is fast. When they do not, payment slows.

## When You Should Issue a Delivery Note

Issue a delivery note for any movement of physical goods, even small ones. The cost of issuing one is near-zero (use the [free invoice generator](/invoice) and switch the document type), and the upside is huge when something goes wrong. Specifically:

- All B2B shipments, no matter how small
- All cross-border movements
- All deliveries to construction sites, warehouses, and event venues
- All deliveries that are paid for at a later date (rather than cash on delivery)
- All deliveries of high-value or serial-numbered items (electronics, equipment)

For a cash-on-delivery e-commerce shipment, the courier's tracking record often substitutes; even then, an internal delivery note is good practice.

## Step-By-Step: Issuing a Delivery Note With Xuvilo

The Xuvilo [free invoice generator](/invoice) handles delivery notes by reusing the same template and switching the document title:

1. Open the [invoice generator](/invoice) and pick a [template](/templates).
2. Change the document title from "Invoice" to "Delivery Note".
3. Fill in seller and buyer details, including the delivery address if different.
4. Add line items — description, quantity, unit, batch or serial numbers if relevant.
5. Leave prices blank (delivery notes do not need prices) or include them in a discreet column for warehouse staff.
6. Add the matching PO number in the reference field.
7. Add a handover section in the notes area: driver name, receiver name, signature line, "received in good order" tick.
8. Export the PDF, print two copies, and send them with the driver. The receiver signs both; the driver brings one back.

## Best Practices for Delivery Notes

- **Number them sequentially.** Same audit logic as invoices — gaps look suspicious.
- **Match every delivery note to a purchase order.** Reference both numbers on every document.
- **Sequence: PO → DN → INV.** A clean three-document trail is the gold standard for any MENA enterprise customer.
- **Always print two copies.** The receiver keeps one; the driver returns one signed.
- **Photograph the signed copy.** A quick smartphone photo at handover is your insurance.
- **Note any exceptions on the spot.** If a carton is missing, write it on the delivery note and have the receiver initial it. Do not promise to "sort it later".
- **Retain delivery notes for at least five years.** Most MENA tax authorities require commercial records to be kept this long.

## Beyond the Delivery Note

The delivery note is one part of a four-document workflow. Pair it with:

- [Quotation](/quotation) — the price agreement that triggers the order
- [Purchase order](/blog/purchase-order-guide) — the buyer's authorisation to ship
- [Invoice](/invoice) — the request for payment
- [Receipt](/receipt) — proof of payment once funds clear

All four can be generated from the same Xuvilo template library — the [320 free templates](/templates) — so your paperwork is visually consistent across the chain.

## Frequently Asked Questions

### Is a delivery note legally required?
It is not strictly required by most MENA tax codes for the act of selling, but it is essential commercially. Many enterprise customers and government bodies will refuse to confirm receipt without a signed delivery note, and disputes are far harder to win without one.

### Should the delivery note show prices?
Usually no. The delivery note is about goods movement, not value. Some businesses show prices in a discreet column for warehouse staff, but the public-facing version is best left price-free to avoid confusion with the invoice.

### Can a delivery note be used as an invoice?
No. They are different documents serving different purposes. A signed delivery note proves handover; an invoice requests payment. Issue both — the delivery note with the goods, the invoice the same day or the next morning.

### What happens if the receiver refuses to sign?
Note the refusal on the delivery note, photograph the goods at the delivery point, and bring the unsigned note back to your office. Contact the buyer immediately to resolve. An unsigned delivery is a payment dispute waiting to happen.

### Do I need a delivery note for digital deliverables?
No — delivery notes are for physical goods. For digital deliverables (designs, code, reports), the email or upload itself is the proof of delivery. Pair it with a clean [invoice](/invoice) referencing the project.

Ready to issue your first delivery note? Open the [free invoice generator](/invoice) and switch the document title. For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "expense-report-guide",
    titleAr: "كيف تكتب تقرير مصاريف (مع نموذج مجاني)",
    titleEn: "How to Write an Expense Report (Free Template)",
    metaTitleEn: "How to Write an Expense Report | Xuvilo",
    excerptAr:
      "دليل عملي لكتابة تقرير مصاريف احترافي للسفر والمشاريع، بنماذج جاهزة، وحقول إلزامية، وأفضل الممارسات للموافقة السريعة.",
    excerptEn:
      "A practical guide to writing a clear, audit-ready expense report — what fields to include, how to categorise costs, attach receipts, and get approval fast.",
    date: "2026-05-06",
    readTime: 7,
    category: "business",
    keywordAr: "تقرير مصاريف",
    keywordEn: "expense report",
    relatedSlugs: ["كيف-تكتب-تقرير-مصاريف-نموذج-مجاني"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [كيف تكتب تقرير مصاريف بالعربية](/blog/كيف-تكتب-تقرير-مصاريف-نموذج-مجاني) للدليل العملي مع النموذج الجاهز وأفضل الممارسات.",
    contentEn: `
## How to Write an Expense Report

An expense report is a document that lists business-related costs paid out of pocket (or on a company card), grouped by category, supported by receipts, and submitted for reimbursement or accounting. For freelancers, contractors, and SME teams across the MENA region, a clean expense report is the difference between getting paid back this week and chasing accounts for a month.

This guide walks through what an expense report should contain, how to organise receipts, and the small habits that turn a rejected report into a same-day approval.

## Why Expense Reports Matter

Three audiences read your expense report, and each cares about something different:

- **Your manager or client** wants the total and a quick justification per line.
- **Accounts payable** wants a clean structure they can post to the right ledger code.
- **The auditor or tax authority** wants matching receipts that survive a five-year retention check.

A great expense report serves all three at once: a one-line summary at the top, a clean line-item table in the middle, and supporting receipts attached at the back.

## Mandatory Fields on an Expense Report

A complete expense report includes the fields below. Missing data is the single biggest reason reports get bounced back.

### Header
- A clear "Expense Report" title at the top
- A unique sequential report number
- Reporting period (start date and end date)
- Submitter name, role, and contact details
- Approver / project / cost-centre name
- Currency and total amount claimed

### Line items (one row per expense)
- Date of the expense
- Vendor or supplier name
- Category (travel, accommodation, meals, transport, supplies, software, miscellaneous)
- Brief description and business justification
- Amount in the original currency, exchange rate (if foreign), and amount in your reporting currency
- VAT included (if any), and whether the receipt qualifies as a tax invoice
- Receipt reference number (matching attached receipts)

### Footer
- Totals per category
- Grand total
- Submitter signature and date
- Approver signature line

### Attachments
- Photographs or PDFs of every receipt, named and numbered to match the line items

## Common Expense Categories for MENA Businesses

Standardising categories makes reports faster to write, easier to approve, and cleaner to audit. The most common categories across MENA expense policies are:

- **Travel.** Flights, taxis, ride-hailing (Careem, Uber), airport transfers, fuel for client visits.
- **Accommodation.** Hotels, serviced apartments, short-term rentals on business trips.
- **Meals.** Client meals, team meals, per-diems where applicable.
- **Communications.** Mobile data top-ups, international roaming, internet hotspots while travelling.
- **Office and supplies.** Stationery, printing, office furniture under the capitalisation threshold.
- **Software and subscriptions.** SaaS tools, cloud storage, design tools, accounting subscriptions.
- **Professional fees.** Translation, design, freelance support directly billed for the project.
- **Project / client-specific.** Costs that should be passed through and rebilled to the client.
- **Miscellaneous.** Anything that does not fit above; flag clearly in the description.

If your client or employer publishes a category list, follow it exactly — matching their codes saves accounts a lot of work.

## Step-By-Step: Building the Expense Report

1. **Collect receipts as you go.** Photograph every receipt the moment you receive it; save originals to a single folder per trip or month.
2. **Open a clean template.** Use one of the [320 free templates](/templates) and switch the document title to "Expense Report".
3. **Fill in the header.** Reporting period, submitter, project / cost centre, currency.
4. **Enter line items in date order.** One row per expense. Use consistent category names.
5. **Convert foreign-currency expenses.** Use the [currency converter](/calculators/currency-converter) and lock the exchange rate per the date of the expense.
6. **Tally per category and grand total.** Use the [percentage calculator](/calculators/percentage-calculator) for VAT splits if needed.
7. **Number receipts to match.** Receipt 01, 02, 03 in line item order.
8. **Attach receipts as a single PDF.** Many approvers reject reports with loose JPEGs.
9. **Write a one-line cover note.** "Expense report for the Cairo client visit, 12–15 May 2026, total USD 1,840 across 14 line items."
10. **Sign, date, and submit.** Email to the approver and cc your own accounts inbox.

## Best Practices for Faster Approval

- **Submit within five business days of the expense period.** Older reports look messy and prompt extra questions.
- **Itemise small expenses.** A single SAR 480 "miscellaneous" line gets queried; six SAR 80 lines do not.
- **Always include the business justification.** "Client lunch with Ahmed (Procurement, ABC Co.) to finalise PO 88241" beats "Lunch."
- **Flag pass-through costs separately.** If the client will reimburse a cost, label the line "Rebillable" so accounts code it correctly.
- **Match VAT carefully.** In Saudi Arabia and the UAE, only receipts qualifying as tax invoices (with the seller's VAT number) allow VAT recovery.
- **Use the same currency throughout.** Convert at the time of the expense, not at submission, to avoid month-end FX swings.

## What Not to Do

- Mix personal and business expenses on the same report.
- Submit a single screenshot of a wallet app instead of a tax invoice.
- Round numbers ("about USD 50"). Use the exact figure on the receipt.
- Resubmit the same expense across multiple reports — accounts will spot it on audit.
- Wait until end of quarter to submit. Memory fades, receipts fade, and approvers become suspicious.

## Tools That Make Expense Reporting Painless

- [Free template library](/templates) — pick a clean expense report layout.
- [Currency converter](/calculators/currency-converter) — convert foreign expenses at the day's rate.
- [Percentage calculator](/calculators/percentage-calculator) — extract VAT components.
- [VAT calculator](/calculators/vat-calculator) — calculate recoverable VAT for your filing.
- [AI Writer](/ai-writer) — draft the cover note and any business justifications in Arabic or English.
- [Free invoice generator](/invoice) — for the moment when an expense item should actually be a rebill invoice instead.

## Frequently Asked Questions

### How often should I submit expense reports?
Once a month is standard for ongoing teams. For project travel, submit within five business days of returning. Long delays prompt approval friction.

### Do I need to attach every receipt, even small ones?
For most MENA companies, yes — especially anything above the equivalent of USD 10. Small expenses without receipts (such as parking) should be marked "no receipt" with a brief explanation; some approvers cap the total of no-receipt items.

### What if I lost a receipt?
Note "receipt lost" on the line, write a short justification, and submit a screenshot of the bank or card transaction as backup. Most companies allow a small number of lost-receipt lines per report; abusing it raises red flags.

### Can I claim VAT on expenses?
In Saudi Arabia and the UAE, you can only recover VAT on expenses backed by a proper tax invoice from a VAT-registered seller (with the seller's TIN, the VAT amount itemised, and the buyer's TIN where required). A simple cash receipt does not qualify.

### What is the difference between an expense report and an invoice?
An expense report claims reimbursement for costs you have already paid. An [invoice](/invoice) requests payment for goods or services you have provided. They are different documents in different directions of the cash flow.

Ready to write your next expense report? Pick a [template](/templates), open the [currency converter](/calculators/currency-converter), and submit cleanly. For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },

  {
    slug: "ai-writer-business-guide",
    titleAr: "كيف توفّر أدوات الكتابة بالذكاء الاصطناعي الوقت لشركات الشرق الأوسط",
    titleEn: "How AI Writing Tools Help MENA Businesses Save Time",
    metaTitleEn: "AI Writing Tools for MENA Businesses | Xuvilo",
    excerptAr:
      "دليل شامل لاستخدام أدوات الكتابة بالذكاء الاصطناعي في الشركات الصغيرة بالشرق الأوسط: حالات الاستخدام، النصائح، والمخاطر.",
    excerptEn:
      "A complete guide to using AI writing tools in MENA small businesses — the highest-value use cases, prompts that work, the limits, and how to integrate them.",
    date: "2026-05-06",
    readTime: 8,
    category: "tips",
    keywordAr: "أدوات الكتابة بالذكاء الاصطناعي",
    keywordEn: "AI writing tools",
    relatedSlugs: ["أدوات-الكتابة-بالذكاء-الاصطناعي-للأعمال"],
    contentAr:
      "النسخة العربية الكاملة متوفّرة الآن: اقرأ [أدوات الكتابة بالذكاء الاصطناعي للأعمال بالعربية](/blog/أدوات-الكتابة-بالذكاء-الاصطناعي-للأعمال) لاستعراض شامل لحالات الاستخدام والنصائح والمخاطر.",
    contentEn: `
## How AI Writing Tools Help MENA Businesses Save Time

Every freelancer and SME owner across the MENA region writes the same paragraphs every week: cover emails for invoices, reminders for late payments, replies to RFQs, product descriptions, social posts, contract clauses, follow-ups in Arabic, the same content again in English. AI writing tools collapse all of that from hours to minutes — when you use them well.

This guide walks through where AI writing actually helps, where it does not, and how the [Xuvilo AI Writer](/ai-writer) fits into a small-business workflow alongside the [free invoice generator](/invoice) and the [calculator hub](/calculators).

## Where AI Writing Tools Actually Help

Not every writing task is a good fit for AI. The strongest use cases share three traits: high-volume, low-creativity, and easy-to-verify. Across MENA small businesses, the highest-value use cases are:

### 1. Bilingual cover emails

Drafting an invoice cover email in Arabic for a Riyadh client and the same email in English for a Dubai client used to take twenty minutes. With the [AI Writer](/ai-writer), it takes one minute: draft once in either language, ask for the translation, scan, send.

### 2. Quotation introductions and scope summaries

The technical lines of a [quotation](/quotation) are easy. The introductory paragraph that summarises the project in the customer's own words is the bit that wins the job — and it is also the bit AI is genuinely useful for.

### 3. Polite payment follow-ups

Writing a firm-but-friendly reminder for a late invoice is hard when you actually need the cash. Asking AI to draft "a polite second reminder for an overdue SAR 4,500 invoice, 7 days late, addressed to a long-standing customer" produces a calibrated draft in seconds.

### 4. Product and service descriptions

For e-commerce sellers and freelancers building a service menu, AI generates 5–10 description variants in the time it takes to write one. Pick the best, edit, publish.

### 5. RFQ replies and proposal sections

For RFQ-driven businesses, AI is the fastest way to draft the boilerplate sections (company background, methodology, references) so the team can focus on the technical and commercial sections that actually win the deal. See also our [RFQ intelligence guide](/rfq) for the structured workflow.

### 6. Social posts and product launches

A single product launch needs an Arabic Instagram caption, an English LinkedIn post, an Arabic-English bilingual WhatsApp broadcast, and a customer email. AI handles the format flips so you focus on the message.

### 7. Internal documentation

Job descriptions, employee handbooks, SOPs, and customer playbooks all share heavy boilerplate. AI gets you 80% of the way; you provide the 20% that is specific to your business.

## Where AI Writing Tools Do Not Help

Use AI selectively. The areas where it is least helpful (and most risky) include:

- **Legal contracts.** AI drafts can read well but miss the local jurisdictional nuances. Always have a qualified lawyer review.
- **Financial statements and tax filings.** AI can summarise; it cannot replace your accountant.
- **Highly technical specifications.** Engineering, medical, and regulatory documents need subject-matter review.
- **Original brand voice.** AI is great at matching a voice you already have; it is mediocre at inventing one.
- **Sensitive HR communications.** Disciplinary notes, grievance responses, and dismissal letters need human judgment first.

## Prompts That Actually Work

A good prompt has three ingredients: context, the task, and the constraints.

### Example 1 — Invoice cover email

> "Draft a polite invoice cover email in English. Recipient is a long-standing customer (procurement contact at a UAE distributor). Invoice number INV-2026-0142, AED 8,400, net 30, due 25 May 2026, references their PO 88241. Tone: professional, warm, brief — under 80 words."

### Example 2 — Bilingual product description

> "Write a 60-word Arabic product description and a 60-word English product description for a leather laptop sleeve. Highlight: full-grain leather, MacBook 14-inch fit, magnetic closure, 2-year warranty. Tone: premium, understated."

### Example 3 — Polite second-reminder follow-up

> "Draft a polite-but-firm second reminder for an overdue invoice. Recipient is a Saudi enterprise customer. Invoice INV-2026-0089, SAR 12,000, originally due 15 April 2026, now 14 days late. Tone: respectful, factual, ask for a specific payment date. Under 100 words. English."

### Example 4 — Quotation introduction paragraph

> "Write a 90-word introduction paragraph for a website redesign quotation. Customer is a mid-size Egyptian retailer who wants a faster, more mobile-friendly storefront. Reference our previous discovery call. Tone: confident, customer-first, no jargon. English."

The pattern is the same every time: who is the audience, what is the document, what facts must appear, what tone, what length.

## Integrating AI Into Your Daily Workflow

The biggest time saving comes when AI sits next to the document you are producing, not as a separate browser tab. The [Xuvilo AI Writer](/ai-writer) is built into the same workspace as the [free invoice generator](/invoice), the [quotation generator](/quotation), and the [receipt generator](/receipt) — so the cover email for an invoice you just drafted is one click away.

A typical 30-second workflow:

1. Open the invoice in the [generator](/invoice).
2. Click "Draft cover email" — the AI Writer reads the invoice context (number, amount, customer, due date).
3. Pick the language (Arabic or English).
4. Edit the draft for tone and any customer-specific notes.
5. Copy into your email client and send.

For freelancers handling 10–20 invoices a month, this collapses an hour of writing into about ten minutes.

## Bringing Your Own Keys

Xuvilo's AI features are designed around a "bring your own key" model: you supply your OpenAI, Anthropic, Google, or OpenRouter API key, and the AI Writer uses it directly. This keeps costs predictable, gives you control over which model you use, and means your prompts are never logged on a shared service. For most small businesses, an OpenAI or Gemini key with a USD 10/month budget is more than enough.

## Best Practices

- **Always read the draft before sending.** AI is fast, not infallible.
- **Provide concrete facts.** Vague prompts produce vague outputs.
- **Match tone to relationship.** Long-standing customers warrant warmth; new RFQ replies warrant formality.
- **Mind sensitive data.** Do not paste customer PII into prompts unnecessarily.
- **Save your best prompts.** Build a small private prompt library for recurring document types.
- **Translate carefully.** Always do a second pass on Arabic translations of finance- or legal-related text — AI can still misrender numbers, currencies, and idioms.

## Frequently Asked Questions

### Is the Xuvilo AI Writer free to use?
The interface is free; you bring your own API key for the underlying model (OpenAI, Anthropic, Google, OpenRouter). This keeps costs in your control and avoids per-seat fees.

### Can the AI Writer translate Arabic to English and back?
Yes. It handles bilingual drafts natively — write in either language and request the matched version in the other.

### Does the AI Writer work with my invoices?
Yes. Open an invoice in the [free invoice generator](/invoice), click "Draft cover email", and the AI Writer pulls the invoice context (number, amount, customer, due date) directly.

### Will the AI Writer replace my accountant or lawyer?
No. AI writing tools are excellent for drafts and boilerplate; they are not substitutes for licensed financial or legal advice. Always have qualified humans review high-stakes documents.

### What about my customer data?
Xuvilo never logs your prompts on its servers. With the bring-your-own-key model, every request goes from your browser directly to the model provider you chose. Read the model provider's data policy before sending any sensitive content.

Ready to save a few hours this week? Open the [AI Writer](/ai-writer) and pair it with the [free invoice generator](/invoice). For more guides, head back to the [Xuvilo Blog](/blog).
    `.trim(),
  },
  {
    slug: "ما-هو-أمر-الشراء-دليل-شامل",
    titleAr: "ما هو أمر الشراء؟ دليل شامل لشركات الشرق الأوسط",
    titleEn: "What Is a Purchase Order? Complete Guide for MENA Businesses",
    metaTitleAr: "ما هو أمر الشراء؟ دليل MENA | Xuvilo",
    excerptAr:
      "دليل عملي لأمر الشراء (PO) للشركات في الشرق الأوسط: التعريف، الفرق عن الفاتورة، الحقول الإلزامية، نموذج جاهز، وأفضل الممارسات لتجنّب النزاعات.",
    excerptEn:
      "A complete purchase order guide for MENA businesses — what a PO is, how it differs from an invoice, mandatory fields, a ready template, and best practices.",
    date: "2026-05-06",
    readTime: 8,
    category: "business",
    keywordAr: "أمر شراء",
    keywordEn: "purchase order",
    relatedSlugs: ["purchase-order-guide", "الفرق-بين-الفاتورة-وعرض-السعر"],
    contentEn:
      "Looking for the English version? Read [the full English Purchase Order Guide](/blog/purchase-order-guide) for the complete walkthrough, mandatory fields, and best practices.",
    contentAr: `
## ما هو أمر الشراء؟

أمر الشراء (Purchase Order أو PO) هو مستند رسمي يُرسله المشتري إلى المورّد لاعتماد شراء سلع أو خدمات محددة بأسعار وكميات وشروط تسليم متفق عليها. وبمجرد أن يقبل المورّد أمر الشراء، يصبح عقداً تجارياً ملزماً للطرفين: المورّد يلتزم بالتسليم، والمشتري يلتزم بالسداد وفق الشروط المذكورة.

بالنسبة للمستقلين والشركات الصغيرة في منطقة الشرق الأوسط، أوامر الشراء هي الطريقة التي يفضّلها كبار العملاء (الشركات الكبرى، الجهات الحكومية، وأقسام المشتريات) للتعامل التجاري. إذا كنت تبيع لعملاء مؤسسيين في السعودية أو الإمارات أو مصر أو الكويت أو الأردن أو ليبيا، فتوقّع أن يصلك أمر شراء قبل بدء أي عمل. وإصدارك لأوامر شراء لمورّديك يُنظّم مصروفاتك ويُحافظ على سجلات حساباتك الدائنة نظيفة.

## أمر الشراء مقابل الفاتورة — الفرق الجوهري

يبدو المستندان متشابهين، لكنهما يقعان على طرفي نقيض من المعاملة:

- **أمر الشراء** يُصدره **المشتري** **قبل** تسليم السلع أو الخدمات، ويعني: "يُرجى توريد هذه البنود بهذه الأسعار."
- **الفاتورة** يُصدرها **البائع** **بعد** التسليم، وتعني: "هذا هو المبلغ المستحق، يُرجى السداد بحلول هذا التاريخ."

التسلسل النظيف هو: المشتري يصدر أمر شراء ← المورّد يؤكد ← المورّد يُسلّم ← المورّد يصدر فاتورة تشير إلى رقم أمر الشراء ← المشتري يسدّد. رقم أمر الشراء المطبوع على الفاتورة هو ما يسمح لقسم المحاسبة بربط الفاتورة بالاعتماد الأصلي. كثير من العملاء المؤسسيين في دول الخليج يرفضون سداد أي فاتورة لا تحمل رقم أمر الشراء.

## الحقول الإلزامية في أمر الشراء

أي أمر شراء احترافي يجب أن يحتوي على الحقول التالية. غياب أي بيان هو السبب الأكثر شيوعاً لرفض أوامر الشراء أو تعليق الفواتير لاحقاً.

### بيانات الترويسة
- عبارة "أمر شراء" واضحة في أعلى المستند
- رقم أمر شراء فريد ومتسلسل (مثل PO-2026-0001)
- تاريخ إصدار أمر الشراء وتاريخ التسليم المطلوب
- اسم المشتري القانوني الكامل وعنوانه ورقمه الضريبي وجهة الاتصال
- اسم المورّد وعنوانه وبيانات التواصل

### بنود الأمر
- وصف واضح لكل سلعة أو خدمة
- الكمية ووحدة القياس (قطعة، ساعة، كيلوغرام، متر مربع)
- سعر الوحدة بالعملة المتفق عليها
- إجمالي البند، المجموع الفرعي، الضريبة المطبقة (مثل 15% في السعودية أو 5% في الإمارات)، والإجمالي النهائي

### الشروط التجارية
- شروط الدفع (صافٍ 30، صافٍ 60، دفعة مقدّمة، دفع حسب المراحل)
- عنوان التسليم وشروط الإنكوترمز (DAP، EXW، FOB) للتجارة العابرة للحدود
- عملة المعاملة
- متطلبات الجودة أو التغليف أو الضمان
- توقيع معتمَد من فريق المشتريات لدى المشتري

## كيف يبدو تدفّق أمر الشراء عملياً

قد يستلم مورّد مواد بناء صغير في جدة أمر شراء من مقاول لـ200 كيس إسمنت بسعر 22 ريالاً للكيس، يُسلَّم في موقع بالرياض بحلول الخامس عشر من الشهر، الدفع صافٍ 30. يؤكد المورّد أمر الشراء كتابياً، ويُسلّم، ويصدر فاتورة ضريبية تشير إلى "PO-2026-0142" في الترويسة. يتحقق فريق مالية المقاول من الفاتورة، ويجد أمر الشراء المطابق في النظام، ويتأكد من السعر والكمية، ويُفرج عن المبلغ خلال 30 يوماً. لا نزاعات، ولا ملاحقة، ولا رسائل محرجة.

من دون أمر شراء، تعتمد المعاملة على رسائل واتساب وأسعار شفهية وثقة شخصية. وعند حدوث أي خطأ — اختلاف سعر، نقص في التسليم، تأخّر في الدفع — لا يوجد مرجع يستند إليه الحوار، والمورّد هو الخاسر دائماً تقريباً.

## متى يجب استخدام أوامر الشراء؟

لا تحتاج إلى أمر شراء لكل معاملة. كقاعدة عامة، استخدمها عندما:

- تبيع لعميل مؤسسي أو حكومي أو شركة كبيرة تشترطه
- تكون قيمة الطلب فوق حد معين تحدده داخلياً (كثير من الشركات الصغيرة تعتمد PO فوق 1,000 دولار)
- يتضمّن الطلب بنوداً متعددة أو تسليمات مجدوَلة أو تسعيراً معقداً
- تريد أثراً ورقياً للتدقيق أو الضريبة أو الرقابة الداخلية
- تشتري من مورّد بالأجل وتريد تثبيت السعر كتابياً قبل الشحن

أما البيع النقدي البسيط لمرة واحدة — فاتورة 500 ريال لمستقل تصميم — فعادةً ما تكفي فيها الفاتورة وحدها.

## أفضل الممارسات لإصدار أوامر الشراء

1. **رقّمها تسلسلياً.** المدققون والجهات الضريبية يتوقعون سجل أوامر شراء نظيفاً بلا فجوات.
2. **ثبّت الأسعار كتابياً.** كل سعر بند في أمر الشراء يجب أن يطابق عرض سعر المورّد.
3. **حدّد تواريخ التسليم بوضوح.** "في أقرب وقت" ليس تاريخاً. استخدم تاريخاً تقويمياً مع شرط إنكوترمز.
4. **طابق عملة أمر الشراء مع عملة فاتورة المورّد.** اختلاف العملة من أكثر أسباب التأخير في الخليج.
5. **احتفظ بالنسخ خمس سنوات على الأقل.** معظم الأنظمة الضريبية في المنطقة تشترط ذلك.
6. **حوّل عرض السعر المقبول إلى أمر شراء.** إن كنت المشتري، فاطلب من المورّدين عروض أسعار، ثم أصدر أمر شراء يطابق العرض المقبول بنداً ببند.

## إصدار أوامر الشراء عبر Xuvilo

Xuvilo مبني حول نفس النموذج الذي يدعم [مولّد الفواتير المجاني](/invoice) و[مولّد عروض الأسعار](/quotation)، ولذلك إصدار أمر شراء مماثل تماماً لإصدار عرض سعر: اختر قالباً، أدخل بيانات المشتري والمورّد، أضف البنود مع الأسعار والضريبة، وصدّر PDF نظيفاً. القوالب الـ320 نفسها التي تدعم الفواتير وعروض الأسعار تعمل لأوامر الشراء.

إذا أرسل لك المورّد [عرض سعر](/quotation) وتريد تحويله إلى أمر شراء، انسخ البنود حرفياً، غيّر عنوان المستند إلى "أمر شراء"، وأضف رقماً فريداً. عندما يسلّم المورّد ويصدر [الفاتورة](/invoice)، يجب أن يضع رقم أمر الشراء عليها — وتُغلق الدائرة.

## دورة حياة أمر الشراء خطوة بخطوة

في الشركات المنظّمة في منطقة الخليج وشمال إفريقيا، يمرّ أمر الشراء عادةً بسبع مراحل واضحة: طلب الشراء الداخلي من القسم المختص، اعتماد المدير المالي أو مدير المشتريات، إصدار أمر الشراء إلى المورّد، تأكيد المورّد كتابياً، التسليم مع مذكرة التسليم، استلام البضاعة في المخزن مع التحقّق من المطابقة، ثم مطابقة الفاتورة بأمر الشراء ومذكرة التسليم (ما يُعرف بمطابقة الثلاثة three-way match) قبل السداد. أي خطوة تُتجاوز هي ثغرة محتملة في الرقابة الداخلية ومصدر للنزاعات لاحقاً.

## نصائح عملية للمستقلين والشركات الصغيرة

- **أنشئ نموذجاً موحّداً**: استخدم نفس قالب أمر الشراء لكل المعاملات. المرونة في الشكل تُربك المحاسبين والعملاء.
- **رقّم بالتسلسل دون فجوات**: PO-2026-0001، PO-2026-0002، إلخ. الفجوات في الترقيم تُثير علامات استفهام عند المراجعة الضريبية.
- **احفظ نسخة موقّعة**: إن أمكن، اطلب من المورّد إعادة إرسال أمر الشراء موقّعاً ومختوماً (أو رداً بالبريد الإلكتروني يقول "مقبول"). هذا الرد هو إثباتك القانوني للعقد.
- **اربط الفاتورة دائماً**: حين تصدر فاتورة بناءً على أمر شراء، اكتب رقم أمر الشراء بوضوح في الترويسة. كثير من أقسام الحسابات ترفض الفواتير بدون رقم PO.
- **راقب المتأخرات**: راجع أوامر الشراء المفتوحة كل أسبوع. أوامر الشراء التي يمضي عليها 30 يوماً دون تسليم هي مؤشر على مشكلة مع المورّد.

## ربطه بأدوات Xuvilo

بعد أن يكتمل التسليم، تستطيع إصدار الفاتورة المقابلة في دقائق عبر [مولّد الفواتير المجاني](/invoice)، مع كتابة رقم أمر الشراء في خانة المرجع. للحسابات السريعة لهامش الربح أو ضريبة القيمة المضافة على بنود أمر الشراء، استخدم [مركز الحاسبات](/calculators).

للنسخة الإنجليزية الكاملة بالأسئلة الشائعة، راجع [Purchase Order Guide](/blog/purchase-order-guide). لمزيد من الأدلة، عُد إلى [مدونة Xuvilo](/blog).

## الأسئلة الشائعة

### هل أمر الشراء ملزم قانوناً؟
نعم — بمجرد أن يقبل المورّد أمر الشراء (كتابياً أو بالأداء، أي بدء التنفيذ)، يصبح عقداً تجارياً ملزماً.

### ما الفرق بين أمر الشراء والعقد؟
أمر الشراء عقد قصير لمعاملة واحدة. أما العقد الإطاري فيُحدّد العلاقة طويلة الأجل بين الطرفين، وتُصدر أوامر الشراء تحت مظلته.

### هل أحتاج إلى أمر شراء إذا كانت لديّ فاتورة؟
ليس قانوناً، لكن العملاء المؤسسيين عادةً ما يشترطونه قبل السداد.

### هل يمكن إصدار أمر شراء لمستقل؟
بالتأكيد. أوامر الشراء ليست حكراً على السلع المادية — تشمل الخدمات أيضاً.

### كم يجب الاحتفاظ بأوامر الشراء؟
خمس سنوات على الأقل في معظم الأنظمة الضريبية في المنطقة.
    `.trim(),
  },

  {
    slug: "منشئ-فواتير-مجاني-للكويت",
    titleAr: "منشئ فواتير مجاني للكويت — بالدينار الكويتي",
    titleEn: "Free Invoice Generator for Kuwait",
    metaTitleAr: "منشئ فواتير مجاني للكويت | Xuvilo",
    excerptAr:
      "أنشئ فواتير احترافية للكويت بالدينار الكويتي، عربية وإنجليزية على نفس الصفحة. تصدير PDF مجاني، 320 قالباً، بدون تسجيل.",
    excerptEn:
      "Create professional Kuwait invoices in Kuwaiti dinar, Arabic and English. Free PDF export, 320 templates, no signup required.",
    date: "2026-05-06",
    readTime: 8,
    category: "invoices",
    keywordAr: "فاتورة الكويت",
    keywordEn: "Kuwait invoice generator",
    relatedSlugs: ["invoice-generator-kuwait", "انشاء-فاتورة-مجانية-اونلاين"],
    contentEn:
      "Looking for the English version? Read [the full English guide: Free Invoice Generator for Kuwait](/blog/invoice-generator-kuwait) for the complete walkthrough.",
    contentAr: `
## منشئ فواتير مجاني للكويت

إذا كنت تدير شركة صغيرة أو تعمل بشكل مستقل في الكويت، فإن فواتيرك هي الخيط الأرفع بين عملك وحصولك على المال. وهي أيضاً من المستندات القليلة التي يطّلع عليها عميلك ومحاسبك ووزارة المالية في الوقت نفسه. الحصول على فاتورة صحيحة أمر مهم — ولا تحتاج إلى نظام محاسبة مدفوع لذلك. [مولّد فواتير Xuvilo المجاني](/invoice?currency=KWD) مُهيَّأ مسبقاً للكويت: الدينار الكويتي (KWD)، تخطيط ثنائي اللغة عربي/إنجليزي، وتصدير PDF نظيف، بدون أي تسجيل.

يشرح هذا الدليل ما يجب أن تحتويه فاتورة الكويت، وكيفية التعامل مع العملة المحلية والمشهد الضريبي، والتفاصيل الصغيرة التي تجعل المشتري الكويتي يأخذك على محمل الجد.

## لماذا يهم وجود مولّد فواتير مخصص للكويت؟

معظم أدوات الفوترة العامة مبنية للولايات المتحدة أو أوروبا. تفترض الدولار، ولا تفهم الخانات العشرية الثلاث للدينار الكويتي (1 د.ك = 1000 فلس)، ولا تعرض العربية بشكل صحيح، وتُهمل التخطيط الثنائي اللغة الذي يتوقعه المشتري الكويتي. النتيجة: فواتير تبدو وكأنها صيغت في الخارج — وهذا أمر غير احترافي في سوق يهتم بالمظهر.

مولّد فواتير مهيَّأ للكويت يعالج كل ذلك تلقائياً:

- يضبط العملة افتراضياً على الدينار الكويتي (KWD) بدقة ثلاث خانات عشرية
- يعرض العربية من اليمين إلى اليسار جنباً إلى جنب مع الإنجليزية على الصفحة نفسها
- ينتج PDF بحجم A4 جاهزاً للطباعة بالشكل الذي يتوقعه المحاسبون الكويتيون
- يدعم حقول البطاقة المدنية والسجل التجاري التي يطلبها المشترون التجاريون
- يحمل علامتك التجارية (الشعار، الألوان، التوقيع) على كل فاتورة

## ما الذي يجب أن تحتويه الفاتورة الكويتية؟

لا تطبّق الكويت حالياً ضريبة قيمة مضافة، لكن الفواتير التجارية لا تزال تحتاج إلى بنية واضحة واحترافية. الحقول التالية هي المعيار الذي يتوقعه المشترون — ووزارة المالية عند التدقيق.

### بيانات البائع (أنت)
- اسمك القانوني أو الاسم التجاري الكامل
- رقم السجل التجاري إن كنت مرخّصاً
- رقم البطاقة المدنية إن كنت مستقلاً
- العنوان الكامل (المحافظة، المنطقة، القطعة، الشارع، المبنى)
- الهاتف، البريد الإلكتروني، وحساب واتساب الأعمال أو إنستغرام (اختياري)

### بيانات المشتري
- اسم المشتري أو الشركة
- رقم السجل التجاري للمشتري إن كان مسجلاً
- عنوان التسليم وعنوان الفوترة عند اختلافهما

### تفاصيل الفاتورة
- كلمة "فاتورة" واضحة في الأعلى
- رقم فاتورة فريد ومتسلسل
- تاريخ الإصدار وتاريخ الاستحقاق
- وصف مفصّل للسلع أو الخدمات بالكميات والأسعار
- المجموع الفرعي وأي رسوم خدمة، والإجمالي بالدينار الكويتي
- شروط السداد — تفاصيل التحويل البنكي، K-Net، أو معرّفات المحافظ الإلكترونية

## الدينار الكويتي عملياً

الدينار الكويتي من أقوى عملات العالم ويُكتب بثلاث خانات عشرية. فاتورة بـ1.500 د.ك تساوي ديناراً ونصفاً، وفاتورة بـ0.250 د.ك تساوي 250 فلساً. الأدوات العامة التي تقرّب إلى رقمين عشريين تُحدث أخطاء فواتير حقيقية هنا. [مولّد Xuvilo المجاني](/invoice?currency=KWD) يحافظ على الخانة الثالثة في كل مكان — البنود، الضرائب، الإجماليات، وملف PDF — حتى لا تخصم أو تضيف من العميل بسبب التقريب.

للفواتير العابرة للحدود، يمكنك تبديل العملة من أعلى النموذج وسيعالج Xuvilo التنسيق تلقائياً. القالب نفسه يعمل لـKWD وUSD وEUR وAED وSAR وأكثر من 170 عملة.

## ملاحظات الضريبة والامتثال للكويت

- **ضريبة القيمة المضافة:** لم تطبّق الكويت بعد ضريبة قيمة مضافة فيدرالية. حتى عام 2026 لا تحتاج إلى فرضها على البيع داخل الكويت.
- **ضريبة دخل الشركات:** معظم الشركات المملوكة كويتياً غير خاضعة لها. الكيانات الأجنبية وبعض هياكل الخليج تخضع لها بنسبة 15%.
- **الزكاة والمساهمات:** الشركات المدرجة تدفع الزكاة بنسبة 1% ومساهمة مؤسسة الكويت للتقدم العلمي بنسبة 1%. معظم المستقلين والشركات الصغيرة غير مشمولين.
- **حفظ السجلات:** احتفظ بكل فاتورة (مع القيد البنكي المقابل) خمس سنوات على الأقل.

إذا كنت تبيع أيضاً للسعودية أو الإمارات، فستحتاج إلى تطبيق ضرائبهم على تلك الفواتير. تبديل الدولة في Xuvilo يقلب الضريبة الافتراضية تلقائياً.

## خطوة بخطوة: إصدار أول فاتورة كويتية

1. افتح [مولّد فواتير Xuvilo المجاني](/invoice?currency=KWD).
2. اختر قالباً من [مكتبة القوالب](/templates) — 320 تصميماً متاحاً.
3. أضف بيانات شركتك: الاسم التجاري، السجل أو البطاقة، العنوان، والشعار.
4. أضف بيانات العميل (الاسم، السجل التجاري، العنوان).
5. أدخل البنود: الوصف، الكمية، سعر الوحدة بالدينار. استخدم ثلاث خانات عشرية عند الحاجة.
6. أضف شروط السداد — IBAN، رابط K-Net، أو معرّف محفظة.
7. عاين التخطيط الثنائي اللغة، وصدّر PDF.
8. أرسل بالبريد الإلكتروني، أو واتساب، أو رابط مباشر.

العملية كاملة تستغرق أقل من ثلاث دقائق بمجرد حفظ ملف الشركة.

## نصائح لتسريع تحصيل الفواتير الكويتية

- **أرسل الفاتورة يوم تسليم العمل.** الفواتير المتأخرة تُدفع متأخرة.
- **استخدم تسلسل أرقام نظيف.** الأرقام المتقطعة تُقلق المحاسبين.
- **ضع رمز QR للدفع.** المشتري الكويتي يتوقع خياراً للدفع بنقرة واحدة.
- **حدّد تاريخ استحقاق مهذباً.** "مستحق بحلول 25 مايو 2026" أفضل من "مستحق فوراً".
- **تابع في اليوم الثالث بعد الاستحقاق.** بريد قصير ومهذّب يحصّل أكثر من رسالة قاسية بعد 30 يوماً.

## الأسئلة الشائعة

### هل المولّد فعلاً مجاني؟
نعم. الإصدار والمعاينة وتصدير PDF كلها مجانية بدون تسجيل.

### هل يدعم العربية والإنجليزية معاً؟
نعم — كل قالب يعرض العربية يميناً والإنجليزية يساراً على A4 نظيف.

### هل يمكن حفظ العملاء وإعادة استخدامهم؟
نعم — احفظ العملاء والبنود والبيانات البنكية مرة واحدة وأعد استخدامها لاحقاً.

### هل أحتاج إلى فرض ضريبة قيمة مضافة في الكويت؟
لا حتى عام 2026.

### ما الأدوات الأخرى التي تكمّل فواتيري؟
[عروض الأسعار](/quotation)، [الإيصالات](/receipt)، و[14 حاسبة أعمال](/calculators).

## أخطاء شائعة في الفواتير الكويتية وكيف تتجنّبها

في الكويت، أكثر أسباب رفض الفواتير من قبل أقسام الحسابات هي تفاصيل صغيرة يمكن إصلاحها في ثوانٍ:

- **عدم إدراج الرقم المدني أو الرخصة التجارية**: العملاء المؤسسيون والوزارات يطلبون رقم الرخصة في كل فاتورة. أضفه إلى الترويسة بشكل دائم.
- **خلط العملات في نفس الفاتورة**: لا تُصدر فاتورة بقيم بعضها بالدينار وبعضها بالدولار. اختر عملة واحدة، وإن لزم أضف معادل بالعملة الأخرى بين قوسين كمرجع فقط.
- **الترقيم غير المتسلسل**: الفجوات في الترقيم تُربك المراجعين. ابدأ بسلسلة سنوية مثل INV-2026-0001 والتزم بها.
- **غياب رقم أمر الشراء**: إذا أصدر العميل أمر شراء، اكتب رقمه على الفاتورة في الترويسة. غيابه يُؤخّر السداد أسابيع.
- **التقريب الخاطئ للدينار**: الدينار الكويتي ثلاثة كسور عشرية (مثل 12.345 د.ك). تأكّد أن إجمالي البنود + الضريبة = الإجمالي النهائي بالضبط، دون فروقات تقريب.

## نصائح لتسريع التحصيل

- أرسل الفاتورة بالبريد الإلكتروني يوم التسليم لا في نهاية الشهر — كل يوم تأخير في الإرسال يعني يوم تأخير في الاستلام.
- اطلب رقم مرجعي من قسم الحسابات لدى العميل بمجرد إرسال الفاتورة. هذا الرقم يسرّع المتابعة لاحقاً.
- في حال السداد بالحوالة، أضف بيانات IBAN كاملة في تذييل الفاتورة لتفادي اتصالات لاحقة.
- استخدم [حاسبة هامش الربح](/calculators) قبل تسعير العقود الكبيرة لضمان أن الخصم الذي يطلبه العميل لا يأكل الربح.

## القوالب البصرية للسوق الكويتي

مولّد Xuvilo يحتوي على 320 قالباً يمكنك تجربتها مجاناً. للسوق الكويتي، القوالب الكلاسيكية ذات الترويسة الزرقاء أو الذهبية الأكثر طلباً من العملاء التقليديين، بينما القوالب العصرية بسطر لوني واحد تناسب الشركات التقنية والاستوديوهات الإبداعية. كل القوالب تدعم الترويسة ثنائية اللغة (عربي يمين/إنجليزي يسار) مع الخط العربي المناسب وتنسيق الأرقام بالدينار.

للنسخة الإنجليزية الكاملة، راجع [Free Invoice Generator for Kuwait](/blog/invoice-generator-kuwait). جاهز للفوترة؟ افتح [المولّد المجاني](/invoice?currency=KWD).
    `.trim(),
  },

  {
    slug: "منشئ-فواتير-مجاني-لليبيا",
    titleAr: "منشئ فواتير مجاني لليبيا — بالدينار الليبي",
    titleEn: "Free Invoice Generator for Libya",
    metaTitleAr: "منشئ فواتير مجاني لليبيا | Xuvilo",
    excerptAr:
      "أنشئ فواتير احترافية لليبيا بالدينار الليبي LYD، عربية وإنجليزية. قوالب جاهزة، تصدير PDF مجاني، ودعم متطلبات مصلحة الضرائب الليبية.",
    excerptEn:
      "Create professional Libya invoices in Libyan dinar (LYD), Arabic and English. Free PDF export, ready templates, and Tax Authority field support.",
    date: "2026-05-06",
    readTime: 8,
    category: "invoices",
    keywordAr: "فاتورة ليبيا",
    keywordEn: "Libya invoice generator",
    relatedSlugs: ["invoice-generator-libya", "كيف-تصدر-فاتورة-ضريبية-في-ليبيا"],
    contentEn:
      "Looking for the English version? Read [the full English guide: Free Invoice Generator for Libya](/blog/invoice-generator-libya).",
    contentAr: `
## منشئ فواتير مجاني لليبيا

العمل التجاري في ليبيا يعني التعامل مع نظام مصرفي مجزأ، اقتصاد في طور التعافي، ومصلحة ضرائب تُرسّخ قواعدها تدريجياً. والمستند الذي يربط كل ذلك معاً هو الفاتورة. فاتورة ليبية نظيفة وممتثلة تُحصّل المال أسرع، وتبقيك في الجانب الصحيح من القانون، وتُشير لعملائك الدوليين إلى أنك مورّد يُعتمد عليه.

[مولّد فواتير Xuvilo المجاني](/invoice?currency=LYD) مُهيَّأ مسبقاً لليبيا: الدينار الليبي (LYD)، تخطيط عربي/إنجليزي مزدوج، وتصدير PDF نظيف، بدون تسجيل.

## لماذا تحتاج إلى مولّد فواتير مخصص لليبيا؟

أدوات الفوترة العامة تفترض الدولار، وتُنسّق التواريخ بالطريقة الخاطئة، وإمّا أنها تتجاهل العربية كلياً أو تعرضها من اليسار إلى اليمين. المشترون والبنوك ومصلحة الضرائب في ليبيا يتوقعون مستندات تبدو محلية. مولّد مهيّأ لليبيا يعالج ذلك تلقائياً:

- يضبط العملة افتراضياً على الدينار الليبي (LYD)
- يعرض العربية من اليمين إلى اليسار جنباً إلى جنب مع الإنجليزية
- ينتج PDF بحجم A4 جاهزاً للطباعة بالشكل الذي يتوقعه المحاسب الليبي
- يدعم حقول التسجيل التجاري والضريبي
- يعمل بشكل ودي مع الإنترنت غير المستقر: نزّل الـPDF مرة وأرسله أو اطبعه لاحقاً

## ما الذي يجب أن تحتويه الفاتورة الليبية؟

بموجب قانون ضريبة الدخل الليبي وتعليمات المصلحة، تتضمّن الفاتورة الضريبية الصحيحة الحقول التالية. غياب أيّ منها هو السبب الأكثر شيوعاً لرفض الفواتير من المشترين الكبار والجهات الحكومية.

### بيانات البائع (أنت)
- الاسم التجاري الكامل أو اسم الشركة
- رقم السجل التجاري الصادر من وزارة الاقتصاد
- الرقم الضريبي الصادر من مصلحة الضرائب الليبية
- العنوان الكامل (المدينة، الحي، الشارع)
- بيانات الهاتف والبريد الإلكتروني

### بيانات المشتري
- اسم المشتري أو الشركة
- الرقم الضريبي للمشتري (إن كان مسجلاً)
- العنوان الكامل للمشتري

### تفاصيل الفاتورة
- كلمة "فاتورة" واضحة في الأعلى
- رقم فاتورة فريد ومتسلسل
- تاريخ الإصدار وتاريخ التوريد
- وصف تفصيلي لكل بند
- الكمية، سعر الوحدة، إجمالي البند
- المجموع الفرعي، الضريبة أو الدمغة المطبقة، والإجمالي بالدينار الليبي
- شروط السداد — تفاصيل التحويل، الدفع نقداً، أو غير ذلك

للحصول على شرح أعمق لقواعد الفاتورة الضريبية الليبية، راجع المقال المرافق الطويل [كيف تصدر فاتورة ضريبية في ليبيا](/blog/كيف-تصدر-فاتورة-ضريبية-في-ليبيا) الذي يغطي ضريبة الدمغة وقواعد الحفظ والأمثلة العملية.

## الدينار الليبي عملياً

الدينار الليبي (LYD) هو العملة الوحيدة المعتمدة قانونياً للفواتير الصادرة داخل ليبيا. ينقسم إلى 1000 درهم، لكن الفواتير اليومية عادةً ما تُقرّب إلى دنانير صحيحة أو خانتين عشريتين (1,250.50 د.ل تعني ألفاً ومئتين وخمسين ديناراً وخمسين درهماً).

للصادرات والعقود المُسعّرة بعملات أجنبية، تسمح المصلحة بفواتير مزدوجة العملة تُظهر القيمة بالدينار الليبي والقيمة بالعملة الأجنبية بسعر الصرف المتفق عليه. [مولّد Xuvilo](/invoice?currency=LYD) يدعم الدينار الليبي افتراضياً، ويتيح التبديل إلى الدولار أو اليورو أو الدرهم الإماراتي وأي من 170+ عملة.

## ملاحظات الضريبة والامتثال لليبيا

- **ضريبة الدخل:** تفرض ليبيا ضريبة دخل على أرباح الشركات بنسب تختلف حسب النشاط والحجم. تحقق دائماً من أحدث النسبة مع المصلحة أو محاسبك.
- **ضريبة الدمغة:** تُطبَّق على بعض المستندات والعقود التجارية. كثير من المشترين يخصمونها من المنبع — اعرضها كبند منفصل على الفاتورة عند الاقتضاء.
- **الجمارك ورسوم الاستيراد:** البضائع المستوردة تتحمل رسوماً جمركية تُدرَج ضمن تكلفة البضاعة على الفاتورة.
- **حفظ السجلات:** احتفظ بكل فاتورة خمس سنوات على الأقل.

## خطوة بخطوة: إصدار أول فاتورة ليبية

1. افتح [مولّد Xuvilo المجاني](/invoice?currency=LYD).
2. اختر تصميماً من [مكتبة القوالب](/templates) — 320 تصميماً.
3. أضف بيانات شركتك: الاسم، السجل، الرقم الضريبي، العنوان، والشعار.
4. أضف بيانات العميل (الاسم، الرقم الضريبي إن كان مسجلاً، العنوان).
5. أدخل البنود: الوصف، الكمية، السعر بالدينار الليبي.
6. أضف شروط السداد — IBAN، نقد، أو محفظة.
7. عاين التخطيط الثنائي اللغة، وصدّر PDF.
8. أرسل بالبريد، واتساب، أو رابط مباشر.

الفاتورة الأولى تستغرق نحو خمس دقائق؛ الفواتير اللاحقة أقل من دقيقة بعد حفظ ملف شركتك.

## نصائح لتسريع التحصيل في ليبيا

- **أرسل الفاتورة يوم التسليم.** الفواتير المتأخرة تُرسّخ تأخراً في السداد.
- **اذكر دائماً الرقم الضريبي للمشتري.** كثير من الشركات الكبرى والجهات الحكومية لن تسدد فاتورة بدونه.
- **استخدم فواتير عربية أساساً للمشترين المحليين.** العربية في الأعلى والإنجليزية على الجانب — المظهر الأكثر احترافية.
- **حافظ على تسلسل أرقام نظيف.** الفجوات وإعادة التشغيل علامات حمراء للمدققين.
- **أكّد بيانات البنك هاتفياً قبل أول فاتورة.** البنوك الليبية حساسة للأخطاء الإملائية في الأرقام.

## ما بعد الفاتورة

أكمل أدواتك مع بقية مجموعة Xuvilo:

- [عروض الأسعار](/quotation) — قدّم سعراً نظيفاً مع فترة صلاحية.
- [الإيصالات](/receipt) — أصدر إيصالاً فور استلام الدفع.
- [14 حاسبة أعمال](/calculators) — هامش الربح، تحويل العملات، حاسبة ضريبة القيمة المضافة.
- [صانع الأختام](/tools/stamp-maker) — صمّم ختماً رقمياً لشركتك.

## الأسئلة الشائعة

### هل المولّد مجاني فعلاً لليبيا؟
نعم. الإصدار والمعاينة وتصدير PDF مجاني بالكامل بدون تسجيل.

### هل يمكنني الفوترة بعملة أجنبية من ليبيا؟
نعم — لكن للمعاملات الخاضعة للضريبة يجب أيضاً عرض القيمة بالدينار الليبي.

### هل أحتاج إلى رقم ضريبي لإصدار فواتير في ليبيا؟
إذا كنت تعمل كمنشأة مسجلة، نعم — يجب أن يظهر رقم تسجيلك على كل فاتورة.

### كم يجب الاحتفاظ بفواتيري؟
خمس سنوات على الأقل، ورقياً وإلكترونياً.

### ماذا لو رفض المشتري الفاتورة لحقول ناقصة؟
أعد الإصدار بنفس الرقم مع ملاحظة "rev 2" أو ألغِ الأصلية بإشعار خصم وأصدر فاتورة جديدة.

## التعامل مع الفجوة بين سعر الصرف الرسمي والسعر الموازي

التحدّي الأكبر للفوترة في ليبيا هو الفجوة المستمرة بين سعر الصرف الرسمي للدينار الليبي وسعر السوق الموازي. هذه الفجوة تخلق سؤالاً عملياً في كل عقد دولي: بأي سعر نُسعّر؟ القاعدة المهنية: حدّد العملة المرجعية في العقد قبل أي شيء آخر. إن كان العميل دولياً، اكتب البنود بالدولار أو اليورو واذكر أن السداد بالدينار يُحسب وفق السعر الرسمي للمصرف المركزي يوم إصدار الفاتورة. هذا الشرط يحميك قانونياً ويُسهّل المراجعة لاحقاً.

## ملاحظات لتسريع التحصيل في السوق الليبي

- **التحويل عبر بنك مراسل**: التحويلات الدولية إلى ليبيا تمرّ غالباً ببنك مراسل أوروبي. تأكّد من إرفاق بيانات البنك المراسل في تذييل الفاتورة لتفادي تأخّر الحوالة.
- **تجزئة الفواتير الكبيرة**: للعقود طويلة المدى، أصدر فواتير شهرية بدلاً من فاتورة واحدة في النهاية. السيولة بالدينار محدودة، وفواتير أصغر تمرّ أسرع.
- **سداد جزئي عند البدء**: اطلب 30%-50% مقدّماً موثّقاً بإيصال رسمي يُشير إلى رقم العقد ورقم الفاتورة المستقبلية.
- **لغة الفاتورة**: للعملاء الحكوميين، الفاتورة باللغة العربية مع ختم الشركة وتوقيع المدير المالي. للعملاء الأجانب، نسخة ثنائية اللغة كافية.

## القوالب الأكثر ملاءمة للسوق الليبي

من بين قوالب Xuvilo الـ320، الأكثر طلباً في السوق الليبي هي القوالب الكلاسيكية المحافظة بترويسة كاملة (شعار + اسم الشركة + رقم السجل التجاري + الرقم الضريبي + العنوان الكامل). الجهات الحكومية الليبية ترفض أحياناً الفواتير ذات التصميم البسيط جداً لعدم احتوائها على بيانات كافية. اختر قالباً يحتوي على جدول مفصّل للبنود وحقل واضح لختم الشركة الدائري — وهو مطلب عملي في معظم المعاملات الليبية الرسمية. بعد إصدار الفاتورة، استخدم [صانع الأختام المجاني](/tools/stamp-maker) لإضافة ختم رقمي احترافي قبل التصدير كـ PDF.

للنسخة الإنجليزية، راجع [Free Invoice Generator for Libya](/blog/invoice-generator-libya). جاهز للفوترة؟ افتح [المولّد](/invoice?currency=LYD).
    `.trim(),
  },

  {
    slug: "14-حاسبة-أعمال-مجانية-للشرق-الأوسط",
    titleAr: "14 حاسبة أعمال مجانية تحتاجها كل شركة في الشرق الأوسط",
    titleEn: "14 Free Business Calculators Every MENA Business Needs",
    metaTitleAr: "14 حاسبة أعمال مجانية للشرق الأوسط | Xuvilo",
    excerptAr:
      "دليل شامل لـ14 حاسبة أعمال مجانية يحتاجها أصحاب الأعمال في الشرق الأوسط: ضريبة القيمة المضافة، هامش الربح، تحويل العملات، الرواتب، والمزيد.",
    excerptEn:
      "A complete guide to the 14 free business calculators every MENA freelancer and SME needs — VAT, profit margin, currency, loan, payroll, tax, and more.",
    date: "2026-05-06",
    readTime: 9,
    category: "business",
    keywordAr: "حاسبات الأعمال",
    keywordEn: "business calculators",
    relatedSlugs: ["business-calculator-guide", "تسعير-الخدمات-للمستقلين"],
    contentEn:
      "Looking for the English version? Read [the full English guide: 14 Free Business Calculators Every MENA Business Needs](/blog/business-calculator-guide).",
    contentAr: `
## 14 حاسبة أعمال مجانية تحتاجها كل شركة في الشرق الأوسط

إدارة شركة صغيرة أو ممارسة عمل حر في الشرق الأوسط تعني إجراء عشرات الحسابات يومياً في رأسك — ضريبة القيمة المضافة على بيع سعودي، هامش ربح على طلبية مصرية، قيمة فاتورة بالليرة اللبنانية بالدولار، القسط الشهري لتمويل سيارة في الإمارات. كل حسبة من هذه ممكن أن يستنزف فيها خطأ صغير أرباحك بهدوء.

تجمع Xuvilo 14 حاسبة أعمال مجانية في مكان واحد على [/calculators](/calculators). جميعها تعمل في المتصفح، بدون تسجيل، وتدعم العربية والإنجليزية. هذا الدليل يستعرض ما تفعله كل واحدة، ولمن تصلح، والخطأ الأكثر شيوعاً الذي تمنعه.

## 1. حاسبة ضريبة القيمة المضافة

احسب مبلغ ضريبة القيمة المضافة على أي قيمة صافية أو إجمالية. نسب جاهزة للسعودية (15%)، الإمارات (5%)، مصر (14%)، وأي نسبة مخصصة. الاتجاهان مدعومان: من الصافي إلى الإجمالي والعكس. افتح [حاسبة ضريبة القيمة المضافة](/calculators/vat-calculator) ثم أكمل بـ[مولّد الفواتير](/invoice).

**الخطأ الذي تمنعه.** الخلط بين السعر شامل وغير شامل الضريبة. بيع بـ1,150 ريال إجمالي بنسبة 15% يحتوي 150 ريال ضريبة، لا 172.50.

## 2. حاسبة هامش الربح

أدخل التكلفة وسعر البيع؛ تحصل على هامش الربح الإجمالي بالنسبة وبالعملة. أو أدخل الهامش الذي تريده، وستعطيك الحاسبة السعر المطلوب فرضه. [حاسبة هامش الربح](/calculators/profit-margin-calculator) هي الأداة الأكثر فائدة للمستقلين عند تسعير الخدمات وللتجار عند تسعير المخزون.

**الخطأ الذي تمنعه.** الخلط بين الهامش (Margin) والترميز (Markup). ترميز 50% على التكلفة هو هامش 33% على السعر فقط.

## 3. محوّل العملات

حوّل بين 170+ عملة بما فيها USD، EUR، AED، SAR، EGP، KWD، JOD، LYD، OMR، BHD، QAR. يستخدم [محوّل العملات](/calculators/currency-converter) أسعار صرف مرجعية حديثة، ومثالي للتسعير والفوترة العابرة للحدود.

**الخطأ الذي تمنعه.** التسعير بالاتجاه الخاطئ (1 دولار = 3.75 ريال ليس مثل 3.75 دولار = 1 ريال).

## 4. حاسبة الخصم

طبّق خصومات بنسبة مئوية أو بمبلغ ثابت وشاهد السعر النهائي والوفر. [حاسبة الخصم](/calculators/discount-calculator) مفيدة للمحلات في تنزيلات الموسم وللمستقلين عند منح خصومات الكميات للعملاء المتكررين.

**الخطأ الذي تمنعه.** تكديس الخصومات بشكل خاطئ — خصمان متتاليان 10% يساويان 19% لا 20%.

## 5. حاسبة القرض

احسب القسط الشهري وإجمالي الفائدة وجدول الإطفاء لأي قرض. [حاسبة القرض](/calculators/loan-calculator) تتعامل مع تمويل السيارات والمنازل ورأس المال العامل وخطوط الائتمان من البنوك في المنطقة.

**الخطأ الذي تمنعه.** مقارنة الفائدة الثابتة (Flat) بالفائدة المتناقصة (Reducing). نسبة "5% ثابتة" تقارب 9-10% متناقصة — والحاسبة تعرض الاثنتين.

## 6. حاسبة العمل الإضافي

احسب أجر الساعات الإضافية للموظفين بالساعة وبالراتب. مضاعفات جاهزة لـ1.5x و2.0x المعتمدة في معظم قوانين العمل في المنطقة. [حاسبة العمل الإضافي](/calculators/overtime-calculator) ضرورية لأي شركة لديها عاملون بالورديات أو سائقون أو موظفو متاجر.

**الخطأ الذي تمنعه.** تقصير دفع ساعات العطل الرسمية، التي تكون في كثير من الدول 2.5x أو حتى 3x.

## 7. حاسبة نقطة التعادل

أدخل التكاليف الثابتة، التكلفة المتغيرة لكل وحدة، وسعر البيع؛ ستعرف عدد الوحدات المطلوب بيعها للوصول إلى نقطة التعادل. [حاسبة نقطة التعادل](/calculators/break-even-calculator) هي الحساب الأول الصحيح لمن يطلق منتجاً جديداً أو يفتح متجراً.

**الخطأ الذي تمنعه.** نسيان التكاليف الثابتة (الإيجار، الرواتب، البرامج) عند التسعير.

## 8. حاسبة الترميز (Markup)

أدخل التكلفة ونسبة الترميز؛ احصل على سعر البيع. [حاسبة الترميز](/calculators/markup-calculator) هي مكافئ هامش الربح في إعادة البيع.

**الخطأ الذي تمنعه.** خلط نسب الهامش والترميز على نفس البند.

## 9. حاسبة الفاتورة

ابنِ إجمالي فاتورة متعددة البنود في ثوانٍ — مجاميع البنود الفرعية، الضريبة، الخصم، والإجمالي. [حاسبة الفاتورة](/calculators/invoice-calculator) لمن يصيغ فاتورة على ورقة أو محادثة أولاً ثم يريد التحقق من الأرقام قبل التنسيق. ثم انقل الأرقام إلى [مولّد الفواتير المجاني](/invoice).

**الخطأ الذي تمنعه.** جمع البنود يدوياً وحساب الضريبة بشكل خاطئ على المجموع المخصوم.

## 10. حاسبة الضريبة

مقدّر ضريبة دخل عام مع جاهزيات لعدة دول في المنطقة وإمكانية إدخال شرائح مخصصة. [حاسبة الضريبة](/calculators/tax-calculator) للتخطيط الفصلي والسنوي، لا للإقرار — أكّد دائماً مع محاسبك.

**الخطأ الذي تمنعه.** افتراض نسبة ضريبية ثابتة عندما تنطبق شرائح متدرجة.

## 11. حاسبة الراتب

حوّل بين الراتب الإجمالي والصافي مع التأمينات الاجتماعية ومكافأة نهاية الخدمة وضريبة الدخل عند الاقتضاء. [حاسبة الراتب](/calculators/salary-calculator) ضرورية للتوظيف ومقارنة العروض في الخليج ومصر.

**الخطأ الذي تمنعه.** تقديم عرض إجمالي بينما المرشّح يقارن بالصافي، أو العكس.

## 12. حاسبة البقشيش

قسّم الفاتورة، أضف نسبة بقشيش، واحصل على إجماليات للفرد. [حاسبة البقشيش](/calculators/tip-calculator) قد تبدو تافهة — حتى تجد نفسك تقسّم عشاء أعمال لـ12 شخصاً على أربع طرق دفع.

## 13. حاسبة النسبة المئوية

الأداة الأكثر تنوعاً: نسبة من رقم، تغيّر النسبة، الفرق النسبي، أو ما النسبة المئوية لـX من Y. [حاسبة النسبة المئوية](/calculators/percentage-calculator) هي محرك يومي لمن يعمل في التقارير والتسعير والتحليل.

**الخطأ الذي تمنعه.** الخلط بين نقاط النسبة وتغيرات النسبة ("ارتفع 5 نقاط" مقابل "ارتفع 5%").

## 14. حاسبة الفائدة المركّبة

احسب القيمة المستقبلية للمدخرات والاستثمارات أو مكافأة نهاية الخدمة بتعقيد شهري أو ربع سنوي أو سنوي. [حاسبة الفائدة المركّبة](/calculators/compound-interest-calculator) ضرورية للتخطيط المالي الشخصي وللتنبؤ باحتياطيات الشركة.

**الخطأ الذي تمنعه.** تجاهل تردد التعقيد. التعقيد الشهري مقابل السنوي قد يختلف بعدة نقاط مئوية على مدى 10 سنوات.

## كيف تترابط هذه الحاسبات معاً

- **مسار التسعير:** هامش الربح → الترميز → حاسبة الفاتورة → [مولّد الفاتورة](/invoice).
- **مسار الضريبة:** حاسبة ضريبة القيمة المضافة → حاسبة الفاتورة → [مولّد الفاتورة](/invoice).
- **مسار العابر للحدود:** محوّل العملات → حاسبة الفاتورة → [مولّد الفاتورة](/invoice).
- **مسار التوظيف:** حاسبة الراتب → حاسبة العمل الإضافي → [عرض السعر](/quotation).
- **مسار التخطيط:** نقطة التعادل → القرض → الفائدة المركّبة.

كل الحاسبات تحفظ آخر إدخال محلياً.

## الأسئلة الشائعة

### هل الحاسبات مجانية فعلاً؟
نعم — جميعها مجانية بدون تسجيل، تعمل بالكامل في متصفحك.

### هل تعمل من دون إنترنت؟
بعد تحميل الصفحة لأول مرة، تعمل بقية الجلسة بدون اتصال.

### هل النتائج دقيقة بما يكفي للإقرارات الضريبية؟
دقيقة، لكنها مقدّرة — وليست بديلاً عن محاسبك.

### هل يمكن تضمين النتائج في فاتورة؟
نعم. حاسبات [ضريبة القيمة المضافة](/calculators/vat-calculator) و[هامش الربح](/calculators/profit-margin-calculator) و[الفاتورة](/calculators/invoice-calculator) تتغذى مباشرة في [مولّد الفواتير](/invoice).

### بأي حاسبة أبدأ؟
معظم المستقلين يبدؤون بهامش الربح وضريبة القيمة المضافة. الشركات الصغيرة تبدأ بنقطة التعادل والراتب.

## كيف تختار الحاسبة المناسبة لكل قرار يومي

كثير من أصحاب الشركات الصغيرة يخلطون بين الحاسبات لأنها تبدو متشابهة على السطح. القاعدة العملية:

- **قبل التسعير**: ابدأ بـ[حاسبة هامش الربح](/calculators) لتحديد سعر البيع الذي يحقّق الهامش المستهدف، ثم استخدم [حاسبة الخصم](/calculators) لمعرفة الحد الأقصى للخصم الذي تستطيع منحه دون الإضرار بالربح.
- **عند إصدار الفاتورة**: استخدم [حاسبة ضريبة القيمة المضافة](/calculators) للتحقّق من الإجمالي قبل الإرسال.
- **عند التفاوض على عقد طويل**: [حاسبة الفائدة المركّبة](/calculators) لمقارنة العروض بالدفعات المؤجلة، و[حاسبة قيمة المال الزمنية](/calculators) لمقارنة دفعة كبيرة الآن بدفعات شهرية لاحقة.
- **عند تعيين موظفين**: [حاسبة الراتب الإجمالي والصافي](/calculators) و[حاسبة نهاية الخدمة](/calculators) لتقدير التكلفة الفعلية للموظف على ميزانيتك.

## دقّة الحاسبات وحدودها

كل حاسبات Xuvilo مبنية على معادلات مالية معيارية مفتوحة المصدر، وليست تقديرات داخلية. النتائج صالحة كأرقام عمل أوّلية، لكنها لا تُعدّ استشارة ضريبية أو قانونية رسمية. للمعاملات الكبيرة (شراء عقار، دمج شركات، ضرائب الزكاة المعقّدة)، استخدم النتائج كنقطة بداية للنقاش مع محاسبك القانوني، ولا تعتمدها وحدها أمام الجهات الرسمية. كل القيم المدخلة تبقى في متصفّحك ولا تُرسل إلى أي خادم.

## دمج الحاسبات في سير عملك اليومي

أكثر طريقة فعّالة لاستخدام مركز الحاسبات هي ربطه بسير عمل الفوترة. قبل أن تُصدر [فاتورة](/invoice) جديدة لعقد كبير، افتح حاسبة هامش الربح أولاً للتأكّد من أن السعر يحقّق الهامش المستهدف، ثم حاسبة الضريبة لاحتساب الـ VAT، ثم انقل الأرقام مباشرةً إلى المولّد. هذا الترتيب البسيط — حساب، تحقّق، إصدار — يقلّل أخطاء التسعير بنسبة كبيرة ويُنهي العادة الشائعة لإصدار فواتير ثم اكتشاف أن السعر لم يكن يغطّي التكاليف.

افتح [مركز الحاسبات](/calculators) واحفظ الأكثر استخداماً. للنسخة الإنجليزية، راجع [14 Free Business Calculators](/blog/business-calculator-guide).
    `.trim(),
  },

  {
    slug: "صانع-أختام-مجاني-للوثائق-التجارية",
    titleAr: "صانع الأختام المجاني للوثائق التجارية على الإنترنت",
    titleEn: "Free Online Stamp Maker for Business Documents",
    metaTitleAr: "صانع أختام مجاني للأعمال | Xuvilo",
    excerptAr:
      "صمّم ختماً رقمياً احترافياً مجاناً لشركتك واطبعه على فواتيرك وعروض الأسعار وعقودك بالعربية والإنجليزية في أقل من دقيقة.",
    excerptEn:
      "Design a professional digital company stamp for free. Add it to your invoices, quotations, contracts, and PDFs in under a minute.",
    date: "2026-05-06",
    readTime: 7,
    category: "tips",
    keywordAr: "صانع ختم",
    keywordEn: "online stamp maker",
    relatedSlugs: ["stamp-maker-guide"],
    contentEn:
      "Looking for the English version? Read [the full English guide: Free Online Stamp Maker for Business Documents](/blog/stamp-maker-guide).",
    contentAr: `
## صانع الأختام المجاني للوثائق التجارية

ختم الشركة — العلامة المستديرة من سطرين باللون الأزرق أو الأحمر التي تطبعها على الفواتير والعقود ومذكرات التسليم — لا يزال جزءاً يومياً من حياة الأعمال في الشرق الأوسط. تطلبه البنوك، تطلبه الجهات الحكومية، تطلبه الشركات الكبرى. ختم نظيف يدلّ على الجدية؛ ختم مهلهل يقوّض المستند بأكمله. [صانع الأختام المجاني من Xuvilo](/tools/stamp-maker) يتيح لك تصميم ختم رقمي احترافي وتنزيله في أقل من دقيقة، بدون تسجيل.

يشرح هذا الدليل لماذا لا تزال الأختام الرقمية مهمة، وما يجب أن يحتويه ختم احترافي، وكيفية تصميم واحد يصمد في الطباعة والـPDF.

## لماذا لا تزال الأختام الرقمية مهمة؟

في عالم بلا ورق تماماً، يحلّ التوقيع الإلكتروني محل ختم الشركة. لكن في الشرق الأوسط، يتعايش الورق والـPDF مع المسارات الإلكترونية لسنوات قادمة:

- **البنوك والجهات الحكومية** تشترط عادةً مستنداً مختوماً وموقّعاً — حتى لو قُدّم كـPDF.
- **فرق المشتريات** في الشركات الكبرى تتحقق من ختم المورّد على كل فاتورة ومذكرة تسليم.
- **شركات البناء والشحن والتجارة** تستخدم الأختام على مذكرات التسليم ومستندات الشحن كأرخص دليل تسليم/استلام.
- **العملاء الدوليون** يجدون ختماً منطقياً نظيفاً مميزاً ومطمئناً — يدلّ على أنك تعمل وفق المعايير المحلية.

الختم الرقمي هو ببساطة صورة عالية الدقة لتصميم ختم تحفظها مرة وتُضمّنها في كل PDF تنشئه. لأن أختام Xuvilo بجودة فيكتورية بصيغة PNG، تطبع وتُمسح بنظافة بأي حجم.

## ما الذي يجب أن يحتويه ختم احترافي؟

الختم الجيد يحزم الهوية في مساحة بصرية صغيرة. المكوّنات القياسية:

- **اسم الشركة** الكامل بالعربية أو الإنجليزية (أو كليهما).
- **سطر وصفي ثانٍ.** "تجارة عامة"، "استشارات هندسية"، "خدمات تسويق" — سطر يشرح ما تفعله.
- **رقم السجل التجاري** أو رقم الترخيص، إن أردت تضمين الشرعية في الختم نفسه.
- **المدينة أو الدولة.** مفيد للشركات بفروع متعددة.
- **لون واحد.** الأختام التقليدية في المنطقة تستخدم الأزرق أو الأحمر. الأسود للطباعة الأحادية.
- **شكل نظيف.** المستدير الأكثر شيوعاً؛ البيضاوي والمستطيل أيضاً مستخدمان.

تجنّب: التدرجات، الصور، الظلال، وأي نص أصغر من 8pt — لا شيء منها يصمد في فاكس أو مسح بدقة منخفضة.

## مستدير، بيضاوي، أم مستطيل؟

[صانع الأختام](/tools/stamp-maker) يدعم الأشكال الثلاثة الأكثر شيوعاً:

- **مستدير.** الافتراضي للأختام العامة للشركة. الأفضل للاستخدام العام.
- **بيضاوي.** غالباً للأختام الفرعية للأقسام ("قسم الحسابات"، "ضبط الجودة").
- **مستطيل.** شائع لأختام "مستلم"، "مدفوع"، و"معتمد" التي تُغطّي المستند.

معظم الشركات تحتفظ بختم شركة مستدير واحد وختم أو اثنين مستطيلين. يمكنك تصميم وتنزيل ما تشاء — Xuvilo لا يخزّن شيئاً على جهازك إلا إذا اخترت الحفظ.

## خطوة بخطوة: تصميم الختم

1. افتح [صانع الأختام المجاني](/tools/stamp-maker).
2. اختر الشكل (مستدير، بيضاوي، مستطيل).
3. اكتب السطر العلوي — عادةً اسم الشركة الكامل بلغتك الأساسية.
4. اكتب السطر السفلي — الوصف أو رقم التسجيل.
5. (اختياري) أضف رمزاً مركزياً — أحرفاً أولى، شعاراً صغيراً، أو السنة.
6. اختر اللون: أزرق، أحمر، أو أسود.
7. عدّل سُمك الإطار وثقل الخط.
8. عاين بدقة كاملة، ثم نزّل بصيغة PNG بخلفية شفافة.
9. ضمّن الـPNG على قالب فاتورتك، تذييل عقدك، أو مكان التوقيع في مذكرة التسليم.

التنزيل عالي الدقة بخلفية شفافة، فيستقرّ بنظافة فوق أي مستند.

## كيف تستخدم الختم على فواتير Xuvilo؟

داخل [مولّد الفواتير المجاني](/invoice)، يدخل الختم في منطقة التوقيع أسفل اليمين. احفظه مرة في ملف شركتك ويظهر تلقائياً على كل فاتورة. الختم نفسه يدخل أيضاً على:

- [عروض الأسعار](/quotation)
- [الإيصالات](/receipt)
- أوامر الشراء المُنشأة من قالب الفاتورة
- قوالب PDF المخصصة من [مكتبة القوالب](/templates)

إذا كان لديك أختام متعددة (مثلاً ختم شركة مستدير وختم "مدفوع" مستطيل)، حمّل كل واحد كأصل علامة تجارية محفوظ.

## نصائح لختم يبدو حقيقياً

- **اختر لوناً مهيمناً واحداً.** الأزرق الملكي أو الأحمر القرمزي الأكثر أماناً.
- **حافظ على وضوح كل النص بحجم صغير.** إن لم تستطع قراءته بحجم 100×100 بكسل، فلن يستطيع محاسب عميلك.
- **اضبط الدوران المركزي.** ختم منحرف قليلاً يبدو متعمداً؛ المنحرف بشدة يبدو مزيفاً.
- **التزم بسطرين ورمز مركزي صغير.** الأكثر يصبح شعاراً لا ختماً.
- **تجنّب اللاتينية والعربية على نفس السطر.** يختلطان بشكل سيئ.

## ملاحظات قانونية

الختم الرقمي ليس توقيعاً رقمياً — لا يثبت بمفرده هوية من طبّقه. للعقود عالية القيمة، اقرن الختم بتوقيع حقيقي (أو خدمة توقيع إلكتروني موثّق). للفواتير ومذكرات التسليم، الختم مع اسم مطبوع وسطر توقيع هو الصيغة المعيارية المقبولة في المنطقة.

بعض الجهات تشترط أن يحتوي الختم على رقم السجل التجاري — راجع قواعدك المحلية. صانع أختام Xuvilo فيه حقول مخصصة لرقم السجل والرقم الضريبي.

## ما بعد الختم

أكمل أدواتك:

- [مولّد الفواتير](/invoice) — ضمّن الختم على كل فاتورة تلقائياً.
- [عروض الأسعار](/quotation)
- [الإيصالات](/receipt)
- [320 قالباً مجانياً](/templates)
- [كاتب الذكاء الاصطناعي](/ai-writer) — لصياغة الرسالة المرافقة.

## الأسئلة الشائعة

### هل صانع أختام Xuvilo مجاني فعلاً؟
نعم. التصميم والمعاينة والتنزيل مجانية بدون تسجيل.

### بأي صيغة يُنزَّل الختم؟
PNG عالي الدقة بخلفية شفافة. يُضمَّن بنظافة على أي مستند.

### هل يمكنني إضافة شعار في وسط الختم؟
نعم. [صانع الأختام](/tools/stamp-maker) يدعم نصاً مركزياً ورمزاً صغيراً.

### هل الختم الرقمي صالح قانوناً؟
الختم وحده علامة بصرية لا توقيع قانوني. للعقود اقرنه بتوقيع.

### هل يمكنني إنشاء أختام متعددة؟
نعم — لا حدّ على عدد التصاميم.

## أين تستخدم الختم الرقمي بأمان

الختم الرقمي ليس بديلاً قانونياً عن الختم الفعلي في كل الحالات، لكنه مقبول عملياً في معظم المعاملات اليومية:

- **الفواتير وعروض الأسعار المُرسلة بالبريد الإلكتروني**: مقبول عالمياً ويُسرّع المعاملة لأن العميل لا ينتظر نسخة ورقية مختومة.
- **مذكرات التسليم الإلكترونية**: مناسب للشحنات داخل المدينة، خصوصاً مع توقيع رقمي مرفق.
- **العقود الداخلية بين الشركاء**: مقبول إذا اتفق الطرفان كتابياً على اعتماد التواقيع والأختام الرقمية.
- **التقارير الإدارية والمالية الداخلية**: مناسب تماماً.

في المقابل، المعاملات التي تُقدّم لجهات حكومية رسمية (الجمارك، السجل التجاري، المحاكم، البنوك) تتطلّب غالباً ختماً فعلياً على ورقة أصلية. اعتبر الختم الرقمي مكمّلاً للختم الفعلي لا بديلاً كاملاً عنه في هذه الحالات.

## نصائح تصميم تجعل الختم يبدو احترافياً

- **حافظ على البساطة**: سطران من النص (اسم الشركة + النشاط أو رقم السجل) أوضح بكثير من أربعة أسطر مزدحمة.
- **استخدم خطاً عربياً واضحاً**: تجنّب الخطوط الزخرفية المعقّدة لأنها تصبح غير مقروءة عند الطباعة بالأبيض والأسود.
- **ضع رمزاً مركزياً مميّزاً**: نجمة، شعار الشركة، أو حرف الاسم الأول — يُسهّل التعرّف الفوري.
- **اللون يهم**: الأزرق الغامق والأحمر الكلاسيكي الأكثر قبولاً في المعاملات الرسمية. تجنّب الألوان الفاتحة لأنها تختفي عند نسخ الوثيقة.
- **احفظ نسختين**: واحدة بالألوان للوثائق الرقمية، وأخرى بالأبيض والأسود للوثائق التي ستُطبع وتُنسخ.

## ربط الختم بسير عمل المستندات

بعد تصميم ختمك مرة واحدة، احفظه كصورة PNG شفافة الخلفية في مجلد ثابت على جهازك. ثم في كل مرة تُصدر فيها [فاتورة](/invoice) أو [عرض سعر](/quotation) أو [إيصالاً](/receipt)، أدرج الختم في تذييل المستند قبل التصدير كـ PDF. مولّد Xuvilo يدعم رفع صورة الختم مباشرةً لتظهر في القالب النهائي. هذا يُوفّر دقائق على كل وثيقة وينتج مستندات موحّدة الشكل عبر السنة كلها.

للنسخة الإنجليزية الكاملة، راجع [Free Online Stamp Maker](/blog/stamp-maker-guide). جاهز لتصميم ختمك؟ افتح [صانع الأختام](/tools/stamp-maker).
    `.trim(),
  },

  {
    slug: "كيف-ترسل-فاتورة-احترافية-بالبريد-الإلكتروني",
    titleAr: "كيف ترسل فاتورة احترافية بالبريد الإلكتروني (مع قوالب جاهزة)",
    titleEn: "How to Send a Professional Invoice by Email (With Templates)",
    metaTitleAr: "إرسال فاتورة بالبريد الإلكتروني | Xuvilo",
    excerptAr:
      "دليل عملي لإرسال الفواتير بالبريد الإلكتروني: قوالب رسائل جاهزة، توقيت الإرسال، طرق المتابعة، ونصائح لتسريع الدفع.",
    excerptEn:
      "A practical guide to sending invoices by email — copy-paste templates, the right timing, follow-up tactics, and tips to get paid faster.",
    date: "2026-05-06",
    readTime: 8,
    category: "tips",
    keywordAr: "إرسال فاتورة بالبريد",
    keywordEn: "send invoice by email",
    relatedSlugs: ["how-to-send-invoice-email", "كيف-تتبع-المدفوعات-المتأخرة"],
    contentEn:
      "Looking for the English version? Read [the full English guide: How to Send a Professional Invoice by Email](/blog/how-to-send-invoice-email).",
    contentAr: `
## كيف ترسل فاتورة احترافية بالبريد الإلكتروني

الفاتورة نفسها نصف العمل فقط. الرسالة التي تغلّفها بها تقرّر سرعة الحصول على المال وكيف يتذكر العميل علامتك التجارية. رسالة فاتورة مصقولة وفي الوقت الصحيح تُدفع أسرع بأيام — وأحياناً أسابيع — من رسالة من سطر "مرفق". يشرح هذا الدليل التوقيت والبنية والصياغة الدقيقة التي تحصّل فواتير الشرق الأوسط في موعدها.

## متى ترسل الفاتورة؟

أكبر مؤشّر على السداد في الموعد هو إرسال الفاتورة في اليوم نفسه الذي يُسلَّم فيه العمل. كل يوم تأخير يدفع دورة دفع العميل بنفس القدر. إذا أنهيت مشروعاً يوم الثلاثاء وأرسلت الفاتورة يوم الجمعة، فقد نقلت دفعتهم من هذا الشهر إلى الشهر القادم.

قواعد توقيت عملية:

- **في نفس اليوم للتسليمات.** أرسل الفاتورة خلال ساعات من إنهاء العمل.
- **في أول الشهر للخدمات المتكررة.** الاحتفاظات والاشتراكات أفضل في يوم 1 ليُدرَجها العميل في دورة دفع شهرية واحدة.
- **عند مراحل المشروع للمشاركات الطويلة.** اربط الفواتير بالمراحل المتفق عليها في [عرض السعر](/quotation).
- **قبل موعد قطع الدفعات لدى العميل.** معظم الشركات الكبرى تُجري الدفعات مرتين شهرياً (15 ونهاية الشهر).

## تشريح رسالة فاتورة احترافية

رسالة فاتورة ممتازة تتكوّن من ستة عناصر بهذا الترتيب:

1. **عنوان رسالة واضح** يحوي رقم الفاتورة ومرجع PO العميل.
2. **افتتاحية مهذّبة محددة** تذكّر العميل بمن أنت ولماذا الفاتورة.
3. **المبلغ وتاريخ الاستحقاق** بلغة بسيطة في البداية.
4. **مرفق PDF** المُولَّد من [مولّد الفواتير المجاني](/invoice).
5. **رابط دفع مباشر أو تفاصيل بنكية** ليدفع دون مغادرة البريد.
6. **خاتمة ودودة** باسمك وشركتك وبيانات التواصل.

الرسالة الضعيفة تُجبر العميل على فتح PDF لإيجاد الأساسيات. القوية تخبره بكل شيء في نص الرسالة.

## قوالب عناوين رسائل تنجح

العناوين تُقرأ أولاً وتقرّر إن كانت الرسالة ستُفتح اليوم أم تُدفن في طابور الغد. استخدم صيغة منظَّمة: اسم الشركة، نوع المستند، الرقم، مرجع العميل، المبلغ، تاريخ الاستحقاق.

أمثلة:

- "Xuvilo فاتورة INV-2026-0142 — PO 88241 — 4,500 ريال مستحقة 25 مايو"
- "فاتورة INV-2026-0014 من [شركتك] — 1,200 درهم — صافٍ 30"
- "فاتورة احتفاظ شهرية INV-2026-0007 — 350 د.ك مستحقة 15 مايو"

ثلاثة مبادئ:

- ابدأ بما هي الرسالة، لا بالمجاملات.
- اذكر دائماً رقم الفاتورة ورقم PO أو المرجع.
- اذكر المبلغ والاستحقاق في العنوان.

## قوالب نص الرسالة

### القالب 1 — فاتورة تسليم قياسية

> **العنوان:** فاتورة INV-2026-0142 — PO 88241 — 4,500 ريال مستحقة 25 مايو
>
> مرحباً [الاسم الأول]،
>
> شكراً مجدداً على [المشروع/الطلب]. تجد مرفقاً الفاتورة **INV-2026-0142** بمبلغ **4,500 ريال**، مستحقة **25 مايو 2026** كما اتفقنا.
>
> الفاتورة تشير إلى أمر الشراء **88241**. تفاصيل التحويل البنكي ورابط دفع مباشر في PDF؛ نقبل K-Net، تحويل IBAN، Visa/Mastercard.
>
> أخبرني إن احتاج فريق حساباتك أي إعادة تنسيق — سعيد بإعادة الإصدار بمراجع إضافية مجاناً.
>
> تحياتي،
> [اسمك]
> [شركتك] · [الهاتف] · [البريد]

### القالب 2 — فاتورة احتفاظ شهرية

> **العنوان:** فاتورة احتفاظ شهرية INV-2026-0007 — 350 د.ك مستحقة 15 مايو
>
> مرحباً [الاسم الأول]،
>
> أرسل فاتورة الاحتفاظ لهذا الشهر — **INV-2026-0007** بمبلغ **350 د.ك**، تغطّي [الفترة]. مستحقة **15 مايو 2026**.
>
> نفس البيانات البنكية كآخر شهور؛ رابط الدفع في PDF.
>
> ملخص قصير لما سُلّم هذا الشهر في الصفحة الثانية من الفاتورة.
>
> تحياتي،
> [اسمك]

### القالب 3 — متابعة مهذّبة في أول يوم تأخّر

> **العنوان:** ملاحظة سريعة — الفاتورة INV-2026-0142 (4,500 ريال)
>
> مرحباً [الاسم الأول]،
>
> ملاحظة سريعة بأن الفاتورة **INV-2026-0142** كانت مستحقة أمس (25 مايو) ولم أرَ السداد بعد. هلّا تتأكّد إن صُرف لديكم، أو إن احتاج فريقك أي شيء إضافي مني؟
>
> الفاتورة الأصلية مرفقة للراحة.
>
> تحياتي،
> [اسمك]

### القالب 4 — متابعة ثانية حازمة (يوم 7 من التأخّر)

> **العنوان:** تذكير ثانٍ — الفاتورة INV-2026-0142 (4,500 ريال)، 7 أيام تأخر
>
> مرحباً [الاسم الأول]،
>
> أتابع بشأن الفاتورة **INV-2026-0142**، وقد مرّ 7 أيام على تاريخ استحقاقها 25 مايو. هلّا تؤكّد تاريخ الإفراج عن الدفعة، وما إن كان هناك أي شيء معلّق من جهتي يمكنني حلّه؟
>
> البيانات البنكية والفاتورة الأصلية مرفقة.
>
> تحياتي،
> [اسمك]

## نظافة بريد عملية

- **أرسل نسخة (CC) إلى صندوق حسابات شركتك** لتحفظ سجلاً.
- **استخدم اسم مرسل واضح.** "أحمد من [الشركة]" أفضل من "[الشركة] noreply".
- **أرفق PDF لا رابط سحابة.** كثير من الشركات الكبرى تحجب المشاركة الخارجية.
- **ضمّن العربية والإنجليزية في نص البريد** للمشترين العرب؛ كرّر الصيغة الثنائية للفاتورة نفسها.
- **أرسل في ساعات العمل بتوقيت المشتري.** بريد صباح الأحد بتوقيت الرياض يُقرأ؛ ليلة الجمعة بتوقيت جدة يُدفن.

## استخدم الأدوات المدمجة

[مولّد فواتير Xuvilo المجاني](/invoice) يصدر PDF، يضمّن ختمك، ويوفّر تنزيلاً جاهزاً. [كاتب الذكاء الاصطناعي](/ai-writer) يصيغ ويترجم الرسالة بالعربية أو الإنجليزية. الـ[320 قالباً](/templates) تجعل PDF نفسه يبدو احترافياً. وعند وصول الدفع، أصدر [إيصالاً](/receipt) في اليوم نفسه لإغلاق الدائرة.

## الأسئلة الشائعة

### هل أرسل الفاتورة كـPDF أم نص؟
PDF دائماً. يحفظ التخطيط ويضمّن العلامة التجارية.

### هل أضع CC على الفاتورة؟
ضع CC على صندوق حساباتك. إن أعطاك العميل اسم جهة اتصال محاسبية، أضفها أيضاً.

### ماذا لو لم يردّ العميل؟
تذكير مهذّب يوماً بعد الاستحقاق، أحزم بعد 7 أيام، اتصال بعد 14.

### هل يمكنني إرسال الفواتير بالعربية؟
نعم — [مولّد الفواتير](/invoice) يعرض العربية يميناً والإنجليزية بجانبها.

### كيف أتابع دون أن أبدو قاسياً؟
ابقَ محايداً ومختصراً. اذكر الرقم والمبلغ والتاريخ واسأل سؤالاً محدداً.

## أخطاء بريدية شائعة تُؤخّر السداد

أكثر الأخطاء التي يرتكبها المستقلون وأصحاب الشركات الصغيرة عند إرسال الفواتير بالبريد الإلكتروني، وكلها يمكن تفاديها في ثوانٍ:

- **عنوان رسالة غامض**: "فاتورة" وحدها لا تكفي. اكتب: "فاتورة INV-2026-0042 — مشروع الموقع — مستحقّة 15 يونيو". هذا يُسرّع الفرز في صندوق وارد المحاسب.
- **إرسال إلى البريد الخطأ**: قبل الإرسال، تحقّق من أن العنوان هو بريد قسم الحسابات (ap@ أو accounts@) وليس البريد الشخصي للعميل. الأخير يعني تأخير لا يقلّ عن أسبوع.
- **مرفق بصيغة Word أو Excel**: أرسل الفاتورة دائماً كـ PDF. صيغ Word قابلة للتعديل وكثير من أقسام الحسابات ترفضها مبدئياً.
- **اسم ملف غير منظّم**: لا تُرسل ملفاً اسمه \`Document1.pdf\`. الاسم المهني: \`INV-2026-0042-Acme-Co.pdf\`.
- **نسي إضافة بيانات السداد**: في نص الرسالة، كرّر بيانات الحساب البنكي / IBAN حتى لا يضطرّ العميل لفتح الـ PDF.

## قالب رسالة جاهز يمكنك نسخه الآن

> الموضوع: فاتورة INV-[رقم] — [اسم المشروع] — مستحقّة [تاريخ]
>
> السلام عليكم [اسم جهة الاتصال]،
>
> أرفق لكم فاتورة [رقم] بقيمة إجمالية [المبلغ] [العملة] عن [وصف العمل المنجز]. تاريخ الاستحقاق: [تاريخ].
>
> بيانات السداد بالحوالة المصرفية:
> - اسم المستفيد: [اسم الشركة]
> - البنك: [اسم البنك]
> - IBAN: [الرقم الكامل]
> - SWIFT: [الكود]
>
> يُرجى التأكيد عند استلام الفاتورة، ولا تتردّدوا في التواصل لأي استفسار.
>
> مع التقدير،
> [الاسم] — [المسمّى]
> [بيانات الاتصال]

## متابعة منهجية للمتأخرات

إن مرّ تاريخ الاستحقاق دون سداد، أرسل تذكيراً مهذّباً بعد 3 أيام، ثم تذكيراً أكثر حزماً بعد 10 أيام، ثم اتصالاً هاتفياً بعد أسبوعين. حافظ على نبرة احترافية في كل المراسلات — الانفعال يُغلق الأبواب. استخدم [أداة الكاتب الذكي](/ai-writer) لتوليد رسائل المتابعة بسرعة بنبرة احترافية ومتّسقة.

للنسخة الإنجليزية، راجع [How to Send a Professional Invoice by Email](/blog/how-to-send-invoice-email).
    `.trim(),
  },

  {
    slug: "دليل-الفوترة-الكامل-للشركات-الصغيرة-MENA",
    titleAr: "دليل الفوترة الكامل للشركات الصغيرة في الشرق الأوسط",
    titleEn: "Complete Invoicing Guide for Small Businesses in MENA",
    metaTitleAr: "دليل فوترة الشركات الصغيرة | Xuvilo",
    excerptAr:
      "دليل شامل للفوترة لأصحاب الأعمال الصغيرة في الشرق الأوسط: ترقيم الفواتير، الضرائب، شروط الدفع، والمتابعة بأدوات مجانية.",
    excerptEn:
      "A complete invoicing guide for small businesses in MENA — numbering, currency, VAT, payment terms, follow-ups, and free tools.",
    date: "2026-05-06",
    readTime: 9,
    category: "invoices",
    keywordAr: "فوترة الشركات الصغيرة",
    keywordEn: "small business invoicing",
    relatedSlugs: ["small-business-invoicing-guide", "برنامج-فواتير-للشركات-الصغيرة"],
    contentEn:
      "Looking for the English version? Read [the full English guide: Complete Invoicing Guide for Small Businesses in MENA](/blog/small-business-invoicing-guide).",
    contentAr: `
## دليل الفوترة الكامل للشركات الصغيرة في الشرق الأوسط

الفوترة هي أكبر مصدر منفرد لآلام التدفق النقدي القابلة للوقاية في الشركات الصغيرة بالشرق الأوسط. التأخر في السداد، رفض الفواتير، والنزاعات تعود دائماً تقريباً إلى عادات فوترة ضعيفة — لا إلى عملاء سيّئين. هذا الدليل دفترك الشامل: كيفية بناء الفواتير، وما الذي تفرضه، ومتى ترسلها، وكيف تتابعها. كل ما فيه يمكن إنجازه مجاناً عبر [مولّد فواتير Xuvilo](/invoice) و[مركز الحاسبات](/calculators).

## الخطوة 1 — ضع أساسات الفوترة

قبل إصدار أول فاتورة، ثبّت خمسة أساسات:

1. **صيغة فاتورة موحدة.** اختر [قالباً واحداً](/templates) والتزم به. تغيير التصميم كل ربع سنة يدلّ على الفوضى.
2. **مخطط ترقيم نظيف.** متسلسل، مسبوق بالسنة، بلا فجوات: INV-2026-0001، INV-2026-0002. المدققون يلاحظون الفجوات.
3. **سياسة شروط دفع موحّدة.** صافٍ 14 للعملاء الجدد، صافٍ 30 للموثوقين، صافٍ 60 للمؤسسات عند الضرورة.
4. **مجموعة طرق دفع موحّدة.** تحويل بنكي (IBAN)، K-Net، بطاقة، محفظة. أضف رابط دفع أو QR على كل فاتورة.
5. **ملف شركة محفوظ.** الشعار، الختم، التوقيع، البيانات القانونية الكاملة محفوظة في [ملف الأعمال](/invoice).

هذه الخمسة تستغرق ساعة. توفّر عشرات الساعات في السنة.

## الخطوة 2 — ابنِ الفاتورة نفسها

كل فاتورة في المنطقة يجب أن تحوي الحقول التالية. سواء عملت في الإمارات أو السعودية أو مصر أو الكويت أو الأردن أو ليبيا، البنية متطابقة؛ فقط خط الضريبة والعملة يختلفان.

### الترويسة
- كلمة "فاتورة" أو "فاتورة ضريبية" واضحة في الأعلى
- رقم فريد متسلسل
- تاريخ الإصدار وتاريخ الاستحقاق

### بيانات البائع
- الاسم القانوني الكامل أو الاسم التجاري
- رقم السجل التجاري والرقم الضريبي
- العنوان وبيانات الاتصال

### بيانات المشتري
- الاسم الكامل أو الشركة
- الرقم الضريبي للمشتري (ضروري B2B)
- عنوان الفوترة

### البنود
- وصف واضح لكل سلعة أو خدمة
- الكمية، سعر الوحدة، إجمالي البند
- المجموع الفرعي، الضريبة (15% السعودية، 5% الإمارات، 14% مصر، لا شيء حالياً في الكويت)، والإجمالي

### التذييل
- شروط الدفع وطرقه
- بيانات الحساب البنكي
- الملاحظات وأي رقم مرجع (PO، عقد، رمز مشروع)
- الختم والتوقيع

## الخطوة 3 — اختر العملة والضريبة الصحيحتين

إذا بعت محلياً، اعتمد عملتك المحلية: SAR، AED، EGP، KWD، JOD، LYD، OMR، BHD، QAR. [مولّد الفواتير](/invoice) يدعم كل عملة في المنطقة بالخانات العشرية الصحيحة (ثلاث للدينار الكويتي، اثنتان لمعظم الباقي).

للفواتير العابرة للحدود، اتفق على العملة في [عرض السعر](/quotation) قبل بدء العمل. إن فوترت بعملة أجنبية، اعرض أيضاً المعادل بالعملة المحلية ليطابق البنك الدفعة الواردة.

للضريبة، اضبطها على الفاتورة حسب دولة الوجهة لا دولتك. شركة سعودية تبيع لعميل إماراتي تفرض 5% إماراتية (مع التسجيل الصحيح)؛ شركة إماراتية تبيع لعميل سعودي تفرض 15% سعودية بموجب إطار الخليج.

[حاسبة ضريبة القيمة المضافة](/calculators/vat-calculator) تتعامل مع كل النسب الإقليمية.

## الخطوة 4 — حدّد شروط دفع ذكية

شروط الدفع تحدّد رأس المال العامل الذي تحتاجه. إحكامها يحسّن تدفقك؛ تخفيفها يعني أنك تموّل عميلك مجاناً.

افتراضات منطقية:

- **صافٍ 14 للعملاء الجدد.** أسبوعان كافيان لعميل صادق.
- **صافٍ 30 للعملاء المتكررين الموثوقين.** المعيار في المنطقة.
- **50% مقدم، 50% عند التسليم لمشاريع.** قياسي للتصميم والتسويق وتقنية المعلومات.
- **حسب المراحل لمشاريع فوق 10,000 دولار.** اربط كل مرحلة بمسلَّم وفاتورة.

اذكر دائماً تاريخ استحقاق واضح — "صافٍ 30" وحدها غامضة. اكتب "مستحق بحلول 25 مايو 2026".

## الخطوة 5 — أرسل الفاتورة بالطريقة الصحيحة

أرسل بالبريد، مع PDF مرفق، يوم تسليم العمل. عنوان الرسالة يجب أن يحوي الرقم وPO العميل والمبلغ وتاريخ الاستحقاق. للتفاصيل، راجع [دليل إرسال الفاتورة بالبريد](/blog/كيف-ترسل-فاتورة-احترافية-بالبريد-الإلكتروني).

## الخطوة 6 — تابع بمنهجية

نمط بسيط يحصّل معظم الفواتير المتأخرة دون إلحاق ضرر بالعلاقة:

- **اليوم 0:** أرسل الفاتورة.
- **اليوم 7:** تذكير مهذّب إن كانت الفاتورة كبيرة أو العميل جديد.
- **اليوم 1 بعد الاستحقاق:** فحص "هل صُرفت لديكم؟"
- **اليوم 7 بعد الاستحقاق:** متابعة ثانية أحزم، مع CC لصندوق حسابات المشتري.
- **اليوم 14:** اتصال هاتفي.
- **اليوم 30:** خطاب مطالبة رسمي.

تتبّع كل شيء في جدول أو CRM. التوثيق يربح النزاعات.

## الخطوة 7 — أصدر إيصالات عند الدفع

في اللحظة التي يصل فيها الدفع، أصدر [إيصالاً](/receipt) وأرسله. هذه أسرع طريقة لبناء الثقة مع العملاء الجدد.

## الخطوة 8 — احتفظ بكل شيء خمس سنوات

معظم السلطات الضريبية في المنطقة تشترط حفظ السجلات التجارية لخمس سنوات (ست في السعودية بموجب لائحة ضريبة القيمة المضافة، أطول في بعض السياقات المصرية).

## أخطاء شائعة وكيف تتجنّبها

- **إعادة تشغيل الأرقام كل شهر.** استخدم تسلسلاً واحداً متصلاً سنوياً.
- **تعديل فواتير صادرة.** إن كان الرقم خاطئاً، أصدر إشعار خصم وفاتورة جديدة.
- **تخطّي الرقم الضريبي للمشتري.** فواتير B2B بدونه تُرفض من أنظمة المشتريات.
- **التسعير بعملة خاطئة.** طابق عملة الفاتورة مع عرض السعر.
- **نسيان بند الغرامة المتأخرة.** أضف "1.5% شهرياً بعد الاستحقاق" — معظم العملاء لن يدفعها لكن البعض سيفعل.

## مجموعة Xuvilo لفوترة الشركات الصغيرة

كل ما في هذا الدليل مجاني مع Xuvilo:

- [مولّد فواتير مجاني](/invoice)
- [مولّد عروض أسعار](/quotation)
- [مولّد إيصالات](/receipt)
- [320 قالباً مجانياً](/templates)
- [14 حاسبة مجانية](/calculators) بما فيها [ضريبة القيمة المضافة](/calculators/vat-calculator) و[هامش الربح](/calculators/profit-margin-calculator)
- [صانع الأختام](/tools/stamp-maker)
- [كاتب الذكاء الاصطناعي](/ai-writer)

## الأسئلة الشائعة

### كم مرة أصدر الفواتير؟
في يوم تسليم العمل. للاحتفاظات، يوم 1 من كل شهر.

### ما أكثر مخططات الترقيم أماناً؟
متسلسل مسبوق بالسنة: INV-2026-0001.

### هل أحتاج إلى فرض ضريبة قيمة مضافة؟
يعتمد. السعودية: 15%. الإمارات: 5%. مصر: 14%. الكويت: لا. البحرين: 10%. عمان: 5%. قطر: لا.

### ما شروط الدفع التي أعرضها؟
صافٍ 14 للجدد، صافٍ 30 للموثوقين.

### كيف أُدفَع أسرع؟
أرسل في نفس اليوم، تابع بعد يوم من الاستحقاق، اقبل طرق دفع متعددة، اذكر تاريخ استحقاق واضحاً.

## ربط الفوترة بالضريبة والامتثال

ضريبة القيمة المضافة في دول الخليج (15% في السعودية، 5% في الإمارات والبحرين وعُمان، 14% في مصر) ليست مجرد سطر إضافي في الفاتورة — إنها التزام شهري أو ربعي بإيداع إقرار وسداد المبلغ المحصّل. كل فاتورة تُصدرها يجب أن تظهر بوضوح: الرقم الضريبي للبائع، الرقم الضريبي للمشتري (للعملاء المسجّلين)، المبلغ قبل الضريبة، نسبة الضريبة، مبلغ الضريبة، والإجمالي بعد الضريبة. أي فاتورة تنقصها هذه الحقول لا تُحتسب كفاتورة ضريبية صحيحة، وقد يرفض المشتري المسجّل خصم الضريبة منها — وهو سبب مباشر لطلبه إعادة إصدار الفاتورة.

## أتمتة سير عمل الفوترة دون شراء برنامج محاسبي

للشركات الصغيرة التي لم تجهز لاعتماد برنامج محاسبي كامل بعد، يمكن بناء سير عمل بسيط مجاناً:

1. **مولّد الفواتير**: استخدم [Xuvilo](/invoice) لإصدار وتصدير الفواتير كـ PDF.
2. **تتبّع في جدول بيانات**: ملف Excel أو Google Sheets بأعمدة (الرقم، التاريخ، العميل، المبلغ، الضريبة، تاريخ الاستحقاق، تاريخ السداد، الحالة).
3. **مجلد منظّم**: مجلد للفواتير الصادرة بحسب السنة والشهر، مع نسخ احتياطية في التخزين السحابي.
4. **متابعة أسبوعية**: كل اثنين، راجع الفواتير المتأخّرة وأرسل تذكيرات.
5. **مراجعة شهرية**: في آخر يوم من الشهر، احتسب إجمالي الفواتير الصادرة، الفواتير المحصّلة، الفواتير المتأخرة، والضريبة المستحقّة للسلطات.

## دروس من شركات نجحت في تقصير دورة التحصيل

الشركات الصغيرة التي تخفّض متوسط فترة التحصيل من 60 يوماً إلى 30 يوماً تُضاعف فعلياً سيولتها التشغيلية دون زيادة المبيعات. الوصفة المشتركة: شروط دفع واضحة في العقد قبل البدء، فاتورة تُرسل في يوم التسليم لا نهاية الشهر، تذكير آلي قبل الاستحقاق بـ 5 أيام، خصم 2% للسداد المبكر خلال 10 أيام، وغرامة تأخير صريحة بعد 30 يوماً. هذه التغييرات لا تكلف شيئاً — لكنها تتطلّب الانضباط في تطبيقها على كل فاتورة دون استثناء.

للنسخة الإنجليزية، راجع [Complete Invoicing Guide for MENA](/blog/small-business-invoicing-guide).
    `.trim(),
  },

  {
    slug: "ما-هي-مذكرة-التسليم-دليل-الشركات",
    titleAr: "ما هي مذكرة التسليم؟ دليل لشركات الشرق الأوسط",
    titleEn: "What Is a Delivery Note? Guide for MENA Businesses",
    metaTitleAr: "ما هي مذكرة التسليم؟ | Xuvilo",
    excerptAr:
      "دليل شامل لمذكرة التسليم: التعريف، الفرق عن الفاتورة، الحقول الإلزامية، وأفضل الممارسات للشركات في الشرق الأوسط.",
    excerptEn:
      "A complete guide to delivery notes for MENA SMEs — what they are, how they differ from invoices, mandatory fields, and best practices.",
    date: "2026-05-06",
    readTime: 7,
    category: "business",
    keywordAr: "مذكرة تسليم",
    keywordEn: "delivery note",
    relatedSlugs: ["delivery-note-guide", "ما-هو-أمر-الشراء-دليل-شامل"],
    contentEn:
      "Looking for the English version? Read [the full English guide: What Is a Delivery Note?](/blog/delivery-note-guide).",
    contentAr: `
## ما هي مذكرة التسليم؟

مذكرة التسليم مستند يرافق البضاعة من البائع إلى المشتري ويُثبت ما سُلِّم فعلياً، ومتى، ولمن. إنها بطل الأوراق المنسي في لوجستيات الشرق الأوسط: المستند الذي يقرّر من يدفع ثمن الكرتون المفقود، ومن يتحمّل مسؤولية التلف أثناء النقل، وأي فاتورة تُدفع كاملة وأيها تُخفض.

لأي شركة تشحن سلعاً مادية — تجار الجملة، الموزّعون، التجار الإلكترونيون، المقاولون، شركات التجارة عبر السعودية والإمارات ومصر والكويت والأردن وليبيا وما بعدها — مذكرة تسليم نظيفة غير قابلة للتفاوض.

## مذكرة التسليم مقابل الفاتورة — الفرق الجوهري

المستندان يصدران من البائع نفسه، غالباً في اليوم نفسه، ويبدوان متشابهين. لكن دورهما القانوني والتجاري مختلف جداً:

- **مذكرة التسليم** تُثبت **التسليم المادي**. تقول "هذه السلع المحددة، بهذه الكميات، سُلّمت إلى هذا العنوان في هذا التاريخ ووقّع عليها هذا الشخص." لا تطلب دفعاً.
- **الفاتورة** هي **طلب الدفع**. تعيد البنود نفسها، تضيف الأسعار والضريبة، وهي المستند الذي يدفع المشتري مقابله.

في تدفق توزيع نموذجي في المنطقة: المشتري يصدر [أمر شراء](/blog/ما-هو-أمر-الشراء-دليل-شامل)، البائع يجمع البضاعة ويشحنها، السائق يسلّم البضاعة مع مذكرة تسليم يوقّعها مستلم المستودع، والبائع يرسل الفاتورة في اليوم نفسه أو الصباح التالي. مذكرة التسليم الموقعة هي حماية البائع الأساسية إذا أنكر المشتري الكميات لاحقاً.

## الحقول الإلزامية في مذكرة التسليم

مذكرة تسليم كاملة تحوي الحقول التالية. غياب البيانات هو السبب الأكثر شيوعاً لرفض المشترين للتسليم — أو الدفع فقط مقابل ما هو موثَّق.

### الترويسة
- كلمتا "مذكرة تسليم" واضحتان في الأعلى
- رقم مذكرة تسليم فريد متسلسل
- رقم أمر الشراء المطابق و(إن عُرف) رقم الفاتورة القادمة
- تاريخ الإرسال وتاريخ التسليم المتوقع

### بيانات البائع
- الاسم الكامل والعنوان
- رقم السجل التجاري
- جهة اتصال فريق الإرسال

### بيانات المشتري/المرسَل إليه
- الاسم وعنوان الفوترة
- **عنوان التسليم** إن اختلف عن الفوترة (هذا هو المهم)
- اسم وهاتف جهة الاتصال في الموقع

### البنود
- وصف واضح لكل صنف
- الكمية، وحدة القياس، أي أرقام دفعة أو تسلسلية
- (اختياري) الوزن للوحدة والإجمالي لنزاعات الشحن

### قسم التسليم
- اسم السائق وتوقيعه
- اسم المستلم وتوقيعه وتاريخه
- خانة "مستلم بحالة جيدة" (أو الاستثناءات)
- ملاحظات الحالة (كرتون تالف، ختم مفقود، تسليم جزئي)

قسم التسليم هو الجزء الأكثر قيمة. بدون توقيع المستلم، تكون مذكرة التسليم نصف دليل في أحسن الأحوال.

## لماذا تهم مذكرات التسليم في لوجستيات المنطقة؟

- **إثبات التسليم.** عندما يدّعي المشتري أنه استلم 8 صناديق فقط من 10، تحسم المذكرة الموقعة الأمر لصالح البائع.
- **توزيع التلف.** إن وصلت البضاعة تالفة ووقّع المستلم دون ملاحظة، تقع التكلفة عادةً على المشتري.
- **الجمارك العابرة للحدود.** كثير من المنافذ الخليجية تطلب مذكرة تسليم (أو شقيقتها مذكرة الشحن) إلى جانب الفاتورة وقائمة التعبئة.
- **إدارة مخزون ممتثلة.** المدققون والسلطات الضريبية يقارنون مذكرات التسليم بالفواتير لتأكيد تطابق الإيرادات مع حركة البضاعة.
- **نزاعات فواتير أنظف.** عندما تتطابق الفاتورة مع مذكرة التسليم الموقعة، الدفع سريع.

## متى يجب إصدار مذكرة تسليم؟

أصدر مذكرة لأي حركة سلع مادية، حتى الصغيرة. التكلفة شبه صفر (استخدم [مولّد الفواتير](/invoice) وغيّر نوع المستند). تحديداً:

- كل شحنات B2B
- كل الحركات العابرة للحدود
- التسليمات لمواقع البناء والمستودعات وقاعات الفعاليات
- التسليمات المدفوعة لاحقاً
- التسليمات عالية القيمة أو ذات الأرقام التسلسلية (إلكترونيات، معدّات)

في الشحنات النقدية للتجارة الإلكترونية، سجل تتبع الناقل قد يحلّ محلها؛ ومع ذلك، مذكرة داخلية ممارسة جيدة.

## خطوة بخطوة: إصدار مذكرة تسليم عبر Xuvilo

[مولّد فواتير Xuvilo المجاني](/invoice) يتعامل مع مذكرات التسليم بإعادة استخدام نفس القالب وتغيير عنوان المستند:

1. افتح [المولّد](/invoice) واختر [قالباً](/templates).
2. غيّر عنوان المستند من "فاتورة" إلى "مذكرة تسليم".
3. املأ بيانات البائع والمشتري، بما فيها عنوان التسليم إن اختلف.
4. أضف البنود — الوصف، الكمية، الوحدة، أرقام الدفعة أو التسلسل.
5. اترك الأسعار فارغة (مذكرات التسليم لا تحتاج أسعاراً) أو اعرضها بعمود خفيف لموظفي المستودع.
6. أضف رقم PO المطابق في حقل المرجع.
7. أضف قسم تسليم في الملاحظات: السائق، المستلم، التوقيع، خانة "مستلم بحالة جيدة".
8. صدّر PDF، اطبع نسختين، وأرسلهما مع السائق.

## أفضل الممارسات

- **رقّمها تسلسلياً.** نفس منطق التدقيق للفواتير.
- **اربط كل مذكرة تسليم بأمر شراء.**
- **التسلسل: PO → DN → INV.** ثلاثية الذهب لأي عميل مؤسسي.
- **اطبع نسختين دائماً.** المستلم يحتفظ بواحدة؛ السائق يعيد الموقعة.
- **صوّر النسخة الموقعة.** صورة سريعة بالجوال هي تأمينك.
- **اذكر الاستثناءات في الموقع.** إن نقص كرتون، اكتبها على المذكرة.
- **احتفظ بمذكرات التسليم خمس سنوات على الأقل.**

## ما بعد مذكرة التسليم

مذكرة التسليم جزء من تدفق رباعي. أكمل مع:

- [عرض السعر](/quotation)
- [أمر الشراء](/blog/ما-هو-أمر-الشراء-دليل-شامل)
- [الفاتورة](/invoice)
- [الإيصال](/receipt)

كلها تُولَّد من نفس [مكتبة قوالب Xuvilo](/templates).

## الأسئلة الشائعة

### هل مذكرة التسليم مطلوبة قانوناً؟
ليست مشترطة عموماً، لكنها أساسية تجارياً.

### هل تظهر المذكرة الأسعار؟
عادةً لا. المذكرة عن حركة البضاعة لا قيمتها.

### هل يمكن استخدام المذكرة كفاتورة؟
لا. مستندان مختلفان لغرضين مختلفين.

### ماذا لو رفض المستلم التوقيع؟
سجّل الرفض، صوّر البضاعة، وأعد المذكرة غير الموقعة.

### هل أحتاج إلى مذكرة للتسليمات الرقمية؟
لا — البريد أو الرفع نفسه دليل التسليم.

## مذكرة التسليم في النزاعات: أمثلة من الواقع

في معظم نزاعات التسليم بين الموردين والعملاء في منطقة الشرق الأوسط، تكون مذكرة التسليم الموقّعة هي الدليل الحاسم. أمثلة شائعة:

- **بضاعة مفقودة**: إذا وقّع المستلم على مذكرة تسليم تذكر "10 صناديق" واكتشف لاحقاً 9 فقط، فالمسؤولية تنتقل إلى المستلم لأنه قبل العدد كتابياً. الحل المهني: لا توقّع قبل العدّ الفعلي.
- **بضاعة تالفة**: إذا وصلت السلعة بأضرار ظاهرة (كرتون مكسور، تسرّب)، يجب ذكر ذلك على مذكرة التسليم قبل التوقيع، أو تسجيل عبارة "بانتظار الفحص" بشكل واضح.
- **اختلاف المواصفات**: إن اكتُشف لاحقاً أن المنتج المسلّم لا يطابق المواصفات في أمر الشراء، تُساعد مذكرة التسليم في إثبات تاريخ الاستلام وبداية فترة الإشعار بالعيب.
- **تأخّر التحصيل**: قسم الحسابات لدى العميل قد يطلب نسخة من مذكرة التسليم الموقّعة قبل اعتماد الفاتورة للسداد. غيابها يعني تأخير لا يقلّ عن أسبوعين.

## نصائح لإدارة مذكرات التسليم بشكل منهجي

- **الترقيم المتسلسل**: DN-2026-0001، DN-2026-0002، إلخ. اربط كل مذكرة برقم أمر الشراء ورقم الفاتورة المستقبلية.
- **ثلاث نسخ على الأقل**: نسخة للسائق، نسخة للمستلم، نسخة للملف الداخلي. النسخ الإلكترونية لا تكفي في النزاعات القانونية.
- **التوقيع مع الختم**: التوقيع وحده قد يُنكَر لاحقاً. أضف ختم الشركة المستلمة لإثبات أن المستلم يعمل لصالحها بصلاحية كافية.
- **الصور المرفقة**: في الشحنات الكبيرة، التقط صوراً للبضاعة عند التحميل وعند التسليم وأرفقها بمذكرة التسليم بكود QR أو رابط مرفق.

## ربطها بدورة الفوترة الكاملة

الترتيب المعتاد: [أمر شراء](/blog/ما-هو-أمر-الشراء-دليل-شامل) ← مذكرة تسليم موقّعة ← [فاتورة](/invoice) تُشير إلى الرقمين السابقين. أصدر مذكرة التسليم في نفس يوم الشحن، والفاتورة في اليوم التالي للتسليم. هذا التسلسل النظيف يُسرّع التحصيل ويُغلق ثغرات النزاعات.

للنسخة الإنجليزية، راجع [What Is a Delivery Note?](/blog/delivery-note-guide).
    `.trim(),
  },

  {
    slug: "كيف-تكتب-تقرير-مصاريف-نموذج-مجاني",
    titleAr: "كيف تكتب تقرير مصاريف احترافي (مع نموذج مجاني)",
    titleEn: "How to Write an Expense Report (Free Template)",
    metaTitleAr: "كيف تكتب تقرير مصاريف | Xuvilo",
    excerptAr:
      "دليل عملي لكتابة تقرير مصاريف احترافي للسفر والمشاريع: حقول إلزامية، فئات مصروفات، وأفضل الممارسات للموافقة السريعة.",
    excerptEn:
      "A practical guide to writing a clear, audit-ready expense report — what fields to include, how to categorise costs, attach receipts, get approval fast.",
    date: "2026-05-06",
    readTime: 7,
    category: "business",
    keywordAr: "تقرير مصاريف",
    keywordEn: "expense report",
    relatedSlugs: ["expense-report-guide"],
    contentEn:
      "Looking for the English version? Read [the full English guide: How to Write an Expense Report](/blog/expense-report-guide).",
    contentAr: `
## كيف تكتب تقرير مصاريف

تقرير المصاريف مستند يسرد التكاليف المتعلقة بالعمل المدفوعة من الجيب (أو من بطاقة الشركة)، مصنّفة، مدعومة بإيصالات، ومُقدَّمة لاستردادها أو لمحاسبتها. للمستقلين والمقاولين وفرق الشركات الصغيرة في الشرق الأوسط، تقرير مصاريف نظيف هو الفرق بين استرداد المال هذا الأسبوع وملاحقة الحسابات لشهر.

يستعرض هذا الدليل ما يجب أن يحتويه تقرير المصاريف، وكيفية تنظيم الإيصالات، والعادات الصغيرة التي تحوّل تقريراً مرفوضاً إلى موافقة في اليوم نفسه.

## لماذا تهم تقارير المصاريف؟

ثلاثة جمهور يقرؤون تقريرك، وكل منهم يهتم بشيء مختلف:

- **مديرك أو عميلك** يريد الإجمالي وتبريراً سريعاً لكل بند.
- **حسابات الدفع** تريد بنية نظيفة لترحيلها إلى رمز الدفتر الصحيح.
- **المدقق أو السلطة الضريبية** يريد إيصالات مطابقة تصمد لخمس سنوات.

تقرير مصاريف ممتاز يخدم الثلاثة في آنٍ واحد: ملخص سطري في الأعلى، جدول بنود نظيف في الوسط، وإيصالات داعمة مرفقة في النهاية.

## الحقول الإلزامية في تقرير المصاريف

تقرير مصاريف كامل يحوي الحقول التالية. غياب البيانات هو السبب الأكبر لإعادة التقارير.

### الترويسة
- عنوان "تقرير مصاريف" واضح في الأعلى
- رقم تقرير فريد متسلسل
- فترة التقرير (تاريخ بداية وتاريخ نهاية)
- اسم مقدّم التقرير ودوره وبيانات اتصاله
- اسم الجهة المعتمدة/المشروع/مركز التكلفة
- العملة والإجمالي المُطالَب به

### البنود (صف لكل مصروف)
- تاريخ المصروف
- اسم البائع أو المورّد
- الفئة (سفر، إقامة، وجبات، مواصلات، مستلزمات، برامج، متفرقات)
- وصف موجز ومبرّر تجاري
- المبلغ بالعملة الأصلية، سعر الصرف (إن أجنبي)، والمبلغ بعملة التقرير
- ضريبة القيمة المضافة المضمَّنة (إن وُجدت)، وما إن كان الإيصال يتأهّل كفاتورة ضريبية
- رقم مرجع الإيصال (مطابق للإيصالات المرفقة)

### التذييل
- مجاميع لكل فئة
- الإجمالي
- توقيع المقدِّم وتاريخه
- سطر توقيع المعتمِد

### المرفقات
- صور أو PDF لكل إيصال، مسمّاة ومرقّمة لتطابق البنود

## فئات المصاريف الشائعة في الشركات بالمنطقة

توحيد الفئات يجعل التقارير أسرع كتابةً وأسهل اعتماداً وأنظف تدقيقاً. أكثر الفئات شيوعاً:

- **السفر.** رحلات الطيران، التاكسي، تطبيقات النقل (كريم، أوبر)، النقل من المطار، الوقود لزيارات العملاء.
- **الإقامة.** الفنادق، الشقق المخدومة، التأجير قصير الأمد في رحلات العمل.
- **الوجبات.** وجبات العملاء، وجبات الفريق، البدلات اليومية.
- **الاتصالات.** شرائح بيانات الجوال، التجوال الدولي، نقاط واي فاي أثناء السفر.
- **المكتب والمستلزمات.** القرطاسية، الطباعة، الأثاث المكتبي.
- **البرامج والاشتراكات.** أدوات SaaS، تخزين سحابي، أدوات التصميم.
- **الأتعاب المهنية.** الترجمة، التصميم، الدعم المستقل المرتبط مباشرة بالمشروع.
- **خاص بالمشروع/العميل.** التكاليف التي تُمرَّر للعميل وتُعاد فوترتها.
- **متفرقات.** أي شيء لا يندرج أعلاه؛ بيّنه بوضوح.

إن نشر العميل أو صاحب العمل قائمة فئات، اتبعها حرفياً.

## خطوة بخطوة: بناء تقرير المصاريف

1. **اجمع الإيصالات أثناء العمل.** صوّر كل إيصال فور استلامه.
2. **افتح قالباً نظيفاً.** استخدم أحد [320 قالباً مجانياً](/templates) وغيّر عنوان المستند إلى "تقرير مصاريف".
3. **املأ الترويسة.** الفترة، المقدّم، المشروع، العملة.
4. **أدخل البنود بترتيب التاريخ.** صف لكل مصروف.
5. **حوّل المصاريف بالعملة الأجنبية.** استخدم [محوّل العملات](/calculators/currency-converter) وثبّت السعر في تاريخ المصروف.
6. **اجمع لكل فئة وللإجمالي.** استخدم [حاسبة النسبة المئوية](/calculators/percentage-calculator) لتقسيمات الضريبة.
7. **رقّم الإيصالات لتطابق.** إيصال 01، 02، 03 بترتيب البنود.
8. **أرفق الإيصالات كـPDF واحد.**
9. **اكتب ملاحظة غلاف من سطر.** "تقرير مصاريف لزيارة عميل القاهرة، 12-15 مايو 2026، إجمالي 1,840 دولار عبر 14 بنداً."
10. **وقّع، وأرّخ، وقدّم.**

## أفضل الممارسات للموافقة السريعة

- **قدّم خلال خمسة أيام عمل من نهاية الفترة.**
- **فصّل المصاريف الصغيرة.** بند واحد بـ480 ريال "متفرقات" يُسأل عنه؛ ستة بنود بـ80 ريال لا.
- **اذكر دائماً المبرر التجاري.** "غداء عمل مع أحمد (مشتريات، شركة ABC) لاستكمال PO 88241" أفضل من "غداء".
- **بيّن التكاليف الممرَّرة بشكل منفصل.** إن استردّها العميل، صنّف البند "قابل لإعادة الفوترة".
- **طابق ضريبة القيمة المضافة بحرص.** في السعودية والإمارات، الإيصالات المؤهَّلة كفاتورة ضريبية فقط تسمح باسترداد الضريبة.
- **استخدم نفس العملة طوال التقرير.** حوّل في وقت المصروف.

## ما لا يجب فعله

- خلط مصاريف شخصية وتجارية في تقرير واحد.
- تقديم لقطة شاشة من تطبيق محفظة بدلاً من فاتورة ضريبية.
- تقريب الأرقام ("حوالي 50 دولاراً").
- إعادة تقديم نفس المصروف عبر تقارير متعددة.
- الانتظار حتى نهاية الربع للتقديم.

## أدوات تجعل تقارير المصاريف غير مؤلمة

- [مكتبة القوالب المجانية](/templates)
- [محوّل العملات](/calculators/currency-converter)
- [حاسبة النسبة المئوية](/calculators/percentage-calculator)
- [حاسبة ضريبة القيمة المضافة](/calculators/vat-calculator)
- [كاتب الذكاء الاصطناعي](/ai-writer) لصياغة الملاحظة والمبررات
- [مولّد الفواتير المجاني](/invoice) للحظة التي يجب أن يصبح فيها بند المصروف فاتورة إعادة فوترة

## الأسئلة الشائعة

### كم مرة أقدّم تقارير المصاريف؟
شهرياً للفرق المستمرة. للسفر، خلال خمسة أيام عمل من العودة.

### هل أرفق كل إيصال حتى الصغير؟
لمعظم الشركات، نعم — خاصة فوق ما يعادل 10 دولارات.

### ماذا لو فقدت إيصالاً؟
اكتب "إيصال مفقود"، أضف مبرراً قصيراً، وأرفق لقطة من المعاملة البنكية.

### هل يمكنني المطالبة باسترداد ضريبة القيمة المضافة؟
في السعودية والإمارات، فقط بإيصالات مدعومة بفاتورة ضريبية صحيحة.

### ما الفرق بين تقرير المصاريف والفاتورة؟
تقرير المصاريف يطالب بسداد ما دفعت. [الفاتورة](/invoice) تطلب الدفع مقابل ما قدّمت.

## أكثر فئات المصاريف التي تُرفض ولماذا

أقسام الحسابات في الشرق الأوسط ترفض بانتظام فئات معيّنة من المصاريف لأسباب يمكن تفاديها مسبقاً:

- **مصاريف بدون إيصال**: أي بند فوق 50 ريالاً/درهماً/ديناراً تقريباً يحتاج إيصالاً أصلياً. لا تعتمد على كشف بطاقة الائتمان وحده — ليس بديلاً قانونياً عن الإيصال الضريبي.
- **وجبات الموظفين الفردية**: معظم الشركات لا تعوّض وجبات الغداء داخل المدينة. الوجبات في السفر فقط مقبولة، مع تحديد سقف يومي.
- **هدايا للعملاء بدون إذن مسبق**: تتطلّب اعتماداً مكتوباً من المدير المباشر قبل الشراء، وإلا تُرفض حتى لو وُجد إيصال.
- **مواصلات شخصية مختلطة بعمل**: إذا استخدمت سيارتك الخاصة، فاحتسب فقط الكيلومترات المتعلّقة مباشرةً بالعمل وفق التعرفة المعتمدة في شركتك (عادةً 0.5–2 من العملة المحلية لكل كيلومتر).
- **مصاريف بعملة أجنبية بدون سعر صرف موثّق**: أرفق سعر الصرف الرسمي للبنك المركزي يوم المعاملة، لا سعر التطبيقات الخاصة.

## نصائح عملية لتسريع الموافقة على التقرير

- **قدّم التقرير في أول 5 أيام من الشهر التالي**: التقارير المتأخرة تذهب إلى أسفل قائمة الأولويات.
- **رتّب الإيصالات بنفس ترتيب التقرير**: أرقام مرجعية متطابقة بين التقرير والملف المرفق توفّر دقائق لكل مراجع.
- **استخدم أسماء فئات موحّدة**: التزم بأسماء الفئات المعتمدة في سياسة شركتك (مواصلات، إقامة، وجبات، اتصالات، إلخ) ولا تخترع فئات جديدة.
- **ارفع صور الإيصالات بدقّة كافية**: الإيصالات الباهتة أو الصور المائلة سبب شائع للرفض.
- **سدّد الضرائب القابلة للاسترداد بشكل منفصل**: إن كان عملك مسجّلاً لضريبة القيمة المضافة، افصل الضريبة في عمود مستقل ليتمكّن المحاسب من استردادها.

## ربط التقرير بدورة المصاريف الكاملة

بعد اعتماد التقرير، استخدم [مولّد الإيصالات](/receipt) لإصدار إيصال السداد للموظف، ثم احفظ نسخة في ملف الموظف للسنة الضريبية. للحسابات السريعة لتعويضات الكيلومترات أو لتحويل العملات، استخدم [مركز الحاسبات](/calculators).

للنسخة الإنجليزية، راجع [How to Write an Expense Report](/blog/expense-report-guide).
    `.trim(),
  },

  {
    slug: "أدوات-الكتابة-بالذكاء-الاصطناعي-للأعمال",
    titleAr: "كيف توفّر أدوات الكتابة بالذكاء الاصطناعي الوقت لشركات الشرق الأوسط",
    titleEn: "How AI Writing Tools Help MENA Businesses Save Time",
    metaTitleAr: "أدوات الكتابة بالذكاء الاصطناعي للأعمال | Xuvilo",
    excerptAr:
      "دليل شامل لاستخدام أدوات الكتابة بالذكاء الاصطناعي في الشركات الصغيرة بالشرق الأوسط: حالات الاستخدام، النصائح، والمخاطر.",
    excerptEn:
      "A complete guide to using AI writing tools in MENA small businesses — high-value use cases, prompts that work, the limits, and integration tips.",
    date: "2026-05-06",
    readTime: 8,
    category: "tips",
    keywordAr: "أدوات الكتابة بالذكاء الاصطناعي",
    keywordEn: "AI writing tools",
    relatedSlugs: ["ai-writer-business-guide"],
    contentEn:
      "Looking for the English version? Read [the full English guide: How AI Writing Tools Help MENA Businesses Save Time](/blog/ai-writer-business-guide).",
    contentAr: `
## كيف توفّر أدوات الكتابة بالذكاء الاصطناعي الوقت لشركات الشرق الأوسط

كل مستقل وصاحب شركة صغيرة في الشرق الأوسط يكتب الفقرات نفسها كل أسبوع: رسائل غلاف للفواتير، تذكيرات للدفعات المتأخرة، ردود على طلبات عروض الأسعار، أوصاف منتجات، منشورات اجتماعية، بنود عقود، متابعات بالعربية، ثم نفس المحتوى بالإنجليزية. أدوات الكتابة بالذكاء الاصطناعي تختصر كل ذلك من ساعات إلى دقائق — حين تستخدمها بحكمة.

يستعرض هذا الدليل أين تساعد الكتابة بالذكاء الاصطناعي فعلاً، وأين لا تساعد، وكيف يندمج [كاتب Xuvilo بالذكاء الاصطناعي](/ai-writer) في تدفّق عمل شركة صغيرة جنب [مولّد الفواتير المجاني](/invoice) و[مركز الحاسبات](/calculators).

## أين تساعد أدوات الكتابة بالذكاء الاصطناعي فعلاً؟

ليست كل مهمة كتابة مناسبة للذكاء الاصطناعي. الحالات الأقوى تشترك في ثلاث صفات: حجم كبير، إبداع منخفض، وسهولة التحقق. عبر الشركات الصغيرة في المنطقة، الحالات الأعلى قيمة:

### 1. رسائل الغلاف الثنائية اللغة

صياغة رسالة غلاف فاتورة بالعربية لعميل في الرياض ونفسها بالإنجليزية لعميل في دبي كانت تستغرق عشرين دقيقة. مع [كاتب الذكاء الاصطناعي](/ai-writer)، تستغرق دقيقة واحدة: اصِغ مرة بأي لغة، اطلب الترجمة، تصفّح، أرسل.

### 2. مقدمات عروض الأسعار وملخصات النطاق

السطور التقنية في [عرض السعر](/quotation) سهلة. الفقرة الافتتاحية التي تلخّص المشروع بكلمات العميل هي ما يفوز بالعمل — وهي أيضاً ما يبرع فيه الذكاء الاصطناعي.

### 3. متابعات الدفع المهذّبة

كتابة تذكير حازم وودود لفاتورة متأخرة صعب حين تحتاج المال فعلاً. طلب صياغة "تذكير ثانٍ مهذّب لفاتورة 4,500 ريال متأخرة 7 أيام لعميل قديم" يُنتج مسوّدة معايرة في ثوان.

### 4. أوصاف المنتجات والخدمات

لتجار التجارة الإلكترونية والمستقلين الذين يبنون قائمة خدمات، يولّد الذكاء الاصطناعي 5-10 صياغات بديلة في الوقت اللازم لكتابة واحدة.

### 5. ردود طلبات عروض الأسعار وأقسام المقترحات

للأعمال المعتمدة على RFQ، الذكاء الاصطناعي أسرع طريقة لصياغة الأقسام النمطية (خلفية الشركة، المنهجية، المراجع) ليتفرّغ الفريق للجانب الفني والتجاري الذي يفوز بالصفقة. راجع أيضاً [دليل ذكاء RFQ](/rfq).

### 6. المنشورات الاجتماعية وإطلاقات المنتجات

إطلاق منتج واحد يحتاج تعليق إنستغرام عربي، منشور لينكدإن إنجليزي، رسالة بث واتساب ثنائية، وبريد عميل.

### 7. التوثيق الداخلي

الوصف الوظيفي وأدلة الموظفين والإجراءات وكتيبات العملاء كلها تشترك في نمط نمطي ثقيل.

## أين لا تساعد أدوات الكتابة بالذكاء الاصطناعي

استخدم الذكاء الاصطناعي بانتقائية. الأقل فائدة (والأكثر خطورة):

- **العقود القانونية.** قد تُقرأ المسودات جيداً لكنها قد تفوّت الفروق الدقيقة المحلية. اطلب من محام مؤهّل المراجعة.
- **البيانات المالية والإقرارات الضريبية.** يلخّص الذكاء الاصطناعي؛ لا يحلّ محلّ محاسبك.
- **المواصفات التقنية المعقّدة.** الهندسية والطبية والتنظيمية تحتاج مراجعة من خبير.
- **صوت العلامة التجارية الأصلي.** الذكاء الاصطناعي يطابق صوتاً موجوداً؛ متوسط في اختراع واحد.
- **اتصالات الموارد البشرية الحساسة.** الإنذارات والمذكرات تحتاج حكماً بشرياً أولاً.

## مطالبات تنجح فعلاً

المطالبة الجيدة تحتوي ثلاثة عناصر: السياق، المهمة، والقيود.

### مثال 1 — رسالة غلاف فاتورة

> "صِغ رسالة غلاف فاتورة مهذّبة بالإنجليزية. المستلم عميل قديم (جهة اتصال مشتريات لدى موزّع إماراتي). رقم الفاتورة INV-2026-0142، 8,400 درهم، صافٍ 30، مستحقة 25 مايو 2026، تشير إلى أمر شرائهم 88241. الأسلوب: احترافي، دافئ، موجز — أقل من 80 كلمة."

### مثال 2 — وصف منتج ثنائي اللغة

> "اكتب وصف منتج عربي 60 كلمة وآخر إنجليزي 60 كلمة لجراب لابتوب جلد. أبرز: جلد كامل الحبيبات، ملاءمة MacBook 14 إنش، إغلاق مغناطيسي، ضمان سنتين. الأسلوب: راقٍ، مكتوم."

### مثال 3 — تذكير ثانٍ مهذّب

> "صِغ تذكيراً ثانياً مهذّباً وحازماً لفاتورة متأخرة. المستلم عميل سعودي مؤسسي. الفاتورة INV-2026-0089، 12,000 ريال، أصلاً مستحقة 15 أبريل 2026، الآن متأخّرة 14 يوماً. الأسلوب: محترم، واقعي، اطلب تاريخ دفع محدداً. أقل من 100 كلمة. إنجليزي."

### مثال 4 — فقرة مقدّمة عرض سعر

> "اكتب فقرة مقدّمة 90 كلمة لعرض سعر إعادة تصميم موقع. العميل تاجر تجزئة مصري متوسط الحجم يريد متجراً أسرع وأكثر ملاءمة للجوّال. أشِر إلى مكالمة الاكتشاف السابقة. الأسلوب: واثق، أولوية للعميل، بلا مصطلحات. إنجليزي."

النمط نفسه في كل مرة: من الجمهور، ما المستند، ما الحقائق التي يجب أن تظهر، ما الأسلوب، ما الطول.

## دمج الذكاء الاصطناعي في تدفّق عملك اليومي

أكبر توفير وقت يأتي حين يجلس الذكاء الاصطناعي بجوار المستند الذي تُنتجه، لا في تبويب متصفح منفصل. [كاتب Xuvilo بالذكاء الاصطناعي](/ai-writer) مدمج في نفس مساحة العمل مع [مولّد الفواتير](/invoice) و[مولّد عروض الأسعار](/quotation) و[مولّد الإيصالات](/receipt) — فرسالة الغلاف لفاتورة صغتها للتو على بُعد نقرة.

تدفّق نموذجي 30 ثانية:

1. افتح الفاتورة في [المولّد](/invoice).
2. اضغط "صِغ رسالة غلاف" — كاتب الذكاء الاصطناعي يقرأ سياق الفاتورة (الرقم، المبلغ، العميل، تاريخ الاستحقاق).
3. اختر اللغة (عربي أو إنجليزي).
4. عدّل الأسلوب وأضف ملاحظات خاصة بالعميل.
5. انسخ إلى عميل البريد وأرسل.

للمستقلين الذين يديرون 10-20 فاتورة شهرياً، هذا يختصر ساعة كتابة إلى نحو عشر دقائق.

## أحضِر مفاتيحك الخاصة

ميزات Xuvilo بالذكاء الاصطناعي مصمَّمة على نموذج "أحضر مفتاحك": تزوّد بمفتاح API لـOpenAI أو Anthropic أو Google أو OpenRouter، ويستخدمه كاتب الذكاء الاصطناعي مباشرة. يبقي التكاليف متوقعة، يعطيك التحكم بأي نموذج تستخدم، ويعني أن مطالباتك لا تُسجَّل على خدمة مشتركة.

## أفضل الممارسات

- **اقرأ المسوّدة دائماً قبل الإرسال.** الذكاء الاصطناعي سريع، لا معصوم.
- **قدّم حقائق ملموسة.** المطالبات الغامضة تنتج مخرجات غامضة.
- **طابق الأسلوب مع العلاقة.** العملاء القدامى يستحقّون الدفء؛ ردود RFQ الجديدة تستحق الرسمية.
- **انتبه للبيانات الحساسة.** لا تلصق بيانات تعريفية للعملاء بلا داعٍ.
- **احفظ أفضل مطالباتك.**
- **ترجم بحذر.** افعل دوماً مرحلة ثانية على ترجمات النصوص المالية أو القانونية.

## الأسئلة الشائعة

### هل كاتب Xuvilo بالذكاء الاصطناعي مجاني؟
الواجهة مجانية؛ تحضر مفتاحك الخاص للنموذج.

### هل يترجم العربية إلى الإنجليزية والعكس؟
نعم — يعالج المسوّدات الثنائية بشكل أصلي.

### هل يعمل مع فواتيري؟
نعم. افتح فاتورة في [المولّد](/invoice)، اضغط "صِغ رسالة غلاف"، وسيستخرج الكاتب السياق.

### هل سيحلّ محلّ محاسبي أو محامي؟
لا. مساعد للمسوّدات لا بديل للمشورة المرخّصة.

### ماذا عن بيانات عميلي؟
Xuvilo لا يسجّل مطالباتك. مع نموذج المفتاح الخاص، كل طلب ينتقل من متصفحك مباشرة إلى مزوّد النموذج.

## مقارنة المزوّدين الأربعة المدعومين في Xuvilo

[الكاتب الذكي](/ai-writer) في Xuvilo يدعم أربعة مزوّدين رئيسيين، ولكل منهم نقاط قوّة مختلفة:

- **OpenAI (GPT-4o, GPT-4-turbo)**: الأفضل للنصوص العامة، البريد الإلكتروني التجاري، والمحتوى التسويقي. سرعة ممتازة وفهم جيد للسياق العربي.
- **Anthropic (Claude)**: الأفضل للنصوص الطويلة والتحليلية (تقارير، عقود، ملخّصات). أكثر دقّة في الالتزام بالتعليمات وأقل ميلاً للهلوسة.
- **Google Gemini**: الأفضل عند الحاجة لدمج بحث محدّث على الويب أو التعامل مع جداول بيانات. مجاني الاستخدام في حدود معقولة.
- **OpenRouter**: بوابة لعشرات النماذج (Mixtral, Llama, إلخ) بسعر تنافسي. مفيد لتجربة نماذج متعدّدة دون الاشتراك في كل مزوّد على حدة.

ملاحظة مهمّة: Xuvilo يعمل بنموذج "أحضر مفتاحك الخاص" (BYOK) — أي أنك تُدخل مفتاح API الخاص بك من المزوّد المختار، والطلبات تنتقل من متصفّحك مباشرة إلى المزوّد دون المرور بخوادم Xuvilo. هذا يعني خصوصية كاملة وتكلفة بأسعار المزوّد الرسمية دون أي هامش إضافي.

## وصفات سريعة (Prompt recipes) جاهزة للنسخ

- **رسالة متابعة فاتورة متأخّرة**: "اكتب رسالة متابعة احترافية ومهذّبة باللغة [العربية/الإنجليزية] لعميل تأخّر [X] يوماً عن سداد فاتورة بقيمة [المبلغ]، مع الإشارة إلى تاريخ الاستحقاق وعرض المساعدة في حال وجود استفسار."
- **رد على طلب عرض سعر**: "اكتب رداً مهنياً على طلب عرض سعر من عميل في قطاع [القطاع] يطلب [الخدمة]، مع تأكيد فهم المتطلبات وذكر أن العرض المفصّل سيصل خلال 48 ساعة."
- **وصف منتج للتجارة الإلكترونية**: "اكتب وصفاً تسويقياً مكوناً من 80 كلمة لمنتج [اسم المنتج] يستهدف [الجمهور]، مع التركيز على [الميزة الرئيسية] وبنبرة [رسمية/ودودة]."
- **بنود عقد بسيطة**: "صُغ بنود السرّية والملكية الفكرية لعقد خدمات استشارية بين شركة سعودية ومستقل، مع مراعاة قانون حماية البيانات الشخصية الجديد."

## دمج المخرجات في سير عمل المستندات

أفضل طريقة لاستخدام أدوات الكتابة بالذكاء الاصطناعي هي توليد النص أولاً، ثم مراجعته بشريّاً (5 دقائق)، ثم إدراجه في [مولّد الفواتير](/invoice) أو [عرض السعر](/quotation) أو رسالة بريد إلكتروني. لا تُرسل أي نص دون مراجعة — الذكاء الاصطناعي يُسرّع الكتابة لكنه لا يُلغي الحاجة للحكم البشري على الأرقام والوعود التعاقدية.

للنسخة الإنجليزية، راجع [How AI Writing Tools Help MENA Businesses Save Time](/blog/ai-writer-business-guide).
    `.trim(),
  },

  // ---------------------------------------------------------------------------
  // Legacy long-form English posts. Their full SSR HTML lives in
  // server.ts STATIC_HTML (1500+ words each) and is preserved by the
  // English-shim guard `if (STATIC_HTML[path]) continue;`. These entries
  // exist so Blog.tsx (React) renders cards for them on /blog and so
  // the dynamic /blog SSR index can iterate every post uniformly.
  // contentAr / contentEn are stubs and never rendered for these slugs.
  // ---------------------------------------------------------------------------
  {
    slug: "zatca-invoice-requirements-saudi-arabia",
    titleEn: "ZATCA E-Invoice Requirements in Saudi Arabia (2026 Guide)",
    titleAr: "متطلبات الفوترة الإلكترونية ZATCA في السعودية (دليل 2026)",
    excerptEn:
      "A complete 2026 walkthrough of the Fatoorah programme: Phase 1 vs Phase 2, mandatory invoice fields, the QR code rule explained byte by byte, and penalties for non-compliance.",
    excerptAr:
      "دليل كامل لبرنامج فاتورة 2026: الفرق بين المرحلة الأولى والثانية، الحقول الإلزامية على الفاتورة الضريبية السعودية، شرح قاعدة رمز QR، وعقوبات عدم الامتثال.",
    date: "2026-05-01",
    readTime: 9,
    category: "taxes",
    keywordEn: "ZATCA Saudi Arabia",
    keywordAr: "زاتكا السعودية",
    relatedSlugs: ["vat-calculator-saudi-arabia", "free-invoice-generator-uae", "invoice-generator-egypt"],
    contentEn: "See the full SSR-rendered guide at /blog/zatca-invoice-requirements-saudi-arabia.",
    contentAr: "اقرأ الدليل الكامل على /blog/zatca-invoice-requirements-saudi-arabia.",
  },
  {
    slug: "free-invoice-generator-uae",
    titleEn: "Best Free Invoice Generator for UAE Freelancers (2026)",
    titleAr: "أفضل منشئ فواتير مجاني لمستقلي الإمارات (2026)",
    excerptEn:
      "Why UAE freelancers need proper invoices, what 5% VAT and the AED 375,000 registration threshold mean in practice, and how to issue your first AED-denominated bilingual invoice in three steps.",
    excerptAr:
      "لماذا يحتاج مستقلو الإمارات لفواتير منظّمة، ما معنى ضريبة 5% وحد التسجيل 375,000 درهم، وكيف تُصدر أول فاتورة بالدرهم ثنائية اللغة في ثلاث خطوات.",
    date: "2026-05-01",
    readTime: 8,
    category: "invoices",
    keywordEn: "UAE invoice generator",
    keywordAr: "منشئ فواتير الإمارات",
    relatedSlugs: ["freelancer-invoice-tips-uae", "invoice-vs-quotation", "zatca-invoice-requirements-saudi-arabia"],
    contentEn: "See the full SSR-rendered guide at /blog/free-invoice-generator-uae.",
    contentAr: "اقرأ الدليل الكامل على /blog/free-invoice-generator-uae.",
  },
  {
    slug: "invoice-vs-quotation",
    titleEn: "Invoice vs Quotation: Key Differences + Free Templates",
    titleAr: "الفاتورة وعرض السعر: الفروق الجوهرية + قوالب مجانية",
    excerptEn:
      "Invoice vs quotation explained: what each document is, when to use which, the legal and tax differences, and how to convert a quotation into an invoice cleanly.",
    excerptAr:
      "شرح الفرق بين الفاتورة وعرض السعر: ماهيّة كل منهما، متى تستخدم أيّاً منهما، الفروق القانونية والضريبية، وكيف تحوّل عرض السعر إلى فاتورة بسلاسة.",
    date: "2026-05-01",
    readTime: 7,
    category: "business",
    keywordEn: "invoice vs quotation",
    keywordAr: "فاتورة مقابل عرض سعر",
    relatedSlugs: ["quotation-guide-mena", "receipt-vs-invoice-difference", "free-invoice-generator-uae"],
    contentEn: "See the full SSR-rendered guide at /blog/invoice-vs-quotation.",
    contentAr: "اقرأ الدليل الكامل على /blog/invoice-vs-quotation.",
  },
  {
    slug: "vat-calculator-saudi-arabia",
    titleEn: "How to Calculate VAT in Saudi Arabia (Free Calculator)",
    titleAr: "كيف تحسب ضريبة القيمة المضافة في السعودية (حاسبة مجانية)",
    excerptEn:
      "Calculate Saudi Arabia VAT (15%) the right way — VAT-inclusive vs exclusive, the two formulas, worked examples for retailers, restaurants, freelancers and contractors.",
    excerptAr:
      "احسب ضريبة القيمة المضافة السعودية (15%) بالطريقة الصحيحة — السعر شامل وغير شامل الضريبة، المعادلتان، وأمثلة محلولة لتجّار التجزئة والمطاعم والمستقلين والمقاولين.",
    date: "2026-05-01",
    readTime: 8,
    category: "taxes",
    keywordEn: "Saudi VAT calculator",
    keywordAr: "حاسبة ضريبة السعودية",
    relatedSlugs: ["zatca-invoice-requirements-saudi-arabia", "profit-margin-calculator-guide", "free-invoice-generator-uae"],
    contentEn: "See the full SSR-rendered guide at /blog/vat-calculator-saudi-arabia.",
    contentAr: "اقرأ الدليل الكامل على /blog/vat-calculator-saudi-arabia.",
  },
  {
    slug: "invoice-generator-egypt",
    titleEn: "Free Invoice Generator for Egypt — Arabic & English (2026)",
    titleAr: "منشئ فواتير مجاني لمصر — عربي وإنجليزي (2026)",
    excerptEn:
      "Egypt invoicing in 2026: the ETA e-invoice system, 14% VAT, EGP currency, mandatory fields, why bilingual matters, and a free generator with no signup.",
    excerptAr:
      "الفوترة في مصر 2026: منظومة الفاتورة الإلكترونية ETA، ضريبة 14%، الجنيه المصري، الحقول الإلزامية، وأهمية القالب ثنائي اللغة. منشئ مجاني بدون تسجيل.",
    date: "2026-05-01",
    readTime: 8,
    category: "invoices",
    keywordEn: "Egypt invoice generator",
    keywordAr: "منشئ فواتير مصر",
    relatedSlugs: ["invoice-generator-jordan", "free-invoice-generator-uae", "vat-calculator-saudi-arabia"],
    contentEn: "See the full SSR-rendered guide at /blog/invoice-generator-egypt.",
    contentAr: "اقرأ الدليل الكامل على /blog/invoice-generator-egypt.",
  },
  {
    slug: "freelancer-invoice-tips-uae",
    titleEn: "How to Get Paid Faster as a Freelancer in UAE (2026)",
    titleAr: "كيف تُحصّل مدفوعاتك أسرع كمستقل في الإمارات (2026)",
    excerptEn:
      "Concrete tactics UAE freelancers use to cut payment delays in half — invoice timing, payment terms, deposits, and the follow-up cadence that actually works.",
    excerptAr:
      "أساليب عملية يستخدمها المستقلون في الإمارات لتقليل تأخّر الدفع إلى النصف — توقيت الفاتورة، شروط الدفع، الدفعات المقدّمة، ووتيرة المتابعة الفعّالة.",
    date: "2026-05-01",
    readTime: 7,
    category: "tips",
    keywordEn: "UAE freelancer payment",
    keywordAr: "تحصيل مدفوعات المستقلين الإمارات",
    relatedSlugs: ["free-invoice-generator-uae", "invoice-vs-quotation", "quotation-guide-mena"],
    contentEn: "See the full SSR-rendered guide at /blog/freelancer-invoice-tips-uae.",
    contentAr: "اقرأ الدليل الكامل على /blog/freelancer-invoice-tips-uae.",
  },
  {
    slug: "profit-margin-calculator-guide",
    titleEn: "How to Calculate Profit Margin for MENA Traders",
    titleAr: "كيف تحسب هامش الربح لتجّار الشرق الأوسط",
    excerptEn:
      "Gross vs operating vs net margin explained for MENA traders — the formulas, the markup-vs-margin trap, worked examples, and healthy benchmarks by industry.",
    excerptAr:
      "شرح الربح الإجمالي والتشغيلي والصافي لتجّار المنطقة — المعادلات، الفرق بين الهامش والمضاف، أمثلة محلولة، ومعايير صحية حسب القطاع.",
    date: "2026-05-01",
    readTime: 8,
    category: "business",
    keywordEn: "profit margin MENA",
    keywordAr: "هامش الربح للتجّار",
    relatedSlugs: ["vat-calculator-saudi-arabia", "quotation-guide-mena", "receipt-vs-invoice-difference"],
    contentEn: "See the full SSR-rendered guide at /blog/profit-margin-calculator-guide.",
    contentAr: "اقرأ الدليل الكامل على /blog/profit-margin-calculator-guide.",
  },
  {
    slug: "receipt-vs-invoice-difference",
    titleEn: "Receipt vs Invoice: What's the Difference?",
    titleAr: "الإيصال والفاتورة: ما الفرق بينهما؟",
    excerptEn:
      "Receipt vs invoice explained in plain English: definitions, when to issue each, side-by-side comparison, MENA-specific legal requirements, and how Xuvilo handles both.",
    excerptAr:
      "شرح بسيط للفرق بين الإيصال والفاتورة: التعريفات، متى تُصدر كلّاً منهما، مقارنة جنباً إلى جنب، والمتطلبات القانونية في المنطقة، وكيف يدعم Xuvilo الاثنين.",
    date: "2026-05-01",
    readTime: 7,
    category: "business",
    keywordEn: "receipt vs invoice",
    keywordAr: "إيصال مقابل فاتورة",
    relatedSlugs: ["invoice-vs-quotation", "free-invoice-generator-uae", "quotation-guide-mena"],
    contentEn: "See the full SSR-rendered guide at /blog/receipt-vs-invoice-difference.",
    contentAr: "اقرأ الدليل الكامل على /blog/receipt-vs-invoice-difference.",
  },
  {
    slug: "quotation-guide-mena",
    titleEn: "How to Write a Professional Quotation (With Free Template)",
    titleAr: "كيف تكتب عرض سعر احترافي (مع قالب مجاني)",
    excerptEn:
      "Anatomy of a winning B2B quotation in MENA — the eight required sections, validity dates, terms and conditions, lump sum vs itemised pricing, and one-click quote-to-invoice conversion.",
    excerptAr:
      "تشريح عرض سعر ناجح للأعمال في المنطقة — الأقسام الثمانية الإلزامية، تواريخ الصلاحية، الشروط والأحكام، التسعير المقطوع مقابل المفصّل، والتحويل بنقرة إلى فاتورة.",
    date: "2026-05-01",
    readTime: 8,
    category: "business",
    keywordEn: "MENA quotation guide",
    keywordAr: "دليل عرض السعر",
    relatedSlugs: ["invoice-vs-quotation", "freelancer-invoice-tips-uae", "free-invoice-generator-uae"],
    contentEn: "See the full SSR-rendered guide at /blog/quotation-guide-mena.",
    contentAr: "اقرأ الدليل الكامل على /blog/quotation-guide-mena.",
  },
  {
    slug: "invoice-generator-jordan",
    titleEn: "Free Invoice Generator for Jordan — Arabic & English (2026)",
    titleAr: "منشئ فواتير مجاني للأردن — عربي وإنجليزي (2026)",
    excerptEn:
      "Jordan invoicing in 2026: JOD currency with three-decimal precision, the 16% General Sales Tax, mandatory fields, bilingual Arabic-English presentation, and end-to-end Xuvilo support.",
    excerptAr:
      "الفوترة في الأردن 2026: الدينار الأردني بثلاث منازل عشرية، ضريبة المبيعات العامة 16%، الحقول الإلزامية، والتقديم ثنائي اللغة، ودعم Xuvilo الكامل.",
    date: "2026-05-01",
    readTime: 7,
    category: "invoices",
    keywordEn: "Jordan invoice generator",
    keywordAr: "منشئ فواتير الأردن",
    relatedSlugs: ["invoice-generator-egypt", "free-invoice-generator-uae", "vat-calculator-saudi-arabia"],
    contentEn: "See the full SSR-rendered guide at /blog/invoice-generator-jordan.",
    contentAr: "اقرأ الدليل الكامل على /blog/invoice-generator-jordan.",
  },

  // ── Cornerstone articles batch 2 (July 2026) ─────────────────────────────

  {
    slug: "how-to-write-professional-invoice",
    titleEn: "How to Write a Professional Invoice — Complete Guide (2026)",
    titleAr: "كيف تكتب فاتورة احترافية — الدليل الكامل (2026)",
    excerptEn: "Everything your invoice must include: mandatory fields, payment terms, numbering, tax lines, and the top mistakes freelancers and small businesses make.",
    excerptAr: "كل ما يجب أن تتضمنه فاتورتك: الحقول الإلزامية، شروط الدفع، الترقيم، سطور الضريبة، وأبرز أخطاء المستقلين والشركات الصغيرة.",
    date: "2026-07-10",
    readTime: 9,
    category: "invoices",
    keywordEn: "how to write a professional invoice",
    keywordAr: "كيف تكتب فاتورة احترافية",
    relatedSlugs: ["invoice-payment-terms-guide", "first-invoice-checklist", "free-invoice-generator-uae"],
    contentEn: `A professional invoice is more than a payment request — it is a legal document, a cash-flow tool, and a reflection of your business's credibility. Whether you are a freelancer billing your first client or a growing SME processing hundreds of invoices a month, understanding what makes an invoice "professional" is the foundation of getting paid on time.

**The mandatory fields every invoice must include**

At minimum, every professional invoice should contain: (1) the word "Invoice" and a unique invoice number; (2) your business name, address, and contact information; (3) the client's name and billing address; (4) the invoice date and the payment due date; (5) a clear description of goods or services provided; (6) unit prices, quantities, and line totals; (7) the subtotal, any applicable taxes (e.g. VAT), and the total amount due; and (8) your accepted payment methods.

In ZATCA-regulated Saudi Arabia, e-invoices also require your Tax Identification Number (TIN), the buyer's TIN for B2B transactions, and a QR code. Use the [Xuvilo invoice generator](/invoice) to produce ZATCA-compliant invoices automatically.

**Payment terms — be specific**

Vague terms lead to late payments. Instead of "Payment due soon," write "Net 30 — payment due by [date]." Common terms include Due on Receipt, Net 15, Net 30, and Net 60. If you charge late fees, state the rate clearly: "A late payment fee of 1.5% per month applies to balances unpaid after the due date."

**Invoice numbering**

Use a consistent, sequential system. A common format is INV-[YEAR]-[NUMBER], e.g. INV-2026-0001. Never re-use numbers. A gap in your numbering sequence can raise questions during a tax audit.

**Common mistakes to avoid**

The most common invoicing errors: missing or wrong client address (delays payment processing), no payment due date (gives the client an excuse to pay "whenever"), no tax breakdown (non-compliant in VAT-registered countries), and PDF sent without confirmation (follow up with an email referencing the invoice number). If you charge VAT, double-check your tax lines with the free [VAT calculator](/calculators/vat-tax).`,
    contentAr: `الفاتورة الاحترافية أكثر من مجرد طلب دفع — فهي وثيقة قانونية وأداة لإدارة التدفق النقدي وانعكاس لمصداقية عملك. سواء كنت مستقلاً يُرسل أول فاتورة له أو شركة صغيرة تُعالج مئات الفواتير شهرياً، فإن فهم ما يجعل الفاتورة "احترافية" هو أساس الحصول على المدفوعات في وقتها.

**الحقول الإلزامية في كل فاتورة احترافية**

كحد أدنى، يجب أن تحتوي كل فاتورة احترافية على: (1) كلمة "فاتورة" ورقم فاتورة فريد؛ (2) اسم شركتك وعنوانها ومعلومات الاتصال؛ (3) اسم العميل وعنوان الفوترة؛ (4) تاريخ الفاتورة وتاريخ استحقاق الدفع؛ (5) وصف واضح للسلع أو الخدمات المقدمة؛ (6) أسعار الوحدات والكميات والإجماليات؛ (7) المجموع الفرعي وأي ضرائب مطبقة والمبلغ الإجمالي المستحق؛ و(8) طرق الدفع المقبولة.

في المملكة العربية السعودية الخاضعة لنظام ZATCA، تستلزم الفواتير الإلكترونية أيضاً رقم التعريف الضريبي (TIN) والرمز السريع QR. استخدم [مولّد فواتير Xuvilo](/invoice) لإنتاج فواتير متوافقة مع متطلبات ZATCA تلقائياً.`,
  },

  {
    slug: "invoice-payment-terms-guide",
    titleEn: "Invoice Payment Terms Explained: Net 30, Net 60, Due on Receipt (2026)",
    titleAr: "شروط دفع الفواتير: Net 30 و Net 60 وما معنى الدفع عند الاستلام؟",
    excerptEn: "A plain-language guide to every payment term you'll encounter on an invoice: what they mean, when to use them, and how they affect your cash flow.",
    excerptAr: "دليل مبسط لكل مصطلحات الدفع الشائعة على الفواتير: ماذا تعني وكيف تختار المناسب منها وتأثيرها على تدفقك النقدي.",
    date: "2026-07-09",
    readTime: 7,
    category: "invoices",
    keywordEn: "invoice payment terms Net 30",
    keywordAr: "شروط دفع الفواتير Net 30",
    relatedSlugs: ["how-to-write-professional-invoice", "handle-late-payments-invoice-disputes", "first-invoice-checklist"],
    contentEn: `Payment terms are the conditions under which a seller expects to be paid. They appear on every invoice and have a direct impact on your business's cash flow. Here is a clear guide to the most common payment terms.

**Due on Receipt** means the client should pay as soon as they receive the invoice. Best for: small one-off jobs, new clients without established credit, or businesses with very tight cash flow.

**Net 7, Net 10, Net 14** — payment is due within 7, 10, or 14 days. Common for: recurring service providers, digital products, and businesses with short payment cycles.

**Net 30** — payment is due within 30 calendar days of the invoice date. The most common B2B standard. This gives large clients time to process invoices through their accounts payable department.

**Net 60 / Net 90** — payment due within 60 or 90 days. Common in manufacturing and wholesale, where goods take time to sell through before the buyer can pay.

**2/10 Net 30** — a cash discount: the client gets a 2% discount if they pay within 10 days; otherwise the full amount is due in 30 days. Effective for incentivizing early payment.

**Early Payment Discounts vs. Late Payment Fees**

Early payment discounts cost money (you receive less), so use them only when cash flow is tight. Late payment fees are more common and are generally more effective — but they must be stated on the original invoice to be enforceable.

**Which term is right for you?**

New clients and small jobs: Due on Receipt or Net 7. Established business relationships: Net 30. Large enterprises with long AP cycles: Net 60. Recurring monthly services: Due on the 1st or 15th of the following month. Track overdue balances with the free [invoice aging calculator](/calculators/invoice-aging), and state your terms clearly on every invoice you create with the [invoice generator](/invoice).`,
    contentAr: `شروط الدفع هي الشروط التي يتوقع بموجبها البائع الحصول على المدفوعات. تظهر على كل فاتورة ولها تأثير مباشر على التدفق النقدي لشركتك.

**الدفع عند الاستلام** يعني أن العميل يجب أن يدفع فور استلامه الفاتورة. الأفضل لـ: الأعمال الصغيرة لمرة واحدة، أو العملاء الجدد، أو الشركات ذات التدفق النقدي الضيق.

**Net 30** — الدفع مستحق خلال 30 يوماً تقويمياً من تاريخ الفاتورة. المعيار الأكثر شيوعاً في المعاملات التجارية بين الشركات (B2B). يمنح هذا العملاء الكبار وقتاً لمعالجة الفواتير من خلال قسم الحسابات الدائنة.

**2/10 Net 30** — خصم نقدي: يحصل العميل على خصم 2% إذا دفع خلال 10 أيام؛ وإلا يُستحق المبلغ كاملاً في 30 يوماً. فعّال لتشجيع الدفع المبكر. تابع الفواتير المتأخرة عبر [حاسبة أعمار الفواتير](/calculators/invoice-aging) المجانية، وحدّد شروط الدفع بوضوح عند إنشاء فواتيرك عبر [مولّد الفواتير](/invoice).`,
  },

  {
    slug: "handle-late-payments-invoice-disputes",
    titleEn: "How to Handle Late Payments and Invoice Disputes Professionally",
    titleAr: "كيف تتعامل مع تأخر المدفوعات ونزاعات الفواتير باحترافية",
    excerptEn: "Step-by-step guide: from friendly reminders to escalation. Scripts, timelines, and legal options for recovering unpaid invoices without losing the client relationship.",
    excerptAr: "دليل خطوة بخطوة من التذكير الودي إلى التصعيد. نصوص وجداول زمنية وخيارات قانونية لاسترداد الفواتير غير المسددة.",
    date: "2026-07-08",
    readTime: 8,
    category: "invoices",
    keywordEn: "handle late invoice payments",
    keywordAr: "التعامل مع تأخر الدفعات",
    relatedSlugs: ["invoice-payment-terms-guide", "how-to-write-professional-invoice", "invoice-aging-calculator"],
    contentEn: `Late payments are one of the biggest cash-flow threats for freelancers and small businesses. A structured, professional approach significantly improves collection rates while preserving the client relationship.

**Before the due date: prevention**

The best time to handle a late payment is before it happens. Send the invoice immediately after delivering work (not at the end of the month) — the free [invoice generator](/invoice) makes this a five-minute job. Include a clear due date. Send a friendly reminder 3 days before the due date: "This is a courtesy reminder that invoice INV-2026-0042 for $1,500 is due on [date]."

**On the due date: first follow-up**

If no payment has been received on the due date, send a polite email the same day: "Hi [Client], I wanted to follow up on invoice INV-2026-0042 for $1,500 which was due today. Please let me know if you have any questions or if there's anything I can help with to process the payment."

**7–14 days overdue: firm but professional**

At 7 days: reference the invoice, the amount, the original due date, and ask for a payment confirmation date. At 14 days: include your late fee policy and request urgent attention.

**30+ days overdue: escalation**

At 30+ days, escalate to a senior contact, send a formal demand letter, and consider pausing further work. For amounts above a threshold, formal debt collection or legal action may be warranted. Use the [invoice aging calculator](/calculators/invoice-aging) to see exactly how long each unpaid invoice has been outstanding.

**Avoiding disputes in the first place**

Get written sign-off on scope before starting work. Use a simple contract or engagement letter. Confirm the client's billing address and purchase order number before sending the invoice.`,
    contentAr: `تأخر الدفعات يُشكّل أحد أكبر التهديدات للتدفق النقدي للمستقلين والشركات الصغيرة. النهج المنظم والاحترافي يُحسّن معدلات التحصيل بشكل ملحوظ مع الحفاظ على علاقة العميل.

**قبل تاريخ الاستحقاق: الوقاية**

أرسل الفاتورة فور تسليم العمل. تضمّن تاريخ استحقاق واضحاً. أرسل تذكيراً ودياً قبل 3 أيام من الاستحقاق.

**في تاريخ الاستحقاق: المتابعة الأولى**

إذا لم يتم الدفع في يوم الاستحقاق، أرسل بريداً إلكترونياً مهذباً في نفس اليوم لمتابعة الفاتورة.

**7-30 يوماً متأخرة: التصعيد التدريجي**

بعد 7 أيام: أذكر الفاتورة والمبلغ وتاريخ الاستحقاق. بعد 30 يوماً: فكر في إيقاف العمل مؤقتاً وإرسال خطاب مطالبة رسمي. استخدم [حاسبة أعمار الفواتير](/calculators/invoice-aging) لمعرفة مدة تأخر كل فاتورة غير مسددة.`,
  },

  {
    slug: "proforma-invoice-vs-commercial-invoice",
    titleEn: "Proforma Invoice vs Commercial Invoice: Key Differences Explained",
    titleAr: "الفاتورة المبدئية مقابل الفاتورة التجارية: الفروق الرئيسية",
    excerptEn: "When to use a proforma invoice vs. a commercial invoice. Legal status, customs use, payment obligation, and how to generate both with Xuvilo.",
    excerptAr: "متى تستخدم الفاتورة المبدئية مقابل الفاتورة التجارية. الوضع القانوني، الاستخدام الجمركي، التزام الدفع، وكيفية إنشاء كلتيهما.",
    date: "2026-07-07",
    readTime: 6,
    category: "invoices",
    keywordEn: "proforma invoice vs commercial invoice",
    keywordAr: "الفاتورة المبدئية مقابل الفاتورة التجارية",
    relatedSlugs: ["how-to-write-professional-invoice", "quotation-best-practices", "invoice-payment-terms-guide"],
    contentEn: `Proforma invoices and commercial invoices are easily confused but serve very different purposes. Using the wrong one at the wrong stage can delay shipments, complicate customs clearance, and create accounting errors.

**What is a proforma invoice?**

A proforma invoice is a preliminary bill sent before a final transaction is confirmed. It shows the estimated cost of goods or services and is used to help the buyer plan, obtain import licenses, or arrange financing. It is NOT a demand for payment and does NOT trigger accounts payable. It is commonly used in international trade before goods ship.

**What is a commercial invoice?**

A commercial invoice is the official billing document issued once goods are shipped or services are delivered. It is the formal demand for payment, a legal record of the transaction, and the primary customs document for import/export. Customs authorities use it to calculate duties and taxes.

**Key differences at a glance**

| | Proforma | Commercial |
|---|---|---|
| Legal status | Preliminary/estimate | Legally binding |
| Payment obligation | None | Yes |
| Used for customs | Sometimes (for advance planning) | Yes (required) |
| Triggers AR/AP? | No | Yes |
| Sent when | Before shipment/delivery | After shipment/delivery |

**How to use them correctly**

Use a proforma invoice when: a client needs to arrange a letter of credit (LC), obtain import permits, or get internal budget approval. Use a commercial invoice when: goods have shipped, services have been delivered, and you want to be paid. Generate both document types for free with the [invoice generator](/invoice), and estimate duties and freight with the [import cost calculator](/calculators/import-cost).`,
    contentAr: `الفاتورة المبدئية والفاتورة التجارية يُخلَط بينهما بسهولة لكنهما تخدمان أغراضاً مختلفة تماماً.

**ما هي الفاتورة المبدئية؟**

الفاتورة المبدئية (Proforma) هي فاتورة أولية تُرسَل قبل تأكيد المعاملة النهائية. تُظهر التكلفة التقديرية للسلع أو الخدمات وتُستخدم لمساعدة المشتري على التخطيط أو الحصول على تراخيص الاستيراد أو ترتيب التمويل. إنها ليست مطالبة بالدفع ولا تُنشئ التزامات قانونية.

**ما هي الفاتورة التجارية؟**

الفاتورة التجارية هي مستند الفوترة الرسمي الصادر بعد شحن البضائع أو تسليم الخدمات. إنها المطالبة الرسمية بالدفع والسجل القانوني للمعاملة والمستند الجمركي الأساسي. يمكنك إنشاء كلا النوعين مجاناً عبر [مولّد الفواتير](/invoice)، وتقدير الرسوم الجمركية والشحن عبر [حاسبة التكلفة الاستيرادية](/calculators/import-cost).`,
  },

  {
    slug: "invoice-numbering-best-practices",
    titleEn: "Invoice Numbering Best Practices for Small Businesses (2026)",
    titleAr: "أفضل ممارسات ترقيم الفواتير للشركات الصغيرة (2026)",
    excerptEn: "Sequential vs. date-based numbering, client prefixes, gaps in sequence, tax audit risks — everything you need to know about structuring your invoice numbers.",
    excerptAr: "الترقيم التسلسلي مقابل الترقيم بالتاريخ، بادئات العملاء، الفجوات في التسلسل، مخاطر التدقيق الضريبي.",
    date: "2026-07-06",
    readTime: 5,
    category: "invoices",
    keywordEn: "invoice numbering best practices",
    keywordAr: "ترقيم الفواتير أفضل ممارسات",
    relatedSlugs: ["how-to-write-professional-invoice", "invoice-payment-terms-guide", "zatca-invoice-saudi"],
    contentEn: `Invoice numbering is one of the most overlooked aspects of running a small business — until a tax audit reveals gaps or duplicates in your records. A consistent numbering system protects you legally, speeds up payment processing, and makes your business look professional.

**Why invoice numbering matters**

Tax authorities in most countries (including ZATCA in Saudi Arabia and FTA in UAE) require sequential invoice numbering with no gaps. A missing number in your sequence triggers questions: Was there an unreported transaction? Did you issue a cash invoice you didn't declare?

**Common numbering formats**

Sequential simple: 001, 002, 003. Clear but reveals your invoice volume to clients.
Year-prefixed: INV-2026-001. Resets each year, easy to file.
Year-month-prefixed: INV-2026-07-001. Groups invoices by month for easy lookup.
Client-prefixed: CLI01-001. Useful if you want to track invoices per client.

**Rules to follow**

1. Never skip a number — if you void an invoice, keep the voided record with a note.
2. Never re-use a number — even for a different client or year.
3. Reset by year if you use year-prefixed numbers — but keep the full historical record.
4. Keep a dedicated invoice register (even a simple spreadsheet) alongside your PDF invoices.

**ZATCA compliance note**

Saudi Arabia's e-invoicing system (FATOORA) assigns a UUID to every invoice at the point of generation. This is in addition to your internal sequential number. Use [Xuvilo's invoice generator](/invoice) which handles ZATCA sequential numbering automatically.`,
    contentAr: `ترقيم الفواتير يُعدّ أحد أكثر جوانب إدارة الأعمال الصغيرة إهمالاً — حتى يكشف التدقيق الضريبي عن ثغرات أو تكرارات في السجلات.

**لماذا يهم ترقيم الفواتير**

تشترط السلطات الضريبية في معظم الدول (بما فيها ZATCA في السعودية وFTA في الإمارات) ترقيماً تسلسلياً للفواتير دون ثغرات. الرقم المفقود في تسلسلك يُثير تساؤلات الجهات الضريبية.

**تنسيقات الترقيم الشائعة**

تسلسلي بسيط: 001، 002، 003. أو مسبوق بالسنة: INV-2026-001، أو مسبوق بالسنة والشهر: INV-2026-07-001. استخدم [مولّد الفواتير](/invoice) المجاني لترقيم فواتيرك تلقائياً.`,
  },

  {
    slug: "first-invoice-checklist",
    titleEn: "First Invoice Checklist: 10 Things You Must Include",
    titleAr: "قائمة تحقق الفاتورة الأولى: 10 أشياء لا غنى عنها",
    excerptEn: "Sending your very first invoice? This 10-point checklist ensures it looks professional, gets processed quickly, and holds up legally if you ever need it.",
    excerptAr: "ترسل فاتورتك الأولى؟ قائمة تحقق من 10 نقاط لضمان احترافيتها وسرعة معالجتها وصلاحيتها القانونية.",
    date: "2026-07-05",
    readTime: 5,
    category: "invoices",
    keywordEn: "first invoice checklist",
    keywordAr: "قائمة تحقق أول فاتورة",
    relatedSlugs: ["how-to-write-professional-invoice", "invoice-payment-terms-guide", "proforma-invoice-vs-commercial-invoice"],
    contentEn: `Sending your first invoice is a milestone — and it's worth getting right. A poorly structured invoice delays payment, looks unprofessional, and can create accounting headaches. Use this 10-point checklist before hitting send — then create the invoice itself in minutes with the free [invoice generator](/invoice).

**✓ 1. The word "Invoice" appears clearly at the top**
Sounds obvious, but missing this label can cause problems in accounts payable systems.

**✓ 2. A unique invoice number**
Sequential, never duplicated. Example: INV-2026-0001.

**✓ 3. Invoice date and payment due date**
Both are mandatory. "Net 30" is common; "Due on Receipt" works for small jobs.

**✓ 4. Your full name/business name and contact info**
Name, address, email, and phone. If VAT-registered, include your Tax ID.

**✓ 5. Your client's full name and billing address**
Confirm with the client before sending — the wrong address delays payment.

**✓ 6. A clear description of goods or services**
Be specific. "Website design — homepage redesign per agreed brief, delivered June 2026" is better than "website work."

**✓ 7. Quantity, unit price, and line total for each item**
Never lump everything into one line if there are multiple deliverables.

**✓ 8. Subtotal, taxes (VAT/GST), and total amount due**
If you're VAT-registered, the tax line is not optional — it's legally required. Get the amount right with the free [VAT calculator](/calculators/vat-tax).

**✓ 9. Payment instructions**
Bank account details, IBAN, SWIFT code if international, or a payment link. The clearer this is, the faster you get paid.

**✓ 10. A polite thank-you line**
Invoices that include "Thank you for your business" are paid, on average, 1–3 days faster according to FreshBooks research.`,
    contentAr: `إرسال فاتورتك الأولى لحظة مهمة — ويستحق الأمر إتقانها. استخدم قائمة التحقق من 10 نقاط هذه قبل الإرسال، ثم أنشئ فاتورتك في دقائق عبر [مولّد الفواتير](/invoice) المجاني.

**✓ 1. كلمة "فاتورة" تظهر بوضوح في الأعلى**
**✓ 2. رقم فاتورة فريد** — تسلسلي وغير مكرر.
**✓ 3. تاريخ الفاتورة وتاريخ استحقاق الدفع**
**✓ 4. اسمك/اسم شركتك الكامل ومعلومات الاتصال** — بما فيها الرقم الضريبي إن كنت مسجلاً لضريبة القيمة المضافة.
**✓ 5. الاسم الكامل للعميل وعنوان الفوترة**
**✓ 6. وصف واضح للسلع أو الخدمات**
**✓ 7. الكمية وسعر الوحدة والإجمالي لكل بند**
**✓ 8. المجموع الفرعي والضرائب (VAT) والمجموع الكلي**
**✓ 9. تعليمات الدفع** — بيانات الحساب البنكي أو IBAN.
**✓ 10. عبارة شكر بأدب**`,
  },

  {
    slug: "quotation-best-practices",
    titleEn: "Quotation Best Practices: How to Write Quotes That Win Business (2026)",
    titleAr: "أفضل ممارسات عروض الأسعار: كيف تكتب عروضاً تكسب العملاء",
    excerptEn: "Structure, validity periods, pricing strategies, common mistakes, and how a professional quotation builds trust before a single invoice is sent.",
    excerptAr: "الهيكل، فترات الصلاحية، استراتيجيات التسعير، الأخطاء الشائعة، وكيف يبني عرض السعر الاحترافي الثقة قبل إرسال أي فاتورة.",
    date: "2026-07-04",
    readTime: 7,
    category: "invoices",
    keywordEn: "quotation best practices",
    keywordAr: "أفضل ممارسات عروض الأسعار",
    relatedSlugs: ["how-to-write-professional-invoice", "proforma-invoice-vs-commercial-invoice", "first-invoice-checklist"],
    contentEn: `A well-structured quotation is often the difference between winning and losing a contract. Clients evaluate your professionalism, attention to detail, and pricing clarity from the moment they open your quote.

**What a quotation must include**

Every professional quotation should contain: your business name and contact info; the client's name and address; a unique quote reference number and date; the validity period (how long the price is valid — typically 14 or 30 days); a detailed breakdown of goods or services; pricing per item, subtotal, taxes, and total; your payment terms; and any assumptions or exclusions.

**Validity periods — why they matter**

Always include a validity period: "This quotation is valid for 30 days from the date above." Without one, a client could accept a quote months later at the old price when your costs have risen. A 14–30 day window is standard for most service businesses.

**Pricing strategies**

Option A — Itemized: list every deliverable separately. Creates transparency and reduces scope disputes.
Option B — Fixed price: one total for a defined scope. Simpler for the client; carries more risk for you.
Option C — Tiered packages: "Basic / Standard / Premium" options. Often increases average deal value as clients self-select. Whichever model you choose, check your numbers with the [profit margin calculator](/calculators/profit-margin) before committing to a price.

**The most common quotation mistakes**

1. Sending a quote with no follow-up — follow up after 3 days.
2. Not specifying what is excluded — vague scope leads to disputes.
3. Using a generic template with the wrong client's name — always double-check.
4. No expiry date — leaves you exposed to price-commitment risk.

**After the quote is accepted**

Get written acceptance (email confirmation is fine in most jurisdictions). Then issue a formal invoice or, for large projects, a deposit invoice to start. Create professional quotes in minutes with the free [quotation generator](/quotation).`,
    contentAr: `عرض السعر المنظم جيداً كثيراً ما يكون الفارق بين الفوز بعقد وخسارته.

**ما يجب أن يتضمنه عرض السعر الاحترافي**

اسم شركتك ومعلومات الاتصال؛ اسم العميل وعنوانه؛ رقم مرجعي فريد وتاريخ؛ فترة صلاحية (14-30 يوماً عادةً)؛ تفصيل مفصّل للسلع أو الخدمات مع الأسعار والضرائب والإجمالي؛ شروط الدفع؛ والافتراضات أو الاستثناءات.

**استراتيجيات التسعير**

الخيار أ — مفصّل: كل بند منفصل. الخيار ب — سعر ثابت: إجمالي واحد لنطاق محدد. الخيار ج — حزم متدرجة: "أساسية / معيارية / متميزة" — غالباً يرفع متوسط قيمة الصفقة. أنشئ عروض أسعار احترافية عبر [مولّد عروض الأسعار](/quotation) وتحقق من أرقامك باستخدام [حاسبة هامش الربح](/calculators/profit-margin).`,
  },

  {
    slug: "vat-registration-gcc-countries",
    titleEn: "VAT Registration Requirements in GCC Countries — Complete Guide (2026)",
    titleAr: "متطلبات التسجيل في ضريبة القيمة المضافة في دول مجلس التعاون الخليجي (2026)",
    excerptEn: "VAT registration thresholds, timelines, and requirements for Saudi Arabia, UAE, Bahrain, and Oman — with practical steps for small businesses and freelancers.",
    excerptAr: "حدود التسجيل في ضريبة القيمة المضافة ومتطلباتها في السعودية والإمارات والبحرين وعُمان — مع خطوات عملية للشركات الصغيرة.",
    date: "2026-07-02",
    readTime: 8,
    category: "taxes",
    keywordEn: "VAT registration GCC countries",
    keywordAr: "التسجيل في ضريبة القيمة المضافة دول الخليج",
    relatedSlugs: ["vat-calculator-saudi-arabia", "zatca-invoice-saudi", "uae-corporate-tax-guide-smes"],
    contentEn: `VAT was introduced across the GCC in two waves: Saudi Arabia and the UAE in 2018, and Bahrain, Oman, and Qatar in subsequent years. If your business earns above the registration threshold, VAT registration is mandatory — and fines for non-compliance can be severe.

**Saudi Arabia (ZATCA)**

VAT rate: 15%. Mandatory registration threshold: SAR 375,000 in annual taxable supplies. Voluntary registration threshold: SAR 187,500. Registration is handled through the ZATCA portal (zatca.gov.sa). E-invoicing (FATOORA) is mandatory for all VAT-registered businesses, in two phases based on business size.

**United Arab Emirates (FTA)**

VAT rate: 5%. Mandatory threshold: AED 375,000 in annual taxable supplies. Voluntary threshold: AED 187,500. Registration is handled through the FTA portal (tax.gov.ae). Foreign businesses with taxable supplies in the UAE must also register.

**Bahrain (NBR)**

VAT rate: 10%. Mandatory threshold: BHD 37,500. Handled by the National Bureau for Revenue (NBR).

**Oman (OTA)**

VAT rate: 5%. Mandatory threshold: OMR 38,500. Handled by the Oman Tax Authority (OTA).

**Common registration mistakes**

Registering too late: fines start from Day 1 of exceeding the threshold. Not accounting for taxable imports: imported goods count toward your threshold in some GCC states. Missing the voluntary registration window: voluntary registration lets you reclaim input VAT before you hit the mandatory threshold — useful for capital-intensive businesses. Use the free [VAT calculator](/calculators/vat-tax) to work out VAT-inclusive and exclusive amounts for any GCC rate.`,
    contentAr: `تم تطبيق ضريبة القيمة المضافة في دول الخليج العربي على مرحلتين: السعودية والإمارات في 2018، والبحرين وعُمان لاحقاً. إذا تجاوز عملك حد التسجيل، فالتسجيل إلزامي — والغرامات على عدم الامتثال يمكن أن تكون صارمة.

**المملكة العربية السعودية (ZATCA)**
معدل الضريبة: 15%. حد التسجيل الإلزامي: 375,000 ريال. التسجيل الطوعي: 187,500 ريال.

**الإمارات العربية المتحدة (FTA)**
معدل الضريبة: 5%. الحد الإلزامي: 375,000 درهم.

**البحرين**: معدل 10%. **عُمان**: معدل 5%. استخدم [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax) المجانية لحساب المبالغ الشاملة وغير الشاملة للضريبة بأي معدل خليجي.`,
  },

  {
    slug: "uae-corporate-tax-guide-smes",
    titleEn: "UAE Corporate Tax: What Every SME Needs to Know (2026)",
    titleAr: "ضريبة الشركات في الإمارات: ما يجب أن تعرفه كل شركة صغيرة (2026)",
    excerptEn: "UAE corporate tax at 9% applies to profits above AED 375,000. Who is exempt, how to register, how to file, and what qualifies as a taxable person — explained simply.",
    excerptAr: "ضريبة الشركات الإماراتية بنسبة 9% تطبّق على الأرباح التي تتجاوز 375,000 درهم. من معفى وكيف تسجل وما يُعتبر شخصاً خاضعاً للضريبة.",
    date: "2026-07-01",
    readTime: 7,
    category: "taxes",
    keywordEn: "UAE corporate tax SME guide",
    keywordAr: "ضريبة الشركات الإمارات دليل",
    relatedSlugs: ["vat-registration-gcc-countries", "free-invoice-generator-uae", "vat-calculator-saudi-arabia"],
    contentEn: `The UAE introduced a federal corporate tax in June 2023, ending its reputation as a tax-free jurisdiction for business income. The rate is 9% on taxable income above AED 375,000 per year. Here is what every SME operating in the UAE needs to know.

**Who is subject to UAE Corporate Tax?**

All UAE businesses (including free-zone companies and branches of foreign companies) are subject to corporate tax unless specifically exempt. This includes: companies, partnerships, and sole establishments registered in the UAE; foreign entities that have a permanent establishment in the UAE.

**Who is exempt?**

Government entities and qualifying public benefit organizations are exempt. Natural persons (individuals) earning income from employment, real estate investments (not through a business), or dividends are generally not subject to corporate tax. Free zone companies can maintain a 0% rate on qualifying free zone income if they meet specific "qualifying free zone person" (QFZP) conditions — this is complex and requires professional advice.

**The AED 375,000 tax-free threshold**

Taxable income up to AED 375,000 is taxed at 0%. Income above AED 375,000 is taxed at 9%. This means a business with AED 500,000 taxable profit pays 9% only on AED 125,000 = AED 11,250 in tax. To see how tax affects your bottom line, try the free [profit margin calculator](/calculators/profit-margin).

**Registration and filing**

Corporate tax registration is done through the FTA portal (tax.gov.ae). Businesses must file an annual return within 9 months after their financial year-end. Penalties for late registration or filing are significant. For the VAT amounts on your invoices, the free [VAT calculator](/calculators/vat-tax) covers the UAE's 5% rate.`,
    contentAr: `أدخلت الإمارات ضريبة الشركات الاتحادية في يونيو 2023 بنسبة 9% على الدخل الخاضع للضريبة الذي يتجاوز 375,000 درهم سنوياً.

**من يخضع لضريبة الشركات الإماراتية؟**

جميع الشركات الإماراتية (بما فيها الشركات في المناطق الحرة والفروع الأجنبية) إلا من يُعفى منها.

**الحد المعفى من الضريبة**

الدخل حتى 375,000 درهم معفى. ما يزيد عن ذلك يخضع لنسبة 9%. احسب أثر الضريبة على أرباحك عبر [حاسبة هامش الربح](/calculators/profit-margin)، واستخدم [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax) لمبالغ الضريبة على فواتيرك.`,
  },

  {
    slug: "break-even-analysis-guide",
    titleEn: "Break-Even Analysis: A Complete Guide for Small Businesses",
    titleAr: "تحليل نقطة التعادل: دليل شامل للشركات الصغيرة",
    excerptEn: "What break-even means, how to calculate it, how to use it for pricing decisions, and why every small business owner should run this analysis before launching.",
    excerptAr: "ما معنى نقطة التعادل، كيف تحسبها، كيف تستخدمها في قرارات التسعير، ولماذا يجب على كل صاحب عمل صغير إجراء هذا التحليل.",
    date: "2026-06-30",
    readTime: 8,
    category: "business",
    keywordEn: "break-even analysis small business",
    keywordAr: "تحليل نقطة التعادل الشركات الصغيرة",
    relatedSlugs: ["how-to-price-services-freelancer", "financial-ratios-small-business", "cash-flow-management-freelancers"],
    contentEn: `Break-even analysis is one of the most powerful and underused tools in small business management. It answers the fundamental question: "How much do I need to sell just to cover my costs?"

**The core concepts**

Fixed costs are expenses that don't change with your sales volume: rent, salaries, insurance, equipment, and software subscriptions. They exist whether you sell 0 or 10,000 units.

Variable costs change with every unit you produce or service you deliver: raw materials, direct labor, shipping, transaction fees, and sales commissions.

Contribution margin = Selling price minus variable cost per unit. It is the amount each sale "contributes" toward covering fixed costs.

**The break-even formula**

Break-Even Units = Fixed Costs ÷ Contribution Margin per Unit
Break-Even Revenue = Break-Even Units × Selling Price

**Example:** A freelance translator charges $0.10 per word. Variable cost per word (software, proofreading) = $0.02. Contribution margin = $0.08/word. Fixed monthly costs (home office, subscriptions) = $800/month. Break-even = $800 ÷ $0.08 = 10,000 words per month. Run your own numbers with the free [break-even calculator](/calculators/break-even).

**How to use break-even for pricing decisions**

If you're setting a price, start with your costs. Work backward: "I need to cover $5,000 in fixed costs with 50 clients per month. That's $100 per client before any variable costs." Then add variable costs and desired [profit margin](/calculators/profit-margin).

**Margin of safety**

Once you know your break-even point, calculate your margin of safety: (Actual or expected revenue − Break-even revenue) ÷ Actual revenue × 100. A margin of safety above 20% is generally considered healthy for a small business.`,
    contentAr: `تحليل نقطة التعادل هو أحد أقوى الأدوات وأقلها استخداماً في إدارة الأعمال الصغيرة. يجيب على السؤال الأساسي: "كم يجب أن أبيع فقط لتغطية تكاليفي؟"

**المعادلة الأساسية**

نقطة التعادل (بالوحدات) = التكاليف الثابتة ÷ هامش المساهمة لكل وحدة
نقطة التعادل (بالإيرادات) = وحدات نقطة التعادل × سعر البيع

**مثال:** مترجم مستقل يتقاضى 0.10 دولار للكلمة. تكلفة متغيرة 0.02 دولار. هامش المساهمة = 0.08 دولار. التكاليف الثابتة الشهرية = 800 دولار. نقطة التعادل = 800 ÷ 0.08 = 10,000 كلمة شهرياً. جرّب [حاسبة نقطة التعادل](/calculators/break-even) المجانية لحساب أرقامك.`,
  },

  {
    slug: "how-to-price-services-freelancer",
    titleEn: "How to Price Your Services as a Freelancer: A Complete Pricing Guide",
    titleAr: "كيف تسعّر خدماتك كمستقل: دليل التسعير الشامل",
    excerptEn: "Hourly vs. project vs. retainer pricing, how to calculate your minimum rate, value-based pricing, and how to raise your rates without losing clients.",
    excerptAr: "التسعير بالساعة مقابل المشروع مقابل الاشتراك الشهري، كيف تحسب حدك الأدنى، التسعير القائم على القيمة، وكيف ترفع أسعارك.",
    date: "2026-06-29",
    readTime: 9,
    category: "business",
    keywordEn: "how to price freelance services",
    keywordAr: "كيف تسعر خدمات المستقل",
    relatedSlugs: ["break-even-analysis-guide", "cash-flow-management-freelancers", "financial-ratios-small-business"],
    contentEn: `Pricing is the single biggest lever on your income as a freelancer — yet most freelancers set prices based on what others charge, not on what they actually need to earn. This guide gives you a framework to price confidently and profitably.

**Step 1: Calculate your minimum viable rate**

Add up your monthly expenses: living costs, business costs (software, insurance, office), savings goal, and tax provision. Divide by the number of billable hours you can realistically work per month (typically 100–120 for most freelancers after accounting for admin, sales, and non-billable time). This gives your minimum hourly floor rate.

Example: $4,000/month expenses + $1,000 tax provision = $5,000. At 100 billable hours: $50/hour minimum. You should charge more than this — this is your floor, not your target. Sanity-check your rates with the [profit margin calculator](/calculators/profit-margin) and the [markup and margin calculator](/calculators/markup-margin).

**Step 2: Choose a pricing model**

Hourly: easy to calculate, protects you against scope creep, but limits income as you can't earn more than hours × rate.
Project-based (fixed): better for clients (predictable cost), better for you (can earn more per hour if you work efficiently). Requires detailed scope definition to avoid disputes.
Retainer: a fixed monthly fee for a defined set of services. The most stable income model for established freelancers.

**Step 3: Research the market**

Know what others charge for similar work in your market. Freelancer platforms, industry associations, and community surveys are good sources. Position yourself relative to the market based on your experience, specialization, and track record.

**Step 4: Add a value premium**

Price based on the value you create, not the time you spend. A tax filing that saves a client $10,000 is worth much more than 3 hours × $80/hour = $240. Value-based pricing requires confidence and clear communication of outcomes, not deliverables. When you send a price to a client, present it professionally with the free [quotation generator](/quotation).`,
    contentAr: `التسعير هو الرافعة الأكبر في دخلك كمستقل — ومع ذلك يضع معظم المستقلين أسعارهم بناءً على ما يفرضه الآخرون، لا على ما يحتاجون فعلاً لكسبه.

**الخطوة 1: احسب حدك الأدنى القابل للحياة**

اجمع نفقاتك الشهرية: تكاليف المعيشة، تكاليف الأعمال، هدف الادخار، الضرائب. اقسم على عدد الساعات القابلة للفوترة شهرياً (عادةً 100-120 ساعة).

**نماذج التسعير**
بالساعة: واضح لكن يحد دخلك. بالمشروع: أفضل للعملاء ويمكن أن يرفع دخلك. الاشتراك الشهري: أكثر استقراراً للمستقلين المتمرسين. تحقق من أرقامك عبر [حاسبة هامش الربح](/calculators/profit-margin) وقدّم أسعارك للعملاء عبر [مولّد عروض الأسعار](/quotation).`,
  },

  {
    slug: "landed-cost-international-shipping",
    titleEn: "Understanding Landed Cost in International Shipping — Full Guide",
    titleAr: "فهم التكلفة الكلية للشحن الدولي (Landed Cost) — الدليل الشامل",
    excerptEn: "Landed cost = purchase price + freight + insurance + customs duty + local delivery. Why it matters, how to calculate it, and how to use it to make better import decisions.",
    excerptAr: "التكلفة الكلية = سعر الشراء + الشحن + التأمين + الرسوم الجمركية + التوصيل المحلي. لماذا تهم وكيف تحسبها.",
    date: "2026-06-28",
    readTime: 7,
    category: "business",
    keywordEn: "landed cost international shipping",
    keywordAr: "التكلفة الكلية الشحن الدولي",
    relatedSlugs: ["vat-registration-gcc-countries", "break-even-analysis-guide", "how-to-price-services-freelancer"],
    contentEn: `Landed cost is the total cost of a product from the moment it leaves the supplier's factory to the moment it arrives in your warehouse, ready for sale. Failing to account for landed cost accurately is one of the most common mistakes importers make — and it can turn a seemingly profitable purchase into a loss.

**The components of landed cost**

1. Purchase price: the supplier invoice value (FOB, EXW, or CIF depending on Incoterms).
2. International freight: the cost of shipping goods from the origin country to your destination port. Varies significantly by mode (air vs. sea) and distance.
3. Insurance: typically 0.5–1% of the cargo value for standard marine cargo insurance.
4. Import duties: calculated on the CIF value in most countries. Rate depends on the HS code of your goods. GCC standard rate: 5% on most goods.
5. Local port and handling fees: port charges, customs clearance agent fees, THC (Terminal Handling Charges).
6. Local delivery: transport from the port to your warehouse or final destination.

**Why landed cost matters for pricing**

Many importers make the mistake of pricing products based on the supplier's FOB price. By the time you add 5% duty, 15% freight, and 3% insurance + handling, your actual cost could be 23% higher than the invoice price. Your selling price must reflect landed cost, not just purchase price, to be profitable.

**Example calculation**

Supplier price: $10,000 FOB Shanghai
Sea freight: $800
Insurance: $100
CIF value: $10,900
Customs duty (5%): $545
Port/clearing fees: $250
Local delivery: $200
Landed cost: $11,895

Landed cost per unit (100 units): $118.95 — not $100.

Estimate your own shipment with the free [import cost calculator](/calculators/import-cost), and work out cargo volume and chargeable weight with the [shipping CBM calculator](/calculators/shipping-cbm) and the [freight chargeable weight calculator](/calculators/freight-cbw).`,
    contentAr: `التكلفة الكلية (Landed Cost) هي إجمالي تكلفة المنتج من لحظة مغادرته مصنع المورد حتى وصوله إلى مستودعك جاهزاً للبيع. عدم احتساب التكلفة الكلية بدقة هو أحد الأخطاء الأكثر شيوعاً بين المستوردين.

**مكونات التكلفة الكلية**

1. سعر الشراء من المورد
2. الشحن الدولي
3. التأمين (عادةً 0.5-1% من قيمة البضاعة)
4. الرسوم الجمركية (تُحسب على قيمة CIF في معظم الدول — 5% في دول الخليج لمعظم السلع)
5. رسوم الميناء والتخليص الجمركي
6. التوصيل المحلي

**مثال حسابي**

سعر الشراء FOB: 10,000 دولار + شحن بحري: 800 دولار + تأمين: 100 دولار = قيمة CIF: 10,900 دولار. رسوم جمركية 5%: 545 دولار. رسوم ميناء وتوصيل: 450 دولار. التكلفة الكلية: 11,895 دولار. احسب شحنتك الخاصة عبر [حاسبة التكلفة الاستيرادية](/calculators/import-cost) و[حاسبة حجم الشحن CBM](/calculators/shipping-cbm) المجانيتين.`,
  },

  {
    slug: "cash-flow-management-freelancers",
    titleEn: "Cash Flow Management for Freelancers and SMEs — Practical Guide",
    titleAr: "إدارة التدفق النقدي للمستقلين والشركات الصغيرة — دليل عملي",
    excerptEn: "Why profitable businesses still run out of cash, how to build a 13-week cash flow forecast, and five habits that protect your business in slow months.",
    excerptAr: "لماذا تنفد نقود الشركات المربحة، كيف تبني توقعاً للتدفق النقدي، وخمس عادات تحمي عملك في الأشهر البطيئة.",
    date: "2026-06-27",
    readTime: 8,
    category: "business",
    keywordEn: "cash flow management freelancers small business",
    keywordAr: "إدارة التدفق النقدي المستقلين الشركات الصغيرة",
    relatedSlugs: ["how-to-price-services-freelancer", "break-even-analysis-guide", "handle-late-payments-invoice-disputes"],
    contentEn: `"Profitable but cash-poor" is one of the most dangerous situations a small business can be in. A business can show positive net income on its P&L and still fail because it runs out of cash. Understanding and managing cash flow is as important as generating revenue.

**Why profitable businesses run out of cash**

The most common cause: timing mismatches. You deliver work in January, invoice in February, get paid in March — but you paid your suppliers and staff in January. If your revenue is growing, this gap gets larger over time, not smaller.

**The 13-week cash flow forecast**

A 13-week (three-month) rolling cash flow forecast is the most practical tool for small business cash management. It shows: cash on hand at the start of each week; expected cash inflows (payments from clients); expected cash outflows (rent, payroll, supplier payments, taxes); and the closing balance after each week.

Build it in a simple spreadsheet. Update it every week. The goal is never to be surprised. Track how long clients actually take to pay with the [invoice aging calculator](/calculators/invoice-aging).

**Five habits for better cash flow**

1. Invoice immediately — every day of delay is a day later you get paid. The free [invoice generator](/invoice) makes this a five-minute job.
2. Get deposits — for large projects, require 30–50% upfront. This is industry standard, not unusual.
3. Shorten payment terms for new clients — start with Net 15 or Net 14 rather than Net 30 until trust is established.
4. Maintain a cash buffer — 3 months of operating expenses in a separate account is the minimum.
5. Pay suppliers strategically — if suppliers give you 30 or 60 days, use them. Don't pay early unless there's a discount.`,
    contentAr: `"مربحة لكن بدون نقد" هي إحدى أخطر الحالات التي يمكن أن تكون فيها الشركة الصغيرة.

**لماذا تنفد نقود الشركات المربحة**

السبب الأكثر شيوعاً: عدم التطابق الزمني. تُنجز العمل في يناير، تُرسل الفاتورة في فبراير، تستلم الدفع في مارس — لكنك دفعت للموردين والموظفين في يناير.

**خمس عادات لتدفق نقدي أفضل**

1. افوتر فوراً — كل يوم تأخير يعني يوماً إضافياً في انتظار الدفع. أنشئ فواتيرك في دقائق عبر [مولّد الفواتير](/invoice) وتابع المتأخر منها عبر [حاسبة أعمار الفواتير](/calculators/invoice-aging).
2. اطلب دفعات مقدمة للمشاريع الكبيرة.
3. قصّر شروط الدفع للعملاء الجدد.
4. احتفظ باحتياطي نقدي يعادل 3 أشهر من التكاليف.
5. استخدم فترات سداد الموردين الممنوحة لك.`,
  },

  {
    slug: "financial-ratios-small-business",
    titleEn: "5 Essential Financial Ratios Every Small Business Owner Should Track",
    titleAr: "5 نسب مالية أساسية يجب على كل صاحب شركة صغيرة تتبعها",
    excerptEn: "Gross margin, current ratio, DSO, debt-to-equity, and net profit margin — how to calculate them, what healthy benchmarks look like, and why they matter.",
    excerptAr: "هامش الربح الإجمالي، نسبة التداول، DSO، نسبة الدين للحقوق، وصافي هامش الربح — كيف تحسبها وما الأرقام الصحية.",
    date: "2026-06-26",
    readTime: 8,
    category: "business",
    keywordEn: "financial ratios small business",
    keywordAr: "النسب المالية للشركات الصغيرة",
    relatedSlugs: ["break-even-analysis-guide", "cash-flow-management-freelancers", "how-to-price-services-freelancer"],
    contentEn: `Financial ratios are the vital signs of your business. They tell you at a glance whether your business is healthy, improving, or heading for trouble — without needing to read pages of financial statements.

**1. Gross Profit Margin**

Formula: (Revenue − Cost of Goods Sold) / Revenue × 100
What it tells you: how much of each dollar of sales is left after covering the direct cost of delivering your product or service. Healthy range: 20–80% depending on industry (services tend to be higher, retail lower).
Action: if your gross margin is declining, you're either charging less or your production costs are rising — both need immediate attention. Calculate yours in seconds with the free [profit margin calculator](/calculators/profit-margin).

**2. Net Profit Margin**

Formula: Net Income / Revenue × 100
What it tells you: how much of each dollar of revenue becomes actual profit after all expenses. Healthy range: 5–20% for most SMEs. Below 5% is a warning zone. Pair this with a [break-even analysis](/calculators/break-even) to know the sales level where profit starts.

**3. Current Ratio (Liquidity)**

Formula: Current Assets / Current Liabilities
What it tells you: can your business pay its bills due in the next 12 months? A ratio above 1.5 is generally healthy. Below 1.0 means you owe more than you can pay with current assets — a liquidity crisis.

**4. Days Sales Outstanding (DSO)**

Formula: (Accounts Receivable / Revenue) × Number of Days
What it tells you: how long it takes to collect payment after a sale. Target: below your stated payment terms (e.g. below 30 days for Net 30 customers). Rising DSO means clients are paying slower — an early cash flow warning sign.

**5. Debt-to-Equity Ratio**

Formula: Total Debt / Total Equity
What it tells you: how much of your business is financed by debt vs. owner funds. Below 1.0 (more equity than debt) is healthy for most SMEs. Above 2.0 suggests high financial risk.`,
    contentAr: `النسب المالية هي علامات الحيوية لشركتك. تخبرك بصورة فورية ما إذا كان عملك بصحة جيدة أو متجه نحو المشكلة.

**1. هامش الربح الإجمالي**: (الإيرادات − تكلفة البضاعة المباعة) / الإيرادات × 100 — احسبه فوراً عبر [حاسبة هامش الربح](/calculators/profit-margin) المجانية
**2. صافي هامش الربح**: صافي الدخل / الإيرادات × 100. نطاق صحي: 5-20%
**3. نسبة التداول**: الأصول المتداولة / الخصوم المتداولة. فوق 1.5 يعني وضعاً سليماً
**4. أيام بيع مستحقة (DSO)**: (الذمم المدينة / الإيرادات) × عدد الأيام
**5. نسبة الدين إلى حقوق الملكية**: الديون الكلية / حقوق الملكية`,
  },

  {
    slug: "how-to-create-company-profile",
    titleEn: "How to Create a Company Profile That Attracts Clients (2026 Guide)",
    titleAr: "كيف تنشئ ملفاً تجارياً يستقطب العملاء — دليل 2026",
    excerptEn: "What to include in a company profile, how to structure it for B2B clients, and how Xuvilo's company profile tool simplifies the process with bilingual output.",
    excerptAr: "ما تتضمنه في ملفك التجاري، كيف تهيكله لعملاء B2B، وكيف تبسّط أداة الملف التجاري في Xuvilo هذه العملية.",
    date: "2026-06-25",
    readTime: 6,
    category: "business",
    keywordEn: "company profile business",
    keywordAr: "الملف التجاري للشركة",
    relatedSlugs: ["business-document-templates-guide", "quotation-best-practices", "how-to-write-professional-invoice"],
    contentEn: `A company profile is often the first document a potential B2B client or partner reads. It is your business's résumé — a concise, compelling summary of who you are, what you do, and why a client should work with you.

**The 8 essential sections**

1. Executive summary: 2–3 sentences capturing your business, market, and value proposition.
2. Company overview: founding date, location, legal structure, and size.
3. Mission and vision: what you are here to do, and where you aim to be.
4. Products and services: clear, jargon-free descriptions of what you offer.
5. Key clients and industries served: builds credibility. "We serve 200+ SMEs across GCC" is stronger than a generic claim.
6. Team: founding team and key people. Photos and brief bios humanize the business.
7. Certifications and awards: ISO certifications, industry awards, relevant memberships.
8. Contact information: address, phone, email, website, and social media handles.

**Tips for B2B company profiles**

Lead with value, not history. Clients care about what you solve for them, not how long you've been in business (though mentioning years of experience builds trust). Use numbers wherever possible: "Serving 150+ clients in 12 countries" is more convincing than "a growing client base." Keep it concise: 4–8 pages for a printed profile; 1–2 pages for an email attachment.

**Bilingual profiles in the MENA region**

In GCC markets, a bilingual (Arabic and English) company profile is a competitive advantage and sometimes a formal requirement for government tenders. Use Xuvilo's Company Profile tool to generate professional bilingual profiles with your logo and brand colors. Pair your profile with matching documents from the [invoice generator](/invoice) and the full suite of free [business calculators](/calculators).`,
    contentAr: `الملف التجاري هو أول وثيقة يقرأها عميل B2B المحتمل أو الشريك. إنه السيرة الذاتية لشركتك.

**الأقسام الـ8 الأساسية**

1. ملخص تنفيذي
2. نظرة عامة على الشركة (التأسيس، الموقع، الهيكل القانوني)
3. المهمة والرؤية
4. المنتجات والخدمات
5. العملاء الرئيسيون والقطاعات المخدومة
6. الفريق
7. الشهادات والجوائز
8. معلومات الاتصال

في أسواق دول الخليج، الملف التجاري ثنائي اللغة (عربي وإنجليزي) ميزة تنافسية وأحياناً متطلب رسمي للمناقصات الحكومية. أكمل مستنداتك الاحترافية عبر [مولّد الفواتير](/invoice) ومجموعة [الحاسبات التجارية](/calculators) المجانية.`,
  },

  {
    slug: "invoice-generator-qatar",
    titleEn: "Free Invoice Generator for Qatar (QAR) — Arabic & English (2026)",
    titleAr: "منشئ فواتير مجاني لقطر (ريال قطري) — عربي وإنجليزي (2026)",
    excerptEn: "Qatar invoicing in 2026: QAR currency, no VAT currently in effect, mandatory invoice fields, bilingual Arabic-English format, and free PDF export.",
    excerptAr: "الفوترة في قطر 2026: الريال القطري، لا ضريبة قيمة مضافة حالياً، الحقول الإلزامية، التنسيق ثنائي اللغة، وتصدير PDF مجاني.",
    date: "2026-06-24",
    readTime: 6,
    category: "invoices",
    keywordEn: "Qatar invoice generator",
    keywordAr: "منشئ فواتير قطر",
    relatedSlugs: ["free-invoice-generator-uae", "invoice-generator-bahrain", "vat-registration-gcc-countries"],
    contentEn: `Qatar is one of the wealthiest countries per capita in the world, with a thriving economy driven by energy, construction, finance, and services. As of 2026, Qatar has not yet implemented VAT — making invoicing simpler than in neighboring GCC states, but no less important for professional compliance.

**Qatar invoicing basics**

Currency: Qatari Riyal (QAR). VAT: No VAT in effect as of 2026 (Qatar announced a VAT framework but implementation has been delayed). This means you do not add VAT lines to invoices for most business transactions. However, some specific sectors may have their own levies — always verify with your accountant.

**Mandatory invoice fields in Qatar**

Qatar does not currently have an e-invoicing mandate comparable to Saudi Arabia's ZATCA, but professional invoices should include: your company's commercial registration (CR) number; the client's commercial registration number (for B2B); invoice date; unique invoice number; description of goods or services; unit prices, quantities, and totals in QAR; your payment terms; and your bank details (IBAN and SWIFT for international transfers).

**Bilingual invoicing**

Qatar's business environment is highly international, with a large expatriate workforce and many multinational clients. Bilingual Arabic-English invoices are the professional standard for B2B dealings with Qatari government entities, major corporations, and international clients.

**Using Xuvilo for Qatar invoices**

Xuvilo's [free invoice generator](/invoice) supports QAR currency, bilingual output, and all the mandatory fields required for professional Qatar invoicing — with instant PDF export. For invoices involving foreign clients, the [currency exchange calculator](/calculators/currency-exchange) helps you convert amounts accurately.`,
    contentAr: `قطر إحدى أغنى الدول في العالم من حيث الناتج المحلي الإجمالي للفرد. اعتباراً من 2026، لم تطبّق قطر بعد ضريبة القيمة المضافة، مما يجعل الفوترة أبسط مقارنةً بدول الخليج المجاورة.

**أساسيات الفوترة في قطر**

العملة: الريال القطري (QAR). ضريبة القيمة المضافة: لا تطبق حالياً اعتباراً من 2026.

**الحقول الإلزامية**

رقم السجل التجاري؛ رقم سجل العميل التجاري (للمعاملات B2B)؛ تاريخ الفاتورة؛ رقم فاتورة فريد؛ وصف السلع أو الخدمات؛ الأسعار والكميات بالريال القطري؛ شروط الدفع؛ تفاصيل البنك. أنشئ فاتورتك القطرية مجاناً عبر [مولّد الفواتير](/invoice)، وحوّل العملات للعملاء الأجانب عبر [حاسبة أسعار الصرف](/calculators/currency-exchange).`,
  },

  {
    slug: "invoice-generator-bahrain",
    titleEn: "Free Invoice Generator for Bahrain (BHD) — Arabic & English (2026)",
    titleAr: "منشئ فواتير مجاني للبحرين (دينار بحريني) — عربي وإنجليزي (2026)",
    excerptEn: "Bahrain invoicing in 2026: BHD currency, 10% VAT rate, NBR requirements, mandatory invoice fields, and free bilingual PDF export.",
    excerptAr: "الفوترة في البحرين 2026: الدينار البحريني، ضريبة القيمة المضافة 10%، متطلبات NBR، الحقول الإلزامية، وتصدير PDF مجاني.",
    date: "2026-06-23",
    readTime: 6,
    category: "invoices",
    keywordEn: "Bahrain invoice generator",
    keywordAr: "منشئ فواتير البحرين",
    relatedSlugs: ["vat-registration-gcc-countries", "invoice-generator-qatar", "free-invoice-generator-uae"],
    contentEn: `Bahrain introduced VAT at 10% in January 2022, doubling from the initial 5% rate introduced in 2019. For businesses operating in Bahrain, VAT compliance is now a critical part of invoicing.

**Bahrain VAT basics**

Rate: 10% standard rate. Authority: National Bureau for Revenue (NBR — nbr.gov.bh). Registration threshold: BHD 37,500 in annual taxable supplies. Zero-rated categories include exports outside GCC, international transportation, and certain food items. Exempt categories include financial services, residential real estate, and local passenger transport. Work out 10% VAT amounts instantly with the free [VAT calculator](/calculators/vat-tax).

**Mandatory VAT invoice fields in Bahrain**

A VAT-compliant invoice in Bahrain must include: "Tax Invoice" (الفاتورة الضريبية) label; your business name and address; your Tax Registration Number (TRN); the customer's name and address; the customer's TRN (for registered customers); invoice date and a unique sequential number; description of goods/services; quantity, unit price, and net amount for each line; VAT amount per line; and the total amount including VAT in BHD.

**Currency note**

The Bahraini Dinar (BHD) is pegged to the USD at 0.376 BHD = 1 USD. It is one of the highest-valued currencies in the world. [Xuvilo's invoice generator](/invoice) supports BHD with the correct decimal precision (3 decimal places).`,
    contentAr: `أدخلت البحرين ضريبة القيمة المضافة بنسبة 10% في يناير 2022، مرتفعةً من 5% الأولية.

**أساسيات ضريبة القيمة المضافة في البحرين**

المعدل: 10%. الجهة: مكتب الإيرادات الوطنية (NBR). حد التسجيل: 37,500 دينار بحريني.

**الحقول الإلزامية للفواتير الضريبية**

عنوان "فاتورة ضريبية"؛ اسم الشركة وعنوانها؛ رقم التسجيل الضريبي؛ بيانات العميل ورقم تسجيله الضريبي؛ رقم فاتورة تسلسلي؛ وصف السلع والخدمات؛ مبلغ الضريبة لكل بند؛ الإجمالي شاملاً الضريبة بالدينار البحريني. أنشئ فاتورتك مجاناً عبر [مولّد الفواتير](/invoice) واحسب الضريبة عبر [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax).`,
  },

  {
    slug: "invoice-generator-oman",
    titleEn: "Free Invoice Generator for Oman (OMR) — Arabic & English (2026)",
    titleAr: "منشئ فواتير مجاني لعُمان (ريال عُماني) — عربي وإنجليزي (2026)",
    excerptEn: "Oman invoicing in 2026: OMR currency with three-decimal precision, 5% VAT, OTA requirements, bilingual invoice fields, and free PDF export.",
    excerptAr: "الفوترة في عُمان 2026: الريال العُماني بثلاث منازل عشرية، ضريبة القيمة المضافة 5%، متطلبات هيئة الضرائب العُمانية.",
    date: "2026-06-22",
    readTime: 6,
    category: "invoices",
    keywordEn: "Oman invoice generator",
    keywordAr: "منشئ فواتير عُمان",
    relatedSlugs: ["vat-registration-gcc-countries", "invoice-generator-bahrain", "free-invoice-generator-uae"],
    contentEn: `Oman introduced VAT at 5% in April 2021, administered by the Oman Tax Authority (OTA). Businesses that meet the registration threshold must issue VAT-compliant invoices for all taxable supplies.

**Oman VAT basics**

Rate: 5%. Authority: Oman Tax Authority (OTA — taxoman.gov.om). Registration threshold: OMR 38,500 (mandatory) / OMR 19,250 (voluntary). The Omani Riyal (OMR) is one of the highest-valued currencies globally, pegged at approximately 1 OMR = 2.60 USD. It uses 3 decimal places (baisa).

**Mandatory VAT invoice fields in Oman**

OTA-compliant invoices must include: "Tax Invoice" (فاتورة ضريبية) label; supplier name and address; supplier Tax Registration Number (TRN); customer name and address; customer TRN (for registered customers); invoice date and number; description of goods or services; quantity, unit price, net amount, and VAT amount per line; the VAT rate applied; and the total VAT and total invoice amount in OMR.

**Simplified vs. full VAT invoices**

Like other GCC countries, Oman allows simplified VAT invoices for retail supplies to unregistered consumers. A simplified invoice needs the supplier's name, TRN, invoice date, description, and VAT-inclusive total — but does not need to separately itemize the VAT amount. Use full tax invoices for all B2B transactions. Create OTA-compliant invoices for free with the [invoice generator](/invoice), and calculate 5% VAT amounts with the [VAT calculator](/calculators/vat-tax).`,
    contentAr: `أدخلت عُمان ضريبة القيمة المضافة بنسبة 5% في أبريل 2021، تديرها هيئة الضرائب العُمانية (OTA).

**أساسيات الفوترة الضريبية في عُمان**

المعدل: 5%. حد التسجيل: 38,500 ريال عُماني (إلزامي). الريال العُماني يستخدم 3 منازل عشرية.

**الحقول الإلزامية**

"فاتورة ضريبية"؛ اسم المورد ورقمه الضريبي؛ بيانات العميل؛ وصف السلع؛ مبلغ الضريبة والإجمالي بالريال العُماني. أنشئ فاتورتك العُمانية مجاناً عبر [مولّد الفواتير](/invoice) واحسب الضريبة عبر [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax).`,
  },

  {
    slug: "invoice-generator-nigeria",
    titleEn: "Free Invoice Generator for Nigeria (NGN) — English Invoice Template (2026)",
    titleAr: "منشئ فواتير مجاني لنيجيريا (نيرة نيجيرية) — قالب فاتورة إنجليزي (2026)",
    excerptEn: "Nigeria invoicing in 2026: NGN currency, 7.5% VAT (FIRS), mandatory fields for FIRS compliance, and free professional PDF export.",
    excerptAr: "الفوترة في نيجيريا 2026: النيرة النيجيرية، ضريبة القيمة المضافة 7.5% (FIRS)، الحقول الإلزامية والامتثال لمعايير FIRS.",
    date: "2026-06-21",
    readTime: 5,
    category: "invoices",
    keywordEn: "Nigeria invoice generator",
    keywordAr: "منشئ فواتير نيجيريا",
    relatedSlugs: ["how-to-write-professional-invoice", "first-invoice-checklist", "invoice-payment-terms-guide"],
    contentEn: `Nigeria is Africa's largest economy, with a dynamic SME sector. The Federal Inland Revenue Service (FIRS) administers VAT at 7.5% (reduced from 15% in 2020), and proper invoicing is required for compliance.

**Nigeria VAT basics**

Rate: 7.5% (Finance Act 2020). Authority: Federal Inland Revenue Service (FIRS — firs.gov.ng). VAT registration threshold: NGN 25 million in annual turnover. Exemptions: basic food items, medical and pharmaceutical products, educational materials, exported goods and services.

**Mandatory invoice fields for Nigeria**

Every invoice in Nigeria should include: your business name, address, and TIN (Tax Identification Number); the customer's name and address; invoice date and unique invoice number; description of goods or services; quantity, unit price, and subtotal; VAT amount (7.5%) clearly shown; and the total amount in NGN. For VAT-registered businesses, the VAT line is mandatory.

**Currency note**

The Naira (NGN) has experienced significant depreciation in recent years. When invoicing international clients from Nigeria, consider whether to invoice in NGN or agree on a hard-currency equivalent to avoid exchange rate disputes at payment time. Use the [currency exchange calculator](/calculators/currency-exchange) to convert between NGN and hard currencies, and create FIRS-ready invoices for free with the [invoice generator](/invoice).`,
    contentAr: `نيجيريا أكبر اقتصاد في أفريقيا. تدير الهيئة الاتحادية لإيرادات الدخل الداخلية (FIRS) ضريبة القيمة المضافة بنسبة 7.5%.

**أساسيات الفوترة في نيجيريا**

المعدل: 7.5%. حد التسجيل: 25 مليون نيرة نيجيرية سنوياً. الإعفاءات: الأغذية الأساسية، الأدوية، المواد التعليمية، الصادرات. أنشئ فاتورتك النيجيرية مجاناً عبر [مولّد الفواتير](/invoice) وحوّل العملات عبر [حاسبة أسعار الصرف](/calculators/currency-exchange).`,
  },

  {
    slug: "invoice-generator-iraq",
    titleEn: "Free Invoice Generator for Iraq (IQD & USD) — Arabic & English (2026)",
    titleAr: "منشئ فواتير مجاني للعراق (دينار عراقي ودولار) — عربي وإنجليزي (2026)",
    excerptEn: "Iraq invoicing in 2026: dual IQD/USD pricing, no VAT currently in effect, bilingual Arabic-English format, and practical tips for international transactions.",
    excerptAr: "الفوترة في العراق 2026: التسعير بالدينار العراقي والدولار، لا ضريبة قيمة مضافة حالياً، التنسيق ثنائي اللغة وتوصيات للمعاملات الدولية.",
    date: "2026-06-20",
    readTime: 5,
    category: "invoices",
    keywordEn: "Iraq invoice generator",
    keywordAr: "منشئ فواتير العراق",
    relatedSlugs: ["invoice-generator-jordan", "how-to-write-professional-invoice", "proforma-invoice-vs-commercial-invoice"],
    contentEn: `Iraq has a large and growing private sector, particularly in construction, oil services, telecommunications, and trade. As of 2026, Iraq does not have a general VAT system in effect, simplifying invoicing — but professional, well-structured invoices remain essential for B2B credibility.

**Iraq invoicing basics**

Currency: Iraqi Dinar (IQD). US Dollar (USD) is also widely used in B2B transactions, especially in the energy sector and international trade. Most large commercial invoices in Iraq are quoted in USD and paid via bank transfer. When invoicing in IQD, use the official exchange rate from the Central Bank of Iraq.

**Mandatory fields for Iraq**

Business name and address; national company registration number; customer name and address; invoice date and number; description of goods or services in Arabic and/or English; quantities, unit prices, and totals; payment terms; and bank details (including IBAN for international payments).

**Practical tips for invoicing in Iraq**

Always include both Arabic and English versions of the invoice for government and large corporate clients. For oil sector contracts, invoices typically follow international formats and may require additional documentation (purchase orders, delivery notes). Bank transfers are the dominant payment method — always include full bank details including SWIFT and IBAN. Generate bilingual Iraqi invoices for free with the [invoice generator](/invoice), and convert between IQD and USD with the [currency exchange calculator](/calculators/currency-exchange).`,
    contentAr: `العراق يمتلك قطاعاً خاصاً كبيراً ومتنامياً، لا سيما في البناء وخدمات النفط والاتصالات والتجارة. اعتباراً من 2026، لا يوجد في العراق نظام ضريبة قيمة مضافة عام سارٍ.

**أساسيات الفوترة في العراق**

العملة: الدينار العراقي (IQD)، ويُستخدم الدولار الأمريكي على نطاق واسع في المعاملات التجارية الكبيرة. عادةً ما تُحرَّر الفواتير التجارية الكبيرة بالدولار.

**نصائح عملية**

دائماً ادرج نسخة عربية وإنجليزية للعملاء الحكوميين والمؤسسات الكبيرة. للتحويلات الدولية، ادرج SWIFT وIBAN. أنشئ فواتير ثنائية اللغة مجاناً عبر [مولّد الفواتير](/invoice) وحوّل بين الدينار والدولار عبر [حاسبة أسعار الصرف](/calculators/currency-exchange).`,
  },

  {
    slug: "invoice-generator-morocco",
    titleEn: "Free Invoice Generator for Morocco (MAD) — Arabic & French (2026)",
    titleAr: "منشئ فواتير مجاني للمغرب (درهم مغربي) — عربي وفرنسي (2026)",
    excerptEn: "Morocco invoicing in 2026: MAD currency, 20% standard VAT (DGI), mandatory fields, bilingual Arabic-French format, and free PDF export.",
    excerptAr: "الفوترة في المغرب 2026: الدرهم المغربي، ضريبة القيمة المضافة 20% (DGI)، الحقول الإلزامية، التنسيق العربي الفرنسي.",
    date: "2026-06-19",
    readTime: 6,
    category: "invoices",
    keywordEn: "Morocco invoice generator",
    keywordAr: "منشئ فواتير المغرب",
    relatedSlugs: ["vat-registration-gcc-countries", "how-to-write-professional-invoice", "invoice-generator-nigeria"],
    contentEn: `Morocco has a sophisticated tax system administered by the General Directorate of Taxes (DGI — tax.gov.ma). VAT is applied at multiple rates depending on the product or service category, with the standard rate at 20%.

**Morocco VAT rates**

Standard rate: 20%. Reduced rates: 14% (electricity, transport), 10% (hotels, restaurants, banking services, certain food items), 7% (water, medicines). Zero rate: exports and international services. Registration threshold: MAD 500,000 in annual turnover for the standard regime. Work out any of these rates instantly with the free [VAT calculator](/calculators/vat-tax).

**Mandatory invoice fields in Morocco**

DGI-compliant invoices must include: "Facture" or "فاتورة" label; supplier's name, address, and tax identification number (ICE — Identifiant Commun de l'Entreprise); customer's name and address; customer's ICE (for B2B); invoice date and sequential number; description of goods or services; unit price, quantity, and net amount; applicable VAT rate and amount; and the total including VAT in MAD.

**Language conventions**

Morocco is officially bilingual (Arabic and French), with French dominating formal business communication. Government entities often require bilingual Arabic-French documentation. For international clients, English versions alongside the French original are acceptable. [Xuvilo's invoice generator](/invoice) supports MAD currency with bilingual output.`,
    contentAr: `المغرب يمتلك نظاماً ضريبياً متطوراً تديره المديرية العامة للضرائب (DGI). تُطبَّق ضريبة القيمة المضافة بمعدلات متعددة.

**معدلات ضريبة القيمة المضافة في المغرب**

المعدل القياسي: 20%. المعدلات المخفضة: 14%، 10%، 7%. معدل الصفر: الصادرات والخدمات الدولية.

**اللغة في الفوترة**

المغرب ثنائي اللغة رسمياً (العربية والفرنسية). الفرنسية تهيمن على الاتصالات التجارية الرسمية. يدعم [مولّد فواتير Xuvilo](/invoice) الدرهم المغربي مع مخرجات ثنائية اللغة، ويمكنك حساب أي معدل ضريبي عبر [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax).`,
  },

  {
    slug: "business-document-templates-guide",
    titleEn: "Business Document Templates: When to Use Each and How to Customize Them",
    titleAr: "قوالب المستندات التجارية: متى تستخدم كل منها وكيف تخصّصها",
    excerptEn: "Invoice templates, quotation templates, receipt templates — what makes a good template, how to pick the right design for your industry, and Xuvilo's library of 320+.",
    excerptAr: "قوالب الفواتير وعروض الأسعار والإيصالات — ما الذي يجعل القالب جيداً، كيف تختار التصميم المناسب لقطاعك، ومكتبة Xuvilo التي تضم أكثر من 320 قالباً.",
    date: "2026-06-18",
    readTime: 5,
    category: "tips",
    keywordEn: "business document templates",
    keywordAr: "قوالب المستندات التجارية",
    relatedSlugs: ["how-to-write-professional-invoice", "quotation-best-practices", "first-invoice-checklist"],
    contentEn: `Templates save time, ensure consistency, and project professionalism. But not all templates are created equal — and using the wrong one for your industry or client type can undermine the impression you're trying to create.

**Types of business document templates**

Invoice templates: for requesting payment after delivering goods or services. Look for templates with clear line-item tables, a prominent total, payment details section, and space for your logo and branding.

Quotation templates: for proposing work before it's agreed. Need a validity period, clear scope section, and acceptance line for client signature.

Receipt templates: for confirming payment received. Should clearly show "PAID" or "RECEIPT," the payment method, date received, and a reconciliation to the original invoice number.

**How to choose the right template for your industry**

Construction and contracting: use templates with a project/PO number field, site address, and milestone or phase breakdown. Professional services (consulting, legal, accounting): simpler, text-heavy templates with detailed description lines. Creative services (design, photography, media): templates with your brand and portfolio-quality presentation. Retail and wholesale: templates with product code, description, unit price, and quantity fields.

**Template customization checklist**

Before using a template, ensure: your logo and business color scheme are applied; your legal entity name (not a nickname) appears; your address and contact information are accurate; you have a field for your VAT/TIN number if applicable; the currency and decimal format match your market.

Xuvilo's library of 320+ templates covers these categories for [invoices](/invoice), [quotations](/quotation), and [receipts](/receipt), available in Arabic and English with instant PDF export.`,
    contentAr: `القوالب توفر الوقت وتضمن الاتساق وتُعطي انطباعاً احترافياً. لكن ليست كل القوالب متساوية.

**أنواع قوالب المستندات التجارية**

قوالب الفواتير: لطلب الدفع. قوالب عروض الأسعار: لاقتراح العمل. قوالب الإيصالات: لتأكيد استلام الدفع.

**اختيار القالب المناسب لقطاعك**

البناء والمقاولات: قوالب بحقل رقم المشروع وتفصيل المراحل. الخدمات المهنية: قوالب أبسط بأسطر وصف مفصّلة. الخدمات الإبداعية: قوالب تعكس هوية علامتك التجارية. التجزئة والجملة: قوالب برموز المنتجات والكميات.

تضم مكتبة Xuvilo أكثر من 320 قالباً تغطي هذه الفئات [للفواتير](/invoice) و[عروض الأسعار](/quotation) و[الإيصالات](/receipt)، متاحة بالعربية والإنجليزية.`,
  },

  {
    slug: "withholding-tax-saudi-arabia",
    titleEn: "Withholding Tax in Saudi Arabia for Foreign Contractors (2026 Guide)",
    titleAr: "ضريبة الاستقطاع في المملكة العربية السعودية للمقاولين الأجانب (دليل 2026)",
    excerptEn: "Saudi Arabia's withholding tax rates for non-resident payments: dividends (5%), royalties (15%), services (20%), and how to reflect them on your invoices.",
    excerptAr: "معدلات ضريبة الاستقطاع السعودية على المدفوعات لغير المقيمين: أرباح 5%، حقوق ملكية 15%، خدمات 20%.",
    date: "2026-06-17",
    readTime: 7,
    category: "taxes",
    keywordEn: "withholding tax Saudi Arabia foreign contractors",
    keywordAr: "ضريبة الاستقطاع المملكة العربية السعودية",
    relatedSlugs: ["vat-registration-gcc-countries", "zatca-invoice-saudi", "vat-calculator-saudi-arabia"],
    contentEn: `Withholding tax (WHT) in Saudi Arabia is a significant cost consideration for non-resident companies and individuals providing services or receiving payments from Saudi entities. Failure to account for WHT leads to unexpected deductions from your invoice total and can complicate cash flow planning.

**What is withholding tax?**

Withholding tax is a tax collected at source — the Saudi payer deducts it from the payment and remits it to ZATCA on behalf of the non-resident recipient. The non-resident receives the invoice amount minus the WHT deduction.

**Key WHT rates in Saudi Arabia (as of 2026)**

Services (technical, management, consulting, engineering): 20%
Royalties (intellectual property, patents, trademarks): 15%
Dividends (paid to non-resident shareholders): 5%
Interest on loans: 5%
Insurance and reinsurance premiums: 5%
Air and sea freight: 5%
International telecommunication services: 15%

Note: these rates may be reduced under a Double Taxation Treaty (DTT) if Saudi Arabia has one with the recipient's country of tax residence. Saudi Arabia has DTTs with many countries including UAE, Egypt, UK, and several EU nations.

**How WHT affects your invoicing**

When you invoice a Saudi client as a non-resident, your full invoice amount may be subject to WHT. Example: Invoice $10,000 for consulting services. WHT rate 20%. Saudi client pays $8,000 and remits $2,000 to ZATCA. Your effective receipt: $8,000. Factor this into your pricing if you bear the WHT cost, or specify in your contract that amounts are "gross of any WHT obligations." Note that WHT is separate from VAT — use the free [VAT calculator](/calculators/vat-tax) for VAT amounts, and create professional invoices for your Saudi clients with the [invoice generator](/invoice).`,
    contentAr: `ضريبة الاستقطاع في المملكة العربية السعودية اعتبار تكلفة مهم للشركات وغير المقيمين الذين يقدمون خدمات أو يستلمون مدفوعات من جهات سعودية.

**معدلات ضريبة الاستقطاع الرئيسية في السعودية (2026)**

الخدمات (تقنية، إدارية، استشارية، هندسية): 20%
حقوق الملكية الفكرية: 15%
توزيعات الأرباح: 5%
الفوائد على القروض: 5%

**كيف تؤثر على فواتيرك**

عند فوترة عميل سعودي كغير مقيم، قد يخضع مبلغ فاتورتك الكامل لضريبة الاستقطاع. مثال: فاتورة بـ10,000 دولار خدمات استشارية × 20% = يدفع العميل 8,000 دولار ويحوّل 2,000 دولار لـ ZATCA. احسب مبالغ ضريبة القيمة المضافة عبر [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax) وأنشئ فواتيرك عبر [مولّد الفواتير](/invoice).`,
  },

  {
    slug: "employee-total-cost-calculation",
    titleEn: "How to Calculate the True Total Cost of Employment — GCC Guide",
    titleAr: "كيف تحسب التكلفة الحقيقية الإجمالية للتوظيف — دليل دول الخليج",
    excerptEn: "Beyond the salary: how to calculate the real cost of hiring including GOSI, allowances, end-of-service, visas, and medical insurance for GCC employers.",
    excerptAr: "ما وراء الراتب: كيف تحسب التكلفة الحقيقية للتوظيف شاملةً GOSI والبدلات ومكافأة نهاية الخدمة والتأشيرات والتأمين الصحي.",
    date: "2026-06-16",
    readTime: 7,
    category: "business",
    keywordEn: "total cost of employment GCC",
    keywordAr: "التكلفة الإجمالية للتوظيف الخليج",
    relatedSlugs: ["break-even-analysis-guide", "cash-flow-management-freelancers", "financial-ratios-small-business"],
    contentEn: `When a GCC employer says they are paying an employee SAR 10,000 per month, the actual cost to the business is almost always significantly higher. Understanding the true total cost of employment is essential for accurate budgeting, workforce planning, and profitability analysis.

**Components of total employment cost in Saudi Arabia**

Basic salary: the base before any allowances.
Housing allowance: typically 25–40% of basic salary. Standard is SAR 2,000–4,000/month for most roles.
Transportation allowance: typically SAR 400–1,000/month.
Medical insurance: mandatory for all employees in KSA. Cost varies by provider, coverage, and age: typically SAR 2,000–8,000/year per employee.
GOSI (General Organization for Social Insurance): For Saudi nationals, the employer pays 9% (General Hazard Fund) plus 2% (Work Injury Branch) = 11% of basic salary. For expatriates: employer pays 2% (Work Injury only).
End-of-service gratuity provision: Saudi Labor Law requires one month's salary for each of the first five years and one-and-a-half months for each year after that. Prudent employers provision this monthly: (basic + allowances) × 1/12 per month.
Visa and Iqama fees (expatriates): Iqama renewal (approx. SAR 650/year), work visa fees (SAR 2,000–4,000 initial), and Nitaqat levy fees for expatriate employees.

**Quick total employment cost formula (KSA)**

Basic salary + Allowances + 11% GOSI (Saudi) or 2% (expat) + Medical Insurance + End-of-Service Provision (1/12 monthly) + Annual Visa/Iqama Costs ÷ 12

A SAR 10,000/month basic salary employee in Saudi Arabia typically costs the employer SAR 15,000–18,000 per month in total. Calculate the full cost for your own team with the free [employee cost calculator](/calculators/salary-cost), plus the [overtime calculator](/calculators/overtime) and [leave balance calculator](/calculators/leave-balance) for day-to-day HR sums.`,
    contentAr: `عندما يقول صاحب عمل خليجي إنه يدفع راتباً شهرياً، فإن التكلفة الفعلية للشركة عادةً ما تكون أعلى بشكل ملحوظ.

**مكونات تكلفة التوظيف في السعودية**

الراتب الأساسي + بدل السكن (25-40% من الأساسي) + بدل النقل + التأمين الصحي (إلزامي) + GOSI (11% للسعوديين، 2% للمغتربين) + مخصص مكافأة نهاية الخدمة (1/12 شهرياً) + رسوم التأشيرة والإقامة.

**مثال سريع**: موظف براتب أساسي 10,000 ريال سعودي يكلّف صاحب العمل عادةً 15,000-18,000 ريال شهرياً بإجمالي التكاليف. احسب تكلفة موظفيك عبر [حاسبة تكلفة الموظف](/calculators/salary-cost) و[حاسبة العمل الإضافي](/calculators/overtime) المجانيتين.`,
  },

  {
    slug: "currency-risk-mena-businesses",
    titleEn: "Currency Risk Management for MENA Businesses — Practical Guide (2026)",
    titleAr: "إدارة مخاطر العملة للشركات في منطقة الشرق الأوسط وشمال أفريقيا (2026)",
    excerptEn: "How exchange rate volatility affects your margins, invoicing in hard currencies, forward contracts, natural hedging — practical strategies for SMEs with international exposure.",
    excerptAr: "كيف تؤثر تقلبات أسعار الصرف على هوامشك، الفوترة بالعملات الصعبة، العقود الآجلة، التحوط الطبيعي — استراتيجيات عملية للشركات.",
    date: "2026-06-15",
    readTime: 7,
    category: "business",
    keywordEn: "currency risk management MENA businesses",
    keywordAr: "إدارة مخاطر العملة الشرق الأوسط شمال أفريقيا",
    relatedSlugs: ["financial-ratios-small-business", "landed-cost-international-shipping", "vat-registration-gcc-countries"],
    contentEn: `Currency risk — also called foreign exchange (FX) risk — affects any business that buys, sells, borrows, or lends in more than one currency. For MENA businesses, this is common: importers pay suppliers in USD or EUR, while their revenues come in local currency; exporters may invoice in USD but pay local costs in local currency.

**Types of currency risk**

Transaction risk: the risk that exchange rates move between the date you agree a deal and the date you settle it. Example: you agree to pay a Chinese supplier $50,000 in 90 days. If your local currency weakens 10% against USD in that time, you need 10% more local currency to pay the same invoice.

Translation risk: for businesses with foreign subsidiaries, assets and liabilities denominated in foreign currency change in value on the balance sheet when rates move.

Economic risk: a sustained shift in exchange rates changes your competitive position. If a competitor's costs are in a stronger currency, they become relatively cheaper.

**Practical hedging strategies for SMEs**

Invoice in hard currencies: for export businesses, invoicing in USD or EUR instead of a volatile local currency transfers the FX risk to your buyer.
Match revenues and costs in the same currency: if you earn USD from international clients and pay USD for imported inputs, your net FX exposure is lower.
Forward contracts: agree today to buy or sell a currency at a fixed rate on a future date. Banks and FX brokers offer these. Typically available for 1–12 month maturities.
Natural hedging through pricing reviews: build a periodic pricing review into your contracts that adjusts for significant FX moves (e.g. a ±10% clause).

**For GCC-pegged currency businesses**

Saudi Arabia, UAE, Qatar, Bahrain, and Oman all peg their currencies to the USD at fixed rates. This eliminates USD/GCC currency risk for businesses that operate in the GCC and invoice in USD. The primary FX risk for these businesses is exposure to EUR, GBP, CNY, or other currencies. Check conversion amounts with the free [currency exchange calculator](/calculators/currency-exchange), and issue multi-currency invoices with the [invoice generator](/invoice).`,
    contentAr: `مخاطر العملة تؤثر على أي شركة تشتري أو تبيع أو تقترض بأكثر من عملة. بالنسبة للشركات في منطقة الشرق الأوسط، هذا أمر شائع.

**استراتيجيات التحوط العملية للشركات الصغيرة**

الفوترة بالعملات الصعبة: للشركات المُصدِّرة، الفوترة بالدولار أو اليورو تنقل مخاطر العملة للمشتري.
مطابقة الإيرادات والتكاليف بنفس العملة: يُقلّل من صافي التعرض لمخاطر العملة.
العقود الآجلة: الاتفاق على شراء أو بيع عملة بسعر ثابت في تاريخ مستقبلي.
المراجعة الدورية للأسعار: ادرج بنداً في عقودك يسمح بتعديل الأسعار عند تقلبات العملة الكبيرة. احسب التحويلات عبر [حاسبة أسعار الصرف](/calculators/currency-exchange) وأصدر فواتير بعملات متعددة عبر [مولّد الفواتير](/invoice).`,
  },

  {
    slug: "egypt-corporate-tax-2026",
    titleEn: "Egypt Corporate Tax Rate and Filing Requirements (2026 Guide)",
    titleAr: "معدل ضريبة الشركات في مصر ومتطلبات الإيداع (دليل 2026)",
    excerptEn: "Egypt's corporate income tax at 22.5%, e-invoice mandate (ETA), annual filing deadlines, and what SMEs need to know to stay compliant in 2026.",
    excerptAr: "ضريبة الدخل على الشركات في مصر 22.5%، نظام الفاتورة الإلكترونية (ETA)، مواعيد الإيداع السنوية، وما يحتاج المستقلون وأصحاب الأعمال معرفته.",
    date: "2026-06-14",
    readTime: 7,
    category: "taxes",
    keywordEn: "Egypt corporate tax 2026",
    keywordAr: "ضريبة الشركات مصر 2026",
    relatedSlugs: ["vat-registration-gcc-countries", "uae-corporate-tax-guide-smes", "withholding-tax-saudi-arabia"],
    contentEn: `Egypt has one of the largest economies in the Middle East and North Africa. For businesses operating in Egypt, understanding the corporate tax system and the mandatory e-invoicing requirements is essential for compliance.

**Corporate income tax in Egypt**

The standard corporate income tax rate in Egypt is 22.5%, applicable to net profits of Egyptian companies and branches of foreign companies after allowable deductions. Sole proprietorships and partnerships are taxed at graduated personal income tax rates (0–25%).

**Egypt VAT**

Egypt applies a 14% VAT rate on most goods and services. Registration is mandatory for businesses with annual sales above EGP 500,000. The Egyptian Tax Authority (ETA) operates the tax portal (eta.gov.eg) for registration, filing, and e-invoicing. Work out 14% VAT amounts with the free [VAT calculator](/calculators/vat-tax), and track the impact of tax on your bottom line with the [profit margin calculator](/calculators/profit-margin).

**Egypt's e-invoice mandate**

Egypt implemented a mandatory e-invoicing system for large companies in 2020–2021, progressively expanding to cover all registered businesses. Under this system, every tax invoice must be submitted electronically to the ETA via the e-invoice portal before it is sent to the buyer. The ETA validates and registers each invoice and assigns a UUID. Non-compliance results in the invoice being rejected and may result in the buyer being unable to claim input VAT on the purchase.

**Annual filing deadlines**

Corporate tax returns must be filed within 4 months after the end of the fiscal year (for most companies: by April 30 for a December 31 year-end). VAT returns are filed monthly. Penalties for late filing include a minimum 1% per month surcharge on unpaid taxes.`,
    contentAr: `مصر إحدى أكبر اقتصادات منطقة الشرق الأوسط وشمال أفريقيا.

**ضريبة الدخل على الشركات في مصر**

المعدل القياسي: 22.5% على صافي الأرباح.

**ضريبة القيمة المضافة في مصر**

المعدل: 14%. حد التسجيل: 500,000 جنيه مصري سنوياً. احسب مبالغ الضريبة عبر [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax) المجانية.

**نظام الفاتورة الإلكترونية الإلزامي**

نفّذت مصر نظام الفاتورة الإلكترونية الإلزامي، يستلزم تقديم كل فاتورة ضريبية إلكترونياً لهيئة الضرائب المصرية (ETA) قبل إرسالها للمشتري. عدم الامتثال يعني رفض الفاتورة.`,
  },

  {
    slug: "how-to-calculate-vat-mixed-rate",
    titleEn: "How to Calculate VAT for Mixed-Rate Supplies — Step-by-Step Guide",
    titleAr: "كيف تحسب ضريبة القيمة المضافة للإمدادات بمعدلات مختلطة — خطوة بخطوة",
    excerptEn: "When one invoice covers standard-rated, zero-rated, and exempt supplies — how to calculate the correct VAT for each line and produce a compliant invoice.",
    excerptAr: "عندما تشمل فاتورة واحدة إمدادات بمعدلات مختلفة — كيف تحسب ضريبة القيمة المضافة الصحيحة لكل سطر.",
    date: "2026-06-13",
    readTime: 6,
    category: "taxes",
    keywordEn: "VAT mixed rate supplies calculation",
    keywordAr: "حساب ضريبة القيمة المضافة الإمدادات المختلطة",
    relatedSlugs: ["vat-registration-gcc-countries", "vat-calculator-saudi-arabia", "how-to-write-professional-invoice"],
    contentEn: `Many businesses supply a mix of goods and services that attract different VAT rates on the same invoice — some standard-rated, some zero-rated, and some exempt. Calculating and presenting these correctly is required for VAT compliance.

**Understanding VAT supply categories**

Standard-rated: VAT applies at the full rate (15% in KSA, 5% in UAE, 10% in Bahrain, etc.). The most common category for business-to-business supplies.
Zero-rated: VAT applies but at 0%. The seller doesn't charge VAT but can still reclaim input VAT on costs related to the zero-rated supply. Common examples: exports outside the GCC, international services, certain medical equipment and basic foods.
Exempt: No VAT applies. The seller cannot reclaim input VAT on costs related to exempt supplies. Common examples: basic financial services, residential property rental, local passenger transport.

**How to handle a mixed invoice**

Step 1: Identify the VAT category for each line item on the invoice.
Step 2: For each standard-rated item, calculate VAT: line amount × VAT rate.
Step 3: For zero-rated items, show the line amount with a note "Zero-rated" and VAT = 0.
Step 4: For exempt items, show the line amount with a note "Exempt" and no VAT column entry.
Step 5: Sum all VAT amounts and add to the subtotal for the total payable. The free [VAT calculator](/calculators/vat-tax) handles inclusive and exclusive amounts for any rate.

**Example (Saudi Arabia, 15% VAT)**

| Item | Net | Category | VAT | Total |
|---|---|---|---|---|
| Consulting (Jan) | SAR 5,000 | Standard | SAR 750 | SAR 5,750 |
| Export advisory | SAR 2,000 | Zero-rated | SAR 0 | SAR 2,000 |
| Total | SAR 7,000 | | SAR 750 | SAR 7,750 |

Both lines must appear on the ZATCA-compliant invoice, with the category clearly labeled. Generate compliant invoices with correct VAT lines using the free [invoice generator](/invoice).`,
    contentAr: `تُقدّم شركات كثيرة مزيجاً من السلع والخدمات التي تخضع لمعدلات ضريبية مختلفة على نفس الفاتورة.

**فئات الإمدادات الضريبية**

الإمداد الخاضع للضريبة: يُطبَّق عليه المعدل الكامل.
الإمداد بمعدل صفري: الضريبة 0% (مثل الصادرات) — يمكن استرداد ضريبة المدخلات.
الإمداد المعفى: لا تُطبَّق ضريبة (مثل الخدمات المالية الأساسية) — لا يمكن استرداد ضريبة المدخلات.

**كيف تتعامل مع فاتورة مختلطة**

حدّد فئة ضريبة القيمة المضافة لكل سطر. احسب الضريبة للإمدادات الخاضعة. أظهر "معدل صفري" أو "معفى" للبنود الأخرى. اجمع جميع مبالغ الضريبة وأضفها للإجمالي. استخدم [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax) المجانية لحساب كل بند بدقة.`,
  },

  {
    slug: "jordan-gst-guide-small-businesses",
    titleEn: "Jordan General Sales Tax (GST) Guide for Small Businesses (2026)",
    titleAr: "دليل ضريبة المبيعات العامة في الأردن للشركات الصغيرة (2026)",
    excerptEn: "Jordan's 16% General Sales Tax (GST), registration thresholds, invoice requirements, and practical guidance for Jordanian small businesses and freelancers.",
    excerptAr: "ضريبة المبيعات العامة الأردنية 16%، حدود التسجيل، متطلبات الفاتورة، وإرشادات عملية للشركات الصغيرة والمستقلين في الأردن.",
    date: "2026-06-12",
    readTime: 6,
    category: "taxes",
    keywordEn: "Jordan GST general sales tax",
    keywordAr: "ضريبة المبيعات العامة الأردن",
    relatedSlugs: ["vat-registration-gcc-countries", "invoice-generator-jordan", "how-to-write-professional-invoice"],
    contentEn: `Jordan uses a General Sales Tax (GST) system rather than VAT, administered by the Income and Sales Tax Department (ISTD). The standard rate is 16%, with reduced rates for certain goods and zero-rating for exports.

**Jordan GST basics**

Standard rate: 16%. Reduced rates: 4% on certain food items; 0% on exports. Authority: Income and Sales Tax Department (ISTD — istd.gov.jo). Registration threshold: JOD 30,000 in annual taxable sales (mandatory). Voluntary registration is possible below this threshold. Calculate 16% GST amounts instantly with the free [VAT calculator](/calculators/vat-tax).

**Goods and services exempt from Jordan GST**

Basic foodstuffs, certain medicines, educational services, financial services (banking, insurance), and goods/services consumed outside Jordan are commonly exempt or zero-rated. The ISTD publishes a detailed schedule — always verify your specific product or service category.

**Invoice requirements in Jordan**

GST-registered businesses must issue tax invoices containing: "فاتورة ضريبية" (Tax Invoice) label; seller's name, address, and GST number; buyer's name and address; buyer's GST number (for B2B registered buyers); invoice date and a unique sequential number; description of goods or services; quantity, unit price, net amount, GST amount; and total amount in JOD.

**Currency note**

The Jordanian Dinar (JOD) is pegged to the USD at 0.709 JOD = 1 USD. It uses 3 decimal places (fils). Use [Xuvilo's invoice generator](/invoice) for JOD invoices with the correct decimal precision.`,
    contentAr: `يستخدم الأردن نظام ضريبة المبيعات العامة (GST) بنسبة 16%، تديرها دائرة ضريبة الدخل والمبيعات (ISTD).

**أساسيات GST الأردنية**

المعدل القياسي: 16%. حد التسجيل الإلزامي: 30,000 دينار أردني.

**متطلبات الفاتورة في الأردن**

"فاتورة ضريبية"؛ اسم البائع وعنوانه ورقم التسجيل في GST؛ بيانات المشتري؛ تاريخ الفاتورة ورقم تسلسلي؛ وصف السلع؛ مبلغ GST؛ الإجمالي بالدينار الأردني (3 منازل عشرية). أنشئ فواتيرك الأردنية عبر [مولّد الفواتير](/invoice) واحسب الضريبة عبر [حاسبة ضريبة القيمة المضافة](/calculators/vat-tax) المجانية.`,
  },

];



export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slugs: string[]): BlogPost[] {
  return slugs
    .map((s) => getBlogPost(s))
    .filter((p): p is BlogPost => Boolean(p));
}
