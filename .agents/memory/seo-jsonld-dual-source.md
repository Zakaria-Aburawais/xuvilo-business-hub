---
name: SEO JSON-LD has two SSR copies (server.ts + vite.config.ts)
description: Structured-data / meta injection logic is duplicated across the production Express server and the dev Vite middleware; both must be edited together.
---

The businesses-hub app injects SEO JSON-LD (`getJsonLdForPath`), meta tags, and
static SSR body in TWO independent places that have drifted before:

- `artifacts/businesses-hub/server.ts` — PRODUCTION (Express SSR at request time).
- `artifacts/businesses-hub/vite.config.ts` — DEV PREVIEW (Vite `transformIndexHtml`
  plugin `seoMetaPlugin`). The dev workflow runs `vite`, NOT server.ts, so curl/preview
  in dev reflects vite.config.ts, while crawlers in production see server.ts.

**Why:** They are separate hand-maintained copies. Editing only one means the dev
preview and production disagree (e.g. homepage showed a single WebApplication in dev
while server.ts returned the full identity array). The vite copy is also a SUBSET —
it historically only handled `/` and `/invoice-generator-*`, not `/invoice`, `/calculators/*`, etc.

**How to apply:** Any change to JSON-LD / meta / SSR body for businesses-hub must be
mirrored in BOTH files. Validate dev via `curl localhost:80/<path>` (parses vite copy);
remember production correctness depends on the server.ts copy. A shared helper imported
by both would eliminate the drift if this keeps recurring.

**FAQPage policy:** Identity schemas (Organization/WebSite/SoftwareApplication/
WebApplication) are emitted SSR. FAQPage is emitted CLIENT-side (Home.tsx, FAQ.tsx,
CountryPage.tsx, ToolSeoContent.tsx `toolFaqJsonLd`, CalculatorLayout.tsx) from the
same data the page renders, so structured Q&A matches visible text exactly. SSR must
NOT also emit FAQPage for those routes or you get duplicate/conflicting FAQPage.
WebSite has NO SearchAction because the site has no working search endpoint.

**Sitemap/robots are ALSO dual-source:** `/sitemap.xml` and `/robots.txt` are
generated in BOTH server.ts (production Express routes) and vite.config.ts
(`sitemapDevPlugin` dev middleware). The production sitemap auto-generates
static + country (`Object.keys(COUNTRY_SSR)`) + calculator (`CALCULATOR_SEO_PAGES`)
+ blog routes. The dev copy must mirror it; vite.config.ts has COUNTRY_SSR but
NOT CALCULATOR_SEO_PAGES, so its calculator slugs are a hand-maintained
`CALCULATOR_SEO_SLUGS` list that must stay in sync with server.ts.
