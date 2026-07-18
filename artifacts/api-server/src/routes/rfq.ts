import { Router, type IRouter } from "express";
import {
  db,
  rfqDocumentsTable,
  fileObjectsTable,
  clientsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";
import {
  buildStorageKey,
  putObject,
  getObject,
} from "../lib/objectStorage";
import { parseImageBuffer, parsePdfBuffer } from "../lib/rfq/pdfParser";
import { parseRfqText, type ParsedRfq } from "../lib/rfq/rfqParser";
import { extractRfqWithAi, mergeParsedRfq } from "../lib/rfq/aiExtractor";
import { classifyItem } from "../lib/rfq/itemClassifier";
import { researchItems, testAnthropicConnection } from "../lib/rfq/aiResearch";
import { detectClient } from "../lib/rfq/clientDetector";
import { logActivity } from "../lib/activityLog";
import { createTask } from "../lib/taskService";
import { getSetting } from "../lib/settingsService";

const router: IRouter = Router();

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function clampStr(v: unknown, max: number, dflt = ""): string {
  if (typeof v !== "string") return dflt;
  return v.slice(0, max);
}

/**
 * Detect file type from leading magic bytes. Returns the canonical
 * MIME string we want to persist, or `null` for anything we don't
 * accept. We intentionally trust bytes — never the filename — because
 * the analyze step branches on the stored contentType to choose
 * between PDF parsing and direct image OCR.
 */
function sniffContentType(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // WebP: RIFF????WEBP
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  // TIFF: II*\0  or  MM\0*
  if ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00)
      || (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)) return "image/tiff";
  // BMP: BM
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
  return null;
}

function decodeBase64(value: string): Buffer | null {
  try {
    const cleaned = value.includes(",") ? value.split(",", 2)[1]! : value;
    return Buffer.from(cleaned, "base64");
  } catch {
    return null;
  }
}

