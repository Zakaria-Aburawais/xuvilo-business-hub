# Businesses Hub
A bilingual SaaS MVP for freelancers and SMEs, offering professional document generation, business calculators, and utility tools.

## Run & Operate
- **Run Dev**: `npm run dev` (from monorepo root)
- **Build**: `npm run build` (from monorepo root)
- **Typecheck**: `npm run typecheck`
- **Environment Variables**:
    - `VITE_GA4_MEASUREMENT_ID`: Google Analytics 4 Measurement ID.
    - `VITE_TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key for CAPTCHA.
    - `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key.
    - `SPAM_SPIKE_THRESHOLD`: Integer, enables spam spike alerts.
    - `SPAM_SPIKE_WEBHOOK_URL`: Slack-compatible webhook for spam alerts.
    - `SPAM_SPIKE_ALERT_EMAIL`: Email for spam alerts.
    - `SPAM_SPIKE_DEBOUNCE_MINUTES`: (Optional) Debounce for spam alerts, default 60.

## Stack
- **Frontend**: React, Vite, TypeScript, TailwindCSS v4, shadcn/ui, wouter
- **Backend**: Express (Node.js)
- **Database**: PostgreSQL (via Prisma ORM, inferred)
- **Validation**: Zod (inferred)
- **Build Tool**: Vite
- **PDF Generation**: `@react-pdf/renderer`
- **AI Integration**: Anthropic, OpenAI, Gemini, OpenRouter SDKs/APIs

## Where things live
- `/artifacts/businesses-hub/`: Main React web application.
- `/api-server/`: Express API.
- `/mockup-sandbox/`: Component preview server.
- `/packages/shared/`: Shared utilities.
- `artifacts/businesses-hub/src/lib/rfq/`: RFQ intelligence module backend logic.
- `artifacts/businesses-hub/src/pages/rfq/RfqIntelligence.tsx`: RFQ intelligence module frontend.
- `artifacts/businesses-hub/src/components/CookieConsentBanner.tsx`: Cookie consent banner UI.
- `artifacts/businesses-hub/src/lib/analytics.ts`: Google Analytics integration.
- `artifacts/businesses-hub/server.ts`, `vite.config.ts`: Server-side rendering configuration for SEO.
- `artifacts/businesses-hub/server.ts` (Arabic blog SSR shim, ~line 2241): `arMdToHtml` + `buildArabicBlogStaticHtml` convert `post.contentAr` markdown to RTL HTML; a registration loop adds every Arabic-slug post to `PAGE_META`, `STATIC_HTML`, and `SSR_ONLY_BLOG_SLUGS`. Mirrored in `src/main.tsx` (dynamic loop adds every blogPosts.ts slug to its own SSR-only set; `decodeURI` on `window.location.pathname` so the encoded URL matches).
- `artifacts/businesses-hub/server.ts` (English blog SSR shim, ~line 2358): `enMdToHtml` + `buildEnglishBlogStaticHtml` are the English-language analogs of the Arabic shim. The registration loop iterates `blogPosts` skipping Arabic slugs and skipping any path already present in `STATIC_HTML` (so the original hand-written long-form English entries above are not overwritten). New English posts added to `blogPosts.ts` are SSR-rendered automatically.
- `artifacts/businesses-hub/server.ts` (`buildBlogIndexHtml`, ~line 2520): Dynamic `/blog` index SSR. Iterates every post in `blogPosts.ts` (English + Arabic, sorted by date desc) and emits an `<article>` card per post, then assigns the result to `STATIC_HTML["/blog"]`. Replaced the previous hand-coded literal that listed only 10 of 50 posts.
- `artifacts/businesses-hub/src/data/blogPosts.ts` (last ~180 lines): The 10 legacy long-form English posts (zatca, free-invoice-generator-uae, etc.) have STUB `contentEn`/`contentAr` here purely so Blog.tsx + the dynamic SSR index can render their cards. Their actual long-form article HTML lives in `server.ts` `STATIC_HTML` and is preserved by the English-shim guard `if (STATIC_HTML[path]) continue;`. They remain in `SSR_ONLY_BLOG_SLUGS` so React doesn't mount over them.
- `artifacts/businesses-hub/server.ts` (crawlability, ~line 2874): `isKnownPath()` whitelists every real route (PAGE_META, STATIC_HTML, ROUTE_ALIASES, CLIENT_ONLY_EXACT/PREFIXES, CALC_TOOL_SLUGS). Unknown paths return HTTP 404 with `noindex` and no canonical/og:url/hreflang. **When adding a new client route in App.tsx, also add it to the server whitelist or production will 404 it.** 8 vanity template URLs 301 (query-merging) to `/templates/invoice?...`; App.tsx has matching client redirects (~line 265).
- `artifacts/businesses-hub/server.ts` (`CALC_TOOL_META`, ~line 2193): per-tool meta for all 14 calculator pages + `/templates/{invoice,quotation,receipt}`. Client mirror lives in `src/lib/seo-config.ts` `PAGE_SEO` (keep both in sync); `CalculatorLayout.tsx` renders `SEOHead` for calc pages.
- `artifacts/businesses-hub/server.ts` (freshness, ~line 1613): `CONTENT_LAST_REVIEWED_ISO/DISPLAY` power visible "Last reviewed" lines + JSON-LD `dateModified` on country and calc SEO pages. Client twin: `CONTENT_LAST_REVIEWED` in `src/lib/seo-config.ts` (used by `CountryPage.tsx`). Update both together.
- `/author/xuvilo-team`: SSR bio in `STATIC_HTML` (~line 2508) + ProfilePage JSON-LD; linked from Article/Blog `AUTHOR_JSONLD`.

