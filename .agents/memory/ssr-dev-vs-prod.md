---
name: SSR content dev vs prod (businesses-hub)
description: Why curling a route in dev shows minimal SEO content but production shows rich content.
---

# Rich per-route SEO content is production-only

The businesses-hub web app has two ways HTML is produced:

- **Dev workflow** runs the Vite dev server, which serves `index.html`
  directly. `index.html` contains only a small default `.seo-fallback`
  block, so `curl http://localhost:80/<route>` in dev returns ~20–30 words
  of fallback content for ANY route.
- **Production** runs the Express SSR server (`artifacts/businesses-hub/server.ts`),
  which injects per-route rich content from `STATIC_HTML` (and dynamic
  builders like `slugToCountryHtml`) into the served HTML for crawlers.

**Why this matters:** Do NOT verify a route's server-side SEO/crawler
content by curling the dev server — it will look empty/minimal even when the
production `STATIC_HTML` entry is rich. Verify SSR content by reading
`server.ts` `STATIC_HTML`/builders, or against a production build/deploy.

**How to apply:** When a task says "the page only renders an H1 + one
sentence," distinguish: (a) the React client view (what users see), (b) the
dev Vite fallback (minimal), (c) the production SSR fallback (rich, in
server.ts). User-visible content lives in the React page components; crawler
content lives in server.ts.
