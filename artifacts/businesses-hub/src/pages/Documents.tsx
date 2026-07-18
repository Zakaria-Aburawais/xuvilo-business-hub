import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  FileText, Receipt as ReceiptIcon, Quote, Search, Edit2, Copy, Trash2,
  Loader2, Plus, ArrowUpDown, ExternalLink, Download,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/utils/timeAgo";
import { formatCurrency } from "@/lib/calculations";
import {
  listDocuments, deleteDocument, duplicateDocument,
  STATUSES_BY_TYPE,
  type SavedDoc, type DocType, type DocStatus,
} from "@/lib/savedDocsApi";
import { rowsToCsv, downloadCsv } from "@/lib/csv";

type TabKey = "all" | DocType;

const TYPE_META: Record<DocType, { icon: typeof FileText; route: string; en: string; ar: string }> = {
  invoice:   { icon: FileText,    route: "/invoice",   en: "Invoice",   ar: "فاتورة" },
  quotation: { icon: Quote,       route: "/quotation", en: "Quotation", ar: "عرض سعر" },
  receipt:   { icon: ReceiptIcon, route: "/receipt",   en: "Receipt",   ar: "إيصال" },
};

const STATUS_COLOR: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent:      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  paid:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  overdue:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  accepted:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  expired:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  issued:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  void:      "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const { lang, isRTL } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAr = lang === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<{ all: number; invoice: number; quotation: number; receipt: number }>({ all: 0, invoice: 0, quotation: 0, receipt: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  // Read ?type=invoice|quotation|receipt deep-link from Dashboard "View all" links.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("type");
    if (t === "invoice" || t === "quotation" || t === "receipt") setTab(t);
  }, []);
  const [search, setSearch] = useState("");
  // Debounce search so each keystroke doesn't fire a request.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);
  const [statusFilter, setStatusFilter] = useState<"all" | DocStatus>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Export everything matching the current tab/filters (not just the loaded page).
  const exportCsv = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const all: SavedDoc[] = [];
      let offset = 0;
      const EXPORT_PAGE = 200;
      // Hard cap so a runaway loop can't hang the tab.
      for (let i = 0; i < 50; i++) {
        const r = await listDocuments({
          type: tab === "all" ? undefined : tab,
          status: statusFilter === "all" ? undefined : statusFilter,
          search: debouncedSearch || undefined,
          sort,
          limit: EXPORT_PAGE,
          offset,
        });
        all.push(...r.documents);
        offset += r.documents.length;
        if (r.documents.length === 0 || all.length >= r.total) break;
      }
      if (all.length === 0) {
        toast({ title: t("Nothing to export", "لا يوجد ما يمكن تصديره") });
        return;
      }
      const csv = rowsToCsv(all, [
        { key: "type", get: (d: SavedDoc) => d.type },
        { key: "title", get: (d) => d.title },
        { key: "client", get: (d) => d.clientName },
        { key: "amount", get: (d) => d.amount },
        { key: "currency", get: (d) => d.currency },
        { key: "status", get: (d) => d.status },
        { key: "created_at", get: (d) => d.createdAt },
        { key: "last_edited_at", get: (d) => d.lastEditedAt },
      ]);
      const stem = tab === "all" ? "documents" : `${tab}s`;
      downloadCsv(`${stem}.csv`, csv);
      toast({
        title: t("Export ready", "تم التصدير"),
        description: t(`${all.length} row${all.length === 1 ? "" : "s"} exported.`, `تم تصدير ${all.length} صفًا.`),
      });
    } catch (e) {
      toast({
        title: t("Export failed", "فشل التصدير"),
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exporting, tab, statusFilter, debouncedSearch, sort]);

  // Anonymous → bounce to login, preserving deep link.
  useEffect(() => {
    if (!user) navigate("/login?next=/documents");
  }, [user, navigate]);

  const PAGE_SIZE = 50;
  // Counts for the tab badges — one cheap "limit:1" request per type so we
  // can label tabs accurately even though pages are server-paginated.
  const refreshCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [all, inv, quo, rec] = await Promise.all([
        listDocuments({ limit: 1, offset: 0 }),
        listDocuments({ type: "invoice", limit: 1, offset: 0 }),
        listDocuments({ type: "quotation", limit: 1, offset: 0 }),
        listDocuments({ type: "receipt", limit: 1, offset: 0 }),
      ]);
      setCounts({ all: all.total, invoice: inv.total, quotation: quo.total, receipt: rec.total });
    } catch { /* counts are non-essential — UI still works */ }
  }, [user]);

  // Cancel races when filters change quickly.
  const fetchSeq = useRef(0);
  const buildOpts = useCallback((offset: number) => ({
    type: tab === "all" ? undefined : tab,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    sort,
    limit: PAGE_SIZE,
    offset,
  }), [tab, statusFilter, debouncedSearch, sort]);

  const load = useCallback(async () => {
    if (!user) return;
    const seq = ++fetchSeq.current;
    setLoading(true);
    try {
      const r = await listDocuments(buildOpts(0));
      if (seq !== fetchSeq.current) return; // a newer request superseded
      setDocs(r.documents);
      setTotal(r.total);
    } catch (e) {
      if (seq !== fetchSeq.current) return;
      toast({
        title: isAr ? "تعذر تحميل المستندات" : "Failed to load documents",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      if (seq === fetchSeq.current) setLoading(false);
    }
  // toast/isAr are stable enough for our purposes; including them caused
  // an infinite refetch loop earlier.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, buildOpts]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || docs.length >= total) return;
    setLoadingMore(true);
    try {
      const r = await listDocuments(buildOpts(docs.length));
      setDocs((prev) => [...prev, ...r.documents]);
      setTotal(r.total);
    } catch (e) {
      toast({
        title: isAr ? "تعذر تحميل المزيد" : "Could not load more",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingMore, docs.length, total, buildOpts]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void refreshCounts(); }, [refreshCounts]);

  // Status options scoped to the active tab. "all" tab shows the union.
  const statusOptions = useMemo<DocStatus[]>(() => {
    if (tab === "all") {
      const set = new Set<DocStatus>();
      (Object.keys(STATUSES_BY_TYPE) as DocType[]).forEach((k) => STATUSES_BY_TYPE[k].forEach((s) => set.add(s)));
      return Array.from(set);
    }
    return STATUSES_BY_TYPE[tab];
  }, [tab]);

  // Reset status filter when tab changes if the current filter no longer applies.
  useEffect(() => {
    if (statusFilter !== "all" && !statusOptions.includes(statusFilter)) {
      setStatusFilter("all");
    }
  }, [statusOptions, statusFilter]);

  // Filtering, sort, and pagination are all server-side now — `docs`
  // already represents the current page for the active filters.
  const onEdit = (d: SavedDoc) => {
    const route = TYPE_META[d.type].route;
    navigate(`${route}?documentId=${encodeURIComponent(d.id)}`);
  };

  const onDuplicate = async (d: SavedDoc) => {
    setBusy(true);
    try {
      const copy = await duplicateDocument(d.id);
      toast({ title: t("Document duplicated", "تم نسخ المستند") });
      // Optimistic update for snappy UX, then authoritative reload so the
      // row position/filtering reflects current query (e.g. status filter).
      setDocs((prev) => [copy, ...prev]);
      setTotal((n) => n + 1);
      void refreshCounts();
      void load();
    } catch (e) {
      toast({
        title: t("Could not duplicate", "تعذر النسخ"),
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally { setBusy(false); }
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await deleteDocument(deleteId);
      // Optimistic remove + authoritative reload (keeps page-size and
      // sort/filter state correct even when the deleted row spanned a page).
      setDocs((prev) => prev.filter((d) => d.id !== deleteId));
      setTotal((n) => Math.max(0, n - 1));
      void refreshCounts();
      void load();
      toast({ title: t("Document deleted", "تم حذف المستند") });
    } catch (e) {
      toast({
        title: t("Could not delete", "تعذر الحذف"),
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>{t("Documents — Xuvilo", "المستندات — Xuvilo")}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {t("Saved documents", "المستندات المحفوظة")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "Invoices, quotations and receipts you've saved to your workspace.",
                "الفواتير وعروض الأسعار والإيصالات المحفوظة في مساحة عملك.",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { void exportCsv(); }}
              disabled={exporting || loading || total === 0}
              data-testid="documents-export-csv"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t("Export CSV", "تصدير CSV")}
            </Button>
            <Link href="/invoice">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> {t("New invoice", "فاتورة جديدة")}
              </Button>
            </Link>
            <Link href="/quotation">
              <Button variant="outline" size="sm" className="gap-1.5 hidden sm:inline-flex">
                <Plus className="w-4 h-4" /> {t("New quotation", "عرض سعر")}
              </Button>
            </Link>
            <Link href="/receipt">
              <Button variant="outline" size="sm" className="gap-1.5 hidden md:inline-flex">
                <Plus className="w-4 h-4" /> {t("New receipt", "إيصال")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs — counts come from server (refreshed on mount + after CRUD). */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">{t("All", "الكل")} ({counts.all})</TabsTrigger>
            <TabsTrigger value="invoice" data-testid="tab-invoice">
              {t("Invoices", "الفواتير")} ({counts.invoice})
            </TabsTrigger>
            <TabsTrigger value="quotation" data-testid="tab-quotation">
              {t("Quotations", "عروض الأسعار")} ({counts.quotation})
            </TabsTrigger>
            <TabsTrigger value="receipt" data-testid="tab-receipt">
              {t("Receipts", "الإيصالات")} ({counts.receipt})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search by number or client", "بحث بالرقم أو العميل")}
              className="pl-9 rtl:pr-9 rtl:pl-3"
              data-testid="documents-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | DocStatus)}>
            <SelectTrigger className="w-full sm:w-44" data-testid="status-filter">
              <SelectValue placeholder={t("All statuses", "كل الحالات")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All statuses", "كل الحالات")}</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "oldest")}>
            <SelectTrigger className="w-full sm:w-44" data-testid="sort-select">
              <ArrowUpDown className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("Newest first", "الأحدث أولاً")}</SelectItem>
              <SelectItem value="oldest">{t("Oldest first", "الأقدم أولاً")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center" data-testid="empty-state">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-semibold mb-1">
                {counts.all === 0
                  ? t("No saved documents yet.", "لا توجد مستندات محفوظة بعد.")
                  : t("No documents match your filters.", "لا توجد مستندات تطابق التصفية.")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {counts.all === 0
                  ? t(
                      "Create your first invoice, quotation, or receipt.",
                      "أنشئ أول فاتورة أو عرض سعر أو إيصال.",
                    )
                  : t("Try clearing the search or status filter.", "حاول مسح البحث أو الحالة.")}
              </p>
              {counts.all === 0 && (
                <div className="flex justify-center gap-2">
                  <Link href="/invoice"><Button size="sm">{t("New invoice", "فاتورة جديدة")}</Button></Link>
                  <Link href="/quotation"><Button size="sm" variant="outline">{t("New quotation", "عرض سعر")}</Button></Link>
                  <Link href="/receipt"><Button size="sm" variant="outline">{t("New receipt", "إيصال")}</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {docs.map((d) => {
                  const meta = TYPE_META[d.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={d.id}
                      data-testid={`doc-row-${d.id}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="rounded-md bg-primary/10 text-primary p-2 flex-shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => onEdit(d)}
                              className="font-medium truncate hover:underline text-left"
                              data-testid={`doc-title-${d.id}`}
                            >
                              {d.title || t("Untitled", "بدون عنوان")}
                            </button>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {isAr ? meta.ar : meta.en}
                            </Badge>
                            <Badge className={`text-[10px] ${STATUS_COLOR[d.status] ?? "bg-gray-100 text-gray-700"}`}>
                              {d.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {d.clientName || t("No client", "لا يوجد عميل")}
                            {" • "}
                            {formatCurrency(d.amount, d.currency)}
                            {" • "}
                            {t("Edited ", "آخر تعديل ")}{timeAgo(d.lastEditedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(d)}
                          title={t("Edit", "تعديل")}
                          data-testid={`edit-${d.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDuplicate(d)}
                          disabled={busy}
                          title={t("Duplicate", "نسخ")}
                          data-testid={`duplicate-${d.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(d)}
                          title={t("Open & print", "افتح واطبع")}
                          data-testid={`open-${d.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(d.id)}
                          disabled={busy}
                          title={t("Delete", "حذف")}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          data-testid={`delete-${d.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination — show "Load more" while there are more results
            on the server. We deliberately avoid auto-infinite-scroll so
            the user keeps control of how much is fetched. */}
        {!loading && docs.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground" data-testid="docs-pager-summary">
              {t(
                `Showing ${docs.length} of ${total}`,
                `يعرض ${docs.length} من ${total}`,
              )}
            </div>
            {docs.length < total && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                data-testid="load-more"
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("Loading…", "جارٍ التحميل…")}</>
                ) : (
                  t("Load more", "تحميل المزيد")
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete this document?", "حذف هذا المستند؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This cannot be undone.", "لا يمكن التراجع عن هذا الإجراء.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete"
            >
              {t("Delete", "حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
