import { useEffect, useState, useCallback } from "react";
import { useAuth, type Tier } from "@/context/AuthContext";
import { fetchEntitlements, type EntitlementsResponse, type FeatureKey } from "@/lib/entitlementsApi";

interface CacheEntry {
  email: string;
  data: EntitlementsResponse;
  fetchedAt: number;
}

const STORAGE_KEY = "bh_entitlements_v1";
const TTL_MS = 5 * 60 * 1000;

type Listener = () => void;
const listeners = new Set<Listener>();

let memoryCache: CacheEntry | null = loadFromStorage();
// Per-user inflight requests so a session switch can't await another user's
// fetch and inherit their entitlement payload.
const inflight = new Map<string, Promise<EntitlementsResponse>>();

function loadFromStorage(): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function saveToStorage(entry: CacheEntry | null) {
  try {
    if (entry) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

function notify() {
  for (const fn of listeners) fn();
}

function setCache(entry: CacheEntry | null) {
  memoryCache = entry;
  saveToStorage(entry);
  notify();
}

async function loadEntitlements(email: string, force: boolean): Promise<EntitlementsResponse | null> {
  if (!force && memoryCache && memoryCache.email === email && Date.now() - memoryCache.fetchedAt < TTL_MS) {
    return memoryCache.data;
  }
  const existing = inflight.get(email);
  if (existing) {
    try { return await existing; } catch { return null; }
  }
  const promise = fetchEntitlements();
  inflight.set(email, promise);
  try {
    const data = await promise;
    // Only commit to cache if the user is still the same one we fetched for.
    // (memoryCache may have been cleared by an auth-change in the meantime;
    // committing here is safe because the promise was scoped to this email.)
    setCache({ email, data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  } finally {
    inflight.delete(email);
  }
}

export function clearEntitlementsCache() {
  setCache(null);
  inflight.clear();
}

interface UseEntitlementResult {
  allowed: boolean;
  loading: boolean;
  tier: Tier;
  refresh: () => void;
}

/**
 * Authoritative feature gate. Asks the API once per session (cached 5 min) and
 * returns whether the current user is entitled to `feature`.
 *
 * Behaviour:
 *  - No logged-in user → allowed=false, loading=false.
 *  - Have a cached entitlement for this user → use it immediately while a
 *    background refresh runs (no flicker).
 *  - No cache yet → loading=true; consumers should render a spinner/skeleton.
 *  - Server fetch fails AND no cache exists → fail closed (allowed=false).
 *    We never fall back to the locally-known tier because that field is
 *    untrusted client state and was the whole reason we built server-side
 *    entitlements. If the user just had a transient network blip, the next
 *    refresh (focus, navigation, retry) will rehydrate them.
 */
export function useEntitlement(feature: FeatureKey): UseEntitlementResult {
  const { user } = useAuth();
  const email = user?.email ?? null;

  const [snapshot, setSnapshot] = useState<EntitlementsResponse | null>(() =>
    memoryCache && memoryCache.email === email ? memoryCache.data : null,
  );
  const [loading, setLoading] = useState<boolean>(() => {
    if (!email) return false;
    if (memoryCache && memoryCache.email === email) return false;
    return true;
  });

  const refresh = useCallback(() => {
    if (!email) return;
    setLoading(true);
    void loadEntitlements(email, true).then(() => setLoading(false));
  }, [email]);

  // Subscribe to global cache changes so multiple components stay in sync.
  useEffect(() => {
    const fn = () => {
      if (!email) {
        setSnapshot(null);
        return;
      }
      if (memoryCache && memoryCache.email === email) setSnapshot(memoryCache.data);
      else setSnapshot(null);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, [email]);

  // Drop the cache when the user changes (login/logout/account switch).
  useEffect(() => {
    if (!email) {
      if (memoryCache) setCache(null);
      setSnapshot(null);
      setLoading(false);
      return;
    }
    if (memoryCache && memoryCache.email !== email) {
      setCache(null);
    }
    let cancelled = false;
    const haveFresh = memoryCache && memoryCache.email === email && Date.now() - memoryCache.fetchedAt < TTL_MS;
    if (!haveFresh) setLoading(true);
    void loadEntitlements(email, false).then(() => {
      if (cancelled) return;
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [email]);

  // Refresh when the tab regains focus and the cache is stale.
  useEffect(() => {
    if (!email) return;
    const onFocus = () => {
      if (!memoryCache || memoryCache.email !== email || Date.now() - memoryCache.fetchedAt > TTL_MS) {
        void loadEntitlements(email, false);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [email]);

  if (!email) {
    return { allowed: false, loading: false, tier: "free", refresh };
  }

  // No server answer yet → fail closed. The Tracker page distinguishes
  // `loading` from `!allowed && !loading` so paying users see a spinner,
  // not the upgrade page, while a request is in flight.
  if (!snapshot) {
    return { allowed: false, loading, tier: (user?.tier ?? "free") as Tier, refresh };
  }

  return {
    allowed: !!snapshot.features[feature],
    loading,
    tier: snapshot.tier,
    refresh,
  };
}
