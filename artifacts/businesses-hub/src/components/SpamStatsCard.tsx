import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, X, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Trash2,
  BellRing,
  BellOff,
  AlertTriangle,
  CheckCircle2,
  History,
  Send,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAuthToken } from "@/lib/billingApi";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface DailyBucket {
  date: string;
  honeypot: number;
  captcha: number;
}

interface PruneLastRun {
  ranAt: string;
  deleted: number;
  retentionDays: number;
  error: string | null;
}

// One row in the per-pruner alert-history strip. Mirrors the server's
// `PrunerAlertHistoryEntry`. Optional fields tolerate older API responses
// (mid-rollout) that may not include the snapshot columns.
export interface PrunerAlertHistoryEntry {
  at: string;
  kind: "failing" | "stale" | "recovered";
  unhealthyDurationMs?: number | null;
  lastError?: string | null;
}

interface SpamStatsResponse {
  rangeDays: number;
  generatedAt: string;
  totals: { honeypot: number; captcha: number };
  last24h: { honeypot: number; captcha: number };
  daily: DailyBucket[];
  recent: Array<{
    id: string;
    createdAt: string;
    kind: string;
    reason: string;
    ip: string;
  }>;
  turnstileEnabled: boolean;
  // Optional so older API responses (mid-rollout) don't crash the widget.
  // `intervalMs` (also optional for mid-rollout) is the expected cadence the
  // server runs this pruner at; the badge uses 2× this as the staleness
  // threshold.
  prune?: {
    retentionDays: number;
    intervalMs?: number;
    lastRun: PruneLastRun | null;
    // Timestamp of the most recent SUCCESSFUL run, preserved across failing
    // runs so the dashboard can show "last good run N hours ago" while the
    // most recent execution is still erroring. Optional for mid-rollout —
    // older servers won't include the field at all (treated as unknown).
    lastSuccessAt?: string | null;
    // Most recent dispatched alerts (problem + recovery) for this pruner,
    // newest first. Optional so older API responses (mid-rollout) don't
    // crash the widget — the strip simply doesn't render.
    alertHistory?: PrunerAlertHistoryEntry[];
  };
  // Same shape as `prune`, but for the rate-limit-buckets pruner. Optional
  // for the same mid-rollout reason — older servers won't include it.
  rateLimitPrune?: {
    retentionDays: number;
    intervalMs?: number;
    lastRun: PruneLastRun | null;
    lastSuccessAt?: string | null;
    alertHistory?: PrunerAlertHistoryEntry[];
  };
  alerts?: {
    enabled: boolean;
    threshold: number | null;
    debounceMinutes: number | null;
    channels: { webhook: boolean; email: boolean };
  };
  // Per-signal alert cool-down ledger. Optional so older API responses
  // (mid-rollout) don't crash the widget — the block simply doesn't render.
  alertCooldowns?: AlertCooldownEntry[];
}

// One row of the alert cool-down widget. Mirrors the server's
// `AlertCooldownEntry`. `debounceMs` is the same cool-down the notifier
// enforces via the persisted debounce table, so the "next page allowed in…"
// countdown always matches what would actually fire. Null `debounceMs`
// means that signal's alerting is currently disabled (no channel env set).
export interface AlertCooldownEntry {
  key: string;
  lastAlertedAt: string | null;
  debounceMs: number | null;
}

// Stable machine keys the server emits in `alertCooldowns[].key`, mapped to
// human-readable translation keys. Unknown keys (a future signal added
// server-side first) fall back to showing the raw key so nothing is hidden.
const COOLDOWN_SIGNAL_LABEL_KEYS: Record<string, string> = {
  spam_spike: "admin.alert_cooldown.signal.spam_spike",
  "pruner_health:spam_events": "admin.alert_cooldown.signal.pruner_spam_events",
  "pruner_health:rate_limit_buckets":
    "admin.alert_cooldown.signal.pruner_rate_limit_buckets",
};

const RANGE_DAYS = 7;

// Cadence of the incident-mode auto-refresh. 30s is fast enough to watch a
// spam wave evolve without hammering the admin endpoint.
export const AUTO_REFRESH_INTERVAL_MS = 30_000;

/**
 * Run `callback` every `intervalMs` while the tab is visible. The timer is
 * torn down when the tab goes hidden (`document.visibilityState`) so a
 * dashboard left open in a background tab doesn't hammer the API, and
 * re-created when the tab becomes visible again.
 *
 * Bumping `resetKey` restarts the interval from zero — the card uses this
 * to make a manual refresh click push the next auto-refresh a full period
 * out, instead of double-fetching moments after the click.
 *
 * The callback is kept in a ref so a re-render with a new closure never
 * resets the timer by itself.
 */
export function useAutoRefresh(
  callback: () => void,
  intervalMs: number,
  resetKey: number,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (typeof document === "undefined") return;
    let id: number | null = null;

    const start = () => {
      if (id != null) return;
      id = window.setInterval(() => cbRef.current(), intervalMs);
    };
    const stop = () => {
      if (id != null) {
        window.clearInterval(id);
        id = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, resetKey]);
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Light template substitution for the i18n values that contain `{name}`
// placeholders. The shared `t()` helper is plain-key lookup only, so we apply
// the values at the call site to keep the translation dictionaries simple.
function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

function formatRanAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface PruneBlockProps {
  title: string;
  hint: string;
  retentionDays: number;
  // Expected cadence in milliseconds. Used to flag the badge as stale when
  // the most recent run is older than 2× this. Optional: when undefined
  // (older API responses mid-rollout) the badge falls back to the
  // error-only signal.
  intervalMs?: number;
  lastRun: PruneLastRun | null;
  // Timestamp of the most recent SUCCESSFUL run (preserved across failing
  // runs by the server). Surfaced beneath the badge when the pruner is
  // currently failing/stale so operators can see "failing for 6h, last good
  // run 14h ago" without digging into logs. Optional for mid-rollout — older
  // API responses won't include it.
  lastSuccessAt?: string | null;
  lang: string;
  t: (key: string) => string;
  // Stable test-id prefix so each pruner block can be queried independently
  // (e.g. `admin-spam-prune` vs `admin-ratelimit-prune`).
  testIdPrefix: string;
  // Most recent dispatched alerts for this pruner, newest first. When
  // omitted (older API response mid-rollout) the history strip is hidden;
  // when present but empty, the strip renders an "empty state" line so
  // operators know the absence of alerts is meaningful, not a load error.
  alertHistory?: PrunerAlertHistoryEntry[];
  // Optional action button rendered at the end of the block's header row
  // (e.g. the spam pruner's "Run cleanup now" trigger). Omitted for pruners
  // that have no manual trigger.
  action?: ReactNode;
}

type HealthLevel = "healthy" | "stale" | "failing" | "unknown";

// One channel's outcome from the test-alert endpoint, mirrored for the
// in-memory "last test" status line. `attempted=false` means no env var was
// configured for that channel so we couldn't even try it. `ok=null` paired
// with `attempted=true` is reserved for future-proofing (e.g. an in-flight
// state); today the server only returns boolean ok values for attempted
// channels, but we keep the optional shape to avoid forcing a redeploy on
// minor server changes.
interface TestChannelResult {
  attempted: boolean;
  ok: boolean | null;
}

// Snapshot of the most recent test-alert attempt for the session. `status`
// mirrors the four toast outcomes so the status line and the toast stay in
// agreement. `webhook` / `email` are only populated when the server returned
// a structured `result` body (i.e. status === "success" or "partial").
interface LastTestResult {
  at: number;
  status: "success" | "partial" | "disabled" | "error";
  webhook: TestChannelResult | null;
  email: TestChannelResult | null;
  // "Background cleanup health" lines echoed by the server — the exact same
  // text embedded in the sent Slack/email bodies, so the admin can preview
  // the section without opening Slack or their inbox. Null/empty when the
  // server didn't return them (older server build, disabled, error).
  cleanupHealthLines?: string[] | null;
}

// Key used to persist the most recent test-alert attempt in
// `sessionStorage`. Persisting only across the current browser tab/session
// matches the task's "for the current session" scope — closing the tab
// clears it, so we never resurface a stale result from days ago.
const LAST_TEST_RESULT_STORAGE_KEY = "admin-prune-test-alert.last-result.v1";

// Narrow runtime guard for values pulled out of `sessionStorage`. We can't
// trust the shape (the user may have hand-edited storage, or an older build
// may have written a different schema) so every field is validated before
// the result is hydrated into state.
function isValidChannelResult(v: unknown): v is TestChannelResult {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.attempted === "boolean" &&
    (obj.ok === null || typeof obj.ok === "boolean")
  );
}

