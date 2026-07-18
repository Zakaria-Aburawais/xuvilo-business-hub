import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth, isAdmin } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  getAdminAnalytics,
  type AdminAnalyticsResponse,
} from "@/lib/adminApi";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  FileDown,
  Stamp,
  CreditCard,
  Sparkles,
  UserPlus,
  Info,
} from "lucide-react";

type RangeKey = "week" | "month";

const EVENT_META: Record<
  string,
  { icon: typeof FileDown; en: string; ar: string }
> = {
  pdf_download: { icon: FileDown, en: "PDF downloads", ar: "تنزيلات PDF" },
  stamp_export: { icon: Stamp, en: "Stamp exports", ar: "تصدير الأختام" },
  business_card_export: {
    icon: CreditCard,
    en: "Business card exports",
    ar: "تصدير بطاقات الأعمال",
  },
  ai_writer_generated: {
    icon: Sparkles,
    en: "AI Writer drafts",
    ar: "مسودات الكاتب الذكي",
  },
  signup_completed: { icon: UserPlus, en: "Signups", ar: "التسجيلات" },
};

function formatCount(n: number, lang: "en" | "ar"): string {
  return n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
}

function BreakdownCard({
  title,
  rows,
  failed,
  isAR,
}: {
  title: string;
  rows: Array<{ value: string; count: number }>;
  failed: boolean;
  isAR: boolean;
}) {
  const max = rows.length > 0 ? Math.max(...rows.map((r) => r.count)) : 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {failed ? (
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            {isAR
              ? "لم يتم تسجيل هذا البُعد المخصص في إعدادات GA4 بعد، لذا لا يمكن عرض التفصيل."
              : "This custom dimension isn't registered in GA4 yet, so the breakdown can't be shown."}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAR ? "لا توجد بيانات لهذه الفترة." : "No data for this period."}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.value} className="text-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="truncate">{row.value}</span>
                  <span className="font-medium tabular-nums">
                    {formatCount(row.count, isAR ? "ar" : "en")}
                  </span>
                </div>
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full rounded bg-primary"
                    style={{
                      width: max > 0 ? `${(row.count / max) * 100}%` : "0%",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const [, navigate] = useLocation();

  const [range, setRange] = useState<RangeKey>("week");
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdminUser = isAdmin(user);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/admin/analytics");
    }
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getAdminAnalytics(range);
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (!isAdminUser) return;
    void load();
  }, [isAdminUser, load]);

  if (!user) return null;

  if (!isAdminUser) {
    return (
      <AppLayout>
        <SEOHead
          title="Admin · Analytics"
          description="Admin-only analytics dashboard."
          path="/admin/analytics"
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
                  ? "ليس لديك إذن للوصول إلى لوحة التحليلات."
                  : "You do not have permission to view the analytics dashboard."}
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
        title="Admin · Analytics"
        description="Top-line usage analytics for key tools."
        path="/admin/analytics"
        noindex
      />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <AdminNav />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              {isAR ? "لوحة التحليلات" : "Analytics"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAR
                ? "أهم أرقام الاستخدام لأدوات الموقع، من Google Analytics."
                : "Top-line usage counts for key tools, pulled from Google Analytics."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-md border overflow-hidden">
              <Button
                variant={range === "week" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setRange("week")}
                data-testid="range-week-button"
              >
                {isAR ? "٧ أيام" : "7 days"}
              </Button>
              <Button
                variant={range === "month" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setRange("month")}
                data-testid="range-month-button"
              >
                {isAR ? "٣٠ يومًا" : "30 days"}
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void load()}
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

        {error ? (
          <Card className="mb-6 border-rose-300">
            <CardContent className="py-4">
              <p className="text-sm text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {data && !data.configured ? (
          <Card className="mb-6">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {isAR
                      ? "لم يتم إعداد Google Analytics بعد"
                      : "Google Analytics isn't set up yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isAR
                      ? "لعرض الأرقام هنا، أضِف متغيّري البيئة GA4_PROPERTY_ID و GA4_SERVICE_ACCOUNT_JSON إلى خادم الواجهة الخلفية (حساب خدمة لديه صلاحية عرض على خاصية GA4)."
                      : "To see numbers here, add the GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON environment variables to the API server (a service account with Viewer access on the GA4 property)."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {data.totals.map(({ event, count }) => {
                const meta = EVENT_META[event];
                const Icon = meta?.icon ?? BarChart3;
                const label = meta ? (isAR ? meta.ar : meta.en) : event;
                return (
                  <Card key={event} data-testid={`total-${event}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                      <div className="text-3xl font-semibold tabular-nums">
                        {formatCount(count, isAR ? "ar" : "en")}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BreakdownCard
                title={isAR ? "تنزيلات PDF حسب الأداة" : "PDF downloads by tool"}
                rows={data.breakdowns.pdfDownloadsByTool}
                failed={data.breakdownErrors.includes("pdfDownloadsByTool")}
                isAR={isAR}
              />
              <BreakdownCard
                title={
                  isAR
                    ? "مسودات الكاتب الذكي حسب الغرض"
                    : "AI Writer drafts by purpose"
                }
                rows={data.breakdowns.aiWriterByPurpose}
                failed={data.breakdownErrors.includes("aiWriterByPurpose")}
                isAR={isAR}
              />
              <BreakdownCard
                title={isAR ? "التسجيلات حسب اللغة" : "Signups by language"}
                rows={data.breakdowns.signupsByLanguage}
                failed={data.breakdownErrors.includes("signupsByLanguage")}
                isAR={isAR}
              />
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {data.range === "week"
                  ? isAR
                    ? "آخر ٧ أيام"
                    : "Last 7 days"
                  : isAR
                    ? "آخر ٣٠ يومًا"
                    : "Last 30 days"}
              </Badge>
              <span>
                {isAR ? "آخر تحديث: " : "Updated: "}
                {new Date(data.generatedAt).toLocaleString(
                  isAR ? "ar-EG" : "en-US",
                )}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
