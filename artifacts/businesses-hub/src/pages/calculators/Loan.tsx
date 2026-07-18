import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcLoan } from "@/lib/calculations";

export default function LoanPage() {
  const { t, lang } = useLanguage();
  const principalRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const termRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ monthly: number; total: number; totalInterest: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = () => {
    setError(null);
    const p = parseFloat(principalRef.current?.value ?? "") || 0;
    const annualRate = parseFloat(rateRef.current?.value ?? "") || 0;
    const years = parseFloat(termRef.current?.value ?? "") || 0;

    const res = calcLoan(p, annualRate, years);
    if (!res) {
      setError("Please enter valid principal and loan term.");
      return;
    }
    setResult(res);
    trackEvent("calculator_used", { calculator: "loan", language: lang });
  };

  const reset = () => {
    if (principalRef.current) principalRef.current.value = "";
    if (rateRef.current) rateRef.current.value = "";
    if (termRef.current) termRef.current.value = "";
    setResult(null);
    setError(null);
  };

  return (
    <CalculatorLayout
      title={t("calc.loan.name")}
      description={t("calc.loan.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monthly Payment</span><span className="font-bold text-2xl text-primary">{result.monthly.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Payment</span><span className="font-bold">{result.total.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Interest</span><span className="font-bold text-orange-600">{result.totalInterest.toFixed(2)}</span></div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل مبلغ القرض الذي تريد اقتراضه (أصل القرض).",
        "أدخل معدل الفائدة السنوي المعروض من البنك (مثلاً 6 تعني 6٪).",
        "أدخل مدة القرض بالسنوات.",
        "اضغط \"احسب\" لمعرفة القسط الشهري وإجمالي السداد وإجمالي الفوائد.",
      ] : [
        "Enter the loan amount you want to borrow (principal).",
        "Enter the annual interest rate offered by your bank (e.g. 6 for 6%).",
        "Enter the loan term in years.",
        "Click Calculate to see your monthly payment, total repayment, and total interest.",
      ]}
      formula={<p>Monthly Payment = P × [r(1+r)ⁿ] / [(1+r)ⁿ−1]<br/>where r = monthly rate, n = total months</p>}
      example={<p>Loan $50,000 at 6% for 5 years → Monthly = $966.64 → Total = $57,998 → Interest = $7,998</p>}
      faq={[
        { q: "What is an amortization schedule?", a: "An amortization schedule shows how each payment is split between principal and interest over the loan term. Early payments are mostly interest; later payments shift toward principal as the outstanding balance falls. This is why paying extra early in a loan saves the most money." },
        { q: "Does this calculator account for compounding?", a: "Yes. It uses the standard monthly compounding formula used by most banks: Monthly Payment = P × [r(1+r)ⁿ] / [(1+r)ⁿ−1], where r is the monthly interest rate and n is the total number of months." },
        { q: "What is the difference between an interest rate and APR?", a: "The interest rate is the base rate charged on the principal. The Annual Percentage Rate (APR) includes fees and other costs, giving a truer picture of the total borrowing cost. Always compare APRs when choosing between competing loans." },
        { q: "How does the loan term affect total interest paid?", a: "A longer loan term lowers your monthly payment but significantly increases total interest paid. Example: $50,000 loan at 6% — 3 years costs $2,325 in interest; 10 years costs $8,322 in interest. The trade-off is monthly cash flow vs. long-term total cost." },
        { q: "Can extra payments reduce total interest?", a: "Yes. Making additional principal payments reduces the outstanding balance faster, shortening the loan term and cutting total interest. Even small, consistent overpayments (e.g. +10% per month) can save thousands and cut months off a 5–10 year loan." },
        { q: "What is a good business loan interest rate?", a: "Rates vary widely by country, lender, loan type, and creditworthiness. In GCC markets, commercial lending rates typically range from 4–12% per year. Compare rates from multiple banks, factor in all fees, and watch for balloon payments or prepayment penalties in the terms." },
      ]}
      relatedTools={[
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
        { href: "/calculators/break-even", name: t("calc.break_even.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">Loan Amount (Principal)</Label>
          <Input ref={principalRef} type="number" min="0" defaultValue="" placeholder="50000" data-testid="principal-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Annual Interest Rate %</Label>
          <Input ref={rateRef} type="number" min="0" step="0.1" defaultValue="" placeholder="6" data-testid="rate-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Loan Term (years)</Label>
          <Input ref={termRef} type="number" min="1" defaultValue="" placeholder="5" data-testid="term-input" />
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