function isValidLastTestResult(v: unknown): v is LastTestResult {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.at !== "number" || !Number.isFinite(obj.at)) return false;
  if (
    obj.status !== "success" &&
    obj.status !== "partial" &&
    obj.status !== "disabled" &&
    obj.status !== "error"
  ) {
    return false;
  }
  if (obj.webhook !== null && !isValidChannelResult(obj.webhook)) return false;
  if (obj.email !== null && !isValidChannelResult(obj.email)) return false;
  if (
    obj.cleanupHealthLines != null &&
    (!Array.isArray(obj.cleanupHealthLines) ||
      obj.cleanupHealthLines.some((l) => typeof l !== "string"))
  ) {
    return false;
  }
  return true;
}

// Read + validate the persisted last-test result. Returns `null` for any
// failure (missing key, parse error, schema mismatch, storage unavailable in
// SSR/tests) and silently clears corrupted entries so the next write starts
// from a clean slate.
function readPersistedTestResult(): LastTestResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_TEST_RESULT_STORAGE_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidLastTestResult(parsed)) {
      window.sessionStorage.removeItem(LAST_TEST_RESULT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      window.sessionStorage.removeItem(LAST_TEST_RESULT_STORAGE_KEY);
    } catch {
      // sessionStorage may be unavailable (private mode, quota); ignore.
    }
    return null;
  }
}

function writePersistedTestResult(result: LastTestResult): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      LAST_TEST_RESULT_STORAGE_KEY,
      JSON.stringify(result),
    );
  } catch {
    // Quota / unavailable storage — the in-memory state still works for
    // the rest of this tab's lifetime, so we swallow rather than alert.
  }
}

/**
 * Pick the appropriate "N <unit> ago" template + value for a given age in
 * ms. Returned as a (key, vars) pair so the caller can run it through the
 * shared `t()` helper and `fill()` substitution — keeping unit text inside
 * the translation dictionary is required for correct Arabic/RTL rendering.
 *
 * Anything under one minute renders as "just now" so the line doesn't
 * flicker through "0 min ago" right after a successful send.
 */
export function pickRelativeAgeTemplate(ageMs: number): {
  key: string;
  vars: Record<string, number>;
} {
  const safe = Math.max(0, ageMs);
  if (safe < MINUTE_MS) {
    return { key: "admin.prune.test_alert.last.just_now", vars: {} };
  }
  if (safe < HOUR_MS) {
    return {
      key: "admin.prune.test_alert.last.minutes_ago",
      vars: { minutes: Math.max(1, Math.round(safe / MINUTE_MS)) },
    };
  }
  if (safe < DAY_MS) {
    return {
      key: "admin.prune.test_alert.last.hours_ago",
      vars: { hours: Math.max(1, Math.round(safe / HOUR_MS)) },
    };
  }
  return {
    key: "admin.prune.test_alert.last.days_ago",
    vars: { days: Math.max(1, Math.round(safe / DAY_MS)) },
  };
}

/**
 * Pick the "Last paged N <unit> ago" template + value for a given age in ms.
 * Same (key, vars) pattern as the other pickers so units stay in the
 * translation dictionaries for correct Arabic/RTL rendering. Under a minute
 * renders as "just now" so the line doesn't show "0 min ago" right after a
 * page goes out.
 */
export function pickLastPagedTemplate(ageMs: number): {
  key: string;
  vars: Record<string, number>;
} {
  const safe = Math.max(0, ageMs);
  if (safe < MINUTE_MS) {
    return { key: "admin.alert_cooldown.last_paged_just_now", vars: {} };
  }
  if (safe < HOUR_MS) {
    return {
      key: "admin.alert_cooldown.last_paged_minutes",
      vars: { minutes: Math.max(1, Math.round(safe / MINUTE_MS)) },
    };
  }
  if (safe < DAY_MS) {
    return {
      key: "admin.alert_cooldown.last_paged_hours",
      vars: { hours: Math.max(1, Math.round(safe / HOUR_MS)) },
    };
  }
  return {
    key: "admin.alert_cooldown.last_paged_days",
    vars: { days: Math.max(1, Math.round(safe / DAY_MS)) },
  };
}

/**
 * Pick the "next page allowed …" template for a remaining cool-down (ms).
 * Zero or negative remaining time renders "allowed now". Minutes are
 * ceil'd so we never claim "allowed now" while the notifier would still
 * suppress — better to overstate the wait by <1 min than understate it.
 */
export function pickNextAllowedTemplate(remainingMs: number): {
  key: string;
  vars: Record<string, number>;
} {
  if (remainingMs <= 0) {
    return { key: "admin.alert_cooldown.next_allowed_now", vars: {} };
  }
  if (remainingMs < HOUR_MS) {
    return {
      key: "admin.alert_cooldown.next_allowed_minutes",
      vars: { minutes: Math.max(1, Math.ceil(remainingMs / MINUTE_MS)) },
    };
  }
  return {
    key: "admin.alert_cooldown.next_allowed_hours",
    vars: { hours: Math.max(1, Math.ceil(remainingMs / HOUR_MS)) },
  };
}

