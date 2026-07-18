---
name: Verifying deployed SEO/head changes & the stale-HTML cache trap
description: How to tell whether an SSR <head>/H1/viewport change actually reached xuvilo.com, and why HTML must be sent no-store
---

## Don't trust local `dist/` when verifying a deploy
`artifacts/businesses-hub/dist/` is a gitignored build leftover that can be weeks
stale and will show OLD strings even when source and production are correct. To
check whether an SSR change (H1, meta, viewport, JSON-LD) is live, use:
- `getDeploymentInfo()` (deployment skill) — primaryUrl, deploymentType, `hasSuccessfulBuild`.
- a cache-busted `curl "https://xuvilo.com/?cb=$(date +%s)"`.

## Where the head/H1 come from (so you know what a rebuild regenerates)
- Prod build (artifact.toml `[services.production].build`) = `vite build && node build-server.mjs`:
  vite regenerates `dist/public/index.html` (the client template incl. viewport);
  esbuild re-bundles `server.ts` → `dist/server.mjs` (the SSR + injected H1/meta).
- The SSR `<head>` **viewport comes only from source `index.html`** — `server.ts`
  reads `dist/public/index.html` at runtime and sets no viewport itself. The
  `<title>`/meta are injected by `server.ts` per-path and override the template.

## The stale-HTML trap: browser shows old page, curl shows new
**Why:** an HTML document with no app-set `Cache-Control` inherits the upstream
default (`cache-control: private` from the Google frontend), which lets the
*browser* reuse a cached old HTML document across deploys. curl + `getDeploymentInfo`
look fine because the origin is correct; only the user's browser is stale.

**How to apply / diagnose:**
- Tell-tale: the cached page matches the current live page on everything EXCEPT
  the one element that recently changed.
- Confirm origin is consistent: fetch the live URL ~10x (all identical = no mixed
  instances) and confirm no service worker exists in the app.
- The durable fix: the SSR HTML response must send a no-store style `Cache-Control`
  so browsers always revalidate the document, while hashed `/assets/**` stay
  `immutable` (their filenames change per build, so they're safe to cache forever).
  Any change that stops sending a no-store header on the HTML document will
  re-introduce this class of "my deploy didn't update" bug.
