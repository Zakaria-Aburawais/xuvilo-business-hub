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
    let msg = `Request failed with status ${res.status}`;
    let code = "request_failed";
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") msg = data.message;
      if (data && typeof data.error === "string") code = data.error;
      const err: ApiError = Object.assign(new Error(msg), { status: res.status, code, payload: data });
      throw err;
    } catch (e) {
      if (e instanceof Error && (e as ApiError).status) throw e;
      const err: ApiError = Object.assign(new Error(msg), { status: res.status, code });
      throw err;
    }
  }
  return res.json() as Promise<T>;
}

export interface ApiError extends Error {
  status: number;
  code: string;
  payload?: unknown;
}

// Spec §7 statuses across all three doc types. The UI scopes which
// statuses are valid for which document type; the API accepts the union.
export type DocStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"
  | "accepted"
  | "rejected"
  | "expired"
  | "issued"
  | "void";
export type DocType = "invoice" | "quotation" | "receipt";

/** Statuses valid per document type (used by the doc tools' status select). */
export const STATUSES_BY_TYPE: Record<DocType, DocStatus[]> = {
  invoice: ["draft", "sent", "paid", "overdue", "cancelled"],
  quotation: ["draft", "sent", "accepted", "rejected", "expired"],
  receipt: ["issued", "void"],
};

export interface SavedDoc {
  id: string;
  type: DocType;
  title: string;
  clientName: string;
  amount: number;
  currency: string;
  status: DocStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  lastEditedAt: string;
}

export interface SavedClient {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  notes: string;
  shortCode?: string;
  rfqFormatNotes?: string;
  submissionEmail?: string;
  specialRequirements?: string;
  industry?: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  /** Logo as data URL (image/* base64). Empty string means no logo. */
  logoData: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxOrVatNumber: string;
  registrationNumber: string;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultPaymentTerms: string;
  defaultNotes: string;
  createdAt: string;
  updatedAt: string;
}

/** Input shape accepted by saveCompanyProfile (server upserts). */
export type CompanyProfileInput = Partial<Omit<CompanyProfile, "id" | "createdAt" | "updatedAt">> & {
  companyName: string;
};

export interface UsageInfo {
  period: string; // "YYYY-MM"
  tier: string;
  documentsCreated: number;
  limit: number | null;
  remaining: number | null;
  blocked: boolean;
}

/* ─── Documents ────────────────────────────────────────────────────────── */
export interface ListDocumentsOptions {
  type?: DocType;
  status?: DocStatus;
  search?: string;
  /** ISO date string. lastEditedAt >= dateFrom. */
  dateFrom?: string;
  /** ISO date string. lastEditedAt <= dateTo. */
  dateTo?: string;
  sort?: "newest" | "oldest";
  limit?: number;
  offset?: number;
}

export interface ListDocumentsResult {
  documents: SavedDoc[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * List the signed-in user's saved documents. Without args returns the most
 * recently edited 50. With args, applies server-side filters/pagination.
 *
 * Backwards-compat: callers that previously did `await listDocuments()` and
 * expected an array of docs continue to work because the result is also
 * array-iterable via `.documents`. Update sites passing options receive
 * the full envelope.
 */
export async function listDocuments(): Promise<SavedDoc[]>;
export async function listDocuments(opts: ListDocumentsOptions): Promise<ListDocumentsResult>;
export async function listDocuments(opts?: ListDocumentsOptions): Promise<SavedDoc[] | ListDocumentsResult> {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.dateFrom) params.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) params.set("dateTo", opts.dateTo);
  if (opts?.sort) params.set("sort", opts.sort);
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  if (typeof opts?.offset === "number") params.set("offset", String(opts.offset));
  const qs = params.toString();
  const r = await request<{ documents: SavedDoc[]; total?: number; limit?: number; offset?: number }>(
    "GET",
    `/me/documents${qs ? `?${qs}` : ""}`,
  );
  if (!opts) return r.documents;
  return {
    documents: r.documents,
    total: r.total ?? r.documents.length,
    limit: r.limit ?? r.documents.length,
    offset: r.offset ?? 0,
  };
}

