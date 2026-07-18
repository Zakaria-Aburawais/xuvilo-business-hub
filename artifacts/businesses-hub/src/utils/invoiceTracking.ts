import type { BusinessInfo, ClientInfo, DocumentTotals, LineItem } from "@/types/document";
import type { BankDetails } from "@/hooks/useDocumentForm";
import type { NumeralStyle } from "@/utils/numerals";

export type InvoiceTrackStatus = "sent" | "seen" | "confirmed" | "paid" | "overdue";

export interface InvoiceTrackEntry {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate?: string;
  status: InvoiceTrackStatus;
  createdAt: string;
  seenAt?: string;
  confirmedAt?: string;
  paidAt?: string;
  invoiceData: TrackedInvoiceData;
}

export interface TrackedInvoiceData {
  type: "invoice";
  businessInfo: BusinessInfo;
  clientInfo: ClientInfo;
  docNumber: string;
  issueDate: string;
  dueOrValidityDate: string;
  currency: string;
  lineItems: LineItem[];
  totals: DocumentTotals;
  notes: string;
  paymentDetails?: string;
  signatureFooter?: string;
  zatcaQR?: string;
  numeralStyle?: NumeralStyle;
  paymentLink?: string;
  paymentQR?: string;
  bankDetails?: BankDetails;
  template?: string;
}

const STORAGE_KEY = "businesseshub_invoices";

const CHARS = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";

export function generateInvoiceTrackId(): string {
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `INV-${id}`;
}

function loadAll(): Record<string, InvoiceTrackEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, InvoiceTrackEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full — ignore */
  }
}

export function saveTrackedInvoice(entry: InvoiceTrackEntry): void {
  const all = loadAll();
  all[entry.id] = entry;
  saveAll(all);
}

export function getTrackedInvoice(id: string): InvoiceTrackEntry | null {
  const all = loadAll();
  return all[id] ?? null;
}

export function getAllTrackedInvoices(): InvoiceTrackEntry[] {
  const all = loadAll();
  return Object.values(all).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updateInvoiceStatus(id: string, status: InvoiceTrackStatus): InvoiceTrackEntry | null {
  const all = loadAll();
  if (!all[id]) return null;
  const now = new Date().toISOString();
  all[id] = {
    ...all[id],
    status,
    ...(status === "seen"      ? { seenAt:      now } : {}),
    ...(status === "confirmed" ? { confirmedAt: now } : {}),
    ...(status === "paid"      ? { paidAt:      now } : {}),
  };
  saveAll(all);
  return all[id];
}

export function deleteTrackedInvoice(id: string): void {
  const all = loadAll();
  delete all[id];
  saveAll(all);
}

export function computeInvoiceStatus(entry: InvoiceTrackEntry): InvoiceTrackStatus {
  if (entry.status === "paid") return "paid";
  if (entry.status === "confirmed") return "confirmed";
  if (entry.dueDate && new Date(entry.dueDate) < new Date()) return "overdue";
  return entry.status;
}

export function buildShareUrl(id: string): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${window.location.origin}${base}/invoice/track/${id}`;
}
