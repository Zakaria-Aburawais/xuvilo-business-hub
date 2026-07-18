import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUsage, type UsageInfo } from "@/lib/savedDocsApi";

const FREE_LIMIT = 10;

export function useUsage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setUsage(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUsage();
      setUsage(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load usage";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Listen for cross-component updates triggered by document saves
  useEffect(() => {
    function handler() {
      void refresh();
    }
    window.addEventListener("xuvilo:usage-changed", handler);
    return () => window.removeEventListener("xuvilo:usage-changed", handler);
  }, [refresh]);

  return { usage, loading, error, refresh, freeLimit: FREE_LIMIT };
}

export function notifyUsageChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("xuvilo:usage-changed"));
  }
}
