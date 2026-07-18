import { Router, type IRouter } from "express";
import { db, userTasksTable } from "@workspace/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ALLOWED_STATUS = new Set(["open", "in_progress", "completed", "cancelled"]);
const ALLOWED_PRIORITY = new Set(["low", "normal", "high", "urgent"]);

function clampStr(v: unknown, max: number, dflt = ""): string {
  if (typeof v !== "string") return dflt;
  return v.slice(0, max);
}

function parseDate(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serialize(t: typeof userTasksTable.$inferSelect) {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    status: t.status,
    priority: t.priority,
    linkedEntityType: t.linkedEntityType,
    linkedEntityId: t.linkedEntityId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/me/tasks", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const status = typeof req.query["status"] === "string" ? req.query["status"] : "";
    const linkedType = typeof req.query["linkedEntityType"] === "string" ? req.query["linkedEntityType"] : "";
    const linkedId = typeof req.query["linkedEntityId"] === "string" ? req.query["linkedEntityId"] : "";
    const dueBefore = parseDate(req.query["dueBefore"]);
    const dueAfter = parseDate(req.query["dueAfter"]);

    const conditions = [eq(userTasksTable.userId, user.id)];
    if (status && ALLOWED_STATUS.has(status)) conditions.push(eq(userTasksTable.status, status));
    if (linkedType) conditions.push(eq(userTasksTable.linkedEntityType, linkedType));
    if (linkedId) conditions.push(eq(userTasksTable.linkedEntityId, linkedId));
    if (dueBefore) conditions.push(lte(userTasksTable.dueDate, dueBefore));
    if (dueAfter) conditions.push(gte(userTasksTable.dueDate, dueAfter));

    const rows = await db
      .select()
      .from(userTasksTable)
      .where(and(...conditions))
      .orderBy(desc(userTasksTable.createdAt))
      .limit(500);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ tasks: rows.map(serialize) });
  } catch (err) {
    logger.error({ err }, "GET /me/tasks failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/me/tasks", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = clampStr(body["title"], 500).trim();
    if (!title) return res.status(400).json({ error: "title_required" });
    const status = clampStr(body["status"], 32, "open");
    const priority = clampStr(body["priority"], 16, "normal");
    const [created] = await db
      .insert(userTasksTable)
      .values({
        userId: user.id,
        title,
        notes: clampStr(body["notes"], 4000),
        dueDate: parseDate(body["dueDate"]),
        status: ALLOWED_STATUS.has(status) ? status : "open",
        priority: ALLOWED_PRIORITY.has(priority) ? priority : "normal",
        linkedEntityType: clampStr(body["linkedEntityType"], 64),
        linkedEntityId: clampStr(body["linkedEntityId"], 64),
      })
      .returning();
    if (!created) return res.status(500).json({ error: "insert_failed" });
    return res.status(201).json({ task: serialize(created) });
  } catch (err) {
    logger.error({ err }, "POST /me/tasks failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/me/tasks/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ("title" in body) updates.title = clampStr(body["title"], 500);
    if ("notes" in body) updates.notes = clampStr(body["notes"], 4000);
    if ("dueDate" in body) updates.dueDate = parseDate(body["dueDate"]);
    if ("status" in body) {
      const s = clampStr(body["status"], 32);
      if (ALLOWED_STATUS.has(s)) updates.status = s;
    }
    if ("priority" in body) {
      const p = clampStr(body["priority"], 16);
      if (ALLOWED_PRIORITY.has(p)) updates.priority = p;
    }
    const [updated] = await db
      .update(userTasksTable)
      .set(updates)
      .where(and(eq(userTasksTable.id, id), eq(userTasksTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json({ task: serialize(updated) });
  } catch (err) {
    logger.error({ err }, "PATCH /me/tasks/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/me/tasks/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const result = await db
      .delete(userTasksTable)
      .where(and(eq(userTasksTable.id, id), eq(userTasksTable.userId, user.id)))
      .returning({ id: userTasksTable.id });
    if (result.length === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /me/tasks/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
