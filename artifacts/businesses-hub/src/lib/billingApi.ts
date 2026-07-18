export type Tier = "free" | "pro" | "business";
export type Interval = "month" | "year";

export interface BillingStatus {
  tier: Tier;
  billingInterval: Interval | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
}

const API_BASE = "/api";
const TOKEN_KEY = "bh_auth_token_v1";

export function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

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

// Structured API error that preserves both the machine-readable error code
// (e.g. "captcha_failed", "email_taken") AND the human-readable message,
// so callers can branch on the code without trying to pattern-match the
// message text. Used by the auth helpers whose callers need to distinguish
// captcha failures from validation failures with a friendlier UI.
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function isApiErrorBody(data: unknown): data is { error?: string; message?: string } {
  return typeof data === "object" && data !== null;
}

async function throwApiError(res: Response): Promise<never> {
  let code = "";
  let message = "";
  try {
    const data: unknown = await res.json();
    if (isApiErrorBody(data)) {
      if (typeof data.error === "string") code = data.error;
      if (typeof data.message === "string") message = data.message;
    }
  } catch {
    // body wasn't JSON
  }
  if (!message) message = code || `Request failed with status ${res.status}`;
  throw new ApiError(message, code, res.status);
}

export type Role = "user" | "admin";

export interface AuthResponse {
  token: string;
  user: { email: string; name: string; tier: Tier; role?: Role };
}

export interface CaptchaContext {
  // Cloudflare Turnstile token issued by the widget. Empty string when the
  // site key isn't configured client-side. The server only enforces presence
  // when its own secret is set, so the form keeps working in environments
  // where Turnstile isn't provisioned.
  turnstileToken?: string;
  // Honeypot value. Real users never fill this. Always sent as an empty
  // string so the field is always present in the payload (bots that watch
  // the schema can't distinguish presence from absence).
  website?: string;
}

export async function authRegister(
  email: string,
  password: string,
  name: string,
  captcha: CaptchaContext = {},
  lang?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name,
      ...(lang ? { lang } : {}),
      turnstileToken: captcha.turnstileToken ?? "",
      website: captcha.website ?? "",
    }),
  });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function authLogin(
  email: string,
  password: string,
  captcha: CaptchaContext = {},
  lang?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      ...(lang ? { lang } : {}),
      turnstileToken: captcha.turnstileToken ?? "",
      website: captcha.website ?? "",
    }),
  });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function authForgotPassword(
  email: string,
  lang?: string,
  captcha: CaptchaContext = {},
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      lang,
      turnstileToken: captcha.turnstileToken ?? "",
      website: captcha.website ?? "",
    }),
  });
  if (!res.ok) await throwApiError(res);
}

export async function authResetPassword(token: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function startCheckout(params: {
  name: string;
  plan: Tier;
  interval: Interval;
  /** ISO currency code the visitor chose on the Pricing page (e.g. "AED").
   * The server charges in it when supported, falling back to USD. */
  currency?: string;
}): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function openBillingPortal(): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/billing/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// Stripe is temporarily disabled server-side (all /api/billing/* endpoints
// return 503 "Payment system coming soon"). While disabled, skip the network
// calls that run on page load so the browser console stays clean. Uses the
// same VITE_BILLING_ENABLED env flag as Pricing.tsx and usePlan.ts — set it
// to "true" when the Stripe handlers in the API server are re-enabled.
export const BILLING_ENABLED = import.meta.env["VITE_BILLING_ENABLED"] === "true";

const FREE_BILLING_STATUS: BillingStatus = {
  tier: "free",
  billingInterval: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasCustomer: false,
};

export async function fetchBillingStatus(): Promise<BillingStatus> {
  if (!BILLING_ENABLED) return FREE_BILLING_STATUS;
  const res = await fetch(`${API_BASE}/billing/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function syncCheckoutSession(sessionId?: string): Promise<{ tier: Tier }> {
  if (!BILLING_ENABLED) return { tier: "free" };
  const res = await fetch(`${API_BASE}/billing/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
