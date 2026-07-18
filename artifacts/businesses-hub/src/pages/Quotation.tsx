import { useState, useEffect } from "react";
import { Download, Printer, Eye, FileText, LayoutTemplate, BookmarkPlus, Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { Link, useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
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
import { CurrencyCombobox } from "@/components/ui/currency-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDocument, STATUSES_BY_TYPE, type DocStatus } from "@/lib/savedDocsApi";
import { timeAgo } from "@/utils/timeAgo";
import { useQuotationForm } from "@/hooks/useDocumentForm";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/document/InvoicePDF";
import { UpgradeModal } from "@/components/UpgradeModal";
import { vatForCurrency } from "@/lib/vatRates";
import { SendButtons } from "@/components/SendButtons";
import { useTracker } from "@/context/TrackerContext";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { syncSaveDocument } from "@/lib/docSyncApi";
import { notifyUsageChanged } from "@/hooks/useUsage";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

function genDocId() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function QuotationPage() {
  const { t, lang } = useLanguage();
  const form = useQuotationForm();
  const { quotationTemplate } = useTemplate();
  const { addDoc } = useTracker();
  const [, navigate] = useLocation();
  const { user, activeWorkspaceId } = useAuth();
  const { can } = usePlan();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [docTitle, setDocTitle] = useState("QUOTATION");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUsed, setUpgradeUsed] = useState(0);
  const [restoreTitle, setRestoreTitle] = useState<string>("");
  const [docStatus, setDocStatus] = useState<DocStatus>("draft");
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
    quotationNumber: form.quotationNumber, issueDate: form.issueDate, validityDate: form.validityDate,
    currency: form.currency, lineItems: form.lineItems, notes: form.notes, terms: form.terms,
    businessInfo: form.businessInfo, clientInfo: form.clientInfo,
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
        if (cancelled || doc.type !== "quotation") return;
        const p = (doc.payload ?? {}) as Record<string, unknown>;
        if (p.businessInfo) form.setBusinessInfo(p.businessInfo as typeof form.businessInfo);
        if (p.clientInfo) form.setClientInfo(p.clientInfo as typeof form.clientInfo);
        if (typeof p.quotationNumber === "string") form.setQuotationNumber(p.quotationNumber);
        if (typeof p.issueDate === "string") form.setIssueDate(p.issueDate);
        if (typeof p.validityDate === "string") form.setValidityDate(p.validityDate);
        if (typeof p.currency === "string") form.setCurrency(p.currency);
        if (Array.isArray(p.lineItems)) form.setLineItems(p.lineItems as typeof form.lineItems);
        if (typeof p.notes === "string") form.setNotes(p.notes);
        if (typeof p.terms === "string") form.setTerms(p.terms);
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
      const doc = docs.find((d) => d.id === id && d.type === "quotation");
      if (!doc || !doc.payload) return;
      setRestoreTitle(doc.title || "");
      const p = doc.payload as Record<string, unknown>;
      if (p.businessInfo) form.setBusinessInfo(p.businessInfo as typeof form.businessInfo);
      if (p.clientInfo) form.setClientInfo(p.clientInfo as typeof form.clientInfo);
      if (typeof p.quotationNumber === "string") form.setQuotationNumber(p.quotationNumber);
      if (typeof p.issueDate === "string") form.setIssueDate(p.issueDate);
      if (typeof p.validityDate === "string") form.setValidityDate(p.validityDate);
      if (typeof p.currency === "string") form.setCurrency(p.currency);
      if (Array.isArray(p.lineItems)) form.setLineItems(p.lineItems as typeof form.lineItems);
      if (typeof p.notes === "string") form.setNotes(p.notes);
      if (typeof p.terms === "string") form.setTerms(p.terms);
      setRestoreId(id);
      markClean();
      window.history.replaceState({}, "", window.location.pathname);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeWorkspaceId]);

  const handleSaveToDashboard = async () => {
    if (!user) { navigate("/login"); return false; }
    const payload = { quotationNumber: form.quotationNumber, issueDate: form.issueDate, validityDate: form.validityDate, currency: form.currency, lineItems: form.lineItems, notes: form.notes, terms: form.terms, businessInfo: form.businessInfo, clientInfo: form.clientInfo };
    const title = `Quotation #${form.quotationNumber}`;
    const clientName = form.clientInfo?.name || form.clientInfo?.company || "—";
    setSavingDoc(true);
    const result = await syncSaveDocument(
      { type: "quotation", title, clientName, amount: form.totals.grandTotal, currency: form.currency, status: docStatus, payload },
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
        id: result.doc.id, type: "quotation", title, clientName,
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
      description: restoreId ? "Your changes have been saved." : "Find it under Quotations in your dashboard.",
    });
    return true;
  };

  const handleWhatsApp = () => {
    const sym = getCurrencySymbol(form.currency);
    const lines = [
      `📋 Quotation / عرض سعر`,
      `من / From: ${form.businessInfo.name || "—"}`,
      ``,
      `رقم / #: ${form.quotationNumber}`,
      `📅 ${form.issueDate}`,
      `💰 ${sym} ${form.totals.grandTotal.toFixed(2)} ${form.currency}`,
      ``,
      `Powered by Xuvilo`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  return (
    <AppLayout>
      <SEOHead {...PAGE_SEO["/quotation"]} path="/quotation" structuredData={toolFaqJsonLd("quotation", lang === "ar")} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("tool.quotation.name")}</h1>
            {quotationTemplate !== "standard" && (
              <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 rounded-full capitalize">
                {quotationTemplate.replace(/-/g, " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/templates/quotation">
              <Button variant="outline" size="sm" className="flex items-center gap-2 border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950">
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
                  {STATUSES_BY_TYPE.quotation.map((s) => (
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
              <Link href="/login?next=/quotation">
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
            <span onClick={() => { addDoc({ type: "quotation", title: `Quotation #${form.quotationNumber}`, subtitle: form.clientInfo?.name || form.businessInfo?.name || "—", fileName: `quotation-${form.quotationNumber}.pdf`, dueDate: form.validityDate || undefined }); trackEvent("pdf_download", { tool: "quotation", language: lang }); }}>
              <PDFDownloadLink
                document={
                  <InvoicePDF
                    type="quotation"
                    businessInfo={form.businessInfo}
                    clientInfo={form.clientInfo}
                    docNumber={form.quotationNumber}
                    issueDate={form.issueDate}
                    dueOrValidityDate={form.validityDate}
                    dueOrValidityLabel={t("quot.validity_date")}
                    currency={form.currency}
                    lineItems={form.lineItems}
                    totals={form.totals}
                    notes={form.notes}
                    paymentDetails={form.paymentDetails}
                    signatureFooter={form.signatureFooter}
                    terms={form.terms}
                    watermark={can("save_documents") ? undefined : (lang === "ar" ? "أنشئ بواسطة Xuvilo — xuvilo.com" : "Created with Xuvilo — xuvilo.com")}
                  />
                }
                fileName={`quotation-${form.quotationNumber}.pdf`}
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
                type: "quotation",
                title: `Quotation #${form.quotationNumber}`,
                clientName: form.clientInfo?.name,
                amount: form.totals.grandTotal,
                currency: form.currency,
                number: form.quotationNumber,
                date: form.issueDate,
              }}
              size="sm"
            />
          </div>
        </div>

        {restoreId && (
          <EditingBanner
            docTitle={restoreTitle}
            docTypeLabel={{ en: "quotation", ar: "عرض السعر" }}
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
                ? "أنشئ حساباً مجانياً لحفظ عرض السعر هذا والوصول إليه لاحقاً."
                : "Create a free account to save this quotation and access it later."}
            </span>
            <Link href="/signup?next=/quotation">
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
            <ClientInfoForm clientInfo={form.clientInfo} onChange={form.setClientInfo} />
            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">{t("quot.details")}</h3>
              <div className="space-y-1 mb-1">
                <Label className="text-xs">{lang === "ar" ? "عنوان المستند" : "Document Title"}</Label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="QUOTATION"
                  className="h-8 text-sm font-semibold tracking-wide"
                  data-testid="doc-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("quot.number")}</Label>
                  <Input value={form.quotationNumber} onChange={(e) => form.setQuotationNumber(e.target.value)} data-testid="quotation-number" className="h-8 text-sm" />
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
                    return <p className="text-[11px] text-gray-500" data-testid="vat-suggestion">{label}</p>;
                  })()}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("doc.invoice_date")}</Label>
                  <Input type="date" value={form.issueDate} onChange={(e) => form.setIssueDate(e.target.value)} data-testid="issue-date" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("quot.validity_date")}</Label>
                  <Input type="date" value={form.validityDate} onChange={(e) => form.setValidityDate(e.target.value)} data-testid="validity-date" className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <Separator />

            <LineItemsTable
              items={form.lineItems}
              currency={form.currency}
              onAdd={form.addLineItem}
              onRemove={form.removeLineItem}
              onUpdate={form.updateLineItem}
              onImportCsv={(imported) => { if (imported.length > 0) form.setLineItems(imported); }}
              csvFilename={`quotation-${form.quotationNumber || "items"}`}
            />
            <TotalsSection totals={form.totals} currency={form.currency} />
            <Separator />

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("quot.terms")}</Label>
                <Textarea value={form.terms} onChange={(e) => form.setTerms(e.target.value)} rows={3} data-testid="terms" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("doc.notes")}</Label>
                <Textarea value={form.notes} onChange={(e) => form.setNotes(e.target.value)} rows={2} data-testid="notes" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("quot.acceptance")}</Label>
                <Input value={form.signatureFooter} onChange={(e) => form.setSignatureFooter(e.target.value)} data-testid="acceptance" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className={`${activeTab === "form" ? "hidden md:block" : ""} sticky top-20 self-start`}>
            <div className="overflow-auto max-h-[calc(100vh-7rem)]">
              <InvoicePreview
                type="quotation"
                customTitle={docTitle}
                template={quotationTemplate}
                businessInfo={form.businessInfo}
                clientInfo={form.clientInfo}
                docNumber={form.quotationNumber}
                issueDate={form.issueDate}
                dueOrValidityDate={form.validityDate}
                dueOrValidityLabel={t("quot.validity_date")}
                currency={form.currency}
                lineItems={form.lineItems}
                totals={form.totals}
                notes={form.notes}
                signatureFooter={form.signatureFooter}
                terms={form.terms}
              />
            </div>
          </div>
        </div>
      </div>
      <ToolSeoContent doc="quotation" />
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
