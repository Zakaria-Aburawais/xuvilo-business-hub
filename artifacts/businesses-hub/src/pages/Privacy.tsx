import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "سياسة الخصوصية — Xuvilo" : "Privacy Policy — Xuvilo"}
        description={
          isAR
            ? "سياسة خصوصية Xuvilo: ما البيانات التي نجمعها، كيف نستخدمها، ملفات تعريف الارتباط، إعلانات Google AdSense، حقوقك، وكيفية التواصل معنا."
            : "Xuvilo's Privacy Policy: what data we collect, how we use it, cookies, Google AdSense advertising, your rights, and how to contact us."
        }
        path="/privacy"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>{isAR ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
          <p className="text-sm text-gray-500">{isAR ? "آخر تحديث: أبريل 2026" : "Last updated: April 2026"}</p>

          <p>
            {isAR
              ? "نحن في Xuvilo نحترم خصوصيتك ونلتزم بحماية بياناتك. توضّح هذه السياسة المعلومات التي نجمعها، وكيف نستخدمها، وحقوقك بشأنها."
              : "At Xuvilo, we respect your privacy and are committed to protecting your data. This policy explains what information we collect, how we use it, and your rights regarding it."}
          </p>

          <h2>{isAR ? "1. المعلومات التي نجمعها" : "1. Information we collect"}</h2>
          <p>{isAR ? "نجمع نوعين رئيسيين من المعلومات:" : "We collect two main types of information:"}</p>
          <ul>
            <li>
              <strong>{isAR ? "بيانات تقدّمها بنفسك:" : "Data you provide:"}</strong>{" "}
              {isAR
                ? "عند إنشاء حساب أو التواصل معنا، نجمع بيانات مثل اسمك، بريدك الإلكتروني، وأي معلومات تختار مشاركتها."
                : "When you create an account or contact us, we collect details like your name, email address, and any information you choose to share."}
            </li>
            <li>
              <strong>{isAR ? "بيانات تُجمع تلقائياً:" : "Data collected automatically:"}</strong>{" "}
              {isAR
                ? "مثل عنوان IP، نوع المتصفح، نظام التشغيل، الصفحات التي تزورها، ومدة الجلسة. تُستخدم هذه البيانات لتحسين الخدمة وقياس الأداء."
                : "Such as IP address, browser type, operating system, pages visited, and session duration. We use this to improve the service and measure performance."}
            </li>
          </ul>
          <p>
            {isAR
              ? "ملاحظة مهمة: المستندات التي تنشئها في الأدوات المجانية (الفواتير، عروض الأسعار، الإيصالات) تُعالَج داخل متصفحك ولا تُخزَّن على خوادمنا، إلا إذا اخترت حفظها صراحةً عبر حساب Xuvilo."
              : "Important: Documents you create in the free tools (invoices, quotations, receipts) are processed in your browser and are not stored on our servers — unless you explicitly save them using a Xuvilo account."}
          </p>

          <h2>{isAR ? "2. كيف نستخدم المعلومات" : "2. How we use information"}</h2>
          <ul>
            <li>{isAR ? "تشغيل وصيانة الأدوات والخدمات" : "Operate and maintain the tools and services"}</li>
            <li>{isAR ? "المصادقة وحماية حسابات المستخدمين" : "Authenticate and protect user accounts"}</li>
            <li>{isAR ? "تحسين تجربة المستخدم وقياس الأداء" : "Improve user experience and measure performance"}</li>
            <li>{isAR ? "الرد على رسائل الدعم والاستفسارات" : "Respond to support requests and inquiries"}</li>
            <li>{isAR ? "إرسال إشعارات مهمة عن الخدمة (إن وجدت)" : "Send important service notifications (if any)"}</li>
            <li>{isAR ? "عرض إعلانات وقياس فعاليتها" : "Display advertising and measure its effectiveness"}</li>
          </ul>

          <h2>{isAR ? "3. ملفات تعريف الارتباط (Cookies) والتقنيات المماثلة" : "3. Cookies and similar technologies"}</h2>
          <p>
            {isAR
              ? "نستخدم ملفات تعريف الارتباط والتقنيات المشابهة لحفظ تفضيلاتك (مثل اللغة والعملة)، وإبقائك مسجّل الدخول، وتحليل الاستخدام، ولعرض إعلانات ذات صلة. يمكنك التحكّم بملفات تعريف الارتباط من خلال إعدادات متصفحك، لكن تعطيلها قد يؤثر على بعض ميزات الموقع."
              : "We use cookies and similar technologies to remember your preferences (like language and currency), keep you signed in, analyze usage, and serve relevant advertising. You can control cookies through your browser settings, though disabling them may affect some site features."}
          </p>

          <h2>{isAR ? "4. إعلانات Google AdSense والإعلانات من أطراف ثالثة" : "4. Google AdSense and third-party advertising"}</h2>
          <p>
            {isAR
              ? "يستخدم موقع Xuvilo خدمة إعلانات Google AdSense لتمويل خدماتنا المجانية."
              : "Xuvilo uses Google AdSense to fund our free services."}
          </p>
          <p>
            {isAR
              ? "قد يستخدم البائعون الخارجيون، بمن فيهم Google، ملفات تعريف الارتباط لعرض الإعلانات بناءً على الزيارات السابقة للمستخدم لموقع Xuvilo أو لمواقع أخرى على الإنترنت. تتيح ملفات تعريف الارتباط هذه لشركة Google وشركائها عرض إعلانات أكثر صلة باهتماماتك."
              : "Third-party vendors, including Google, may use cookies to serve ads based on a user's prior visits to Xuvilo or other websites. These cookies enable Google and its partners to serve ads that are more relevant to your interests."}
          </p>
          <p>
            {isAR
              ? "بالإضافة إلى ذلك، قد يستخدم بعض المعلنين الخارجيين ملفات تعريف الارتباط أو إشارات الويب (web beacons) لقياس فعالية إعلاناتهم وتخصيصها."
              : "Additionally, some third-party advertisers may use cookies or web beacons to measure and personalize the effectiveness of their advertising."}
          </p>

          <h2>{isAR ? "5. الإعلانات المخصّصة وكيفية إيقافها" : "5. Personalized advertising and how to opt out"}</h2>
          <p>
            {isAR
              ? "يمكنك إيقاف الإعلانات المخصّصة من Google في أي وقت من خلال زيارة "
              : "You can opt out of personalized advertising from Google at any time by visiting "}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
              Google Ads Settings
            </a>
            {isAR
              ? ". كما يمكنك زيارة "
              : ". You can also visit "}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
              www.aboutads.info/choices
            </a>
            {isAR
              ? " لإيقاف الإعلانات المخصّصة من شبكات الإعلان المشاركة."
              : " to opt out of personalized ads from participating ad networks."}
          </p>

          <h2>{isAR ? "6. التحليلات وبيانات الأداء" : "6. Analytics and performance data"}</h2>
          <p>
            {isAR
              ? "قد نستخدم أدوات تحليل (مثل Google Analytics) لفهم كيفية استخدام الموقع وتحسين تجربة المستخدم. تجمع هذه الأدوات بيانات مجمّعة وغير شخصية بشكل عام (مثل الصفحات الأكثر زيارة، مدة الجلسة، الجهاز، البلد)."
              : "We may use analytics tools (such as Google Analytics) to understand how the site is used and to improve the user experience. These tools collect generally aggregated, non-personal data (such as most-visited pages, session duration, device, country)."}
          </p>

          <h2>{isAR ? "7. تخزين البيانات وأمنها" : "7. Data storage and security"}</h2>
          <p>
            {isAR
              ? "نتّبع ممارسات أمنية معقولة لحماية بياناتك من الوصول غير المصرّح به أو التعديل أو الكشف. تُخزَّن بيانات الحسابات بشكل آمن على خوادم محمية. ومع ذلك، لا توجد طريقة نقل أو تخزين عبر الإنترنت آمنة بنسبة 100%."
              : "We follow reasonable security practices to protect your data from unauthorized access, alteration, or disclosure. Account data is stored securely on protected servers. However, no method of transmission or storage over the internet is 100% secure."}
          </p>

          <h2>{isAR ? "8. حقوقك" : "8. Your rights"}</h2>
          <ul>
            <li>{isAR ? "حق الوصول إلى بياناتك الشخصية" : "Right to access your personal data"}</li>
            <li>{isAR ? "حق تصحيح بياناتك" : "Right to correct your data"}</li>
            <li>{isAR ? "حق طلب حذف بياناتك" : "Right to request deletion of your data"}</li>
            <li>{isAR ? "حق سحب الموافقة على معالجة البيانات" : "Right to withdraw consent for data processing"}</li>
            <li>{isAR ? "حق الاعتراض على الإعلانات المخصّصة" : "Right to object to personalized advertising"}</li>
          </ul>
          <p>
            {isAR ? "لممارسة أي من هذه الحقوق، راسلنا على " : "To exercise any of these rights, email us at "}
            <a href="mailto:support@xuvilo.com">support@xuvilo.com</a>.
          </p>

          <h2>{isAR ? "9. خصوصية الأطفال" : "9. Children's privacy"}</h2>
          <p>
            {isAR
              ? "لا تستهدف Xuvilo الأطفال دون سن 13 عاماً ولا تجمع عمداً بيانات منهم. إذا اعتقدت أن طفلاً قدّم لنا بيانات، فيرجى التواصل معنا وسنحذفها."
              : "Xuvilo does not target children under 13 and does not knowingly collect data from them. If you believe a child has provided us with data, please contact us and we will delete it."}
          </p>

          <h2>{isAR ? "10. الروابط الخارجية" : "10. External links"}</h2>
          <p>
            {isAR
              ? "قد يحتوي موقعنا على روابط لمواقع خارجية. نحن لسنا مسؤولين عن ممارسات الخصوصية أو محتوى تلك المواقع. ننصحك بمراجعة سياسة الخصوصية الخاصة بكل موقع تزوره."
              : "Our site may contain links to third-party websites. We are not responsible for the privacy practices or content of those sites. We recommend reviewing the privacy policy of every site you visit."}
          </p>

          <h2>{isAR ? "11. تحديثات السياسة" : "11. Updates to this policy"}</h2>
          <p>
            {isAR
              ? "قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سننشر التغييرات هنا مع تاريخ التحديث. استخدامك المستمر للموقع بعد التحديث يعني موافقتك على السياسة المعدّلة."
              : "We may update this Privacy Policy from time to time. We will post changes on this page with the updated date. Your continued use of the site after an update means you accept the revised policy."}
          </p>

          <h2>{isAR ? "12. التواصل" : "12. Contact"}</h2>
          <p>
            {isAR ? "للأسئلة المتعلقة بالخصوصية، راسلنا على " : "For privacy questions, email us at "}
            <a href="mailto:support@xuvilo.com">support@xuvilo.com</a>.
          </p>
        </article>
      </div>
    </AppLayout>
  );
}
