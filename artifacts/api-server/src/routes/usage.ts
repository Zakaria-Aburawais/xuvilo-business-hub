import { Router, type IRouter } from "express";
import { db, usageCountersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// When BILLING_ENABLED is not "true", quotas are not enforced — every user
// is treated as a paid user. Matches the same flag in entitlements.ts.
const BILLING_ENABLED = process.env["BILLING_ENABLED"] === "true";

const FREE_MONTHLY_LIMIT = 10;

function currentPeriod(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

async function readOrCreate(userId: string, period: string) {
  const rows = await db
    .select()
    .from(usageCountersTable)
    .where(and(eq(usageCountersTable.userId, userId), eq(usageCountersTable.periodMonth, period)))
    .limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(usageCountersTable)
    .values({ userId, periodMonth: period, documentsCreated: 0 })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // race: try the read again
  const again = await db
    .select()
    .from(usageCountersTable)
    .where(and(eq(usageCountersTable.userId, userId), eq(usageCountersTable.periodMonth, period)))
    .limit(1);
  return again[0] ?? { userId, periodMonth: period, documentsCreated: 0, updatedAt: new Date() };
}

router.get("/me/usage", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const period = currentPeriod();
    const counter = await readOrCreate(user.id, period);
    const isPaid = !BILLING_ENABLED || user.tier !== "free";
    const limit = isPaid ? null : FREE_MONTHLY_LIMIT;
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({
      period,
      tier: user.tier,
      documentsCreated: counter.documentsCreated,
      limit,
      remaining: limit == null ? null : Math.max(0, limit - counter.documentsCreated),
      blocked: limit != null && counter.documentsCreated >= limit,
    });
  } catch (err) {
    logger.error({ err }, "GET /me/usage failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/me/usage/increment", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const period = currentPeriod();
    const isPaid = !BILLING_ENABLED || user.tier !== "free";
    const limit = isPaid ? null : FREE_MONTHLY_LIMIT;

    const counter = await readOrCreate(user.id, period);
    if (limit != null && counter.documentsCreated >= limit) {
      return res.status(402).json({
        error: "limit_reached",
        message: `You've used all ${limit} free documents for this month.`,
        period,
        documentsCreated: counter.documentsCreated,
        limit,
        remaining: 0,
        blocked: true,
      });
    }

    const [updated] = await db
      .update(usageCountersTable)
      .set({
        documentsCreated: sql`${usageCountersTable.documentsCreated} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(usageCountersTable.userId, user.id), eq(usageCountersTable.periodMonth, period)))
      .returning();

    if (!updated) return res.status(500).json({ error: "increment_failed" });

    return res.json({
      period,
      tier: user.tier,
      documentsCreated: updated.documentsCreated,
      limit,
      remaining: limit == null ? null : Math.max(0, limit - updated.documentsCreated),
      blocked: limit != null && updated.documentsCreated >= limit,
    });
  } catch (err) {
    logger.error({ err }, "POST /me/usage/increment failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
