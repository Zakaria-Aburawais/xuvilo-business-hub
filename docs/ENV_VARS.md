# Environment Variables Reference

This file documents every environment variable used by Xuvilo. Never commit actual secret values — store them in your host's secret manager or a `.env` file that is gitignored.

---

## How to set them

**Local development:** Create a `.env` file in the repo root (already gitignored) or in each artifact directory. The API server reads from `process.env`; the web app reads `process.env` (server side) and `import.meta.env` (Vite, client side — only `VITE_*` variables are exposed to the browser).

**Production:** Set these in your host's environment variable / secret manager dashboard (Railway, Render, Fly.io, etc.).

---

## Required for any environment

### `DATABASE_URL`
PostgreSQL connection string.

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Used by: API server, `lib/db` (Drizzle ORM).

### `AUTH_SIGNING_SECRET`
Secret used to sign and verify JWT authentication tokens. Must be at least 16 characters. Use a long random string (32+ chars recommended).

```
AUTH_SIGNING_SECRET=change-me-to-a-long-random-secret-string
```

Used by: API server auth (`src/lib/auth.ts`). If not set, the server falls back to `DATABASE_URL` as a signing key — not recommended for production.

### `PORT`
TCP port the server listens on. The web app and API server each need their own port.

```
# Web app
PORT=24130

# API server
PORT=8080
```

### `PUBLIC_APP_URL`
The public HTTPS URL of your application. Used to construct password-reset links and other absolute URLs sent by email. Include the scheme, no trailing slash.

```
PUBLIC_APP_URL=https://xuvilo.com
```

If not set, the server falls back to `REPLIT_DEV_DOMAIN` or `REPLIT_DOMAINS` (Replit-only). Always set this explicitly in production.

---

## Email (SendGrid)

The app uses SendGrid to send password-reset emails, contact form notifications, and newsletter confirmations.

### `SENDGRID_API_KEY`
Your SendGrid API key (starts with `SG.`).

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
```

### `SENDGRID_FROM_EMAIL`
The verified sender email address in your SendGrid account.

```
SENDGRID_FROM_EMAIL=noreply@xuvilo.com
```

### `SENDGRID_FROM_NAME` *(optional)*
Display name shown in the "From" field of emails.

```
SENDGRID_FROM_NAME=Xuvilo
```

> **On Replit:** If `SENDGRID_API_KEY` is not set, the server falls back to fetching credentials from the Replit SendGrid Connector. On any other platform, set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` directly.

---

## Cloudflare Turnstile (CAPTCHA)

Used on the contact form, login, and registration pages to prevent spam and brute-force attacks.

### `TURNSTILE_SECRET_KEY`
Server-side secret key from your Cloudflare Turnstile widget.

```
TURNSTILE_SECRET_KEY=0xAA...
```

Used by: API server (`src/lib/turnstile.ts`).

### `VITE_TURNSTILE_SITE_KEY`
Public site key from your Cloudflare Turnstile widget. Exposed to the browser.

```
VITE_TURNSTILE_SITE_KEY=0xBB...
```

Used by: web app frontend (React). Must be prefixed with `VITE_` to be included in the Vite client bundle.

> Get both keys from https://dash.cloudflare.com — Turnstile → Sites → Create Widget. Domain must match your deployment domain. If you skip Turnstile entirely, CAPTCHA checks will be skipped (not recommended for production, fine for a private dev environment).

---

## Google Analytics

### `VITE_GA4_MEASUREMENT_ID` *(optional)*
Google Analytics 4 Measurement ID. Exposed to the browser.

```
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

If not set, GA4 simply does not load. GA4 loading is consent-gated — it only fires after the user accepts cookies.

---

## Stripe (payments — currently disabled)

Stripe is set up but not yet live. When you are ready to enable payments:

1. Uncomment the three disabled blocks in `artifacts/api-server/src/index.ts` and `src/app.ts` (see comments in those files).
2. Set these environment variables:

### `STRIPE_SECRET_KEY`
Stripe secret key (starts with `sk_live_` or `sk_test_`).

```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
```

### `STRIPE_PUBLISHABLE_KEY`
Stripe publishable key (starts with `pk_live_` or `pk_test_`).

```
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
```

### `STRIPE_WEBHOOK_SECRET`
Stripe webhook signing secret (starts with `whsec_`). Set this after creating the webhook endpoint in your Stripe dashboard pointing to `https://yourdomain.com/api/stripe/webhook`.

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY`
Stripe Price IDs for the Pro tier. Create these in your Stripe dashboard.

```
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxx
```

### `STRIPE_PRICE_BUSINESS_MONTHLY` / `STRIPE_PRICE_BUSINESS_YEARLY`
Stripe Price IDs for the Business tier.

```
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxxxxxxx
```

> **On Replit:** If `STRIPE_SECRET_KEY` is not set, the server falls back to the Replit Stripe Connector. On any other platform, always set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` directly.

