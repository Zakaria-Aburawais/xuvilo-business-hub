import { Router, type IRouter } from "express";
import { db, clientsTable, documentsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function clampStr(v: unknown, max: number, dflt = ""): string {
  if (typeof v !== "string") return dflt;
  return v.slice(0, max);
}

function serialize(c: typeof clientsTable.$inferSelect, docCount = 0) {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    address: c.address,
    city: c.city,
    country: c.country,
    taxId: c.taxId,
    notes: c.notes,
    shortCode: c.shortCode,
    rfqFormatNotes: c.rfqFormatNotes,
    submissionEmail: c.submissionEmail,
    specialRequirements: c.specialRequirements,
    industry: c.industry,
    documentCount: docCount,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/me/clients", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const rows = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.userId, user.id))
      .orderBy(desc(clientsTable.updatedAt))
      .limit(500);

    // Document count per client (case-insensitive name match against
    // documents.clientName) — small N, fine to compute in JS.
    const docs = await db
      .select({ name: documentsTable.clientName })
      .from(documentsTable)
      .where(eq(documentsTable.userId, user.id));
    const counts = new Map<string, number>();
    for (const { name } of docs) {
      const key = (name ?? "").trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    res.setHeader("Cache-Control", "private, no-store");
    return res.json({
      clients: rows.map((c) => serialize(c, counts.get(c.name.trim().toLowerCase()) ?? 0)),
    });
  } catch (err) {
    logger.error({ err }, "GET /me/clients failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

// Single-client fetch (spec: GET /api/clients/:id). Strictly scoped by
// userId so a logged-in attacker who guesses a UUID still gets a 404,
// not someone else's client record.
router.get("/me/clients/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params.id ?? "");
    const [row] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, user.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ client: serialize(row) });
  } catch (err) {
    logger.error({ err }, "GET /me/clients/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/me/clients", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = clampStr(body["name"], 255).trim();
    if (!name) return res.status(400).json({ error: "name_required" });
    const [created] = await db
      .insert(clientsTable)
      .values({
        userId: user.id,
        name,
        company: clampStr(body["company"], 255),
        email: clampStr(body["email"], 320),
        phone: clampStr(body["phone"], 64),
        address: clampStr(body["address"], 1000),
        city: clampStr(body["city"], 128),
        country: clampStr(body["country"], 64),
        taxId: clampStr(body["taxId"], 64),
        notes: clampStr(body["notes"], 2000),
        shortCode: clampStr(body["shortCode"], 64),
        rfqFormatNotes: clampStr(body["rfqFormatNotes"], 4000),
        submissionEmail: clampStr(body["submissionEmail"], 320),
        specialRequirements: clampStr(body["specialRequirements"], 4000),
        industry: clampStr(body["industry"], 128),
      })
      .returning();
    if (!created) return res.status(500).json({ error: "insert_failed" });
    return res.status(201).json({ client: serialize(created) });
  } catch (err) {
    logger.error({ err }, "POST /me/clients failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

const MAX_BULK_CLIENTS = 500;

// Bulk import: accepts { clients: [...] } and inserts all rows in a single
// transaction — either every row is saved or none are.
router.post("/me/clients/bulk", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const list = body["clients"];
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ error: "clients_array_required" });
    }
    if (list.length > MAX_BULK_CLIENTS) {
      return res.status(400).json({ error: "too_many_clients", max: MAX_BULK_CLIENTS });
    }

    const values: (typeof clientsTable.$inferInsert)[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return res.status(400).json({ error: "invalid_client", index: i });
      }
      const c = item as Record<string, unknown>;
      const name = clampStr(c["name"], 255).trim();
      if (!name) return res.status(400).json({ error: "name_required", index: i });
      values.push({
        userId: user.id,
        name,
        company: clampStr(c["company"], 255),
        email: clampStr(c["email"], 320),
        phone: clampStr(c["phone"], 64),
        address: clampStr(c["address"], 1000),
        city: clampStr(c["city"], 128),
        country: clampStr(c["country"], 64),
        taxId: clampStr(c["taxId"], 64),
        notes: clampStr(c["notes"], 2000),
        shortCode: clampStr(c["shortCode"], 64),
        rfqFormatNotes: clampStr(c["rfqFormatNotes"], 4000),
        submissionEmail: clampStr(c["submissionEmail"], 320),
        specialRequirements: clampStr(c["specialRequirements"], 4000),
        industry: clampStr(c["industry"], 128),
      });
    }

    const created = await db.transaction(async (tx) => {
      return tx.insert(clientsTable).values(values).returning();
    });
    return res.status(201).json({ clients: created.map((c) => serialize(c)) });
  } catch (err) {
    logger.error({ err }, "POST /me/clients/bulk failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/me/clients/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params.id ?? "");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ("name" in body) updates.name = clampStr(body["name"], 255);
    if ("company" in body) updates.company = clampStr(body["company"], 255);
    if ("email" in body) updates.email = clampStr(body["email"], 320);
    if ("phone" in body) updates.phone = clampStr(body["phone"], 64);
    if ("address" in body) updates.address = clampStr(body["address"], 1000);
    if ("city" in body) updates.city = clampStr(body["city"], 128);
    if ("country" in body) updates.country = clampStr(body["country"], 64);
    if ("taxId" in body) updates.taxId = clampStr(body["taxId"], 64);
    if ("notes" in body) updates.notes = clampStr(body["notes"], 2000);
    if ("shortCode" in body) updates.shortCode = clampStr(body["shortCode"], 64);
    if ("rfqFormatNotes" in body) updates.rfqFormatNotes = clampStr(body["rfqFormatNotes"], 4000);
    if ("submissionEmail" in body) updates.submissionEmail = clampStr(body["submissionEmail"], 320);
    if ("specialRequirements" in body) updates.specialRequirements = clampStr(body["specialRequirements"], 4000);
    if ("industry" in body) updates.industry = clampStr(body["industry"], 128);
    const [updated] = await db
      .update(clientsTable)
      .set(updates)
      .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json({ client: serialize(updated) });
  } catch (err) {
    logger.error({ err }, "PATCH /me/clients/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/me/clients/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier(req.userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params.id ?? "");
    const result = await db
      .delete(clientsTable)
      .where(and(eq(clientsTable.id, id), eq(clientsTable.userId, user.id)))
      .returning({ id: clientsTable.id });
    if (result.length === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /me/clients/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
