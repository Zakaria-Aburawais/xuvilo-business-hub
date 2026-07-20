// Single source of truth for the /faq page content.
//
// Consumed in three places that MUST stay in sync for valid FAQ rich results:
//   1. FAQ.tsx — the visible accordion + client-side FAQPage JSON-LD
//   2. server.ts STATIC_HTML["/faq"] — the no-JS SSR fallback markup
//   3. server.ts getJsonLdForPath("/faq") — the SSR FAQPage JSON-LD
//
// Answers are PLAIN TEXT (no HTML) because they are rendered as text in the
// accordion and embedded verbatim in JSON-LD.

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_EN: FaqItem[] = [
  { q: "What is Xuvilo?", a: "Xuvilo is a free business tools platform that helps small businesses and freelancers create invoices, quotations, receipts, and use specialized business calculators — in both Arabic and English." },
  { q: "Is Xuvilo free to use?", a: "Yes. All core tools are completely free — no account, no credit card, no time limit. Create invoices, quotations, and receipts, use all 14 calculators, and access 320+ templates at no cost. Saving documents to your account is also free." },
  { q: "Can I create invoices online?", a: "Yes. Our invoice generator lets you create a professional invoice in minutes with multi-currency support, automatic tax calculation, and PDF export." },
  { q: "Can I create quotations online?", a: "Yes. Our quotation generator supports validity dates, terms and conditions, and every field you need to send a polished quote to a client." },
  { q: "Can I create receipts online?", a: "Yes. You can issue payment receipts that include the payment method, amount paid, and balance owed, then export to PDF instantly." },
  { q: "Can I download documents as PDF?", a: "Yes. Every document you create can be downloaded as a high-quality print-ready PDF, or printed directly from your browser." },
  { q: "Does Xuvilo support Arabic and English?", a: "Yes. Every tool fully supports Arabic and English, including right-to-left layout for Arabic and bilingual templates. The invoice and quotation generators support 176+ international currencies including SAR, AED, EGP, LYD, JOD, KWD, QAR, OMR, BHD, USD, EUR, and GBP." },
  { q: "Can I use Xuvilo for my small business?", a: "Absolutely. Xuvilo is designed specifically for small businesses, freelancers, traders, contractors, and startups." },
  { q: "Are the calculators accurate?", a: "Our calculators use standard formulas and return accurate results based on the inputs you provide. However, exchange rates and tax rates change, so always verify with official sources before making final decisions." },
  { q: "Does Xuvilo provide tax or accounting advice?", a: "No. Xuvilo provides tools and templates only. We do not provide legal, tax, accounting, or financial advice. For important decisions, consult a qualified professional." },
  { q: "Do I need an account?", a: "You don't need an account to use our core tools. An account is only useful if you want to save documents or use paid-plan features." },
  { q: "Is there a catch — why is it all free?", a: "No catch. Our core invoicing, quotation, receipt, and calculator tools are free forever. We support the platform through Google AdSense advertising shown on some pages. An optional account lets you save and manage your documents." },
  { q: "Are the invoices ZATCA compliant?", a: "Yes. The Saudi Arabia invoice generator is designed to meet ZATCA Phase 1 requirements, including the QR code, seller details, VAT registration number, and itemised tax breakdown. Always confirm compliance with your accountant or a certified tax advisor." },
  { q: "Is my data safe?", a: "Documents are generated in your browser and we do not store invoice content unless you explicitly create an account and choose to save documents. See our Privacy Policy for details on what we collect and how we use it." },
  { q: "Which countries are supported?", a: "We have country-specific invoice generators for Saudi Arabia, the UAE, Egypt, Libya, Jordan, Kuwait, Qatar, Oman, Bahrain, Iraq, Syria, Lebanon, Morocco, Algeria, Tunisia, and 40+ other markets. The full list is on our countries page." },
  { q: "How do I contact support?", a: "Email support@xuvilo.com and we will reply within one business day. You can also use the contact form on our Contact page." },
];

