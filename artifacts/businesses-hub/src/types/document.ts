export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  vatNumber: string;
  logoUrl: string | null;
}

export interface ClientInfo {
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
}

export interface InvoiceData {
  type: "invoice";
  businessInfo: BusinessInfo;
  clientInfo: ClientInfo;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: LineItem[];
  notes: string;
  paymentDetails: string;
  signatureFooter: string;
}

export interface QuotationData extends Omit<InvoiceData, "type" | "invoiceNumber" | "dueDate"> {
  type: "quotation";
  quotationNumber: string;
  validityDate: string;
  terms: string;
}

export interface ReceiptData {
  type: "receipt";
  businessInfo: BusinessInfo;
  receiptNumber: string;
  date: string;
  payerName: string;
  amountReceived: number;
  currency: string;
  paymentMethod: "cash" | "bank_transfer" | "cheque" | "card";
  referenceNumber: string;
  notes: string;
}

export type DocumentData = InvoiceData | QuotationData | ReceiptData;

export interface DocumentTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
}
