/**
 * AI-driven RFQ extractor. Uses Claude to read raw PDF text and return a
 * fully-structured ParsedRfq. This is the PRIMARY extraction path — the
 * heuristic parser is used only as a fallback when the user has no
 * Anthropic key configured or when the model fails.
 *
 * The model is instructed to act as a senior procurement officer and to
 * extract everything that matters: header fields, every line item with
 * full description / qty / unit / part number / manufacturer hint, plus
 * the submission instructions and commercial terms.
 */
import { logger } from "../logger";
import { callLlm } from "./llmClient";
import type { ParsedRfq, ParsedRfqItem } from "./rfqParser";

const MAX_TOKENS = 4096;
const MAX_PROMPT_CHARS = 60_000;

const EMPTY: ParsedRfq = {
  rfqNumber: "",
  prNumber: "",
  enquiryDate: "",
  closingDate: "",
  submissionEmail: "",
  submissionInstructions: "",
  paymentTerms: "",
  deliveryTerms: "",
  validityDays: 0,
  currency: "",
  detectedClientName: "",
  emails: [],
  phones: [],
  portalUrls: [],
  requirementTags: [],
  items: [],
};

const SYSTEM = `You are a senior procurement officer reviewing an inbound Request For Quotation (RFQ) for an oil & gas / construction trading company in Libya. You read the raw PDF text below and you must extract EVERY piece of information that matters for preparing a winning quote.

Be exhaustive. Do not skip items, even if formatting is messy. Wide tables often arrive as a single line of text — split them by item number anyway. If a field cannot be confidently extracted, return an empty string (or 0 for numeric fields) — never invent values.`;

const SCHEMA = `Return ONE JSON object and nothing else (no markdown fences, no commentary), with this EXACT shape:
{
  "rfqNumber": "string — the buyer's RFQ / enquiry / tender / requisition number (e.g. ZOC-265005-D, RFQ-2024-001)",
  "prNumber": "string — purchase request number if separate from RFQ number, otherwise empty",
  "enquiryDate": "string — date the RFQ was issued (any common format)",
  "closingDate": "string — submission deadline / closing date (any common format)",
  "submissionEmail": "string — the email address bids must be sent to",
  "submissionInstructions": "string — short summary of HOW to submit (max 500 chars)",
  "paymentTerms": "string — short summary of payment terms (max 500 chars)",
  "deliveryTerms": "string — short summary of delivery / Incoterms requirements (max 500 chars)",
  "validityDays": "number — how many days the quotation must remain valid (0 if not stated)",
  "currency": "string — required currency (USD, EUR, LYD, etc.) or empty",
  "detectedClientName": "string — the buying company name (e.g. Zueitina Oil Company)",
  "items": [
    {
      "itemNumber": "string — line number as shown in the RFQ",
      "description": "string — FULL item description as written, do not abbreviate",
      "partNo": "string — part / stock / catalog number if shown",
      "manufacturer": "string — manufacturer / origin / brand if shown",
      "unit": "string — unit of measure (EA, PCS, KG, M, L, BAG, SET, LOT, etc.)",
      "quantity": "number — quantity required (use 0 if not parseable)"
    }
  ],
  "requirementTags": ["array of short strings — special requirements detected (e.g. 'msds_required', 'oem_only', 'certificate_of_origin', 'bank_guarantee', '90_day_validity', 'no_alternatives')"]
}`;

interface AiExtractedRfq {
  rfqNumber?: string;
  prNumber?: string;
  enquiryDate?: string;
  closingDate?: string;
  submissionEmail?: string;
  submissionInstructions?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  validityDays?: number;
  currency?: string;
  detectedClientName?: string;
  items?: Array<Partial<ParsedRfqItem>>;
  requirementTags?: string[];
}

function parseJson(raw: string): AiExtractedRfq | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as AiExtractedRfq;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as AiExtractedRfq;
    } catch {
      return null;
    }
  }
}

function num(v: unknown, def = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return def;
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function normaliseItems(items: Array<Partial<ParsedRfqItem>> | undefined): ParsedRfqItem[] {
  if (!Array.isArray(items)) return [];
  const out: ParsedRfqItem[] = [];
  let idx = 0;
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const description = str(raw.description);
    if (!description) continue;
    idx++;
    out.push({
      itemNumber: str(raw.itemNumber) || String(idx),
      description: description.slice(0, 1000),
      partNo: str(raw.partNo).slice(0, 128),
      manufacturer: str(raw.manufacturer).slice(0, 128),
      unit: str(raw.unit).slice(0, 16).toUpperCase(),
      quantity: num(raw.quantity, 0),
    });
    if (out.length >= 200) break;
  }
  return out;
}

