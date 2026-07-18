import { useState, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInvoiceTrack } from "@/context/InvoiceTrackContext";
import { useAuth } from "@/context/AuthContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import { Link } from "wouter";
import { computeInvoiceStatus, buildShareUrl, type InvoiceTrackEntry, type InvoiceTrackStatus } from "@/utils/invoiceTracking";
import {
  FileText, Trash2, DollarSign, CheckCircle2, Clock, Send,
  Eye, BadgeDollarSign, AlertTriangle, Share2, Copy, Check, ExternalLink,
  BarChart3, TrendingUp, Inbox, LogIn, Crown, Sparkles, Zap, BellRing,
} from "lucide-react";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { trackEvent } from "@/lib/analytics";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function fmtAmt(amount: number, currency: string, lang: string): string {
  const sym = getCurrencySymbol(currency);
  const n = new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount);
  return `${sym} ${n}`;
}

function fmtDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STATUS_META: Record<InvoiceTrackStatus, {
  label: string; labelAr: string; icon: typeof FileText;
  color: string; bg: string; border: string;
}> = {
  sent:      { label: "Sent",      labelAr: "مُرسَل",    icon: Send,            color: "text-gray-600 dark:text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800",          border: "border-gray-200 dark:border-gray-700" },
  seen:      { label: "Seen",      labelAr: "تمت المشاهدة", icon: Eye,            color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/30",         border: "border-blue-200 dark:border-blue-800" },
  confirmed: { label: "Confirmed", labelAr: "مؤكد",      icon: CheckCircle2,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30",  border: "border-emerald-200 dark:border-emerald-800" },
  paid:      { label: "Paid",      labelAr: "مدفوع",     icon: BadgeDollarSign, color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/30",       border: "border-green-200 dark:border-green-800" },
  overdue:   { label: "Overdue",   labelAr: "متأخر",     icon: AlertTriangle,   color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-900/30",           border: "border-red-200 dark:border-red-800" },
};

const FILTER_TABS: Array<InvoiceTrackStatus | "all"> = ["all", "sent", "seen", "confirmed", "paid", "overdue"];

/* ── InvoiceRow ───────────────────────────────────────────────────────────── */

function InvoiceRow({
  entry, lang, onMarkPaid, onDelete,
}: {
  entry: InvoiceTrackEntry; lang: string; onMarkPaid: () => void; onDelete: () => void;
}) {
  const isAR = lang === "ar";
  const effectiveStatus = computeInvoiceStatus(entry);
  const meta = STATUS_META[effectiveStatus];
  const Icon = meta.icon;
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(buildShareUrl(entry.id)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const t = (en: string, ar: string) => isAR ? ar : en;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Invoice # */}
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">#{entry.invoiceNumber || entry.id}</p>
            <p className="text-[11px] text-gray-400 font-mono">{entry.id}</p>
          </div>
        </div>
      </td>

      {/* Client */}
      <td className="px-4 py-3 text-sm">
        <p className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[140px]">{entry.clientName || "—"}</p>
      </td>

      {/* Amount */}
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
        {fmtAmt(entry.amount, entry.currency, lang)}
      </td>

      {/* Dates */}
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        <div>{fmtDate(entry.issueDate, lang)}</div>
        {entry.dueDate && (
          <div className={`mt-0.5 ${effectiveStatus === "overdue" ? "text-red-500" : ""}`}>
            ↳ {fmtDate(entry.dueDate, lang)}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color} ${meta.border} border`}>
          <Icon className="w-3 h-3" />
          {isAR ? meta.labelAr : meta.label}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          <Link href={`/invoice/track/${entry.id}`}>
            <button title={t("View", "عرض")} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </Link>

          <button
            onClick={handleCopy}
            title={t("Copy share link", "نسخ رابط المشاركة")}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {effectiveStatus !== "paid" && (
            <button
              onClick={onMarkPaid}
              title={t("Mark as Paid", "تحديد كمدفوع")}
              className="px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors whitespace-nowrap"
            >
              💰 {t("Paid", "مدفوع")}
            </button>
          )}

          {confirmDelete ? (
            <>
              <button onClick={onDelete} className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">
                {t("Confirm", "تأكيد")}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-[10px] text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">
                {t("Cancel", "إلغاء")}
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title={t("Delete", "حذف")}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */

export default function TrackerPage() {
  const { invoices, removeInvoice, markStatus } = useInvoiceTrack();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const tracker = useEntitlement("tracker");
  const isAR = lang === "ar";
  const t = (en: string, ar: string) => isAR ? ar : en;

  const [filter, setFilter] = useState<InvoiceTrackStatus | "all">("all");

  const enriched = useMemo(() =>
    invoices.map(inv => ({ ...inv, effectiveStatus: computeInvoiceStatus(inv) })),
    [invoices]
  );

  const filtered = useMemo(() =>
    filter === "all" ? enriched : enriched.filter(inv => inv.effectiveStatus === filter),
    [enriched, filter]
  );

  const totalAmount = useMemo(() =>
    invoices.reduce((sum, inv) => sum + inv.amount, 0), [invoices]);
  const paidAmount = useMemo(() =>
    invoices.filter(inv => computeInvoiceStatus(inv) === "paid").reduce((sum, inv) => sum + inv.amount, 0),
    [invoices]
  );
  const pendingAmount = totalAmount - paidAmount;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: enriched.length };
    FILTER_TABS.forEach(f => {
      if (f !== "all") c[f] = enriched.filter(inv => inv.effectiveStatus === f).length;
    });
    return c;
  }, [enriched]);

  const mainCurrency = useMemo(() => {
    if (invoices.length === 0) return "USD";
    const freq: Record<string, number> = {};
    invoices.forEach(inv => { freq[inv.currency] = (freq[inv.currency] ?? 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }, [invoices]);

  const fmtSummary = (n: number) => fmtAmt(n, mainCurrency, lang);

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mb-5">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t("Invoice Tracker", "متتبع الفواتير")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
            {t(
              "Sign in to track your sent invoices, monitor payment status, and share invoices with clients.",
              "سجّل دخولك لتتبع فواتيرك المُرسَلة ومراقبة حالة الدفع ومشاركة الفواتير مع العملاء."
            )}
          </p>
          <div className="flex items-center gap-3">
            <Link href="/login?next=/tools/tracker">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm">
                <LogIn className="w-4 h-4" />
                {t("Sign In", "تسجيل الدخول")}
              </button>
            </Link>
            <Link href="/signup">
              <button className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t("Create Account", "إنشاء حساب")}
              </button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // While we're confirming the user's entitlements with the server for the
  // first time, show a small loading state instead of the upgrade page so
  // paying users never see the wrong gate flash on screen.
  if (tracker.loading && !tracker.allowed) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-32 flex flex-col items-center justify-center text-center" data-testid="tracker-loading">
          <div className="w-10 h-10 rounded-full border-2 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Checking your subscription…", "جارٍ التحقق من اشتراكك…")}
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!tracker.allowed) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16" dir={isAR ? "rtl" : "ltr"}>
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:from-blue-950/40 dark:via-gray-950 dark:to-violet-950/40 p-8 sm:p-12 text-center shadow-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-5">
              <Crown className="w-3.5 h-3.5" />
              {t("Subscribers only", "للمشتركين فقط")}
            </div>
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-200/40 dark:shadow-blue-950/40">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
              {t("Document Tracker", "متتبع المستندات")}
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed mb-8">
              {t(
                "See exactly when your invoices are viewed and paid, schedule polite reminders, and never chase a late payment again — included with Pro and Business plans.",
                "اعرف بالضبط متى تتم مشاهدة فواتيرك ودفعها، وحدد جدول التذكيرات اللطيفة، ولا تطارد دفعة متأخرة بعد الآن — متضمّن في خطط Pro و Business.",
              )}
            </p>

            <div className="grid sm:grid-cols-3 gap-3 max-w-xl mx-auto mb-8 text-start">
              {[
                { icon: Eye,      en: "View receipts", ar: "إشعارات بالمشاهدة", desc_en: "Know when a client opens an invoice", desc_ar: "اعرف عندما يفتح العميل الفاتورة" },
                { icon: BellRing, en: "Smart reminders", ar: "تذكيرات ذكية", desc_en: "Schedule follow-ups automatically", desc_ar: "جدول المتابعات تلقائياً" },
                { icon: Zap,      en: "Status timeline", ar: "خط زمني للحالة", desc_en: "Sent → Seen → Paid in one view", desc_ar: "مُرسل → مُشاهد → مدفوع في عرض واحد" },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.en} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur p-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center mb-2">
                      <Icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t(f.en, f.ar)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{t(f.desc_en, f.desc_ar)}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/pricing">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 text-white font-semibold shadow-md hover:shadow-lg transition-all" data-testid="tracker-upgrade-btn">
                  <Sparkles className="w-4 h-4" />
                  {t("See plans & upgrade", "عرض الخطط والترقية")}
                </button>
              </Link>
              <Link href="/invoice">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  {t("Create an invoice", "إنشاء فاتورة")}
                </button>
              </Link>
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-6">
              {t("Already a subscriber? Make sure you're signed in to the right account.", "هل أنت مشترك بالفعل؟ تأكد من تسجيل الدخول إلى الحساب الصحيح.")}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir={isAR ? "rtl" : "ltr"}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("Invoice Tracker", "متتبع الفواتير")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t("Track sent invoices and payment status", "تتبع الفواتير المُرسَلة وحالة الدفع")}
              </p>
            </div>
          </div>
          <Link href="/invoice">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm">
              <FileText className="w-4 h-4" />
              {t("New Invoice", "فاتورة جديدة")}
            </button>
          </Link>
        </div>

        {/* Summary cards */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: t("Total Invoiced", "إجمالي الفواتير"), value: fmtSummary(totalAmount), icon: DollarSign, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
              { label: t("Paid", "المدفوع"), value: fmtSummary(paidAmount), icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
              { label: t("Pending", "المعلق"), value: fmtSummary(pendingAmount), icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl flex-wrap">
            {FILTER_TABS.map((f) => {
              const active = filter === f;
              const meta = f === "all" ? null : STATUS_META[f];
              const labelEn = f === "all" ? "All" : meta!.label;
              const labelAr = f === "all" ? "الكل" : meta!.labelAr;
              const count = counts[f] ?? 0;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {isAR ? labelAr : labelEn}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 ms-auto">
            {filtered.length} {t("invoice(s)", "فاتورة")}
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {invoices.length === 0
                ? t("No tracked invoices yet", "لا توجد فواتير متتبعة بعد")
                : t("No invoices match this filter", "لا توجد فواتير تطابق هذا الفلتر")
              }
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-5">
              {invoices.length === 0
                ? t("Click 'Share & Track' on any invoice to start tracking.", "اضغط 'مشاركة وتتبع' في أي فاتورة للبدء.")
                : t("Try selecting a different filter.", "جرّب فلتراً مختلفاً.")
              }
            </p>
            {invoices.length === 0 && (
              <Link href="/invoice">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">
                  <FileText className="w-4 h-4" />
                  {t("Create Invoice", "إنشاء فاتورة")}
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full" dir={isAR ? "rtl" : "ltr"}>
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {[
                      t("Invoice", "فاتورة"),
                      t("Client", "عميل"),
                      t("Amount", "مبلغ"),
                      t("Dates", "تواريخ"),
                      t("Status", "حالة"),
                      t("Actions", "إجراءات"),
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      entry={inv}
                      lang={lang}
                      onMarkPaid={() => { markStatus(inv.id, "paid"); trackEvent("tracker_invoice_marked_paid", { language: lang }); }}
                      onDelete={() => removeInvoice(inv.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer note */}
        {invoices.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <TrendingUp className="w-3.5 h-3.5" />
            {t("Invoice data is stored locally on this device.", "بيانات الفواتير محفوظة محلياً على هذا الجهاز.")}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
