// CSV parsing + analysis for the admin newsletter subscriber import.
//
// The goal is a safe-by-default import flow: the admin always sees a preview
// where every row is classified before anything is sent to the server, and
// the server re-validates everything anyway (client analysis is UX, not
// security).

export type CsvRowStatus = "valid" | "suspicious" | "invalid" | "duplicate";

export interface CsvRowAnalysis {
  /** 1-based line number in the original file (after the header, if any). */
  line: number;
  /** The raw email cell as it appeared in the file. */
  raw: string;
  /** Normalized email (trimmed, lowercased) — empty when unparsable. */
  email: string;
  status: CsvRowStatus;
  /** Human-readable reason for non-valid rows (English; UI localizes). */
  reason?: string;
}

export interface CsvAnalysis {
  rows: CsvRowAnalysis[];
  hadHeader: boolean;
  /** Index of the column emails were read from. */
  emailColumn: number;
  counts: Record<CsvRowStatus, number>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Minimal RFC-4180-style CSV parser: handles quoted cells, escaped quotes
 * (""), commas and newlines inside quotes, and both \n and \r\n line ends.
 * Semicolon-separated files (common from Arabic-locale Excel) are detected
 * and split on ";" instead.
 */
export function parseCsv(text: string): string[][] {
  // Strip a UTF-8 BOM if present (Excel adds one).
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  // Delimiter sniffing on the first non-empty line: if it has semicolons
  // but no commas, treat it as semicolon-separated.
  const firstLine = src.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const delim = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop rows that are entirely empty.
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

/** Role/system mailbox prefixes that usually don't belong on a marketing list. */
const ROLE_PREFIXES = new Set([
  "admin", "administrator", "info", "contact", "support", "sales", "office",
  "mail", "email", "help", "hello", "team", "billing", "accounts", "hr",
  "noreply", "no-reply", "donotreply", "do-not-reply", "postmaster",
  "webmaster", "hostmaster", "abuse", "root", "marketing", "newsletter",
  "test", "demo",
]);

/** Well-known disposable / placeholder domains. */
const SUSPICIOUS_DOMAINS = [
  "example.com", "example.org", "example.net", "test.com", "email.com",
  "mailinator.com", "guerrillamail.com", "sharklasers.com", "yopmail.com",
  "10minutemail.com", "tempmail.com", "temp-mail.org", "trashmail.com",
  "getnada.com", "dispostable.com", "fakeinbox.com", "maildrop.cc",
];

function classifyEmail(email: string): { suspicious: boolean; reason?: string } {
  const [local = "", domain = ""] = email.split("@");
  if (ROLE_PREFIXES.has(local)) {
    return { suspicious: true, reason: "Role/system mailbox (e.g. info@, noreply@)" };
  }
  if (SUSPICIOUS_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return { suspicious: true, reason: "Disposable or placeholder domain" };
  }
  if (local.length > 40) {
    return { suspicious: true, reason: "Unusually long address" };
  }
  if (/(.)\1{5,}/.test(local) || /^(asdf|qwer|zxcv|aaaa|1234)/.test(local)) {
    return { suspicious: true, reason: "Looks like keyboard mashing" };
  }
  return { suspicious: false };
}

/** Pick the column that holds emails: by header name first, else by content. */
function detectEmailColumn(rows: string[][]): { column: number; hadHeader: boolean } {
  const header = rows[0] ?? [];
  const headerIdx = header.findIndex((c) =>
    /^(e-?mail|email address|البريد|البريد الإلكتروني)$/i.test(c.trim()),
  );
  if (headerIdx !== -1) return { column: headerIdx, hadHeader: true };

  // Content-based: for each column, count email-looking cells in the first
  // 50 rows; take the best column.
  const sample = rows.slice(0, 50);
  const width = Math.max(...sample.map((r) => r.length));
  let best = 0;
  let bestHits = -1;
  for (let c = 0; c < width; c++) {
    const hits = sample.filter((r) => EMAIL_RE.test((r[c] ?? "").trim())).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = c;
    }
  }
  // If the chosen column's first cell isn't an email, treat it as a header.
  const hadHeader = !EMAIL_RE.test((rows[0]?.[best] ?? "").trim());
  return { column: best, hadHeader };
}

export function analyzeSubscriberCsv(text: string): CsvAnalysis {
  const parsed = parseCsv(text);
  const counts: Record<CsvRowStatus, number> = {
    valid: 0,
    suspicious: 0,
    invalid: 0,
    duplicate: 0,
  };
  if (parsed.length === 0) {
    return { rows: [], hadHeader: false, emailColumn: 0, counts };
  }

  const { column, hadHeader } = detectEmailColumn(parsed);
  const dataRows = hadHeader ? parsed.slice(1) : parsed;
  const offset = hadHeader ? 2 : 1;

  const seen = new Set<string>();
  const rows: CsvRowAnalysis[] = dataRows.map((r, i) => {
    const raw = (r[column] ?? "").trim();
    const email = raw.toLowerCase();
    const line = i + offset;
    if (!raw || !EMAIL_RE.test(email) || email.length > 320) {
      counts.invalid++;
      return {
        line, raw, email: "", status: "invalid" as const,
        reason: raw ? "Not a valid email address" : "Empty email cell",
      };
    }
    if (seen.has(email)) {
      counts.duplicate++;
      return {
        line, raw, email, status: "duplicate" as const,
        reason: "Appears earlier in this file",
      };
    }
    seen.add(email);
    const { suspicious, reason } = classifyEmail(email);
    if (suspicious) {
      counts.suspicious++;
      return { line, raw, email, status: "suspicious" as const, reason };
    }
    counts.valid++;
    return { line, raw, email, status: "valid" as const };
  });

  return { rows, hadHeader, emailColumn: column, counts };
}
