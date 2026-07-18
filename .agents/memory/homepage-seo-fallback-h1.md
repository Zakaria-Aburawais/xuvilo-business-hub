---
name: Homepage SEO fallback heading & single-h1 rule
description: How the homepage keeps exactly one h1 in both raw SSR and post-hydration, and why the fallback never coexists with the hero.
---

# Homepage SEO fallback & the single-h1 rule

The homepage must expose exactly ONE `<h1>` in BOTH states:
- **Raw SSR HTML** (for non-JS crawlers): the keyword-rich SEO-fallback heading
  ("Free invoices, quotations and receipts for MENA …") is the single `<h1>`.
- **Post-hydration**: the visible React hero
  ("Create invoices, quotations, receipts & business documents in minutes.") is the single `<h1>`.

**Why this works (root cause, not a mask):** for non-SSR-only routes like `/`, the
`.seo-fallback` block (with its `<h1>`) is SSR-injected INSIDE `<div id="root">`.
`src/main.tsx` mounts via `createRoot(getElementById("root")).render(<App/>)`, and
`createRoot().render()` wipes `#root`'s existing children on first render — so the
fallback (`<h1>` and all) is fully removed and replaced by the React tree, leaving the
hero as the only `<h1>`. Verified in-browser: post-hydration `.seo-fallback` count is 0.

**The original "two h1s" was stale production HTML**, not a coexistence bug — it predated
the SSR HTML cache-control fix (`Cache-Control: no-cache,no-store,must-revalidate` on the
SSR catch-all). Do NOT "fix" it by demoting the fallback to `<h2>`: that leaves raw SSR
with zero `<h1>` for no-JS crawlers. Keep the fallback as a single `<h1>`.

**How to apply:** the fallback markup is DUPLICATED — edit BOTH
`artifacts/businesses-hub/server.ts` (prod `STATIC_HTML["/"]`) and
`artifacts/businesses-hub/vite.config.ts` (dev `STATIC_HTML["/"]`); keep wording identical
(vite copy carries inline style attrs). Verify both: `curl` raw HTML = one `<h1>`, and a
real-browser check = `querySelectorAll('h1').length === 1` with `.seo-fallback` gone.