export const FAQ_AR: FaqItem[] = [
  { q: "ما هي Xuvilo؟", a: "Xuvilo هي منصة أدوات أعمال مجانية تساعد الشركات الصغيرة والمستقلين على إنشاء فواتير، عروض أسعار، إيصالات، واستخدام حاسبات تجارية مخصّصة باللغتين العربية والإنجليزية." },
  { q: "هل Xuvilo مجانية الاستخدام؟", a: "نعم. جميع الأدوات الأساسية مجانية تماماً — بدون حساب، بدون بطاقة ائتمانية، بدون حدود زمنية. أنشئ فواتير وعروض أسعار وإيصالات، واستخدم جميع الحاسبات الـ١٤، وصل إلى أكثر من ٣٢٠ قالباً مجاناً. حفظ المستندات في حسابك مجاني أيضاً." },
  { q: "هل يمكنني إنشاء فواتير عبر الإنترنت؟", a: "نعم. مولّد الفواتير لدينا يتيح لك إنشاء فاتورة احترافية في دقائق مع دعم العملات المتعددة، حساب الضرائب التلقائي، والتصدير إلى PDF." },
  { q: "هل يمكنني إنشاء عروض أسعار؟", a: "نعم. مولّد عروض الأسعار يدعم تواريخ الصلاحية، الشروط والأحكام، وكل الحقول التي تحتاجها لإرسال عرض احترافي للعميل." },
  { q: "هل يمكنني إنشاء إيصالات؟", a: "نعم. يمكنك إصدار إيصالات دفع تتضمن طريقة الدفع، المبلغ المدفوع، والرصيد المتبقي إن وجد، وتصديرها كـ PDF فورًا." },
  { q: "هل يمكنني تنزيل المستندات بصيغة PDF؟", a: "نعم. كل المستندات التي تنشئها يمكن تنزيلها كـ PDF بجودة طباعة عالية، أو طباعتها مباشرة من المتصفح." },
  { q: "هل تدعم Xuvilo اللغتين العربية والإنجليزية؟", a: "نعم. كل الأدوات تدعم العربية والإنجليزية بشكل كامل، بما في ذلك تخطيط من اليمين إلى اليسار للعربية، وقوالب ثنائية اللغة. يدعم مولّدا الفواتير وعروض الأسعار أكثر من ١٧٦ عملة دولية بما فيها الريال السعودي والدرهم الإماراتي والجنيه المصري والدينار الليبي والدولار واليورو." },
  { q: "هل يمكنني استخدام Xuvilo لشركتي الصغيرة؟", a: "بالتأكيد. صُمّمت Xuvilo خصيصًا للشركات الصغيرة والمستقلين والتجار والمقاولين والشركات الناشئة." },
  { q: "هل الحاسبات دقيقة؟", a: "حاسباتنا تستخدم معادلات قياسية وتعطي نتائج دقيقة بناءً على المدخلات التي تقدّمها. لكن أسعار الصرف ومعدلات الضرائب تتغير، لذا تحقق دائمًا من المصادر الرسمية قبل اتخاذ قرارات نهائية." },
  { q: "هل تقدم Xuvilo مشورة ضريبية أو محاسبية؟", a: "لا. Xuvilo توفر أدوات وقوالب فقط. لا نقدّم مشورة قانونية أو ضريبية أو محاسبية أو مالية. لقرارات مهمة، استشر متخصصًا مؤهلاً." },
  { q: "هل أحتاج إلى حساب لاستخدام Xuvilo؟", a: "لا تحتاج إلى حساب لاستخدام أدواتنا الأساسية. الحساب مفيد فقط إذا كنت تريد حفظ المستندات أو استخدام ميزات الخطة المدفوعة." },
  { q: "هل هناك خدعة — لماذا كل شيء مجاني؟", a: "لا توجد خدعة. أدوات الفواتير وعروض الأسعار والإيصالات والحاسبات مجانية للأبد. ندعم المنصة من خلال إعلانات Google AdSense التي تظهر في بعض الصفحات. الحساب الاختياري يتيح لك حفظ مستنداتك وإدارتها." },
  { q: "هل الفواتير متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)؟", a: "نعم. مولّد فواتير السعودية مصمَّم لتلبية متطلبات المرحلة الأولى من ZATCA، بما في ذلك رمز QR وبيانات البائع ورقم التسجيل الضريبي وتفصيل الضريبة لكل بند. تأكد دائمًا من التوافق مع محاسبك أو مستشار ضريبي معتمد." },
  { q: "هل بياناتي آمنة؟", a: "تُنشأ المستندات داخل متصفحك، ولا نخزّن محتوى الفواتير إلا إذا أنشأت حسابًا واخترت حفظ المستندات. راجع سياسة الخصوصية لمعرفة ما نجمعه وكيف نستخدمه." },
  { q: "ما الدول المدعومة؟", a: "لدينا مولّدات فواتير مخصّصة للسعودية والإمارات ومصر وليبيا والأردن والكويت وقطر وعُمان والبحرين والعراق وسوريا ولبنان والمغرب والجزائر وتونس وأكثر من ٤٠ سوقًا أخرى. القائمة الكاملة في صفحة الدول." },
  { q: "كيف أتواصل مع الدعم؟", a: "راسلنا على support@xuvilo.com وسنرد خلال يوم عمل واحد. يمكنك أيضًا استخدام نموذج التواصل في صفحة اتصل بنا." },
];
