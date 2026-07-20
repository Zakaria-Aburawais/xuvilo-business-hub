import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { markupToMargin, marginToMarkup } from "@/lib/calculations";

export default function MarkupMarginPage() {
  const { t, lang } = useLanguage();
  const valueRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"markup" | "margin">("markup");
  const [result, setResult] = useState<{ markup: number; margin: number; description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = () => {
    setError(null);
    const v = parseFloat(valueRef.current?.value ?? "") || 0;
    if (v <= 0) {
      setError("Please enter a positive value.");
      return;
    }
    if (mode === "markup") {
      const margin = markupToMargin(v);
      setResult({ markup: v, margin, description: `A ${v}% markup equals a ${margin.toFixed(2)}% margin.` });
      trackEvent("calculator_used", { calculator: "markup-margin", language: lang });
    } else {
      const markup = marginToMarkup(v);
      if (markup === null) { setError("Margin must be less than 100%."); return; }
      setResult({ markup, margin: v, description: `A ${v}% margin equals a ${markup.toFixed(2)}% markup.` });
      trackEvent("calculator_used", { calculator: "markup-margin", language: lang });
    }
  };

  const reset = () => {
    if (valueRef.current) valueRef.current.value = "";
    setResult(null);
    setError(null);
  };

  return (
    <CalculatorLayout
      title={t("calc.markup_margin.name")}
      description={t("calc.markup_margin.desc")}
      result={result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Markup</div>
              <div className="text-2xl font-bold text-blue-600">{result.markup.toFixed(2)}%</div>
              <div className="text-xs text-muted-foreground mt-1">of cost price</div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Margin</div>
              <div className="text-2xl font-bold text-green-600">{result.margin.toFixed(2)}%</div>
              <div className="text-xs text-muted-foreground mt-1">of selling price</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{result.description}</p>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "حدّد ما إذا كنت تعرف نسبة الربح الإضافي (Markup) أم نسبة هامش الربح (Margin).",
        "أدخل النسبة التي تعرفها.",
        "اضغط \"احسب\" لمعرفة القيمة المكافئة على الأساس الآخر.",
      ] : [
        "Choose whether you know your markup % or your margin %.",
        "Enter the percentage you know.",
        "Click Calculate to see the equivalent value on the other basis.",
      ]}
      formula={lang === "ar" ? (
        <div>
          <p><strong>من الربح الإضافي إلى الهامش:</strong> هامش الربح = الربح الإضافي ÷ (100 + الربح الإضافي) × 100</p>
          <p><strong>من الهامش إلى الربح الإضافي:</strong> الربح الإضافي = هامش الربح ÷ (100 − هامش الربح) × 100</p>
        </div>
      ) : (
        <div>
          <p><strong>Markup → Margin:</strong> Margin = Markup ÷ (100 + Markup) × 100</p>
          <p><strong>Margin → Markup:</strong> Markup = Margin ÷ (100 − Margin) × 100</p>
        </div>
      )}
      example={lang === "ar" ? (
        <p>ربح إضافي 50٪ على منتج تكلفته <span dir="ltr">$10</span> ← يُباع بـ <span dir="ltr">$15</span>. الربح = <span dir="ltr">$5</span>. هامش الربح = <span dir="ltr">$5 ÷ $15</span> = 33.3٪</p>
      ) : (
        <p>50% markup on a $10 item → sell at $15. Profit = $5. Margin = $5/$15 = 33.3%</p>
      )}
      faq={[
        { q: "Why is markup always higher than margin for the same product?", a: "Markup is calculated on the lower cost price, while margin is calculated on the higher selling price. Dividing the same profit by a smaller number (cost) gives a bigger percentage than dividing by a larger number (revenue). A 50% markup = a 33.3% margin." },
        { q: "Which should I use — markup or margin?", a: "Use markup when calculating your selling price from a known cost (common in retail, manufacturing, and wholesale). Use margin when analyzing profitability in your P&L, comparing to industry benchmarks, or communicating with investors (margin percentages are the financial reporting standard)." },
        { q: "What is a healthy markup for retail businesses?", a: "'Keystone markup' (100% markup, turning a $10 cost into a $20 price) equals a 50% gross margin and is a traditional retail standard. Fast-moving consumer goods often use 20–50% markup (17–33% margin). Luxury goods can use 200%+ markup. The right level depends on your category and competitive position." },
        { q: "How do I convert a 50% markup to a margin percentage?", a: "Use the formula: Margin = Markup ÷ (100 + Markup) × 100 = 50 ÷ 150 × 100 = 33.3%. Conversely, to convert a 40% margin to markup: Markup = Margin ÷ (100 − Margin) × 100 = 40 ÷ 60 × 100 = 66.7%." },
        { q: "Can I use markup to ensure I cover all my costs?", a: "Be careful: markup is typically applied to direct costs only (cost of goods). You must set it large enough to also cover overheads (rent, salaries, marketing) and leave a net profit. Run a break-even analysis alongside markup planning to confirm your pricing is sustainable." },
      ]}
      relatedTools={[
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
        { href: "/calculators/break-even", name: t("calc.break_even.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm">I know my...</Label>
          <RadioGroup value={mode} onValueChange={v => setMode(v as typeof mode)} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="markup" id="markup" />
              <Label htmlFor="markup" className="text-sm font-normal cursor-pointer">Markup %</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="margin" id="margin" />
              <Label htmlFor="margin" className="text-sm font-normal cursor-pointer">Margin %</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">{mode === "markup" ? "Markup %" : "Margin %"}</Label>
          <Input
            ref={valueRef}
            type="number"
            min="0"
            max={mode === "margin" ? "99.99" : undefined}
            defaultValue=""
            placeholder={mode === "markup" ? "50" : "33.3"}
            data-testid="value-input"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
