import { useState, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowLeftRight, RefreshCw, ChevronDown, Check, ExternalLink, AlertCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { convertViaEur } from "@/lib/calculations";

interface InfoEuroRate {
  country: string;
  currency: string;
  isoA3Code: string;
  isoA2Code: string;
  value: number;
  comment: string | null;
}

const CACHE_KEY_PREFIX = "inforeuro_rates_";
const API_URL = "/api-proxy/api/inforeuro/rates";

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function CurrencyPicker({
  value,
  onChange,
  rates,
  label,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  rates: InfoEuroRate[];
  label: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = rates.find((r) => r.isoA3Code === value);

  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 font-normal"
            data-testid={testId}
          >
            <span className="truncate text-left">
              {selected ? (
                <span>
                  <span className="font-semibold">{selected.isoA3Code}</span>
                  <span className="text-muted-foreground text-xs ml-2">{selected.currency}</span>
                </span>
              ) : (
                "Select currency..."
              )}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search currency or country..." />
            <CommandList className="max-h-64">
              <CommandEmpty>No currency found.</CommandEmpty>
              <CommandGroup>
                {rates.map((r) => (
                  <CommandItem
                    key={r.isoA3Code}
                    value={`${r.isoA3Code} ${r.currency} ${r.country}`}
                    onSelect={() => {
                      onChange(r.isoA3Code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${r.isoA3Code === value ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="font-semibold w-12 shrink-0">{r.isoA3Code}</span>
                    <span className="text-muted-foreground text-sm truncate">{r.currency}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function CurrencyPage() {
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";

  const [rates, setRates] = useState<InfoEuroRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(getCurrentPeriod());

  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");

  const fetchRates = async (targetPeriod: string) => {
    setLoading(true);
    setError(null);

    const cacheKey = CACHE_KEY_PREFIX + targetPeriod;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setRates(JSON.parse(cached));
        setLoading(false);
        return;
      }
    } catch (_) {}

    try {
      const url = `${API_URL}?period=${targetPeriod}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: InfoEuroRate[] = await res.json();
      setRates(data);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (_) {}
      setLoading(false);
    } catch (err) {
      setError(
        isRTL
          ? "تعذّر تحميل أسعار الصرف. يرجى التحقق من اتصالك بالإنترنت."
          : "Could not load exchange rates. Please check your connection."
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates(period);
  }, [period]);

  const result = useMemo(() => {
    if (!rates.length) return null;
    const a = parseFloat(amount);
    if (isNaN(a)) return null;
    const rateFrom = rates.find((r) => r.isoA3Code === from);
    const rateTo = rates.find((r) => r.isoA3Code === to);
    if (!rateFrom || !rateTo) return null;
    const { converted, unitRate } = convertViaEur(a, rateFrom.value, rateTo.value);
    return { converted, unitRate, rateFrom, rateTo };
  }, [amount, from, to, rates]);

  /* Live converter has no Calculate button — fire the usage event once per
     visit, the first time a valid conversion is produced. */
  const trackedRef = useRef(false);
  useEffect(() => {
    if (result && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("calculator_used", { calculator: "currency", language: lang });
    }
  }, [result, lang]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleRefresh = () => {
    const cacheKey = CACHE_KEY_PREFIX + period;
    try { localStorage.removeItem(cacheKey); } catch (_) {}
    fetchRates(period);
  };

  const sortedRates = useMemo(() => {
    return [...rates].sort((a, b) => a.isoA3Code.localeCompare(b.isoA3Code));
  }, [rates]);

  const resultDisplay = result ? (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="text-sm text-muted-foreground">
          {parseFloat(amount || "0").toLocaleString()} {from}
        </div>
        <div className="text-4xl font-bold text-primary">
          {result.converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </div>
        <div className="text-xl font-semibold text-muted-foreground">{to}</div>
      </div>

      <div className="border rounded-lg p-3 space-y-1.5 bg-muted/30 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">1 {from} =</span>
          <span className="font-semibold">{result.unitRate.toFixed(6)} {to}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">1 EUR = {from}</span>
          <span>{result.rateFrom.value}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">1 EUR = {to}</span>
          <span>{result.rateTo.value}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center flex-wrap">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        {isRTL ? "أسعار شهرية رسمية — " : "Official monthly rates — "}
        <a
          href="https://commission.europa.eu/funding-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_en"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          InfoEuro <ExternalLink className="w-3 h-3" />
        </a>
        <span>· {formatPeriodLabel(period)}</span>
      </div>
    </div>
  ) : undefined;

  return (
    <CalculatorLayout
      title={isRTL ? "محوّل العملات — InfoEuro" : "Currency Converter — InfoEuro"}
      description={
        isRTL
          ? "أسعار الصرف الشهرية الرسمية المستخدمة من قِبل المفوضية الأوروبية والمنظمات غير الحكومية (InfoEuro)"
          : "Official monthly exchange rates used by the EU Commission & NGOs worldwide (InfoEuro)"
      }
      result={resultDisplay}
      howToUse={
        isRTL
          ? [
              "أدخل المبلغ الذي تريد تحويله.",
              "اختر العملة الأصلية والعملة المستهدفة من القائمتين.",
              "تظهر النتيجة مباشرة — استخدم زر التبديل لعكس الاتجاه، ومحدّد الشهر لعرض أسعار الأشهر السابقة.",
            ]
          : [
              "Enter the amount you want to convert.",
              "Pick the source and target currencies from the two lists.",
              "The result appears instantly — use Swap to reverse direction, or the month selector for historical rates.",
            ]
      }
      formula={
        isRTL ? (
          <p>
            المبلغ المحوَّل = المبلغ × (سعر العملة المستهدفة ÷ سعر العملة الأصلية)<br />
            <span className="text-xs text-muted-foreground">حيث تُعبَّر الأسعار كالتالي: 1 يورو = عدد الوحدات من العملة (وفق منهجية InfoEuro)</span>
          </p>
        ) : (
          <p>
            Converted = Amount × (Rate<sub>To</sub> ÷ Rate<sub>From</sub>)<br />
            <span className="text-xs text-muted-foreground">Where rates are expressed as: 1 EUR = X units of currency (InfoEuro basis)</span>
          </p>
        )
      }
      example={
        isRTL ? (
          <p>
            تحويل <span dir="ltr">$1,000 USD</span> إلى اليورو: <span dir="ltr">1,000 × (1 ÷ 1.0842) = €922.39</span><br />
            <span className="text-xs text-muted-foreground">تُحدَّث الأسعار شهرياً وتصدر عن المفوضية الأوروبية.</span>
          </p>
        ) : (
          <p>
            $1,000 USD → EUR: 1,000 × (1 ÷ 1.0842) = €922.39 EUR<br />
            <span className="text-xs text-muted-foreground">Rates update monthly, published by the European Commission.</span>
          </p>
        )
      }
      faq={[
        {
          q: isRTL ? "ما هو InfoEuro؟" : "What is InfoEuro?",
          a: isRTL
            ? "InfoEuro هو نظام أسعار الصرف الشهرية الرسمية الصادرة عن المفوضية الأوروبية. يُستخدم على نطاق واسع من قِبل المنظمات غير الحكومية وجهات التمويل الأوروبية لإعداد التقارير المالية وتنفيذ المشاريع."
            : "InfoEuro is the official monthly exchange rate system published by the European Commission. It is widely used by NGOs, EU-funded project managers, and grant recipients who need fixed, auditable exchange rates for financial reporting.",
        },
        {
          q: isRTL ? "متى تُحدَّث الأسعار؟" : "How often are InfoEuro rates updated?",
          a: isRTL
            ? "تُحدَّث أسعار InfoEuro مرة واحدة في الشهر، في بداية كل شهر ميلادي. هذا يختلف عن أسعار السوق اليومية — مما يجعلها مثالية للتقارير المالية الشهرية المعيارية."
            : "InfoEuro rates are updated once a month at the start of each calendar month. Unlike daily market rates, the fixed monthly rate makes financial reporting consistent and auditable across the entire month.",
        },
        {
          q: isRTL ? "هل يمكنني الاطلاع على أسعار الأشهر السابقة؟" : "Can I look up historical exchange rates?",
          a: isRTL
            ? "نعم، يمكنك اختيار أي شهر لعرض الأسعار الرسمية المقابلة له. هذا مفيد للتدقيق في التقارير المالية الماضية."
            : "Yes — use the period selector to view official rates for any past month. This is especially useful for auditing past financial reports or reconciling project budgets that used different monthly rates.",
        },
        {
          q: isRTL ? "متى أستخدم أسعار InfoEuro بدلاً من أسعار السوق؟" : "When should I use InfoEuro rates vs. market rates?",
          a: isRTL
            ? "استخدم InfoEuro عندما تطلبه جهة التمويل الأوروبية أو النظام المحاسبي للمنظمة. للتخطيط التجاري العام أو المقارنة السعرية، استخدم أسعار السوق الفعلية من مصادر موثوقة."
            : "Use InfoEuro when required by your EU funding agreement, grant contract, or organizational accounting policy. For general business pricing, procurement, or financial planning, use live market rates from a reliable source — InfoEuro rates may differ from current spot rates.",
        },
        {
          q: isRTL ? "كيف يؤثر تقلب سعر الصرف على أعمالي الدولية؟" : "How does currency volatility affect international business?",
          a: isRTL
            ? "تقلبات العملة تؤثر على هوامش الربح لديك إذا كنت تشتري بعملة وتبيع بأخرى. للتحوط من هذا الخطر، يمكنك استخدام عقود الصرف الآجل، أو التسعير بعملة مستقرة (مثل الدولار الأمريكي)، أو مراجعة أسعارك بانتظام مع تغير الأسعار."
            : "Currency swings directly affect your margins if you buy in one currency and sell in another. Strategies to manage this risk include forward contracts (locking in a future rate), invoicing in a stable currency (e.g. USD), building a currency buffer into your pricing, or reviewing prices regularly as rates shift.",
        },
      ]}
      relatedTools={[
        { href: "/calculators/vat-tax", name: t("calc.vat.name") },
        { href: "/calculators/import-cost", name: t("calc.import.name") },
      ]}
    >
      <div className="space-y-4">
        {/* Period selector + InfoEuro badge */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              InfoEuro
            </Badge>
            <span className="text-xs text-muted-foreground">
              {loading
                ? (isRTL ? "جارٍ التحميل..." : "Loading rates...")
                : error
                ? ""
                : formatPeriodLabel(period)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs sr-only">{isRTL ? "الفترة" : "Period"}</Label>
              <input
                type="month"
                value={period}
                max={getCurrentPeriod()}
                min="2000-01"
                onChange={(e) => setPeriod(e.target.value)}
                className="h-7 text-xs border rounded px-2 bg-background text-foreground"
                data-testid="period-input"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              title={isRTL ? "تحديث الأسعار" : "Refresh rates"}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Amount input */}
        <div className="space-y-1">
          <Label className="text-sm">{isRTL ? "المبلغ" : "Amount"}</Label>
          <Input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className="text-lg font-semibold h-11"
            data-testid="amount-input"
            disabled={loading || !!error}
          />
        </div>

        {/* From / Swap / To */}
        <div className="space-y-2">
          <CurrencyPicker
            value={from}
            onChange={setFrom}
            rates={sortedRates}
            label={isRTL ? "من عملة" : "From"}
            testId="from-currency"
          />

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 px-4"
              onClick={swap}
              data-testid="swap-btn"
              disabled={loading || !!error}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isRTL ? "تبديل" : "Swap"}
            </Button>
          </div>

          <CurrencyPicker
            value={to}
            onChange={setTo}
            rates={sortedRates}
            label={isRTL ? "إلى عملة" : "To"}
            testId="to-currency"
          />
        </div>

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="animate-pulse space-y-2 pt-2">
            <div className="h-10 bg-muted rounded-lg" />
            <div className="h-6 w-2/3 bg-muted rounded" />
          </div>
        )}
      </div>
    </CalculatorLayout>
  );
}
