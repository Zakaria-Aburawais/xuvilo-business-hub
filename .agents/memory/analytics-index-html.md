---
name: GA/AdSense loaded in index.html
description: Why businesses-hub loads Google Analytics and AdSense directly in index.html, independent of the React consent path.
---

# GA/AdSense loaded directly in index.html

`artifacts/businesses-hub/index.html` loads `gtag.js` (GA4) and the AdSense script
unconditionally (now deferred to after `window load` for performance, but still
unconditional). This is SEPARATE from the in-app consent path
(`AnalyticsTracker` + `ConsentContext` + `lib/analytics.ts`).

**Why:** Many high-traffic pages (blog posts, some SEO landings) are server-rendered
ONLY — React never mounts on them. If GA were loaded solely from the React consent
path, those pages would record zero analytics. So index.html boots GA itself.

**How to apply:** Do NOT "fix" index.html by removing GA/AdSense or gating it on
consent thinking it's a bug or a double-init — that would silently drop tracking on
SSR-only pages and changes analytics behavior. A code reviewer flagged this as a
"regression" once; it is intentional. The two paths can double-count `page_view`;
that tension is pre-existing and out of scope for performance work. Only defer the
*network fetch* (keep the inline `gtag` stub + `config` so events queue and fire).
