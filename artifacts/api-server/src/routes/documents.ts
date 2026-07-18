import { Router, type IRouter } from "express";
import { db, documentsTable } from "@workspace/db";
import { and, desc, asc, eq, ilike, or, gte, lte, sql, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ALLOWED_TYPES = new Set(["invoice", "quotation", "receipt"]);
// Spec §7 statuses across all three doc types. We accept the full union
// for the list-filter, but for create/update we additionally enforce
// per-type validity below so a receipt cannot be set to "overdue", etc.
const ALLOWED_STATUSES = new Set([
  // Invoice
  "draft", "sent", "paid", "overdue", "cancelled",
  // Quotation
  "accepted", "rejected", "expired",
  // Receipt
  "issued", "void",
]);
// Per-type status validators — keep in lock-step with the frontend
// `STATUSES_BY_TYPE` in `savedDocsApi.ts`.
const STATUSES_BY_TYPE: Record<string, readonly string[]> = {
  invoice:   ["draft", "sent", "paid", "overdue", "cancelled"],
  quotation: ["draft", "sent", "accepted", "rejected", "expired", "cancelled"],
  receipt:   ["issued", "paid", "void", "cancelled"],
};
const DEFAULT_STATUS_BY_TYPE: Record<string, string> = {
  invoice: "draft", quotation: "draft", receipt: "issued",
};

function clampStr(v: unknown, max: number, dflt = ""): string {
  if (typeof v !== "string") return dflt;
  return v.slice(0, max);
}
function clampType(v: unknown): string | null {
  if (typeof v !== "string" || !ALLOWED_TYPES.has(v)) return null;
  return v;
}
function clampStatus(v: unknown, dflt = "draft"): string {
  if (typeof v !== "string" || !ALLOWED_STATUSES.has(v)) return dflt;
  return v;
}
/** Same as `clampStatus` but rejects values not valid for the given type. */
function clampStatusForType(v: unknown, type: string): string {
  const allowed = STATUSES_BY_TYPE[type] ?? [];
  const dflt = DEFAULT_STATUS_BY_TYPE[type] ?? "draft";
  if (typeof v !== "string" || !allowed.includes(v)) return dflt;
  return v;
}
function clampNumber(v: unknown, dflt = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return dflt;
  return n;
}
function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function parseInt32(v: unknown, dflt: number, min: number, max: number): number {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return dflt;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function serializeDoc(d: typeof documentsTable.$inferSelect) {
  return {
    id: d.id,
    type: d.type,
    title: d.title,
    clientName: d.clientName,
    amount: Number(d.amount),
    currency: d.currency,
    status: d.status,
    payload: d.payload,
    createdAt: d.createdAt.toISOString(),
    lastEditedAt: d.lastEditedAt.toISOString(),
  };
}

// GET /me/documents
// Optional query filters (all are AND-combined):
//   type=invoice|quotation|receipt
//   status=<one of ALLOWED_STATUSES>
//   search=<text>          → matches title OR clientName (case-insensitive)
//   dateFrom=<ISO>         → lastEditedAt >= dateFrom
//   dateTo=<ISO>           → lastEditedAt <= dateTo
//   sort=newest|oldest     → default newest
//   limit=<1..200>         → default 50
//   offset=<>=0>           → default 0
router.get("/me/documents", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });

    const q = req.query as Record<string, unknown>;
    const type = typeof q.type === "string" && ALLOWED_TYPES.has(q.type) ? q.type : null;
    const status = typeof q.status === "string" && ALLOWED_STATUSES.has(q.status) ? q.status : null;
    const search = typeof q.search === "string" ? q.search.trim().slice(0, 200) : "";
    const dateFrom = parseDate(q.dateFrom);
    const dateTo = parseDate(q.dateTo);
    const sortDir = q.sort === "oldest" ? "asc" : "desc";
    const limit = parseInt32(q.limit, 50, 1, 200);
    const offset = parseInt32(q.offset, 0, 0, 100_000);

    const conditions = [eq(documentsTable.userId, user.id)];
    if (type) conditions.push(eq(documentsTable.type, type));
    if (status) conditions.push(eq(documentsTable.status, status));
    if (search) {
      const like = `%${search.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
      const searchOr = or(ilike(documentsTable.title, like), ilike(documentsTable.clientName, like));
      if (searchOr) conditions.push(searchOr);
    }
    if (dateFrom) conditions.push(gte(documentsTable.lastEditedAt, dateFrom));
    if (dateTo) conditions.push(lte(documentsTable.lastEditedAt, dateTo));

    const where = and(...conditions);
    const order = sortDir === "asc" ? asc(documentsTable.lastEditedAt) : desc(documentsTable.lastEditedAt);

    const [rows, totalRows] = await Promise.all([
      db.select().from(documentsTable).where(where).orderBy(order).limit(limit).offset(offset),
      db.select({ n: count() }).from(documentsTable).where(where),
    ]);
    const total = Number(totalRows[0]?.n ?? 0);

    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ documents: rows.map(serializeDoc), total, limit, offset });
  } catch (err) {
    logger.error({ err }, "GET /me/documents failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

// GET /me/documents/:id — single fetch, scoped to caller. Returns 404 for
// records the caller does not own (no information leak vs "not found").
router.get("/me/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params.id ?? "");
    const [row] = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, user.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ document: serializeDoc(row) });
  } catch (err) {
    logger.error({ err }, "GET /me/documents/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/me/documents", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const type = clampType(body["type"]);
    if (!type) return res.status(400).json({ error: "invalid_type" });
    const payload = (body["payload"] ?? {}) as Record<string, unknown>;
    const [created] = await db
      .insert(documentsTable)
      .values({
        userId: user.id,
        type,
        title: clampStr(body["title"], 255),
        clientName: clampStr(body["clientName"], 255),
        amount: String(clampNumber(body["amount"])),
        currency: clampStr(body["currency"], 8, "USD"),
        status: clampStatusForType(body["status"], type),
        payload,
      })
      .returning();
    if (!created) return res.status(500).json({ error: "insert_failed" });
    return res.status(201).json({ document: serializeDoc(created) });
  } catch (err) {
    logger.error({ err }, "POST /me/documents failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/me/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params.id ?? "");
    const body = (req.body ?? {}) as Record<string, unknown>;
    // We need to know the doc's type to validate status against the
    // per-type whitelist. One round-trip avoids accepting invalid pairs
    // like {type:"receipt", status:"overdue"}.
    const [existing] = await db
      .select({ type: documentsTable.type })
      .from(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, user.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "not_found" });

    const updates: Record<string, unknown> = { lastEditedAt: new Date() };
    if ("title" in body) updates.title = clampStr(body["title"], 255);
    if ("clientName" in body) updates.clientName = clampStr(body["clientName"], 255);
    if ("amount" in body) updates.amount = String(clampNumber(body["amount"]));
    if ("currency" in body) updates.currency = clampStr(body["currency"], 8, "USD");
    if ("status" in body) updates.status = clampStatusForType(body["status"], existing.type);
    if ("payload" in body) updates.payload = body["payload"] ?? {};
    const [updated] = await db
      .update(documentsTable)
      .set(updates)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json({ document: serializeDoc(updated) });
  } catch (err) {
    logger.error({ err }, "PATCH /me/documents/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/me/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params.id ?? "");
    const result = await db
      .delete(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, user.id)))
      .returning({ id: documentsTable.id });
    if (result.length === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /me/documents/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/me/documents/:id/duplicate", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params.id ?? "");
    const [existing] = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, user.id)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "not_found" });
    // Reset duplicates to the type's *default* (so a duplicated paid
    // invoice doesn't appear paid). For receipts that's "issued", for
    // invoices/quotations that's "draft".
    const [created] = await db
      .insert(documentsTable)
      .values({
        userId: user.id,
        type: existing.type,
        title: (existing.title || "Document") + " (Copy)",
        clientName: existing.clientName,
        amount: existing.amount,
        currency: existing.currency,
        status: DEFAULT_STATUS_BY_TYPE[existing.type] ?? "draft",
        payload: existing.payload,
      })
      .returning();
    if (!created) return res.status(500).json({ error: "duplicate_failed" });
    return res.status(201).json({ document: serializeDoc(created) });
  } catch (err) {
    logger.error({ err }, "POST /me/documents/:id/duplicate failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

// Suppress unused-import warning for `sql` (kept around so that future
// raw expressions can reuse the same import).
void sql;

export default router;
