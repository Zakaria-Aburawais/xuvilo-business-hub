import { Router, type IRouter } from "express";
import { eq, desc, sql, and, or, ilike, inArray, type SQL } from "drizzle-orm";
import { db, contactMessagesTable } from "@workspace/db";
import { requireRole } from "../lib/auth";
import { logger } from "../lib/logger";
import { sendContactEmails } from "../lib/contactMailer";
import { normalizeLang } from "../lib/emailTemplate";
import { notifyContactFailure } from "../lib/contactFailureNotifier";

const router: IRouter = Router();

const ALLOWED_STATUSES = new Set(["sent", "partial", "failed", "pending"]);
const ALLOWED_TRIAGE_STATUSES = new Set(["new", "read", "resolved"]);
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

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

router.get(
  "/admin/contact-messages",
  requireRole("admin"),
  async (req, res) => {
    try {
      const status = typeof req.query["status"] === "string" ? req.query["status"] : "";
      const limit = parseLimit(req.query["limit"]);
      const offset = parseOffset(req.query["offset"]);
      const rawQ = typeof req.query["q"] === "string" ? req.query["q"] : "";
      const q = rawQ.trim().slice(0, MAX_QUERY_LENGTH);

      const conditions: SQL[] = [];
      if (status === "needs_follow_up") {
        conditions.push(
          inArray(contactMessagesTable.mailStatus, ["failed", "partial"]),
        );
      } else if (ALLOWED_STATUSES.has(status)) {
        conditions.push(eq(contactMessagesTable.mailStatus, status));
      }
      const triage =
        typeof req.query["triage"] === "string" ? req.query["triage"] : "";
      if (triage === "unresolved") {
        conditions.push(
          inArray(contactMessagesTable.triageStatus, ["new", "read"]),
        );
      } else if (ALLOWED_TRIAGE_STATUSES.has(triage)) {
        conditions.push(eq(contactMessagesTable.triageStatus, triage));
      }
      if (q) {
        const pattern = `%${escapeLike(q)}%`;
        const search = or(
          ilike(contactMessagesTable.name, pattern),
          ilike(contactMessagesTable.email, pattern),
          ilike(contactMessagesTable.subject, pattern),
        );
        if (search) conditions.push(search);
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const baseQuery = db
        .select({
          id: contactMessagesTable.id,
          createdAt: contactMessagesTable.createdAt,
          name: contactMessagesTable.name,
          email: contactMessagesTable.email,
          subject: contactMessagesTable.subject,
          lang: contactMessagesTable.lang,
          mailStatus: contactMessagesTable.mailStatus,
          triageStatus: contactMessagesTable.triageStatus,
        })
        .from(contactMessagesTable);

      const rowsPromise = where
        ? baseQuery
            .where(where)
            .orderBy(desc(contactMessagesTable.createdAt))
            .limit(limit)
            .offset(offset)
        : baseQuery
            .orderBy(desc(contactMessagesTable.createdAt))
            .limit(limit)
            .offset(offset);

      const totalQuery = db
        .select({ count: sql<number>`count(*)::int` })
        .from(contactMessagesTable);
      const totalPromise = where ? totalQuery.where(where) : totalQuery;

      const [rows, totalRows] = await Promise.all([rowsPromise, totalPromise]);
      const total = totalRows[0]?.count ?? 0;

      res.setHeader("Cache-Control", "private, no-store");
      return res.json({
        success: true,
        items: rows,
        total,
        limit,
        offset,
        filter: {
          status:
            status === "needs_follow_up" || ALLOWED_STATUSES.has(status)
              ? status
              : null,
          triage:
            triage === "unresolved" || ALLOWED_TRIAGE_STATUSES.has(triage)
              ? triage
              : null,
          q: q || null,
        },
      });
    } catch (err) {
      logger.error({ err }, "admin/contact-messages list failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not load contact messages.",
      });
    }
  },
);

router.get(
  "/admin/contact-messages/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = String(req.params.id ?? "");
      if (!id || id.length > 64) {
        return res.status(400).json({
          success: false,
          error: "invalid_id",
          message: "Invalid message id.",
        });
      }
      const rows = await db
        .select()
        .from(contactMessagesTable)
        .where(eq(contactMessagesTable.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return res.status(404).json({
          success: false,
          error: "not_found",
          message: "Message not found.",
        });
      }
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ success: true, item: row });
    } catch (err) {
      logger.error({ err }, "admin/contact-messages detail failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not load contact message.",
      });
    }
  },
);

