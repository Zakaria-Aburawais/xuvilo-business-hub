import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  getAllTrackedInvoices,
  saveTrackedInvoice,
  deleteTrackedInvoice,
  updateInvoiceStatus,
  generateInvoiceTrackId,
  type InvoiceTrackEntry,
  type InvoiceTrackStatus,
  type TrackedInvoiceData,
} from "@/utils/invoiceTracking";

interface InvoiceTrackCtx {
  invoices: InvoiceTrackEntry[];
  createTrackedInvoice: (
    invoiceData: TrackedInvoiceData,
    meta: { invoiceNumber: string; clientName: string; amount: number; currency: string; issueDate: string; dueDate?: string }
  ) => InvoiceTrackEntry;
  removeInvoice: (id: string) => void;
  markStatus: (id: string, status: InvoiceTrackStatus) => void;
  refresh: () => void;
}

const InvoiceTrackContext = createContext<InvoiceTrackCtx | null>(null);

export function InvoiceTrackProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<InvoiceTrackEntry[]>(() => getAllTrackedInvoices());

  const refresh = useCallback(() => {
    setInvoices(getAllTrackedInvoices());
  }, []);

  const createTrackedInvoice = useCallback(
    (
      invoiceData: TrackedInvoiceData,
      meta: { invoiceNumber: string; clientName: string; amount: number; currency: string; issueDate: string; dueDate?: string }
    ): InvoiceTrackEntry => {
      const entry: InvoiceTrackEntry = {
        id: generateInvoiceTrackId(),
        invoiceNumber: meta.invoiceNumber,
        clientName: meta.clientName,
        amount: meta.amount,
        currency: meta.currency,
        issueDate: meta.issueDate,
        dueDate: meta.dueDate,
        status: "sent",
        createdAt: new Date().toISOString(),
        invoiceData,
      };
      saveTrackedInvoice(entry);
      setInvoices(getAllTrackedInvoices());
      return entry;
    },
    []
  );

  const removeInvoice = useCallback((id: string) => {
    deleteTrackedInvoice(id);
    setInvoices(getAllTrackedInvoices());
  }, []);

  const markStatus = useCallback((id: string, status: InvoiceTrackStatus) => {
    updateInvoiceStatus(id, status);
    setInvoices(getAllTrackedInvoices());
  }, []);

  return (
    <InvoiceTrackContext.Provider value={{ invoices, createTrackedInvoice, removeInvoice, markStatus, refresh }}>
      {children}
    </InvoiceTrackContext.Provider>
  );
}

export function useInvoiceTrack() {
  const ctx = useContext(InvoiceTrackContext);
  if (!ctx) throw new Error("useInvoiceTrack must be used inside InvoiceTrackProvider");
  return ctx;
}
