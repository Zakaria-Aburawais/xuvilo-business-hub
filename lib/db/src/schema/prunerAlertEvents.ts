import {
  pgTable,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Append-only history of pruner-health alerts (problem + recovery) that the
// notifier has dispatched. Powers the alert-history strip on the admin Spam
// dashboard so on-call staff can see "when did this pruner last page? when
// did it recover? how long was the incident?" without digging through Slack.
//
// In-memory `alertState` in `pruneHealthNotifier.ts` resets on every server
// restart, so without a persisted log the dashboard would forget every prior
// incident on each deploy. One row per dispatched alert (a "problem" row for
// each failing/stale alert, plus a "recovered" row carrying the unhealthy
// duration when the incident closes).
//
// Alert volume is heavily debounced (default 60-min cool-down per pruner)
// so even a chronically failing pruner produces ~24 rows/day at worst, but
// a scheduled trim (see `prunerAlertEventsPrune.ts` in the api-server) still
// deletes rows older than the retention window below so the table and its
// index stay small over years of operation.
//
// Default retention for the trim job. 90 days comfortably covers "when did
// this pruner last page?" forensics — the dashboard strip only ever renders
// the latest 5 alerts per pruner. Override with
// `PRUNER_ALERT_EVENTS_RETENTION_DAYS`.
export const PRUNER_ALERT_EVENTS_RETENTION_DAYS_DEFAULT = 90;

export const prunerAlertEventsTable = pgTable(
  "pruner_alert_events",
  {
    id: varchar("id", { length: 64 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // Stable machine key matching `prunerKey` in the notifier payload
    // (e.g. "spam_events", "rate_limit_buckets"). Used to filter the
    // dashboard strip to one pruner at a time.
    prunerKey: varchar("pruner_key", { length: 64 }).notNull(),
    // Mirrors `PrunerAlertKind` from the notifier: "failing" | "stale"
    // | "recovered". A 16-char column comfortably fits the longest value
    // ("recovered") with room to spare for any future kinds.
    kind: varchar("kind", { length: 16 }).notNull(),
    // Wall-clock time the alert was dispatched. Indexed (composite with
    // `pruner_key`) so the dashboard's "last 5 per pruner" query stays fast
    // even as the table grows over years of operation.
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Recovery-only: how long (in ms) the pruner was unhealthy before this
    // recovery alert. Null for problem rows (failing/stale). bigint because
    // a long-running incident over a multi-week outage could easily exceed
    // 32-bit ms (max ~24.8 days).
    unhealthyDurationMs: bigint("unhealthy_duration_ms", {
      mode: "number",
    }),
    // Optional snapshot of the pruner's last error string at dispatch time
    // for problem rows. Capped to a sane length by the writer to keep the
    // table compact. Null for recovery rows.
    lastError: text("last_error"),
    // Optional snapshot of the pruner's "last successful run age" (ms) at
    // dispatch time. Useful when reconstructing an incident timeline from
    // history alone. Null when no successful run has ever been recorded.
    lastSuccessAgeMs: bigint("last_success_age_ms", { mode: "number" }),
    // Echo of the configured cadence (ms) at dispatch time. Lets the
    // dashboard render the strip without needing to cross-reference the
    // current cadence (which may have changed since the alert fired).
    intervalMs: integer("interval_ms").notNull().default(0),
  },
  (table) => ({
    // Composite index on (pruner_key, created_at desc) is what the
    // "last N alerts for this pruner" query hits.
    prunerCreatedIdx: index("pruner_alert_events_pruner_created_idx").on(
      table.prunerKey,
      table.createdAt,
    ),
  }),
);

export type PrunerAlertEvent = typeof prunerAlertEventsTable.$inferSelect;
export type InsertPrunerAlertEvent =
  typeof prunerAlertEventsTable.$inferInsert;
