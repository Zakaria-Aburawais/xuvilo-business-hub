# Database Reference — Xuvilo Business Hub

**Engine:** PostgreSQL 15+  
**ORM:** Drizzle ORM  
**Schema location:** `lib/db/src/schema/`  
**Migration approach:** Schema push (`drizzle-kit push`) — no SQL migration files

---

## Connection

The database is identified by the `DATABASE_URL` environment variable:

```
DATABASE_URL=postgresql://user:password@host:5432/xuvilo
```

In Replit, this is provisioned and injected automatically. Outside Replit, provision a PostgreSQL instance and set `DATABASE_URL` in your environment.

---

## Applying the schema

There are no SQL migration files. The schema is applied by pushing the Drizzle schema definitions directly to the database:

```bash
# Push schema to your database (creates/alters tables to match the schema)
DATABASE_URL=postgresql://... pnpm --filter @workspace/db run push

# Force push (accepts all destructive changes without prompting — use with caution)
DATABASE_URL=postgresql://... pnpm --filter @workspace/db run push-force
```

> **Warning:** `push-force` can drop columns or tables that no longer exist in the schema. Always back up production data before running it.

When adding or modifying tables:
1. Edit the relevant file in `lib/db/src/schema/`
2. Export the new table from `lib/db/src/schema/index.ts`
3. Run `pnpm --filter @workspace/db run push` against your target database

---

## Tables

### `app_users`
User accounts. Roles: `user`, `admin`. Tiers: `free`, `pro`, `business`.

| Column | Type | Notes |
|---|---|---|
| `id` | varchar(64) | PK — UUID |
| `email` | varchar(320) | Unique |
| `name` | varchar(255) | Display name |
| `password_hash` | text | bcrypt hash; null for OAuth users |
| `role` | varchar(16) | `user` or `admin` |
| `preferred_language` | varchar(8) | `en` or `ar` |
| `tier` | varchar(32) | `free`, `pro`, or `business` |
| `billing_interval` | varchar(16) | `monthly` or `yearly` (Stripe) |
| `subscription_status` | varchar(32) | Stripe subscription status |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_subscription_id` | text | Stripe subscription ID |
| `current_period_end` | timestamptz | Stripe billing period end |
| `cancel_at_period_end` | varchar(8) | `true` or `false` (Stripe) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `user_documents`
Invoices, quotations, and receipts created by users.

| Column | Type | Notes |
|---|---|---|
| `id` | varchar(64) | PK — UUID |
| `user_id` | varchar(64) | FK → app_users (cascade delete) |
| `type` | varchar(32) | `invoice`, `quotation`, `receipt` |
| `title` | varchar(255) | Document title |
| `client_name` | varchar(255) | |
| `amount` | numeric(18,2) | Total amount |
| `currency` | varchar(8) | ISO currency code |
| `status` | varchar(16) | `draft`, `sent`, `paid`, `cancelled` |
| `payload` | jsonb | Full document data (line items, etc.) |
| `created_at` | timestamptz | |
| `last_edited_at` | timestamptz | |

### `company_profiles`
One company profile per user (one-to-one).

Columns include: company name, logo (base64 data), address, city, country, phone, email, website, tax/VAT number, registration number, default currency, default language, default payment terms, default notes, brand color, signatory name/title, signature image, bank details (name, account number, IBAN, SWIFT, address), default delivery terms, default warranty.

### `clients`
Saved client/customer records per user (address book).

### `rfq_documents`
RFQ (Request for Quotation) tender documents uploaded and parsed by users.

| Column | Type | Notes |
|---|---|---|
| `id` | varchar(64) | PK |
| `user_id` | varchar(64) | FK → app_users |
| `rfq_number` | varchar(128) | Extracted from PDF |
| `source_filename` | varchar(500) | Original uploaded filename |
| `parsed_data` | jsonb | Extracted line items, specs, etc. |
| `research_data` | jsonb | AI supplier research results |
| `status` | varchar(32) | `pending`, `parsing`, `researching`, `done`, `error` |
| `task_id` | varchar(64) | Async task ID for progress tracking |
| `file_id` | varchar(64) | Object storage file reference |

### `rfq_quotes`
Generated quotes derived from RFQ documents.

### `rfq_suppliers`
Supplier records researched during RFQ processing.

### `newsletter_subscribers`
Email addresses subscribed to the newsletter.

| Column | Type | Notes |
|---|---|---|
| `id` | varchar(64) | PK |
| `email` | varchar(320) | Unique |
| `source` | varchar(64) | Where subscriber signed up |
| `created_at` | timestamptz | |
| `unsubscribed_at` | timestamptz | Null = still subscribed |

### `ai_writer_drafts`
Saved AI Writer drafts per user.

### `contact_messages`
Contact form submissions.

### `usage_counters`
Per-user feature usage counters (for free-tier limits).

### `user_settings`
Per-user preference overrides (language, notifications, etc.).

### `user_tasks`
Async background task records (for RFQ processing progress).

### `activity_events`
User activity log (document creation, logins, etc.).

### `file_objects`
Metadata for files stored in object storage.

### `testimonials`
Testimonials shown on the marketing site.

### `rate_limit_buckets`
Rolling-window rate limit state (per IP + email).

### `rate_limit_buckets_prune_status`
Tracks when the rate limit pruner last ran.

### `spam_events`
Individual spam event records.

### `spam_events_prune_status`
Tracks when the spam events pruner last ran.

### `alert_debounce`
Deduplication state for spam/pruner alert emails.

### `pruner_alert_events`
Log of alerting events from background pruners.

### `password_reset_tokens`
Time-limited tokens for password reset flows.

---

## Backup and restore

### Backup (pg_dump)

```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file=xuvilo_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore

```bash
# Restore to a new database (must exist first)
createdb xuvilo_restore
pg_restore \
  --no-owner \
  --no-acl \
  --dbname="postgresql://user:password@host:5432/xuvilo_restore" \
  xuvilo_backup_20260718_120000.dump
```

### In Replit

Replit's PostgreSQL integration does not provide direct `pg_dump` access. To back up from Replit:

1. Connect with any PostgreSQL client using the `DATABASE_URL` shown in Replit's Secrets panel
2. Run `pg_dump` from your local machine pointing at the Replit database URL
3. Or export data via the API (e.g. `/api/admin/export` if implemented)

---

## Schema changes in production

1. **Test the change on a staging database first** — push to a copy of production data
2. Run `drizzle-kit push` (not `push-force`) — it will show what it plans to change and ask for confirmation on destructive changes
3. Back up production data before any destructive change (column drop, table rename)
4. The app does not run migrations on startup — you must run the push command manually before deploying new code that depends on the schema change
