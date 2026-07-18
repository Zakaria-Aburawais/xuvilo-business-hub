---
name: HTTP security headers — CSP, HSTS, Permissions-Policy, CORS
description: What was added, what requires unsafe-inline and why, CSP report-only status, inline script hashes.
---

## What is in place

**API server (`artifacts/api-server/src/app.ts`)**
- `app.disable("x-powered-by")` — fingerprint header suppressed.
- CORS restricted to `xuvilo.com` + `www.xuvilo.com` + `localhost/*` + `*.replit.dev` + `*.repl.co`. No-Origin requests still pass. `credentials: true`.
- Baseline headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

**Web server (`artifacts/businesses-hub/server.ts` — production only)**
- `app.disable("x-powered-by")`
- `X-XSS-Protection: 0` (deprecated "1; mode=block" removed)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), browsing-topics=(), interest-cohort=()`
- `Content-Security-Policy-Report-Only: ...` (see CSP section)

## CSP hashes for inline scripts in index.html

Vite does NOT modify `<script>` blocks without `type="module"`, so these are stable across builds (verified against `dist/public/index.html`):
- Script 1 (GA4 Consent Mode v2 + deferred loader): `sha256-6pxgvUTtGx+AytdiU0YABbcxJjHxF5P5Hrg8wzlr5wk=`
- Script 2 (`document.documentElement.className += " js"` + 8-second failsafe): `sha256-XX4YoipuNmLKRQwX+GA92dhcWcDdBa0BQagRF8Zyr3g=`

**If either inline script changes, recompute:** `python3 -c "import base64,hashlib,re; [print(f'sha256-{base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()}') for s in re.findall(r'<script>([\s\S]*?)</script>', open('artifacts/businesses-hub/index.html').read())]"`

## CSP report-only → enforce checklist

The CSP is currently `Content-Security-Policy-Report-Only`. To enforce:
1. Deploy to production.
2. Open browser DevTools console → look for "Content-Security-Policy" violation lines.
3. Key risk: **AdSense (`adsbygoogle.js`) injects dynamic inline scripts** → violations will appear unless `'unsafe-inline'` is added to `script-src` or AdSense is moved to a sandboxed iframe.
4. When clean, change the header name in server.ts from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

## `style-src: 'unsafe-inline'` justification

Required and unavoidable:
- React components use `style={}` props throughout (transforms, progress bars, dynamic widths)
- `chart.tsx` uses `dangerouslySetInnerHTML` for a `<style>` element
- `index.html` inline `<style>` block for loading screen must paint synchronously before JS

Eliminating this would require a full design-system refactor away from inline styles.

## External origins in CSP and why

| Origin | Directive | Reason |
|--------|-----------|--------|
| `https://www.googletagmanager.com` | script-src, connect-src | gtag.js + dataLayer endpoint |
| `https://www.google-analytics.com` | connect-src | GA4 analytics beacons |
| `https://analytics.google.com` | connect-src | GA4 analytics |
| `https://stats.g.doubleclick.net` | connect-src | GA4 doubleclick telemetry |
| `https://pagead2.googlesyndication.com` | script-src, connect-src, img-src | AdSense script + ad beacons |
| `https://tpc.googlesyndication.com` | script-src, connect-src | AdSense partner |
| `https://googleads.g.doubleclick.net` | connect-src, img-src | AdSense ad serving |
| `https://adservice.google.com` | connect-src | AdSense ad service |
| `https://securepubads.g.doubleclick.net` | connect-src | AdSense secure ad serving |
| `https://challenges.cloudflare.com` | script-src, connect-src, frame-src | Turnstile CAPTCHA |
| `https://fonts.googleapis.com` | style-src | Inter/Cairo CSS |
| `https://fonts.gstatic.com` | font-src | Inter/Cairo font files |
| `https://flagcdn.com` | img-src | Country flag images |
| `https://*.googleusercontent.com` | img-src | Google user profile photos |
| `https://www.gstatic.com` | img-src | Google static assets |
| `https://open.er-api.com` | connect-src | Exchange rate API (pricing-fx.ts) |

## Cookie security

No server-set cookies exist. Auth uses JWT Bearer tokens:
- API server reads `Authorization: Bearer <token>` header
- Token stored in browser `localStorage` (`AuthContext.tsx`)
- Preference state (language, theme, consent) also in `localStorage`
- Third-party GA4/AdSense cookies are set by Google scripts — we have no control over their attributes

**Why:** No session middleware; stateless JWT design means no `HttpOnly`/`Secure`/`SameSite` work needed on server side.
