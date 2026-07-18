import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcDiscount } from "@/lib/calculations";

export default function DiscountPage() {
  const { t, lang } = useLanguage();
  const [original, setOriginal] = useState("");
  const [pct, setPct] = useState("");
  const [result, setResult] = useState<{ discountAmt: number; finalPrice: number; savings: number } | null>(null);

  const calculate = () => {
    setResult(calcDiscount(parseFloat(original) || 0, parseFloat(pct) || 0));
    trackEvent("calculator_used", { calculator: "discount", language: lang });
  };
  const reset = () => { setOriginal(""); setPct(""); setResult(null); };

  return (
    <CalculatorLayout
      title={t("calc.discount.name")}
      description={t("calc.discount.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.discount.discount_amt")}</span><span className="font-bold">-{result.discountAmt.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.discount.final")}</span><span className="font-bold text-2xl text-primary">{result.finalPrice.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.discount.savings")}</span><span className="font-bold text-green-600">{result.savings.toFixed(2)}</span></div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل السعر الأصلي قبل الخصم.",
        "أدخل نسبة الخصم (مثلاً 15 تعني 15٪).",
        "اضغط \"احسب\" لمعرفة قيمة الخصم والسعر النهائي وإجمالي التوفير.",
      ] : [
        "Enter the original price before the discount.",
        "Enter the discount percentage (e.g. 15 for 15%).",
        "Click Calculate to see the discount amount, final price, and total savings.",
      ]}
      formula={<p>Discount Amount = Original Price × (Discount % / 100)<br/>Final Price = Original Price - Discount Amount</p>}
      example={<p>$200 with 15% discount → Discount = $30 → Final = $170</p>}
      faq={[
        { q: "How do I calculate a discount percentage?", a: "Divide the discount amount by the original price and multiply by 100. Example: ($30 / $200) × 100 = 15% discount." },
        { q: "How do I calculate the final price after a discount?", a: "Multiply the original price by (1 − discount% / 100). Example: $200 at 15% off = $200 × 0.85 = $170 final price." },
        { q: "What is the difference between a percentage discount and a flat discount?", a: "A percentage discount (e.g. 20% off) scales with the price — it gives larger savings on higher-priced items. A flat discount (e.g. $20 off) gives the same saving regardless of the original price. Percentage discounts are more common in retail; flat discounts are used in wholesale negotiations." },
        { q: "How do stacked discounts work?", a: "Stacked discounts don't simply add. A 20% discount followed by a 10% discount gives: $100 × 0.80 × 0.90 = $72, which is a 28% combined discount — not 30%. Each discount is applied to the already-reduced price." },
        { q: "What is the difference between a trade discount and a cash discount?", a: "A trade discount is deducted from the list price before the invoice is issued, typically for B2B buyers or bulk orders. A cash discount is an incentive to pay early (e.g. '2/10 Net 30' means 2% off if paid within 10 days, otherwise full amount due in 30 days)." },
      ]}
      relatedTools={[
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
        { href: "/calculators/vat-tax", name: t("calc.vat.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.discount.original")}</Label>
          <Input type="number" min="0" value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="200" data-testid="original-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.discount.discount_pct")}</Label>
          <Input type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="15" data-testid="discount-pct-input" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
