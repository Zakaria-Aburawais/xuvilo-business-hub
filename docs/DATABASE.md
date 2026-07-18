# Database Reference

Xuvilo uses **PostgreSQL 16** accessed via **Drizzle ORM**. All table definitions live in `lib/db/src/schema/`. There are no migration files — the project uses `drizzle-kit push` which applies the schema directly to the database.

---

## Connection

Set `DATABASE_URL` to a standard PostgreSQL connection string:

```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME
```

---

## Applying the schema to a new database

```bash
# Creates/updates all tables in the target database
pnpm --filter @workspace/db push
```

This is safe to re-run — it only adds new tables and columns, it does not drop existing data.

---

## Tables

### `app_users` — User accounts
The primary user table. Authentication is custom JWT + scrypt (no OAuth).

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | UUID |
| `email` | varchar(320) unique | Login email |
| `name` | varchar(255) | Display name |
| `password_hash` | text | scrypt hash (`s1$<salt>$<hash>`) |
| `role` | varchar(16) | `user` or `admin` |
| `tier` | varchar(32) | `free`, `pro`, `business` |
| `billing_interval` | varchar(16) | `monthly` or `yearly` (when subscribed) |
| `subscription_status` | varchar(32) | Stripe subscription status |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_subscription_id` | text | Stripe subscription ID |
| `current_period_end` | timestamp tz | Subscription end date |
| `cancel_at_period_end` | varchar(8) | `"true"` if cancellation scheduled |
| `created_at` | timestamp tz | |
| `updated_at` | timestamp tz | |

### `company_profiles` — Company details per user
One profile per user. Stores business information used to pre-fill documents.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | UUID |
| `user_id` | varchar(64) FK → app_users | Cascade delete |
| `company_name` | varchar(255) | |
| `logo_data` | text | Base64 data URL |
| `address` | text | |
| `city` | varchar(128) | |
| `country` | varchar(64) | |
| `phone` | varchar(64) | |
| `email` | varchar(320) | Business contact email |
| `website` | varchar(512) | |
| `tax_or_vat_number` | varchar(64) | e.g. VAT registration |
| `registration_number` | varchar(64) | Company registration |
| `default_currency` | varchar(8) | ISO 4217, e.g. `SAR` |
| `default_language` | varchar(8) | `en` or `ar` |
| `default_payment_terms` | text | |
| `default_notes` | text | |
| `brand_color` | varchar(16) | Hex color |
| `signatory_name` | varchar(255) | |
| `signatory_title` | varchar(255) | |
| `signature_data` | text | Base64 data URL |
| `bank_name` | varchar(255) | |
| `bank_account_name` | varchar(255) | |
| `bank_account_number` | varchar(128) | |
| `bank_iban` | varchar(128) | |
| `bank_swift` | varchar(64) | |
| `bank_address` | text | |
| `default_delivery_terms` | text | |
| `default_warranty` | text | |

### `user_documents` — Saved invoices, quotations, receipts
All document types share this table; the full document data is in `payload` (JSONB).

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | UUID |
| `user_id` | varchar(64) FK | Cascade delete |
| `type` | varchar(32) | `invoice`, `quotation`, `receipt` |
| `title` | varchar(255) | Display title |
| `client_name` | varchar(255) | |
| `amount` | numeric(18,2) | Grand total |
| `currency` | varchar(8) | ISO 4217 |
| `status` | varchar(16) | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| `payload` | jsonb | Full document fields |
| `created_at` | timestamp tz | |
| `last_edited_at` | timestamp tz | |

### `user_clients` — Client address book
Client contacts saved by each user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | |
| `user_id` | varchar(64) FK | |
| `name` | varchar(255) | |
| `company` | varchar(255) | |
| `email` | varchar(320) | |
| `phone` | varchar(64) | |
| `address` | text | |
| `city` | varchar(128) | |
| `country` | varchar(64) | |
| `tax_id` | varchar(64) | |
| `notes` | text | |
| `short_code` | varchar(64) | User-defined code |
| `rfq_format_notes` | text | RFQ-specific notes |
| `submission_email` | varchar(320) | RFQ submission email |
| `special_requirements` | text | |
| `industry` | varchar(128) | |

### `ai_writer_drafts` — AI Writer saved drafts

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | |
| `user_id` | varchar(64) FK | |
| `purpose` | varchar(64) | Message type (e.g. `payment_reminder`) |
| `language` | varchar(8) | `en` or `ar` |
| `tone` | varchar(32) | `formal`, `friendly`, etc. |
| `length` | varchar(16) | `short`, `medium`, `long` |
| `subject` | text | |
| `body` | text | Generated message |
| `inputs` | jsonb | Input fields used to generate |

### `rfq_documents` — RFQ (tender) documents
Uploaded RFQ/tender PDFs and their parsed data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | |
| `user_id` | varchar(64) FK | |
| `rfq_number` | varchar(128) | |
| `pr_number` | varchar(128) | |
| `client_id` | varchar(64) | |
| `detected_client_name` | varchar(255) | AI-detected |
| `enquiry_date` | varchar(64) | |
| `closing_date` | varchar(64) | |
| `submission_email` | varchar(320) | |
| `submission_instructions` | text | |
| `payment_terms` | text | |
| `delivery_terms` | text | |
| `validity_days` | integer | |
| `currency` | varchar(8) | |
| `item_count` | integer | |
| `parsed_data` | jsonb | Full parsed items |
| `research_data` | jsonb | AI research results |
| `status` | varchar(32) | `pending`, `processing`, `complete`, `error` |
| `task_id` | varchar(64) | Background task reference |
| `file_id` | varchar(64) | Reference to `file_objects` |
| `source_filename` | varchar(500) | |

### `rfq_quotes` — Generated quotes for RFQ items
Line-item quotes generated for each RFQ document.

### `rfq_suppliers` — Supplier profiles linked to RFQ
Supplier information researched/added during RFQ processing.

### `file_objects` — Uploaded files metadata
Tracks files uploaded to object storage. The actual file lives in object storage; this table holds the metadata.

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | |
| `user_id` | varchar(64) FK | |
| `storage_key` | varchar(1024) | Path in object storage bucket |
| `filename` | varchar(500) | Original filename |
| `content_type` | varchar(128) | MIME type |
| `size_bytes` | integer | |
| `purpose` | varchar(64) | `rfq_source`, `rfq_quote`, etc. |
| `linked_entity_type` | varchar(64) | e.g. `rfq_document` |
| `linked_entity_id` | varchar(64) | |
| `client_id` | varchar(64) | |
| `notes` | text | |

### `contact_messages` — Contact form submissions

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | |
| `name` | varchar(200) | |
| `email` | varchar(320) | |
| `subject` | varchar(300) | |
| `message` | text | |
| `lang` | varchar(8) | |
| `ip` | varchar(64) | |
| `user_agent` | text | |
| `mail_status` | varchar(16) | `pending`, `sent`, `failed` |

### `newsletter_subscribers` — Email newsletter

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(64) PK | |
| `email` | varchar(320) unique | |
| `source` | varchar(64) | Where they subscribed |
| `created_at` | timestamp tz | |
| `unsubscribed_at` | timestamp tz | Null = still subscribed |

### `password_reset_tokens` — Password reset flow

### `user_settings` — Per-user key-value settings store

### `user_tasks` — Task/to-do items per user

### `activity_events` — Activity log per user

### `usage_counters` — Tracks feature usage per user (for free-tier limits)

### `testimonials` — Testimonials shown on the site

### `rate_limit_buckets` — Rate limiting state (server-side)

### `spam_events` / `spam_events_prune_status` — Spam detection records

### `rate_limit_buckets_prune_status` — Rate-limit prune tracking

### `alert_debounce` — Prevents duplicate alert emails

### `pruner_alert_events` — Alerts from background pruning jobs

---

## Backup

### Export the entire database

```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file=xuvilo_backup_$(date +%Y%m%d_%H%M%S).dump
```

`--format=custom` produces a compressed binary dump that is faster and smaller than plain SQL.

### Export as plain SQL (more portable)

```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file=xuvilo_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Export only specific tables

