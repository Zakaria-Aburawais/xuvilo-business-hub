import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcOvertime } from "@/lib/calculations";

export default function OvertimePage() {
  const { t, lang } = useLanguage();
  const [hourlyRate, setHourlyRate] = useState("");
  const [regularHours, setRegularHours] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [result, setResult] = useState<{ regularPay: number; overtimePay: number; total: number } | null>(null);

  const calculate = () => {
    setResult(calcOvertime(
      parseFloat(hourlyRate) || 0,
      parseFloat(regularHours) || 8,
      parseFloat(overtimeHours) || 0,
      parseFloat(multiplier) || 1.5,
    ));
    trackEvent("calculator_used", { calculator: "overtime", language: lang });
  };
  const reset = () => { setHourlyRate(""); setRegularHours(""); setOvertimeHours(""); setMultiplier(""); setResult(null); };

  return (
    <CalculatorLayout
      title={t("calc.overtime.name")}
      description={t("calc.overtime.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.overtime.regular_pay")}</span><span className="font-bold">{result.regularPay.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.overtime.overtime_pay")}</span><span className="font-bold text-orange-600">{result.overtimePay.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm border-t pt-2"><span className="font-semibold">{t("calc.overtime.total")}</span><span className="font-bold text-2xl text-primary">{result.total.toFixed(2)}</span></div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل أجر الموظف بالساعة.",
        "أدخل ساعات العمل الاعتيادية وساعات العمل الإضافي.",
        "حدّد معامل العمل الإضافي (1.5 هو الأكثر شيوعاً).",
        "اضغط \"احسب\" لمعرفة الأجر الاعتيادي وأجر العمل الإضافي والإجمالي.",
      ] : [
        "Enter the employee's hourly rate.",
        "Enter the regular hours worked and the overtime hours.",
        "Set the overtime multiplier (1.5 is the most common).",
        "Click Calculate to see regular pay, overtime pay, and the total.",
      ]}
      formula={lang === "ar" ? (
        <p>أجر العمل الإضافي = الأجر بالساعة × المعامل × ساعات العمل الإضافي<br/>الإجمالي = الأجر الاعتيادي + أجر العمل الإضافي</p>
      ) : (
        <p>Overtime Pay = Hourly Rate × Multiplier × OT Hours<br/>Total = Regular Pay + Overtime Pay</p>
      )}
      example={lang === "ar" ? (
        <p>أجر <span dir="ltr">$20</span> بالساعة، 8 ساعات اعتيادية، 3 ساعات إضافية بمعامل <span dir="ltr">1.5</span> ← الأجر الاعتيادي: <span dir="ltr">$160</span> + أجر العمل الإضافي: <span dir="ltr">$90</span> = الإجمالي: <span dir="ltr">$250</span></p>
      ) : (
        <p>Hourly $20, 8 regular hrs, 3 OT hrs @ 1.5x → Regular: $160 + OT: $90 = Total: $250</p>
      )}
      faq={[
        { q: "What is the standard overtime multiplier?", a: "Most countries require 1.5× (time-and-a-half) for weekday overtime and 2× for weekends or public holidays. GCC rules vary: Saudi Arabia's Labor Law Article 107 mandates a 50% premium on the basic hourly rate. UAE labor law requires 25% above normal pay for weekday overtime and 50% for Friday work. Always verify your local labor law." },
        { q: "Is overtime calculated on basic salary or total salary?", a: "Overtime is typically calculated on the basic hourly rate, excluding allowances, bonuses, and commissions. The basic hourly rate is the monthly basic salary divided by the number of standard working hours per month (often 208 in KSA, 192 in UAE)." },
        { q: "How is the hourly rate derived from a monthly salary?", a: "Divide the monthly basic salary by the standard working hours per month. In Saudi Arabia: 8 hrs/day × 26 days = 208 hrs/month. In UAE: 8 hrs/day × 24 days = 192 hrs/month. Example: SAR 3,000 ÷ 208 = SAR 14.42/hour." },
        { q: "Is there a legal cap on overtime hours?", a: "Yes. Most labor laws limit total overtime. Saudi Arabia's Labor Law caps overtime at 10 additional hours per day and 50 hours per year in normal circumstances. UAE law limits overtime to 2 hours per day. Exceeding these caps exposes employers to regulatory penalties and back-pay claims." },
        { q: "What happens if overtime is not paid?", a: "Unpaid overtime is a labor law violation in virtually all jurisdictions and can result in back-pay awards, government fines, reputational harm, and in serious cases, criminal liability. Maintain accurate time records and reconcile overtime with every payroll cycle." },
      ]}
      relatedTools={[
        { href: "/calculators/leave-balance", name: t("calc.leave.name") },
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.overtime.hourly_rate")}</Label>
          <Input type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="20" data-testid="hourly-rate-input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">{t("calc.overtime.regular_hours")}</Label>
            <Input type="number" min="0" value={regularHours} onChange={(e) => setRegularHours(e.target.value)} placeholder="8" data-testid="regular-hours-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">{t("calc.overtime.overtime_hours")}</Label>
            <Input type="number" min="0" value={overtimeHours} onChange={(e) => setOvertimeHours(e.target.value)} placeholder="3" data-testid="ot-hours-input" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.overtime.multiplier")}</Label>
          <Input type="number" min="1" step="0.25" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} placeholder="1.5" data-testid="multiplier-input" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
