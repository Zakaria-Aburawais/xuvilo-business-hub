import { getAuthToken } from "./billingApi";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    let code = "request_failed";
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") msg = data.message;
      if (data && typeof data.error === "string") code = data.error;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status: number; code: string };
    err.status = res.status;
    err.code = code;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ─── Settings (kv) ────────────────────────────────────────────────────── */

export interface UserSettings {
  [key: string]: string;
}
export async function getSettings(): Promise<UserSettings> {
  const r = await request<{ settings: UserSettings }>("GET", "/me/settings");
  return r.settings || {};
}
export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const r = await request<{ settings: UserSettings }>("PUT", "/me/settings", { settings: patch });
  return r.settings || {};
}

/* ─── Tasks ────────────────────────────────────────────────────────────── */

export interface UserTask {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null;
  status: string;
  priority: string;
  linkedEntityType: string;
  linkedEntityId: string;
  createdAt: string;
  updatedAt: string;
}
export async function listTasks(opts?: { status?: string; entity?: string; entityId?: string }): Promise<UserTask[]> {
  // Backwards-compatible param names for callers; server expects
  // linkedEntityType/linkedEntityId.
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.entity) params.set("linkedEntityType", opts.entity);
  if (opts?.entityId) params.set("linkedEntityId", opts.entityId);
  const qs = params.toString();
  const r = await request<{ tasks: UserTask[] }>("GET", `/me/tasks${qs ? `?${qs}` : ""}`);
  return r.tasks || [];
}
export async function updateTask(id: string, patch: Partial<UserTask>): Promise<UserTask> {
  const r = await request<{ task: UserTask }>("PATCH", `/me/tasks/${id}`, patch);
  return r.task;
}

/* ─── Activity ─────────────────────────────────────────────────────────── */

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  linkedEntityType: string;
  linkedEntityId: string;
  clientId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
export async function listActivity(opts?: { entity?: string; entityId?: string; clientId?: string; limit?: number }): Promise<ActivityEvent[]> {
  const params = new URLSearchParams();
  if (opts?.entity) params.set("linkedEntityType", opts.entity);
  if (opts?.entityId) params.set("linkedEntityId", opts.entityId);
  if (opts?.clientId) params.set("clientId", opts.clientId);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const r = await request<{ events: ActivityEvent[] }>("GET", `/me/activity${qs ? `?${qs}` : ""}`);
  return r.events || [];
}

/* ─── Files ────────────────────────────────────────────────────────────── */

export interface StoredFile {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  purpose: string;
  createdAt: string;
}
export async function uploadFileBase64(input: { filename: string; contentType: string; dataBase64: string; purpose?: string }): Promise<StoredFile> {
  const r = await request<{ file: StoredFile }>("POST", "/me/files/upload", input);
  return r.file;
}
export async function getFileDownloadUrl(id: string): Promise<string> {
  const r = await request<{ url: string }>("GET", `/me/files/${id}/download-url`);
  return r.url;
}

/* ─── RFQ Documents ────────────────────────────────────────────────────── */

export interface RfqLineItem {
  itemNumber?: number | string;
  description: string;
  quantity: number;
  unit: string;
  partNo?: string;
  manufacturer?: string;
  type?: string;
  category?: string;
  notes?: string;
  research?: {
    suggestedSuppliers?: { name: string; reason?: string }[];
    estimatedUnitCost?: number;
    estimatedCurrency?: string;
    confidence?: number;
    notes?: string;
    imageUrl?: string;
  };
}

export interface RfqResearchSupplier {
  name: string;
  type?: string;
  location?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  contact?: string;
  notes?: string;
}

export interface RfqResearchAlternative {
  manufacturer?: string;
  part_number?: string;
  name?: string;
  notes?: string;
}

export interface RfqResearchResult {
  product_name: string | null;
  product_description: string | null;
  manufacturer: string | null;
  part_number_confirmed: string | null;
  part_number_notes: string | null;
  image_url: string | null;
  image_source: string | null;
  image_confidence: string | null;
  image_search_query: string | null;
  product_page_url: string | null;
  datasheet_url: string | null;
  hs_code: string | null;
  estimated_price_usd: string | null;
  price_source: string | null;
  lead_time: string | null;
  technical_notes: string | null;
  available_locally: boolean | null;
  local_confidence: string | null;
  local_suppliers: RfqResearchSupplier[];
  international_suppliers: RfqResearchSupplier[];
  alternatives: RfqResearchAlternative[];
}

export interface RfqMatchedDbSupplier {
  id: string;
  name: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  specialties: string[];
  isLocal: boolean;
  notes: string;
  relevanceScore: number;
  matchedKeywords: string[];
}

export interface RfqResearchedItem {
  itemNumber?: number | string;
  description: string;
  quantity: number;
  unit: string;
  partNo?: string;
  manufacturer?: string;
  type?: string;
  detectedBrand?: string;
  categoryIcon?: string;
  research: RfqResearchResult;
  imageBadge?: { url: string | null; confidence: string; badge: string; source: string | null; icon?: string };
  matchedDbSuppliers?: RfqMatchedDbSupplier[];
  matchKeywords?: string[];
  error?: string;
}

