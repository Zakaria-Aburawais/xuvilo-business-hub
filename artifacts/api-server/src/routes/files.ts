import { Router, type IRouter } from "express";
import { db, fileObjectsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";
import {
  buildStorageKey,
  putObject,
  getSignedDownloadUrl,
  deleteObject,
  getObject,
} from "../lib/objectStorage";

const router: IRouter = Router();

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_PURPOSES = new Set([
  "rfq_source",
  "quote_pdf",
  "signature",
  "logo",
  "other",
]);

function clampStr(v: unknown, max: number, dflt = ""): string {
  if (typeof v !== "string") return dflt;
  return v.slice(0, max);
}

function decodeBase64(value: string): Buffer | null {
  try {
    const cleaned = value.includes(",") ? value.split(",", 2)[1]! : value;
    return Buffer.from(cleaned, "base64");
  } catch {
    return null;
  }
}

router.post("/me/files/upload", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const filename = clampStr(body["filename"], 500, "upload.bin");
    const contentType = clampStr(body["contentType"], 128, "application/octet-stream");
    const purposeRaw = clampStr(body["purpose"], 64, "other");
    const purpose = ALLOWED_PURPOSES.has(purposeRaw) ? purposeRaw : "other";
    const dataB64 = typeof body["dataBase64"] === "string" ? (body["dataBase64"] as string) : "";
    if (!dataB64) return res.status(400).json({ error: "dataBase64_required" });
    const buf = decodeBase64(dataB64);
    if (!buf) return res.status(400).json({ error: "invalid_base64" });
    if (buf.length === 0) return res.status(400).json({ error: "empty_file" });
    if (buf.length > MAX_BYTES) return res.status(413).json({ error: "file_too_large", maxBytes: MAX_BYTES });

    const storageKey = buildStorageKey(user.id, purpose, filename);
    await putObject(storageKey, buf, contentType);

    const [created] = await db
      .insert(fileObjectsTable)
      .values({
        userId: user.id,
        storageKey,
        filename,
        contentType,
        sizeBytes: buf.length,
        purpose,
        linkedEntityType: clampStr(body["linkedEntityType"], 64),
        linkedEntityId: clampStr(body["linkedEntityId"], 64),
        clientId: clampStr(body["clientId"], 64),
        notes: clampStr(body["notes"], 1000),
      })
      .returning();
    if (!created) return res.status(500).json({ error: "insert_failed" });

    return res.status(201).json({
      file: {
        id: created.id,
        filename: created.filename,
        contentType: created.contentType,
        sizeBytes: created.sizeBytes,
        purpose: created.purpose,
        linkedEntityType: created.linkedEntityType,
        linkedEntityId: created.linkedEntityId,
        clientId: created.clientId,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err }, "POST /me/files/upload failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/files", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const purpose = typeof req.query["purpose"] === "string" ? req.query["purpose"] : "";
    const linkedType = typeof req.query["linkedEntityType"] === "string" ? req.query["linkedEntityType"] : "";
    const linkedId = typeof req.query["linkedEntityId"] === "string" ? req.query["linkedEntityId"] : "";
    const clientId = typeof req.query["clientId"] === "string" ? req.query["clientId"] : "";
    const conditions = [eq(fileObjectsTable.userId, user.id)];
    if (purpose) conditions.push(eq(fileObjectsTable.purpose, purpose));
    if (linkedType) conditions.push(eq(fileObjectsTable.linkedEntityType, linkedType));
    if (linkedId) conditions.push(eq(fileObjectsTable.linkedEntityId, linkedId));
    if (clientId) conditions.push(eq(fileObjectsTable.clientId, clientId));
    const rows = await db
      .select()
      .from(fileObjectsTable)
      .where(and(...conditions))
      .orderBy(desc(fileObjectsTable.createdAt))
      .limit(500);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({
      files: rows.map((f) => ({
        id: f.id,
        filename: f.filename,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
        purpose: f.purpose,
        linkedEntityType: f.linkedEntityType,
        linkedEntityId: f.linkedEntityId,
        clientId: f.clientId,
        notes: f.notes,
        createdAt: f.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /me/files failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/files/:id/download-url", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [row] = await db
      .select()
      .from(fileObjectsTable)
      .where(and(eq(fileObjectsTable.id, id), eq(fileObjectsTable.userId, user.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    const url = await getSignedDownloadUrl(row.storageKey, row.filename);
    return res.json({ url, expiresInSeconds: 600 });
  } catch (err) {
    logger.error({ err }, "GET /me/files/:id/download-url failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/files/:id/raw", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [row] = await db
      .select()
      .from(fileObjectsTable)
      .where(and(eq(fileObjectsTable.id, id), eq(fileObjectsTable.userId, user.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    const buf = await getObject(row.storageKey);
    res.setHeader("Content-Type", row.contentType);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(buf);
  } catch (err) {
    logger.error({ err }, "GET /me/files/:id/raw failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/me/files/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [row] = await db
      .select()
      .from(fileObjectsTable)
      .where(and(eq(fileObjectsTable.id, id), eq(fileObjectsTable.userId, user.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    await deleteObject(row.storageKey);
    await db
      .delete(fileObjectsTable)
      .where(and(eq(fileObjectsTable.id, id), eq(fileObjectsTable.userId, user.id)));
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /me/files/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
