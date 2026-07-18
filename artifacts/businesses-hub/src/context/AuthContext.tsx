import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import {
  BILLING_ENABLED,
  fetchBillingStatus,
  syncCheckoutSession,
  authRegister,
  authLogin,
  setAuthToken,
  getAuthToken,
  ApiError,
  type CaptchaContext,
} from "@/lib/billingApi";
import { clearEntitlementsCache } from "@/hooks/useEntitlement";

export type Tier = "free" | "pro" | "business";
export type Interval = "month" | "year";
export type Role = "user" | "admin";

export interface AuthUser {
  name: string;
  email: string;
  tier: Tier;
  /**
   * Coarse role for site-wide permissions. Defaults to "user" both for new
   * accounts and for any cached session that predates this field — the
   * `getSession` helper normalizes missing/unknown values so old sessions
   * never crash on read.
   */
  role: Role;
  billingInterval?: Interval | null;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
}

/** Normalize anything coming back from the API or from old localStorage cache. */
function normalizeRole(value: unknown): Role {
  return value === "admin" ? "admin" : "user";
}

/** Convenience helper for any UI that wants to check admin-only access. */
export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === "admin";
}

interface AuthCtx {
  user: AuthUser | null;
  activeWorkspaceId: string;
  signup: (name: string, email: string, password: string, tier?: Tier, captcha?: CaptchaContext, lang?: string) => Promise<{ ok: boolean; error?: string; code?: string }>;
  login:  (email: string, password: string, captcha?: CaptchaContext, lang?: string) => Promise<{ ok: boolean; error?: string; code?: string }>;
  logout: () => void;
  updateTier: (tier: Tier) => void;
  refreshBilling: (sessionId?: string) => Promise<void>;
  setActiveWorkspaceId: (id: string) => void;
  updateProfile: (updates: { name?: string; currentPassword?: string; newPassword?: string }) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: (password: string) => Promise<{ ok: boolean; error?: string }>;
  exportUserData: () => { ok: boolean; error?: string; data?: UserDataExport; filename?: string };
  importUserData: (json: string) => { ok: boolean; error?: string; restoredCount?: number };
}

export interface UserDataExport {
  schema: "businesses-hub-export";
  version: 1;
  exportedAt: string;
  email: string;
  name: string;
  tier: Tier;
  keys: Record<string, string>;
}

const AuthContext = createContext<AuthCtx | null>(null);

const USERS_KEY   = "bh_users_v1";
const SESSION_KEY = "bh_session_v1";

interface StoredUser {
  name: string;
  email: string;
  pw: string;
  tier: Tier;
}

function encode(s: string) { return btoa(unescape(encodeURIComponent(s))); }
function decode(s: string) { try { return decodeURIComponent(escape(atob(s))); } catch { return ""; } }

