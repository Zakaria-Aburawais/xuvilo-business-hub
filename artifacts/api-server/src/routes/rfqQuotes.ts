import { Router, type IRouter } from "express";
import {
  db,
  rfqQuotesTable,
  rfqDocumentsTable,
  clientsTable,
  fileObjectsTable,
  companyProfilesTable,
} from "@workspace/db";
import { and, desc, eq, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";
import { logActivity } from "../lib/activityLog";
import { updateTaskStatus } from "../lib/taskService";
import { getSetting } from "../lib/settingsService";
import { buildStorageKey, putObject, getSignedDownloadUrl } from "../lib/objectStorage";
import { getUncachableSendGridClient } from "../lib/sendgrid";

const router: IRouter = Router();

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

function safeArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function serialize(q: typeof rfqQuotesTable.$inferSelect) {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    rfqDocumentId: q.rfqDocumentId,
    clientId: q.clientId,
    rfqReference: q.rfqReference,
    subject: q.subject,
    quoteDate: q.quoteDate,
    validUntil: q.validUntil,
    currency: q.currency,
    subtotal: Number(q.subtotal),
    discount: Number(q.discount),
    total: Number(q.total),
    status: q.status,
    lineItems: q.lineItems,
    commercialTerms: q.commercialTerms,
    signatureData: q.signatureData,
    signatoryName: q.signatoryName,
    signatoryTitle: q.signatoryTitle,
    pdfFileId: q.pdfFileId,
    emailSentAt: q.emailSentAt ? q.emailSentAt.toISOString() : null,
    emailSentTo: q.emailSentTo,
    notes: q.notes,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

async function generateQuoteNumber(userId: string): Promise<string> {
  const prefix = (await getSetting(userId, "rfq_quote_prefix")) || "QT";
  const year = new Date().getFullYear();
  const likePattern = `${prefix}-${year}-%`;
  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rfqQuotesTable)
    .where(
      and(
        eq(rfqQuotesTable.userId, userId),
        sql`${rfqQuotesTable.quoteNumber} LIKE ${likePattern}`,
      ),
    );
  const seq = String(Number(count ?? 0) + 1).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
}

router.get("/me/rfq/quotes", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const status = typeof req.query["status"] === "string" ? req.query["status"] : "";
    const clientId = typeof req.query["clientId"] === "string" ? req.query["clientId"] : "";
    const sentAfter = typeof req.query["sentAfter"] === "string" ? new Date(req.query["sentAfter"]) : null;
    const sentBefore = typeof req.query["sentBefore"] === "string" ? new Date(req.query["sentBefore"]) : null;
    const conditions = [eq(rfqQuotesTable.userId, user.id)];
    if (status) conditions.push(eq(rfqQuotesTable.status, status));
    if (clientId) conditions.push(eq(rfqQuotesTable.clientId, clientId));
    if (sentAfter && !Number.isNaN(sentAfter.getTime())) conditions.push(gte(rfqQuotesTable.emailSentAt, sentAfter));
    if (sentBefore && !Number.isNaN(sentBefore.getTime())) conditions.push(lte(rfqQuotesTable.emailSentAt, sentBefore));
    const rows = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(...conditions))
      .orderBy(desc(rfqQuotesTable.createdAt))
      .limit(500);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ quotes: rows.map(serialize) });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/quotes failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/rfq/quotes/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [row] = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.id, id), eq(rfqQuotesTable.userId, user.id)))
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ quote: serialize(row) });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/quotes/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.post("/me/rfq/quotes", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const quoteNumber = clampStr(body["quoteNumber"], 128) || (await generateQuoteNumber(user.id));
    const validityDays = Number(await getSetting(user.id, "rfq_default_validity_days")) || 30;
    const today = new Date().toISOString().slice(0, 10);
    const validUntil = new Date(Date.now() + validityDays * 86400_000).toISOString().slice(0, 10);
    const profile = await db
      .select()
      .from(companyProfilesTable)
      .where(eq(companyProfilesTable.userId, user.id))
      .limit(1);
    const cp = profile[0];
    const defaultCurrency = (await getSetting(user.id, "rfq_default_currency")) || cp?.defaultCurrency || "USD";

    const [created] = await db
      .insert(rfqQuotesTable)
      .values({
        userId: user.id,
        quoteNumber,
        rfqDocumentId: clampStr(body["rfqDocumentId"], 64),
        clientId: clampStr(body["clientId"], 64),
        rfqReference: clampStr(body["rfqReference"], 128),
        subject: clampStr(body["subject"], 500),
        quoteDate: clampStr(body["quoteDate"], 32, today),
        validUntil: clampStr(body["validUntil"], 32, validUntil),
        currency: clampStr(body["currency"], 8, defaultCurrency),
        subtotal: String(Number(body["subtotal"] ?? 0) || 0),
        discount: String(Number(body["discount"] ?? 0) || 0),
        total: String(Number(body["total"] ?? 0) || 0),
        status: clampStr(body["status"], 32, "draft"),
        lineItems: safeArray(body["lineItems"]),
        commercialTerms: (body["commercialTerms"] ?? {}) as object,
        signatureData: clampStr(body["signatureData"], 500_000),
        signatoryName: clampStr(body["signatoryName"], 255, cp?.signatoryName ?? ""),
        signatoryTitle: clampStr(body["signatoryTitle"], 255, cp?.signatoryTitle ?? ""),
        notes: clampStr(body["notes"], 4000),
      })
      .returning();
    if (!created) return res.status(500).json({ error: "insert_failed" });
    await logActivity({
      userId: user.id,
      type: "quote_created",
      title: `Quote ${created.quoteNumber} created`,
      linkedEntityType: "rfq_quote",
      linkedEntityId: created.id,
      clientId: created.clientId,
    });
    return res.status(201).json({ quote: serialize(created) });
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/quotes failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch("/me/rfq/quotes/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ("quoteNumber" in body) updates.quoteNumber = clampStr(body["quoteNumber"], 128);
    if ("rfqReference" in body) updates.rfqReference = clampStr(body["rfqReference"], 128);
    if ("clientId" in body) updates.clientId = clampStr(body["clientId"], 64);
    if ("subject" in body) updates.subject = clampStr(body["subject"], 500);
    if ("quoteDate" in body) updates.quoteDate = clampStr(body["quoteDate"], 32);
    if ("validUntil" in body) updates.validUntil = clampStr(body["validUntil"], 32);
    if ("currency" in body) updates.currency = clampStr(body["currency"], 8);
    if ("subtotal" in body) updates.subtotal = String(Number(body["subtotal"] ?? 0) || 0);
    if ("discount" in body) updates.discount = String(Number(body["discount"] ?? 0) || 0);
    if ("total" in body) updates.total = String(Number(body["total"] ?? 0) || 0);
    if ("status" in body) updates.status = clampStr(body["status"], 32);
    if ("lineItems" in body) updates.lineItems = safeArray(body["lineItems"]);
    if ("commercialTerms" in body) updates.commercialTerms = (body["commercialTerms"] ?? {}) as object;
    if ("signatureData" in body) updates.signatureData = clampStr(body["signatureData"], 500_000);
    if ("signatoryName" in body) updates.signatoryName = clampStr(body["signatoryName"], 255);
    if ("signatoryTitle" in body) updates.signatoryTitle = clampStr(body["signatoryTitle"], 255);
    if ("notes" in body) updates.notes = clampStr(body["notes"], 4000);
    const [updated] = await db
      .update(rfqQuotesTable)
      .set(updates)
      .where(and(eq(rfqQuotesTable.id, id), eq(rfqQuotesTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.json({ quote: serialize(updated) });
  } catch (err) {
    logger.error({ err }, "PATCH /me/rfq/quotes/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/me/rfq/quotes/:id", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const result = await db
      .delete(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.id, id), eq(rfqQuotesTable.userId, user.id)))
      .returning({ id: rfqQuotesTable.id });
    if (result.length === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /me/rfq/quotes/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

/** Attach a generated PDF (uploaded as base64 from the client) to the quote. */
router.post("/me/rfq/quotes/:id/pdf", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [quote] = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.id, id), eq(rfqQuotesTable.userId, user.id)))
      .limit(1);
    if (!quote) return res.status(404).json({ error: "not_found" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const dataB64 = typeof body["dataBase64"] === "string" ? (body["dataBase64"] as string) : "";
    if (!dataB64) return res.status(400).json({ error: "dataBase64_required" });
    const buf = decodeBase64(dataB64);
    if (!buf) return res.status(400).json({ error: "invalid_base64" });
    if (buf.length === 0) return res.status(400).json({ error: "empty_file" });
    if (buf.length > 10 * 1024 * 1024) return res.status(413).json({ error: "file_too_large" });
    let clientName = "";
    if (quote.clientId) {
      const [c] = await db
        .select({ company: clientsTable.company, name: clientsTable.name })
        .from(clientsTable)
        .where(and(eq(clientsTable.id, quote.clientId), eq(clientsTable.userId, user.id)))
        .limit(1);
      clientName = (c?.company || c?.name || "").replace(/[^A-Za-z0-9._-]/g, "_");
    }
    const filename = `Quote_${quote.quoteNumber}_${clientName || "client"}_${quote.quoteDate || "date"}.pdf`;
    const storageKey = buildStorageKey(user.id, "quote_pdf", filename);
    await putObject(storageKey, buf, "application/pdf");
    const [file] = await db
      .insert(fileObjectsTable)
      .values({
        userId: user.id,
        storageKey,
        filename,
        contentType: "application/pdf",
        sizeBytes: buf.length,
        purpose: "quote_pdf",
        linkedEntityType: "rfq_quote",
        linkedEntityId: quote.id,
        clientId: quote.clientId,
      })
      .returning({ id: fileObjectsTable.id });
    if (!file) return res.status(500).json({ error: "file_insert_failed" });
    const [updated] = await db
      .update(rfqQuotesTable)
      .set({ pdfFileId: file.id, updatedAt: new Date() })
      .where(eq(rfqQuotesTable.id, quote.id))
      .returning();
    return res.json({ quote: updated ? serialize(updated) : null, fileId: file.id });
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/quotes/:id/pdf failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

/** Send the attached PDF via SendGrid. Updates status, logs activity, completes linked task. */
router.post("/me/rfq/quotes/:id/send", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [quote] = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.id, id), eq(rfqQuotesTable.userId, user.id)))
      .limit(1);
    if (!quote) return res.status(404).json({ error: "not_found" });
    if (!quote.pdfFileId) return res.status(400).json({ error: "no_pdf", message: "Generate the PDF first." });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const to = clampStr(body["to"], 1000).trim();
    const cc = clampStr(body["cc"], 1000).trim();
    const subject = clampStr(body["subject"], 500).trim() || `Quotation ${quote.quoteNumber}${quote.rfqReference ? ` — Re: ${quote.rfqReference}` : ""}`;
    const message = clampStr(body["message"], 8000);
    if (!to) return res.status(400).json({ error: "to_required" });

    const [pdfFile] = await db
      .select()
      .from(fileObjectsTable)
      .where(and(eq(fileObjectsTable.id, quote.pdfFileId), eq(fileObjectsTable.userId, user.id)))
      .limit(1);
    if (!pdfFile) return res.status(404).json({ error: "pdf_missing" });

    // Pull bytes for attachment
    const { getObject } = await import("../lib/objectStorage");
    const pdfBuf = await getObject(pdfFile.storageKey);
    const fromName = process.env["SENDGRID_FROM_NAME"] || "Xuvilo Business Hub";

    let sgClient: Awaited<ReturnType<typeof getUncachableSendGridClient>>["client"];
    let fromEmail: string;
    try {
      const sg = await getUncachableSendGridClient();
      sgClient = sg.client;
      fromEmail = sg.fromEmail;
    } catch (err) {
      logger.error({ err }, "SendGrid client unavailable");
      return res.status(500).json({ error: "email_unavailable", message: "Email service is not configured." });
    }

    const toList = to.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const ccList = cc ? cc.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];
    try {
      await sgClient.send({
        to: toList,
        cc: ccList.length ? ccList : undefined,
        from: { email: fromEmail, name: fromName },
        subject,
        text: message || `Please find attached our quotation ${quote.quoteNumber}.`,
        html: (message || `Please find attached our quotation <strong>${quote.quoteNumber}</strong>.`).replace(/\n/g, "<br/>"),
        attachments: [
          {
            content: pdfBuf.toString("base64"),
            filename: pdfFile.filename,
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      });
    } catch (err) {
      logger.error({ err }, "SendGrid send failed");
      return res.status(500).json({ error: "email_failed", message: err instanceof Error ? err.message : "send failed" });
    }

    const [updated] = await db
      .update(rfqQuotesTable)
      .set({
        status: "sent",
        emailSentAt: new Date(),
        emailSentTo: toList.join(", ").slice(0, 1000),
        updatedAt: new Date(),
      })
      .where(eq(rfqQuotesTable.id, quote.id))
      .returning();

    // Log activity + complete linked task
    await logActivity({
      userId: user.id,
      type: "quote_sent",
      title: `Quote ${quote.quoteNumber} sent`,
      description: `To: ${toList.join(", ")}`,
      linkedEntityType: "rfq_quote",
      linkedEntityId: quote.id,
      clientId: quote.clientId,
      metadata: { to: toList, cc: ccList },
    });
    if (quote.rfqDocumentId) {
      const [rfqDoc] = await db
        .select({ taskId: rfqDocumentsTable.taskId })
        .from(rfqDocumentsTable)
        .where(and(eq(rfqDocumentsTable.id, quote.rfqDocumentId), eq(rfqDocumentsTable.userId, user.id)))
        .limit(1);
      if (rfqDoc?.taskId) {
        await updateTaskStatus(user.id, rfqDoc.taskId, "completed");
      }
    }

    return res.json({ quote: updated ? serialize(updated) : null });
  } catch (err) {
    logger.error({ err }, "POST /me/rfq/quotes/:id/send failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/rfq/quotes/:id/pdf-url", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const id = String(req.params["id"] ?? "");
    const [quote] = await db
      .select()
      .from(rfqQuotesTable)
      .where(and(eq(rfqQuotesTable.id, id), eq(rfqQuotesTable.userId, user.id)))
      .limit(1);
    if (!quote || !quote.pdfFileId) return res.status(404).json({ error: "not_found" });
    const [file] = await db
      .select()
      .from(fileObjectsTable)
      .where(and(eq(fileObjectsTable.id, quote.pdfFileId), eq(fileObjectsTable.userId, user.id)))
      .limit(1);
    if (!file) return res.status(404).json({ error: "pdf_missing" });
    const url = await getSignedDownloadUrl(file.storageKey, file.filename);
    return res.json({ url, expiresInSeconds: 600 });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/quotes/:id/pdf-url failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/me/rfq/quotes-stats", requireAuth, async (req, res) => {
  try {
    const user = await resolveUserIdAndTier((req as { userEmail?: string }).userEmail!);
    if (!user) return res.status(404).json({ error: "user_not_found" });
    const rows = await db
      .select({
        status: rfqQuotesTable.status,
        emailSentAt: rfqQuotesTable.emailSentAt,
      })
      .from(rfqQuotesTable)
      .where(eq(rfqQuotesTable.userId, user.id));
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    let drafts = 0;
    let sentThisMonth = 0;
    for (const r of rows) {
      if (r.status === "draft") drafts++;
      if (r.status === "sent" && r.emailSentAt && r.emailSentAt.getTime() >= monthStart.getTime()) sentThisMonth++;
    }
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ drafts, sentThisMonth, total: rows.length });
  } catch (err) {
    logger.error({ err }, "GET /me/rfq/quotes-stats failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