export async function getDocument(id: string): Promise<SavedDoc> {
  const r = await request<{ document: SavedDoc }>("GET", `/me/documents/${id}`);
  return r.document;
}
export async function createDocument(input: {
  type: DocType;
  title?: string;
  clientName?: string;
  amount?: number;
  currency?: string;
  status?: DocStatus;
  payload?: Record<string, unknown>;
}): Promise<SavedDoc> {
  const r = await request<{ document: SavedDoc }>("POST", "/me/documents", input);
  return r.document;
}
export async function updateDocument(id: string, input: Partial<Omit<SavedDoc, "id" | "createdAt" | "lastEditedAt">>): Promise<SavedDoc> {
  const r = await request<{ document: SavedDoc }>("PATCH", `/me/documents/${id}`, input);
  return r.document;
}
export async function deleteDocument(id: string): Promise<void> {
  await request<{ ok: true }>("DELETE", `/me/documents/${id}`);
}
export async function duplicateDocument(id: string): Promise<SavedDoc> {
  const r = await request<{ document: SavedDoc }>("POST", `/me/documents/${id}/duplicate`);
  return r.document;
}

/* ─── Clients ──────────────────────────────────────────────────────────── */
export async function listClients(): Promise<SavedClient[]> {
  const r = await request<{ clients: SavedClient[] }>("GET", "/me/clients");
  return r.clients;
}
export async function createClient(input: Partial<Omit<SavedClient, "id" | "documentCount" | "createdAt" | "updatedAt">> & { name: string }): Promise<SavedClient> {
  const r = await request<{ client: SavedClient }>("POST", "/me/clients", input);
  return r.client;
}
export async function bulkCreateClients(
  inputs: (Partial<Omit<SavedClient, "id" | "documentCount" | "createdAt" | "updatedAt">> & { name: string })[],
): Promise<SavedClient[]> {
  const r = await request<{ clients: SavedClient[] }>("POST", "/me/clients/bulk", { clients: inputs });
  return r.clients;
}
export async function updateClient(id: string, input: Partial<Omit<SavedClient, "id" | "documentCount" | "createdAt" | "updatedAt">>): Promise<SavedClient> {
  const r = await request<{ client: SavedClient }>("PATCH", `/me/clients/${id}`, input);
  return r.client;
}
export async function deleteClient(id: string): Promise<void> {
  await request<{ ok: true }>("DELETE", `/me/clients/${id}`);
}
export async function getClient(id: string): Promise<SavedClient> {
  const r = await request<{ client: SavedClient }>("GET", `/me/clients/${id}`);
  return r.client;
}

/* ─── Company Profile ──────────────────────────────────────────────────── */
/**
 * Returns the signed-in user's company profile, or null if none has been
 * created yet. The server's envelope is `{ success, data }` where `data`
 * is null on empty.
 */
export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const r = await request<{ success: boolean; data: CompanyProfile | null }>(
    "GET",
    "/me/company-profile",
  );
  return r.data;
}
/**
 * Upserts the user's company profile. Server treats POST and PUT
 * identically (one profile per user).
 */
export async function saveCompanyProfile(input: CompanyProfileInput): Promise<CompanyProfile> {
  const r = await request<{ success: boolean; data: CompanyProfile }>(
    "PUT",
    "/me/company-profile",
    input,
  );
  return r.data;
}

/* ─── Usage ────────────────────────────────────────────────────────────── */
export async function getUsage(): Promise<UsageInfo> {
  return request<UsageInfo>("GET", "/me/usage");
}
export async function incrementUsage(): Promise<UsageInfo> {
  return request<UsageInfo>("POST", "/me/usage/increment");
}
