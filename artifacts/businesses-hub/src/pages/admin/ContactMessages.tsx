import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  listContactMessages,
  getContactMessage,
  updateContactMessageTriage,
  resendContactMessage,
  type ContactResendError,
  type ContactMessageListItem,
  type ContactMessageDetail,
  type ContactStatusFilterValue,
  type ContactTriageStatus,
  type ContactTriageFilterValue,
} from "@/lib/adminApi";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Inbox,
  RefreshCw,
  Mail,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  XCircle,
  Search,
  X,
  Send,
} from "lucide-react";

type StatusFilter = "all" | ContactStatusFilterValue;
type TriageFilter = "all" | ContactTriageFilterValue;

const DEFAULT_FILTER: StatusFilter = "needs_follow_up";
const DEFAULT_TRIAGE_FILTER: TriageFilter = "all";

const TRIAGE_CHIPS: Array<{ value: TriageFilter; en: string; ar: string }> = [
  { value: "all", en: "All", ar: "الكل" },
  { value: "new", en: "New", ar: "جديدة" },
  { value: "unresolved", en: "Unresolved", ar: "غير محلولة" },
  { value: "read", en: "Read", ar: "مقروءة" },
  { value: "resolved", en: "Resolved", ar: "محلولة" },
];

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const re = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = text.split(re);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="bg-yellow-200 text-inherit rounded-sm px-0.5 dark:bg-yellow-500/40"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function statusBadge(status: string, isAR: boolean) {
  const labelMap: Record<string, { en: string; ar: string }> = {
    sent: { en: "Sent", ar: "تم الإرسال" },
    partial: { en: "Partial", ar: "جزئي" },
    failed: { en: "Failed", ar: "فشل" },
    pending: { en: "Pending", ar: "قيد الانتظار" },
  };
  const label = labelMap[status]
    ? isAR
      ? labelMap[status].ar
      : labelMap[status].en
    : status;

  let classes = "bg-slate-100 text-slate-700 border-slate-200";
  let Icon = CircleDot;
  if (status === "sent") {
    classes = "bg-emerald-100 text-emerald-800 border-emerald-200";
    Icon = CheckCircle2;
  } else if (status === "partial") {
    classes = "bg-amber-100 text-amber-800 border-amber-200";
    Icon = AlertTriangle;
  } else if (status === "failed") {
    classes = "bg-rose-100 text-rose-800 border-rose-200";
    Icon = XCircle;
  } else if (status === "pending") {
    classes = "bg-sky-100 text-sky-800 border-sky-200";
    Icon = CircleDot;
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1 ${classes}`}
      data-testid={`status-badge-${status}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function triageBadge(status: string, isAR: boolean) {
  const labelMap: Record<string, { en: string; ar: string }> = {
    new: { en: "New", ar: "جديدة" },
    read: { en: "Read", ar: "مقروءة" },
    resolved: { en: "Resolved", ar: "محلولة" },
  };
  const label = labelMap[status]
    ? isAR
      ? labelMap[status].ar
      : labelMap[status].en
    : status;

  let classes = "bg-blue-100 text-blue-800 border-blue-200";
  let Icon = CircleDot;
  if (status === "read") {
    classes = "bg-slate-100 text-slate-700 border-slate-200";
    Icon = Mail;
  } else if (status === "resolved") {
    classes = "bg-emerald-100 text-emerald-800 border-emerald-200";
    Icon = CheckCircle2;
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1 ${classes}`}
      data-testid={`triage-badge-${status}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function AdminContactMessagesPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchString = useSearch();

  // URL query string is the source of truth for filter, search, and page.
  const { filter, triageFilter, search, page } = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const statusParam = params.get("status");
    const validStatuses: StatusFilter[] = [
      "all",
      "needs_follow_up",
      "sent",
      "partial",
      "failed",
      "pending",
    ];
    const filter: StatusFilter = validStatuses.includes(
      statusParam as StatusFilter,
    )
      ? (statusParam as StatusFilter)
      : DEFAULT_FILTER;
    const triageParam = params.get("triage");
    const validTriage: TriageFilter[] = [
      "all",
      "new",
      "unresolved",
      "read",
      "resolved",
    ];
    const triageFilter: TriageFilter = validTriage.includes(
      triageParam as TriageFilter,
    )
      ? (triageParam as TriageFilter)
      : DEFAULT_TRIAGE_FILTER;
    const search = (params.get("q") || "").trim();
    const pageParam = parseInt(params.get("page") || "1", 10);
    const page =
      Number.isFinite(pageParam) && pageParam >= 1 ? pageParam - 1 : 0;
    return { filter, triageFilter, search, page };
  }, [searchString]);

  const updateUrl = useCallback(
    (
      next: {
        q?: string;
        status?: StatusFilter;
        triage?: TriageFilter;
        page?: number;
      },
      opts?: { replace?: boolean },
    ) => {
      const q = next.q !== undefined ? next.q : search;
      const status = next.status !== undefined ? next.status : filter;
      const triage = next.triage !== undefined ? next.triage : triageFilter;
      const pageNum = next.page !== undefined ? next.page : page;
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status !== DEFAULT_FILTER) params.set("status", status);
      if (triage !== DEFAULT_TRIAGE_FILTER) params.set("triage", triage);
      if (pageNum > 0) params.set("page", String(pageNum + 1));
      const qs = params.toString();
      navigate(`/admin/contact-messages${qs ? `?${qs}` : ""}`, {
        replace: opts?.replace ?? false,
      });
    },
    [search, filter, triageFilter, page, navigate],
  );

  const [searchInput, setSearchInput] = useState(search);
  const [items, setItems] = useState<ContactMessageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactMessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const isAdminUser = isAdmin(user);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/admin/contact-messages");
    }
  }, [user, navigate]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await listContactMessages({
        status: filter === "all" ? null : filter,
        triage: triageFilter === "all" ? null : triageFilter,
        q: search || null,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setItems(resp.items);
      setTotal(resp.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load messages.";
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter, triageFilter, search, page]);

  // Keep the input box in sync when the URL changes externally
  // (back/forward navigation, pasted links).
  const lastAppliedSearch = useRef(search);
  useEffect(() => {
    if (search !== lastAppliedSearch.current) {
      lastAppliedSearch.current = search;
      setSearchInput(search);
    }
  }, [search]);

  // Debounce search input into the URL (reset to first page).
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== search) {
        lastAppliedSearch.current = trimmed;
        updateUrl({ q: trimmed, page: 0 }, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, search, updateUrl]);

  useEffect(() => {
    if (!isAdminUser) return;
    void loadList();
  }, [isAdminUser, loadList]);

  const [updatingTriageId, setUpdatingTriageId] = useState<string | null>(
    null,
  );

  const setTriage = useCallback(
    async (id: string, triageStatus: ContactTriageStatus) => {
      setUpdatingTriageId(id);
      try {
        await updateContactMessageTriage(id, triageStatus);
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, triageStatus } : it)),
        );
        setDetail((prev) =>
          prev && prev.id === id ? { ...prev, triageStatus } : prev,
        );
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to update status.";
        toast({
          title: isAR ? "تعذر تحديث الحالة" : "Could not update status",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setUpdatingTriageId(null);
      }
    },
    [isAR, toast],
  );

  const [resendingId, setResendingId] = useState<string | null>(null);

  const resend = useCallback(
    async (id: string) => {
      setResendingId(id);
      try {
        const resp = await resendContactMessage(id);
        setItems((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, mailStatus: resp.mailStatus } : it,
          ),
        );
        setDetail((prev) =>
          prev && prev.id === id
            ? { ...prev, mailStatus: resp.mailStatus }
            : prev,
        );
        if (resp.mailStatus === "sent") {
          toast({
            title: isAR ? "تم إعادة الإرسال" : "Emails resent",
            description: isAR
              ? "تم إرسال بريد الزائر وإشعار الفريق بنجاح."
              : "Both the visitor auto-reply and the team notification were sent.",
          });
        } else {
          toast({
            title: isAR ? "إعادة إرسال جزئية" : "Partial resend",
            description: isAR
              ? "نجح أحد البريدين فقط. يمكنك المحاولة مرة أخرى."
              : "Only one of the two emails succeeded. You can try again.",
            variant: "destructive",
          });
        }
      } catch (e) {
        const err = e as ContactResendError;
        if (err.mailStatus) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === id ? { ...it, mailStatus: err.mailStatus! } : it,
            ),
          );
          setDetail((prev) =>
            prev && prev.id === id
              ? { ...prev, mailStatus: err.mailStatus! }
              : prev,
          );
        }
        toast({
          title: isAR ? "فشل إعادة الإرسال" : "Resend failed",
          description:
            err instanceof Error
              ? err.message
              : isAR
                ? "تعذر إعادة إرسال البريد."
                : "Could not resend the emails.",
          variant: "destructive",
        });
      } finally {
        setResendingId(null);
      }
    },
    [isAR, toast],
  );

  const openDetail = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);
      try {
        const resp = await getContactMessage(id);
        setDetail(resp.item);
        // Opening a "new" message automatically marks it as read.
        if (resp.item.triageStatus === "new") {
          void setTriage(id, "read");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load message.";
        setDetailError(msg);
        toast({
          title: isAR ? "تعذر تحميل الرسالة" : "Could not load message",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [isAR, toast, setTriage],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  }, []);

  const totalPages = useMemo(
    () => (total > 0 ? Math.ceil(total / PAGE_SIZE) : 1),
    [total],
  );

  if (!user) return null;

  if (!isAdminUser) {
    return (
      <AppLayout>
        <SEOHead
          title="Admin · Contact Inbox"
          description="Admin-only contact message inbox."
          path="/admin/contact-messages"
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
                  ? "ليس لديك إذن للوصول إلى صندوق الرسائل."
                  : "You do not have permission to view the contact inbox."}
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
        title="Admin · Contact Inbox"
        description="Browse contact-form submissions."
        path="/admin/contact-messages"
        noindex
      />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <AdminNav />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Inbox className="h-6 w-6" />
              {isAR ? "صندوق رسائل التواصل" : "Contact Inbox"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAR
                ? "تصفّح طلبات نموذج التواصل وحالة إشعارات البريد."
                : "Browse contact-form submissions and the status of their email notifications."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  isAR
                    ? "بحث بالاسم أو البريد أو الموضوع..."
                    : "Search name, email, or subject..."
                }
                className="w-[260px] ps-9 pe-8"
                data-testid="search-input"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={isAR ? "مسح البحث" : "Clear search"}
                  data-testid="clear-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select
              value={filter}
              onValueChange={(v) =>
                updateUrl({ status: v as StatusFilter, page: 0 })
              }
            >
              <SelectTrigger
                className="w-[180px]"
                data-testid="status-filter-trigger"
              >
                <SelectValue
                  placeholder={isAR ? "كل الحالات" : "All statuses"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="needs_follow_up">
                  {isAR ? "تحتاج متابعة" : "Needs follow-up"}
                </SelectItem>
                <SelectItem value="all">
                  {isAR ? "كل الحالات" : "All statuses"}
                </SelectItem>
                <SelectItem value="sent">
                  {isAR ? "تم الإرسال" : "Sent"}
                </SelectItem>
                <SelectItem value="partial">
                  {isAR ? "جزئي" : "Partial"}
                </SelectItem>
                <SelectItem value="failed">{isAR ? "فشل" : "Failed"}</SelectItem>
                <SelectItem value="pending">
                  {isAR ? "قيد الانتظار" : "Pending"}
                </SelectItem>
              </SelectContent>
            </Select>
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
          </div>
        </div>

        <div
          className="mb-4 flex flex-wrap items-center gap-2"
          data-testid="triage-filter-chips"
        >
          {TRIAGE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => updateUrl({ triage: chip.value, page: 0 })}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                triageFilter === chip.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
              data-testid={`triage-chip-${chip.value}`}
            >
              {isAR ? chip.ar : chip.en}
            </button>
          ))}
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
                <p data-testid="empty-state-text">
                  {search
                    ? isAR
                      ? `لا توجد نتائج للبحث "${search}".`
                      : `No messages match your search "${search}".`
                    : isAR
                      ? "لا توجد رسائل تطابق هذا الفلتر."
                      : "No messages match this filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="messages-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAR ? "التاريخ" : "Received"}</TableHead>
                      <TableHead>{isAR ? "الاسم" : "Name"}</TableHead>
                      <TableHead>{isAR ? "البريد" : "Email"}</TableHead>
                      <TableHead>{isAR ? "الموضوع" : "Subject"}</TableHead>
                      <TableHead>{isAR ? "اللغة" : "Lang"}</TableHead>
                      <TableHead>{isAR ? "حالة البريد" : "Mail"}</TableHead>
                      <TableHead>{isAR ? "الحالة" : "Status"}</TableHead>
                      <TableHead className="text-end">
                        {isAR ? "إجراءات" : "Actions"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => void openDetail(row.id)}
                        data-testid={`message-row-${row.id}`}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(row.createdAt, isAR ? "ar" : "en")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.name ? highlightMatch(row.name, search) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.email ? (
                            <a
                              href={`mailto:${row.email}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`row-email-link-${row.id}`}
                            >
                              {highlightMatch(row.email, search)}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {row.subject
                            ? highlightMatch(row.subject, search)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm uppercase">
                          {row.lang || "—"}
                        </TableCell>
                        <TableCell>
                          {statusBadge(row.mailStatus, isAR)}
                        </TableCell>
                        <TableCell>
                          {triageBadge(row.triageStatus, isAR)}
                        </TableCell>
                        <TableCell
                          className="text-end whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.mailStatus !== "sent" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="me-2"
                              disabled={resendingId === row.id}
                              onClick={() => void resend(row.id)}
                              data-testid={`resend-button-${row.id}`}
                            >
                              {resendingId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 me-1" />
                                  {isAR ? "إعادة إرسال" : "Resend"}
                                </>
                              )}
                            </Button>
                          )}
                          {row.triageStatus === "resolved" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updatingTriageId === row.id}
                              onClick={() => void setTriage(row.id, "read")}
                              data-testid={`reopen-button-${row.id}`}
                            >
                              {updatingTriageId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isAR ? (
                                "إعادة فتح"
                              ) : (
                                "Reopen"
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={updatingTriageId === row.id}
                              onClick={() =>
                                void setTriage(row.id, "resolved")
                              }
                              data-testid={`resolve-button-${row.id}`}
                            >
                              {updatingTriageId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isAR ? (
                                "تم الحل"
                              ) : (
                                "Resolve"
                              )}
                            </Button>
                          )}
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
                ? `صفحة ${page + 1} من ${totalPages} · ${total} رسالة`
                : `Page ${page + 1} of ${totalPages} · ${total} message${total === 1 ? "" : "s"}`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => updateUrl({ page: Math.max(0, page - 1) })}
                data-testid="prev-page"
              >
                {isAR ? "السابق" : "Previous"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => updateUrl({ page: page + 1 })}
                data-testid="next-page"
              >
                {isAR ? "التالي" : "Next"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.subject ||
                (isAR ? "تفاصيل الرسالة" : "Message details")}
            </DialogTitle>
            {detail ? (
              <DialogDescription className="flex flex-wrap items-center gap-2 pt-2">
                <span>{detail.name}</span>
                <span className="text-muted-foreground">·</span>
                <a
                  href={`mailto:${detail.email}`}
                  className="text-primary hover:underline"
                  data-testid="detail-email-link"
                >
                  {detail.email}
                </a>
                <span className="text-muted-foreground">·</span>
                <span>{formatDateTime(detail.createdAt, isAR ? "ar" : "en")}</span>
                {statusBadge(detail.mailStatus, isAR)}
                {triageBadge(detail.triageStatus, isAR)}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {isAR ? "جارٍ التحميل..." : "Loading..."}
            </div>
          ) : detailError ? (
            <p className="text-rose-600 text-sm" data-testid="detail-error">
              {detailError}
            </p>
          ) : detail ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  {isAR ? "الرسالة" : "Message"}
                </div>
                <div
                  className="whitespace-pre-wrap text-sm leading-6 rounded-md border bg-muted/30 p-3"
                  data-testid="detail-message-body"
                >
                  {detail.message || "—"}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    {isAR ? "اللغة" : "Language"}
                  </div>
                  <div className="uppercase">{detail.lang || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    {isAR ? "عنوان IP" : "IP address"}
                  </div>
                  <div className="font-mono text-xs break-all">
                    {detail.ip || "—"}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    {isAR ? "وكيل المستخدم" : "User agent"}
                  </div>
                  <div className="font-mono text-xs break-all">
                    {detail.userAgent || "—"}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                {detail.triageStatus === "resolved" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingTriageId === detail.id}
                    onClick={() => void setTriage(detail.id, "read")}
                    data-testid="detail-reopen-button"
                  >
                    {updatingTriageId === detail.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAR ? (
                      "إعادة فتح"
                    ) : (
                      "Reopen"
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={updatingTriageId === detail.id}
                    onClick={() => void setTriage(detail.id, "resolved")}
                    data-testid="detail-resolve-button"
                  >
                    {updatingTriageId === detail.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAR ? (
                      "وضع علامة تم الحل"
                    ) : (
                      "Mark as resolved"
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
