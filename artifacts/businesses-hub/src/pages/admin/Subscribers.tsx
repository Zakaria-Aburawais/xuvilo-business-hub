import { useEffect, useMemo, useState, useCallback } from "react";
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
  listNewsletterSubscribers,
  downloadNewsletterSubscribersCsv,
  unsubscribeNewsletterSubscriber,
  deleteNewsletterSubscriber,
  type NewsletterSubscriberItem,
} from "@/lib/adminApi";
import {
  Loader2,
  Mail,
  RefreshCw,
  AlertTriangle,
  Download,
  Search,
  Users,
  MoreHorizontal,
  UserMinus,
  Trash2,
  TrendingUp,
} from "lucide-react";

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
      </div>
    </AppLayout>
  );
}
