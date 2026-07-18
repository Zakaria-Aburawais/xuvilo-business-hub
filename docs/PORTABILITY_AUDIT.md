# Portability Audit

This document identifies every dependency on Replit-specific services, explains what each does, and tells you exactly what to replace it with when moving to another platform.

---

## Summary

| Dependency | Severity | Status | Action required |
|------------|----------|--------|----------------|
| PostgreSQL database | Low | Portable | Just change `DATABASE_URL` |
| SendGrid email | **Fixed** | Portable | Use `SENDGRID_API_KEY` env var |
| Stripe payments | **Fixed** | Portable (disabled) | Use `STRIPE_SECRET_KEY` env var |
| Replit Object Storage | High | Needs replacement | Replace storage client |
| `stripe-replit-sync` package | Medium | Needs replacement (when Stripe enabled) | Use Stripe webhooks instead |
| Replit Vite dev plugins | Low | Dev-only, harmless | Optional to remove |
| System packages (poppler, tesseract) | Low | Portable | Install via apt/brew |
| Replit env var references | Low | Documented | Set `PUBLIC_APP_URL` instead |

---

## 1. PostgreSQL Database

**What it is:** A standard PostgreSQL 16 database.

**Replit-specific?** Only the hosting. The schema, queries, and ORM are all standard PostgreSQL.

**How to migrate:**
1. Export data with `pg_dump` (see `docs/DATABASE.md`).
2. Provision a PostgreSQL 16+ database on any provider (Supabase, Neon, Railway, AWS RDS, self-hosted).
3. Set `DATABASE_URL` to the new connection string.
4. Restore data with `pg_restore` or `psql`.
5. Run `pnpm --filter @workspace/db push` to apply any schema additions.

**Providers:** Supabase (free tier), Neon (free tier), Railway ($5/month), PlanetScale (for MySQL — requires ORM change), AWS RDS, DigitalOcean Managed Databases.

---

## 2. SendGrid Email — FIXED ✓

**What it was:** The original code fetched SendGrid credentials from the Replit Connectors API using Replit-internal tokens. It would not work on any other platform.

**What was changed:** `artifacts/api-server/src/lib/sendgrid.ts` now checks `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` environment variables first. If they are set, Replit Connectors are never called. The Replit path is kept as a fallback so existing Replit deployments continue to work.

**What to do on a new platform:**
```
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Xuvilo       # optional display name
```

Get your API key from https://app.sendgrid.com → Settings → API Keys. The sender email must be verified in SendGrid.

---

## 3. Stripe Payments — FIXED ✓ (Stripe currently disabled)

**What it was:** Same as SendGrid — credentials were fetched from Replit Connectors.

**What was changed:** `artifacts/api-server/src/lib/stripeClient.ts` now checks `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` first.

**What to do when re-enabling payments on a new platform:**
1. Uncomment the disabled blocks in `artifacts/api-server/src/index.ts` and `src/app.ts`.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
3. Set the four Price ID variables (see `docs/ENV_VARS.md`).
4. Address the `stripe-replit-sync` dependency (see item 4 below).

---

## 4. `stripe-replit-sync` Package

**What it is:** A Replit-created npm package (`stripe-replit-sync`) that syncs Stripe subscription data into the app's PostgreSQL database. It is used in `artifacts/api-server/src/lib/stripeClient.ts` (`getStripeSync()`) and `src/index.ts` (commented out).

**Replit-specific?** Yes. This package connects to Replit-internal services and is not useful outside Replit.

**How to replace it when enabling payments:**
1. Remove the `stripe-replit-sync` import from `stripeClient.ts` and `index.ts`.
2. Remove `stripe-replit-sync` from the root `package.json`.
3. Use standard Stripe webhooks to receive subscription events and update `app_users` directly:
   - Listen for `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
   - Update `tier`, `subscription_status`, `current_period_end`, etc. in `app_users` from the webhook payload.
4. Create the Stripe webhook in your Stripe dashboard pointing to `https://yourdomain.com/api/stripe/webhook`.
5. Set `STRIPE_WEBHOOK_SECRET`.

The existing webhook handler at `artifacts/api-server/src/routes/stripeWebhook.ts` already has the route structure — it just needs the sync logic replaced.

---

## 5. Replit Object Storage

**What it is:** User-uploaded files (RFQ source PDFs, generated quote PDFs) are stored in Replit Object Storage, which is a Google Cloud Storage bucket with Replit-managed authentication. The storage client (`artifacts/api-server/src/lib/objectStorage.ts`) authenticates via a Replit sidecar process running at `http://127.0.0.1:1106` — this is only available inside Replit.

**Replit-specific?** Yes. The sidecar endpoint and credential mechanism are Replit-only.

**Severity:** High — without this, file uploads and downloads will fail.

### Exporting your files before leaving Replit

While still on Replit, download all stored files:

```bash
# Using Google Cloud CLI (install: https://cloud.google.com/sdk/docs/install)
# The bucket ID is stored in DEFAULT_OBJECT_STORAGE_BUCKET_ID

# List all objects
gsutil ls gs://<your-bucket-id>/

# Download everything
gsutil -m cp -r gs://<your-bucket-id>/private ./exported-files/
```

Alternatively, write a one-time Node.js script using the existing `objectStorage.ts` client while still in Replit to enumerate and download all `file_objects` records.

### Replacing the storage client on a new platform

**Option A: AWS S3** (recommended)

1. Create an S3 bucket in your AWS account.
2. Create an IAM user with S3 read/write access. Get the access key and secret.
3. Replace `artifacts/api-server/src/lib/objectStorage.ts` with:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET!;

