import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcProfitMargin } from "@/lib/calculations";

export default function ProfitMarginPage() {
  const { t, lang } = useLanguage();
  const [cost, setCost] = useState("");
  const [revenue, setRevenue] = useState("");
  const [result, setResult] = useState<{ profit: number; margin: number; markup: number } | null>(null);

  const calculate = () => {
    const c = parseFloat(cost) || 0;
    const r = parseFloat(revenue) || 0;
    setResult(calcProfitMargin(c, r));
    trackEvent("calculator_used", { calculator: "profit-margin", language: lang });
  };

  const reset = () => { setCost(""); setRevenue(""); setResult(null); };

  return (
    <CalculatorLayout
      title={t("calc.profit_margin.name")}
      description={t("calc.profit_margin.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.profit_margin.profit")}</span><span className="font-bold text-lg">{result.profit.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.profit_margin.margin")}</span><span className="font-bold text-2xl text-primary">{result.margin.toFixed(2)}%</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.profit_margin.markup")}</span><span className="font-bold">{result.markup.toFixed(2)}%</span></div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل التكلفة الإجمالية للمنتج أو الخدمة.",
        "أدخل الإيراد (سعر البيع).",
        "اضغط \"احسب\" لمعرفة الربح ونسبة هامش الربح ونسبة الربح الإضافي.",
      ] : [
        "Enter your total cost for the product or service.",
        "Enter the revenue (selling price).",
        "Click Calculate to see your profit, margin %, and markup %.",
      ]}
      formula={lang === "ar" ? (
        <p>هامش الربح = ((الإيراد − التكلفة) ÷ الإيراد) × 100<br/>الربح الإضافي = ((الإيراد − التكلفة) ÷ التكلفة) × 100</p>
      ) : (
        <p>Profit Margin = ((Revenue - Cost) / Revenue) × 100<br/>Markup = ((Revenue - Cost) / Cost) × 100</p>
      )}
      example={lang === "ar" ? (
        <p>التكلفة = <span dir="ltr">$80</span>، الإيراد = <span dir="ltr">$100</span> ← الربح = <span dir="ltr">$20</span> ← هامش الربح = 20٪ ← الربح الإضافي = 25٪</p>
      ) : (
        <p>Cost = $80, Revenue = $100 → Profit = $20 → Margin = 20% → Markup = 25%</p>
      )}
      faq={[
        { q: "What is the difference between margin and markup?", a: "Margin is profit expressed as a percentage of revenue (selling price). Markup is profit expressed as a percentage of cost. For the same product, markup is always higher than margin: a 25% markup equals a 20% margin." },
        { q: "What is a good profit margin for my industry?", a: "Benchmarks vary widely. Retail: 2–10%. Food and beverage: 3–9%. Manufacturing: 10–20%. Technology/software: 20–40%. Professional services: 25–50%. Compare against industry peers rather than applying a universal standard." },
        { q: "How do I improve my profit margin?", a: "Three main levers: (1) Raise prices — even a 5% price increase with the same volume dramatically improves margin. (2) Reduce variable costs — negotiate better supplier prices or cut waste. (3) Increase volume to spread fixed costs over more units." },
        { q: "Should I report gross margin or net margin?", a: "Gross margin (revenue minus direct costs) shows production and pricing efficiency. Net margin (revenue minus all costs including overheads and tax) shows overall business profitability. Use gross margin to evaluate product lines; net margin to assess the whole business." },
        { q: "What is the formula for gross profit margin?", a: "Gross Profit Margin = ((Revenue − Cost of Goods Sold) / Revenue) × 100. Example: Revenue $10,000, COGS $6,000 → Gross Margin = 40%." },
        { q: "How is profit margin different from ROI?", a: "Profit margin measures profitability relative to revenue. Return on Investment (ROI) measures return relative to capital invested. A business can have a high margin but low ROI if it requires heavy capital to generate that revenue (e.g. heavy manufacturing)." },
      ]}
      relatedTools={[
        { href: "/calculators/discount", name: t("calc.discount.name") },
        { href: "/calculators/vat-tax", name: t("calc.vat.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.profit_margin.cost")}</Label>
          <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="80" data-testid="cost-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.profit_margin.revenue")}</Label>
          <Input type="number" min="0" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="100" data-testid="revenue-input" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
