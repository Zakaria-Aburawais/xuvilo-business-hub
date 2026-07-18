import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/context/LanguageContext";
import { blogPosts, BLOG_CATEGORY_LABELS, getPostCover, type BlogCategoryKey } from "@/data/blogPosts";
import { Calendar, Clock, Pen } from "lucide-react";

const CATEGORY_COLORS: Record<BlogCategoryKey, string> = {
  invoices: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  taxes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  business: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  laws: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  tips: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const PERSON_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://xuvilo.com/author/xuvilo-team#person",
  name: "Xuvilo Editorial Team",
  url: "https://xuvilo.com/author/xuvilo-team",
  affiliation: {
    "@type": "Organization",
    name: "Xuvilo",
    url: "https://xuvilo.com",
  },
  jobTitle: "Business Content Editor",
  description:
    "Business finance and invoicing specialists with deep MENA expertise, covering VAT compliance, freelancer invoicing, and SME operations for businesses worldwide.",
  knowsAbout: [
    "ZATCA e-invoicing",
    "UAE VAT (FTA)",
    "Small business invoicing",
    "MENA tax compliance",
    "Freelancer finance",
    "Business calculators",
    "Arabic invoicing",
  ],
  sameAs: ["https://xuvilo.com/about"],
};

export default function AuthorPage() {
  const { lang, dir } = useLanguage();
  const isAR = lang === "ar";
  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const recentPosts = [...blogPosts]
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 12);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isAR ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const title = isAR ? "فريق Xuvilo التحريري — محرر محتوى الأعمال" : "Xuvilo Editorial Team — Business Content Editors";
  const description = isAR
    ? "تعرف على فريق Xuvilo التحريري — متخصصون في الفواتير والشؤون المالية للأعمال بخبرة عميقة في منطقة الشرق الأوسط وشمال أفريقيا، نخدم الشركات حول العالم."
    : "Meet the Xuvilo Editorial Team — business finance specialists with deep MENA expertise, covering VAT compliance, invoicing best practices, and SME operations worldwide.";

  return (
    <AppLayout>
      <Helmet>
        <html lang={lang} dir={dir} />
        <title>{title} | Xuvilo</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`${title} | Xuvilo`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content="https://xuvilo.com/author/xuvilo-team" />
        <meta property="og:image" content="https://xuvilo.com/opengraph.jpg" />
        <link rel="canonical" href="https://xuvilo.com/author/xuvilo-team" />
        <script type="application/ld+json">{JSON.stringify(PERSON_JSONLD)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10" dir={dir}>

        {/* Author hero */}
        <div className="flex items-start gap-6 mb-10 p-6 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-extrabold text-2xl shrink-0">
            X
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Pen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                {isAR ? "محرر المحتوى" : "Content Editor"}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              {isAR ? "فريق Xuvilo التحريري" : "Xuvilo Editorial Team"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3" lang={lang}>
              {isAR
                ? "فريق متخصص في الفواتير والامتثال الضريبي وعمليات الشركات الصغيرة، بخبرة عميقة في منطقة الشرق الأوسط وشمال أفريقيا ونخدم الشركات حول العالم. نغطي متطلبات ZATCA، وضريبة القيمة المضافة للإمارات والسعودية ومصر، وأفضل ممارسات الفواتير للمستقلين والشركات."
                : "Business finance and invoicing specialists with deep MENA expertise — covering ZATCA e-invoicing, UAE and Saudi VAT, Egypt tax rules, and invoicing best practices for freelancers and small businesses worldwide."}
            </p>
            <div className="flex flex-wrap gap-2">
              {["ZATCA", "UAE VAT (FTA)", "Egypt VAT", "Invoicing", "SME Finance", "Freelancer Tips"].map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Expertise section */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "مجالات الخبرة" : "Areas of Expertise"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: isAR ? "الفواتير الضريبية ZATCA" : "ZATCA E-Invoicing (Saudi Arabia)", desc: isAR ? "متطلبات المرحلة 1 و2، رمز QR، حساب ضريبة القيمة المضافة 15%" : "Phase 1 & 2 requirements, QR code, 15% VAT calculation" },
              { title: isAR ? "ضريبة القيمة المضافة — الإمارات" : "UAE VAT (FTA Compliance)", desc: isAR ? "ضريبة 5%، رقم TRN، الفاتورة الضريبية وفق متطلبات الاتحاد" : "5% VAT, TRN, FTA-compliant tax invoices" },
              { title: isAR ? "إعداد الفواتير للمستقلين" : "Freelancer Invoicing Best Practices", desc: isAR ? "الشروط والأحكام، متابعة المدفوعات، قوالب احترافية" : "Payment terms, follow-up strategies, professional templates" },
              { title: isAR ? "الحسابات التجارية" : "Business Calculators for MENA", desc: isAR ? "حاسبات الربح والخسارة، الضريبة، نقطة التعادل، العملات" : "Profit, tax, break-even, currency, overtime calculators" },
            ].map(({ title: t2, desc }) => (
              <div key={t2} className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{t2}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <strong>{isAR ? "تنبيه:" : "Disclaimer:"}</strong>{" "}
          {isAR
            ? "المقالات المنشورة على Xuvilo هي للأغراض التعليمية العامة فقط ولا تشكل نصيحة قانونية أو ضريبية أو محاسبية. استشر متخصصاً مؤهلاً في دولتك للحصول على توجيهات قانونية."
            : "Articles published on Xuvilo are for general educational purposes only and do not constitute legal, tax, or accounting advice. Consult a qualified professional in your jurisdiction for legal guidance."}
        </div>

        {/* Recent articles */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "أحدث المقالات" : "Recent Articles"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPosts.map((post) => {
              const postTitle = isAR ? post.titleAr : post.titleEn;
              const categoryLabel = BLOG_CATEGORY_LABELS[post.category][lang];
              return (
                <Link key={post.slug} href={`${BASE}/blog/${post.slug}`}>
                  <article className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer h-full flex flex-col">
                    <div className="h-28 overflow-hidden relative">
                      <img
                        src={`${BASE}/${getPostCover(post)}`}
                        alt={postTitle}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className={`absolute top-2 end-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLORS[post.category]}`}>
                        {categoryLabel}
                      </span>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug" lang={lang}>
                        {postTitle}
                      </h3>
                      <div className="flex items-center gap-2 mt-auto text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.date)}
                        <Clock className="w-3 h-3 ml-1" />
                        {post.readTime} {isAR ? "د" : "min"}
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <Link href={`${BASE}/blog`}>
              <button className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all">
                {isAR ? "عرض جميع المقالات" : "View all articles"} →
              </button>
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