export interface RfqDocument {
  id: string;
  rfqNumber: string;
  prNumber: string;
  clientId: string;
  detectedClientName: string;
  enquiryDate: string;
  closingDate: string;
  submissionEmail: string;
  submissionInstructions: string;
  paymentTerms: string;
  deliveryTerms: string;
  validityDays: number;
  currency: string;
  itemCount: number;
  parsedData: {
    items?: RfqLineItem[];
    rawText?: string;
    isScanned?: boolean;
    wasOcr?: boolean;
    extractionSource?: "pdftotext" | "pdfjs" | "ocr" | "empty";
    extractedTextLength?: number;
    [k: string]: unknown;
  };
  researchData: RfqResearchedItem[] | Record<string, unknown>;
  status: string;
  taskId: string;
  fileId: string;
  sourceFilename: string;
  createdAt: string;
  updatedAt: string;
}

export async function listRfqDocuments(): Promise<RfqDocument[]> {
  const r = await request<{ documents: RfqDocument[] }>("GET", "/me/rfq/documents");
  return r.documents || [];
}
export async function getRfqDocument(id: string): Promise<RfqDocument> {
  const r = await request<{ document: RfqDocument }>("GET", `/me/rfq/documents/${id}`);
  return r.document;
}
export async function uploadRfqPdf(input: { filename: string; dataBase64: string }): Promise<RfqDocument> {
  const r = await request<{ document: RfqDocument }>("POST", "/me/rfq/documents/upload", input);
  return r.document;
}
export async function analyzeRfqDocument(id: string): Promise<RfqDocument> {
  const r = await request<{ document: RfqDocument }>("POST", `/me/rfq/documents/${id}/analyze`);
  return r.document;
}
export async function updateRfqDocument(id: string, patch: Partial<RfqDocument>): Promise<RfqDocument> {
  const r = await request<{ document: RfqDocument }>("PATCH", `/me/rfq/documents/${id}`, patch);
  return r.document;
}
export async function deleteRfqDocument(id: string): Promise<void> {
  await request<{ ok: true }>("DELETE", `/me/rfq/documents/${id}`);
}
export async function getRfqDashboardStats(): Promise<{ pending: number; analyzed: number; quoted: number; overdue: number; nextDeadline?: string }> {
  return request("GET", "/me/rfq/dashboard-stats");
}
export async function testAnthropicKey(
  overrides?: { provider?: string; model?: string; apiKey?: string },
): Promise<{ ok: boolean; message?: string; provider?: string; model?: string }> {
  return request("POST", "/me/rfq/llm/test", overrides ?? {});
}

/* ─── Quotes ───────────────────────────────────────────────────────────── */

export interface RfqQuote {
  id: string;
  quoteNumber: string;
  rfqDocumentId: string;
  clientId: string;
  rfqReference: string;
  subject: string;
  quoteDate: string;
  validUntil: string;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    notes?: string;
  }>;
  commercialTerms: { paymentTerms?: string; deliveryTerms?: string; warranty?: string; notes?: string };
  signatureData: string;
  signatoryName: string;
  signatoryTitle: string;
  pdfFileId: string;
  emailSentAt: string | null;
  emailSentTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export async function listQuotes(): Promise<RfqQuote[]> {
  const r = await request<{ quotes: RfqQuote[] }>("GET", "/me/rfq/quotes");
  return r.quotes || [];
}
export async function getQuote(id: string): Promise<RfqQuote> {
  const r = await request<{ quote: RfqQuote }>("GET", `/me/rfq/quotes/${id}`);
  return r.quote;
}
export async function createQuote(input: Partial<RfqQuote>): Promise<RfqQuote> {
  const r = await request<{ quote: RfqQuote }>("POST", "/me/rfq/quotes", input);
  return r.quote;
}
export async function updateQuote(id: string, patch: Partial<RfqQuote>): Promise<RfqQuote> {
  const r = await request<{ quote: RfqQuote }>("PATCH", `/me/rfq/quotes/${id}`, patch);
  return r.quote;
}
export async function deleteQuote(id: string): Promise<void> {
  await request<{ ok: true }>("DELETE", `/me/rfq/quotes/${id}`);
}
export async function attachQuotePdf(id: string, input: { filename: string; dataBase64: string }): Promise<{ fileId: string }> {
  return request("POST", `/me/rfq/quotes/${id}/pdf`, input);
}
export async function sendQuoteEmail(id: string, input: { to: string; cc?: string; subject?: string; message?: string }): Promise<{ ok: true }> {
  return request("POST", `/me/rfq/quotes/${id}/send`, input);
}
export async function getQuotePdfUrl(id: string): Promise<string> {
  const r = await request<{ url: string }>("GET", `/me/rfq/quotes/${id}/pdf-url`);
  return r.url;
}

/* ─── Suppliers ────────────────────────────────────────────────────────── */

export interface RfqSupplier {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  specialties: string[];
  isLocal: boolean;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listSuppliers(): Promise<RfqSupplier[]> {
  const r = await request<{ suppliers: RfqSupplier[] }>("GET", "/me/rfq/suppliers");
  return r.suppliers || [];
}
export async function createSupplier(input: Partial<RfqSupplier>): Promise<RfqSupplier> {
  const r = await request<{ supplier: RfqSupplier }>("POST", "/me/rfq/suppliers", input);
  return r.supplier;
}
export async function updateSupplier(id: string, patch: Partial<RfqSupplier>): Promise<RfqSupplier> {
  const r = await request<{ supplier: RfqSupplier }>("PATCH", `/me/rfq/suppliers/${id}`, patch);
  return r.supplier;
}
export async function deleteSupplier(id: string): Promise<void> {
  await request<{ ok: true }>("DELETE", `/me/rfq/suppliers/${id}`);
}
export async function seedDefaultSuppliers(): Promise<{ inserted: number }> {
  return request("POST", "/me/rfq/suppliers/seed-defaults", {});
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result || "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = () => reject(new Error("file_read_failed"));
    r.readAsDataURL(file);
  });
}