function serialize(d: typeof rfqDocumentsTable.$inferSelect) {
  return {
    id: d.id,
    rfqNumber: d.rfqNumber,
    prNumber: d.prNumber,
    clientId: d.clientId,
    detectedClientName: d.detectedClientName,
    enquiryDate: d.enquiryDate,
    closingDate: d.closingDate,
    submissionEmail: d.submissionEmail,
    submissionInstructions: d.submissionInstructions,
    paymentTerms: d.paymentTerms,
    deliveryTerms: d.deliveryTerms,
    validityDays: d.validityDays,
    currency: d.currency,
    itemCount: d.itemCount,
    parsedData: d.parsedData,
    researchData: d.researchData,
    status: d.status,
    taskId: d.taskId,
    fileId: d.fileId,
    sourceFilename: d.sourceFilename,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/me/rfq/anthropic/test", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const result = await testAnthropicConnection(user.id);
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/anthropic/test failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

// Provider-neutral test endpoint. Accepts optional overrides so the
// Settings "Test" button can validate unsaved provider/model/key edits
// without forcing the user to save first.
router.post("/me/rfq/llm/test", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as { provider?: unknown; model?: unknown; apiKey?: unknown };
    const overrides = {
      provider: typeof body.provider === "string" ? body.provider : undefined,
      model: typeof body.model === "string" ? body.model : undefined,
      apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
    };
    const result = await testAnthropicConnection(user.id, overrides);
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/llm/test failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/rfq/documents", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const rows = await db
      .select()
      .from(rfqDocumentsTable)
      .where(eq(rfqDocumentsTable.userId, user.id))
      .orderBy(desc(rfqDocumentsTable.createdAt))
      .limit(500);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ documents: rows.map(serialize) });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/documents failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/rfq/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [row] = await db
      .select()
      .from(rfqDocumentsTable)
      .where(and(eq(rfqDocumentsTable.id, id), eq(rfqDocumentsTable.userId, user.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ document: serialize(row) });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/documents/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * Upload a PDF and persist it to object storage. Does NOT parse yet — that
 * is a separate POST /:id/analyze step so the upload can return fast and
 * the queue UI can show progress.
 */
router.post("/me/rfq/documents/upload", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const filename = clampStr(body["filename"], 500, "rfq.pdf");
    const dataB64 = typeof body["dataBase64"] === "string" ? (body["dataBase64"] as string) : "";
    if (!dataB64) return res.status(400).json({ error: "dataBase64_required" });
    const buf = decodeBase64(dataB64);
    if (!buf) return res.status(400).json({ error: "invalid_base64" });
    if (buf.length === 0) return res.status(400).json({ error: "empty_file" });
    if (buf.length > MAX_PDF_BYTES) return res.status(413).json({ error: "file_too_large", maxBytes: MAX_PDF_BYTES });

    // Detect content type from the actual file bytes (magic numbers),
    // not the filename — protects the downstream parsers against
    // extension spoofing. Accept PDFs and common image formats; image
    // RFQs (photos, screenshots) go through tesseract directly in the
    // analyze step.
    const contentType = sniffContentType(buf);
    if (!contentType) {
      return res.status(400).json({
        error: "unsupported_file_type",
        message: "Upload a PDF or image (PNG, JPG, WebP, TIFF, BMP).",
      });
    }

    const storageKey = buildStorageKey(user.id, "rfq_source", filename);
    await putObject(storageKey, buf, contentType);
    const [file] = await db
      .insert(fileObjectsTable)
      .values({
        userId: user.id,
        storageKey,
        filename,
        contentType,
        sizeBytes: buf.length,
        purpose: "rfq_source",
      })
      .returning({ id: fileObjectsTable.id });
    if (!file) return res.status(500).json({ error: "file_insert_failed" });
    const [doc] = await db
      .insert(rfqDocumentsTable)
      .values({
        userId: user.id,
        fileId: file.id,
        sourceFilename: filename,
        status: "pending",
      })
      .returning();
    if (!doc) return res.status(500).json({ error: "insert_failed" });
    return res.status(201).json({ document: serialize(doc) });
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/documents/upload failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

function safeNumber(v: unknown, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

async function maybeAutoCreateTask(
  userId: string,
  doc: typeof rfqDocumentsTable.$inferSelect,
  parsed: ParsedRfq,
  clientName: string,
): Promise<string> {
  const enabled = (await getSetting(userId, "rfq_auto_create_task")).toLowerCase() !== "false";
  if (!enabled) return "";
  const fallbackDays = safeNumber(await getSetting(userId, "rfq_default_task_deadline_days"), 7);
  let dueDate: Date | null = null;
  if (parsed.closingDate) {
    const d = new Date(parsed.closingDate);
    if (!Number.isNaN(d.getTime())) dueDate = d;
  }
  if (!dueDate) {
    dueDate = new Date(Date.now() + fallbackDays * 86400_000);
  }
  const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86400_000);
  const priority: "high" | "normal" = daysUntil <= 5 ? "high" : "normal";
  const ref = parsed.rfqNumber || doc.sourceFilename;
  const title = `Respond to RFQ ${ref}${clientName ? ` — ${clientName}` : ""}`;
  const notes = `Items: ${parsed.items.length} | Submit to: ${parsed.submissionEmail || "—"} | Validity: ${parsed.validityDays || "—"} days`;
  const taskId = await createTask({
    userId,
    title,
    notes,
    dueDate,
    priority,
    linkedEntityType: "rfq_document",
    linkedEntityId: doc.id,
  });
  return taskId ?? "";
}

/**
 * Analyze: parse the stored PDF, run heuristic + AI research, persist
 * results, auto-link client, auto-create a task, log activity.
 */
router.post("/me/rfq/documents/:id/analyze", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [doc] = await db
      .select()
      .from(rfqDocumentsTable)
      .where(and(eq(rfqDocumentsTable.id, id), eq(rfqDocumentsTable.userId, user.id)))
      .limit(1);
    if (!doc) return res.status(404).json({ error: "not_found" });

    // Mark in-progress
    await db
      .update(rfqDocumentsTable)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(eq(rfqDocumentsTable.id, doc.id));

    // Load PDF bytes
    if (!doc.fileId) return res.status(400).json({ error: "no_source_file" });
    const [file] = await db
      .select()
      .from(fileObjectsTable)
      .where(and(eq(fileObjectsTable.id, doc.fileId), eq(fileObjectsTable.userId, user.id)))
      .limit(1);
    if (!file) return res.status(404).json({ error: "source_file_missing" });

    let parsed: ParsedRfq;
    let researchData: unknown[];
    let rawText = "";
    let wasOcr = false;
    let extractionSource: string = "empty";
    try {
      const pdfBuf = await getObject(file.storageKey);
      // Image uploads (photo / screenshot of an RFQ) bypass the
      // pdftotext/pdfjs tiers and OCR the image directly.
      const isImage = (file.contentType || "").startsWith("image/");
      const { text, wasOcr: ocrFlag, source } = isImage
        ? await parseImageBuffer(pdfBuf, file.contentType || "image/jpeg")
        : await parsePdfBuffer(pdfBuf);
      wasOcr = ocrFlag;
      extractionSource = source;
      // Defensively clamp rawText before persisting into JSONB so a
      // pathological PDF cannot bloat the row.
      rawText = text.length > 200_000 ? text.slice(0, 200_000) : text;
      // Heuristic always runs — gives us emails/phones/urls and a
      // safety-net for items in case Claude is unavailable.
      const heuristic = parseRfqText(text);
      // Claude is the PRIMARY extractor — it handles wide tabular layouts
      // that the regex parser cannot. Falls back to heuristic on null.
      const ai = await extractRfqWithAi(user.id, text);
      parsed = ai ? mergeParsedRfq(ai, heuristic) : heuristic;
      const classified = parsed.items.map(classifyItem);
      const researched = await researchItems(user.id, classified);
      researchData = researched;
    } catch (err) {
      logger.error({ err, docId: doc.id }, "rfq analyze: parse/research failed");
      await db
        .update(rfqDocumentsTable)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(rfqDocumentsTable.id, doc.id));
      return res.status(500).json({ error: "analysis_failed", message: err instanceof Error ? err.message : "unknown" });
    }

    // Detect & link client
    let detectedClientId = "";
    let detectedClientName = parsed.detectedClientName;
    try {
      // Reuse the rawText we already extracted; no need to re-parse.
      const match = await detectClient(user.id, rawText);
      if (match) {
        detectedClientId = match.id;
        detectedClientName = match.company || match.name || detectedClientName;
      }
    } catch {
      /* non-fatal */
    }

    const updateBase = {
      rfqNumber: parsed.rfqNumber.slice(0, 128),
      prNumber: parsed.prNumber.slice(0, 128),
      clientId: detectedClientId,
      detectedClientName: detectedClientName.slice(0, 255),
      enquiryDate: parsed.enquiryDate.slice(0, 64),
      closingDate: parsed.closingDate.slice(0, 64),
      submissionEmail: parsed.submissionEmail.slice(0, 320),
      submissionInstructions: parsed.submissionInstructions,
      paymentTerms: parsed.paymentTerms,
      deliveryTerms: parsed.deliveryTerms,
      validityDays: parsed.validityDays || 0,
      currency: parsed.currency.slice(0, 8),
      itemCount: parsed.items.length,
      parsedData: {
        ...parsed,
        rawText,
        // `isScanned` now means: we tried text extraction AND OCR and
        // still came up empty (truly unreadable). `wasOcr` means OCR
        // succeeded — UI shows an informational badge instead of the
        // red error state.
        isScanned: !wasOcr && rawText.replace(/\s+/g, "").length < 200,
        wasOcr,
        extractionSource,
        extractedTextLength: rawText.replace(/\s+/g, "").length,
      },
      researchData,
      status: "analyzed",
      updatedAt: new Date(),
    };

    const [updatedFirst] = await db
      .update(rfqDocumentsTable)
      .set(updateBase)
      .where(eq(rfqDocumentsTable.id, doc.id))
      .returning();
    if (!updatedFirst) return res.status(500).json({ error: "update_failed" });

    // Auto-create task and persist task id
    const taskId = await maybeAutoCreateTask(user.id, updatedFirst, parsed, detectedClientName);
    let updated = updatedFirst;
    if (taskId) {
      const [withTask] = await db
        .update(rfqDocumentsTable)
        .set({ taskId, updatedAt: new Date() })
        .where(eq(rfqDocumentsTable.id, doc.id))
        .returning();
      if (withTask) updated = withTask;
    }

    await logActivity({
      userId: user.id,
      type: "rfq_analyzed",
      title: `RFQ ${parsed.rfqNumber || doc.sourceFilename} analyzed`,
      description: `${parsed.items.length} item(s) parsed${detectedClientName ? ` for ${detectedClientName}` : ""}`,
      linkedEntityType: "rfq_document",
      linkedEntityId: doc.id,
      clientId: detectedClientId,
      metadata: { itemCount: parsed.items.length, closingDate: parsed.closingDate },
    });

    return res.json({ document: serialize(updated) });
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/documents/:id/analyze failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/me/rfq/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ("clientId" in body) {
      const clientId = clampStr(body["clientId"], 64);
      if (clientId) {
        const [c] = await db
          .select({ id: clientsTable.id })
          .from(clientsTable)
          .where(and(eq(clientsTable.id, clientId), eq(clientsTable.userId, user.id)))
          .limit(1);
        if (!c) return res.status(400).json({ error: "invalid_client" });
      }
      updates.clientId = clientId;
    }
    if ("status" in body) updates.status = clampStr(body["status"], 32);
    if ("submissionEmail" in body) updates.submissionEmail = clampStr(body["submissionEmail"], 320);
    if ("paymentTerms" in body) updates.paymentTerms = clampStr(body["paymentTerms"], 1000);
    if ("deliveryTerms" in body) updates.deliveryTerms = clampStr(body["deliveryTerms"], 1000);
    const [updated] = await db
      .update(rfqDocumentsTable)
      .set(updates)
      .where(and(eq(rfqDocumentsTable.id, id), eq(rfqDocumentsTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json({ document: serialize(updated) });
  } catch (err) {
    logger.error({ err }, "PATCH /me/rfq/documents/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/me/rfq/documents/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const result = await db
      .delete(rfqDocumentsTable)
      .where(and(eq(rfqDocumentsTable.id, id), eq(rfqDocumentsTable.userId, user.id)))
      .returning({ id: rfqDocumentsTable.id });
    if (result.length === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /me/rfq/documents/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/rfq/dashboard-stats", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const docs = await db
      .select({
        id: rfqDocumentsTable.id,
        status: rfqDocumentsTable.status,
        closingDate: rfqDocumentsTable.closingDate,
      })
      .from(rfqDocumentsTable)
      .where(eq(rfqDocumentsTable.userId, user.id));
    const now = Date.now();
    let pending = 0;
    let analyzed = 0;
    let quoted = 0;
    let overdue = 0;
    let nextDeadlineMs: number | null = null;
    for (const d of docs) {
      if (d.status === "pending" || d.status === "analyzing" || d.status === "error") pending++;
      else if (d.status === "analyzed" || d.status === "ready") analyzed++;
      else if (d.status === "quoted" || d.status === "sent" || d.status === "won" || d.status === "lost") quoted++;
      if (d.closingDate) {
        const t = Date.parse(d.closingDate);
        if (Number.isFinite(t)) {
          const isOpen = d.status !== "won" && d.status !== "lost" && d.status !== "quoted" && d.status !== "sent";
          if (isOpen && t < now) overdue++;
          if (isOpen && t >= now && (nextDeadlineMs === null || t < nextDeadlineMs)) {
            nextDeadlineMs = t;
          }
        }
      }
    }
    const nextDeadline = nextDeadlineMs !== null ? new Date(nextDeadlineMs).toISOString().slice(0, 10) : undefined;
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ pending, analyzed, quoted, overdue, nextDeadline, total: docs.length });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/dashboard-stats failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
