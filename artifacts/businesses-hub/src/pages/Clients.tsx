import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Edit2, Trash2, Users, Loader2, Search, Mail, Phone, Building2, Globe, FileText, Lock, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Helmet } from "react-helmet-async";
import {
  listClients as apiListClients,
  createClient as apiCreateClient,
  bulkCreateClients as apiBulkCreateClients,
  updateClient as apiUpdateClient,
  deleteClient as apiDeleteClient,
  type SavedClient,
} from "@/lib/savedDocsApi";
import { listSupportedVatCountries } from "@/lib/vatRates";
import { rowsToCsv, parseCsvTable, pickField, downloadCsv } from "@/lib/csv";
import { CsvImportPreviewDialog } from "@/components/CsvImportPreviewDialog";

type ClientImportRow = {
  name: string; company: string; email: string; phone: string;
  address: string; city: string; country: string; taxId: string; notes: string;
};

const FIELDS = ["name", "company", "email", "phone", "address", "city", "country", "taxId", "notes"] as const;
const RFQ_FIELDS = ["shortCode", "industry", "submissionEmail", "rfqFormatNotes", "specialRequirements"] as const;

const blank = {
  name: "", company: "", email: "", phone: "", address: "", city: "", country: "", taxId: "", notes: "",
  shortCode: "", industry: "", submissionEmail: "", rfqFormatNotes: "", specialRequirements: "",
};

