import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Per-key cool-down ledger for operational alerts (pruner-health,
// spam-spike, etc). One row per `alert_key`, holding the timestamp of the
// most recent alert that was actually sent for that key.
//
// Why this exists: the notifiers used to debounce in-memory using a per-key
// Map. Every server restart reset that map, so a chronic outage that had
// already paged ops 10 minutes ago would re-fire its alert on the very next
// tick after a deploy. Persisting `last_alerted_at` here lets the
// debouncer survive restarts: an in-progress incident pages once and then
// stays quiet for the configured cool-down window even across redeploys.
//
// The table is intentionally tiny (one row per alert key) and is
// upserted-only — there is no history to keep, only "when did we last
// page for this key?". If history is ever needed, switch the primary key
// to `(alert_key, alerted_at)` and append on each send.

// Default retention window for the background pruner. Rows whose
// `last_alerted_at` is older than this are deleted. Deliberately generous:
// every debounce window in use today is measured in minutes-to-hours, so a
// 30-day-old row can never be inside an active cool-down — deleting it is
// always behaviour-neutral.
export const ALERT_DEBOUNCE_RETENTION_DAYS_DEFAULT = 30;

export const alertDebounceTable = pgTable("alert_debounce", {
  // Stable, grep-friendly key chosen by the caller (e.g. "spam_spike",
  // "pruner_health:spam_events"). The notifier modules own their own key
  // namespacing so a chronic failure in one signal cannot silence a
  // different one.
  alertKey: text("alert_key").primaryKey(),
  // Wall-clock time the most recent alert for this key was sent. The
  // claim path uses an atomic upsert that only advances this column when
  // `now - last_alerted_at >= debounceMs`, so it doubles as the source of
  // truth for "is the cool-down still active?".
  lastAlertedAt: timestamp("last_alerted_at", { withTimezone: true }).notNull(),
});

export type AlertDebounce = typeof alertDebounceTable.$inferSelect;
export type InsertAlertDebounce = typeof alertDebounceTable.$inferInsert;