export async function putObject(key: string, data: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: data, ContentType: contentType }));
}

export async function getObject(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

export async function getSignedDownloadUrl(key: string, filename: string, ttlSeconds = 600) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET, Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
}

export async function deleteObject(key: string) {
  try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })); } catch {}
}

export function buildStorageKey(userId: string, purpose: string, filename: string) {
  const id = crypto.randomUUID();
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200);
  return `private/users/${userId}/${purpose}/${id}-${safe}`;
}
```

4. Add env vars: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.
5. Install the AWS SDK: `pnpm --filter @workspace/api-server add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.

**Option B: Standard Google Cloud Storage** (closest to current)

Use a GCS service account instead of Replit's sidecar. The existing `@google-cloud/storage` package is already installed.

1. Create a GCS bucket and a Service Account with `Storage Object Admin` role.
2. Download the service account JSON key file.
3. Replace the `getStorage()` function in `objectStorage.ts`:

```typescript
const storageClient = new Storage({
  keyFilename: process.env.GCS_KEY_FILE,   // path to JSON key
  // or: credentials: JSON.parse(process.env.GCS_CREDENTIALS!)
});
```

4. Add env vars: `GCS_KEY_FILE` (or `GCS_CREDENTIALS`) and update `DEFAULT_OBJECT_STORAGE_BUCKET_ID` to your bucket name.

**Option C: Cloudflare R2** (S3-compatible, no egress fees)

R2 uses the same API as AWS S3. Use the same S3 client code from Option A with these endpoint settings:

```typescript
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY!, secretAccessKey: process.env.R2_SECRET_KEY! },
});
```

---

## 6. Replit Vite Dev Plugins

**What they are:** Three npm packages from Replit used in `artifacts/businesses-hub/vite.config.ts`:

- `@replit/vite-plugin-runtime-error-modal` — shows a nicer error overlay during development
- `@replit/vite-plugin-dev-banner` — shows a Replit dev banner (in `pnpm-workspace.yaml` catalog, may not be used)
- `@replit/vite-plugin-cartographer` — Replit code-navigation helper (in catalog, may not be used)

**Replit-specific?** These packages only affect the development experience, not production builds.

**Action required?** None immediately. They are in `devDependencies` and are inert during production builds. If you prefer a clean setup, remove them:

1. Remove the import from `vite.config.ts`:
   ```diff
   - import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
   ```
2. Remove it from the `plugins` array in `vite.config.ts`.
3. Remove the three `@replit/*` entries from `pnpm-workspace.yaml` catalog and from `artifacts/businesses-hub/package.json`.
4. Run `pnpm install`.

---

## 7. System Packages (poppler, tesseract)

**What they are:** Native Linux utilities used by the RFQ Intelligence module:
- `poppler-utils` provides `pdftotext` for text extraction from PDFs
- `tesseract-ocr` provides OCR for scanned/image PDFs

**Replit-specific?** Only in that Replit uses Nix (`replit.nix`) to install them. On any other platform, install via the system package manager.

**Install on Ubuntu/Debian:**
```bash
apt-get install poppler-utils tesseract-ocr
```

**Install on macOS:**
```bash
brew install poppler tesseract
```

**Install on Alpine Linux:**
```bash
apk add poppler-utils tesseract-ocr
```

If RFQ Intelligence is not needed, these can be omitted.

---

## 8. Replit Environment Variable References

The code references several Replit-specific environment variables as fallbacks. With the portability fixes applied, none of these are required on another platform — but understanding what they did is useful:

| Variable | Used for | Non-Replit replacement |
|----------|----------|----------------------|
| `REPLIT_DEV_DOMAIN` | Auto-construct app URL in auth emails | Set `PUBLIC_APP_URL` |
| `REPLIT_DOMAINS` | Auto-construct app URL in production | Set `PUBLIC_APP_URL` |
| `REPLIT_DEPLOYMENT` | Detect production vs dev for Stripe env | Set `NODE_ENV=production` |
| `REPLIT_CONNECTORS_HOSTNAME` | Fetch SendGrid/Stripe credentials | Now unused (env vars used directly) |
| `REPL_IDENTITY` / `WEB_REPL_RENEWAL` | Auth token for Replit Connectors | Now unused |
| `REPLIT_SIDECAR_ENDPOINT` | Object Storage authentication | Replaced with storage client refactor |

**Always set `PUBLIC_APP_URL` explicitly on non-Replit deployments.** The auth module falls back to Replit variables for URL construction, but those won't be present.

---

## Migration checklist

Use this when moving the project to a new platform:

- [ ] Provision a PostgreSQL 16+ database
- [ ] Export data with `pg_dump` from the old database
- [ ] Restore data to the new database
- [ ] Run `pnpm --filter @workspace/db push` on the new database
- [ ] Export all files from Replit Object Storage
- [ ] Replace `objectStorage.ts` with S3, GCS, or R2 client
- [ ] Upload exported files to the new storage bucket
- [ ] Update `file_objects.storage_key` values if the bucket/path structure changes
- [ ] Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`
- [ ] Set `AUTH_SIGNING_SECRET`
- [ ] Set `PUBLIC_APP_URL` to the new domain
- [ ] Set `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY` (create a new widget for the new domain)
- [ ] Set `VITE_GA4_MEASUREMENT_ID` (add the new domain to GA4 property)
- [ ] Install system packages: `poppler-utils`, `tesseract-ocr`
- [ ] Test email sending end-to-end
- [ ] Test file upload and download
- [ ] Test user login and registration
- [ ] Test document creation and PDF export
- [ ] Configure reverse proxy / CDN for the new domain
