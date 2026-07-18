import { Router } from "express";
import express from "express";
import { db, aiWriterDraftsTable, usageCountersTable } from "@workspace/db";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import {
  generateJson,
  getActiveProvider,
  getActiveModel,
  isAIConfigured,
  AIProviderUnavailableError,
  AIProviderError,
} from "../services/ai-provider";
import { verifyToken } from "../lib/auth";
import { resolveUserIdAndTier } from "../lib/userResolver";
import { logger } from "../lib/logger";

const router = Router();

const DRAFTS_PER_USER_LIMIT = 50;

/** Free-tier monthly cap for AI Writer generations. Pro is unlimited. */
const AI_WRITER_FREE_MONTHLY_LIMIT = 20;

// When BILLING_ENABLED is not "true", all quota enforcement is skipped —
// every caller is treated as a paid user. Matches entitlements.ts / usage.ts.
const BILLING_ENABLED = process.env["BILLING_ENABLED"] === "true";

/** "YYYY-MM" in UTC, matching the documents/clients usage period. */
function currentPeriod(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

interface OptionalUser {
  id: string;
  tier: string;
}

/**
 * Best-effort lookup of the signed-in user. Unlike requireAuth, this does NOT
 * reject anonymous requests — generation should still work without an account.
 */
async function getOptionalUser(req: express.Request): Promise<OptionalUser | null> {
  const header = req.headers["authorization"];
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : "";
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  try {
    const user = await resolveUserIdAndTier(payload.email);
    return user ? { id: user.id, tier: user.tier } : null;
  } catch {
    return null;
  }
}

async function getOptionalUserId(req: express.Request): Promise<string | null> {
  const u = await getOptionalUser(req);
  return u?.id ?? null;
}

/**
 * Atomically reserve one AI Writer generation against the caller's monthly
 * counter. This is a single INSERT … ON CONFLICT DO UPDATE that increments
 * `ai_writer_generations` and returns the *new* value, so concurrent requests
 * cannot both pass the cap check (the database serialises the update).
 *
 * The handler must inspect the returned value and call `refundAiWriterGeneration`
 * if the cap was exceeded or if the AI generation itself fails — that way we
 * never charge a user for a request we did not fulfil.
 */
async function reserveAiWriterGeneration(
  userId: string,
  period: string,
): Promise<number> {
  const [row] = await db
    .insert(usageCountersTable)
    .values({
      userId,
      periodMonth: period,
      documentsCreated: 0,
      aiWriterGenerations: 1,
    })
    .onConflictDoUpdate({
      target: [usageCountersTable.userId, usageCountersTable.periodMonth],
      set: {
        aiWriterGenerations: sql`${usageCountersTable.aiWriterGenerations} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ aiWriterGenerations: usageCountersTable.aiWriterGenerations });
  return row?.aiWriterGenerations ?? 0;
}

/**
 * Undo a prior `reserveAiWriterGeneration` (e.g. when the AI provider failed
 * or the user was already over the cap). Clamped at 0 so a stray refund can
 * never produce a negative counter.
 */
async function refundAiWriterGeneration(userId: string, period: string): Promise<void> {
  await db
    .update(usageCountersTable)
    .set({
      aiWriterGenerations: sql`GREATEST(${usageCountersTable.aiWriterGenerations} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(and(eq(usageCountersTable.userId, userId), eq(usageCountersTable.periodMonth, period)));
}


type PurposeId =
  | "payment_reminder"
  | "invoice_followup"
  | "quotation_submission"
  | "supplier_request"
  | "complaint_clarification"
  | "formal_business"
  | "improve_email"
  | "translate_ar_en"
  | "translate_en_ar";

interface PurposeMeta {
  label: string;
  goal: string;
  /** Whether the user must supply an existing draft (improve / translate). */
  requiresDraft: boolean;
  /** Extra rules per purpose (appended to the base rules). */
  extraRules: string[];
}

const PURPOSES: Record<PurposeId, PurposeMeta> = {
  payment_reminder: {
    label: "Payment reminder",
    goal:
      "Politely remind the recipient about an unpaid invoice. Reference the invoice number, amount, currency and due date if the user supplied them. Be respectful but clearly state the next step (e.g. confirm payment date, share remittance, contact accounts).",
    requiresDraft: false,
    extraRules: [
      "Never invent invoice numbers, amounts, dates or currencies. Use only what the user provided in 'references' or 'details'. If a fact is missing, write the email without it.",
    ],
  },
  invoice_followup: {
    label: "Invoice follow-up",
    goal:
      "Confirm an invoice was sent and ask the recipient to confirm receipt and the expected payment timeline. Keep it short and constructive.",
    requiresDraft: false,
    extraRules: [
      "Do not threaten, escalate or mention legal action — this is a first follow-up.",
    ],
  },
  quotation_submission: {
    label: "Quotation submission",
    goal:
      "Submit a quotation to a prospective client. Summarise scope, total amount and currency, validity period, payment terms, and ask the recipient to confirm or ask questions. Mention the attached file if the user implies one.",
    requiresDraft: false,
    extraRules: [
      "Do not invent a price, validity, or payment terms — only use what the user provided.",
    ],
  },
  supplier_request: {
    label: "Supplier request",
    goal:
      "Request a quotation, sample, lead time, MOQ or pricing terms from a supplier. Be specific about quantities, specs, delivery location and the information required back.",
    requiresDraft: false,
    extraRules: [
      "Always ask the supplier to confirm lead time and validity of the offer.",
    ],
  },
  complaint_clarification: {
    label: "Complaint or clarification",
    goal:
      "Raise an issue or ask for clarification firmly but professionally. Clearly state: (1) what happened, (2) what the user expects as a resolution, (3) the timeline. Avoid emotional or accusatory language.",
    requiresDraft: false,
    extraRules: [
      "Do not insult, threaten, or use profanity, even if the user's input is heated.",
    ],
  },
  formal_business: {
    label: "Formal business message",
    goal:
      "Write a general formal business message in a measured, professional tone. Suitable for announcements, introductions, requests, confirmations, and similar correspondence.",
    requiresDraft: false,
    extraRules: [],
  },
  improve_email: {
    label: "Improve existing email",
    goal:
      "Rewrite the user's existing draft so it is clearer, more professional, well-structured, and free of grammar issues — while keeping all of its facts, names, numbers and intent exactly as written.",
    requiresDraft: true,
    extraRules: [
      "Do not add new facts, claims, prices, dates, names, attachments or commitments that are not in the original draft.",
      "Do not remove any concrete fact from the original draft.",
      "Preserve the user's intent and the key call to action.",
    ],
  },
  translate_ar_en: {
    label: "Translate Arabic → English",
    goal:
      "Translate the user's existing Arabic draft into clear, professional business English. Output must be a faithful translation, not a rewrite.",
    requiresDraft: true,
    extraRules: [
      "The output language MUST be English regardless of the 'language' parameter.",
      "Preserve every name, number, date, amount, currency, invoice/quotation/reference number exactly as written.",
      "Do not add greetings, sign-offs or content that is not in the original.",
    ],
  },
  translate_en_ar: {
    label: "Translate English → Arabic",
    goal:
      "Translate the user's existing English draft into clear, professional Modern Standard Arabic suitable for business correspondence. Output must be a faithful translation, not a rewrite.",
    requiresDraft: true,
    extraRules: [
      "The output language MUST be Modern Standard Arabic regardless of the 'language' parameter.",
      "Preserve every name, number, date, amount, currency, invoice/quotation/reference number exactly as written.",
      "Use proper Arabic punctuation. Do not transliterate names unless they are already transliterated in the source.",
    ],
  },
};

const TONE_GUIDE: Record<string, string> = {
  formal:       "very formal and respectful",
  polite:       "polite and warm but professional",
  firm:         "firm and direct without being rude",
  friendly:     "friendly and conversational while still professional",
  concise:      "extremely concise — short sentences, no filler, no pleasantries beyond a brief greeting and sign-off",
  professional: "neutral, professional, business-standard tone",
};

const LENGTH_GUIDE: Record<string, string> = {
  short:    "Keep the body very short: roughly 40 to 80 words. Two short paragraphs at most.",
  medium:   "Keep the body to roughly 80 to 160 words. Two to four short paragraphs.",
  detailed: "Allow the body to be more thorough: roughly 160 to 280 words. Use three to five short paragraphs and clearly cover every supplied detail.",
};

const VALID_LANGS = new Set(["en", "ar"]);

function trimStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

const ipHits = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 6;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const cur = ipHits.get(ip);
  if (!cur || cur.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (cur.count >= RATE_LIMIT) return false;
  cur.count++;
  return true;
}

interface ParsedOutput {
  subject: string;
  body: string;
}

/**
 * Parse the model's response. We ask for JSON via responseMimeType, but the
 * model occasionally returns plain text or wraps the JSON in a code fence.
 * Fallback: split on the first blank line and treat the first line as subject.
 */
function parseModelOutput(raw: string): ParsedOutput {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  // Try JSON first
  try {
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === "object") {
      const subject = typeof obj.subject === "string" ? obj.subject.trim() : "";
      const body = typeof obj.body === "string" ? obj.body.trim() : "";
      if (subject || body) {
        return { subject, body };
      }
    }
  } catch {
    // fall through to text parsing
  }

  // Plain-text fallback: "Subject: foo\n\nbody..." or first blank line split
  const subjectMatch = cleaned.match(/^\s*subject\s*[:：]\s*(.+)$/im);
  if (subjectMatch) {
    const subject = subjectMatch[1].trim();
    const body = cleaned
      .replace(subjectMatch[0], "")
      .replace(/^\s*\n+/, "")
      .trim();
    return { subject, body };
  }

  const blankIdx = cleaned.search(/\n\s*\n/);
  if (blankIdx > 0) {
    return {
      subject: cleaned.slice(0, blankIdx).trim(),
      body: cleaned.slice(blankIdx).trim(),
    };
  }

  return { subject: "", body: cleaned };
}

function buildPrompt(args: {
  meta: PurposeMeta;
  tone: string;
  language: "en" | "ar";
  length: string;
  senderName: string;
  recipientName: string;
  recipientCompany: string;
  mainPurpose: string;
  details: string;
  references: string;
  instructions: string;
  existingDraft: string;
}): string {
  const {
    meta, tone, language, length,
    senderName, recipientName, recipientCompany,
    mainPurpose, details, references, instructions, existingDraft,
  } = args;

  const toneGuide = TONE_GUIDE[tone] ?? TONE_GUIDE.polite;
  const lengthGuide = LENGTH_GUIDE[length] ?? LENGTH_GUIDE.medium;

  const langInstruction = language === "ar"
    ? "Write the entire output (subject and body) in Modern Standard Arabic suitable for business correspondence. Use proper Arabic punctuation. Do NOT use English in the output."
    : "Write the entire output (subject and body) in clear professional English.";

  const userContext: string[] = [];
  if (senderName)        userContext.push(`Sender (the user / their company): ${senderName}`);
  if (recipientName)     userContext.push(`Recipient name: ${recipientName}`);
  if (recipientCompany)  userContext.push(`Recipient company: ${recipientCompany}`);
  if (mainPurpose)       userContext.push(`Main purpose / goal in one line: ${mainPurpose}`);
  if (details)           userContext.push(`Key details:\n${details}`);
  if (references)        userContext.push(`Important references (dates, amounts, invoice/quotation/ref numbers):\n${references}`);
  if (instructions)      userContext.push(`Additional instructions from the user:\n${instructions}`);
  if (existingDraft)     userContext.push(`User's existing draft:\n"""\n${existingDraft}\n"""`);

  const greetingHint = recipientName
    ? `Greet the recipient by name (e.g. "Dear ${recipientName}," / "السيد/ة ${recipientName}،").`
    : recipientCompany
      ? `Greet the recipient generically using the company name (e.g. "Dear ${recipientCompany} team,").`
      : `Use a generic professional greeting if no recipient name is provided.`;

  const signoffHint = senderName
    ? `Sign off with the sender's name on the last line.`
    : `Sign off with a placeholder like "[Your Name]" on the last line.`;

  const baseRules = [
    "- Output MUST be a single JSON object with exactly two string fields: \"subject\" and \"body\".",
    "- The \"subject\" field is a single line, no newlines, no quotes, no markdown.",
    "- The \"body\" field is the full email body, including greeting and sign-off, with `\\n` for line breaks. No markdown, no headings.",
    "- Do not include any text outside the JSON object — no commentary, no code fences, no explanations.",
    "- Do not invent specific facts (invoice numbers, amounts, dates, names, references) that the user did not supply.",
    "- Do not include any disclaimer about being an AI or about the message being AI-generated.",
    `- ${greetingHint}`,
    `- ${signoffHint}`,
    `- ${lengthGuide}`,
  ];

  const allRules = [...baseRules, ...meta.extraRules.map((r) => `- ${r}`)];

  return [
    `You are an experienced bilingual (Arabic/English) business correspondent helping a small business owner draft a "${meta.label}" email.`,
    `Goal: ${meta.goal}`,
    `Tone: ${toneGuide}.`,
    langInstruction,
    "",
    "Output rules (strict):",
    ...allRules,
    "",
    "User-supplied context:",
    userContext.length ? userContext.join("\n\n") : "(none)",
  ].join("\n");
}

/**
 * Standardised JSON response shapes.
 *
 * Success:  { success: true,  subject, body, provider }
 * Failure:  { success: false, error,   message }
 *
 * The `message` field is always a short, user-safe sentence the frontend
 * can render directly. The `error` field is a short machine-readable code.
 */
function fail(
  res: import("express").Response,
  status: number,
  error: string,
  message: string,
) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json({ success: false, error, message });
}

const IS_DEV = process.env.NODE_ENV !== "production";

router.post("/ai-writer/generate", express.json({ limit: "16kb" }), async (req, res) => {
  const startedAt = Date.now();
  // Track whether we have already reserved a slot against the free-tier monthly
  // counter, so any later failure path can refund it. Set to non-null only for
  // signed-in free-tier callers that pass validation.
  let reservation: { userId: string; period: string } | null = null;
  try {
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    if (!rateLimit(ip)) {
      return fail(res, 429, "Rate limited", "Too many requests. Please wait a minute and try again.");
    }

    // Resolve the caller (anon vs free vs pro) so we can enforce per-user
    // monthly quotas the same way Documents/Clients/Usage already do.
    // Anonymous callers fall back to the existing IP rate limit only — we
    // have no per-account identity to track them against.
    const caller = await getOptionalUser(req);
    const period = currentPeriod();

    const body = req.body as {
      purpose?: unknown;
      tone?: unknown;
      language?: unknown;
      length?: unknown;
      senderName?: unknown;
      recipientName?: unknown;
      recipientCompany?: unknown;
      mainPurpose?: unknown;
      details?: unknown;
      references?: unknown;
      instructions?: unknown;
      existingDraft?: unknown;
    };

    const purposeId = trimStr(body.purpose, 64) as PurposeId;
    const tone = trimStr(body.tone, 32) || "polite";
    // Accept missing/empty as "en" (default); reject other non-empty values
    // so callers cannot smuggle in unsupported languages.
    const rawLang = trimStr(body.language, 8);
    const language: "en" | "ar" =
      rawLang === "" ? "en" : rawLang === "ar" ? "ar" : (rawLang as "en" | "ar");
    const length = trimStr(body.length, 16) || "medium";

    const senderName       = trimStr(body.senderName, 200);
    const recipientName    = trimStr(body.recipientName, 200);
    const recipientCompany = trimStr(body.recipientCompany, 200);
    const mainPurpose      = trimStr(body.mainPurpose, 300);
    const details          = trimStr(body.details, 2500);
    const references       = trimStr(body.references, 800);
    const instructions     = trimStr(body.instructions, 600);
    const existingDraft    = trimStr(body.existingDraft, 4000);

    const meta = PURPOSES[purposeId];
    if (!meta) {
      return fail(res, 400, "Invalid request", "Please pick a valid message purpose.");
    }
    if (!VALID_LANGS.has(language)) {
      return fail(res, 400, "Invalid request", "Please pick a valid output language.");
    }
    if (!TONE_GUIDE[tone]) {
      return fail(res, 400, "Invalid request", "Please pick a valid tone.");
    }
    if (!LENGTH_GUIDE[length]) {
      return fail(res, 400, "Invalid request", "Please pick a valid message length.");
    }

    if (meta.requiresDraft && !existingDraft) {
      return fail(
        res,
        400,
        "Invalid request",
        "Please paste your existing draft so it can be improved or translated.",
      );
    }
    if (!meta.requiresDraft && !details && !mainPurpose) {
      return fail(
        res,
        400,
        "Invalid request",
        "Please add a main purpose or some key details so the message can be drafted.",
      );
    }

    if (IS_DEV) {
      // Safe debug log — never logs the AI key, only whether it is configured.
      // eslint-disable-next-line no-console
      console.log("[ai-writer] generate", {
        provider: getActiveProvider(),
        model: getActiveModel(),
        purpose: purposeId,
        language,
        tone,
        length,
        aiConfigured: isAIConfigured(),
      });
    }

    // Atomically reserve a slot for free-tier callers BEFORE we spend the AI
    // budget. The single INSERT … ON CONFLICT DO UPDATE returns the post-
    // increment count, so two concurrent requests cannot both squeeze past
    // the cap. If we are over the cap, refund immediately and return 402.
    // Pro, anonymous, and (when billing is disabled) all callers skip the counter.
    if (BILLING_ENABLED && caller && caller.tier === "free") {
      const newCount = await reserveAiWriterGeneration(caller.id, period);
      if (newCount > AI_WRITER_FREE_MONTHLY_LIMIT) {
        await refundAiWriterGeneration(caller.id, period).catch((err) => {
          logger.warn({ err }, "ai-writer: failed to refund over-cap reservation");
        });
        res.setHeader("Cache-Control", "no-store");
        return res.status(402).json({
          success: false,
          error: "limit_reached",
          message: `You've used all ${AI_WRITER_FREE_MONTHLY_LIMIT} free AI Writer generations for this month. Upgrade to Pro for unlimited.`,
          period,
          aiWriterGenerations: AI_WRITER_FREE_MONTHLY_LIMIT,
          limit: AI_WRITER_FREE_MONTHLY_LIMIT,
          remaining: 0,
          blocked: true,
        });
      }
      // Hold the reservation; later failure paths will refund it.
      reservation = { userId: caller.id, period };
    }

    const prompt = buildPrompt({
      meta, tone, language, length,
      senderName, recipientName, recipientCompany,
      mainPurpose, details, references, instructions, existingDraft,
    });

    const raw = await generateJson({
      prompt,
      maxOutputTokens: 1400,
      temperature: 0.55,
    });

    const { subject, body: emailBody } = parseModelOutput(raw);
    if (!subject && !emailBody) {
      // The AI returned nothing usable — refund the reservation so the user
      // is not charged for a generation we never delivered.
      if (reservation) {
        await refundAiWriterGeneration(reservation.userId, reservation.period).catch((err) => {
          logger.warn({ err }, "ai-writer: failed to refund unusable response");
        });
        reservation = null;
      }
      return fail(
        res,
        502,
        "AI provider error",
        "The AI provider could not generate a usable message. Please try again.",
      );
    }

    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.log("[ai-writer] success", {
        provider: getActiveProvider(),
        model: getActiveModel(),
        status: 200,
        ms: Date.now() - startedAt,
        hasSubject: subject.length > 0,
        hasBody: emailBody.length > 0,
        subjectLen: subject.length,
        bodyLen: emailBody.length,
      });
    }

    res.setHeader("Cache-Control", "no-store");

    // The free-tier monthly counter was already incremented up-front by
    // `reserveAiWriterGeneration` (above). At this point the generation has
    // succeeded, so we keep the reservation as the actual usage record.
    // Persisting the draft for signed-in users is best-effort — a save error
    // must not block returning the generated message to the user.
    let savedDraftId: string | null = null;
    if (caller) {
      try {
        savedDraftId = await persistDraft({
          userId: caller.id,
          purpose: purposeId,
          language,
          tone,
          length,
          subject,
          body: emailBody,
          inputs: {
            senderName,
            recipientName,
            recipientCompany,
            mainPurpose,
            details,
            references,
            instructions,
            existingDraft,
          },
        });
      } catch (saveErr) {
        logger.warn({ err: saveErr }, "ai-writer: failed to auto-save draft");
      }
    }

    // Reservation has been honoured; clear it so the catch block does not
    // refund a successful generation.
    reservation = null;

    return res.json({
      success: true,
      subject,
      body: emailBody,
      provider: getActiveProvider(),
      draftId: savedDraftId,
    });
  } catch (e) {
    // Any failure after we reserved a slot must release it, so the user is
    // not charged for a generation that never reached them. We swallow refund
    // errors — the original error is what we want to surface.
    if (reservation) {
      const r = reservation;
      reservation = null;
      await refundAiWriterGeneration(r.userId, r.period).catch((err) => {
        logger.warn({ err }, "ai-writer: failed to refund after handler error");
      });
    }
    if (e instanceof AIProviderUnavailableError) {
      // Always log the real provider error server-side so admins/devs can
      // diagnose. The detail is the provider's own message text — it never
      // contains the API key (we never log process.env.OPENAI_API_KEY and
      // the OpenAI SDK does not echo the key back in error bodies).
      if (IS_DEV) {
        // eslint-disable-next-line no-console
        console.warn("[ai-writer] provider unavailable", {
          provider: e.provider,
          quotaExceeded: Boolean(e.quotaExceeded),
          detail: e.message,
        });
      } else {
        // In production we still want this in the structured logs for
        // operators, just at warn level and without the key.
        logger.warn(
          {
            provider: e.provider,
            quotaExceeded: Boolean(e.quotaExceeded),
            detail: e.message,
          },
          "ai-writer: provider unavailable",
        );
      }

      // User-facing message intentionally hides the provider name and any
      // technical detail (no "OpenAI", no URLs, no error codes). Quota /
      // billing problems are bucketed into a single friendly notice.
      let message: string;
      if (e.provider === "gemini") {
        message =
          "AI writing is temporarily unavailable. Please try again later.";
      } else if (e.quotaExceeded) {
        message =
          "AI writing is temporarily unavailable because the service account needs billing or credits. Please try again later.";
      } else {
        // Missing/invalid key — still calm, no provider name leaked.
        message =
          "AI writing is temporarily unavailable. Please try again later.";
      }
      return fail(res, 503, "AI writing unavailable", message);
    }
    if (e instanceof AIProviderError) {
      return fail(
        res,
        502,
        "AI provider error",
        "The AI provider could not generate the message. Please try again.",
      );
    }
    if (IS_DEV) {
      // eslint-disable-next-line no-console
      console.error("[ai-writer] unexpected", e);
    }
    return fail(
      res,
      500,
      "Server error",
      "Something went wrong while generating the message. Please try again.",
    );
  }
});

/* ─── Saved drafts ──────────────────────────────────────────────────────── */

interface PersistDraftInput {
  userId: string;
  purpose: string;
  language: string;
  tone: string;
  length: string;
  subject: string;
  body: string;
  inputs: Record<string, unknown>;
}

async function persistDraft(input: PersistDraftInput): Promise<string | null> {
  const [created] = await db
    .insert(aiWriterDraftsTable)
    .values({
      userId: input.userId,
      purpose: input.purpose,
      language: input.language,
      tone: input.tone,
      length: input.length,
      subject: input.subject.slice(0, 500),
      body: input.body.slice(0, 16_000),
      inputs: input.inputs,
    })
    .returning({ id: aiWriterDraftsTable.id });

  if (!created) return null;

  // Cap saved drafts per user — drop the oldest beyond the limit.
  // Pinned drafts are never counted against the cap and never trimmed.
  try {
    const recent = await db
      .select({ id: aiWriterDraftsTable.id, createdAt: aiWriterDraftsTable.createdAt })
      .from(aiWriterDraftsTable)
      .where(
        and(
          eq(aiWriterDraftsTable.userId, input.userId),
          eq(aiWriterDraftsTable.pinned, false),
        ),
      )
      .orderBy(desc(aiWriterDraftsTable.createdAt))
      .limit(DRAFTS_PER_USER_LIMIT + 50);

    if (recent.length > DRAFTS_PER_USER_LIMIT) {
      const stale = recent.slice(DRAFTS_PER_USER_LIMIT).map((r) => r.id);
      if (stale.length > 0) {
        await db
          .delete(aiWriterDraftsTable)
          .where(
            and(
              eq(aiWriterDraftsTable.userId, input.userId),
              eq(aiWriterDraftsTable.pinned, false),
              inArray(aiWriterDraftsTable.id, stale),
            ),
          );
      }
    }
  } catch (trimErr) {
    logger.warn({ err: trimErr }, "ai-writer: failed to trim old drafts");
  }

  return created.id;
}

function serializeDraft(d: typeof aiWriterDraftsTable.$inferSelect) {
  return {
    id: d.id,
    purpose: d.purpose,
    language: d.language,
    tone: d.tone,
    length: d.length,
    subject: d.subject,
    body: d.body,
    inputs: d.inputs,
    pinned: d.pinned,
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/ai-writer/drafts", async (req, res) => {
  try {
    const userId = await getOptionalUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "unauthenticated" });
    }

    const q = trimStr(req.query.q, 200);
    const purposeRaw = trimStr(req.query.purpose, 64);
    const purposeFilter =
      purposeRaw && (purposeRaw in PURPOSES) ? purposeRaw : "";

    const conditions: SQL[] = [eq(aiWriterDraftsTable.userId, userId)];
    if (purposeFilter) {
      conditions.push(eq(aiWriterDraftsTable.purpose, purposeFilter));
    }
    if (q) {
      // Escape SQL LIKE wildcards in the user-supplied search term.
      const escaped = q.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
      const pattern = `%${escaped}%`;
      const subjectOrBody = or(
        ilike(aiWriterDraftsTable.subject, pattern),
        ilike(aiWriterDraftsTable.body, pattern),
      );
      if (subjectOrBody) conditions.push(subjectOrBody);
    }

    const rows = await db
      .select()
      .from(aiWriterDraftsTable)
      .where(and(...conditions))
      .orderBy(desc(aiWriterDraftsTable.pinned), desc(aiWriterDraftsTable.createdAt))
      .limit(DRAFTS_PER_USER_LIMIT * 2);
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ drafts: rows.map(serializeDraft) });
  } catch (err) {
    logger.error({ err }, "GET /ai-writer/drafts failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.get("/ai-writer/drafts/:id", async (req, res) => {
  try {
    const userId = await getOptionalUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "unauthenticated" });
    }
    const id = String(req.params.id ?? "");
    const [row] = await db
      .select()
      .from(aiWriterDraftsTable)
      .where(
        and(eq(aiWriterDraftsTable.id, id), eq(aiWriterDraftsTable.userId, userId)),
      )
      .limit(1);
    if (!row) return res.status(404).json({ error: "not_found" });
    res.setHeader("Cache-Control", "private, no-store");
    return res.json({ draft: serializeDraft(row) });
  } catch (err) {
    logger.error({ err }, "GET /ai-writer/drafts/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

router.patch(
  "/ai-writer/drafts/:id",
  express.json({ limit: "4kb" }),
  async (req, res) => {
    try {
      const userId = await getOptionalUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "unauthenticated" });
      }
      const id = String(req.params.id ?? "");
      const pinned = (req.body as { pinned?: unknown } | undefined)?.pinned;
      if (typeof pinned !== "boolean") {
        return res.status(400).json({ error: "invalid_request" });
      }
      const [row] = await db
        .update(aiWriterDraftsTable)
        .set({ pinned })
        .where(
          and(eq(aiWriterDraftsTable.id, id), eq(aiWriterDraftsTable.userId, userId)),
        )
        .returning();
      if (!row) return res.status(404).json({ error: "not_found" });
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ draft: serializeDraft(row) });
    } catch (err) {
      logger.error({ err }, "PATCH /ai-writer/drafts/:id failed");
      return res.status(500).json({ error: "internal_error" });
    }
  },
);

router.delete("/ai-writer/drafts/:id", async (req, res) => {
  try {
    const userId = await getOptionalUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "unauthenticated" });
    }
    const id = String(req.params.id ?? "");
    const result = await db
      .delete(aiWriterDraftsTable)
      .where(
        and(eq(aiWriterDraftsTable.id, id), eq(aiWriterDraftsTable.userId, userId)),
      )
      .returning({ id: aiWriterDraftsTable.id });
    if (result.length === 0) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /ai-writer/drafts/:id failed");
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
