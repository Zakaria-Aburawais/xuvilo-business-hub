import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type DocType = "invoice" | "quotation" | "receipt" | "stamp";

export interface TrackedDoc {
  id: string;
  type: DocType;
  title: string;
  subtitle: string;
  date: string;
  fileName: string;
  dueDate?: string;
}

interface TrackerCtx {
  docs: TrackedDoc[];
  addDoc: (doc: Omit<TrackedDoc, "id" | "date">) => void;
  removeDoc: (id: string) => void;
  clearAll: () => void;
}

const TrackerContext = createContext<TrackerCtx | null>(null);
const MAX_DOCS = 100;

function storageKey(userEmail?: string) {
  return userEmail ? `bh_tracker_${userEmail}` : "bh_tracker_guest";
}

export function TrackerProvider({ children, userEmail }: { children: ReactNode; userEmail?: string }) {
  const key = storageKey(userEmail);

  const [docs, setDocs] = useState<TrackedDoc[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as TrackedDoc[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const raw = localStorage.getItem(key);
    const stored = raw ? (JSON.parse(raw) as TrackedDoc[]) : [];
    setDocs(stored);
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(docs));
  }, [docs, key]);

  const addDoc = useCallback((doc: Omit<TrackedDoc, "id" | "date">) => {
    const entry: TrackedDoc = {
      ...doc,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
    };
    setDocs(prev => [entry, ...prev].slice(0, MAX_DOCS));
  }, []);

  const removeDoc = useCallback((id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  const clearAll = useCallback(() => setDocs([]), []);

  return (
    <TrackerContext.Provider value={{ docs, addDoc, removeDoc, clearAll }}>
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used inside TrackerProvider");
  return ctx;
}
