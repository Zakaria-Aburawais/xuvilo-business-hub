import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcLeaveBalance } from "@/lib/calculations";

export default function LeaveBalancePage() {
  const { t, lang } = useLanguage();
  const [entitlement, setEntitlement] = useState("");
  const [daysTaken, setDaysTaken] = useState("");
  const [monthsWorked, setMonthsWorked] = useState("");
  const [result, setResult] = useState<{ accrued: number; remaining: number } | null>(null);

  const calculate = () => {
    setResult(calcLeaveBalance(
      parseInt(entitlement) || 30,
      parseInt(daysTaken) || 0,
      parseInt(monthsWorked) || 12,
    ));
    trackEvent("calculator_used", { calculator: "leave-balance", language: lang });
  };
  const reset = () => { setEntitlement(""); setDaysTaken(""); setMonthsWorked(""); setResult(null); };

  return (
    <CalculatorLayout
      title={t("calc.leave.name")}
      description={t("calc.leave.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.leave.accrued")}</span><span className="font-bold">{result.accrued.toFixed(1)} days</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.leave.days_taken")}</span><span className="font-bold">{parseInt(daysTaken) || 0} days</span></div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-semibold">{t("calc.leave.remaining")}</span>
            <span className={`font-bold text-2xl ${result.remaining >= 0 ? "text-primary" : "text-destructive"}`}>{result.remaining.toFixed(1)} days</span>
          </div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل رصيد الإجازة السنوية بالأيام (مثلاً 21 أو 30).",
        "أدخل عدد الأشهر التي عملها الموظف في سنة الإجازة الحالية.",
        "أدخل عدد أيام الإجازة المستخدمة.",
        "اضغط \"احسب\" لمعرفة الرصيد المستحق والرصيد المتبقي.",
      ] : [
        "Enter the annual leave entitlement in days (e.g. 21 or 30).",
        "Enter how many months the employee has worked this leave year.",
        "Enter how many leave days have already been taken.",
        "Click Calculate to see the accrued and remaining balance.",
      ]}
      formula={<p>Accrued Leave = (Annual Entitlement ÷ 12) × Months Worked<br/>Remaining = Accrued - Days Taken</p>}
      example={<p>30 days entitlement, 9 months worked → Accrued = 22.5 days. Taken 10 days → Remaining = 12.5 days.</p>}
      faq={[
        { q: "What is the annual leave entitlement in Saudi Arabia?", a: "Saudi Labor Law gives employees 21 calendar days per year for the first five years of service, rising to 30 calendar days after five years. This is the statutory minimum; employment contracts may offer more." },
        { q: "Can unused leave carry over to the next year?", a: "It depends on your employment contract and local labor law. Saudi Labor Law generally requires leave to be taken within the year but allows carry-forward by mutual written agreement. UAE law allows carry-over for up to one year, after which unused leave is typically forfeited or paid out. Always check your specific contract." },
        { q: "How does leave accrue during a partial year?", a: "Leave accrues pro-rata: Annual entitlement ÷ 12 × months worked. Example: 21 days entitlement after 9 months = 21 × (9/12) = 15.75 days accrued. Most employers round to the nearest half-day." },
        { q: "What is the annual leave entitlement in the UAE?", a: "UAE Federal Decree-Law No. 33 of 2021 grants 2.5 calendar days of leave per month, totaling 30 days per year after one full year of service. Employees with less than one year accrue leave proportionally (2.5 days per completed month)." },
        { q: "Can an employer pay cash instead of granting leave?", a: "In most GCC countries, employees can receive payment in lieu of accrued leave when they leave employment (as part of the end-of-service settlement). However, paying out leave instead of allowing it to be taken while the employee is still working is generally not permitted under GCC labor law." },
      ]}
      relatedTools={[
        { href: "/calculators/overtime", name: t("calc.overtime.name") },
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.leave.annual_entitlement")}</Label>
          <Input type="number" min="0" value={entitlement} onChange={(e) => setEntitlement(e.target.value)} placeholder="30" data-testid="entitlement-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.leave.months_worked")}</Label>
          <Input type="number" min="0" max="12" value={monthsWorked} onChange={(e) => setMonthsWorked(e.target.value)} placeholder="12" data-testid="months-worked-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.leave.days_taken")}</Label>
          <Input type="number" min="0" value={daysTaken} onChange={(e) => setDaysTaken(e.target.value)} placeholder="10" data-testid="days-taken-input" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
