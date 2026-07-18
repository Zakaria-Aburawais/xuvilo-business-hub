import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import { ShieldCheck, BookOpen, RefreshCw, Users, AlertCircle, Mail } from "lucide-react";

export default function EditorialPolicyPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  const lastReviewed = "July 2026";
  const lastReviewedAr = "يوليو 2026";

  return (
    <AppLayout>
      <SEOHead
        title={
          isAR
            ? "السياسة التحريرية — Xuvilo Business Hub"
            : "Editorial Policy — Xuvilo Business Hub"
        }
        description={
          isAR
            ? "تعرّف على كيفية إنشاء محتوى Xuvilo ومراجعته والحفاظ على دقته. معايير تحريرية، مصادر موثوقة، وسياسة التحديث المنتظم."
            : "Learn how Xuvilo creates, reviews, and maintains accurate content. Editorial standards, trusted sources, regular update policy, and our commitment to factual accuracy."
        }
        path="/editorial-policy"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="mb-10">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
            {isAR ? "السياسة التحريرية" : "Editorial Policy"}
          </p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "كيف نُنشئ محتوانا ونراجعه" : "How We Create and Review Our Content"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            {isAR
              ? "يلتزم فريق Xuvilo بتقديم معلومات دقيقة وعملية وموثوقة للشركات الصغيرة والمستقلين في منطقة الشرق الأوسط وشمال أفريقيا والعالم."
              : "The Xuvilo team is committed to providing accurate, practical, and trustworthy information for small businesses and freelancers across the Middle East, North Africa, and beyond."}
          </p>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {isAR ? `آخر مراجعة: ${lastReviewedAr}` : `Last reviewed: ${lastReviewed}`}
          </p>
        </header>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-10">

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="!mt-0 !mb-0 text-xl font-semibold text-gray-900 dark:text-white">
                {isAR ? "من يكتب المحتوى؟" : "Who Creates Our Content?"}
              </h2>
            </div>
            <p>
              {isAR
                ? "يُنشئ المحتوى على Xuvilo فريق تحريري متخصص يضم خبراء في الفواتير والضرائب والتجارة والأعمال الصغيرة في منطقة الشرق الأوسط وشمال أفريقيا. يمتلك أعضاء الفريق خبرة عملية في:"
                : "Content on Xuvilo is created by a specialist editorial team with expertise in invoicing, taxation, trade, and small business operations across the MENA region. Team members have hands-on experience in:"}
            </p>
            <ul>
              {isAR ? (
                <>
                  <li>أنظمة الفوترة الإلكترونية (ZATCA في السعودية، ETA في مصر)</li>
                  <li>ضريبة القيمة المضافة وأنظمة الضرائب في دول مجلس التعاون الخليجي</li>
                  <li>التجارة الدولية والشحن والاستيراد والتصدير</li>
                  <li>إدارة الأعمال الصغيرة والمحاسبة المالية</li>
                  <li>قوانين العمل في منطقة الخليج وشمال أفريقيا</li>
                </>
              ) : (
                <>
                  <li>E-invoicing regulations (ZATCA in Saudi Arabia, ETA in Egypt)</li>
                  <li>VAT and tax systems across GCC countries</li>
                  <li>International trade, shipping, import, and export</li>
                  <li>Small business management and financial accounting</li>
                  <li>Labor law across Gulf and North African jurisdictions</li>
                </>
              )}
            </ul>
            <p>
              {isAR
                ? "جميع المقالات تنسب إلى فريق التحرير في Xuvilo. يمكنك قراءة المزيد عن فريقنا في "
                : "All articles are attributed to the Xuvilo Editorial Team. You can learn more about our team on the "}
              <Link href="/author/xuvilo-team" className="text-blue-600 dark:text-blue-400 hover:underline">
                {isAR ? "صفحة الفريق التحريري" : "editorial team page"}
              </Link>
              {isAR ? "." : "."}
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="!mt-0 !mb-0 text-xl font-semibold text-gray-900 dark:text-white">
                {isAR ? "معايير الدقة والتحقق" : "Accuracy and Verification Standards"}
              </h2>
            </div>
            <p>
              {isAR
                ? "نلتزم بالمعايير التالية لضمان دقة المحتوى:"
                : "We follow these standards to ensure content accuracy:"}
            </p>
            <ul>
              {isAR ? (
                <>
                  <li><strong>المصادر الأولية أولاً:</strong> نستند إلى المصادر الرسمية — هيئات الضرائب، الجهات التنظيمية، والتشريعات المعتمدة — وليس المصادر الثانوية.</li>
                  <li><strong>المراجعة المتقاطعة:</strong> تُراجَع الأرقام الرئيسية (معدلات الضرائب، متطلبات الفوترة) من قِبل أكثر من عضو في الفريق.</li>
                  <li><strong>التمييز الواضح بين الحقائق والتقديرات:</strong> نُشير بوضوح إلى المعلومات التقريبية أو الخاضعة للتغيير.</li>
                  <li><strong>إخلاء المسؤولية المناسب:</strong> نُوضّح دائماً أن محتوانا لأغراض تعليمية، وليس بديلاً عن المشورة المهنية.</li>
                </>
              ) : (
                <>
                  <li><strong>Primary sources first:</strong> We cite official sources — tax authorities, regulatory bodies, and enacted legislation — not secondary interpretations.</li>
                  <li><strong>Cross-verification:</strong> Key figures (tax rates, invoicing requirements, labor law specifics) are verified by more than one team member before publication.</li>
                  <li><strong>Clear fact vs. estimate labeling:</strong> We clearly indicate when information is approximate, estimated, or subject to change.</li>
                  <li><strong>Appropriate disclaimers:</strong> We always clarify that our content is for educational purposes and is not a substitute for professional legal, tax, or financial advice.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="!mt-0 !mb-0 text-xl font-semibold text-gray-900 dark:text-white">
                {isAR ? "مصادرنا الموثوقة" : "Our Trusted Sources"}
              </h2>
            </div>
            <p>
              {isAR
                ? "يُشير محتوانا إلى المصادر الرسمية والموثوقة التالية:"
                : "Our content draws on the following official and authoritative sources:"}
            </p>
            <ul>
              {isAR ? (
                <>
                  <li>هيئة الزكاة والضريبة والجمارك (ZATCA) — المملكة العربية السعودية</li>
                  <li>هيئة الضرائب الاتحادية (FTA) — الإمارات العربية المتحدة</li>
                  <li>المصلحة العامة للضرائب (ETA) — مصر</li>
                  <li>هيئة الضريبة الوطنية — البحرين، عُمان، الكويت، الأردن</li>
                  <li>وزارات العمل في دول مجلس التعاون الخليجي وشمال أفريقيا</li>
                  <li>قاعدة بيانات InfoEuro للمفوضية الأوروبية (أسعار الصرف)</li>
                  <li>البنك الدولي ومؤتمر الأمم المتحدة للتجارة والتنمية (UNCTAD) للبيانات التجارية</li>
                </>
              ) : (
                <>
                  <li>Zakat, Tax and Customs Authority (ZATCA) — Saudi Arabia</li>
                  <li>Federal Tax Authority (FTA) — UAE</li>
                  <li>Egyptian Tax Authority (ETA) — Egypt</li>
                  <li>National tax and revenue authorities in Bahrain, Oman, Kuwait, Jordan</li>
                  <li>Ministries of Labor across GCC and North African countries</li>
                  <li>European Commission InfoEuro database (exchange rates)</li>
                  <li>World Bank and UNCTAD for international trade data</li>
                  <li>IATA and carrier-published guidelines for freight and shipping figures</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="!mt-0 !mb-0 text-xl font-semibold text-gray-900 dark:text-white">
                {isAR ? "سياسة التحديث" : "Update Policy"}
              </h2>
            </div>
            <p>
              {isAR
                ? "تتغير اللوائح الضريبية وقوانين العمل والمتطلبات التنظيمية باستمرار. نلتزم بما يلي:"
                : "Tax regulations, labor laws, and regulatory requirements change. We are committed to:"}
            </p>
            <ul>
              {isAR ? (
                <>
                  <li><strong>المراجعة الدورية:</strong> تُراجَع الصفحات ذات المحتوى المرتبط بالتشريعات والضرائب مرة واحدة على الأقل كل ثلاثة أشهر.</li>
                  <li><strong>التحديث الفوري:</strong> تُحدَّث المعلومات فور حدوث تغييرات تشريعية كبرى (كتغيير معدلات الضريبة أو اشتراطات الفوترة).</li>
                  <li><strong>توضيح تواريخ المراجعة:</strong> تعرض صفحات SEO ومقالات المدونة تاريخ "آخر مراجعة" ليعرف القارئ مدى حداثة المعلومات.</li>
                  <li><strong>علامات TODO:</strong> عندما تتطلب معلومات قانونية أو ضريبية التحقق من مصادر أولية محلية، نُشير بوضوح إلى الحاجة للتحقق.</li>
                </>
              ) : (
                <>
                  <li><strong>Scheduled reviews:</strong> Pages with regulatory or tax-sensitive content are reviewed at least once every three months.</li>
                  <li><strong>Event-driven updates:</strong> Content is updated promptly when major regulatory changes occur (e.g. tax rate changes, new invoicing mandates).</li>
                  <li><strong>Visible review dates:</strong> SEO pages and blog articles display a "Last reviewed" date so readers know how current the information is.</li>
                  <li><strong>Verification markers:</strong> When legal or tax information requires verification against primary local sources, we clearly mark this for transparency.</li>
                </>
              )}
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="!mt-0 !mb-0 text-xl font-semibold text-gray-900 dark:text-white">
                {isAR ? "إخلاء المسؤولية المهنية" : "Professional Advice Disclaimer"}
              </h2>
            </div>
            <p>
              {isAR
                ? "تُقدّم Xuvilo محتواها لأغراض تعليمية وإعلامية فقط. لا يُشكّل أيّ محتوى على هذه المنصة — بما في ذلك المقالات وأدوات الحاسبات والقوالب — مشورة قانونية أو ضريبية أو محاسبية أو مالية."
                : "Xuvilo provides its content for educational and informational purposes only. No content on this platform — including articles, calculator tools, and templates — constitutes legal, tax, accounting, or financial advice."}
            </p>
            <p>
              {isAR
                ? "تتغير المعدلات الضريبية وقوانين العمل ومتطلبات الفوترة. يُرجى دائماً التحقق من المعلومات ذات الصلة بالتشريعات مع المصادر الرسمية أو استشارة مختص مؤهّل (محاسب أو مستشار قانوني) قبل اتخاذ قرارات تجارية مهمة. راجع "
                : "Tax rates, labor laws, and invoicing requirements change. Always verify regulatory information with official sources or consult a qualified professional (accountant or legal adviser) before making significant business decisions. See our "}
              <Link href="/disclaimer" className="text-blue-600 dark:text-blue-400 hover:underline">
                {isAR ? "صفحة إخلاء المسؤولية الكاملة" : "full disclaimer page"}
              </Link>
              {isAR ? " للاطلاع على التفاصيل." : " for full details."}
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="!mt-0 !mb-0 text-xl font-semibold text-gray-900 dark:text-white">
                {isAR ? "الإبلاغ عن أخطاء في المحتوى" : "Reporting Content Errors"}
              </h2>
            </div>
            <p>
              {isAR
                ? "إذا وجدت خطأً في أيٍّ من محتوانا — سواء أكان معلومة قديمة أم رقمًا خاطئًا أم ادّعاءً غير دقيق — يُرجى إخبارنا فوراً."
                : "If you spot an error in any of our content — outdated information, a wrong figure, or an inaccurate claim — please let us know immediately."}
            </p>
            <p>
              {isAR ? "تواصل معنا عبر " : "Contact us via "}
              <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
                {isAR ? "صفحة التواصل" : "our contact page"}
              </Link>
              {isAR
                ? " أو راسلنا على editorial@xuvilo.com. نهدف إلى الرد على جميع تقارير الأخطاء خلال 48 ساعة عمل وتصحيح المحتوى الموثّق خلال أسبوع."
                : " or email us at editorial@xuvilo.com. We aim to respond to all error reports within 48 business hours and correct verified content within one week."}
            </p>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
