/**
 * Generic heuristic RFQ parser. Works on any company's RFQ format using
 * pattern matching only — never hardcoded for a specific client.
 */

export interface ParsedRfqItem {
  itemNumber: string;
  description: string;
  partNo: string;
  manufacturer: string;
  unit: string;
  quantity: number;
}

export interface ParsedRfq {
  rfqNumber: string;
  prNumber: string;
  enquiryDate: string;
  closingDate: string;
  submissionEmail: string;
  submissionInstructions: string;
  paymentTerms: string;
  deliveryTerms: string;
  validityDays: number;
  currency: string;
  detectedClientName: string;
  emails: string[];
  phones: string[];
  portalUrls: string[];
  requirementTags: string[];
  items: ParsedRfqItem[];
}

const REF_KEYWORDS = [
  "RFQ",
  "ENQUIRY NO",
  "ENQUIRY NUMBER",
  "REFERENCE",
  "REQUISITION NO",
  "PR NO",
  "PURCHASE REQUEST",
  "TENDER NO",
  "BID NO",
  "ITT NO",
  "RFP NO",
];

const REF_PATTERNS: RegExp[] = [
  /\b(ZOC-\d{4,8}-[A-Z0-9]{1,4})\b/i,
  /\b(RFQ[-/_ ]?\d{3,8})\b/i,
  /\b(ENQ[-/_ ]?\d{3,8})\b/i,
  /\b(PR[-/_ ]?\d{3,8})\b/i,
  /\b(NOC[-/_ ]?\d{3,8})\b/i,
  /\b(\d{3,5}\/\d{3,5}\/\d{2,5})\b/,
  /\b([A-Z]{2,5}-\d{3,8}(?:-[A-Z0-9]{1,5})?)\b/,
];