## Architecture decisions
- **Client-Side First**: Core features prioritize client-side execution to minimize backend dependencies and improve responsiveness.
- **Hybrid SEO**: Utilizes static HTML pre-rendering for initial content and an Express server for dynamic meta tag injection and JSON-LD to optimize for SEO without full SSR.
- **"SmartThumb" System**: Custom system for consistent rendering of document templates, ensuring uniformity across various outputs.
- **Consent-Gated Analytics**: GA4 loading is strictly gated by user consent stored in `localStorage`, adhering to data privacy regulations.
- **Monorepo for Cohesion**: Project structured as a monorepo to manage related applications (web app, API, sandbox, shared utilities) and facilitate code sharing.
- **Multi-tiered PDF Parsing for RFQ**: Employs `pdftotext`, `pdfjs-dist`, and OCR via `tesseract` for robust PDF content extraction, handling various PDF types including scanned documents.

## Product
- Bilingual (Arabic/English) interface and content.
- Document generators (Invoices, Quotations, Receipts) with PDF export and 320 templates.
- Comprehensive suite of 14 business calculators.
- Utility tools: temporary email service, company stamp/seal maker.
- User authentication, company profiles, and personalized dashboard.
- Saved documents management with filtering, sorting, and status tracking.
- AI Writer for generating document content.
- RFQ Intelligence module: Parses tender PDFs, researches suppliers, and generates quotes.
- Cookie consent management with GA4 integration.

## User preferences
I prefer simple language. I want iterative development. Ask before making major changes.

## Known infrastructure quirks
- **Replit deployment edge adds `:443` to HTTP→HTTPS redirect Location headers** (e.g. `Location: https://xuvilo.com:443/`). This happens before any traffic reaches our Express server — confirmed by the fact that our app's own `Location` headers (HTTP/2, lowercase) are clean (`https://xuvilo.com/`, no port). The www→apex redirect in `artifacts/businesses-hub/server.ts` (~line 2436) already produces clean single-hop URLs. The `:443` is purely cosmetic — modern crawlers (including Googlebot) treat `https://host:443/` and `https://host/` as the same URL per RFC 3986 — but some SEO audit tools flag it. Cannot be fixed in app code; would need a Replit-side change or a Cloudflare front-proxy. Draft support message saved at `.local/replit_support_message.md`.

## Stripe disabled (temporary)
- `artifacts/api-server`: Stripe is OFF for now, payments coming later. Disabled (not deleted) at three points: `src/index.ts` comments out `initStripe()` and its imports; `src/app.ts` unmounts `stripeWebhookRouter` and serves an inline 503 stub at `POST /api/stripe/webhook`; `src/routes/billing.ts` exports a 503 stub router with the original Stripe handlers preserved verbatim in a `/* ... */` block at the bottom. To re-enable: uncomment the three blocks and remove `routes/billing.ts`'s stub section. Everything in `lib/stripeClient.ts`, `lib/billing.ts`, and `routes/stripeWebhook.ts` is left intact but unused at runtime.
- **Multi-currency checkout (prepared)**: `scripts/src/seed-stripe-products.ts` seeds `currency_options` (10 currencies + USD base) onto each Price using `CURRENCY_RATES` — keep in sync with `PRICING_FX_RATES` in `artifacts/businesses-hub/src/lib/pricing-fx.ts`. The checkout handler (in the commented block) passes the visitor's currency to `stripe.checkout.sessions.create` and retries in USD if the Price lacks that currency_option. When re-enabling billing, re-run the seed script so existing Prices get currency_options.

## Gotchas
- **GA4 Consent Logic**: If the GA4 consent logic needs to change from consent-gated (Option A) to always-on (Option B), ensure simultaneous updates to `CookieConsentBanner.tsx`, `AnalyticsTracker.tsx`, and `ConsentContext.tsx` to maintain UI accuracy and avoid misleading users.
- **RFQ AI Keys**: Users must bring their own API keys for AI providers; no fallback Replit AI Integrations proxy is provided.
- **SEO Fallback Content**: The `.seo-fallback` wrapper around SSR content is visible for crawlers and initial paint; ensure any changes to `index.html` or the server rendering don't re-introduce `display:none` or similar hiding mechanisms.
- **hreflang**: Site is same-URL bilingual (no `/ar/` paths). `SEOHead.tsx` and `vite.config.ts` point ar/en/x-default at the same canonical URL. Never emit hreflang URLs that don't exist. Blog AR/EN sibling posts have distinct URLs and keep real hreflang pairs.
- **Monorepo Commands**: Always run commands from the monorepo root unless specifically targeting a sub-package.

## Pointers
- **shadcn/ui documentation**: [https://ui.shadcn.com/docs](https://ui.shadcn.com/docs)
- **TailwindCSS v4 documentation**: [https://tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide)
- **@react-pdf/renderer documentation**: [https://react-pdf.org/](https://react-pdf.org/)
- **wouter documentation**: [https://www.npmjs.com/package/wouter](https://www.npmjs.com/package/wouter)
- **OpenAI API documentation**: [https://platform.openai.com/docs/overview](https://platform.openai.com/docs/overview)
- **Anthropic API documentation**: [https://docs.anthropic.com/en/docs](https://docs.anthropic.com/en/docs)
- **Cloudflare Turnstile documentation**: [https://developers.cloudflare.com/turnstile/](https://developers.cloudflare.com/turnstile/)