export default function ClientsPage() {
  const { user } = useAuth();
  const { lang, isRTL } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAr = lang === "ar";

  const [clients, setClients] = useState<SavedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SavedClient | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const t = (en: string, ar: string) => (isAr ? ar : en);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiListClients();
      setClients(data);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to load clients", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.company, c.email, c.phone, c.country].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [clients, search]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await apiCreateClient(form);
        toast({ title: t("Client added", "تم إضافة العميل") });
      } else if (editing) {
        await apiUpdateClient(editing.id, form);
        toast({ title: t("Client updated", "تم تحديث العميل") });
      }
      await load();
      setEditing(null); setIsNew(false); setForm(blank);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiDeleteClient(id);
      await load();
      toast({ title: t("Client deleted", "تم حذف العميل") });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Delete failed", variant: "destructive" });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<ClientImportRow[] | null>(null);

  const exportCsv = () => {
    const csv = rowsToCsv(clients, [
      { key: "name", get: (c: SavedClient) => c.name },
      { key: "company", get: (c) => c.company },
      { key: "email", get: (c) => c.email },
      { key: "phone", get: (c) => c.phone },
      { key: "address", get: (c) => c.address },
      { key: "city", get: (c) => c.city ?? "" },
      { key: "country", get: (c) => c.country },
      { key: "tax_id", get: (c) => c.taxId },
      { key: "notes", get: (c) => c.notes ?? "" },
    ]);
    downloadCsv("clients.csv", csv);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const { rows, errors } = parseCsvTable(text);
      if (errors.length > 0) {
        toast({ title: t("Import failed", "فشل الاستيراد"), description: errors[0], variant: "destructive" });
        return;
      }
      const parsed = rows
        .map((r) => ({
          name: pickField(r, ["name", "client", "client_name", "full_name"]),
          company: pickField(r, ["company", "company_name", "organization"]),
          email: pickField(r, ["email", "e_mail", "mail"]),
          phone: pickField(r, ["phone", "mobile", "telephone", "tel"]),
          address: pickField(r, ["address", "street", "address_line"]),
          city: pickField(r, ["city", "town"]),
          country: pickField(r, ["country", "country_code"]).toUpperCase().slice(0, 2),
          taxId: pickField(r, ["tax_id", "taxid", "vat_id", "vat", "trn", "tax_number"]),
          notes: pickField(r, ["notes", "note", "comments"]),
        }))
        .filter((r) => r.name.trim());
      if (parsed.length === 0) {
        toast({
          title: t("No valid rows", "لا توجد صفوف صالحة"),
          description: t("Every row needs a 'name' column with a value.", "كل صف يحتاج إلى عمود 'name' يحتوي على قيمة."),
          variant: "destructive",
        });
        return;
      }
      setPendingImport(parsed);
    };
    reader.onerror = () => {
      toast({ title: t("Could not read file", "تعذرت قراءة الملف"), variant: "destructive" });
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      const created = await apiBulkCreateClients(pendingImport);
      setPendingImport(null);
      await load();
      const n = created.length;
      toast({
        title: t("Clients imported", "تم استيراد العملاء"),
        description: t(`${n} client${n === 1 ? "" : "s"} imported.`, `تم استيراد ${n} عميل.`),
      });
    } catch (e) {
      toast({
        title: t("Import failed", "فشل الاستيراد"),
        description: t(
          "No clients were saved. Fix the file and try again.",
          "لم يتم حفظ أي عميل. صحّح الملف وحاول مرة أخرى.",
        ),
        variant: "destructive",
      });
      void e;
    } finally {
      setImporting(false);
    }
  };

  const openEdit = (c: SavedClient) => {
    setEditing(c); setIsNew(false);
    setForm({
      name: c.name, company: c.company, email: c.email, phone: c.phone,
      address: c.address, city: c.city ?? "", country: c.country, taxId: c.taxId,
      notes: c.notes ?? "",
      shortCode: c.shortCode ?? "", industry: c.industry ?? "",
      submissionEmail: c.submissionEmail ?? "",
      rfqFormatNotes: c.rfqFormatNotes ?? "",
      specialRequirements: c.specialRequirements ?? "",
    });
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-md text-center bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
          <Lock className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">{t("Sign in to manage clients", "سجّل دخولك لإدارة العملاء")}</h1>
          <p className="text-sm text-muted-foreground mb-5">
            {t(
              "Save client contacts once and reuse them on every invoice, quotation, and receipt.",
              "احفظ بيانات عملائك مرة واحدة واستخدمها في كل فاتورة وعرض سعر وإيصال.",
            )}
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/login"><Button data-testid="login-link">{t("Log in", "تسجيل الدخول")}</Button></Link>
            <Link href="/signup"><Button variant="outline">{t("Sign up", "إنشاء حساب")}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8" dir={isRTL ? "rtl" : "ltr"}>
      <Helmet>
        <title>{t("Client Address Book — Xuvilo", "دفتر العناوين — Xuvilo")}</title>
        <meta name="description" content={t(
          "Save and manage your client contacts. Reuse on invoices, quotations and receipts.",
          "احفظ بيانات عملائك واستخدمها في الفواتير وعروض الأسعار والإيصالات.",
        )} />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              {t("Client Address Book", "دفتر العملاء")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                `${clients.length} saved · used automatically on new documents`,
                `${clients.length} عميل محفوظ · يُستخدم تلقائياً في المستندات الجديدة`,
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportFile}
              data-testid="clients-csv-input"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2"
              data-testid="clients-import-csv"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? t("Importing…", "جارٍ الاستيراد…") : t("Import CSV", "استيراد CSV")}
            </Button>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={clients.length === 0}
              className="gap-2"
              data-testid="clients-export-csv"
            >
              <Download className="w-4 h-4" /> {t("Export CSV", "تصدير CSV")}
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" data-testid="back-to-dashboard">{t("Dashboard", "لوحة التحكم")}</Button>
            </Link>
            <Button onClick={() => { setIsNew(true); setEditing(null); setForm(blank); }} className="gap-2 min-h-[44px]" data-testid="add-client-btn">
              <Plus className="w-4 h-4" /> {t("Add Client", "إضافة عميل")}
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="relative mb-4">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isRTL ? "right-3" : "left-3"}`} />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search clients…", "ابحث في العملاء…")}
              className={isRTL ? "pr-9" : "pl-9"}
              data-testid="clients-search"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("Loading clients…", "جاري التحميل…")}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? t("No matching clients", "لا توجد نتائج مطابقة")
                  : t("No clients yet. Add your first client.", "لا يوجد عملاء بعد. أضف أول عميل لك.")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800 transition group"
                data-testid={`client-card-${c.id}`}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 text-white font-semibold">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{c.name}</p>
                    {c.company && <span className="text-xs text-muted-foreground">· {c.company}</span>}
                    {c.documentCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1">
                        <FileText className="w-3 h-3" /> {c.documentCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                    {c.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {c.country}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 min-h-[44px] min-w-[44px]"
                    onClick={() => navigate(`/invoice?clientId=${encodeURIComponent(c.id)}`)}
                    title={t("New invoice for this client", "فاتورة جديدة لهذا العميل")}
                    data-testid={`client-invoice-${c.id}`}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 min-h-[44px] min-w-[44px]" onClick={() => openEdit(c)} data-testid={`client-edit-${c.id}`}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 min-h-[44px] min-w-[44px] text-red-500" onClick={() => setDeleteId(c.id)} data-testid={`client-delete-${c.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isNew || !!editing} onOpenChange={(o) => { if (!o) { setIsNew(false); setEditing(null); } }}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{isNew ? t("Add Client", "إضافة عميل") : t("Edit Client", "تعديل عميل")}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="contact" className="py-2">
            <TabsList className="mb-3">
              <TabsTrigger value="contact">{isAr ? "جهة الاتصال" : "Contact"}</TabsTrigger>
              <TabsTrigger value="rfq">{isAr ? "العطاءات والمشتريات" : "RFQ & Procurement"}</TabsTrigger>
            </TabsList>
            <TabsContent value="contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {FIELDS.map((f) => {
              const labels: Record<typeof FIELDS[number], { en: string; ar: string }> = {
                name:    { en: "Name *",       ar: "الاسم *" },
                company: { en: "Company",      ar: "الشركة" },
                email:   { en: "Email",        ar: "البريد الإلكتروني" },
                phone:   { en: "Phone",        ar: "الهاتف" },
                address: { en: "Address",      ar: "العنوان" },
                city:    { en: "City",         ar: "المدينة" },
                country: { en: "Country (ISO-2)", ar: "الدولة (ISO-2)" },
                taxId:   { en: "Tax / VAT ID", ar: "الرقم الضريبي" },
                notes:   { en: "Notes",        ar: "ملاحظات" },
              };
              const isCountry = f === "country";
              const isNotes = f === "notes";
              const wide = f === "address" || f === "notes";
              return (
                <div key={f} className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}>
                  <Label className="text-xs">{isAr ? labels[f].ar : labels[f].en}</Label>
                  {isCountry ? (
                    <select
                      value={form[f]}
                      onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                      className="w-full h-9 text-sm rounded-md border border-input bg-background px-2"
                      data-testid={`client-field-${f}`}
                    >
                      <option value="">—</option>
                      {listSupportedVatCountries().map((v) => (
                        <option key={v.country} value={v.country}>
                          {v.country} — {isAr ? v.countryAr : v.countryName}
                        </option>
                      ))}
                    </select>
                  ) : isNotes ? (
                    <textarea
                      value={form[f]}
                      onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                      className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5 min-h-[64px]"
                      rows={3}
                      placeholder={isAr ? "ملاحظات داخلية لا تظهر في المستندات" : "Internal notes — not shown on documents"}
                      data-testid={`client-field-${f}`}
                    />
                  ) : (
                    <Input
                      value={form[f]}
                      onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                      className="h-9 text-sm"
                      data-testid={`client-field-${f}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
            </TabsContent>
            <TabsContent value="rfq">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {RFQ_FIELDS.map((f) => {
                  const labels: Record<typeof RFQ_FIELDS[number], { en: string; ar: string; hint?: string }> = {
                    shortCode:           { en: "Short code",                ar: "الرمز المختصر",  hint: "e.g. ACME — used in RFQ ids" },
                    industry:            { en: "Industry",                  ar: "القطاع",          hint: "Oil & gas, utilities, telecom…" },
                    submissionEmail:     { en: "RFQ submission email",      ar: "بريد تقديم العطاء" },
                    rfqFormatNotes:      { en: "RFQ format / cover notes",  ar: "تنسيق العطاء" },
                    specialRequirements: { en: "Special requirements",      ar: "متطلبات خاصة" },
                  };
                  const wide = f === "rfqFormatNotes" || f === "specialRequirements";
                  const isLong = wide;
                  return (
                    <div key={f} className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}>
                      <Label className="text-xs">{isAr ? labels[f].ar : labels[f].en}</Label>
                      {isLong ? (
                        <textarea
                          value={form[f]}
                          onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                          className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5 min-h-[80px]"
                          rows={4}
                          data-testid={`client-field-${f}`}
                        />
                      ) : (
                        <Input
                          value={form[f]}
                          onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                          className="h-9 text-sm"
                          data-testid={`client-field-${f}`}
                        />
                      )}
                      {labels[f].hint && (
                        <p className="text-[10px] text-muted-foreground">{labels[f].hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsNew(false); setEditing(null); }}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={save} disabled={!form.name.trim() || saving} data-testid="client-save-btn">
              {saving ? t("Saving…", "جاري الحفظ…") : t("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportPreviewDialog
        open={!!pendingImport}
        rows={pendingImport ?? []}
        columns={[
          { label: t("Name", "الاسم"), get: (r: ClientImportRow) => r.name },
          { label: t("Company", "الشركة"), get: (r) => r.company },
          { label: t("Email", "البريد الإلكتروني"), get: (r) => r.email },
          { label: t("Phone", "الهاتف"), get: (r) => r.phone },
          { label: t("Country", "الدولة"), get: (r) => r.country },
        ]}
        title={t("Preview CSV import", "معاينة استيراد CSV")}
        description={t(
          `${pendingImport?.length ?? 0} client${(pendingImport?.length ?? 0) === 1 ? "" : "s"} will be created.`,
          `سيتم إنشاء ${pendingImport?.length ?? 0} عميل.`,
        )}
        confirmLabel={importing ? t("Importing…", "جارٍ الاستيراد…") : t("Import", "استيراد")}
        cancelLabel={t("Cancel", "إلغاء")}
        moreLabel={t(
          `…and ${Math.max((pendingImport?.length ?? 0) - 10, 0)} more row${(pendingImport?.length ?? 0) - 10 === 1 ? "" : "s"} not shown.`,
          `…و ${Math.max((pendingImport?.length ?? 0) - 10, 0)} صفوف أخرى غير معروضة.`,
        )}
        importing={importing}
        onConfirm={() => { void confirmImport(); }}
        onCancel={() => setPendingImport(null)}
        testIdPrefix="clients-import"
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete this client?", "حذف هذا العميل؟")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteId) { void remove(deleteId); setDeleteId(null); } }}
            >
              {t("Delete", "حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sentinel — keeps Building2 import used (some bundlers tree-shake unused icon refs visibly).
const _icons = [Building2];
void _icons;
