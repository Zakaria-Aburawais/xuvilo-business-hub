import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcSalaryCost } from "@/lib/calculations";

export default function SalaryCostPage() {
  const { t, lang } = useLanguage();
  const basicRef = useRef<HTMLInputElement>(null);
  const socialRef = useRef<HTMLInputElement>(null);
  const housingRef = useRef<HTMLInputElement>(null);
  const transportRef = useRef<HTMLInputElement>(null);
  const medicalRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ totalCash: number; totalNonCash: number; totalCost: number; annualCost: number } | null>(null);

  const calculate = () => {
    const base = parseFloat(basicRef.current?.value ?? "") || 0;
    const socialPct = parseFloat(socialRef.current?.value ?? "") || 0;
    const h = parseFloat(housingRef.current?.value ?? "") || 0;
    const tr = parseFloat(transportRef.current?.value ?? "") || 0;
    const med = parseFloat(medicalRef.current?.value ?? "") || 0;
    const oth = parseFloat(otherRef.current?.value ?? "") || 0;
    setResult(calcSalaryCost(base, socialPct, h, tr, med, oth));
    trackEvent("calculator_used", { calculator: "salary-cost", language: lang });
  };

  const reset = () => {
    [basicRef, socialRef, housingRef, transportRef, medicalRef, otherRef].forEach(r => { if (r.current) r.current.value = ""; });
    setResult(null);
  };

  return (
    <CalculatorLayout
      title={t("calc.salary_cost.name")}
      description={t("calc.salary_cost.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Cash (monthly)</span><span className="font-bold">{result.totalCash.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Non-Cash / Contributions</span><span className="font-bold text-orange-600">{result.totalNonCash.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm border-t pt-2"><span className="font-semibold">Total Monthly Cost</span><span className="font-bold text-2xl text-primary">{result.totalCost.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="font-semibold">Annual Employment Cost</span><span className="font-bold text-muted-foreground">{result.annualCost.toFixed(2)}</span></div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل الراتب الأساسي الشهري للموظف.",
        "أدخل نسبة اشتراكات التأمينات الاجتماعية على صاحب العمل (مثل نسبة GOSI في السعودية).",
        "أدخل البدلات الشهرية: السكن والمواصلات والتأمين الطبي والمزايا الأخرى.",
        "اضغط \"احسب\" لمعرفة التكلفة الحقيقية للتوظيف شهرياً وسنوياً.",
      ] : [
        "Enter the employee's monthly basic salary.",
        "Enter your employer social contribution rate (e.g. GOSI % in KSA).",
        "Fill in monthly allowances: housing, transport, medical insurance, and other benefits.",
        "Click Calculate to see the true monthly and annual cost of employment.",
      ]}
      formula={lang === "ar" ? (
        <p>التكلفة الإجمالية = الراتب الأساسي + البدلات + اشتراكات التأمينات على صاحب العمل + التأمين الطبي + المزايا الأخرى</p>
      ) : (
        <p>Total Cost = Basic + Allowances + Employer Social Contributions + Medical + Other Benefits</p>
      )}
      example={lang === "ar" ? (
        <p>راتب أساسي <span dir="ltr">$3,000</span>، بدل سكن <span dir="ltr">$500</span>، بدل مواصلات <span dir="ltr">$200</span>، اشتراكات اجتماعية 12٪ (<span dir="ltr">$360</span>) = <span dir="ltr">$4,060</span> شهرياً = <span dir="ltr">$48,720</span> سنوياً</p>
      ) : (
        <p>Basic $3,000, Housing $500, Transport $200, Employer Social 12% ($360) = $4,060/month = $48,720/year</p>
      )}
      faq={[
        { q: "What employer contributions are typical in Saudi Arabia?", a: "In KSA, employers pay 9% of Saudi national salaries to GOSI (General Organization for Social Insurance). For expatriate employees, only the 2% Work Injury contribution applies. Rates can change; always verify with GOSI's official portal before running payroll." },
        { q: "Should I include the annual bonus in this calculation?", a: "Add the monthly equivalent of any guaranteed bonus (total bonus ÷ 12) to the 'Other' field for a complete picture. Discretionary bonuses that aren't contractually guaranteed can be excluded from the budgeted employment cost." },
        { q: "What is the employment cost multiplier vs. basic salary?", a: "For a Saudi national employee, total employment cost is typically 1.3–1.5× the basic salary once you include all employer contributions and allowances. For expatriates, the multiplier is often lower (1.2–1.4×) because social insurance contributions are smaller." },
        { q: "What allowances are standard in GCC employment packages?", a: "Common GCC allowances: housing (typically 25–40% of basic salary), transport (SAR 400–1,000/month in KSA is common), and employer-paid medical insurance (required by law in Saudi Arabia, UAE, and other GCC states). Education allowances are common for senior roles." },
        { q: "How does this calculator help with workforce planning?", a: "By showing the true annualized cost per employee, you can accurately budget headcount, compare the cost of full-time vs. contract staff, and calculate the minimum revenue each role must generate to be profitable — a key metric for any growing business." },
      ]}
      relatedTools={[
        { href: "/calculators/overtime", name: t("calc.overtime.name") },
        { href: "/calculators/leave-balance", name: t("calc.leave.name") },
        { href: "/calculators/break-even", name: t("calc.break_even.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">Basic Salary (monthly)</Label>
          <Input ref={basicRef} type="number" min="0" defaultValue="" placeholder="3000" data-testid="salary-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Employer Social Contribution %</Label>
          <Input ref={socialRef} type="number" min="0" max="50" defaultValue="" placeholder="12" data-testid="social-input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Housing Allowance</Label>
            <Input ref={housingRef} type="number" min="0" defaultValue="" placeholder="500" data-testid="housing-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Transport Allowance</Label>
            <Input ref={transportRef} type="number" min="0" defaultValue="" placeholder="200" data-testid="transport-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Medical Insurance</Label>
            <Input ref={medicalRef} type="number" min="0" defaultValue="" placeholder="100" data-testid="medical-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Other Benefits</Label>
            <Input ref={otherRef} type="number" min="0" defaultValue="" placeholder="0" data-testid="other-input" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
