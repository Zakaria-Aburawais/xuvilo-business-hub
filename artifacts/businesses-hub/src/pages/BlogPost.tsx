import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getBlogPost,
  getRelatedPosts,
  getPostCover,
  BLOG_CATEGORY_LABELS,
  type BlogCategoryKey,
} from "@/data/blogPosts";
import { useLanguage } from "@/context/LanguageContext";
import { Calendar, Clock, ChevronRight, ArrowLeft, ArrowRight, BookOpen, Tag, Share2, Link2, List } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import NotFound from "@/pages/not-found";
import { useState } from "react";

const CATEGORY_COLORS: Record<BlogCategoryKey, string> = {
  invoices: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  taxes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  business: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  laws: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  tips: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

/* Extract h2 headings for the Table of Contents */
function extractHeadings(content: string): { id: string; text: string }[] {
  return content
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line, i) => ({
      id: `section-${i}`,
      text: line.slice(3).trim(),
    }));
}

/* Render simple markdown-like blog content (headers, tables, code, bold, lists) */
function renderContent(content: string, lang: "ar" | "en") {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  let h2Count = 0;
  const key = () => `n-${k++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      const sectionId = `section-${h2Count++}`;
      elements.push(
        <h2 id={sectionId} key={key()} className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-3 scroll-mt-20" lang={lang}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key()} className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2" lang={lang}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={key()} className="font-bold text-gray-900 dark:text-white mt-3 mb-1" lang={lang}>
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={key()} className="border-s-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20 ps-4 py-2 my-3 rounded-e-lg text-gray-700 dark:text-gray-300 text-sm italic" lang={lang}>
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={key()} className="bg-gray-900 text-green-300 rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono" dir="ltr">
          {codeLines.join("\n")}
        </pre>
      );
    } else if (line.startsWith("|")) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(l => !l.match(/^\|[-\s|]+\|$/));
      const align = lang === "ar" ? "text-right" : "text-left";
      elements.push(
        <div key={key()} className="overflow-x-auto my-5 rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <tbody>
              {rows.map((row, ri) => {
                const cells = row.split("|").filter((_, ci) => ci !== 0 && ci !== row.split("|").length - 1);
                return (
                  <tr key={ri} className={ri === 0 ? "bg-gray-100 dark:bg-gray-800 font-semibold" : "border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"}>
                    {cells.map((cell, ci) => (
                      ri === 0
                        ? <th key={ci} className={`px-4 py-2.5 ${align} text-gray-700 dark:text-gray-300`} lang={lang}>{cell.trim()}</th>
                        : <td key={ci} className="px-4 py-2.5 text-gray-600 dark:text-gray-400" lang={lang}>{cell.trim()}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (line.match(/^[-•*✅❌]\s/)) {
      elements.push(
        <li key={key()} className="text-gray-700 dark:text-gray-300 leading-relaxed my-0.5 ms-4 list-none flex items-start gap-2" lang={lang}>
          <span className="mt-0.5">{line.slice(0, 1) === "-" || line.slice(0, 1) === "*" ? "•" : line.slice(0, 1)}</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </li>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      elements.push(
        <li key={key()} className="text-gray-700 dark:text-gray-300 leading-relaxed my-0.5 ms-4 list-none flex items-start gap-2" lang={lang}>
          <span className="font-bold text-blue-600 dark:text-blue-400 min-w-[1.2rem]">{num}.</span>
          <span>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
        </li>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key()} className="border-gray-200 dark:border-gray-700 my-6" />);
    } else if (line.trim() === "") {
      elements.push(<div key={key()} className="h-2" />);
    } else {
      elements.push(
        <p key={key()} className="text-gray-700 dark:text-gray-300 leading-relaxed my-1" lang={lang}>
          {inlineFormat(line)}
        </p>
      );
    }
    i++;
  }
  return elements;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith("/")) {
        return (
          <Link key={i} href={href} className="text-blue-600 dark:text-blue-400 hover:underline">
            {label}
          </Link>
        );
      }
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
          {label}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-blue-700 dark:text-blue-300" dir="ltr">{part.slice(1, -1)}</code>;
    return part;
  });
}

function SocialShare({ url, title, isAR }: { url: string; title: string; isAR: boolean }) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Share2 className="w-3.5 h-3.5" />
        {isAR ? "مشاركة:" : "Share:"}
      </span>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1 text-xs rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors font-medium border border-green-200 dark:border-green-800"
        aria-label="Share on WhatsApp"
      >
        WhatsApp
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1 text-xs rounded-full bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors font-medium border border-gray-200 dark:border-gray-700"
        aria-label="Share on X (Twitter)"
      >
        X / Twitter
      </a>
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encoded}&title=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-colors font-medium border border-blue-200 dark:border-blue-800"
        aria-label="Share on LinkedIn"
      >
        LinkedIn
      </a>
      <button
        onClick={copyLink}
        className="px-3 py-1 text-xs rounded-full bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-colors font-medium border border-gray-200 dark:border-gray-700 flex items-center gap-1"
        aria-label="Copy link"
      >
        <Link2 className="w-3 h-3" />
        {copied ? (isAR ? "تم النسخ!" : "Copied!") : (isAR ? "نسخ الرابط" : "Copy link")}
      </button>
    </div>
  );
}

function TableOfContents({ headings, isAR }: { headings: { id: string; text: string }[]; isAR: boolean }) {
  if (headings.length < 3) return null;
  return (
    <nav
      aria-label={isAR ? "جدول المحتويات" : "Table of contents"}
      className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-8"
    >
      <div className="flex items-center gap-2 mb-3">
        <List className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {isAR ? "جدول المحتويات" : "Table of Contents"}
        </span>
      </div>
      <ol className="space-y-1">
        {headings.map((h, i) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-start gap-2"
            >
              <span className="text-gray-400 min-w-[1.2rem] text-xs mt-0.5">{i + 1}.</span>
              <span>{h.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const { lang, dir, t } = useLanguage();
  const isAR = lang === "ar";

  const post = getBlogPost(slug);
  if (!post) return <NotFound />;

  const title = isAR ? post.titleAr : post.titleEn;
  const altTitle = isAR ? post.titleEn : post.titleAr;
  const metaTitleOverride = isAR ? post.metaTitleAr : post.metaTitleEn;
  const renderedMetaTitle = metaTitleOverride ?? `${title} — Xuvilo`;
  const excerpt = isAR ? post.excerptAr : post.excerptEn;
  const content = isAR ? post.contentAr : post.contentEn;
  const keyword = isAR ? post.keywordAr : post.keywordEn;
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category][lang];

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(isAR ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const related = getRelatedPosts(post.relatedSlugs);
  const canonicalUrl = `https://xuvilo.com/blog/${post.slug}`;
  const coverPath = getPostCover(post);
  const coverUrl = `https://xuvilo.com/${coverPath}`;
  const coverSrc = `${BASE}/${coverPath}`;
  const BackArrow = isAR ? ArrowRight : ArrowLeft;
  const ChevronIcon = isAR ? "rotate-180" : "";

  const headings = extractHeadings(content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": renderedMetaTitle,
    "description": excerpt,
    "datePublished": post.date,
    "dateModified": post.date,
    "author": {
      "@type": "Person",
      "@id": "https://xuvilo.com/author/xuvilo-team#person",
      "name": "Xuvilo Editorial Team",
      "url": "https://xuvilo.com/author/xuvilo-team",
    },
    "publisher": {
      "@type": "Organization",
      "name": "Xuvilo",
      "url": "https://xuvilo.com",
      "logo": { "@type": "ImageObject", "url": "https://xuvilo.com/xuvilo-logo.png" },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    "inLanguage": lang,
    "keywords": keyword,
    "image": coverUrl,
  };

  return (
    <AppLayout>
      <Helmet>
        <html lang={lang} dir={dir} />
        <title>{renderedMetaTitle}</title>
        <meta name="description" content={excerpt} />
        <meta property="og:title" content={renderedMetaTitle} />
        <meta property="og:description" content={excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={coverUrl} />
        <meta property="og:locale" content={isAR ? "ar_SA" : "en_US"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={coverUrl} />
        <meta name="keywords" content={keyword} />
        <meta name="author" content="Xuvilo Editorial Team" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="ar" href={canonicalUrl} />
        <link rel="alternate" hrefLang="en" href={canonicalUrl} />
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
        <link rel="alternate" type="application/rss+xml" title="Xuvilo Blog RSS Feed" href="https://xuvilo.com/rss.xml" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10" dir={dir}>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-6 flex-wrap">
          <Link href={`${BASE}/`}>
            <span className="hover:text-blue-500 cursor-pointer">{t("blog.breadcrumb.home")}</span>
          </Link>
          <ChevronRight className={`w-3 h-3 ${ChevronIcon}`} />
          <Link href={`${BASE}/blog`}>
            <span className="hover:text-blue-500 cursor-pointer">{t("blog.breadcrumb.blog")}</span>
          </Link>
          <ChevronRight className={`w-3 h-3 ${ChevronIcon}`} />
          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{title}</span>
        </nav>

        {/* Cover image */}
        <div className="mb-6 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20">
          <img
            src={coverSrc}
            alt={title}
            className="w-full h-auto aspect-[16/9] object-cover"
          />
        </div>

        {/* Category + meta */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${CATEGORY_COLORS[post.category]}`}>
            {categoryLabel}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {formatDate(post.date)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {post.readTime} {t("blog.read_time")}
          </span>
          <Link href={`${BASE}/author/xuvilo-team`}>
            <span className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 cursor-pointer">
              <BookOpen className="w-3 h-3" />
              {isAR ? "فريق Xuvilo التحريري" : "Xuvilo Editorial Team"}
            </span>
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2" lang={lang}>
          {title}
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-2 font-medium" lang={isAR ? "en" : "ar"}>
          {altTitle}
        </p>

        {/* Keyword + last-updated */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t("blog.keyword_label")}: {keyword}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {isAR ? "آخر تحديث:" : "Last updated:"}{" "}
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </span>
        </div>

        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-8" />

        {/* Ad slot — leaderboard above the article body */}
        <div className="flex justify-center mb-8">
          <AdSlot format="leaderboard" slot="blog-post-top" className="max-w-3xl" />
        </div>

        {/* Table of Contents */}
        <TableOfContents headings={headings} isAR={isAR} />

        {/* Article body */}
        <article lang={lang} className="prose-like" dir={dir}>
          {renderContent(content, lang)}
        </article>

        {/* Ad slot — rectangle below the article body */}
        <div className="flex justify-center mt-8">
          <AdSlot format="rectangle" slot="blog-post-bottom" className="max-w-md" />
        </div>

        {/* Social share */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <SocialShare url={canonicalUrl} title={isAR ? post.titleAr : post.titleEn} isAR={isAR} />
        </div>

        {/* CTA box */}
        <div className="mt-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-6 text-white text-center">
          <p className="text-lg font-bold mb-1" lang={lang}>{t("blog.cta.title")}</p>
          <p className="text-sm text-blue-100 mb-4" lang={lang}>{t("blog.cta.subtitle")}</p>
          <Link href={`${BASE}/invoice`}>
            <button className="px-6 py-2.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm">
              {t("blog.cta.button")}
            </button>
          </Link>
        </div>

        {/* Author bio box */}
        <div className="mt-8 p-5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            X
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
              {isAR ? "فريق Xuvilo التحريري" : "Xuvilo Editorial Team"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {isAR
                ? "متخصصون في الفواتير والشؤون المالية للأعمال، بخبرة عميقة في منطقة الشرق الأوسط وشمال أفريقيا، نخدم الشركات حول العالم."
                : "Business finance and invoicing specialists with deep MENA expertise, covering VAT compliance, freelancer invoicing, and SME operations worldwide."}
            </p>
            <Link href={`${BASE}/author/xuvilo-team`}>
              <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">
                {isAR ? "عرض جميع المقالات" : "View all articles"} →
              </span>
            </Link>
          </div>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4" lang={lang}>
              {t("blog.related")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((rel) => {
                const relTitle = isAR ? rel.titleAr : rel.titleEn;
                const relCategoryLabel = BLOG_CATEGORY_LABELS[rel.category][lang];
                return (
                  <Link key={rel.slug} href={`${BASE}/blog/${rel.slug}`}>
                    <div className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLORS[rel.category]}`}>
                        {relCategoryLabel}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug" lang={lang}>
                        {relTitle}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {rel.readTime} {t("blog.minutes")}
                        <BackArrow className="w-3 h-3 ms-auto group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Back to blog */}
        <div className="mt-8 text-center">
          <Link href={`${BASE}/blog`}>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all mx-auto">
              <BackArrow className="w-4 h-4" />
              {t("blog.back")}
            </button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