// Update the triage status of a message (new | read | resolved) so admins
// can track which submissions have been handled.
router.patch(
  "/admin/contact-messages/:id",
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = String(req.params.id ?? "");
      if (!id || id.length > 64) {
        return res.status(400).json({
          success: false,
          error: "invalid_id",
          message: "Invalid message id.",
        });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const triageStatus = body["triageStatus"];
      if (
        typeof triageStatus !== "string" ||
        !ALLOWED_TRIAGE_STATUSES.has(triageStatus)
      ) {
        return res.status(400).json({
          success: false,
          error: "invalid_triage_status",
          message: 'triageStatus must be one of "new", "read", "resolved".',
        });
      }

      const updated = await db
        .update(contactMessagesTable)
        .set({ triageStatus })
        .where(eq(contactMessagesTable.id, id))
        .returning({
          id: contactMessagesTable.id,
          triageStatus: contactMessagesTable.triageStatus,
        });
      const row = updated[0];
      if (!row) {
        return res.status(404).json({
          success: false,
          error: "not_found",
          message: "Message not found.",
        });
      }

      logger.info(
        { contactTriage: { id, triageStatus } },
        "admin: contact message triage status updated",
      );

      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ success: true, item: row });
    } catch (err) {
      logger.error({ err }, "admin/contact-messages patch failed");
      return res.status(503).json({
        success: false,
        error: "Database not available",
        message: "Could not update contact message.",
      });
    }
  },
);

// Re-send the auto-reply + team notification for a stored submission whose
// original send failed (mail_status `failed` or `partial`). Also allowed for
// `pending` rows (a crash between insert and send leaves them stuck there).
// Rows already `sent` are rejected to avoid accidentally double-emailing the
// visitor — pass { "force": true } in the body to override.
//
// Team usage until a real admin inbox exists (see docs/contact-resend.md):
//   curl -X POST "$BASE/api/admin/contact-messages/<id>/resend" \
//     -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json"
router.post(
  "/admin/contact-messages/:id/resend",
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = String(req.params.id ?? "");
      if (!id || id.length > 64) {
        return res.status(400).json({
          success: false,
          error: "invalid_id",
          message: "Invalid message id.",
        });
      }

      const rows = await db
        .select()
        .from(contactMessagesTable)
        .where(eq(contactMessagesTable.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) {
        return res.status(404).json({
          success: false,
          error: "not_found",
          message: "Message not found.",
        });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const force = body["force"] === true;
      if (row.mailStatus === "sent" && !force) {
        return res.status(409).json({
          success: false,
          error: "already_sent",
          message:
            "This message's emails were already sent. Pass {\"force\": true} to resend anyway.",
        });
      }

      const lang = normalizeLang(row.lang);
      const { userMailOk, teamMailOk, mailStatus } = await sendContactEmails({
        name: row.name,
        email: row.email,
        subject: row.subject,
        message: row.message,
        lang,
      });

      try {
        await db
          .update(contactMessagesTable)
          .set({ mailStatus })
          .where(eq(contactMessagesTable.id, id));
      } catch (dbErr) {
        logger.error(
          { err: dbErr, messageId: id },
          "admin/contact resend: failed to update mail_status",
        );
      }

      // If the resend also failed (fully or partially), route through the
      // same SendGrid-independent fallback channel as the original failure.
      if (mailStatus === "failed" || mailStatus === "partial") {
        await notifyContactFailure({
          messageId: id,
          name: row.name,
          email: row.email,
          subject: row.subject,
          message: row.message,
          lang,
          mailStatus,
          userMailOk,
          teamMailOk,
        });
      }

      logger.info(
        {
          contactResend: {
            id,
            previousMailStatus: row.mailStatus,
            userMailOk,
            teamMailOk,
            mailStatus,
            force,
          },
        },
        "admin: contact message resend attempted",
      );

      res.setHeader("Cache-Control", "private, no-store");
      return res.status(mailStatus === "failed" ? 502 : 200).json({
        success: mailStatus !== "failed",
        id,
        previousMailStatus: row.mailStatus,
        mailStatus,
        userMailOk,
        teamMailOk,
      });
    } catch (err) {
      logger.error({ err }, "admin/contact-messages resend failed");
      return res.status(500).json({
        success: false,
        error: "internal_error",
        message: "Could not resend contact emails.",
      });
    }
  },
);

export default router;
