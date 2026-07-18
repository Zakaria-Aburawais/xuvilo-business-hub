import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcInvoiceAging } from "@/lib/calculations";

export default function InvoiceAgingPage() {
  const { t, lang } = useLanguage();
  const dueDateRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dailyRateRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ daysOverdue: number; lateFee: number; totalOwed: number; status: string } | null>(null);

  const calculate = () => {
    const dueDate = dueDateRef.current?.value;
    if (!dueDate) return;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const amt = parseFloat(amountRef.current?.value ?? "") || 0;
    const rate = parseFloat(dailyRateRef.current?.value ?? "0.1") || 0;
    setResult(calcInvoiceAging(due, today, amt, rate));
    trackEvent("calculator_used", { calculator: "invoice-aging", language: lang });
  };

  const reset = () => {
    if (dueDateRef.current) dueDateRef.current.value = "";
    if (amountRef.current) amountRef.current.value = "";
    if (dailyRateRef.current) dailyRateRef.current.value = "";
    setResult(null);
  };

  const statusColor = result?.status === "Current" ? "text-green-600" : result?.status === "Overdue" ? "text-orange-600" : "text-red-600";

  return (
    <CalculatorLayout
      title={t("calc.invoice_aging.name")}
      description={t("calc.invoice_aging.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-bold ${statusColor}`}>{result.status}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Days Overdue</span>
            <span className={`font-bold text-2xl ${result.daysOverdue > 0 ? "text-red-600" : "text-green-600"}`}>{result.daysOverdue > 0 ? result.daysOverdue : 0}</span>
          </div>
          {result.daysOverdue > 0 && (
            <>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Late Fee</span><span className="font-bold text-orange-600">{result.lateFee.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm border-t pt-2"><span className="font-semibold">Total Owed</span><span className="font-bold text-primary">{result.totalOwed.toFixed(2)}</span></div>
            </>
          )}
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "اختر تاريخ استحقاق الفاتورة.",
        "أدخل مبلغ الفاتورة المستحق.",
        "أدخل نسبة غرامة التأخير اليومية (مثلاً 0.1 تعني 0.1٪ يومياً) — اترك 0 إذا كنت لا تفرض غرامات.",
        "اضغط \"احسب\" لمعرفة أيام التأخير وحالة التقادم والمبلغ الإجمالي المستحق.",
      ] : [
        "Pick the invoice's due date.",
        "Enter the outstanding invoice amount.",
        "Enter your daily late-fee rate (e.g. 0.1 for 0.1% per day) — leave 0 if you don't charge late fees.",
        "Click Calculate to see days overdue, the aging status, and the total owed.",
      ]}
      formula={<p>Days Overdue = Today − Due Date<br/>Late Fee = Invoice Amount × Daily Rate % × Days Overdue<br/>Total Owed = Invoice Amount + Late Fee</p>}
      example={<p>Invoice $5,000 due Jan 1, checked Feb 15 = 45 days overdue. At 0.1%/day → Late fee = $225 → Total = $5,225</p>}
      faq={[
        { q: "What is a typical late payment rate?", a: "Common rates range from 1.5% to 2% per month (0.05–0.067% per day). Some jurisdictions set legal maximum rates — EU commercial transactions fall under the Late Payment Directive. Always state your late fee policy on the original invoice so it is legally enforceable." },
        { q: "What does invoice aging mean in accounting?", a: "Invoice aging (accounts receivable aging) groups outstanding invoices by how long they have been unpaid: 0–30 days, 31–60 days, 61–90 days, and 90+ days. An aging report helps businesses identify overdue accounts early, allocate collection effort, and calculate bad-debt provisions." },
        { q: "When should I start following up on a late payment?", a: "Best practice: send a friendly reminder 3–5 days before the due date, a polite follow-up on the due date, and increasingly firm reminders at 7, 14, and 30 days overdue. Early outreach dramatically improves collection rates. After 60+ days, consider involving a collection agency." },
        { q: "Can I charge late fees without stating them on the invoice?", a: "In most jurisdictions, late fees must be agreed to in advance — either in your contract or clearly stated on the original invoice. Adding a late fee clause retrospectively is generally not enforceable. Include your payment terms and late fee rate on every invoice from the very first one." },
        { q: "What is Days Sales Outstanding (DSO)?", a: "DSO measures how many days on average it takes to collect payment: DSO = (Accounts Receivable ÷ Total Credit Revenue) × Number of Days. A rising DSO signals a cash flow risk. Target a DSO below your standard payment terms — ideally below 30 days for Net 30 customers." },
      ]}
      relatedTools={[
        { href: "/invoice", name: t("tool.invoice.name") },
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">Invoice Due Date</Label>
          <Input ref={dueDateRef} type="date" defaultValue="" data-testid="due-date-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Invoice Amount</Label>
          <Input ref={amountRef} type="number" min="0" defaultValue="" placeholder="5000" data-testid="amount-input" />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Daily Late Fee Rate %</Label>
          <Input ref={dailyRateRef} type="number" min="0" step="0.01" defaultValue="" placeholder="0.1" data-testid="rate-input" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