/**
 * Render an ISO timestamp as a relative "N min ago" string via the shared
 * \ templates (just now / minutes / hours /
 * days). Unparseable timestamps fall back to the raw string so a bad row
 * never crashes the list.
 */
export function formatRelativeAgo(
  iso: string,
  t: (key: string) => string,
): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const { key, vars } = pickRelativeAgeTemplate(Date.now() - ms);
  return fill(t(key), vars);
}

interface HealthState {
  level: HealthLevel;
  // Pre-rendered tooltip text (already substituted with run-specific values).
  title: string;
  // Pre-rendered short label shown inside the badge.
  label: string;
}

const HOUR_MS = 60 * 60 * 1000;

// Format the configured cadence (in ms) as a short human-readable string for
// the staleness tooltip ("24h" for the daily spam pruner, "1h" for the
// hourly rate-limit pruner). We round to whole hours because every cadence
// in this codebase is an integer number of hours; dropping fractional hours
// keeps the tooltip readable without an extra translation key per pruner.
function formatCadence(ms: number): string {
  const hours = Math.max(1, Math.round(ms / HOUR_MS));
  if (hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "24h" : `${days}d`;
  }
  return `${hours}h`;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Pick the appropriate "last successful run: N ago" template + value for a
 * given age in ms. Returned as a (key, vars) pair so the caller can run it
 * through the shared `t()` helper and `fill()` substitution — that way the
 * unit ("m"/"h"/"d") stays inside the translation dictionary instead of being
 * concatenated in JSX, which keeps Arabic/RTL formatting correct.
 *
 * Negative ages (clock skew between server and client) are clamped to zero
 * so we never render "-3m ago".
 */
export function pickLastSuccessTemplate(ageMs: number): {
  key: string;
  vars: Record<string, number>;
} {
  const safe = Math.max(0, ageMs);
  if (safe < HOUR_MS) {
    return {
      key: "admin.spam.prune.last_success_minutes",
      vars: { minutes: Math.max(1, Math.round(safe / MINUTE_MS)) },
    };
  }
  if (safe < DAY_MS) {
    return {
      key: "admin.spam.prune.last_success_hours",
      vars: { hours: Math.max(1, Math.round(safe / HOUR_MS)) },
    };
  }
  return {
    key: "admin.spam.prune.last_success_days",
    vars: { days: Math.max(1, Math.round(safe / DAY_MS)) },
  };
}

/**
 * Compute a health signal for one pruner. Order matters:
 *   1. A non-null `lastRun.error` means the most recent execution crashed
 *      — that's the loudest signal, even if the run was recent.
 *   2. No recorded run yet → unknown (amber). On a fresh boot the pruner
 *      kicks off within ~15s; if this state persists, something is wrong
 *      with the scheduler.
 *   3. A run older than 2× the expected cadence → stale (amber). The 2×
 *      buffer absorbs normal jitter (server restarts, deploys) without
 *      flapping every operator visit.
 *   4. Otherwise → healthy (green).
 *
 * `intervalMs` may be undefined when an older server hasn't been redeployed
 * yet; in that case we can't compute staleness and only signal on errors.
 */
export function computeHealth(
  lastRun: PruneLastRun | null,
  intervalMs: number | undefined,
  t: (key: string) => string,
): HealthState {
  if (lastRun?.error) {
    return {
      level: "failing",
      label: t("admin.spam.prune.health.failing"),
      title: fill(t("admin.spam.prune.health.failing_title"), {
        message: lastRun.error,
      }),
    };
  }
  if (!lastRun) {
    return {
      level: "unknown",
      label: t("admin.spam.prune.health.unknown"),
      title: t("admin.spam.prune.health.unknown_title"),
    };
  }
  if (typeof intervalMs === "number" && intervalMs > 0) {
    const ranAtMs = Date.parse(lastRun.ranAt);
    if (Number.isFinite(ranAtMs)) {
      const ageMs = Date.now() - ranAtMs;
      if (ageMs > 2 * intervalMs) {
        return {
          level: "stale",
          label: t("admin.spam.prune.health.stale"),
          title: fill(t("admin.spam.prune.health.stale_title"), {
            hours: Math.max(1, Math.round(ageMs / HOUR_MS)),
            cadence: formatCadence(intervalMs),
          }),
        };
      }
    }
  }
  return {
    level: "healthy",
    label: t("admin.spam.prune.health.healthy"),
    title: t("admin.spam.prune.health.healthy_title"),
  };
}

// Format a duration (in ms) as a short human-readable string for the
// alert-history strip's "was unhealthy for ..." label. Mirrors the
// notifier's `formatAge` so the dashboard text matches what was sent to
// Slack/email exactly: minutes under an hour, hours under 48h, days above.
export function formatDurationShort(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < HOUR_MS) {
    const minutes = Math.max(1, Math.round(ms / (60 * 1000)));
    return `${minutes}m`;
  }
  const hours = Math.round(ms / HOUR_MS);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

// Format an alert dispatch time for the strip. Short and relative-friendly:
// the `title` attribute carries the full ISO timestamp for hover/inspection.
function formatAlertAt(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tailwind classes per health level. Kept as a flat record so the JSX stays
// declarative and the visual contract for each color is in one place.
const HEALTH_BADGE_CLASSES: Record<HealthLevel, string> = {
  healthy:
    "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent",
  stale:
    "bg-amber-500 hover:bg-amber-500 text-white border-transparent",
  failing:
    "bg-red-600 hover:bg-red-600 text-white border-transparent",
  unknown:
    "bg-amber-500 hover:bg-amber-500 text-white border-transparent",
};

interface AlertCooldownBlockProps {
  entries: AlertCooldownEntry[];
  t: (key: string) => string;
}

/**
 * Per-signal "when did ops last actually get paged?" ledger, read from the
 * server's persisted alert-debounce table. For each outage signal it shows
 * either "Never paged" (no row on record) or "Last paged X ago — next page
 * allowed in Y", where Y is computed against the SAME cool-down window the
 * notifier enforces — so silence during an incident is distinguishable
 * from a suppressed alert.
 */
export function AlertCooldownBlock({ entries, t }: AlertCooldownBlockProps) {
  return (
    <div
      className="mt-4 pt-3 border-t border-border/60"
      data-testid="admin-alert-cooldowns"
    >
      <div
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2"
        title={t("admin.alert_cooldown.hint")}
      >
        <BellRing className="w-3.5 h-3.5" />
        <span>{t("admin.alert_cooldown.title")}</span>
      </div>
      <ul className="space-y-1">
        {entries.map((entry) => {
          const labelKey = COOLDOWN_SIGNAL_LABEL_KEYS[entry.key];
          const label = labelKey ? t(labelKey) : entry.key;
          const lastMs =
            entry.lastAlertedAt == null
              ? NaN
              : Date.parse(entry.lastAlertedAt);
          const hasLast = Number.isFinite(lastMs);
          let statusText: string;
          if (!hasLast) {
            statusText = t("admin.alert_cooldown.never");
          } else {
            const ageMs = Date.now() - lastMs;
            const paged = pickLastPagedTemplate(ageMs);
            const pagedText = fill(t(paged.key), paged.vars);
            if (entry.debounceMs == null) {
              statusText = `${pagedText} — ${t("admin.alert_cooldown.disabled")}`;
            } else {
              const next = pickNextAllowedTemplate(
                lastMs + entry.debounceMs - Date.now(),
              );
              statusText = `${pagedText} — ${fill(t(next.key), next.vars)}`;
            }
          }
          return (
            <li
              key={entry.key}
              className="text-xs flex items-center gap-2 flex-wrap"
              data-testid={`admin-alert-cooldown-${entry.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
            >
              <span className="font-medium shrink-0">{label}</span>
              <span
                className="text-muted-foreground"
                title={entry.lastAlertedAt ?? undefined}
              >
                {statusText}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Reusable status block for one background pruner. Renders the configured
 * retention, last-run timestamp, deleted-row count, and (if present) the
 * last error. Used once for `spam_events` and once for
 * `app_rate_limit_buckets` so operators get the same one-glance health
 * check for both pruners.
 *
 * Labels for retention/last-run/deleted/never/error_prefix are intentionally
 * shared across pruners (`admin.spam.prune.*`) — they describe a generic
 * cleanup pass and don't need to be duplicated per table.
 */
export function PruneBlock({
  title,
  hint,
  retentionDays,
  intervalMs,
  lastRun,
  lastSuccessAt,
  lang,
  t,
  testIdPrefix,
  alertHistory,
  action,
}: PruneBlockProps) {
  const { toast } = useToast();
  const health = computeHealth(lastRun, intervalMs, t);
  // Copies the full saved lastError text so on-call can paste it into Slack
  // or a search without manually selecting a long string. Falls back to a
  // hidden-textarea copy when the async Clipboard API is unavailable (e.g.
  // non-secure contexts), and surfaces failure honestly instead of showing
  // a false success toast.
  const copyErrorText = async (text: string) => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      toast({ title: t("admin.spam.prune.alerts.copy_success") });
    } else {
      toast({
        title: t("admin.spam.prune.alerts.copy_failed"),
        variant: "destructive",
      });
    }
  };
  // Only surface the "last successful run" line when the badge is signalling
  // a problem (failing or stale). When the most recent run itself succeeded
  // the existing "Last run" cell already answers the question, so adding it
  // there would just duplicate the value. The line is intentionally also
  // hidden in the "unknown" state — that means "no run has been recorded
  // yet", and "no successful run on record" follows from it trivially.
  const showLastSuccess = health.level === "failing" || health.level === "stale";
  const lastSuccessMs =
    typeof lastSuccessAt === "string" ? Date.parse(lastSuccessAt) : NaN;
  const lastSuccessText = (() => {
    if (!showLastSuccess) return null;
    if (lastSuccessAt == null || !Number.isFinite(lastSuccessMs)) {
      return t("admin.spam.prune.last_success_never");
    }
    const ageMs = Date.now() - lastSuccessMs;
    const { key, vars } = pickLastSuccessTemplate(ageMs);
    return fill(t(key), vars);
  })();
  return (
    <div
      className="mt-4 pt-3 border-t border-border/60"
      data-testid={testIdPrefix}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
        <Trash2 className="w-3.5 h-3.5" />
        <span>{title}</span>
        <Badge
          variant="default"
          className={`text-[10px] py-0 px-1.5 leading-4 ${HEALTH_BADGE_CLASSES[health.level]}`}
          title={health.title}
          data-testid={`${testIdPrefix}-health`}
          data-health={health.level}
        >
          {health.label}
        </Badge>
        {action && <div className="ms-auto">{action}</div>}
      </div>
      {lastSuccessText && (
        <div
          className="text-[11px] text-muted-foreground mb-2"
          data-testid={`${testIdPrefix}-last-success`}
        >
          {lastSuccessText}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border bg-muted/20 px-2.5 py-1.5">
          <div className="text-[11px] text-muted-foreground">
            {t("admin.spam.prune.retention")}
          </div>
          <div
            className="text-sm font-semibold tabular-nums"
            data-testid={`${testIdPrefix}-retention`}
          >
            {fill(t("admin.spam.prune.retention_value"), {
              days: retentionDays,
            })}
          </div>
        </div>
        <div className="rounded-md border bg-muted/20 px-2.5 py-1.5">
          <div className="text-[11px] text-muted-foreground">
            {t("admin.spam.prune.last_run")}
          </div>
          <div
            className="text-sm font-semibold"
            data-testid={`${testIdPrefix}-last-run`}
          >
            {lastRun
              ? formatRanAt(lastRun.ranAt, lang)
              : t("admin.spam.prune.never")}
          </div>
        </div>
        <div className="rounded-md border bg-muted/20 px-2.5 py-1.5">
          <div className="text-[11px] text-muted-foreground">
            {t("admin.spam.prune.deleted")}
          </div>
          <div
            className="text-sm font-semibold tabular-nums"
            data-testid={`${testIdPrefix}-deleted`}
          >
            {lastRun ? lastRun.deleted : "—"}
          </div>
        </div>
      </div>
      {lastRun?.error && (
        <div
          className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5"
          data-testid={`${testIdPrefix}-error`}
        >
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {fill(t("admin.spam.prune.error_prefix"), {
              message: lastRun.error,
            })}
          </span>
        </div>
      )}
      {alertHistory !== undefined && (
        <div
          className="mt-3 pt-2 border-t border-dashed border-border/40"
          data-testid={`${testIdPrefix}-alert-history`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1.5">
            <History className="w-3 h-3" />
            <span>{t("admin.spam.prune.alerts.title")}</span>
          </div>
          {alertHistory.length === 0 ? (
            <div
              className="text-[11px] text-muted-foreground italic"
              data-testid={`${testIdPrefix}-alert-history-empty`}
            >
              {t("admin.spam.prune.alerts.empty")}
            </div>
          ) : (
            <ul className="space-y-1">
              {alertHistory.map((entry) => {
                const isRecovered = entry.kind === "recovered";
                const isFailing = entry.kind === "failing";
                const Icon = isRecovered
                  ? CheckCircle2
                  : isFailing
                    ? ShieldAlert
                    : AlertTriangle;
                const colorClass = isRecovered
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isFailing
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400";
                const kindLabel = t(
                  `admin.spam.prune.alerts.kind.${entry.kind}`,
                );
                const durationText =
                  isRecovered && entry.unhealthyDurationMs != null
                    ? fill(t("admin.spam.prune.alerts.recovered_duration"), {
                        duration: formatDurationShort(
                          entry.unhealthyDurationMs,
                        ),
                      })
                    : null;
                // Problem rows (failing / stale) with a saved lastError
                // snapshot become clickable: a popover reveals the full
                // error text so on-call can triage from this screen without
                // digging into webhook/email history. Recovery rows keep
                // their plain rendering (duration badge only).
                const hasErrorDetail =
                  !isRecovered &&
                  typeof entry.lastError === "string" &&
                  entry.lastError.trim().length > 0;
                const rowBody = (
                  <>
                    <Icon
                      className={`w-3 h-3 mt-0.5 shrink-0 ${colorClass}`}
                    />
                    <span
                      className="text-muted-foreground tabular-nums shrink-0"
                      title={entry.at}
                    >
                      {formatAlertAt(entry.at, lang)}
                    </span>
                    <span className={`font-medium ${colorClass}`}>
                      {kindLabel}
                    </span>
                    {durationText && (
                      <span className="text-muted-foreground">
                        · {durationText}
                      </span>
                    )}
                  </>
                );
                return (
                  <li
                    key={`${entry.at}-${entry.kind}`}
                    data-testid={`${testIdPrefix}-alert-history-item`}
                    data-alert-kind={entry.kind}
                  >
                    {hasErrorDetail ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex items-start gap-1.5 text-[11px] w-full text-start rounded-sm px-0.5 -mx-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                            title={t(
                              "admin.spam.prune.alerts.view_error_hint",
                            )}
                            aria-label={t(
                              "admin.spam.prune.alerts.view_error_hint",
                            )}
                            data-testid={`${testIdPrefix}-alert-history-item-trigger`}
                          >
                            {rowBody}
                            <span
                              className="text-muted-foreground underline decoration-dotted underline-offset-2 shrink-0 ms-auto"
                              aria-hidden="true"
                            >
                              {t("admin.spam.prune.alerts.view_error")}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-80 max-w-[90vw] p-3"
                          dir={lang === "ar" ? "rtl" : "ltr"}
                          data-testid={`${testIdPrefix}-alert-history-error-popover`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                            <ShieldAlert
                              className={`w-3.5 h-3.5 shrink-0 ${colorClass}`}
                            />
                            <span>
                              {t("admin.spam.prune.alerts.error_title")}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ms-auto h-6 px-1.5 text-[11px] gap-1 shrink-0"
                              onClick={() =>
                                copyErrorText(entry.lastError as string)
                              }
                              title={t("admin.spam.prune.alerts.copy_hint")}
                              aria-label={t(
                                "admin.spam.prune.alerts.copy_hint",
                              )}
                              data-testid={`${testIdPrefix}-alert-history-error-copy`}
                            >
                              <Copy className="w-3 h-3" />
                              {t("admin.spam.prune.alerts.copy")}
                            </Button>
                          </div>
                          <div className="text-[11px] text-muted-foreground mb-1.5 tabular-nums">
                            {formatAlertAt(entry.at, lang)} · {kindLabel}
                          </div>
                          <pre
                            className="text-[11px] whitespace-pre-wrap break-words font-mono bg-muted/40 rounded-sm p-2 max-h-48 overflow-y-auto"
                            dir="ltr"
                          >
                            {entry.lastError}
                          </pre>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="flex items-start gap-1.5 text-[11px] px-0.5 -mx-0.5">
                        {rowBody}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <div className="mt-2 text-[11px] text-muted-foreground italic">
        {hint}
      </div>
    </div>
  );
}

/**
 * Compact one-liner that summarises the last test-alert attempt for the
 * current session. Renders next to the "Send test alert" button so an admin
 * who returns to the page sees the prior result without re-firing.
 *
 * Layout: "Last test: 2 min ago — webhook ✓ email ✗"
 *
 * For the `disabled` and `error` outcomes the per-channel suffix is
 * replaced with a single explanatory phrase (no channels configured /
 * request failed) because we don't have per-channel data in those cases.
 */
function LastTestStatusLine({
  result,
  t,
}: {
  result: LastTestResult;
  t: (key: string) => string;
}) {
  const ageMs = Date.now() - result.at;
  const { key, vars } = pickRelativeAgeTemplate(ageMs);
  const relative = fill(t(key), vars);

  let suffix: ReactNode;
  if (result.status === "disabled") {
    suffix = (
      <span className="text-muted-foreground">
        {t("admin.prune.test_alert.last.disabled")}
      </span>
    );
  } else if (result.status === "error") {
    suffix = (
      <span className="text-red-600 dark:text-red-400">
        {t("admin.prune.test_alert.last.error")}
      </span>
    );
  } else {
    const channels: Array<{ key: "webhook" | "email"; data: TestChannelResult }> =
      [];
    if (result.webhook?.attempted) {
      channels.push({ key: "webhook", data: result.webhook });
    }
    if (result.email?.attempted) {
      channels.push({ key: "email", data: result.email });
    }
    suffix = channels.map((c, idx) => {
      const ok = c.data.ok === true;
      const Icon = ok ? Check : X;
      const colorClass = ok
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";
      return (
        <span
          key={c.key}
          className="inline-flex items-center gap-0.5"
          data-testid={`admin-prune-test-alert-last-${c.key}`}
          data-channel-ok={ok ? "true" : "false"}
        >
          {idx > 0 && <span className="text-muted-foreground mx-1">·</span>}
          <span className="text-muted-foreground">
            {t(`admin.prune.test_alert.last.channel.${c.key}`)}
          </span>
          <Icon className={`w-3 h-3 ${colorClass}`} />
        </span>
      );
    });
  }

  const healthLines = result.cleanupHealthLines ?? [];

  return (
    <div className="flex flex-col gap-1">
      <div
        className="text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap"
        data-testid="admin-prune-test-alert-last"
        data-status={result.status}
        title={new Date(result.at).toLocaleString()}
      >
        <span>{t("admin.prune.test_alert.last.prefix")}</span>
        <span className="tabular-nums">{relative}</span>
        <span className="text-muted-foreground">—</span>
        {suffix}
      </div>
      {healthLines.length > 0 && (
        <div
          className="rounded-md border border-border bg-muted/40 px-2 py-1.5"
          data-testid="admin-prune-test-alert-health"
        >
          <div className="text-[10px] font-medium text-muted-foreground mb-0.5">
            {t("admin.prune.test_alert.health.title")}
          </div>
          <ul className="space-y-0.5">
            {healthLines.map((line, idx) => (
              <li
                key={idx}
                // The lines are pre-rendered English monitoring text from the
                // server (same text as the Slack/email body), so force LTR
                // even under the Arabic UI to keep punctuation readable.
                dir="ltr"
                className="text-[11px] text-foreground font-mono leading-snug text-left"
                data-testid={`admin-prune-test-alert-health-line-${idx}`}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Admin-only widget that shows daily counts of contact-form spam-defense
 * events (honeypot drops + captcha rejections) over the last 7 days. Lets
 * operators decide whether the optional Cloudflare Turnstile layer is worth
 * provisioning, since when its env vars are unset the captcha column will
 * read zero by design.
 *
 * Also surfaces the background pruner's most recent activity (configured
 * retention, last run time, rows deleted) so operators can confirm the
 * `spam_events` table is being kept under control.
 */
export function SpamStatsCard() {
  const [data, setData] = useState<SpamStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Test-alert button state. Lifted to component level (rather than inside a
  // small subcomponent) so the disabled affordance survives re-renders from
  // the periodic refresh of the surrounding card.
  const [testAlertSending, setTestAlertSending] = useState(false);
  // Manual "Run cleanup now" state for the spam-events pruner. Lifted here
  // (like the test-alert flag) so the disabled affordance survives the
  // card's periodic re-renders.
  const [pruneRunning, setPruneRunning] = useState(false);
  // Most recent test-alert attempt for this session. Persists across the
  // periodic refresh of the surrounding card so an admin returning to the
  // tab can see the prior result without re-firing. Cleared on full page
  // reload (intentionally session-scoped, per the task).
  const [lastTestResult, setLastTestResultState] =
    useState<LastTestResult | null>(() => readPersistedTestResult());
  // Wrapper so every state update also flushes to sessionStorage. We never
  // clear the persisted result from inside this component (an admin re-fires
  // and overwrites it; closing the tab clears it via session scope).
  const setLastTestResult = (result: LastTestResult) => {
    setLastTestResultState(result);
    writePersistedTestResult(result);
  };
  // Tick state to force a re-render every 30s so the relative "N min ago"
  // label stays fresh without the operator having to click anything.
  const [, setNowTick] = useState(0);
  // Bumped on every manual refresh click so the auto-refresh interval
  // restarts from zero (see useAutoRefresh).
  const [autoRefreshResetKey, setAutoRefreshResetKey] = useState(0);
  // Client-side kind filter for the "Recent events" list. "all" keeps the
  // full fetched window; "honeypot"/"captcha" narrow it. Not persisted —
  // during a spike the admin toggles it live, and the default should stay
  // predictable on every page load.
  const [recentFilter, setRecentFilter] = useState<
    "all" | "honeypot" | "captcha"
  >("all");
  const { t, lang } = useLanguage();
  const { toast } = useToast();

  // Recent-event rows also render relative labels, so keep ticking whenever
  // either the last-test line or the recent list is on screen.
  const hasRecent = (data?.recent.length ?? 0) > 0;
  useEffect(() => {
    if (!lastTestResult && !hasRecent) return;
    const id = window.setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [lastTestResult, hasRecent]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/spam-stats?days=${RANGE_DAYS}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setError(
          fill(t("admin.spam.card.load_error_status"), { status: res.status }),
        );
        return;
      }
      const json = (await res.json()) as SpamStatsResponse;
      setData(json);
    } catch {
      // Network failures / JSON parse errors carry developer-oriented English
      // messages — surface a translated generic line instead so the admin UI
      // stays fully localized.
      setError(t("admin.spam.card.load_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Incident-mode auto-refresh: re-fetch on a 30s cadence while the tab is
  // visible, paused when it is hidden. A manual refresh click bumps
  // `autoRefreshResetKey`, which restarts the interval from zero.
  useAutoRefresh(
    () => void load(),
    AUTO_REFRESH_INTERVAL_MS,
    autoRefreshResetKey,
  );

  // Fire a synthetic pruner-health alert on every configured channel.
  // Wired to the small "Send test alert" button rendered next to the
  // pruner blocks. Never throws — every error path is reflected in a
  // user-visible toast so an admin who clicks once gets a definitive
  // success/partial/disabled/error answer.
  const sendTestAlert = async () => {
    setTestAlertSending(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/prune-health/test-alert", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let body: {
        success?: boolean;
        error?: string;
        message?: string;
        retryAfterSeconds?: number;
        result?: {
          enabled: boolean;
          webhook: { attempted: boolean; ok: boolean | null };
          email: { attempted: boolean; ok: boolean | null };
          cleanupHealthLines?: string[];
        };
      } = {};
      try {
        body = await res.json();
      } catch {
        // Tolerate a non-JSON body so the toast logic below still picks
        // a sensible message based purely on the HTTP status.
      }

      const now = Date.now();
      const webhook = body.result?.webhook ?? null;
      const email = body.result?.email ?? null;
      // Validate the echoed cleanup-health lines defensively — an older
      // server build may omit them, and a malformed body should degrade to
      // "no preview" rather than a render crash.
      const cleanupHealthLines = Array.isArray(body.result?.cleanupHealthLines)
        ? body.result.cleanupHealthLines.filter(
            (l): l is string => typeof l === "string",
          )
        : null;

      if (res.status === 429) {
        // Server-side per-admin cool-down kicked in (e.g. accidental double
        // click, or the page open in two tabs). Surface the wait so the
        // admin knows it's a transient throttle, not a wiring failure.
        // We intentionally do NOT update lastTestResult here — a throttled
        // request was never actually attempted, so the prior result remains
        // the most recent real outcome the admin should see.
        const retryAfter =
          typeof body.retryAfterSeconds === "number" && body.retryAfterSeconds > 0
            ? body.retryAfterSeconds
            : Number(res.headers.get("Retry-After")) || 0;
        const description =
          body.message ||
          (retryAfter > 0
            ? fill(t("admin.prune.test_alert.rate_limited_wait"), {
                seconds: retryAfter,
              })
            : undefined);
        toast({
          title: t("admin.prune.test_alert.rate_limited"),
          description,
          variant: "destructive",
        });
        return;
      }
      if (res.status === 503 || body.error === "alerts_not_configured") {
        setLastTestResult({
          at: now,
          status: "disabled",
          webhook: null,
          email: null,
        });
        toast({
          title: t("admin.prune.test_alert.disabled"),
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) {
        setLastTestResult({
          at: now,
          status: "error",
          webhook: null,
          email: null,
        });
        toast({
          title: t("admin.prune.test_alert.error"),
          variant: "destructive",
        });
        return;
      }
      if (body.success === false) {
        setLastTestResult({
          at: now,
          status: "partial",
          webhook,
          email,
          cleanupHealthLines,
        });
        toast({
          title: t("admin.prune.test_alert.partial"),
          variant: "destructive",
        });
        return;
      }
      setLastTestResult({
        at: now,
        status: "success",
        webhook,
        email,
        cleanupHealthLines,
      });
      toast({ title: t("admin.prune.test_alert.success") });
    } catch {
      setLastTestResult({
        at: Date.now(),
        status: "error",
        webhook: null,
        email: null,
      });
      toast({
        title: t("admin.prune.test_alert.error"),
        variant: "destructive",
      });
    } finally {
      setTestAlertSending(false);
    }
  };

  // Force an immediate spam-events prune run. On success we toast the
  // deleted count and re-fetch the whole card so the "Last run" /
  // "Rows deleted" cells reflect the manual run right away.
  const runPruneNow = async () => {
    setPruneRunning(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/admin/spam-stats/prune", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let body: {
        success?: boolean;
        deleted?: number;
        message?: string;
        retryAfterSeconds?: number;
      } = {};
      try {
        body = await res.json();
      } catch {
        // Tolerate a non-JSON body; status-based handling below still works.
      }

      if (res.status === 429) {
        const retryAfter =
          typeof body.retryAfterSeconds === "number" && body.retryAfterSeconds > 0
            ? body.retryAfterSeconds
            : Number(res.headers.get("Retry-After")) || 0;
        toast({
          title: t("admin.spam.prune.run_now.rate_limited"),
          description:
            body.message ||
            (retryAfter > 0
              ? fill(t("admin.spam.prune.run_now.rate_limited_wait"), {
                  seconds: retryAfter,
                })
              : undefined),
          variant: "destructive",
        });
        return;
      }
      if (!res.ok || body.success === false) {
        toast({
          title: t("admin.spam.prune.run_now.error"),
          variant: "destructive",
        });
        return;
      }
      const deleted = typeof body.deleted === "number" ? body.deleted : 0;
      toast({
        title: t("admin.spam.prune.run_now.success"),
        description: fill(t("admin.spam.prune.run_now.success_detail"), {
          count: deleted,
        }),
      });
      // Refresh so the new last-run time and deleted count appear
      // immediately in the Background cleanup section.
      await load();
    } catch {
      toast({
        title: t("admin.spam.prune.run_now.error"),
        variant: "destructive",
      });
    } finally {
      setPruneRunning(false);
    }
  };

  // Per-kind counts for the fetched recent window. Intentionally computed
  // over the FULL window (not the filtered view) so the summary always
  // answers "what's the mix?" even while a filter is active.
  const recentCounts = {
    honeypot: data?.recent.filter((e) => e.kind === "honeypot").length ?? 0,
    captcha: data?.recent.filter((e) => e.kind === "captcha").length ?? 0,
  };
  const visibleRecent =
    recentFilter === "all"
      ? (data?.recent ?? [])
      : (data?.recent ?? []).filter((e) => e.kind === recentFilter);

  const peak = data
    ? Math.max(
        1,
        ...data.daily.map((d) => d.honeypot + d.captcha),
      )
    : 1;

  return (
    <Card className="border-amber-100 dark:border-amber-900/50" data-testid="admin-spam-stats">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            {t("admin.spam.card.title")}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {data?.alerts &&
              (data.alerts.enabled ? (
                <Badge
                  variant="default"
                  className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white border-transparent flex items-center gap-1"
                  title={fill(t("admin.spam.card.alerts_on_title"), {
                    threshold: data.alerts.threshold ?? "?",
                    channels: [
                      data.alerts.channels.webhook
                        ? t("admin.spam.card.channel.webhook")
                        : null,
                      data.alerts.channels.email
                        ? t("admin.spam.card.channel.email")
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" + "),
                    minutes: data.alerts.debounceMinutes ?? "?",
                  })}
                  data-testid="admin-spam-alerts-status"
                >
                  <BellRing className="w-3 h-3" />
                  {fill(t("admin.spam.card.alerts_on"), {
                    threshold: data.alerts.threshold ?? "?",
                  })}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-muted-foreground flex items-center gap-1"
                  title={t("admin.spam.card.alerts_off_title")}
                  data-testid="admin-spam-alerts-status"
                >
                  <BellOff className="w-3 h-3" />
                  {t("admin.spam.card.alerts_off")}
                </Badge>
              ))}
            {/*
              Synthetic pruner-health alert delivery test. Always visible to
              admins (regardless of spike-alert config) because the underlying
              channel env vars (`SPAM_SPIKE_WEBHOOK_URL` /
              `SPAM_SPIKE_ALERT_EMAIL`) are independent of
              `SPAM_SPIKE_THRESHOLD`. The button itself reports an
              "alerts disabled" toast when no channel is configured, so we
              don't need to gate the affordance.
            */}
            <div className="flex flex-col items-start gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void sendTestAlert()}
                disabled={testAlertSending}
                title={t("admin.prune.test_alert.tooltip")}
                data-testid="admin-prune-test-alert"
                className="text-xs flex items-center gap-1"
              >
                {testAlertSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {testAlertSending
                  ? t("admin.prune.test_alert.button_sending")
                  : t("admin.prune.test_alert.button")}
              </Button>
              {lastTestResult && (
                <LastTestStatusLine result={lastTestResult} t={t} />
              )}
            </div>
            {data && (
              <Badge
                variant={data.turnstileEnabled ? "default" : "outline"}
                className="text-xs"
                data-testid="admin-spam-turnstile-status"
              >
                {data.turnstileEnabled
                  ? t("admin.spam.card.turnstile_on")
                  : t("admin.spam.card.turnstile_off")}
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // Restart the auto-refresh interval so the next automatic
                // fetch lands a full period after this manual one.
                setAutoRefreshResetKey((k) => k + 1);
                void load();
              }}
              disabled={loading}
              aria-label={t("admin.spam.card.refresh")}
              data-testid="admin-spam-refresh"
            >
              {loading ? (
                <Loader2
                  className="w-4 h-4 animate-spin"
                  data-testid="admin-spam-refresh-spinner"
                />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <div
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
            data-testid="admin-spam-error"
          >
            <ShieldAlert className="w-4 h-4" />
            {error}
          </div>
        )}
        {!error && !data && loading && (
          <div className="text-sm text-muted-foreground">
            {t("admin.spam.card.loading")}
          </div>
        )}
        {!error && data && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                className="rounded-lg border bg-muted/30 px-3 py-2"
                data-testid="admin-spam-honeypot-24h"
              >
                <div className="text-xs text-muted-foreground">
                  {t("admin.spam.card.honeypot_24h")}
                </div>
                <div className="text-2xl font-semibold tabular-nums">
                  {data.last24h.honeypot}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fill(t("admin.spam.card.total_in_range"), {
                    total: data.totals.honeypot,
                    days: data.rangeDays,
                  })}
                </div>
              </div>
              <div
                className="rounded-lg border bg-muted/30 px-3 py-2"
                data-testid="admin-spam-captcha-24h"
              >
                <div className="text-xs text-muted-foreground">
                  {t("admin.spam.card.captcha_24h")}
                </div>
                <div className="text-2xl font-semibold tabular-nums">
                  {data.last24h.captcha}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fill(t("admin.spam.card.total_in_range"), {
                    total: data.totals.captcha,
                    days: data.rangeDays,
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-1.5" data-testid="admin-spam-daily">
              {data.daily.map((d) => {
                const total = d.honeypot + d.captcha;
                const honeypotPct = (d.honeypot / peak) * 100;
                const captchaPct = (d.captcha / peak) * 100;
                return (
                  <div key={d.date} className="flex items-center gap-2 text-xs">
                    <div className="w-14 text-muted-foreground tabular-nums shrink-0">
                      {formatShortDate(d.date)}
                    </div>
                    <div className="flex-1 h-4 bg-muted/40 rounded-sm overflow-hidden flex">
                      <div
                        className="h-full bg-amber-400 dark:bg-amber-500"
                        style={{ width: `${honeypotPct}%` }}
                        title={fill(t("admin.spam.card.bar_honeypot_title"), {
                          count: d.honeypot,
                        })}
                      />
                      <div
                        className="h-full bg-blue-400 dark:bg-blue-500"
                        style={{ width: `${captchaPct}%` }}
                        title={fill(t("admin.spam.card.bar_captcha_title"), {
                          count: d.captcha,
                        })}
                      />
                    </div>
                    <div className="w-8 text-right tabular-nums shrink-0">
                      {total}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400 dark:bg-amber-500" />
                {t("admin.spam.card.legend.honeypot")}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400 dark:bg-blue-500" />
                {t("admin.spam.card.legend.captcha")}
              </span>
              {!data.turnstileEnabled && (
                <span className="ms-auto italic">
                  {t("admin.spam.card.captcha_off_hint")}
                </span>
              )}
            </div>

            {data.prune && (
              <PruneBlock
                title={t("admin.spam.prune.title")}
                hint={t("admin.spam.prune.hint")}
                retentionDays={data.prune.retentionDays}
                intervalMs={data.prune.intervalMs}
                lastRun={data.prune.lastRun}
                lastSuccessAt={data.prune.lastSuccessAt}
                lang={lang}
                t={t}
                testIdPrefix="admin-spam-prune"
                alertHistory={data.prune.alertHistory}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runPruneNow()}
                    disabled={pruneRunning}
                    title={t("admin.spam.prune.run_now.tooltip")}
                    data-testid="admin-spam-prune-run-now"
                    className="text-xs h-6 px-2 flex items-center gap-1"
                  >
                    {pruneRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    {pruneRunning
                      ? t("admin.spam.prune.run_now.button_running")
                      : t("admin.spam.prune.run_now.button")}
                  </Button>
                }
              />
            )}
            {data.rateLimitPrune && (
              <PruneBlock
                title={t("admin.ratelimit.prune.title")}
                hint={t("admin.ratelimit.prune.hint")}
                retentionDays={data.rateLimitPrune.retentionDays}
                intervalMs={data.rateLimitPrune.intervalMs}
                lastRun={data.rateLimitPrune.lastRun}
                lastSuccessAt={data.rateLimitPrune.lastSuccessAt}
                lang={lang}
                t={t}
                testIdPrefix="admin-ratelimit-prune"
                alertHistory={data.rateLimitPrune.alertHistory}
              />
            )}

            {data.alertCooldowns && data.alertCooldowns.length > 0 && (
              <AlertCooldownBlock entries={data.alertCooldowns} t={t} />
            )}

            {data.recent.length > 0 && (
              <div
                className="mt-4 pt-3 border-t border-border/60"
                data-testid="admin-spam-recent"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("admin.spam.card.recent.title")}
                  </div>
                  {/*
                    Kind filter. "All" is the default; the honeypot/captcha
                    buttons narrow the list so an admin mid-spike can answer
                    "is this mostly honeypot or mostly captcha?" at a glance.
                    Client-side only — the fetched window doesn't change.
                  */}
                  <div
                    className="flex items-center gap-1"
                    data-testid="admin-spam-recent-filter"
                  >
                    {(["all", "honeypot", "captcha"] as const).map((kind) => (
                      <Button
                        key={kind}
                        size="sm"
                        variant={recentFilter === kind ? "secondary" : "ghost"}
                        className="h-6 px-2 text-[11px] capitalize"
                        onClick={() => setRecentFilter(kind)}
                        aria-pressed={recentFilter === kind}
                        data-testid={`admin-spam-recent-filter-${kind}`}
                      >
                        {kind === "all"
                          ? t("admin.spam.card.recent.filter.all")
                          : t(`admin.spam.card.recent.kind.${kind}`)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div
                  className="text-[11px] text-muted-foreground mb-2 tabular-nums"
                  data-testid="admin-spam-recent-summary"
                >
                  {fill(t("admin.spam.card.recent.summary"), {
                    honeypot: recentCounts.honeypot,
                    captcha: recentCounts.captcha,
                  })}
                </div>
                {visibleRecent.length === 0 ? (
                  <div
                    className="text-xs text-muted-foreground italic"
                    data-testid="admin-spam-recent-empty"
                  >
                    {fill(t("admin.spam.card.recent.empty"), {
                      kind:
                        recentFilter === "all"
                          ? t("admin.spam.card.recent.filter.all")
                          : t(`admin.spam.card.recent.kind.${recentFilter}`),
                    })}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {visibleRecent.map((event) => (
                      <li
                        key={event.id}
                        className="text-xs flex items-center gap-2 flex-wrap"
                        data-testid="admin-spam-recent-row"
                        data-kind={event.kind}
                      >
                        <span
                          className="tabular-nums text-muted-foreground shrink-0"
                          title={formatRanAt(event.createdAt, lang)}
                          data-testid="admin-spam-recent-row-ago"
                        >
                          {formatRelativeAgo(event.createdAt, t)}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 leading-4">
                          {event.kind === "honeypot" || event.kind === "captcha"
                            ? t(`admin.spam.card.recent.kind.${event.kind}`)
                            : event.kind}
                        </Badge>
                        <span className="truncate">{event.reason}</span>
                        <span className="ms-auto font-mono text-[11px] text-muted-foreground tabular-nums">
                          {event.ip}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
