import type { LineItem } from "@/types/document";
import { generateId } from "@/lib/calculations";

const HEADERS = ["description", "quantity", "unit_price", "discount_pct", "tax_pct"] as const;

function escapeCell(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function lineItemsToCsv(items: LineItem[]): string {
  const header = HEADERS.join(",");
  const rows = items.map((it) =>
    [
      escapeCell(it.description ?? ""),
      escapeCell(it.quantity ?? 0),
      escapeCell(it.unitPrice ?? 0),
      escapeCell(it.discountPct ?? 0),
      escapeCell(it.taxPct ?? 0),
    ].join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

/** Parse a single CSV line, supporting quoted fields and escaped quotes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/** Map common column-name variants users might bring in from spreadsheets. */
const ALIASES: Record<string, typeof HEADERS[number]> = {
  description: "description", item: "description", name: "description", product: "description", desc: "description",
  quantity: "quantity", qty: "quantity", q: "quantity", count: "quantity",
  unit_price: "unit_price", price: "unit_price", rate: "unit_price", unitprice: "unit_price",
  discount_pct: "discount_pct", discount: "discount_pct", discount_percent: "discount_pct", disc: "discount_pct",
  tax_pct: "tax_pct", tax: "tax_pct", vat: "tax_pct", vat_pct: "tax_pct", tax_percent: "tax_pct",
};

function num(v: string | undefined): number {
  if (v == null) return 0;
  const t = v.trim();
  if (!t) return 0;
  const n = parseFloat(t.replace(/,/g, ""));
  return isFinite(n) ? n : 0;
}

export interface CsvImportResult {
  items: LineItem[];
  errors: string[];
}

// Generous but finite caps. A real invoice with thousands of line items is
// almost certainly a wrong file; refusing to parse it keeps the UI responsive
// instead of locking the browser tab.
const MAX_BYTES = 1_000_000; // 1 MB
const MAX_ROWS = 1000;

/**
 * Parse a CSV string into LineItem[]. Tolerant of header variations and BOM.
 * Returns the parsed items plus a list of human-readable warnings.
 */
export function csvToLineItems(csv: string): CsvImportResult {
  const errors: string[] = [];
  if (!csv) return { items: [], errors: ["Empty file."] };

  if (csv.length > MAX_BYTES) {
    return { items: [], errors: [`File is too large (max ${Math.round(MAX_BYTES / 1024)} KB).`] };
  }

  const cleaned = csv.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!cleaned) return { items: [], errors: ["Empty file."] };

  const lines = cleaned.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { items: [], errors: ["No rows found."] };
  if (lines.length - 1 > MAX_ROWS) {
    return { items: [], errors: [`Too many rows (max ${MAX_ROWS}). Split the file into smaller imports.`] };
  }

  const headerCells = parseCsvLine(lines[0]!).map(normaliseHeader);
  const colIndex: Partial<Record<typeof HEADERS[number], number>> = {};
  headerCells.forEach((h, i) => {
    const key = ALIASES[h];
    if (key && colIndex[key] === undefined) colIndex[key] = i;
  });

  if (colIndex.description === undefined) {
    errors.push("Missing a 'description' column. Expected columns: description, quantity, unit_price, discount_pct, tax_pct.");
    return { items: [], errors };
  }

  const items: LineItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const description = (cells[colIndex.description!] ?? "").trim();
    if (!description) continue;
    items.push({
      id: generateId(),
      description,
      quantity: colIndex.quantity !== undefined ? num(cells[colIndex.quantity]) : 1,
      unitPrice: colIndex.unit_price !== undefined ? num(cells[colIndex.unit_price]) : 0,
      discountPct: colIndex.discount_pct !== undefined ? num(cells[colIndex.discount_pct]) : 0,
      taxPct: colIndex.tax_pct !== undefined ? num(cells[colIndex.tax_pct]) : 0,
    });
  }

  if (items.length === 0) errors.push("No valid rows found (every row needs a description).");
  return { items, errors };
}

/* ── Generic table helpers (clients, products, documents) ──────────────────── */

/** Serialize rows to CSV using an ordered column spec. */
export function rowsToCsv<T>(
  rows: T[],
  columns: { key: string; get: (row: T) => string | number }[],
): string {
  const header = columns.map((c) => c.key).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCell(c.get(r))).join(","));
  return [header, ...body].join("\n") + "\n";
}

export interface ParsedCsvTable {
  /** Normalised header names (lowercase, snake_case). */
  headers: string[];
  /** Each row as a record keyed by normalised header. */
  rows: Record<string, string>[];
  errors: string[];
}

/**
 * Parse a CSV string into header-keyed records. Tolerant of BOM and CRLF.
 * Applies the same size caps as line-item import.
 */
export function parseCsvTable(csv: string): ParsedCsvTable {
  if (!csv) return { headers: [], rows: [], errors: ["Empty file."] };
  if (csv.length > MAX_BYTES) {
    return { headers: [], rows: [], errors: [`File is too large (max ${Math.round(MAX_BYTES / 1024)} KB).`] };
  }
  const cleaned = csv.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!cleaned) return { headers: [], rows: [], errors: ["Empty file."] };
  const lines = cleaned.split("\n").filter((l) => l.length > 0);
  if (lines.length < 2) return { headers: [], rows: [], errors: ["No data rows found (need a header row plus at least one row)."] };
  if (lines.length - 1 > MAX_ROWS) {
    return { headers: [], rows: [], errors: [`Too many rows (max ${MAX_ROWS}). Split the file into smaller imports.`] };
  }
  const headers = parseCsvLine(lines[0]!).map(normaliseHeader);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => { if (h) rec[h] = (cells[idx] ?? "").trim(); });
    rows.push(rec);
  }
  return { headers, rows, errors: [] };
}

/** Pick the first non-empty value among alias column names. */
export function pickField(rec: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const v = rec[a];
    if (v != null && v !== "") return v;
  }
  return "";
}

export function pickNumber(rec: Record<string, string>, aliases: string[]): number {
  return num(pickField(rec, aliases));
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend a UTF-8 BOM so Excel on Windows detects the encoding and renders
  // Arabic (and other non-ASCII) text correctly instead of as mojibake.
  const body = csv.startsWith("\uFEFF") ? csv : "\uFEFF" + csv;
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
