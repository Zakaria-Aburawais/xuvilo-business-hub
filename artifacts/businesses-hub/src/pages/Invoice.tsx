import { useState, useEffect, useRef, useCallback } from "react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { Printer, Eye, FileText, LayoutTemplate, FileDown, Loader2, Shield, HelpCircle, X, CheckCircle, ChevronDown, ChevronRight, CreditCard, Share2, Copy, Check, Save, BookmarkPlus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToolSeoContent, toolFaqJsonLd } from "@/components/ToolSeoContent";
import { useTemplate } from "@/context/TemplateContext";
import { BusinessInfoForm } from "@/components/document/BusinessInfoForm";
import { ClientInfoForm } from "@/components/document/ClientInfoForm";
import { LineItemsTable } from "@/components/document/LineItemsTable";
import { TotalsSection } from "@/components/document/TotalsSection";
import { InvoicePreview } from "@/components/document/DocumentPreview";
import { EditingBanner } from "@/components/document/EditingBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyCombobox } from "@/components/ui/currency-combobox";
import { useInvoiceForm } from "@/hooks/useDocumentForm";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/document/InvoicePDF";
import { UpgradeModal } from "@/components/UpgradeModal";
import { vatForCurrency } from "@/lib/vatRates";
import { SendButtons } from "@/components/SendButtons";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { useTracker } from "@/context/TrackerContext";
import { useInvoiceTrack } from "@/context/InvoiceTrackContext";
import { buildShareUrl } from "@/utils/invoiceTracking";
import { generateZATCAQRCode } from "@/utils/zatca";
import { convertNumerals, suggestNumeralStyle } from "@/utils/numerals";
import type { NumeralStyle } from "@/utils/numerals";
import QRCode from "qrcode";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { syncSaveDocument } from "@/lib/docSyncApi";
import { notifyUsageChanged } from "@/hooks/useUsage";
import { getDocument, STATUSES_BY_TYPE, type DocStatus } from "@/lib/savedDocsApi";
import { timeAgo } from "@/utils/timeAgo";

const AUTO_SAVE_KEY = "bh_invoice_autosave";
const DOWNLOAD_COUNT_KEY = "bh_pdf_download_count";

function getDownloadCount(): number {
  try { return parseInt(localStorage.getItem(DOWNLOAD_COUNT_KEY) ?? "0", 10) || 0; } catch { return 0; }
}
function incrementDownloadCount(): number {
  const n = getDownloadCount() + 1;
  try { localStorage.setItem(DOWNLOAD_COUNT_KEY, String(n)); } catch {}
  return n;
}

function buildWhatsAppMessage(params: {
  docType: string; docTypeAr: string; companyName: string;
  docNumber: string; date: string; currency: string; total: number; zatca: boolean;
}) {
  const sym = getCurrencySymbol(params.currency);
  const lines = [
    `🧾 ${params.docType} / ${params.docTypeAr}`,
    `من / From: ${params.companyName || "—"}`,
    ``,
    `📋 رقم المستند / Document #: ${params.docNumber}`,
    `📅 التاريخ / Date: ${params.date}`,
    `💰 الإجمالي / Total: ${sym} ${params.total.toFixed(2)} ${params.currency}`,
  ];
  if (params.zatca) lines.push(`✅ ZATCA Compliant Invoice`);
  lines.push(``, `Powered by Xuvilo`, `businesseshub.com`);
  return lines.join("\n");
}