---

## File / Object Storage (Replit-specific)

The following are Replit-specific environment variables for file storage. **On any other platform, replace the object storage implementation** — see `docs/PORTABILITY_AUDIT.md`.

### `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
The Replit Object Storage bucket ID. Managed by Replit.

### `PRIVATE_OBJECT_DIR`
Path prefix for user-uploaded files within the bucket.

### `PUBLIC_OBJECT_SEARCH_PATHS`
Comma-separated search paths for public objects.

---

## Spam protection and alerting

### `SPAM_SPIKE_THRESHOLD` *(optional)*
Integer. Number of spam events within the rolling window that triggers an alert. If not set, spike alerting is disabled.

```
SPAM_SPIKE_THRESHOLD=20
```

### `SPAM_SPIKE_WEBHOOK_URL` *(optional)*
Slack-compatible incoming webhook URL for spam spike alerts.

```
SPAM_SPIKE_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### `SPAM_SPIKE_ALERT_EMAIL` *(optional)*
Email address to notify on spam spikes (uses SendGrid).

```
SPAM_SPIKE_ALERT_EMAIL=admin@xuvilo.com
```

### `SPAM_SPIKE_DEBOUNCE_MINUTES` *(optional)*
How long (in minutes) to wait before sending another spam spike alert. Default: 60.

```
SPAM_SPIKE_DEBOUNCE_MINUTES=60
```

---

## Operational / infrastructure

### `CONTACT_TEAM_EMAIL` *(optional)*
Email address where contact-form submissions are forwarded.

```
CONTACT_TEAM_EMAIL=hello@xuvilo.com
```

### `CONTACT_FAILURE_WEBHOOK_URL` *(optional)*
Slack-compatible webhook to notify when a contact-form email fails to send.

```
CONTACT_FAILURE_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### `SPAM_EVENTS_RETENTION_DAYS` *(optional)*
How many days to keep spam event records before pruning. Default: 30.

### `RATE_LIMIT_BUCKETS_RETENTION_DAYS` *(optional)*
How many days to keep rate-limit records before pruning. Default: 7.

### `PRUNE_HEALTH_DEBOUNCE_MINUTES` *(optional)*
Debounce for prune-health alert notifications. Default: 60.

---

## Replit-only variables (do not set on other platforms)

These are injected automatically by Replit. You do not set them manually. They are documented here so you understand what the code references.

| Variable | What it's used for |
|----------|--------------------|
| `REPLIT_CONNECTORS_HOSTNAME` | API endpoint for Replit Integrations (SendGrid, Stripe) |
| `REPL_IDENTITY` | Authentication token for Replit Connectors (dev/staging) |
| `WEB_REPL_RENEWAL` | Authentication token for Replit Connectors (production) |
| `REPLIT_DEPLOYMENT` | `"1"` when running in Replit production deployment |
| `REPLIT_DOMAINS` | Comma-separated public domain(s) of the deployment |
| `REPLIT_DEV_DOMAIN` | Dev preview domain (e.g. `abc123.repl.co`) |
| `REPLIT_DEPLOYMENT_DOMAINS` | Same as REPLIT_DOMAINS in some contexts |
| `REPLIT_SIDECAR_ENDPOINT` | Internal token endpoint for Replit Object Storage |

---

## Example `.env` file for local development

```env
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/xuvilo_dev
AUTH_SIGNING_SECRET=dev-secret-change-me-in-production-32chars

# Email
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=dev@example.com
SENDGRID_FROM_NAME=Xuvilo Dev

# CAPTCHA (leave blank to skip CAPTCHA checks locally)
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# Optional
PUBLIC_APP_URL=http://localhost:24130
CONTACT_TEAM_EMAIL=dev@example.com
```

> Turnstile key `1x0000000000000000000000000000000AA` is Cloudflare's official "always passes" test key — safe for local development only.
