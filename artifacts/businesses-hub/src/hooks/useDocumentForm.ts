import { useState, useCallback } from "react";
import type { LineItem, BusinessInfo, ClientInfo } from "@/types/document";
import { generateId, calcDocumentTotals } from "@/lib/calculations";
import type { NumeralStyle } from "@/utils/numerals";

const defaultBusinessInfo: BusinessInfo = {
  name: "",
  address: "",
  phone: "",
  email: "",
  vatNumber: "",
  logoUrl: null,
};

const defaultClientInfo: ClientInfo = {
  name: "",
  company: "",
  address: "",
  phone: "",
  email: "",
};

export interface BankDetails {
  enabled: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
}

const defaultBankDetails: BankDetails = {
  enabled: false,
  bankName: "",
  accountName: "",
  accountNumber: "",
  iban: "",
  swift: "",
};

const defaultLineItem = (): LineItem => ({
  id: generateId(),
  description: "",
  quantity: 1,
  unitPrice: 0,
  discountPct: 0,
  taxPct: 0,
});

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function futureString(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useInvoiceForm() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(defaultBusinessInfo);
  const [clientInfo, setClientInfo] = useState<ClientInfo>(defaultClientInfo);
  const [invoiceNumber, setInvoiceNumber] = useState("INV-001");
  const [issueDate, setIssueDate] = useState(todayString());
  const [dueDate, setDueDate] = useState(futureString(30));
  const [currency, setCurrency] = useState("USD");
  const [lineItems, setLineItems] = useState<LineItem[]>([defaultLineItem()]);
  const [notes, setNotes] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [signatureFooter, setSignatureFooter] = useState("");
  const [numeralStyle, setNumeralStyle] = useState<NumeralStyle>("western");
  const [paymentLink, setPaymentLink] = useState("");
  const [bankDetails, setBankDetails] = useState<BankDetails>(defaultBankDetails);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, defaultLineItem()]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateLineItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const handleLogoUpload = useCallback((file: File | null) => {
    if (!file) {
      setBusinessInfo((prev) => ({ ...prev, logoUrl: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setBusinessInfo((prev) => ({ ...prev, logoUrl: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const totals = calcDocumentTotals(lineItems);

  return {
    businessInfo, setBusinessInfo,
    clientInfo, setClientInfo,
    invoiceNumber, setInvoiceNumber,
    issueDate, setIssueDate,
    dueDate, setDueDate,
    currency, setCurrency,
    lineItems, setLineItems, addLineItem, removeLineItem, updateLineItem,
    notes, setNotes,
    paymentDetails, setPaymentDetails,
    signatureFooter, setSignatureFooter,
    numeralStyle, setNumeralStyle,
    paymentLink, setPaymentLink,
    bankDetails, setBankDetails,
    totals,
    handleLogoUpload,
  };
}

export function useQuotationForm() {
  const base = useInvoiceForm();
  const [quotationNumber, setQuotationNumber] = useState("QUO-001");
  const [validityDate, setValidityDate] = useState(futureString(14));
  const [terms, setTerms] = useState("");

  return {
    ...base,
    quotationNumber, setQuotationNumber,
    validityDate, setValidityDate,
    terms, setTerms,
  };
}

export function useReceiptForm() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(defaultBusinessInfo);
  const [receiptNumber, setReceiptNumber] = useState("REC-001");
  const [date, setDate] = useState(todayString());
  const [payerName, setPayerName] = useState("");
  const [amountReceived, setAmountReceived] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "cheque" | "card">("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleLogoUpload = useCallback((file: File | null) => {
    if (!file) {
      setBusinessInfo((prev) => ({ ...prev, logoUrl: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setBusinessInfo((prev) => ({ ...prev, logoUrl: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  return {
    businessInfo, setBusinessInfo,
    receiptNumber, setReceiptNumber,
    date, setDate,
    payerName, setPayerName,
    amountReceived, setAmountReceived,
    currency, setCurrency,
    paymentMethod, setPaymentMethod,
    referenceNumber, setReferenceNumber,
    notes, setNotes,
    handleLogoUpload,
  };
}
