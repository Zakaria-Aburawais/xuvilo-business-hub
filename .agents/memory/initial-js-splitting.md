---
name: businesses-hub initial JS splitting
description: How the businesses-hub web app keeps its first-load JS small, and what must never be re-introduced into the app shell.
---

# businesses-hub initial JS splitting

`artifacts/businesses-hub/src/App.tsx` loads every page via `React.lazy()` with a
single `<Suspense fallback={<PageLoader/>}>` around the router. This is the primary
lever that keeps first-load JS small (whole-app single bundle was ~1.39MB gzip;
after splitting, homepage ≈178KB gz, SEO country page ≈163KB gz).

**Rule:** Keep pages lazy. Do NOT add a *static* top-level import of a heavy library
into the app shell (`App.tsx`, `main.tsx`, or a provider/context that the shell
imports). The heavy libs that must stay in route/async chunks only:
`@react-pdf/renderer` (~474KB gz), `blogPosts.ts` content (~129KB gz), `jspdf` +
`html2canvas`, the Dashboard chunk.

**Why:** A single static import in the shell pulls the whole dependency back into the
entry chunk and silently undoes the split — mobile LCP/FCP regress hard.

**How to apply:** When adding a feature, import heavy deps inside the lazy page (or
dynamic-import on the action). `main.tsx` needs only blog *slugs*, so it imports
`src/data/blogSlugs.ts` (auto-derived, guarded by `blogSlugs.test.ts`) — never the
full `blogPosts` array. The PageLoader mirrors the inline `#js-loading` overlay in
`index.html` so there's no flash when `main.tsx` removes that overlay after paint.
The real mobile PageSpeed score can only be re-measured on the deployed URL.