function genDocId() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function InvoicePage() {
  const { t, lang } = useLanguage();
  const form = useInvoiceForm();
  const { invoiceTemplate } = useTemplate();
  const { toast } = useToast();
  const { addDoc } = useTracker();
  const [, navigate] = useLocation();
  const { user, activeWorkspaceId } = useAuth();
  const { can } = usePlan();
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [generating, setGenerating] = useState(false);
  const [docTitle, setDocTitle] = useState("INVOICE");
  const [zatcaEnabled, setZatcaEnabled] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [numeralSuggestionDismissed, setNumeralSuggestionDismissed] = useState(false);
  const [paymentQR, setPaymentQR] = useState<string | undefined>(undefined);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoreTitle, setRestoreTitle] = useState<string>("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUsed, setUpgradeUsed] = useState(0);
  const [docStatus, setDocStatus] = useState<DocStatus>("draft");
  const [savingDoc, setSavingDoc] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  // Periodic re-render so "Saved X seconds ago" stays fresh.
  const [, setSavedTick] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const id = setInterval(() => setSavedTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [savedAt]);

  /* ── Unsaved-changes warning ─────────────────────────────────────── */
  const formSnapshot = JSON.stringify({
    businessInfo: form.businessInfo, clientInfo: form.clientInfo, invoiceNumber: form.invoiceNumber,
    issueDate: form.issueDate, dueDate: form.dueDate, currency: form.currency, lineItems: form.lineItems,
    notes: form.notes, paymentDetails: form.paymentDetails, signatureFooter: form.signatureFooter,
    numeralStyle: form.numeralStyle, paymentLink: form.paymentLink, bankDetails: form.bankDetails,
  });
  const { markClean, dialog } = useUnsavedChangesWarning(formSnapshot);

  /* ── Server-side restore via ?documentId=ID (Documents page edit link). */
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("documentId");
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const doc = await getDocument(id);
        if (cancelled || doc.type !== "invoice") return;
        const p = (doc.payload ?? {}) as Record<string, unknown>;
        if (p.businessInfo) form.setBusinessInfo(p.businessInfo as typeof form.businessInfo);
        if (p.clientInfo) form.setClientInfo(p.clientInfo as typeof form.clientInfo);
        if (typeof p.invoiceNumber === "string") form.setInvoiceNumber(p.invoiceNumber);
        if (typeof p.issueDate === "string") form.setIssueDate(p.issueDate);
        if (typeof p.dueDate === "string") form.setDueDate(p.dueDate);
        if (typeof p.currency === "string") form.setCurrency(p.currency);
        if (Array.isArray(p.lineItems)) form.setLineItems(p.lineItems as typeof form.lineItems);
        if (typeof p.notes === "string") form.setNotes(p.notes);
        if (typeof p.paymentDetails === "string") form.setPaymentDetails(p.paymentDetails);
        if (typeof p.signatureFooter === "string") form.setSignatureFooter(p.signatureFooter);
        if (p.numeralStyle) form.setNumeralStyle(p.numeralStyle as NumeralStyle);
        if (typeof p.paymentLink === "string") form.setPaymentLink(p.paymentLink);
        if (p.bankDetails) form.setBankDetails(p.bankDetails as typeof form.bankDetails);
        setDocStatus(doc.status as DocStatus);
        setRestoreTitle(doc.title || "");
        setRestoreId(doc.id);
        markClean();
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {
        toast({
          title: "Could not load document",
          description: e instanceof Error ? e.message : "It may have been deleted.",
          variant: "destructive",
        });
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("restore");
    if (!id) return;
    try {
      const docsKey = `bh_docs_${user.email}_${activeWorkspaceId}`;
      const docs = JSON.parse(localStorage.getItem(docsKey) || "[]") as Array<{ id: string; type: string; title?: string; payload?: Record<string, unknown> }>;
      const doc = docs.find((d) => d.id === id && d.type === "invoice");
      if (!doc || !doc.payload) return;
      setRestoreTitle(doc.title || "");
      const p = doc.payload as Record<string, unknown>;
      if (p.businessInfo) form.setBusinessInfo(p.businessInfo as typeof form.businessInfo);
      if (p.clientInfo) form.setClientInfo(p.clientInfo as typeof form.clientInfo);
      if (typeof p.invoiceNumber === "string") form.setInvoiceNumber(p.invoiceNumber);
      if (typeof p.issueDate === "string") form.setIssueDate(p.issueDate);
      if (typeof p.dueDate === "string") form.setDueDate(p.dueDate);
      if (typeof p.currency === "string") form.setCurrency(p.currency);
      if (Array.isArray(p.lineItems)) form.setLineItems(p.lineItems as typeof form.lineItems);
      if (typeof p.notes === "string") form.setNotes(p.notes);
      if (typeof p.paymentDetails === "string") form.setPaymentDetails(p.paymentDetails);
      if (typeof p.signatureFooter === "string") form.setSignatureFooter(p.signatureFooter);
      if (p.numeralStyle) form.setNumeralStyle(p.numeralStyle as NumeralStyle);
      if (typeof p.paymentLink === "string") form.setPaymentLink(p.paymentLink);
      if (p.bankDetails) form.setBankDetails(p.bankDetails as typeof form.bankDetails);
      setRestoreId(id);
      markClean();
      window.history.replaceState({}, "", window.location.pathname);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currency = params.get("currency");
    const vatRate = params.get("vatRate");
    const zatca = params.get("zatca");
    if (currency) form.setCurrency(currency);
    if (vatRate) {
      const rate = parseFloat(vatRate);
      if (!isNaN(rate)) {
        form.lineItems.forEach((item) => {
          form.updateLineItem(item.id, { taxPct: rate });
        });
      }
    }
    if (zatca === "1") setZatcaEnabled(true);
    if (currency || vatRate) markClean();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { createTrackedInvoice } = useInvoiceTrack();
  const [zatcaQR, setZatcaQR] = useState<string | undefined>(undefined);
  const [vatRegNumber, setVatRegNumber] = useState("");
  const [vatRegError, setVatRegError] = useState("");
  const [showZatcaInfo, setShowZatcaInfo] = useState(false);
  const [sarBannerDismissed, setSarBannerDismissed] = useState(false);
  const [shareModal, setShareModal] = useState<{ url: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [showSoftPrompt, setShowSoftPrompt] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Auto-save (debounced 2s) ─────────────────────────────────────── */
  const serializeForm = useCallback(() => ({
    businessInfo: form.businessInfo,
    clientInfo: form.clientInfo,
    invoiceNumber: form.invoiceNumber,
    issueDate: form.issueDate,
    dueDate: form.dueDate,
    currency: form.currency,
    lineItems: form.lineItems,
    notes: form.notes,
    paymentDetails: form.paymentDetails,
    signatureFooter: form.signatureFooter,
    numeralStyle: form.numeralStyle,
    paymentLink: form.paymentLink,
    bankDetails: form.bankDetails,
  }), [form]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(serializeForm()));
        setAutoSavedAt(new Date());
      } catch {}
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializeForm]);

  const isSAR = form.currency === "SAR";
  const isAED = form.currency === "AED";

  const validateVatNumber = (v: string) => {
    if (!v) return lang === "ar" ? "الرقم الضريبي مطلوب عند تفعيل وضع ZATCA" : "VAT number required when ZATCA mode is on";
    if (!/^3\d{14}$/.test(v)) return lang === "ar" ? "يجب أن يتكون من 15 رقماً ويبدأ بـ 3" : "Must be 15 digits starting with 3";
    return "";
  };

  useEffect(() => {
    if (!zatcaEnabled) { setZatcaQR(undefined); return; }
    const err = validateVatNumber(vatRegNumber);
    if (err) { setZatcaQR(undefined); return; }
    const sellerName = form.businessInfo.name || "Business";
    const invoiceDate = form.issueDate
      ? new Date(form.issueDate).toISOString().replace(/\.\d{3}Z$/, "Z")
      : new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const totalWithVAT = form.totals.grandTotal;
    const vatAmount = form.totals.taxTotal;
    generateZATCAQRCode({ sellerName, vatNumber: vatRegNumber, invoiceDate, totalWithVAT, vatAmount })
      .then(setZatcaQR)
      .catch(() => setZatcaQR(undefined));
  }, [zatcaEnabled, vatRegNumber, form.businessInfo.name, form.issueDate, form.totals.grandTotal, form.totals.taxTotal]);

  useEffect(() => {
    const rate = form.currency === "SAR" ? 15 : form.currency === "AED" ? 5 : null;
    if (rate === null) return;
    form.lineItems.forEach((item) => {
      if (item.taxPct !== rate) form.updateLineItem(item.id, { taxPct: rate });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.currency]);

  useEffect(() => {
    if (!form.paymentLink) { setPaymentQR(undefined); return; }
    try {
      const url = new URL(form.paymentLink);
      if (!url.hostname) { setPaymentQR(undefined); return; }
    } catch { setPaymentQR(undefined); return; }
    QRCode.toDataURL(form.paymentLink, { errorCorrectionLevel: "M", margin: 1, width: 180 })
      .then(setPaymentQR)
      .catch(() => setPaymentQR(undefined));
  }, [form.paymentLink]);

  const handleZatcaToggle = (on: boolean) => {
    setZatcaEnabled(on);
    if (on && !vatRegNumber && form.businessInfo.vatNumber) {
      setVatRegNumber(form.businessInfo.vatNumber);
    }
  };

  const suggestedStyle = suggestNumeralStyle(form.currency);
  const showNumeralSuggestion = suggestedStyle && suggestedStyle !== form.numeralStyle && !numeralSuggestionDismissed;

  const handleSaveToDashboard = async () => {
    if (!user) { navigate("/login"); return false; }
    const payload = {
      businessInfo: form.businessInfo,
      clientInfo: form.clientInfo,
      invoiceNumber: form.invoiceNumber,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      currency: form.currency,
      lineItems: form.lineItems,
      notes: form.notes,
      paymentDetails: form.paymentDetails,
      signatureFooter: form.signatureFooter,
      numeralStyle: form.numeralStyle,
      paymentLink: form.paymentLink,
      bankDetails: form.bankDetails,
    };
    const title = `Invoice #${form.invoiceNumber}`;
    const clientName = form.clientInfo?.name || form.clientInfo?.company || "—";
    setSavingDoc(true);
    const result = await syncSaveDocument(
      {
        type: "invoice",
        title,
        clientName,
        amount: form.totals.grandTotal,
        currency: form.currency,
        status: docStatus,
        payload,
      },
      restoreId,
    );
    if (result.blocked) {
      setSavingDoc(false);
      try {
        const { getUsage } = await import("@/lib/savedDocsApi");
        const u = await getUsage();
        setUpgradeUsed(u.documentsCreated);
      } catch { /* noop */ }
      setUpgradeOpen(true);
      return false;
    }
    if (!result.ok || !result.doc) {
      setSavingDoc(false);
      toast({ title: "Save failed", description: result.error || "Please try again.", variant: "destructive" });
      return false;
    }
    notifyUsageChanged();
    // Mirror to localStorage so restore-by-id keeps working
    try {
      const docsKey = `bh_docs_${user.email}_${activeWorkspaceId}`;
      let docs: Array<Record<string, unknown>> = [];
      try { docs = JSON.parse(localStorage.getItem(docsKey) || "[]"); } catch { /* noop */ }
      const mirror = {
        id: result.doc.id, type: "invoice", title, clientName,
        date: form.issueDate, amount: form.totals.grandTotal, currency: form.currency,
        status: result.doc.status, createdAt: result.doc.createdAt,
        lastEditedAt: result.doc.lastEditedAt, workspaceId: activeWorkspaceId, payload,
      };
      const idx = docs.findIndex((d) => d.id === result.doc!.id);
      if (idx >= 0) docs[idx] = mirror; else docs.push(mirror);
      localStorage.setItem(docsKey, JSON.stringify(docs));
    } catch { /* best-effort */ }
    setRestoreId(result.doc.id);
    setRestoreTitle(title);
    setSavedAt(new Date());
    setSavingDoc(false);
    markClean();
    toast({
      title: restoreId ? "Document updated!" : "Saved to Dashboard!",
      description: restoreId ? "Your changes have been saved." : "Find it under Invoices in your dashboard.",
    });
    return true;
  };

  const handleWhatsApp = () => {
    const msg = buildWhatsAppMessage({
      docType: "Invoice", docTypeAr: "فاتورة",
      companyName: form.businessInfo.name,
      docNumber: form.invoiceNumber,
      date: form.issueDate,
      currency: form.currency,
      total: form.totals.grandTotal,
      zatca: zatcaEnabled && !!zatcaQR,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleShareAndTrack = () => {
    const entry = createTrackedInvoice(
      {
        type: "invoice",
        businessInfo: form.businessInfo,
        clientInfo: form.clientInfo,
        docNumber: form.invoiceNumber,
        issueDate: form.issueDate,
        dueOrValidityDate: form.dueDate,
        currency: form.currency,
        lineItems: form.lineItems,
        totals: form.totals,
        notes: form.notes,
        paymentDetails: form.paymentDetails,
        signatureFooter: form.signatureFooter,
        zatcaQR: zatcaEnabled ? zatcaQR : undefined,
        numeralStyle: form.numeralStyle,
        paymentLink: form.paymentLink,
        paymentQR: paymentQR,
        bankDetails: form.bankDetails,
        template: invoiceTemplate,
      },
      {
        invoiceNumber: form.invoiceNumber,
        clientName: form.clientInfo?.name || form.clientInfo?.company || "—",
        amount: form.totals.grandTotal,
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
      }
    );
    setShareModal({ url: buildShareUrl(entry.id), id: entry.id });
  };

  const handleCopyShareLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsAppShare = (url: string) => {
    const msg = `مرحباً،\n\nيمكنك مشاهدة وتأكيد استلام الفاتورة رقم ${form.invoiceNumber} من الرابط أدناه:\n${url}\n\nHello, please view and confirm receipt of Invoice #${form.invoiceNumber}:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <InvoicePDF
          type="invoice"
          businessInfo={form.businessInfo}
          clientInfo={form.clientInfo}
          docNumber={form.invoiceNumber}
          issueDate={form.issueDate}
          dueOrValidityDate={form.dueDate}
          dueOrValidityLabel={t("doc.due_date")}
          currency={form.currency}
          lineItems={form.lineItems}
          totals={form.totals}
          notes={form.notes}
          paymentDetails={form.paymentDetails}
          signatureFooter={form.signatureFooter}
          zatcaQR={zatcaEnabled ? zatcaQR : undefined}
          numeralStyle={form.numeralStyle}
          paymentLink={form.paymentLink}
          paymentQR={paymentQR}
          bankDetails={form.bankDetails}
          watermark={can("save_documents") ? undefined : (lang === "ar" ? "أنشئ بواسطة Xuvilo — xuvilo.com" : "Created with Xuvilo — xuvilo.com")}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${form.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Invoice downloaded!", description: `invoice-${form.invoiceNumber}.pdf saved.` });
      trackEvent("pdf_download", { tool: "invoice", language: lang });
      addDoc({
        type: "invoice",
        title: `Invoice #${form.invoiceNumber}`,
        subtitle: form.clientInfo?.name || form.businessInfo?.name || "—",
        fileName: `invoice-${form.invoiceNumber}.pdf`,
        dueDate: form.dueDate || undefined,
      });
      createTrackedInvoice(
        {
          type: "invoice",
          businessInfo: form.businessInfo,
          clientInfo: form.clientInfo,
          docNumber: form.invoiceNumber,
          issueDate: form.issueDate,
          dueOrValidityDate: form.dueDate,
          currency: form.currency,
          lineItems: form.lineItems,
          totals: form.totals,
          notes: form.notes,
          paymentDetails: form.paymentDetails,
          signatureFooter: form.signatureFooter,
          zatcaQR: zatcaEnabled ? zatcaQR : undefined,
          numeralStyle: form.numeralStyle,
          paymentLink: form.paymentLink,
          paymentQR: paymentQR,
          bankDetails: form.bankDetails,
          template: invoiceTemplate,
        },
        {
          invoiceNumber: form.invoiceNumber,
          clientName: form.clientInfo?.name || form.clientInfo?.company || "—",
          amount: form.totals.grandTotal,
          currency: form.currency,
          issueDate: form.issueDate,
          dueDate: form.dueDate || undefined,
        }
      );
      const count = incrementDownloadCount();
      if (count === 2) {
        const dismissed = localStorage.getItem("bh_soft_prompt_dismissed") === "1";
        if (!dismissed) setShowSoftPrompt(true);
      }
    } catch {
      toast({ title: "Error", description: "Could not generate PDF. Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const PAYMENT_PROVIDERS = [
    { label: "PayPal", prefix: "https://paypal.me/" },
    { label: "Tap", prefix: "https://tap.company/pay/" },
    { label: "Stripe", prefix: "https://buy.stripe.com/" },
    { label: "HyperPay", prefix: "https://www.hyperpay.com/" },
    { label: lang === "ar" ? "أخرى" : "Other", prefix: "" },
  ];

  const numStyleOptions: { value: NumeralStyle; label: string; sample: string }[] = [
    { value: "western", label: "Western", sample: "123" },
    { value: "eastern", label: "Eastern", sample: "١٢٣" },
    { value: "perso", label: "Perso", sample: "۱۲۳" },
  ];

  return (
    <AppLayout>
      <SEOHead {...PAGE_SEO["/invoice"]} path="/invoice" structuredData={toolFaqJsonLd("invoice", lang === "ar")} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("tool.invoice.name")}</h1>
            {invoiceTemplate !== "classic" && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full capitalize">
                {invoiceTemplate.replace(/-/g, " ")}
              </span>
            )}
            {zatcaEnabled && zatcaQR && (
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                ZATCA ✓
              </span>
            )}
          </div>
          {/* ── Header actions: 3 slots (template | more▾ | primary CTA) ─── */}
          <div className="flex items-center gap-2">

            {/* Slot 1 — Navigation: change template */}
            <Link href="/templates/invoice">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <LayoutTemplate className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === "ar" ? "تغيير القالب" : "Change Template"}</span>
              </Button>
            </Link>

            {/* Print */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              data-testid="print-button"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{t("doc.print")}</span>
            </Button>

            {/* WhatsApp */}
            <Button
              size="sm"
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="hidden sm:inline">{lang === "ar" ? "واتساب" : "WhatsApp"}</span>
            </Button>

            {/* Share & Track */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareAndTrack}
              className="flex items-center gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
              data-testid="share-track-btn"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === "ar" ? "مشاركة" : "Share"}</span>
            </Button>

            {/* Status (only meaningful when signed-in & saved) */}
            {user && (
              <Select
                value={docStatus}
                onValueChange={(v) => setDocStatus(v as DocStatus)}
              >
                <SelectTrigger
                  className="h-9 w-[112px] text-xs"
                  data-testid="doc-status-select"
                  title={lang === "ar" ? "الحالة" : "Status"}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES_BY_TYPE.invoice.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Save to Dashboard */}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToDashboard}
                disabled={savingDoc}
                className="flex items-center gap-1.5 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                data-testid="save-to-dashboard-btn"
              >
                {savingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                <span className="hidden sm:inline">{lang === "ar" ? "حفظ" : "Save"}</span>
              </Button>
            ) : (
              <Link href="/login?next=/invoice">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-gray-400" data-testid="save-to-dashboard-btn">
                  <BookmarkPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === "ar" ? "حفظ" : "Save"}</span>
                </Button>
              </Link>
            )}

            {/* Save indicator */}
            {user && (savingDoc || savedAt) && (
              <span
                className="hidden md:inline text-[11px] text-muted-foreground whitespace-nowrap"
                data-testid="save-indicator"
              >
                {savingDoc
                  ? (lang === "ar" ? "جارٍ الحفظ…" : "Saving…")
                  : `${lang === "ar" ? "تم الحفظ " : "Saved "}${timeAgo(savedAt!.toISOString(), lang)}`}
              </span>
            )}

            {/* Slot 3 — Primary CTA: Download PDF */}
            <Button
              size="sm"
              onClick={handleGeneratePDF}
              disabled={generating}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white border-0 shadow-sm hover:shadow-[0_0_12px_rgba(124,58,237,0.35)] transition-all"
              data-testid="download-pdf"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>{generating ? (lang === "ar" ? "جاري الإنشاء…" : "Generating…") : (lang === "ar" ? "تحميل PDF" : "Download PDF")}</span>
            </Button>
            <SendButtons
              doc={{
                type: "invoice",
                title: `Invoice #${form.invoiceNumber}`,
                clientName: form.clientInfo?.name,
                amount: form.totals.grandTotal,
                currency: form.currency,
                number: form.invoiceNumber,
                date: form.issueDate,
              }}
              size="sm"
            />
          </div>
        </div>

        {/* Auto-save indicator */}
        {autoSavedAt && (
          <div className="flex items-center justify-end gap-1.5 mb-1 text-xs text-gray-400 dark:text-gray-500">
            <Save className="w-3 h-3" />
            <span>{lang === "ar" ? "تم الحفظ التلقائي ✓" : "Auto-saved ✓"}</span>
          </div>
        )}

        {/* Soft sign-up prompt (after 2nd PDF download) */}
        {showSoftPrompt && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/50 dark:to-violet-950/50 border border-blue-200 dark:border-blue-800 text-sm">
            <span className="text-blue-800 dark:text-blue-200">
              💾 {lang === "ar"
                ? "احفظ فواتيرك على كل أجهزتك — أنشئ حساباً مجانياً لا تفقد أعمالك أبداً."
                : "Save your invoices across devices — Create a free account to never lose your work."}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/signup">
                <button className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  {lang === "ar" ? "إنشاء حساب" : "Create Free Account"}
                </button>
              </Link>
              <button
                onClick={() => { setShowSoftPrompt(false); localStorage.setItem("bh_soft_prompt_dismissed", "1"); }}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SAR / AED auto-detect banners */}
        {isSAR && !zatcaEnabled && !sarBannerDismissed && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-base">🇸🇦</span>
              <span className="text-emerald-800 dark:text-emerald-200 font-medium">
                {lang === "ar"
                  ? "هل تصدر فاتورة في المملكة العربية السعودية؟ فعّل وضع ZATCA لاستيفاء المتطلبات القانونية."
                  : "Invoicing in Saudi Arabia? Enable ZATCA compliance to meet legal e-invoicing requirements."}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleZatcaToggle(true)}
                className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                {lang === "ar" ? "تفعيل" : "Enable ZATCA"}
              </button>
              <button onClick={() => setSarBannerDismissed(true)} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {isAED && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-sm">
            <span className="text-base">🇦🇪</span>
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              {lang === "ar" ? "معيار ضريبة القيمة المضافة في الإمارات: 5%" : "UAE standard VAT rate: 5% — set your line item tax rates accordingly."}
            </span>
            <span className="ms-auto px-2 py-0.5 text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">
              UAE VAT Compliant
            </span>
          </div>
        )}

        {/* Numeral style auto-suggestion */}
        {showNumeralSuggestion && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-sm">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <span className="text-amber-800 dark:text-amber-200">
                {lang === "ar"
                  ? "الأرقام العربية الشرقية (١٢٣) هي المعيار في مستندات الأعمال الرسمية. هل تريد التفعيل؟"
                  : `Eastern Arabic numerals (١٢٣) are standard in formal Arabic business documents across KSA, UAE, and Egypt. Switch?`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { form.setNumeralStyle(suggestedStyle!); setNumeralSuggestionDismissed(true); }}
                className="px-3 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                {suggestedStyle === "perso" ? "۱۲۳" : "١٢٣"} {lang === "ar" ? "تفعيل" : "Switch"}
              </button>
              <button onClick={() => setNumeralSuggestionDismissed(true)} className="text-amber-600 hover:text-amber-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ZATCA Info Modal */}
        {showZatcaInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowZatcaInfo(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-lg">{lang === "ar" ? "فاتورة متوافقة مع هيئة الزكاة والضريبة والجمارك" : "ZATCA Phase 1 Compliance"}</h3>
                </div>
                <button onClick={() => setShowZatcaInfo(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  {lang === "ar"
                    ? "تستوفي هذه الفاتورة متطلبات الفاتورة الضريبية المبسطة للمرحلة الأولى من الفوترة الإلكترونية وفق أنظمة هيئة الزكاة والضريبة والجمارك."
                    : "This invoice meets Saudi Arabia's ZATCA Phase 1 e-invoicing requirements."}
                </p>
              </div>
            </div>
          </div>
        )}

        {restoreId && (
          <EditingBanner
            docTitle={restoreTitle}
            docTypeLabel={{ en: "invoice", ar: "الفاتورة" }}
            onSaveAsNew={() => {
              setRestoreId(null);
              setRestoreTitle("");
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete("restore");
                window.history.replaceState({}, "", url.toString());
              } catch {}
              toast({
                title: lang === "ar" ? "وضع نسخة جديدة" : "New copy mode",
                description: lang === "ar"
                  ? "سيؤدي الحفظ التالي إلى إنشاء مستند جديد."
                  : "The next save will create a new document.",
              });
            }}
          />
        )}

        {/* Anonymous prompt: invite signup so the doc can be saved. */}
        {!user && (
          <div
            data-testid="anon-save-prompt"
            className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs sm:text-sm"
          >
            <span className="text-amber-800 dark:text-amber-200">
              {lang === "ar"
                ? "أنشئ حساباً مجانياً لحفظ هذه الفاتورة والوصول إليها لاحقاً."
                : "Create a free account to save this invoice and access it later."}
            </span>
            <Link href="/signup?next=/invoice">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 h-7">
                {lang === "ar" ? "إنشاء حساب مجاني" : "Sign up free"}
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile tabs */}
        <div className="md:hidden mb-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "form" | "preview")}>
            <TabsList className="w-full">
              <TabsTrigger value="form" className="flex-1">{t("doc.form")}</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">
                <Eye className="w-4 h-4 me-1" />
                {t("doc.preview")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Desktop two-column / Mobile tabs */}
        <div className="md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1.2fr] gap-6">
          {/* Form */}
          <div className={`space-y-6 ${activeTab === "preview" ? "hidden md:block" : ""}`}>
            <BusinessInfoForm
              businessInfo={form.businessInfo}
              onChange={form.setBusinessInfo}
              onLogoUpload={form.handleLogoUpload}
            />
            <Separator />
            <ClientInfoForm clientInfo={form.clientInfo} onChange={form.setClientInfo} />
            <Separator />

            {/* Invoice meta */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">{t("doc.invoice_details")}</h3>
              <div className="space-y-1 mb-1">
                <Label className="text-xs">{lang === "ar" ? "عنوان المستند" : "Document Title"}</Label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="INVOICE"
                  className="h-8 text-sm font-semibold tracking-wide"
                  data-testid="doc-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="invoice-number" className="text-xs">{t("doc.invoice_number")}</Label>
                  <Input
                    id="invoice-number"
                    value={form.invoiceNumber}
                    onChange={(e) => form.setInvoiceNumber(e.target.value)}
                    data-testid="invoice-number"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("doc.currency")}</Label>
                  <CurrencyCombobox
                    value={form.currency}
                    onValueChange={(c) => {
                      form.setCurrency(c);
                      const v = vatForCurrency(c);
                      if (v) {
                        form.setLineItems((items) =>
                          items.map((it) => (it.taxPct === 0 ? { ...it, taxPct: v.rate } : it))
                        );
                      }
                    }}
                    data-testid="currency-select"
                  />
                  {(() => {
                    const v = vatForCurrency(form.currency);
                    if (!v) return null;
                    const label = lang === "ar"
                      ? `ضريبة القيمة المضافة المقترحة: ${v.rate}% (${v.countryAr})`
                      : `Suggested VAT: ${v.rate}% (${v.countryName})`;
                    return (
                      <p className="text-[11px] text-gray-500" data-testid="vat-suggestion">{label}</p>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="issue-date" className="text-xs">{t("doc.invoice_date")}</Label>
                  <Input
                    id="issue-date"
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => form.setIssueDate(e.target.value)}
                    data-testid="issue-date"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="due-date" className="text-xs">{t("doc.due_date")}</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => form.setDueDate(e.target.value)}
                    data-testid="due-date"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Number Format Toggle */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs">{lang === "ar" ? "صيغة الأرقام" : "Number Format"}</Label>
                <div className="flex gap-1.5">
                  {numStyleOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { form.setNumeralStyle(opt.value); setNumeralSuggestionDismissed(true); }}
                      className={`flex-1 h-8 rounded-lg border text-sm font-semibold transition-all ${
                        form.numeralStyle === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary/50"
                      }`}
                    >
                      {opt.sample}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.numeralStyle === "western" && (lang === "ar" ? "أرقام غربية (123)" : "Western numerals (123)")}
                  {form.numeralStyle === "eastern" && (lang === "ar" ? "أرقام عربية شرقية (١٢٣)" : "East Arabic numerals (١٢٣)")}
                  {form.numeralStyle === "perso" && (lang === "ar" ? "أرقام فارسية (۱۲۳)" : "Perso-Arabic numerals (۱۲۳)")}
                </p>
              </div>
            </div>
            <Separator />

            <LineItemsTable
              items={form.lineItems}
              currency={form.currency}
              onAdd={form.addLineItem}
              onRemove={form.removeLineItem}
              onUpdate={form.updateLineItem}
              onImportCsv={(imported) => {
                if (imported.length === 0) return;
                form.setLineItems(imported);
              }}
              csvFilename={`invoice-${form.invoiceNumber || "items"}`}
            />
            <TotalsSection totals={form.totals} currency={form.currency} />
            <Separator />

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("doc.notes")}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => form.setNotes(e.target.value)}
                  rows={2}
                  data-testid="notes"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("doc.payment_details")}</Label>
                <Textarea
                  value={form.paymentDetails}
                  onChange={(e) => form.setPaymentDetails(e.target.value)}
                  rows={2}
                  data-testid="payment-details"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("doc.signature")}</Label>
                <Input
                  value={form.signatureFooter}
                  onChange={(e) => form.setSignatureFooter(e.target.value)}
                  data-testid="signature"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* ── Payment Links & Bank Details ── */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden">
              <button
                onClick={() => setPaymentOpen(!paymentOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>{lang === "ar" ? "تفاصيل الدفع والبنك" : "Payment Link & Bank Details"}</span>
                  {(form.paymentLink || form.bankDetails.enabled) && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                {paymentOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {paymentOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-blue-200 dark:border-blue-800 pt-3">
                  {/* Payment Link */}
                  <div className="space-y-2">
                    <Label className="text-xs">{lang === "ar" ? "رابط الدفع (اختياري)" : "Payment Link (optional)"}</Label>
                    <Input
                      value={form.paymentLink}
                      onChange={(e) => form.setPaymentLink(e.target.value)}
                      placeholder="https://paypal.me/username"
                      className="h-8 text-sm"
                      data-testid="payment-link"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_PROVIDERS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => form.setPaymentLink(p.prefix || "")}
                          className="px-2.5 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600 bg-white dark:bg-gray-900 transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {paymentQR && (
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded-lg border border-blue-100 dark:border-blue-800">
                        <img src={paymentQR} alt="Payment QR" className="w-12 h-12 rounded" />
                        <div className="text-xs text-gray-500">
                          <div className="font-semibold text-blue-600">QR Ready</div>
                          <div>Appears in PDF footer</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bank Transfer Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{lang === "ar" ? "إضافة تفاصيل التحويل البنكي" : "Add bank transfer details"}</Label>
                      <button
                        role="switch"
                        aria-checked={form.bankDetails.enabled}
                        onClick={() => form.setBankDetails(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.bankDetails.enabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${form.bankDetails.enabled ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {form.bankDetails.enabled && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "bankName", label: lang === "ar" ? "اسم البنك" : "Bank Name" },
                          { key: "accountName", label: lang === "ar" ? "اسم صاحب الحساب" : "Account Holder" },
                          { key: "accountNumber", label: lang === "ar" ? "رقم الحساب" : "Account Number" },
                          { key: "iban", label: lang === "ar" ? "آيبان (اختياري)" : "IBAN (optional)" },
                          { key: "swift", label: lang === "ar" ? "سويفت (اختياري)" : "SWIFT/BIC (optional)" },
                        ].map(({ key, label }) => (
                          <div key={key} className={`space-y-1 ${key === "bankName" ? "col-span-2" : ""}`}>
                            <Label className="text-xs">{label}</Label>
                            <Input
                              value={form.bankDetails[key as keyof typeof form.bankDetails] as string}
                              onChange={(e) => form.setBankDetails(prev => ({ ...prev, [key]: e.target.value }))}
                              className="h-7 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* ZATCA Section */}
            <div className="space-y-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-sm">
                    {lang === "ar" ? "فاتورة متوافقة مع ZATCA" : "ZATCA Compliant Invoice"}
                  </span>
                  <button
                    onClick={() => setShowZatcaInfo(true)}
                    className="text-gray-400 hover:text-emerald-600 transition-colors"
                    title="Learn more"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <button
                  role="switch"
                  aria-checked={zatcaEnabled}
                  onClick={() => handleZatcaToggle(!zatcaEnabled)}
                  data-testid="zatca-toggle"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${zatcaEnabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${zatcaEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {zatcaEnabled && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      {lang === "ar" ? "الرقم الضريبي" : "VAT Registration Number"}
                      <span className="text-red-500 ms-1">*</span>
                    </Label>
                    <Input
                      value={vatRegNumber}
                      onChange={(e) => {
                        setVatRegNumber(e.target.value);
                        setVatRegError(e.target.value ? validateVatNumber(e.target.value) : "");
                      }}
                      onBlur={() => setVatRegError(validateVatNumber(vatRegNumber))}
                      placeholder="3XXXXXXXXXXXXXX"
                      maxLength={15}
                      data-testid="vat-reg-number"
                      className={`h-8 text-sm font-mono ${vatRegError ? "border-red-400 focus:ring-red-400" : zatcaQR ? "border-emerald-400 focus:ring-emerald-400" : ""}`}
                    />
                    {vatRegError && <p className="text-xs text-red-500 mt-1">{vatRegError}</p>}
                    {zatcaQR && !vatRegError && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3" />
                        {lang === "ar" ? "تم توليد رمز QR بنجاح" : "QR code generated successfully"}
                      </p>
                    )}
                  </div>
                  {zatcaQR && (
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-emerald-100 dark:border-emerald-800">
                      <img src={zatcaQR} alt="ZATCA QR Preview" className="w-16 h-16 rounded" />
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {lang === "ar" ? "رمز QR جاهز" : "QR Code Ready"}
                        </div>
                        <div>{lang === "ar" ? "سيظهر في الجزء السفلي من الفاتورة" : "Appears in invoice footer"}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!zatcaEnabled && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {lang === "ar"
                    ? "للشركات في المملكة العربية السعودية — أضف رمز QR المتوافق مع المرحلة الأولى من هيئة الزكاة والضريبة والجمارك."
                    : "For Saudi Arabian businesses — adds a ZATCA Phase 1 compliant QR code to your invoice."}
                </p>
              )}
            </div>

            {/* ── Prominent Generate Button ─── */}
            <div className="pt-2 pb-4">
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                data-testid="generate-invoice-btn"
                className="w-full h-12 flex items-center justify-center gap-3 rounded-xl font-bold text-base text-white bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:opacity-60 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {lang === "ar" ? "جاري الإنشاء…" : "Generating PDF…"}
                  </>
                ) : (
                  <>
                    <FileDown className="w-5 h-5" />
                    {lang === "ar" ? "إنشاء وتحميل الفاتورة" : "Generate & Download Invoice"}
                  </>
                )}
              </button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                {lang === "ar" ? "PDF احترافي جاهز للطباعة بصيغة" : "Professional A4 PDF · ready to print or share"}
              </p>
              {/* Share & Track — secondary action after download */}
              <button
                onClick={handleShareAndTrack}
                className="mt-2 w-full h-10 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {lang === "ar" ? "مشاركة وتتبع الفاتورة" : "Share & Track this Invoice"}
              </button>
            </div>
          </div>

          {/* Preview — scrollable A4 */}
          <div className={`${activeTab === "form" ? "hidden md:block" : ""} sticky top-20 self-start`}>
            <p className="text-xs text-muted-foreground mb-2 text-center">
              {lang === "ar" ? "معاينة مباشرة" : "Live Preview — A4 Format"}
            </p>
            <div className="relative overflow-x-auto rounded-xl bg-gray-100 dark:bg-gray-900 p-3 max-h-[calc(100vh-8rem)]" style={{ overflowY: "auto" }}>
              {zatcaEnabled && zatcaQR && (
                <div className="absolute top-5 end-5 z-10 flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                  <CheckCircle className="w-3 h-3" />
                  ZATCA ✓
                </div>
              )}
              <InvoicePreview
                type="invoice"
                customTitle={docTitle}
                template={invoiceTemplate}
                businessInfo={form.businessInfo}
                clientInfo={form.clientInfo}
                docNumber={form.invoiceNumber}
                issueDate={form.issueDate}
                dueOrValidityDate={form.dueDate}
                dueOrValidityLabel={t("doc.due_date")}
                currency={form.currency}
                lineItems={form.lineItems}
                totals={form.totals}
                notes={form.notes}
                paymentDetails={form.paymentDetails}
                signatureFooter={form.signatureFooter}
                zatcaQR={zatcaEnabled ? zatcaQR : undefined}
                numeralStyle={form.numeralStyle}
                paymentLink={form.paymentLink}
                bankDetails={form.bankDetails}
              />
            </div>
          </div>
        </div>
      </div>
        {/* Share & Track Modal */}
        {shareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShareModal(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {lang === "ar" ? "مشاركة وتتبع الفاتورة" : "Share & Track Invoice"}
                  </h3>
                </div>
                <button onClick={() => setShareModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                  {lang === "ar" ? "معرّف الفاتورة:" : "Invoice ID:"}
                </p>
                <p className="font-mono font-bold text-blue-800 dark:text-blue-200 text-sm">{shareModal.id}</p>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {lang === "ar"
                  ? "يمكن لعميلك عرض وتأكيد استلام الفاتورة من الرابط أدناه."
                  : "Your client can view and confirm this invoice at the link below."}
              </p>

              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
                <input
                  readOnly
                  value={shareModal.url}
                  className="flex-1 bg-transparent text-xs text-gray-700 dark:text-gray-300 outline-none min-w-0"
                />
                <button
                  onClick={() => handleCopyShareLink(shareModal.url)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                    copied
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? (lang === "ar" ? "تم!" : "Copied!") : (lang === "ar" ? "نسخ" : "Copy")}
                </button>
              </div>

              <button
                onClick={() => handleWhatsAppShare(shareModal.url)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl font-semibold text-sm transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {lang === "ar" ? "مشاركة عبر واتساب" : "Share via WhatsApp"}
              </button>

              <button
                onClick={() => { setShareModal(null); navigate("/tools/tracker"); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl font-semibold text-sm transition-colors border border-blue-200 dark:border-blue-800"
              >
                <FileText className="w-4 h-4" />
                {lang === "ar" ? "عرض في المتتبع ←" : "View in Tracker →"}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-1">
                {lang === "ar"
                  ? "📍 الرابط يعمل على هذا الجهاز فقط — البيانات محفوظة محلياً."
                  : "📍 Link works on this device only — data is stored locally."}
              </p>
            </div>
          </div>
        )}
      <ToolSeoContent doc="invoice" />
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="limit"
        used={upgradeUsed}
        limit={10}
      />
      <UnsavedChangesDialog
        open={dialog.open}
        lang={lang}
        onStay={dialog.stay}
        onLeave={dialog.leave}
        onSaveAndLeave={user ? async () => { const ok = await handleSaveToDashboard(); if (ok) dialog.leave(); } : undefined}
        saving={savingDoc}
      />
    </AppLayout>
  );
}
