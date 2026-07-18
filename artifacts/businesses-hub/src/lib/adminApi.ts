import { getAuthToken } from "./billingApi";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.message === "string") return data.message;
    if (data && typeof data.error === "string") return data.error;
  } catch {
    // ignore
  }
  return `Request failed with status ${res.status}`;
}

export type ContactMailStatus = "sent" | "partial" | "failed" | "pending";
export type ContactStatusFilterValue = ContactMailStatus | "needs_follow_up";
export type ContactTriageStatus = "new" | "read" | "resolved";
export type ContactTriageFilterValue = ContactTriageStatus | "unresolved";

export interface ContactMessageListItem {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  subject: string;
  lang: string;
  mailStatus: ContactMailStatus | string;
  triageStatus: ContactTriageStatus | string;
}

export interface ContactMessageDetail extends ContactMessageListItem {
  message: string;
  ip: string;
  userAgent: string;
}

export interface ContactMessageListResponse {
  success: true;
  items: ContactMessageListItem[];
  total: number;
  limit: number;
  offset: number;
  filter: {
    status: ContactStatusFilterValue | null;
    triage?: ContactTriageFilterValue | null;
    q?: string | null;
  };
}

export interface ContactMessageDetailResponse {
  success: true;
  item: ContactMessageDetail;
}

export interface ListContactMessagesParams {
  status?: ContactStatusFilterValue | "" | null;
  triage?: ContactTriageFilterValue | "" | null;
  q?: string | null;
  limit?: number;
  offset?: number;
}

export async function listContactMessages(
  params: ListContactMessagesParams = {},
): Promise<ContactMessageListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.triage) qs.set("triage", params.triage);
  if (params.q) qs.set("q", params.q);
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params.offset === "number") qs.set("offset", String(params.offset));
  const url =
    `${API_BASE}/admin/contact-messages` + (qs.toString() ? `?${qs}` : "");
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function getContactMessage(
  id: string,
): Promise<ContactMessageDetailResponse> {
  const res = await fetch(
    `${API_BASE}/admin/contact-messages/${encodeURIComponent(id)}`,
    { headers: authHeaders() },
  );
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateContactMessageTriage(
  id: string,
  triageStatus: ContactTriageStatus,
): Promise<{ success: true; item: { id: string; triageStatus: string } }> {
  const res = await fetch(
    `${API_BASE}/admin/contact-messages/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ triageStatus }),
    },
  );
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export interface ContactResendResponse {
  success: boolean;
  id: string;
  previousMailStatus: string;
  mailStatus: ContactMailStatus | string;
  userMailOk: boolean;
  teamMailOk: boolean;
}

export interface ContactResendError extends Error {
  status?: number;
  mailStatus?: string;
}

export async function resendContactMessage(
  id: string,
  opts: { force?: boolean } = {},
): Promise<ContactResendResponse> {
  const res = await fetch(
    `${API_BASE}/admin/contact-messages/${encodeURIComponent(id)}/resend`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(opts.force ? { force: true } : {}),
    },
  );
  if (!res.ok) {
    let mailStatus: string | undefined;
    let msg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") msg = data.message;
      else if (data && typeof data.error === "string") msg = data.error;
      if (data && typeof data.mailStatus === "string")
        mailStatus = data.mailStatus;
    } catch {
      // ignore
    }
    const err = new Error(msg) as ContactResendError;
    err.status = res.status;
    err.mailStatus = mailStatus;
    throw err;
  }
  return res.json();
}

export interface NewsletterSubscriberItem {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

export interface NewsletterSubscriberListResponse {
  success: true;
  items: NewsletterSubscriberItem[];
  total: number;
  limit: number;
  offset: number;
  filter: { search: string | null };
  stats: { total: number; last7Days: number };
}

export interface ListNewsletterSubscribersParams {
  search?: string | null;
  limit?: number;
  offset?: number;
}

export async function listNewsletterSubscribers(
  params: ListNewsletterSubscribersParams = {},
): Promise<NewsletterSubscriberListResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params.offset === "number") qs.set("offset", String(params.offset));
  const url =
    `${API_BASE}/admin/newsletter-subscribers` +
    (qs.toString() ? `?${qs}` : "");
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function unsubscribeNewsletterSubscriber(
  id: string,
): Promise<{ success: true; id: string }> {
  const res = await fetch(
    `${API_BASE}/admin/newsletter-subscribers/${encodeURIComponent(id)}/unsubscribe`,
    { method: "PATCH", headers: authHeaders() },
  );
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function deleteNewsletterSubscriber(
  id: string,
): Promise<{ success: true; id: string }> {
  const res = await fetch(
    `${API_BASE}/admin/newsletter-subscribers/${encodeURIComponent(id)}`,
    { method: "DELETE", headers: authHeaders() },
  );
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export interface TestimonialItem {
  id: number;
  name: string;
  quoteEn: string;
  quoteAr: string;
  roleEn: string;
  roleAr: string;
  stars: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TestimonialInput {
  name: string;
  quoteEn: string;
  quoteAr: string;
  roleEn: string;
  roleAr: string;
  stars: number;
  active?: boolean;
}

async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export function listTestimonials(): Promise<{
  success: true;
  items: TestimonialItem[];
}> {
  return adminRequest("/admin/testimonials");
}

export function createTestimonial(
  input: TestimonialInput,
): Promise<{ success: true; item: TestimonialItem }> {
  return adminRequest("/admin/testimonials", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTestimonial(
  id: number,
  input: Partial<TestimonialInput>,
): Promise<{ success: true; item: TestimonialItem }> {
  return adminRequest(`/admin/testimonials/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteTestimonial(id: number): Promise<{ success: true }> {
  return adminRequest(`/admin/testimonials/${id}`, { method: "DELETE" });
}

export function reorderTestimonials(
  ids: number[],
  expectedIds?: number[],
): Promise<{ success: true }> {
  return adminRequest("/admin/testimonials/reorder", {
    method: "PUT",
    body: JSON.stringify(
      expectedIds && expectedIds.length > 0 ? { ids, expectedIds } : { ids },
    ),
  });
}

export async function downloadNewsletterSubscribersCsv(
  search?: string | null,
): Promise<{ blob: Blob; filename: string }> {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  const url =
    `${API_BASE}/admin/newsletter-subscribers.csv` +
    (qs.toString() ? `?${qs}` : "");
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = match?.[1] ?? `newsletter-subscribers-${stamp}.csv`;
  const blob = await res.blob();
  return { blob, filename };
}

export interface AnalyticsBreakdownRow {
  value: string;
  count: number;
}

export interface AdminAnalyticsResponse {
  configured: boolean;
  generatedAt: string;
  range: "week" | "month";
  totals: Array<{ event: string; count: number }>;
  breakdowns: {
    pdfDownloadsByTool: AnalyticsBreakdownRow[];
    aiWriterByPurpose: AnalyticsBreakdownRow[];
    signupsByLanguage: AnalyticsBreakdownRow[];
  };
  breakdownErrors: string[];
  error?: string;
}

export async function getAdminAnalytics(
  range: "week" | "month",
): Promise<AdminAnalyticsResponse> {
  const res = await fetch(`${API_BASE}/admin/analytics?range=${range}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const msg = await parseError(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}
