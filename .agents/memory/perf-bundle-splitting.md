---
name: Performance — bundle splitting and loading waterfall
description: Root cause and fix for the 2–5 s splash-screen delay; manualChunks config and prefetch pattern that reduced critical-path gzip from 147 kB to 60 kB.
---

## Root cause
The main bundle `index-*.js` was **471 kB / 147 kB gzip** because:
- Both `en.ts` (33 kB) and `ar.ts` (42 kB) i18n files were eagerly imported
- React + ReactDOM + react-query + react-helmet all in one chunk
- No chunk prefetch → lazy route chunks started downloading only AFTER the 471 kB bundle executed (sequential waterfall)

## Fix
**`vite.config.ts` — manualChunks:**
```js
manualChunks(id) {
  if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/") ||
      id.includes("/node_modules/react-is/") || id.includes("/node_modules/scheduler/"))
    return "react-vendor";
  if (id.includes("/src/i18n/"))
    return "i18n";
  if (id.includes("/node_modules/@tanstack/") || id.includes("/node_modules/react-helmet-async/"))
    return "query-vendor";
}
```

**`main.tsx` — route-aware prefetch (before `createRoot`):**
```ts
const ROUTE_PREFETCHES = { "/": () => Promise.all([import("./pages/Home"), import("./components/layout/AppLayout")]), ... };
if (ROUTE_PREFETCHES[path]) void ROUTE_PREFETCHES[path]();
```

## Results
| Chunk | Before | After |
|-------|--------|-------|
| Main entry | 471 kB / 147 kB gzip | 176 kB / 56 kB gzip |
| react-vendor | — | 192 kB / 60 kB gzip |
| i18n | — | 68 kB / 19 kB gzip |
| query-vendor | — | 43 kB / 14 kB gzip |

Critical-path bottleneck: **147 kB → 60 kB gzip (−59%)** because all chunks download in parallel over HTTP/2.

**Why:** `manualChunks` with `react-vendor` and `i18n` separates stable deps (React rarely changes, i18n only when translations update) so they're cached independently between app deploys, AND they download in parallel with the app shell.

**How to apply:** Any time the main bundle exceeds ~80 kB gzip, check if stable third-party deps (React, query libs, i18n) can be split out. The parallel-download benefit requires HTTP/2 (all modern connections).

## Companion fixes
- `Home.tsx`: `FadeIn` skips animation + starts visible under `prefers-reduced-motion`; `AnimatedCounter` uses `tabular-nums` + `min-width:4ch` to prevent CLS; testimonials fetch deferred to `requestIdleCallback`
- `server.ts`: public HTML pages use `no-cache` instead of `no-store` → browsers can do 304 conditional GETs on repeat visits
