import { useState, useEffect } from "react";
import { Download, Printer, Eye, Receipt, LayoutTemplate, BookmarkPlus, Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { Link, useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToolSeoContent, toolFaqJsonLd } from "@/components/ToolSeoContent";
import { useTemplate } from "@/context/TemplateContext";
import { BusinessInfoForm } from "@/components/document/BusinessInfoForm";
import { ReceiptPreview } from "@/components/document/DocumentPreview";
import { EditingBanner } from "@/components/document/EditingBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReceiptForm } from "@/hooks/useDocumentForm";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { CurrencyCombobox } from "@/components/ui/currency-combobox";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReceiptPDF } from "@/components/document/ReceiptPDF";
import { UpgradeModal } from "@/components/UpgradeModal";
import { SendButtons } from "@/components/SendButtons";
import { useTracker } from "@/context/TrackerContext";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { syncSaveDocument } from "@/lib/docSyncApi";
import { notifyUsageChanged } from "@/hooks/useUsage";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { getDocument, STATUSES_BY_TYPE, type DocStatus } from "@/lib/savedDocsApi";
import { timeAgo } from "@/utils/timeAgo";

function genDocId() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ReceiptPage() {
  const { t, lang } = useLanguage();
  const form = useReceiptForm();
  const { receiptTemplate } = useTemplate();
  const { addDoc } = useTracker();
  const [, navigate] = useLocation();
  const { user, activeWorkspaceId } = useAuth();
  const { can } = usePlan();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [docTitle, setDocTitle] = useState("RECEIPT");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUsed, setUpgradeUsed] = useState(0);
  const [restoreTitle, setRestoreTitle] = useState<string>("");
  const [docStatus, setDocStatus] = useState<DocStatus>("issued");
  const [savingDoc, setSavingDoc] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [, setSavedTick] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const id = setInterval(() => setSavedTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [savedAt]);

  /* ── Unsaved-changes warning ─────────────────────────────────────── */
  const formSnapshot = JSON.stringify({
    receiptNumber: form.receiptNumber, date: form.date, payerName: form.payerName,
    amountReceived: form.amountReceived, currency: form.currency, paymentMethod: form.paymentMethod,
    referenceNumber: form.referenceNumber, notes: form.notes, businessInfo: form.businessInfo,
  });
  const { markClean, dialog } = useUnsavedChangesWarning(formSnapshot);

  /* ── Server-side restore via ?documentId=ID. */
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("documentId");
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const doc = await getDocument(id);
        if (cancelled || doc.type !== "receipt") return;
        const p = (doc.payload ?? {}) as Record<string, unknown>;
        if (p.businessInfo) form.setBusinessInfo(p.businessInfo as typeof form.businessInfo);
        if (typeof p.receiptNumber === "string") form.setReceiptNumber(p.receiptNumber);
        if (typeof p.date === "string") form.setDate(p.date);
        if (typeof p.payerName === "string") form.setPayerName(p.payerName);
        if (typeof p.amountReceived === "number") form.setAmountReceived(p.amountReceived);
        if (typeof p.currency === "string") form.setCurrency(p.currency);
        if (p.paymentMethod === "cash" || p.paymentMethod === "bank_transfer" || p.paymentMethod === "cheque" || p.paymentMethod === "card") form.setPaymentMethod(p.paymentMethod);
        if (typeof p.referenceNumber === "string") form.setReferenceNumber(p.referenceNumber);
        if (typeof p.notes === "string") form.setNotes(p.notes);
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
      const doc = docs.find((d) => d.id === id && d.type === "receipt");
      if (!doc || !doc.payload) return;
      setRestoreTitle(doc.title || "");
      const p = doc.payload as Record<string, unknown>;
      if (p.businessInfo) form.setBusinessInfo(p.businessInfo as typeof form.businessInfo);
      if (typeof p.receiptNumber === "string") form.setReceiptNumber(p.receiptNumber);
      if (typeof p.date === "string") form.setDate(p.date);
      if (typeof p.payerName === "string") form.setPayerName(p.payerName);
      if (typeof p.amountReceived === "number") form.setAmountReceived(p.amountReceived);
      if (typeof p.currency === "string") form.setCurrency(p.currency);
      if (p.paymentMethod === "cash" || p.paymentMethod === "bank_transfer" || p.paymentMethod === "cheque" || p.paymentMethod === "card") form.setPaymentMethod(p.paymentMethod);
      if (typeof p.referenceNumber === "string") form.setReferenceNumber(p.referenceNumber);
      if (typeof p.notes === "string") form.setNotes(p.notes);
      setRestoreId(id);
      markClean();
      window.history.replaceState({}, "", window.location.pathname);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeWorkspaceId]);

  const handleSaveToDashboard = async () => {
    if (!user) { navigate("/login"); return false; }
    const payload = { receiptNumber: form.receiptNumber, date: form.date, payerName: form.payerName, amountReceived: form.amountReceived, currency: form.currency, paymentMethod: form.paymentMethod, referenceNumber: form.referenceNumber, notes: form.notes, businessInfo: form.businessInfo };
    const title = `Receipt #${form.receiptNumber}`;
    const clientName = form.payerName || "—";
    setSavingDoc(true);
    const result = await syncSaveDocument(
      { type: "receipt", title, clientName, amount: form.amountReceived, currency: form.currency, status: docStatus, payload },
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
    try {
      const docsKey = `bh_docs_${user.email}_${activeWorkspaceId}`;
      let docs: Array<Record<string, unknown>> = [];
      try { docs = JSON.parse(localStorage.getItem(docsKey) || "[]"); } catch { /* noop */ }
      const mirror = {
        id: result.doc.id, type: "receipt", title, clientName,
        date: form.date, amount: form.amountReceived, currency: form.currency,
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
      description: restoreId ? "Your changes have been saved." : "Find it under Receipts in your dashboard.",
    });
    return true;
  };

  const handleWhatsApp = () => {
    const sym = getCurrencySymbol(form.currency);
    const lines = [
      `🧾 Receipt / إيصال`,
      `من / From: ${form.businessInfo.name || "—"}`,
      ``,
      `رقم / #: ${form.receiptNumber}`,
      `📅 ${form.date}`,
      `💰 ${sym} ${form.amountReceived.toFixed(2)} ${form.currency}`,
      ``,
      `Powered by Xuvilo`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  return (
    <AppLayout>
      <SEOHead {...PAGE_SEO["/receipt"]} path="/receipt" structuredData={toolFaqJsonLd("receipt", lang === "ar")} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("tool.receipt.name")}</h1>
            {receiptTemplate !== "full-a4" && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full capitalize">
                {receiptTemplate.replace(/-/g, " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/templates/receipt">
              <Button variant="outline" size="sm" className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950">
                <LayoutTemplate className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === "ar" ? "تغيير القالب" : "Change Template"}</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-2" data-testid="print-button">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{t("doc.print")}</span>
            </Button>
            <Button size="sm" onClick={handleWhatsApp} className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0">
              <WhatsAppIcon />
              <span className="hidden sm:inline">{lang === "ar" ? "واتساب" : "WhatsApp"}</span>
            </Button>
            {user && (
              <Select value={docStatus} onValueChange={(v) => setDocStatus(v as DocStatus)}>
                <SelectTrigger className="h-9 w-[112px] text-xs" data-testid="doc-status-select" title={lang === "ar" ? "الحالة" : "Status"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES_BY_TYPE.receipt.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {user ? (
              <Button size="sm" variant="outline" onClick={handleSaveToDashboard} disabled={savingDoc} className="flex items-center gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400" data-testid="save-to-dashboard-btn">
                {savingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                <span className="hidden sm:inline">Save</span>
              </Button>
            ) : (
              <Link href="/login?next=/receipt">
                <Button size="sm" variant="outline" className="flex items-center gap-2 text-gray-400" data-testid="save-to-dashboard-btn">
                  <BookmarkPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </Link>
            )}
            {user && (savingDoc || savedAt) && (
              <span className="hidden md:inline text-[11px] text-muted-foreground whitespace-nowrap" data-testid="save-indicator">
                {savingDoc ? (lang === "ar" ? "جارٍ الحفظ…" : "Saving…") : `${lang === "ar" ? "تم الحفظ " : "Saved "}${timeAgo(savedAt!.toISOString(), lang)}`}
              </span>
            )}
            <span onClick={() => { addDoc({ type: "receipt", title: `Receipt #${form.receiptNumber}`, subtitle: form.payerName || form.businessInfo?.name || "—", fileName: `receipt-${form.receiptNumber}.pdf` }); trackEvent("pdf_download", { tool: "receipt", language: lang }); }}>
              <PDFDownloadLink
                document={
                  <ReceiptPDF
                    businessInfo={form.businessInfo}
                    receiptNumber={form.receiptNumber}
                    date={form.date}
                    payerName={form.payerName}
                    amountReceived={form.amountReceived}
                    currency={form.currency}
                    paymentMethod={form.paymentMethod}
                    referenceNumber={form.referenceNumber}
                    notes={form.notes}
                    watermark={can("save_documents") ? undefined : (lang === "ar" ? "أنشئ بواسطة Xuvilo — xuvilo.com" : "Created with Xuvilo — xuvilo.com")}
                  />
                }
                fileName={`receipt-${form.receiptNumber}.pdf`}
              >
                {({ loading }) => (
                  <Button size="sm" disabled={loading} className="flex items-center gap-2" data-testid="download-pdf">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{loading ? t("common.loading") : t("doc.download_pdf")}</span>
                  </Button>
                )}
              </PDFDownloadLink>
            </span>
            <SendButtons
              doc={{
                type: "receipt",
                title: `Receipt #${form.receiptNumber}`,
                clientName: form.payerName,
                amount: form.amountReceived,
                currency: form.currency,
                number: form.receiptNumber,
                date: form.date,
              }}
              size="sm"
            />
          </div>
        </div>

        {restoreId && (
          <EditingBanner
            docTitle={restoreTitle}
            docTypeLabel={{ en: "receipt", ar: "الإيصال" }}
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

        {!user && (
          <div
            data-testid="anon-save-prompt"
            className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs sm:text-sm"
          >
            <span className="text-amber-800 dark:text-amber-200">
              {lang === "ar"
                ? "أنشئ حساباً مجانياً لحفظ هذا الإيصال والوصول إليه لاحقاً."
                : "Create a free account to save this receipt and access it later."}
            </span>
            <Link href="/signup?next=/receipt">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 h-7">
                {lang === "ar" ? "إنشاء حساب مجاني" : "Sign up free"}
              </Button>
            </Link>
          </div>
        )}

        <div className="md:hidden mb-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "form" | "preview")}>
            <TabsList className="w-full">
              <TabsTrigger value="form" className="flex-1">{t("doc.form")}</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">
                <Eye className="w-4 h-4 me-1" />{t("doc.preview")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="md:grid md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_1.2fr] gap-6">
          <div className={`space-y-6 ${activeTab === "preview" ? "hidden md:block" : ""}`}>
            <BusinessInfoForm businessInfo={form.businessInfo} onChange={form.setBusinessInfo} onLogoUpload={form.handleLogoUpload} />
            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">{t("rec.details")}</h3>
              <div className="space-y-1 mb-1">
                <Label className="text-xs">{lang === "ar" ? "عنوان المستند" : "Document Title"}</Label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="RECEIPT"
                  className="h-8 text-sm font-semibold tracking-wide"
                  data-testid="doc-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("rec.number")}</Label>
                  <Input value={form.receiptNumber} onChange={(e) => form.setReceiptNumber(e.target.value)} data-testid="receipt-number" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("rec.date")}</Label>
                  <Input type="date" value={form.date} onChange={(e) => form.setDate(e.target.value)} data-testid="receipt-date" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("doc.currency")}</Label>
                  <CurrencyCombobox value={form.currency} onValueChange={form.setCurrency} data-testid="currency-select" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("rec.payment_method")}</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => form.setPaymentMethod(v as typeof form.paymentMethod)}>
                    <SelectTrigger className="h-8 text-sm" data-testid="payment-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["cash", "bank_transfer", "cheque", "card"].map((m) => (
                        <SelectItem key={m} value={m}>{t(`rec.payment_methods.${m}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("rec.payer")}</Label>
                <Input value={form.payerName} onChange={(e) => form.setPayerName(e.target.value)} data-testid="payer-name" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("rec.amount")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountReceived || ""}
                  onChange={(e) => form.setAmountReceived(parseFloat(e.target.value) || 0)}
                  data-testid="amount-received"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("rec.reference")}</Label>
                <Input value={form.referenceNumber} onChange={(e) => form.setReferenceNumber(e.target.value)} data-testid="reference-number" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("rec.notes")}</Label>
                <Textarea value={form.notes} onChange={(e) => form.setNotes(e.target.value)} rows={2} data-testid="notes" className="text-sm" />
              </div>
            </div>
          </div>

          <div className={`${activeTab === "form" ? "hidden md:block" : ""} sticky top-20 self-start`}>
            <div className="overflow-auto max-h-[calc(100vh-7rem)]">
              <ReceiptPreview
                customTitle={docTitle}
                template={receiptTemplate}
                businessInfo={form.businessInfo}
                receiptNumber={form.receiptNumber}
                date={form.date}
                payerName={form.payerName}
                amountReceived={form.amountReceived}
                currency={form.currency}
                paymentMethod={form.paymentMethod}
                referenceNumber={form.referenceNumber}
                notes={form.notes}
              />
            </div>
          </div>
        </div>
      </div>
      <ToolSeoContent doc="receipt" />
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
