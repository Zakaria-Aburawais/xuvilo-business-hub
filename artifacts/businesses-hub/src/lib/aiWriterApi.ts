import { getAuthToken } from "./billingApi";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AiWriterDraft {
  id: string;
  purpose: string;
  language: "en" | "ar";
  tone: string;
  length: string;
  subject: string;
  body: string;
  inputs: {
    senderName?: string;
    recipientName?: string;
    recipientCompany?: string;
    mainPurpose?: string;
    details?: string;
    references?: string;
    instructions?: string;
    existingDraft?: string;
  };
  pinned: boolean;
  createdAt: string;
}

async function jsonRequest<T>(
  method: "GET" | "DELETE" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...authHeaders(),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    credentials: "same-origin",
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) msg = String(data.message);
      else if (data?.error) msg = String(data.error);
    } catch {
      /* ignore */
    }
    const err = Object.assign(new Error(msg), { status: res.status });
    throw err;
  }
  return res.json() as Promise<T>;
}

export interface ListAiWriterDraftsOptions {
  q?: string;
  purpose?: string;
}

export async function listAiWriterDrafts(
  opts: ListAiWriterDraftsOptions = {},
): Promise<AiWriterDraft[]> {
  const params = new URLSearchParams();
  const q = (opts.q ?? "").trim();
  const purpose = (opts.purpose ?? "").trim();
  if (q) params.set("q", q);
  if (purpose) params.set("purpose", purpose);
  const qs = params.toString();
  const path = qs ? `/ai-writer/drafts?${qs}` : "/ai-writer/drafts";
  const r = await jsonRequest<{ drafts: AiWriterDraft[] }>("GET", path);
  return r.drafts;
}

export async function getAiWriterDraft(id: string): Promise<AiWriterDraft> {
  const r = await jsonRequest<{ draft: AiWriterDraft }>("GET", `/ai-writer/drafts/${id}`);
  return r.draft;
}

export async function updateAiWriterDraft(
  id: string,
  patch: { pinned: boolean },
): Promise<AiWriterDraft> {
  const r = await jsonRequest<{ draft: AiWriterDraft }>(
    "PATCH",
    `/ai-writer/drafts/${id}`,
    patch,
  );
  return r.draft;
}

export async function deleteAiWriterDraft(id: string): Promise<void> {
  await jsonRequest<{ ok: true }>("DELETE", `/ai-writer/drafts/${id}`);
}