function getEmails(text: string): string[] {
  return Array.from(new Set(text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) ?? [])).slice(0, 20);
}
function getPhones(text: string): string[] {
  return Array.from(new Set(text.match(/\+?\d[\d\s\-().]{7,}\d/g) ?? [])).slice(0, 20);
}
function getUrls(text: string): string[] {
  return Array.from(new Set(text.match(/\bhttps?:\/\/[^\s<>"']+/gi) ?? [])).slice(0, 20);
}

/**
 * Extract a structured RFQ using whichever LLM provider the user picked
 * (Anthropic / OpenAI / Gemini / OpenRouter). Returns null when the user
 * has no key configured, the model returns nothing parseable, or the
 * call throws — callers should fall back to heuristic parsing on null.
 */
export async function extractRfqWithAi(
  userId: string,
  rawText: string,
): Promise<ParsedRfq | null> {
  const text = rawText.length > MAX_PROMPT_CHARS ? rawText.slice(0, MAX_PROMPT_CHARS) : rawText;
  if (!text.trim()) return { ...EMPTY };

  const userPrompt = [
    `RAW RFQ DOCUMENT TEXT (extracted from PDF — formatting may be messy):`,
    `<<<RFQ_TEXT_START>>>`,
    text,
    `<<<RFQ_TEXT_END>>>`,
    ``,
    SCHEMA,
  ].join("\n");

  const result = await callLlm({
    userId,
    system: SYSTEM,
    prompt: userPrompt,
    maxTokens: MAX_TOKENS,
  });
  if (!result.ok) return null;

  try {
    const content = result.text;
    const parsed = parseJson(content);
    if (!parsed) {
      logger.warn(
        { snippet: content.slice(0, 200), provider: result.config.provider, model: result.config.model },
        "rfq aiExtractor: invalid JSON",
      );
      return null;
    }

    const items = normaliseItems(parsed.items);
    const emails = getEmails(rawText);
    const submissionEmail = str(parsed.submissionEmail) || (emails[0] ?? "");

    return {
      rfqNumber: str(parsed.rfqNumber).slice(0, 128),
      prNumber: str(parsed.prNumber).slice(0, 128),
      enquiryDate: str(parsed.enquiryDate).slice(0, 64),
      closingDate: str(parsed.closingDate).slice(0, 64),
      submissionEmail: submissionEmail.slice(0, 320),
      submissionInstructions: str(parsed.submissionInstructions).slice(0, 2000),
      paymentTerms: str(parsed.paymentTerms).slice(0, 2000),
      deliveryTerms: str(parsed.deliveryTerms).slice(0, 2000),
      validityDays: num(parsed.validityDays, 0),
      currency: str(parsed.currency).slice(0, 8).toUpperCase(),
      detectedClientName: str(parsed.detectedClientName).slice(0, 255),
      emails,
      phones: getPhones(rawText),
      portalUrls: getUrls(rawText),
      requirementTags: Array.isArray(parsed.requirementTags)
        ? parsed.requirementTags.map(str).filter(Boolean).slice(0, 30)
        : [],
      items,
    };
  } catch (err) {
    logger.warn({ err }, "rfq aiExtractor: call failed");
    return null;
  }
}

/** Merge two ParsedRfqs, preferring non-empty values from `primary`. */
export function mergeParsedRfq(primary: ParsedRfq, fallback: ParsedRfq): ParsedRfq {
  const pick = (a: string, b: string): string => (a && a.trim() ? a : b);
  const pickN = (a: number, b: number): number => (a > 0 ? a : b);
  return {
    rfqNumber: pick(primary.rfqNumber, fallback.rfqNumber),
    prNumber: pick(primary.prNumber, fallback.prNumber),
    enquiryDate: pick(primary.enquiryDate, fallback.enquiryDate),
    closingDate: pick(primary.closingDate, fallback.closingDate),
    submissionEmail: pick(primary.submissionEmail, fallback.submissionEmail),
    submissionInstructions: pick(primary.submissionInstructions, fallback.submissionInstructions),
    paymentTerms: pick(primary.paymentTerms, fallback.paymentTerms),
    deliveryTerms: pick(primary.deliveryTerms, fallback.deliveryTerms),
    validityDays: pickN(primary.validityDays, fallback.validityDays),
    currency: pick(primary.currency, fallback.currency),
    detectedClientName: pick(primary.detectedClientName, fallback.detectedClientName),
    emails: primary.emails.length ? primary.emails : fallback.emails,
    phones: primary.phones.length ? primary.phones : fallback.phones,
    portalUrls: primary.portalUrls.length ? primary.portalUrls : fallback.portalUrls,
    requirementTags: primary.requirementTags.length ? primary.requirementTags : fallback.requirementTags,
    items: primary.items.length ? primary.items : fallback.items,
  };
}