const PR_PATTERNS: RegExp[] = [
  /\b(ZUE-PR-\d{3,8})\b/i,
  /\b(PR-\d{3,8})\b/i,
  /\b(PURCHASE\s+REQUEST[:\s#]*(\S+))\b/i,
];

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /\+?\d[\d\s\-().]{7,}\d/g;
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;

const UNITS = new Set([
  "EA",
  "NO",
  "NOS",
  "PCS",
  "BAG",
  "KG",
  "MTR",
  "M",
  "L",
  "GAL",
  "SET",
  "LOT",
  "BOX",
  "DRUM",
  "ROLL",
  "CN",
  "TON",
  "MT",
  "EACH",
]);

/** Build a tiny window of text around `keyword` for keyword-anchored extraction. */
function windowAround(text: string, keyword: string, span = 80): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return "";
  const start = Math.max(0, idx);
  return text.slice(start, idx + keyword.length + span);
}

function findRefNear(text: string, keywords: string[], patterns: RegExp[]): string {
  const upper = text.toUpperCase();
  for (const kw of keywords) {
    const win = windowAround(upper, kw, 60);
    for (const p of patterns) {
      const m = win.match(p);
      if (m && m[1]) return m[1].trim();
    }
  }
  for (const p of patterns) {
    const m = upper.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}

const DATE_PATTERNS: RegExp[] = [
  /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
  /\b(\d{4}-\d{2}-\d{2})\b/,
  /\b(\d{1,2}[\s-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*[\s-]\d{2,4})\b/i,
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{2,4})\b/i,
];

function findDateNear(text: string, anchors: string[]): string {
  for (const a of anchors) {
    const win = windowAround(text, a, 100);
    for (const p of DATE_PATTERNS) {
      const m = win.match(p);
      if (m && m[1]) return m[1];
    }
  }
  return "";
}

const REQUIREMENT_RULES: { tag: string; matcher: RegExp }[] = [
  { tag: "validity_required", matcher: /\bvalid(?:ity)?\b.*\b(\d+)\s*days?\b/i },
  { tag: "payment_terms_specified", matcher: /\bpayment\s+terms?\b/i },
  { tag: "delivery_terms_specified", matcher: /\b(delivery\s+terms?|incoterms?|FOB|CIF|DAP|DDP|EXW)\b/i },
  { tag: "certificate_of_origin", matcher: /\bcertificate\s+of\s+origin\b/i },
  { tag: "msds_required", matcher: /\b(msds|safety\s+data\s+sheets?)\b/i },
  { tag: "warranty_required", matcher: /\bwarrant(y|ies)\b/i },
  { tag: "bank_guarantee", matcher: /\bbank\s+guarantee\b/i },
  { tag: "liquidated_damages", matcher: /\bliquidated\s+damages?\b/i },
  { tag: "sealed_envelope", matcher: /\bsealed\s+envelope\b/i },
  { tag: "inspection_rights", matcher: /\binspect(?:ion)?\s+rights?\b/i },
  { tag: "oem_only", matcher: /\b(OEM\s+only|new\s+materials?\s+only|brand\s+new)\b/i },
  { tag: "alternatives_welcome", matcher: /\balternatives?\s+(welcome|accepted|considered)\b/i },
];

function detectRequirements(text: string): string[] {
  const tags: string[] = [];
  for (const rule of REQUIREMENT_RULES) {
    if (rule.matcher.test(text)) tags.push(rule.tag);
  }
  return tags;
}

function detectValidityDays(text: string): number {
  const m = text.match(/\bvalid(?:ity)?\b[^\n]{0,80}?(\d{1,3})\s*days?\b/i);
  return m && m[1] ? Number(m[1]) : 0;
}

function detectCurrency(text: string): string {
  const m = text.match(/\b(USD|EUR|LYD|GBP|AED|TRY|SAR)\b/);
  return m ? m[1]! : "";
}

function detectSubmissionEmail(text: string, allEmails: string[]): string {
  if (allEmails.length === 0) return "";
  const phrases = [
    /submit (?:to|your offer to|quotation to)\s*[:\-]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i,
    /send (?:to|your quote to|offer to)\s*[:\-]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i,
    /email (?:your offer to|quote to|to)\s*[:\-]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i,
    /quotation to be sent to\s*[:\-]?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i,
  ];
  for (const p of phrases) {
    const m = text.match(p);
    if (m && m[1]) return m[1];
  }
  return allEmails[0]!;
}

function detectClientName(text: string): string {
  // Look at the first ~600 chars and pick the longest line that looks
  // like a company name (UPPERCASE block, has "Co" / "Ltd" / "Company" /
  // "Corporation" / "Inc"). Conservative on purpose.
  const head = text.slice(0, 600);
  const lines = head.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let best = "";
  for (const line of lines) {
    if (line.length < 4 || line.length > 100) continue;
    if (/(company|corporation|co\.?\s*$|ltd\.?$|inc\.?$|llc$|gmbh$|s\.?a\.?$)/i.test(line)) {
      if (line.length > best.length) best = line;
    } else if (line === line.toUpperCase() && /[A-Z]{4}/.test(line)) {
      if (line.length > best.length) best = line;
    }
  }
  return best;
}

/**
 * pdfjs frequently collapses table layouts to a single long line, so a
 * naive `[^\n]{3,160}` after a label like "Payment terms:" will swallow
 * the entire downstream items table. We trim aggressively at the next
 * ALL-CAPS label (DELIVERY, VALIDITY, QTY, UNIT, DESCRIPTION, BANK, …)
 * or after the first sentence, whichever comes first.
 */
const NEXT_LABEL_RE =
  /\s+(DELIVERY|VALIDITY|CURRENCY|QTY|QUANTITY|UNIT|DESCRIPTION|STOCK\s+ITEM|PART\s+NO|MANUFACTURER|MAKE|ORIGIN|BANK|WARRANTY|GUARANTEE|SIGNATURE|STAMP|CLOSING|SUBMISSION|TENDER|REQUISITION|PAYMENT)\b/;

function trimAtNextLabel(s: string, max = 160): string {
  let out = s.slice(0, max);
  const m = out.match(NEXT_LABEL_RE);
  if (m && typeof m.index === "number") out = out.slice(0, m.index);
  // Stop at the first sentence end if there is one within the first 120 chars.
  const dot = out.search(/[.;]\s+[A-Z]/);
  if (dot > 0 && dot < 120) out = out.slice(0, dot + 1);
  return out.trim();
}

function detectPaymentTerms(text: string): string {
  const m = text.match(/payment\s+terms?\s*[:\-]?\s*([^\n]{3,200})/i);
  return m && m[1] ? trimAtNextLabel(m[1], 140) : "";
}

function detectDeliveryTerms(text: string): string {
  const m = text.match(/(?:delivery\s+terms?|incoterms?)\s*[:\-]?\s*([^\n]{3,200})/i);
  return m && m[1] ? trimAtNextLabel(m[1], 140) : "";
}

function detectSubmissionInstructions(text: string): string {
  const m = text.match(/(?:submission instructions?|how to (?:submit|respond))\s*[:\-]?\s*([^\n]{3,300})/i);
  return m && m[1] ? trimAtNextLabel(m[1], 220) : "";
}

const ITEM_HEADER_TOKENS = [
  "DESCRIPTION",
  "QTY",
  "QUANTITY",
  "UNIT",
  "PART NO",
  "PART NUMBER",
  "STOCK ITEM",
  "MANUFACTURER",
  "MAKE",
  "ORIGIN",
];

function looksLikeHeaderLine(line: string): boolean {
  const upper = line.toUpperCase();
  let hits = 0;
  for (const tok of ITEM_HEADER_TOKENS) {
    if (upper.includes(tok)) hits++;
  }
  return hits >= 2;
}

const PART_PATTERNS = [
  /\b\d{4}-\d{4,6}\b/,
  /\b[A-Z]{2,5}-[A-Z0-9]{2,8}-[A-Z0-9]{2,8}\b/,
  /\b\d{3,4}-\d{3,5}\b/,
  /\b[A-Z]{2,4}\d{4,8}\b/,
];

function extractPartNo(text: string): string {
  for (const p of PART_PATTERNS) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return "";
}

function extractUnit(tokens: string[]): string {
  for (const t of tokens) {
    if (UNITS.has(t.toUpperCase())) return t.toUpperCase();
  }
  return "";
}

function extractQty(tokens: string[]): number {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]!.replace(/,/g, "");
    if (/^\d+(?:\.\d+)?$/.test(t)) {
      const n = Number(t);
      if (n > 0 && n < 1_000_000) return n;
    }
  }
  return 0;
}

