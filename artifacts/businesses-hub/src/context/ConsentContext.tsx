import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "bh_cookie_consent";

export type ConsentStatus = "accepted" | "rejected" | "unknown";

interface ConsentContextValue {
  status: ConsentStatus;
  accept: () => void;
  reject: () => void;
  reopen: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readStored(): ConsentStatus {
  if (typeof window === "undefined") return "unknown";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "rejected") return v;
  } catch {
    // ignore — storage may be unavailable
  }
  return "unknown";
}

/** Fire a Consent Mode v2 gtag update if gtag is available. */
function pushConsentUpdate(granted: boolean) {
  if (typeof window === "undefined") return;
  const g = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof g !== "function") return;
  const state = granted ? "granted" : "denied";
  g("consent", "update", {
    analytics_storage: state,
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
  });
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>(() => readStored());

  // Sync state across browser tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const v = e.newValue;
      if (v === "accepted" || v === "rejected") setStatus(v);
      else setStatus("unknown");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const accept = useCallback(() => {
    try { window.localStorage.setItem(STORAGE_KEY, "accepted"); } catch {}
    setStatus("accepted");
    pushConsentUpdate(true);
  }, []);

  const reject = useCallback(() => {
    try { window.localStorage.setItem(STORAGE_KEY, "rejected"); } catch {}
    setStatus("rejected");
    pushConsentUpdate(false);
  }, []);

  const reopen = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setStatus("unknown");
  }, []);

  return (
    <ConsentContext.Provider value={{ status, accept, reject, reopen }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error("useConsent must be used inside ConsentProvider");
  return ctx;
}