function getUsers(): StoredUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser> & { email?: string; name?: string; tier?: Tier };
    if (!parsed || typeof parsed.email !== "string") return null;
    // Old cached sessions may not carry `role`; default to "user" so nothing crashes.
    return {
      ...(parsed as AuthUser),
      role: normalizeRole((parsed as { role?: unknown }).role),
    };
  } catch {
    return null;
  }
}
function saveSession(u: AuthUser | null) {
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else localStorage.removeItem(SESSION_KEY);
}
function getDefaultWorkspaceId(email: string): string {
  const key = `bh_active_ws_${email}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = "ws_default";
  localStorage.setItem(key, id);
  return id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getSession());
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>(() => {
    const s = getSession();
    return s ? getDefaultWorkspaceId(s.email) : "ws_default";
  });

  const signup = useCallback(async (name: string, email: string, password: string, tier: Tier = "free", captcha: CaptchaContext = {}, lang?: string) => {
    const norm = email.toLowerCase().trim();
    const users = getUsers();
    if (users.find(u => u.email === norm)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    let serverRole: Role = "user";
    try {
      const resp = await authRegister(norm, password, name.trim(), captcha, lang);
      setAuthToken(resp.token);
      serverRole = normalizeRole(resp.user.role);
    } catch (e) {
      // Surface the structured API error code (e.g. "captcha_failed",
      // "email_taken") to the caller alongside the human-readable message,
      // so the signup page can branch on the code instead of pattern-matching
      // the message text.
      if (e instanceof ApiError) {
        return { ok: false, error: e.message, code: e.code };
      }
      const msg = e instanceof Error ? e.message : "Sign-up failed.";
      return { ok: false, error: msg };
    }
    const newUser: StoredUser = { name: name.trim(), email: norm, pw: encode(password), tier };
    saveUsers([...users, newUser]);
    const session: AuthUser = {
      name: newUser.name,
      email: newUser.email,
      tier,
      role: serverRole,
    };
    saveSession(session);
    setUser(session);
    const wsId = getDefaultWorkspaceId(norm);
    setActiveWorkspaceIdState(wsId);
    return { ok: true };
  }, []);

  const login = useCallback(async (email: string, password: string, captcha: CaptchaContext = {}, lang?: string) => {
    const norm = email.toLowerCase().trim();
    try {
      const resp = await authLogin(norm, password, captcha, lang);
      setAuthToken(resp.token);
      const users = getUsers();
      const localFound = users.find(u => u.email === norm);
      if (!localFound) {
        // Server auth succeeded but no local record — create one so existing local-only flows keep working.
        saveUsers([...users, { name: resp.user.name || norm, email: norm, pw: encode(password), tier: (resp.user.tier as Tier) || "free" }]);
      } else if (decode(localFound.pw) !== password) {
        // Sync local password cache to match the source of truth.
        const next = users.map(u => u.email === norm ? { ...u, pw: encode(password) } : u);
        saveUsers(next);
      }
      const session: AuthUser = {
        name: resp.user.name || (localFound?.name ?? norm),
        email: norm,
        tier: (resp.user.tier as Tier) || "free",
        role: normalizeRole(resp.user.role),
      };
      saveSession(session);
      setUser(session);
      const wsId = getDefaultWorkspaceId(norm);
      setActiveWorkspaceIdState(wsId);
      return { ok: true };
    } catch (e) {
      // Surface the structured API error code (e.g. "captcha_failed") so the
      // login page can branch on the code instead of pattern-matching the
      // human-readable message text.
      if (e instanceof ApiError) {
        return { ok: false, error: e.message, code: e.code };
      }
      const msg = e instanceof Error ? e.message : "Sign-in failed.";
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    saveSession(null);
    setUser(null);
    setActiveWorkspaceIdState("ws_default");
    clearEntitlementsCache();
  }, []);

  const updateTier = useCallback((tier: Tier) => {
    if (!user) return;
    const users = getUsers();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx >= 0) {
      users[idx] = { ...users[idx], tier };
      saveUsers(users);
    }
    const updated = { ...user, tier };
    saveSession(updated);
    setUser(updated);
  }, [user]);

  const refreshBilling = useCallback(async (sessionId?: string) => {
    // While payments are disabled server-side, skip the billing sync entirely
    // so we don't hit the 503 stub or overwrite the locally stored tier.
    if (!BILLING_ENABLED) return;
    const current = getSession();
    if (!current) return;
    if (!getAuthToken()) return;
    try {
      if (sessionId) {
        try {
          await syncCheckoutSession(sessionId);
        } catch {
          // ignore — webhook will eventually catch up
        }
      }
      const status = await fetchBillingStatus();
      const updated: AuthUser = {
        ...current,
        tier: status.tier,
        billingInterval: status.billingInterval,
        subscriptionStatus: status.subscriptionStatus,
        cancelAtPeriodEnd: status.cancelAtPeriodEnd,
        currentPeriodEnd: status.currentPeriodEnd,
      };
      const users = getUsers();
      const idx = users.findIndex(u => u.email === current.email);
      if (idx >= 0) {
        users[idx] = { ...users[idx], tier: status.tier };
        saveUsers(users);
      }
      saveSession(updated);
      setUser(updated);
    } catch {
      // ignore network errors
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refreshBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const setActiveWorkspaceId = useCallback((id: string) => {
    if (!user) return;
    localStorage.setItem(`bh_active_ws_${user.email}`, id);
    setActiveWorkspaceIdState(id);
  }, [user]);

  const updateProfile = useCallback(async (updates: { name?: string; currentPassword?: string; newPassword?: string }) => {
    if (!user) return { ok: false, error: "Not signed in." };
    const users = getUsers();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx < 0) return { ok: false, error: "Account not found." };

    const trimmedName = updates.name?.trim();
    const wantsPasswordChange = updates.newPassword !== undefined && updates.newPassword !== "";
    const wantsNameChange = trimmedName !== undefined && trimmedName !== users[idx].name;

    if (wantsPasswordChange) {
      if (!updates.currentPassword) {
        return { ok: false, error: "Current password is required to change password." };
      }
      if (decode(users[idx].pw) !== updates.currentPassword) {
        return { ok: false, error: "Current password is incorrect." };
      }
      if ((updates.newPassword as string).length < 6) {
        return { ok: false, error: "New password must be at least 6 characters." };
      }
    }

    if (trimmedName !== undefined && trimmedName.length === 0) {
      return { ok: false, error: "Display name cannot be empty." };
    }

    if (wantsNameChange && !wantsPasswordChange) {
      if (!updates.currentPassword) {
        return { ok: false, error: "Current password is required to change your display name." };
      }
      if (decode(users[idx].pw) !== updates.currentPassword) {
        return { ok: false, error: "Current password is incorrect." };
      }
    }

    const next: StoredUser = {
      ...users[idx],
      name: trimmedName ?? users[idx].name,
      pw: wantsPasswordChange ? encode(updates.newPassword as string) : users[idx].pw,
    };
    users[idx] = next;
    saveUsers(users);

    const updatedSession: AuthUser = { name: next.name, email: next.email, tier: next.tier, role: user.role };
    saveSession(updatedSession);
    setUser(updatedSession);
    return { ok: true };
  }, [user]);

  const deleteAccount = useCallback(async (password: string) => {
    if (!user) return { ok: false, error: "Not signed in." };
    const users = getUsers();
    const found = users.find(u => u.email === user.email);
    if (!found) return { ok: false, error: "Account not found." };
    if (decode(found.pw) !== password) return { ok: false, error: "Incorrect password." };

    const remainingUsers = users.filter(u => u.email !== user.email);

    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("bh_")) toRemove.push(key);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }

    if (remainingUsers.length > 0) {
      saveUsers(remainingUsers);
    }

    setAuthToken(null);
    saveSession(null);
    setUser(null);
    setActiveWorkspaceIdState("ws_default");
    return { ok: true };
  }, [user]);

  const exportUserData = useCallback((): { ok: boolean; error?: string; data?: UserDataExport; filename?: string } => {
    if (!user) return { ok: false, error: "Not signed in." };
    const email = user.email;
    const keys: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("bh_")) continue;
        if (!key.includes(email)) continue;
        const value = localStorage.getItem(key);
        if (value !== null) keys[key] = value;
      }
    } catch (e) {
      return { ok: false, error: "Could not read your data from storage." };
    }
    const data: UserDataExport = {
      schema: "businesses-hub-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      email,
      name: user.name,
      tier: user.tier,
      keys,
    };
    const safeEmail = email.replace(/[^a-z0-9]+/gi, "_");
    const stamp = new Date().toISOString().slice(0, 10);
    return { ok: true, data, filename: `businesses-hub-backup-${safeEmail}-${stamp}.json` };
  }, [user]);

  const importUserData = useCallback((json: string): { ok: boolean; error?: string; restoredCount?: number } => {
    if (!user) return { ok: false, error: "Not signed in." };
    let parsed: UserDataExport;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { ok: false, error: "File is not valid JSON." };
    }
    if (!parsed || parsed.schema !== "businesses-hub-export" || typeof parsed.keys !== "object" || parsed.keys === null) {
      return { ok: false, error: "This file is not a Xuvilo backup." };
    }
    const sourceEmail = (parsed.email || "").toLowerCase().trim();
    if (!sourceEmail) {
      return { ok: false, error: "Backup file is missing an account email." };
    }
    const targetEmail = user.email;
    let count = 0;
    try {
      for (const [origKey, value] of Object.entries(parsed.keys)) {
        if (typeof origKey !== "string" || typeof value !== "string") continue;
        if (!origKey.startsWith("bh_")) continue;
        if (origKey === USERS_KEY || origKey === SESSION_KEY) continue;
        const newKey = sourceEmail === targetEmail
          ? origKey
          : origKey.split(sourceEmail).join(targetEmail);
        localStorage.setItem(newKey, value);
        count++;
      }
    } catch {
      return { ok: false, error: "Could not write data to storage. It may be full." };
    }
    return { ok: true, restoredCount: count };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, activeWorkspaceId, signup, login, logout, updateTier, refreshBilling, setActiveWorkspaceId, updateProfile, deleteAccount, exportUserData, importUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