function parseItems(text: string): ParsedRfqItem[] {
  const lines = text.split(/\n/);
  const items: ParsedRfqItem[] = [];
  let inTable = false;
  let itemIdx = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (looksLikeHeaderLine(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    // End of table heuristic: terms blocks
    if (/^(terms|conditions|payment terms|delivery|signed|signature|stamp)\b/i.test(line)) {
      inTable = false;
      continue;
    }
    // Lines starting with a digit or "Item N" are likely item rows
    if (!/^(\d+[.\)]?|item\s*\d+)/i.test(line)) continue;
    const desc = line.replace(/^\d+[.\)]?\s*/, "").slice(0, 1000);
    // Skip preamble / instruction / boilerplate lines.
    if (PREAMBLE_PREFIX_RE.test(desc)) continue;
    if (!looksLikeRealItem(desc)) continue;
    itemIdx++;
    const tokens = line.split(/\s+/);
    const partNo = extractPartNo(line);
    const unit = extractUnit(tokens);
    const qty = extractQty(tokens);
    items.push({
      itemNumber: String(itemIdx),
      description: desc,
      partNo,
      manufacturer: "",
      unit,
      quantity: qty,
    });
    if (items.length >= 200) break;
  }
  if (items.length > 0) return items;
  // Fallback: pdfjs frequently collapses a wide tabular layout into a
  // single very long line. Try to split it on inline item-number markers.
  return parseItemsFlat(text);
}

/**
 * Phrases that commonly start preamble / instruction blocks rather than
 * real item rows. If a candidate's first words match one of these, we
 * skip it.
 */
const PREAMBLE_PREFIX_RE =
  /^(please\b|kindly\b|note\b|nb\b|n\.?b\.?\b|important\b|all\s+bids?\b|all\s+offers?\b|bidders?\b|quotations?\s+must\b|the\s+supplier\b|the\s+vendor\b|the\s+bidder\b|tenderers?\b|offerors?\b|prices?\s+must\b|quotation(?:s)?\s+shall\b|delivery\s+(?:date|location|address|time)\b|validity\b|payment\s+terms?\b|warranty\b|incoterms?\b|fob\b|cif\b|bank\s+guarantee\b|certificate\s+of\s+origin\b|terms?\s+(?:and|&)\s+conditions?\b)/i;

