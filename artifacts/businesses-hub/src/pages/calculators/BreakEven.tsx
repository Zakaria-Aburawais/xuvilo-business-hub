import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcBreakEven } from "@/lib/calculations";

export default function BreakEvenPage() {
  const { t, lang } = useLanguage();
  const fixedCostsRef = useRef<HTMLInputElement>(null);
  const varCostRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ bepUnits: number; bepRevenue: number; contributionMargin: number; contributionRatio: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = () => {
    setError(null);
    const fc = parseFloat(fixedCostsRef.current?.value ?? "") || 0;
    const vc = parseFloat(varCostRef.current?.value ?? "") || 0;
    const p = parseFloat(priceRef.current?.value ?? "") || 0;
    const res = calcBreakEven(fc, vc, p);
    if (!res) {
      setError("Selling price must be greater than variable cost.");
      setResult(null);
      return;
    }
    setResult(res);
    trackEvent("calculator_used", { calculator: "break-even", language: lang });
  };

  const reset = () => {
    if (fixedCostsRef.current) fixedCostsRef.current.value = "";
    if (varCostRef.current) varCostRef.current.value = "";
    if (priceRef.current) priceRef.current.value = "";
    setResult(null);
    setError(null);
  };

  return (
    <CalculatorLayout
      title={t("calc.break_even.name")}
      description={t("calc.break_even.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contribution Margin / Unit</span><span className="font-bold">{result.contributionMargin.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Contribution Ratio</span><span className="font-bold">{result.contributionRatio.toFixed(1)}%</span></div>
          <div className="flex justify-between text-sm border-t pt-2"><span className="font-semibold">Break-Even Units</span><span className="font-bold text-2xl text-primary">{Math.ceil(result.bepUnits).toLocaleString()}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold">Break-Even Revenue</span><span className="font-bold text-primary">{result.bepRevenue.toFixed(2)}</span></div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل إجمالي التكاليف الثابتة (الإيجار والرواتب والمصاريف التي لا تتغير مع المبيعات).",
        "أدخل التكلفة المتغيرة لإنتاج وحدة واحدة (المواد والعمالة المباشرة).",
        "أدخل سعر بيع الوحدة.",
        "اضغط \"احسب\" لمعرفة عدد الوحدات التي يجب بيعها للوصول إلى نقطة التعادل.",
      ] : [
        "Enter your total fixed costs (rent, salaries, and other expenses that don't change with sales).",
        "Enter the variable cost of producing one unit (materials, direct labor).",
        "Enter your selling price per unit.",
        "Click Calculate to see how many units you must sell to break even.",
      ]}
      formula={<p>Contribution Margin = Selling Price − Variable Cost per Unit<br/>Break-Even Units = Fixed Costs ÷ Contribution Margin<br/>Break-Even Revenue = Break-Even Units × Selling Price</p>}
      example={<p>Fixed Costs $10,000, Variable Cost $30, Price $50 → CM = $20 → BEP = 500 units = $25,000 revenue</p>}
      faq={[
        { q: "What is the difference between fixed costs and variable costs?", a: "Fixed costs remain the same regardless of production volume — rent, salaries, insurance, and equipment. Variable costs increase with every unit made — materials, direct labor, and packaging. Understanding the split is the starting point for any break-even analysis." },
        { q: "What does a higher contribution margin mean?", a: "A higher contribution margin per unit means each sale covers more of your fixed costs. Products with high contribution margins reach break-even faster. If your contribution margin is negative (selling price < variable cost), you lose money on every unit — a critical warning signal." },
        { q: "How do I use break-even analysis in pricing decisions?", a: "If your break-even point is 1,000 units and you can realistically sell only 600, you must raise the price (increasing contribution margin), cut fixed or variable costs, or accept a loss. Break-even forces pricing trade-offs into the open before you go to market." },
        { q: "What is the difference between break-even units and break-even revenue?", a: "Break-even units is the number of products you must sell. Break-even revenue is the total sales amount needed. Use units when you sell a single product type; use revenue when you sell a mix of products at different prices." },
        { q: "Does break-even analysis work for service businesses?", a: "Yes. Replace 'units' with service engagements (client hours, projects, retainers) and 'variable cost per unit' with the direct cost of delivering one engagement. Many consulting and agency businesses use break-even to set their minimum billable rate and validate their pricing model." },
      ]}
      relatedTools={[
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
        { href: "/calculators/markup-margin", name: t("calc.markup_margin.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">Total Fixed Costs</Label>
          <Input ref={fixedCostsRef} type="number" min="0" defaultValue="" placeholder="10000" data-testid="fixed-costs-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Variable Cost per Unit</Label>
          <Input ref={varCostRef} type="number" min="0" defaultValue="" placeholder="30" data-testid="var-cost-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Selling Price per Unit</Label>
          <Input ref={priceRef} type="number" min="0" defaultValue="" placeholder="50" data-testid="price-input" />
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
