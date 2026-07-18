# Xuvilo Business Hub — Developer Handoff Guide

> **Owner note:** You own the full source code and can hand this project to any developer or move it to any host. This document tells a new developer everything they need to know.

---

## What this project is

**Xuvilo** is a bilingual (Arabic / English) SaaS web application for freelancers and small businesses in the MENA region. It provides:

- Free document generators — invoices, quotations, receipts — with PDF export and 320+ templates
- 14 business calculators (VAT, profit margin, currency, overtime, etc.)
- An AI Writer for generating business emails
- An RFQ Intelligence module (parses tender PDFs, researches suppliers, generates quotes)
- User accounts, company profiles, client management, saved documents
- A blog with 50+ Arabic and English articles
- Country-specific invoice generator pages for 56+ countries

Live domain: **xuvilo.com**

---

## Project layout

```
/ (monorepo root — pnpm workspace)
├── artifacts/
│   ├── businesses-hub/     ← Main web app (React + Vite + Express SSR)
│   ├── api-server/         ← REST API (Express, Node.js)
│   └── mockup-sandbox/     ← Dev-only component preview (can be ignored)
├── lib/
│   ├── db/                 ← PostgreSQL schema (Drizzle ORM) — shared by both artifacts
│   ├── api-spec/           ← OpenAPI contract
│   ├── api-zod/            ← Zod schemas (auto-generated from api-spec)
│   └── api-client-react/   ← React Query hooks (auto-generated from api-spec)
├── scripts/                ← One-off utility scripts
├── pnpm-workspace.yaml     ← Workspace package registry + dependency catalog
├── package.json            ← Root scripts (build, typecheck)
└── replit.md               ← Project notes and known quirks
```

### Key files

| File | Purpose |
|------|---------|
| `artifacts/businesses-hub/server.ts` | Express SSR server — meta tags, JSON-LD, blog SSR, static HTML pre-rendering |
| `artifacts/businesses-hub/vite.config.ts` | Vite build + SEO static-HTML injection |
| `artifacts/businesses-hub/src/App.tsx` | Client-side router (wouter), all page routes |
| `artifacts/api-server/src/app.ts` | API Express app — middleware, route mounts |
| `artifacts/api-server/src/routes/` | All API route handlers |
| `artifacts/api-server/src/lib/` | Auth, email, storage, rate limiting, etc. |
| `lib/db/src/schema/` | All database table definitions (Drizzle) |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Frontend | React 19, Vite 7, TailwindCSS v4, shadcn/ui, wouter |
| Backend | Express 5 |
| Database | PostgreSQL 16, Drizzle ORM (schema-push, no migration files) |
| PDF | @react-pdf/renderer, jsPDF, html2canvas |
| Email | SendGrid |
| Payments | Stripe (disabled, ready to re-enable — see `src/index.ts`) |
| AI | Anthropic, OpenAI, Gemini (user-provided API keys) |
| Auth | Custom JWT + scrypt (no OAuth dependency) |
| CAPTCHA | Cloudflare Turnstile |
| Analytics | Google Analytics 4 (consent-gated) |
| System tools | `poppler` (pdftotext), `tesseract` (OCR) — needed for RFQ PDF parsing |

---

## Prerequisites

Install these before setting up:

1. **Node.js 24** — `node --version` should show `v24.x.x`
2. **pnpm** — `npm install -g pnpm`
3. **PostgreSQL 16** — local install, Docker, or a managed service
4. **poppler** — for `pdftotext` (RFQ PDF parsing):
   - macOS: `brew install poppler`
   - Ubuntu/Debian: `apt install poppler-utils`
5. **tesseract** — for OCR on scanned PDFs (RFQ):
   - macOS: `brew install tesseract`
   - Ubuntu/Debian: `apt install tesseract-ocr`

---

## Quick start (local development)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env — minimum required: DATABASE_URL, AUTH_SIGNING_SECRET

# 3. Push the database schema (creates all tables)
pnpm --filter @workspace/db push

# 4. Start the API server (terminal 1)
PORT=8080 pnpm --filter @workspace/api-server run dev

# 5. Start the web app (terminal 2)
PORT=24130 BASE_PATH=/ pnpm --filter @workspace/businesses-hub run dev
```

Open http://localhost:24130 for the web app.
The API is at http://localhost:8080/api.

---

## Environment variables

See **`docs/ENV_VARS.md`** for the complete reference with descriptions and examples.

**Minimum to run locally:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/xuvilo
AUTH_SIGNING_SECRET=<any-random-32-char-string>
```

**For email to work:**
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**For CAPTCHA (contact form, auth):**
```
TURNSTILE_SECRET_KEY=<from Cloudflare>
VITE_TURNSTILE_SITE_KEY=<from Cloudflare>
```

---

## Build

```bash
# Full production build (both artifacts)
pnpm run build

# Build one artifact
pnpm --filter @workspace/businesses-hub run build
pnpm --filter @workspace/api-server run build
```

Build output:
- Web app → `artifacts/businesses-hub/dist/`
- API server → `artifacts/api-server/dist/`

---

## Running in production

```bash
# API server
PORT=8080 NODE_ENV=production \
  node --enable-source-maps artifacts/api-server/dist/index.mjs

# Web app (Express SSR + static files)
PORT=24130 NODE_ENV=production \
  node artifacts/businesses-hub/dist/server.mjs
```

The web app serves its own built React bundle from `dist/public/`. It does not need a separate static file server.

---

## Testing

```bash
# Run all tests
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/businesses-hub run test

# Type-check everything
pnpm run typecheck
```

---

## Database

See **`docs/DATABASE.md`** for the full schema reference, backup, and restore guide.

To apply schema changes (adds tables/columns, does not drop data):
```bash
pnpm --filter @workspace/db push
```

---

## Deploying to a new host

See **`docs/DEPLOYMENT.md`** for step-by-step instructions to set up on a VPS, Railway, Render, Fly.io, or any Node.js host.

---

## Portability — what needs attention if you leave Replit

See **`docs/PORTABILITY_AUDIT.md`** for a complete audit of every Replit-specific dependency, what it does, and exactly what to replace it with.

**Short version:**
| Item | Status |
|------|--------|
| PostgreSQL database | Portable — any PostgreSQL 16+ host works |
| SendGrid email | **Fixed** — now uses `SENDGRID_API_KEY` env var (no Replit needed) |
| Stripe payments | **Fixed** — now uses `STRIPE_SECRET_KEY` env var (currently disabled) |
| File/object storage | Needs replacement — currently uses Replit Object Storage |
| Vite dev plugins | Dev-only, harmless, optional to remove |
| `stripe-replit-sync` | Needs replacement when Stripe is re-enabled |
| System tools (poppler, tesseract) | Install via apt/brew on any host |

---

## What the owner must keep to hand to a new developer

1. **This source code** — the full repository
2. **All secret values** — from `docs/ENV_VARS.md` (AUTH_SIGNING_SECRET, SENDGRID_API_KEY, TURNSTILE keys, etc.)
3. **A database export** — run `pg_dump` before migrating (see `docs/DATABASE.md`)
4. **Any files stored in Replit Object Storage** — export these before leaving Replit (see `docs/PORTABILITY_AUDIT.md`)
5. **The Cloudflare Turnstile site/secret key pair** — tied to your domain
6. **Google Analytics Measurement ID** — (`VITE_GA4_MEASUREMENT_ID`)
7. **Stripe account credentials** — when payments are re-enabled
8. **SendGrid API key and verified sender email**

A new developer with all of the above can deploy the application independently on any Node.js platform.
