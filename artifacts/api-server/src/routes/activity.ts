import { Router, type IRouter } from "express";
import { db, activityEventsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/me/activity", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const linkedType = typeof req.query["linkedEntityType"] === "string" ? req.query["linkedEntityType"] : "";
    const linkedId = typeof req.query["linkedEntityId"] === "string" ? req.query["linkedEntityId"] : "";
    const clientId = typeof req.query["clientId"] === "string" ? req.query["clientId"] : "";
    const limitRaw = Number(req.query["limit"] ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

    const conditions = [eq(activityEventsTable.userId, user.id)];
    if (linkedType) conditions.push(eq(activityEventsTable.linkedEntityType, linkedType));
    if (linkedId) conditions.push(eq(activityEventsTable.linkedEntityId, linkedId));
    if (clientId) conditions.push(eq(activityEventsTable.clientId, clientId));

    const rows = await db
      .select()
      .from(activityEventsTable)
      .where(and(...conditions))
      .orderBy(desc(activityEventsTable.createdAt))
      .limit(limit);

    res.setHeader("Cache-Control", "private, no-store");
    return res.json({
      events: rows.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        linkedEntityType: e.linkedEntityType,
        linkedEntityId: e.linkedEntityId,
        clientId: e.clientId,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /me/activity failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
