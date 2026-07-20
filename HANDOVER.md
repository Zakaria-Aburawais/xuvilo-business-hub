# Xuvilo Business Hub — Developer Handover

**Last updated:** 2026-07-18  
**Status:** Live at [xuvilo.com](https://xuvilo.com) — deployed on Replit  
**Live app:** bilingual (Arabic / English) SaaS for freelancers and SMEs in the MENA region

---

## What this product does

Xuvilo Business Hub lets freelancers and small businesses in Arabic-speaking countries create professional invoices, quotations, and receipts; run 14 business calculators (VAT, break-even, margin, payroll, etc.); and use an AI-powered RFQ Intelligence module that parses tender PDFs, researches suppliers, and generates quotes. The UI and content are fully bilingual (Arabic RTL / English LTR).

---

## Monorepo structure

```
/
├── artifacts/
│   ├── businesses-hub/     ← Main React web app (Vite + TypeScript)
│   │   ├── src/            ← All frontend source
│   │   ├── server.ts       ← Express SSR server (meta tags, static HTML, sitemap)
│   │   └── vite.config.ts  ← Vite build config
│   ├── api-server/         ← Express REST API (Node.js)
│   │   └── src/            ← Routes, services, middleware
│   └── mockup-sandbox/     ← Component preview server (dev only)
├── lib/
│   ├── db/                 ← Drizzle ORM schema + migration config
│   ├── api-spec/           ← OpenAPI spec (source of truth for the API contract)
│   ├── api-zod/            ← Generated Zod schemas from OpenAPI
│   └── api-client-react/   ← Generated React Query hooks from OpenAPI
├── packages/shared/        ← Shared utilities (if any)
├── scripts/                ← One-off utility scripts (Stripe product seeding, etc.)
├── pnpm-workspace.yaml     ← Workspace config + catalog pins
├── package.json            ← Root task orchestration
└── replit.md               ← Project overview and user preferences
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | TailwindCSS v4 + shadcn/ui |
| Routing | wouter |
| SSR / meta injection | Express (server.ts) |
| PDF export | @react-pdf/renderer |
| API server | Express 5 (Node.js) |
| Database | PostgreSQL via Drizzle ORM |
| DB migrations | `drizzle-kit push` (schema push, no migration files) |
| API contract | OpenAPI spec → generated Zod schemas + React Query hooks |
| AI integrations | OpenAI, Anthropic, Gemini, OpenRouter (user provides own keys) |
| Email | SendGrid (Replit integration) |
| Payments | Stripe (disabled, ready to re-enable — see below) |
| Package manager | pnpm workspaces |
| Hosting | Replit Deployments |

---

## Running locally (Replit)

All three services run as Replit workflows. From the workspace:

```bash
# Type-check everything
pnpm run typecheck

# Run API tests
pnpm --filter @workspace/api-server test
```

Individual services are started by Replit workflows (see `.replit` file). Do **not** run `pnpm dev` from the root — services require `PORT` and `BASE_PATH` env vars that the workflow config wires up automatically.

---

## Running outside Replit

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ instance
- All env vars from `.env.example` set

### Steps

```bash
# Install dependencies
pnpm install

# Build the DB lib first (required by api-server)
pnpm run typecheck:libs

# Push DB schema to your PostgreSQL instance
DATABASE_URL=postgres://user:pass@host:5432/dbname \
  pnpm --filter @workspace/db run push

# Start the API server
PORT=8001 DATABASE_URL=... pnpm --filter @workspace/api-server run dev

# Start the web app (in a separate terminal)
PORT=3000 pnpm --filter @workspace/businesses-hub run dev
```

The API server listens on `/api/*` routes. In Replit, the shared reverse proxy routes `/api` to the API server and `/` to the web app. Outside Replit, you need a reverse proxy (nginx, Caddy, etc.) or set `VITE_API_BASE_URL` in the web app to point directly to the API server port.

---

## Environment variables

See `.env.example` for the full list with descriptions. Key variables:

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | api-server, lib/db | PostgreSQL connection string |
| `SESSION_SECRET` | api-server | Express session signing key (min 32 chars) |
| `OPENAI_API_KEY` | api-server | OpenAI (RFQ Intelligence, AI Writer) |
| `SENDGRID_API_KEY` | api-server (via integration) | Transactional email |
| `VITE_GA4_MEASUREMENT_ID` | businesses-hub | Google Analytics 4 |
| `VITE_TURNSTILE_SITE_KEY` | businesses-hub | Cloudflare Turnstile CAPTCHA |
| `TURNSTILE_SECRET_KEY` | api-server | Cloudflare Turnstile verification |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | api-server | Replit Object Storage bucket |

Stripe vars exist in the codebase but are not active — see "Stripe" section below.

---

## Database

See `DATABASE.md` for full schema reference and migration instructions.

**Quick summary:** 23 Drizzle tables in PostgreSQL. No migration files — schema is applied with `drizzle-kit push`. Schema lives in `lib/db/src/schema/`.

---

## Payments / Stripe

**Stripe is disabled** but the code is fully written and ready to re-enable.

Three commented-out blocks to restore:
1. `artifacts/api-server/src/index.ts` — uncomment `initStripe()` and its imports
2. `artifacts/api-server/src/app.ts` — unmount the 503 stub, restore `stripeWebhookRouter`
3. `artifacts/api-server/src/routes/billing.ts` — remove the stub section at the top; the real handlers are preserved in a `/* ... */` block below it

Before re-enabling, run the Stripe product seed script to set up pricing tiers and multi-currency options:
```bash
pnpm --filter @workspace/scripts run seed-stripe-products
```

---

## SEO / SSR architecture

The web app uses a **hybrid SSR** approach:
- `artifacts/businesses-hub/server.ts` is the Express SSR server
- It pre-renders full HTML for public-facing routes (blog articles, calculator pages, country pages, the /blog index) with proper `<meta>`, Open Graph, JSON-LD, and hreflang
- React takes over client-side after hydration
- **Critical rule:** when adding a new client route in `App.tsx`, also add it to the server whitelist (`isKnownPath()` in `server.ts`) or production will return HTTP 404

Key sections in `server.ts`:
- `STATIC_HTML` — pre-rendered HTML for SSR-only pages
- `CALC_TOOL_META` — per-calculator SEO metadata (keep in sync with `src/lib/seo-config.ts`)
- `isKnownPath()` — the production URL whitelist
- `buildEnglishBlogStaticHtml` / `buildArabicBlogStaticHtml` — auto-renders blog articles from `blogPosts.ts`

---

## Content / blog

`artifacts/businesses-hub/src/data/blogPosts.ts` — 82 blog articles (52 original + 30 added in the AdSense content authority sweep).

The blog SSR pipeline picks up all articles automatically — no manual registration needed for new articles added to `blogPosts.ts` (the shim in `server.ts` iterates the array at startup).

---

## AdSense status (as of 2026-07-18)

A full content authority sweep was completed:
- 30 new cornerstone articles added (topics: accounting, VAT, RFQ, finance, business calculators — bilingual)
- All 14 calculator FAQ sections expanded to 5-6 items
- About page expanded with full company background
- Editorial Policy page created (`/editorial-policy`)

**Completed 2026-07-19:**
1. ~~Place `<AdSlot>` components on article and calculator pages~~ — done: `BlogPost.tsx` (leaderboard above article, rectangle below), `CalculatorLayout.tsx` (leaderboard mid-page, rectangle at bottom), joining the existing slot on `Blog.tsx`
2. ~~Add `FAQPage` JSON-LD schema to all 14 calculator pages~~ — verified already done: `CalculatorLayout.tsx` emits FAQPage from the same `faq` prop all 14 pages pass (5-6 items each); SSR-only `/calculators/<slug>-calculator` SEO pages emit it server-side
3. ~~In-article links~~ — 110 contextual links (EN + AR) added across the new cornerstone articles; the client markdown renderer in `BlogPost.tsx` now renders `[text](url)` links (it previously showed them as literal text)
4. Duplicate slug fixed: the sweep's `receipt-vs-invoice-difference` entry duplicated the legacy hand-written SSR page and was shadowed by it — removed (78 posts, 0 duplicates)
5. `blogSlugs.ts` re-synced: the 28 new article slugs were missing from it (its vitest sync-guard was failing), which would have made React mount over the SSR-only article pages and duplicate their content — appended; all 140 tests now pass
6. SSR verified locally: production build served on localhost — all 28 new articles return HTTP 200 with full article HTML, title, and working internal links; Arabic articles render RTL; blog index and sitemap list them correctly

**Still to do before AdSense approval:**
1. Ensure AdSense publisher ID and slot IDs are set via env vars (`VITE_ADSENSE_PUBLISHER_ID`, `VITE_ADSENSE_SLOT_*`)
2. **REDEPLOY** — as of 2026-07-19 the live site returns HTTP 404 for all the new cornerstone articles (e.g. `/blog/break-even-analysis-guide`): the running deployment predates the content sweep. Push the current code to the Repl and deploy, then re-verify the article URLs return the full article HTML.

See `.local/adsense-audit.md` in the Replit workspace for the full audit report.

---

## Known issues

| Issue | Severity | Details |
|---|---|---|
| Flaky rate-limit test | Low | `auth.rateLimit.test.ts` — "blocks a single (ip, email) pair after 5 attempts" occasionally times out at 5000ms in resource-constrained CI runs. Not a logic bug — increase vitest timeout to 15000ms to fix. |
| `:443` in HTTP→HTTPS redirect | Cosmetic | Replit's edge adds `:443` to the Location header on the HTTP→HTTPS redirect (e.g. `https://xuvilo.com:443/`). Browsers and Googlebot handle it correctly (RFC 3986), but some SEO audit tools flag it. Cannot be fixed in app code — needs a Replit platform fix or Cloudflare front-proxy. |
| Stripe disabled | Intentional | Payments are coded but commented out. Re-enable with 3 code changes (see above). |
| RFQ AI keys | By design | Users bring their own AI API keys. No server-side AI key for RFQ unless `OPENAI_API_KEY` is set in server env. |
| `/templates` redirect | Fixed | `/templates` 301s to `/templates/invoice`. Some SSR fallback HTML still links directly to `/templates` — minor: one redirect hop, no SEO harm. |

---

## Unfinished / next-priority work

1. **AdSense ad slot placement** — place `<AdSlot>` on article + calculator pages (see above)
2. **FAQ JSON-LD on calculator pages** — `CalculatorLayout.tsx` needs to emit `FAQPage` schema
3. **In-article links to calculators** — 30 new articles mention calculators but don't link to them
4. **SSR confirmation for new articles** — curl-verify the 30 new blog articles return full HTML
5. **Stripe re-enable** — when owner is ready for payments
6. **Multi-currency pricing** — `scripts/src/seed-stripe-products.ts` seeds 10 currencies; run it after Stripe is re-enabled
7. **Mobile app** — no native mobile artifact exists yet
8. **Email notification templates** — SendGrid integration is wired; template HTML can be improved

---

## Deployment

See `DEPLOYMENT.md` for full deployment instructions.

**Short version:** The app is deployed on Replit Deployments at `xuvilo.com`. To redeploy: push changes to the Repl, then click "Deploy" in the Replit UI (or use the Replit CLI). Production uses the same PostgreSQL database as development — be careful with schema changes.

---

## Key files reference

| File | Purpose |
|---|---|
| `artifacts/businesses-hub/server.ts` | SSR server, sitemap, SEO meta, URL whitelist |
| `artifacts/businesses-hub/src/App.tsx` | All client routes |
| `artifacts/businesses-hub/src/data/blogPosts.ts` | 82 blog articles |
| `artifacts/businesses-hub/src/lib/seo-config.ts` | Client-side SEO constants (keep in sync with server.ts) |
| `artifacts/businesses-hub/src/components/CalculatorLayout.tsx` | Shared calculator page wrapper |
| `lib/db/src/schema/` | All 23 Drizzle table definitions |
| `lib/db/drizzle.config.ts` | Drizzle Kit config (points at DATABASE_URL) |
| `lib/api-spec/` | OpenAPI spec — edit here, then run codegen |
| `artifacts/api-server/src/routes/` | All API route handlers |
| `artifacts/api-server/src/routes/billing.ts` | Stripe handlers (disabled, preserved) |
| `scripts/src/seed-stripe-products.ts` | Stripe product + pricing seed |
| `.env.example` | All environment variables documented |

---

## Codebase conventions

- **Never `console.log` in server code** — use `req.log` (route handlers) or the `logger` singleton
- **New client routes** → also add to `isKnownPath()` in `server.ts`
- **New blog articles** → add to `blogPosts.ts`, SSR renders automatically
- **API changes** → edit `lib/api-spec/` first, run `pnpm --filter @workspace/api-spec run codegen`, then implement
- **DB schema changes** → edit `lib/db/src/schema/`, run `pnpm --filter @workspace/db run push` against the target DB
- **Calculator SEO meta** → update both `server.ts` `CALC_TOOL_META` and `src/lib/seo-config.ts` `PAGE_SEO`
- **User language** → Arabic: `dir="rtl"`, English: `dir="ltr"`. Always test bilingual layouts.
