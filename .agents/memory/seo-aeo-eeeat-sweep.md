---
name: SEO/AEO/E-E-A-T sweep July 2026
description: What was done and what decisions were made in the comprehensive SEO sweep
---

## Key decisions

**Consent Mode v2 architecture:**
- `index.html` sets `gtag('consent','default',{denied})` BEFORE `gtag('js',...)` — this is the correct order per Google docs
- localStorage key is `bh_cookie_consent` ('accepted'|'rejected'|null)
- `index.html` ALSO does localStorage restore BEFORE `gtag('js',...)` so returning visitors have correct state from first script execution
- `ConsentContext.tsx` calls `window.gtag('consent','update',...)` in accept() and reject()
- GA script itself loads unconditionally in index.html (correct for CM v2; gating is via consent signals not script loading)

**Why:** Google Consent Mode v2 requires the `consent` commands to queue into dataLayer BEFORE the gtag.js script runs. If the script loads first, consent defaults don't apply to the first hit.

**AUTHOR_JSONLD:**
- Defined as a constant in server.ts named `AUTHOR_JSONLD` (no @context since it's embedded)
- `@id` is `${SITE_URL}/author/xuvilo-team#person`
- Used in both Blog JSON-LD and Article JSON-LD (array return: [Article, BreadcrumbList])

**Article JSON-LD now returns array:**
- `getJsonLdForPath` for `/blog/:slug` now returns `[Article, BreadcrumbList]`
- This is valid in `<script type="application/ld+json">` — JSON arrays are supported
- Country pages now have a separate BreadcrumbList return (single object, not array)

**AdSlot consent gating:**
- `AdSlot` renders `null` when status !== 'accepted'
- This means AdSense reviewers won't see the ad slots — acceptable since AdSense isn't live yet
- When it goes live, this may need reconsideration (render placeholder without consent, only push() with consent)

**Stale year fix:**
- Only one PAGE_META title had '2025': `/blog/zatca-invoice-requirements-saudi-arabia`
- blogPosts.ts data still has some 2025 in content — not fixed (content is very long, low priority)

**Crawlability / 404 pattern (July 2026 sweep):**
- server.ts `isKnownPath()` whitelists every real route (PAGE_META, STATIC_HTML, aliases, CLIENT_ONLY_EXACT/PREFIXES, CALC_TOOL_SLUGS); unknown paths get HTTP 404 + `noindex` and OMIT canonical/og:url/hreflang — never serve the SPA shell with 200 for junk URLs (soft-404 risk)
- When a new client route is added to App.tsx, the server whitelist MUST be updated too, or the prod server will 404 it

**hreflang for same-URL bilingual content:**
- ar/en/x-default all point at the same canonical URL (language switch is client-side, no /ar/ paths exist). Effectively a no-op per Google's model but harmless; the old bug emitted hreflang="ar" pointing to non-existent /ar/ URLs — never reintroduce per-language URLs in hreflang unless they actually exist. Blog AR/EN sibling pairs DO have distinct URLs and keep real hreflang pairs.

**Freshness:**
- Visible "Last reviewed" date: client constant `CONTENT_LAST_REVIEWED` in seo-config.ts must be kept in sync with `CONTENT_LAST_REVIEWED_*` in server.ts

**How to apply:**
- Any new blog post: server.ts Article JSON-LD automatically uses AUTHOR_JSONLD via `findBlogPostBySlug`
- Any new country: BreadcrumbList auto-generated from COUNTRY_SSR if slug matches `/invoice-generator-*`
- RSS: auto-includes all blogPosts sorted by date, no manual updates needed
- llms.txt: static text, update manually when new tools are added
