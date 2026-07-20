import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, isAdmin } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listNewsletterSubscribers,
  downloadNewsletterSubscribersCsv,
  importNewsletterSubscribers,
  unsubscribeNewsletterSubscriber,
  deleteNewsletterSubscriber,
  type NewsletterSubscriberItem,
} from "@/lib/adminApi";
import { analyzeSubscriberCsv, type CsvAnalysis, type CsvRowStatus } from "@/lib/csvImport";
import {
  Loader2,
  Mail,
  RefreshCw,
  AlertTriangle,
  Download,
  Upload,
  Search,
  Users,
  MoreHorizontal,
  UserMinus,
  Trash2,
  TrendingUp,
} from "lucide-react";

/** Max CSV file size accepted for import (2 MB ≈ well past 5000 rows). */
const IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Keep in sync with IMPORT_MAX_ROWS on the API server. */
const IMPORT_MAX_ROWS = 5000;
/** How many preview rows to render (all rows are still counted/imported). */
const IMPORT_PREVIEW_ROWS = 200;

const PAGE_SIZE = 50;

function formatDateTime(iso: string, lang: "en" | "ar"): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminNewsletterSubscribersPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<NewsletterSubscriberItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; last7Days: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "unsubscribe" | "delete";
    item: NewsletterSubscriberItem;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const isAdminUser = isAdmin(user);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/admin/newsletter-subscribers");
    }
  }, [user, navigate]);

  // Debounce the search input so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listNewsletterSubscribers({
        search: search || null,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setItems(resp.items);
      setTotal(resp.total);
      setStats(resp.stats ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load subscribers.";
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    if (!isAdminUser) return;
    void loadList();
  }, [isAdminUser, loadList]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { blob, filename } = await downloadNewsletterSubscribersCsv(
        search || null,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: isAR ? "تم تصدير القائمة" : "Export ready",
        description: isAR
          ? "تم تنزيل ملف CSV الخاص بالمشتركين."
          : "Subscribers CSV downloaded.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed.";
      toast({
        title: isAR ? "فشل التصدير" : "Export failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [search, toast, isAR]);

  // ── CSV import ────────────────────────────────────────────────────────
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importAnalysis, setImportAnalysis] = useState<CsvAnalysis | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [includeSuspicious, setIncludeSuspicious] = useState(true);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImportFileChosen = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Allow re-picking the same file later.
      e.target.value = "";
      if (!file) return;
      if (file.size > IMPORT_MAX_FILE_BYTES) {
        toast({
          title: isAR ? "الملف كبير جدًا" : "File too large",
          description: isAR
            ? "الحد الأقصى لملف الاستيراد هو 2 ميغابايت."
            : "Import files are capped at 2 MB.",
          variant: "destructive",
        });
        return;
      }
      try {
        const text = await file.text();
        const analysis = analyzeSubscriberCsv(text);
        if (analysis.rows.length === 0) {
          toast({
            title: isAR ? "ملف فارغ" : "Empty file",
            description: isAR
              ? "لم يتم العثور على أي صفوف في هذا الملف."
              : "No rows were found in this file.",
            variant: "destructive",
          });
          return;
        }
        setImportFileName(file.name);
        setIncludeSuspicious(true);
        setConsentConfirmed(false);
        setImportAnalysis(analysis);
      } catch {
        toast({
          title: isAR ? "تعذر قراءة الملف" : "Could not read file",
          variant: "destructive",
        });
      }
    },
    [isAR, toast],
  );

  const importableEmails = useMemo(() => {
    if (!importAnalysis) return [];
    return importAnalysis.rows
      .filter(
        (r) =>
          r.status === "valid" ||
          (includeSuspicious && r.status === "suspicious"),
      )
      .map((r) => r.email);
  }, [importAnalysis, includeSuspicious]);

  const closeImportDialog = useCallback(() => {
    setImportAnalysis(null);
    setImportFileName("");
    setConsentConfirmed(false);
  }, []);

  const handleRunImport = useCallback(async () => {
    if (importableEmails.length === 0 || !consentConfirmed || importing) return;
    setImporting(true);
    try {
      const resp = await importNewsletterSubscribers(importableEmails);
      const parts = isAR
        ? [
            `تمت إضافة ${resp.inserted}`,
            resp.skippedExisting > 0 ? `${resp.skippedExisting} مشتركون بالفعل` : "",
            resp.skippedUnsubscribed > 0
              ? `${resp.skippedUnsubscribed} ألغوا اشتراكهم سابقًا (لن تتم إعادة اشتراكهم)`
              : "",
            resp.skippedInvalid > 0 ? `${resp.skippedInvalid} غير صالحة` : "",
          ]
        : [
            `${resp.inserted} added`,
            resp.skippedExisting > 0 ? `${resp.skippedExisting} already subscribed` : "",
            resp.skippedUnsubscribed > 0
              ? `${resp.skippedUnsubscribed} previously unsubscribed (not re-added)`
              : "",
            resp.skippedInvalid > 0 ? `${resp.skippedInvalid} invalid` : "",
          ];
      toast({
        title: isAR ? "اكتمل الاستيراد" : "Import complete",
        description: parts.filter(Boolean).join(" · "),
      });
      closeImportDialog();
      await loadList();
    } catch (e) {
      toast({
        title: isAR ? "فشل الاستيراد" : "Import failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }, [importableEmails, consentConfirmed, importing, isAR, toast, closeImportDialog, loadList]);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    const { type, item } = pendingAction;
    try {
      if (type === "unsubscribe") {
        await unsubscribeNewsletterSubscriber(item.id);
        toast({
          title: isAR ? "تم إلغاء الاشتراك" : "Unsubscribed",
          description: isAR
            ? `تم إلغاء اشتراك ${item.email} من النشرة البريدية.`
            : `${item.email} has been unsubscribed from the newsletter.`,
        });
      } else {
        await deleteNewsletterSubscriber(item.id);
        toast({
          title: isAR ? "تم الحذف" : "Deleted",
          description: isAR
            ? `تم حذف ${item.email} نهائيًا من القائمة.`
            : `${item.email} has been permanently removed.`,
        });
      }
      setPendingAction(null);
      await loadList();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Action failed.";
      toast({
        title: isAR ? "فشلت العملية" : "Action failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setActionBusy(false);
    }
  }, [pendingAction, toast, isAR, loadList]);

  const totalPages = useMemo(
    () => (total > 0 ? Math.ceil(total / PAGE_SIZE) : 1),
    [total],
  );

  if (!user) return null;

  if (!isAdminUser) {
    return (
      <AppLayout>
        <SEOHead
          title="Admin · Newsletter Subscribers"
          description="Admin-only newsletter subscribers list."
          path="/admin/newsletter-subscribers"
          noindex
        />
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                {isAR ? "غير مصرح" : "Forbidden"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {isAR
                  ? "ليس لديك إذن للوصول إلى قائمة المشتركين."
                  : "You do not have permission to view newsletter subscribers."}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead
        title="Admin · Newsletter Subscribers"
        description="Browse and export newsletter subscribers."
        path="/admin/newsletter-subscribers"
        noindex
      />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <AdminNav />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="h-6 w-6" />
              {isAR ? "مشتركو النشرة البريدية" : "Newsletter Subscribers"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAR
                ? "تصفّح المشتركين في النشرة البريدية وصدّرهم كملف CSV."
                : "Browse newsletter signups and export the list as CSV."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={isAR ? "ابحث بالبريد..." : "Search by email..."}
                className="w-[240px] pl-8"
                data-testid="search-input"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void loadList()}
              disabled={loading}
              aria-label={isAR ? "تحديث" : "Refresh"}
              data-testid="refresh-button"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={() => void handleExport()}
              disabled={exporting || loading}
              data-testid="export-csv-button"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isAR ? "تصدير CSV" : "Export CSV"}
            </Button>
            <Button
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              data-testid="import-csv-button"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isAR ? "استيراد CSV" : "Import CSV"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => void handleImportFileChosen(e)}
              data-testid="import-csv-input"
            />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card data-testid="stat-total-subscribers">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                {isAR ? "إجمالي المشتركين" : "Total subscribers"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {stats ? stats.total.toLocaleString(isAR ? "ar-EG" : "en-US") : "—"}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="stat-last7days-subscribers">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {isAR ? "اشتراكات آخر ٧ أيام" : "Signups (last 7 days)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {stats
                  ? stats.last7Days.toLocaleString(isAR ? "ar-EG" : "en-US")
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center">
                <p className="text-rose-600 font-medium">
                  {isAR ? "تعذر التحميل" : "Failed to load"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => void loadList()}
                >
                  {isAR ? "إعادة المحاولة" : "Try again"}
                </Button>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {isAR ? "جارٍ التحميل..." : "Loading..."}
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>
                  {search
                    ? isAR
                      ? "لا يوجد مشتركون يطابقون بحثك."
                      : "No subscribers match your search."
                    : isAR
                      ? "لا يوجد مشتركون بعد."
                      : "No subscribers yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="subscribers-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAR ? "البريد" : "Email"}</TableHead>
                      <TableHead>{isAR ? "المصدر" : "Source"}</TableHead>
                      <TableHead>
                        {isAR ? "تاريخ الاشتراك" : "Signed up"}
                      </TableHead>
                      <TableHead className="w-[60px] text-right">
                        <span className="sr-only">
                          {isAR ? "إجراءات" : "Actions"}
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow
                        key={row.id}
                        data-testid={`subscriber-row-${row.id}`}
                      >
                        <TableCell className="font-medium">
                          <a
                            href={`mailto:${row.email}`}
                            className="text-primary hover:underline"
                          >
                            {row.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.source}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(row.createdAt, isAR ? "ar" : "en")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={isAR ? "إجراءات" : "Actions"}
                                data-testid={`row-actions-${row.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isAR ? "start" : "end"}>
                              <DropdownMenuItem
                                onClick={() =>
                                  setPendingAction({
                                    type: "unsubscribe",
                                    item: row,
                                  })
                                }
                                data-testid={`unsubscribe-action-${row.id}`}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                {isAR ? "إلغاء الاشتراك" : "Unsubscribe"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() =>
                                  setPendingAction({
                                    type: "delete",
                                    item: row,
                                  })
                                }
                                data-testid={`delete-action-${row.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isAR ? "حذف نهائي" : "Delete permanently"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div data-testid="pagination-summary">
              {isAR
                ? `صفحة ${page + 1} من ${totalPages} · ${total} مشترك`
                : `Page ${page + 1} of ${totalPages} · ${total} subscriber${total === 1 ? "" : "s"}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                data-testid="prev-page"
              >
                {isAR ? "السابق" : "Previous"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                data-testid="next-page"
              >
                {isAR ? "التالي" : "Next"}
              </Button>
            </div>
          </div>
        )}

        <AlertDialog
          open={pendingAction !== null}
          onOpenChange={(open) => {
            if (!open && !actionBusy) setPendingAction(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAction?.type === "delete"
                  ? isAR
                    ? "حذف المشترك نهائيًا؟"
                    : "Permanently delete subscriber?"
                  : isAR
                    ? "إلغاء اشتراك هذا البريد؟"
                    : "Unsubscribe this email?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction?.type === "delete"
                  ? isAR
                    ? `سيتم حذف ${pendingAction?.item.email ?? ""} نهائيًا من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.`
                    : `${pendingAction?.item.email ?? ""} will be permanently removed from the database. This cannot be undone.`
                  : isAR
                    ? `سيتم وضع علامة "غير مشترك" على ${pendingAction?.item.email ?? ""} ولن يظهر في القائمة أو التصدير بعد الآن.`
                    : `${pendingAction?.item.email ?? ""} will be marked as unsubscribed and will no longer appear in the list or CSV export.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy} data-testid="confirm-cancel">
                {isAR ? "إلغاء" : "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={actionBusy}
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmAction();
                }}
                className={
                  pendingAction?.type === "delete"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : undefined
                }
                data-testid="confirm-action"
              >
                {actionBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {pendingAction?.type === "delete"
                  ? isAR
                    ? "حذف نهائي"
                    : "Delete permanently"
                  : isAR
                    ? "إلغاء الاشتراك"
                    : "Unsubscribe"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CSV import preview + confirmation */}
        <Dialog
          open={importAnalysis !== null}
          onOpenChange={(open) => {
            if (!open && !importing) closeImportDialog();
          }}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="import-preview-dialog">
            <DialogHeader>
              <DialogTitle>
                {isAR ? "معاينة استيراد CSV" : "CSV import preview"}
              </DialogTitle>
              <DialogDescription>
                {importFileName}
                {importAnalysis && (
                  <>
                    {" · "}
                    {isAR
                      ? `${importAnalysis.rows.length} صفًا`
                      : `${importAnalysis.rows.length} rows`}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {importAnalysis && (
              <div className="space-y-4">
                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 text-xs" data-testid="import-summary">
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {isAR
                      ? `${importAnalysis.counts.valid} صالحة`
                      : `${importAnalysis.counts.valid} valid`}
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300">
                    {isAR
                      ? `${importAnalysis.counts.suspicious} مشبوهة`
                      : `${importAnalysis.counts.suspicious} suspicious`}
                  </Badge>
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300">
                    {isAR
                      ? `${importAnalysis.counts.invalid} غير صالحة (تُستبعد)`
                      : `${importAnalysis.counts.invalid} invalid (excluded)`}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                    {isAR
                      ? `${importAnalysis.counts.duplicate} مكررة (تُستبعد)`
                      : `${importAnalysis.counts.duplicate} duplicates (excluded)`}
                  </Badge>
                </div>

                {importAnalysis.rows.length > IMPORT_MAX_ROWS && (
                  <p className="text-sm text-rose-600" data-testid="import-too-many-rows">
                    {isAR
                      ? `يتجاوز الملف حد ${IMPORT_MAX_ROWS} صف لكل عملية استيراد. قسّم الملف وأعد المحاولة.`
                      : `This file exceeds the ${IMPORT_MAX_ROWS}-row limit per import. Split it and try again.`}
                  </p>
                )}

                {/* Suspicious rows toggle */}
                {importAnalysis.counts.suspicious > 0 && (
                  <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-amber-600"
                      checked={includeSuspicious}
                      onChange={(e) => setIncludeSuspicious(e.target.checked)}
                      data-testid="import-include-suspicious"
                    />
                    <span>
                      {isAR
                        ? `تضمين الصفوف المشبوهة (${importAnalysis.counts.suspicious}) — عناوين وظيفية مثل info@ أو نطاقات بريد مؤقت. راجعها في الجدول أدناه قبل التضمين.`
                        : `Include the ${importAnalysis.counts.suspicious} suspicious rows — role mailboxes like info@ or disposable domains. Review them in the table below before including.`}
                    </span>
                  </label>
                )}

                {/* Preview table */}
                <div className="max-h-72 overflow-y-auto rounded-md border">
                  <Table data-testid="import-preview-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">{isAR ? "سطر" : "Line"}</TableHead>
                        <TableHead>{isAR ? "البريد الإلكتروني" : "Email"}</TableHead>
                        <TableHead>{isAR ? "الحالة" : "Status"}</TableHead>
                        <TableHead>{isAR ? "السبب" : "Reason"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importAnalysis.rows.slice(0, IMPORT_PREVIEW_ROWS).map((r) => {
                        const statusMeta: Record<CsvRowStatus, { label: string; cls: string }> = {
                          valid: {
                            label: isAR ? "صالحة" : "Valid",
                            cls: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300",
                          },
                          suspicious: {
                            label: isAR ? "مشبوهة" : "Suspicious",
                            cls: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300",
                          },
                          invalid: {
                            label: isAR ? "غير صالحة" : "Invalid",
                            cls: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300",
                          },
                          duplicate: {
                            label: isAR ? "مكررة" : "Duplicate",
                            cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
                          },
                        };
                        const meta = statusMeta[r.status];
                        return (
                          <TableRow key={`${r.line}-${r.raw}`} data-testid={`import-row-${r.line}`}>
                            <TableCell className="text-xs text-muted-foreground">{r.line}</TableCell>
                            <TableCell className="font-mono text-xs break-all" dir="ltr">
                              {r.raw || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={meta.cls}>{meta.label}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.reason ?? ""}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {importAnalysis.rows.length > IMPORT_PREVIEW_ROWS && (
                    <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                      {isAR
                        ? `يعرض أول ${IMPORT_PREVIEW_ROWS} صفًا — تُحتسب بقية الصفوف وتُستورد وفق نفس القواعد.`
                        : `Showing the first ${IMPORT_PREVIEW_ROWS} rows — the rest are counted and imported under the same rules.`}
                    </p>
                  )}
                </div>

                {/* Consent gate — the import button stays disabled until this
                    is explicitly ticked, so a stray click can't import. */}
                <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={consentConfirmed}
                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                    data-testid="import-consent-checkbox"
                  />
                  <span>
                    {isAR
                      ? "أؤكد أن هؤلاء الأشخاص وافقوا على استلام رسائل بريدية من Xuvilo، وأتحمل مسؤولية هذا الاستيراد."
                      : "I confirm these recipients agreed to receive emails from Xuvilo, and I take responsibility for this import."}
                  </span>
                </label>
                <p className="text-xs text-muted-foreground">
                  {isAR
                    ? "لن تُعاد إضافة العناوين التي سبق أن ألغت اشتراكها — يتطلب ذلك موافقة جديدة من صاحب البريد نفسه."
                    : "Addresses that previously unsubscribed will not be re-added — that requires the person to opt in again themselves."}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeImportDialog}
                disabled={importing}
                data-testid="import-cancel-button"
              >
                {isAR ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={() => void handleRunImport()}
                disabled={
                  importing ||
                  !consentConfirmed ||
                  importableEmails.length === 0 ||
                  (importAnalysis?.rows.length ?? 0) > IMPORT_MAX_ROWS
                }
                data-testid="import-confirm-button"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isAR
                  ? `استيراد ${importableEmails.length.toLocaleString("ar-EG")} مشتركًا`
                  : `Import ${importableEmails.length.toLocaleString("en-US")} subscriber${importableEmails.length === 1 ? "" : "s"}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
