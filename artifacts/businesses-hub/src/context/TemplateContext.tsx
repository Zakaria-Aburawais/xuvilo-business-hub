import { createContext, useContext, useState, type ReactNode } from "react";

export type InvoiceTemplate = string;
export type QuotationTemplate = string;
export type ReceiptTemplate = string;

interface TemplateState {
  invoiceTemplate: InvoiceTemplate;
  quotationTemplate: QuotationTemplate;
  receiptTemplate: ReceiptTemplate;
  setInvoiceTemplate: (t: InvoiceTemplate) => void;
  setQuotationTemplate: (t: QuotationTemplate) => void;
  setReceiptTemplate: (t: ReceiptTemplate) => void;
}

const TemplateContext = createContext<TemplateState | null>(null);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>("classic");
  const [quotationTemplate, setQuotationTemplate] = useState<QuotationTemplate>("standard");
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate>("full-a4");

  return (
    <TemplateContext.Provider value={{
      invoiceTemplate, quotationTemplate, receiptTemplate,
      setInvoiceTemplate, setQuotationTemplate, setReceiptTemplate,
    }}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate() {
  const ctx = useContext(TemplateContext);
  if (!ctx) throw new Error("useTemplate must be used within TemplateProvider");
  return ctx;
}