/** True if the candidate looks like a real item line (has qty, unit, or part-no signal). */
function looksLikeRealItem(desc: string): boolean {
  const tokens = desc.split(/\s+/);
  const hasUnit = tokens.some((t) => UNITS.has(t.toUpperCase()));
  const hasPartNo = !!extractPartNo(desc);
  const hasQty = /\b\d{1,5}(?:\.\d+)?\s*(EA|NO|NOS|PCS|BAG|KG|MTR|M|L|GAL|SET|LOT|BOX|DRUM|ROLL|TON|MT|EACH)\b/i.test(desc);
  // Or a manufacturer / brand-y all-caps token of 2+ chars.
  const hasBrand = /\b[A-Z][A-Z0-9]{2,}\b/.test(desc);
  return hasUnit || hasPartNo || hasQty || hasBrand;
}

/**
 * Fallback parser for the case where pdfjs returns the entire item
 * table on a single line. We split the text on inline `\b\d+[.)]\s` /
 * `\bItem \d+` markers and treat each chunk as an item description.
 */
function parseItemsFlat(text: string): ParsedRfqItem[] {
  const blob = text.replace(/\s+/g, " ").trim();
  if (blob.length < 30) return [];
  // Capture each (number)(description-up-to-next-number) span.
  const re = /(?:^|[^\w])(\d{1,3})[.)]\s+([A-Za-z][^]{8,400}?)(?=(?:\s\d{1,3}[.)]\s+[A-Za-z])|$)/g;
  const items: ParsedRfqItem[] = [];
  let lastSeenNumber = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blob)) !== null) {
    const n = Number(m[1]!);
    if (!Number.isFinite(n) || n < 1 || n > 999) continue;
    // Numbers must roughly increment — guards against catching dates / qty.
    if (n < lastSeenNumber - 5) continue;
    lastSeenNumber = n;
    const desc = m[2]!.trim().slice(0, 600);
    if (!desc) continue;
    // Skip preamble / instruction / boilerplate lines.
    if (PREAMBLE_PREFIX_RE.test(desc)) continue;
    // Skip lines with no item-like signal (no unit, no part no, no qty, no brand).
    if (!looksLikeRealItem(desc)) continue;
    lastSeenNumber = n;
    const tokens = desc.split(/\s+/);
    items.push({
      itemNumber: String(n),
      description: desc,
      partNo: extractPartNo(desc),
      manufacturer: "",
      unit: extractUnit(tokens),
      quantity: extractQty(tokens),
    });
    if (items.length >= 200) break;
  }
  return items;
}

/** Run the full heuristic parse on extracted PDF text. */
export function parseRfqText(text: string): ParsedRfq {
  const emails = Array.from(new Set(text.match(EMAIL_RE) ?? []));
  const phones = Array.from(new Set(text.match(PHONE_RE) ?? [])).slice(0, 20);
  const portalUrls = Array.from(new Set(text.match(URL_RE) ?? [])).slice(0, 20);
  return {
    rfqNumber: findRefNear(text, REF_KEYWORDS, REF_PATTERNS),
    prNumber: findRefNear(text, ["PR NO", "PURCHASE REQUEST", "REQUISITION NO"], PR_PATTERNS),
    enquiryDate: findDateNear(text, ["enquiry date", "issued", "dated", "date of issue", "date"]),
    closingDate: findDateNear(text, ["closing", "deadline", "submission date", "due date", "respond by", "valid until", "closing date"]),
    submissionEmail: detectSubmissionEmail(text, emails),
    submissionInstructions: detectSubmissionInstructions(text),
    paymentTerms: detectPaymentTerms(text),
    deliveryTerms: detectDeliveryTerms(text),
    validityDays: detectValidityDays(text),
    currency: detectCurrency(text),
    detectedClientName: detectClientName(text),
    emails,
    phones,
    portalUrls,
    requirementTags: detectRequirements(text),
    items: parseItems(text),
  };
}
