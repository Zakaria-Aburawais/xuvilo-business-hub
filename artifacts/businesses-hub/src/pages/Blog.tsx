import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/context/LanguageContext";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_LABELS,
  getPostCover,
  getPublishedPosts,
  type BlogCategoryKey,
} from "@/data/blogPosts";
import { Calendar, Clock, Tag, ArrowLeft, ArrowRight, BookOpen, Search, X } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { saveScrollPosition, consumePendingRestore } from "@/lib/scrollMemory";
import { normalizeText, findHighlightRanges } from "@/lib/searchHighlight";

function highlightMatches(text: string, normalizedQuery: string): React.ReactNode {
  if (!normalizedQuery) return text;
  const ranges = findHighlightRanges(text, normalizedQuery);
  if (ranges.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={i}
        className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded-[2px]"
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

const CATEGORY_COLORS: Record<BlogCategoryKey, string> = {
  invoices: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  taxes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  business: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  laws: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  tips: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export default function BlogPage() {
  const { lang, t, dir } = useLanguage();
  const isAR = lang === "ar";
  const [pathname, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const urlQuery = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");
  const activeCategory: BlogCategoryKey | "all" =
    categoryParam && (BLOG_CATEGORIES as readonly string[]).includes(categoryParam)
      ? (categoryParam as BlogCategoryKey)
      : "all";
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Continuously remember the list's scroll position so that returning
  // from an article (browser/app back) can land the reader where they were.
  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        saveScrollPosition("/blog", window.scrollY);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Restore the saved position only when ScrollToTop flagged a back
  // navigation. Deep links and fresh visits still start at the top.
  useEffect(() => {
    const y = consumePendingRestore("/blog");
    if (y !== null) {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    }
  }, []);

  const buildUrl = (nextQuery: string, nextCategory: BlogCategoryKey | "all") => {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery);
    if (nextCategory !== "all") params.set("category", nextCategory);
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    navigate(buildUrl(value, activeCategory), { replace: true });
  };

  const handleCategoryChange = (cat: BlogCategoryKey | "all") => {
    navigate(buildUrl(query, cat));
  };

  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeText(trimmedQuery);

  // Scheduled (future-dated) posts stay hidden until their date arrives;
  // newest first so the index always leads with fresh content.
  const published = getPublishedPosts().sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );

  const byCategory =
    activeCategory === "all"
      ? published
      : published.filter((p) => p.category === activeCategory);

  const filtered = normalizedQuery
    ? byCategory.filter((p) => {
        const title = isAR ? p.titleAr : p.titleEn;
        const excerpt = isAR ? p.excerptAr : p.excerptEn;
        const keyword = isAR ? p.keywordAr : p.keywordEn;
        return [title, excerpt, keyword].some((field) =>
          normalizeText(field).includes(normalizedQuery),
        );
      })
    : byCategory;

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(isAR ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const resultCountText = (() => {
    const n = filtered.length;
    let key = "blog.search.count_other";
    if (isAR) {
      if (n === 1) key = "blog.search.count_one";
      else if (n === 2) key = "blog.search.count_two";
      else if (n >= 3 && n <= 10) key = "blog.search.count_few";
    } else if (n === 1) {
      key = "blog.search.count_one";
    }
    return t(key)
      .replace("{count}", n.toLocaleString(isAR ? "ar-EG" : "en-US"))
      .replace("{query}", trimmedQuery);
  })();

  const labelFor = (key: BlogCategoryKey) => BLOG_CATEGORY_LABELS[key][lang];
  const allLabel = t("blog.category.all");
  const ArrowIcon = isAR ? ArrowLeft : ArrowRight;

  return (
    <AppLayout>
      <Helmet>
        <html lang={lang} dir={dir} />
        <title>{t("blog.meta.title")}</title>
        <meta name="description" content={t("blog.meta.description")} />
        <meta property="og:title" content={t("blog.meta.title")} />
        <meta property="og:description" content={t("blog.meta.description")} />
        <link rel="canonical" href="https://xuvilo.com/blog" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: t("blog.meta.title"),
            description: t("blog.meta.description"),
            url: "https://xuvilo.com/blog",
            inLanguage: lang,
            publisher: {
              "@type": "Organization",
              name: "Xuvilo — AI Business Tools Hub",
              url: "https://xuvilo.com",
            },
          })}
        </script>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir={dir}>
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            <span>{t("blog.badge")}</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-3"
            lang={lang}
          >
            {t("blog.title")}
          </h1>
          <p
            className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto"
            lang={lang}
          >
            {t("blog.subtitle")}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-6">
          <div className="relative">
            <Search
              className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={t("blog.search.placeholder")}
              aria-label={t("blog.search.aria")}
              lang={lang}
              className="w-full ps-9 pe-9 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                aria-label={t("blog.search.clear")}
                className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-8 flex-wrap justify-center">
          {(["all", ...BLOG_CATEGORIES] as Array<"all" | BlogCategoryKey>).map((cat) => {
            const label = cat === "all" ? allLabel : labelFor(cat);
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  active
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search result count */}
        {trimmedQuery && (
          <p
            className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6"
            lang={lang}
            role="status"
            aria-live="polite"
          >
            {resultCountText}
          </p>
        )}

        {/* Ad slot — leaderboard banner above the article grid (reserved for AdSense) */}
        <div className="flex justify-center mb-6">
          <AdSlot format="leaderboard" slot="blog-top" className="max-w-3xl" />
        </div>

        {/* Articles grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => {
            const title = isAR ? post.titleAr : post.titleEn;
            const altTitle = isAR ? post.titleEn : post.titleAr;
            const excerpt = isAR ? post.excerptAr : post.excerptEn;
            const keyword = isAR ? post.keywordAr : post.keywordEn;
            const categoryLabel = labelFor(post.category);
            return (
              <Link key={post.slug} href={`${BASE}/blog/${post.slug}`}>
                <article className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 cursor-pointer h-full flex flex-col">
                  <div className="h-40 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20 relative overflow-hidden">
                    <img
                      src={`${import.meta.env.BASE_URL}${getPostCover(post)}`}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className={`absolute top-3 end-3 px-2.5 py-1 rounded-full text-xs font-bold ${CATEGORY_COLORS[post.category]}`}
                    >
                      {categoryLabel}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400 dark:text-gray-500">{keyword}</span>
                    </div>

                    <h2
                      className="text-base font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug"
                      lang={lang}
                    >
                      {highlightMatches(title, normalizedQuery)}
                    </h2>
                    <p
                      className="text-xs text-gray-500 dark:text-gray-500 mb-3 font-medium"
                      lang={isAR ? "en" : "ar"}
                    >
                      {altTitle}
                    </p>

                    <p
                      className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 flex-1 leading-relaxed"
                      lang={lang}
                    >
                      {highlightMatches(excerpt, normalizedQuery)}
                    </p>

                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime} {t("blog.minutes")}
                      </span>
                      <ArrowIcon className="w-3.5 h-3.5 ms-auto group-hover:-translate-x-1 transition-transform text-blue-400" />
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400 dark:text-gray-600">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg">
              {normalizedQuery ? t("blog.search.empty") : t("blog.empty")}
            </p>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-400 dark:text-gray-600" lang={lang}>
          <p>
            {t("blog.author_prefix")}{" "}
            <strong className="text-gray-600 dark:text-gray-400">{t("blog.author_name")}</strong>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
