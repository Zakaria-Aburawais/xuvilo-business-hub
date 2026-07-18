import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { blogSlugs } from "./data/blogSlugs";

/**
 * Blog post routes whose article HTML is rendered ONLY by the server-side
 * fallback in `server.ts` (no matching React Route component exists).
 *
 * For these paths, the server emits the article OUTSIDE of `<div id="root">`
 * and we MUST skip `createRoot` here. Otherwise React would mount, fail to
 * find a matching route, and render <NotFound /> into #root — and Googlebot
 * (which renders JS) would index that empty/404 view instead of the article,
 * triggering Soft 404 in Search Console.
 *
 * GA4 (gtag.js) is loaded directly from index.html so analytics still fires
 * on these pages even without React mounting.
 *
 * Keep this list in sync with the matching set in server.ts.
 */
const SSR_ONLY_BLOG_SLUGS = new Set<string>([
  "/blog/zatca-invoice-requirements-saudi-arabia",
  "/blog/free-invoice-generator-uae",
  "/blog/invoice-vs-quotation",
  "/blog/vat-calculator-saudi-arabia",
  "/blog/invoice-generator-egypt",
  "/blog/freelancer-invoice-tips-uae",
  "/blog/profit-margin-calculator-guide",
  "/blog/receipt-vs-invoice-difference",
  "/blog/quotation-guide-mena",
  "/blog/invoice-generator-jordan",
  // 14 calculator SEO landing pages — same SSR-only pattern as the
  // blog posts above. React must skip mounting so the article HTML
  // injected outside #root by server.ts survives Googlebot's render.
  "/calculators/vat-calculator",
  "/calculators/profit-margin-calculator",
  "/calculators/currency-converter",
  "/calculators/discount-calculator",
  "/calculators/loan-calculator",
  "/calculators/overtime-calculator",
  "/calculators/break-even-calculator",
  "/calculators/markup-calculator",
  "/calculators/invoice-calculator",
  "/calculators/tax-calculator",
  "/calculators/salary-calculator",
  "/calculators/tip-calculator",
  "/calculators/percentage-calculator",
  "/calculators/compound-interest-calculator",
]);

// Every blog post (Arabic + English slugs) uses the SSR-only static HTML
// pattern: server.ts renders the article OUTSIDE #root, so React must skip
// mounting. We add them from `blogSlugs` — a slug-only list auto-derived from
// blogPosts.ts — instead of importing the full blogPosts array, which would
// pull ~428KB of article content into the initial bundle on EVERY page.
// A vitest guard (blogSlugs.test.ts) keeps blogSlugs exactly in sync with
// blogPosts. Mirrors the registration loop in server.ts.
for (const slug of blogSlugs) {
  SSR_ONLY_BLOG_SLUGS.add(`/blog/${slug}`);
}

let path = window.location.pathname.replace(/\/+$/, "") || "/";
// Browsers leave non-ASCII path segments percent-encoded in `pathname`.
// Decode so Arabic-slug paths match the (decoded) entries in the set above.
try { path = decodeURI(path); } catch { /* keep raw if malformed */ }

/**
 * Remove the inline loading placeholder injected by index.html. Called
 * either after React mounts (regular routes) or immediately on SSR-only
 * blog routes where the server-rendered article IS the final page.
 */
function removeLoadingPlaceholder() {
  const el = document.getElementById("js-loading");
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

if (SSR_ONLY_BLOG_SLUGS.has(path)) {
  // React intentionally does not mount: the SSR article is the final page.
  // Drop the loading overlay right away so it doesn't cover the article.
  removeLoadingPlaceholder();
} else {
  // ── Route-aware chunk prefetch ───────────────────────────────────────────
  // Fire dynamic imports for the current page's lazy chunks BEFORE createRoot
  // so the browser starts downloading them in parallel with React
  // initialization. By the time Suspense triggers React.lazy, the module is
  // often already in the HTTP/module cache — eliminating the sequential
  // waterfall: main-bundle → (wait) → page-chunk.
  const ROUTE_PREFETCHES: Record<string, () => Promise<unknown>> = {
    "/": () =>
      Promise.all([
        import("./pages/Home"),
        import("./components/layout/AppLayout"),
      ]),
    "/invoice":     () => import("./pages/Invoice"),
    "/quotation":   () => import("./pages/Quotation"),
    "/pricing":     () => import("./pages/Pricing"),
    "/login":       () => import("./pages/Login"),
    "/signup":      () => import("./pages/Signup"),
    "/blog":        () => import("./pages/Blog"),
    "/ai-writer":   () => import("./pages/AiWriter"),
    "/calculators": () => import("./pages/CalculatorsHub"),
  };
  const prefetchFn = ROUTE_PREFETCHES[path];
  if (prefetchFn) void prefetchFn();

  createRoot(document.getElementById("root")!).render(<App />);
  // Hide the placeholder once React has produced its first paint. Using
  // requestAnimationFrame ensures the React tree is committed to the DOM
  // before we remove the overlay, preventing a flash of empty page.
  requestAnimationFrame(() => {
    requestAnimationFrame(removeLoadingPlaceholder);
  });
}