```bash
pg_dump "$DATABASE_URL" \
  --no-owner --no-acl \
  --table=app_users \
  --table=company_profiles \
  --table=user_documents \
  --table=user_clients \
  --table=newsletter_subscribers \
  --format=plain \
  --file=xuvilo_core_data.sql
```

---

## Restore

### Restore a custom-format dump to a fresh database

```bash
# Create the target database first
psql "$TARGET_DATABASE_URL" -c "CREATE DATABASE xuvilo;"

# Restore
pg_restore \
  --no-owner \
  --no-acl \
  --dbname="$TARGET_DATABASE_URL" \
  xuvilo_backup_YYYYMMDD_HHMMSS.dump
```

### Restore a plain SQL dump

```bash
psql "$TARGET_DATABASE_URL" < xuvilo_backup_YYYYMMDD_HHMMSS.sql
```

### After restoring — apply any schema changes

If the Drizzle schema has changed since the backup was taken, run push to apply new columns/tables:

```bash
DATABASE_URL="$TARGET_DATABASE_URL" pnpm --filter @workspace/db push
```

---

## Exporting object storage files

User-uploaded files (RFQ PDFs, quote PDFs) live in Replit Object Storage, not in the database. Before migrating off Replit, download all files from the bucket using the Google Cloud CLI or `@google-cloud/storage`. See `docs/PORTABILITY_AUDIT.md` for details.

---

## Database performance notes

- All foreign key columns are indexed.
- `user_documents`, `rfq_documents`, `user_clients`, and `activity_events` each have composite indexes on `user_id` for fast per-user queries.
- `spam_events` and `rate_limit_buckets` are pruned automatically by background jobs in the API server. Retention periods are configurable via env vars.
