import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { calcVAT } from "@/lib/calculations";

export default function VATPage() {
  const { t, lang } = useLanguage();

  // Start empty so users don't have to delete defaults. The Calculate handler
  // shows an explicit validation error when the amount is missing instead of
  // silently producing "0.00" results.
  const [amount, setAmount] = useState("");
  const [rate, setRate]     = useState("");
  const [mode, setMode]     = useState<"add" | "extract">("add");
  const [result, setResult] = useState<{ net: number; vatAmount: number; gross: number } | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const calculate = () => {
    const parsedAmount = parseFloat(amount);
    const parsedRate   = parseFloat(rate);

    // Validate before calling calcVAT so users see an explicit message
    // instead of a silent 0.00 output.
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t("calc.vat.error_amount") || "Please enter a valid amount greater than zero.");
      setResult(null);
      return;
    }
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setError(t("calc.vat.error_rate") || "VAT rate must be between 0 and 100.");
      setResult(null);
      return;
    }

    const res = calcVAT(parsedAmount, parsedRate, mode);
    if (!res) {
      setError("Calculation failed — please check your inputs.");
      setResult(null);
      return;
    }

    setError(null);
    setResult(res);
    trackEvent("calculator_used", { calculator: "vat", language: lang });
  };

  const reset = () => {
    setAmount("");
    setRate("");
    setMode("add");
    setResult(null);
    setError(null);
  };

  return (
    <CalculatorLayout
      title={t("calc.vat.name")}
      description={t("calc.vat.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("calc.vat.net")}</span>
            <span className="font-bold">{result.net.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("calc.vat.vat_amount")}</span>
            <span className="font-bold text-orange-600">{result.vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("calc.vat.gross")}</span>
            <span className="font-bold text-2xl text-primary">{result.gross.toFixed(2)}</span>
          </div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل المبلغ (السعر الصافي لإضافة الضريبة، أو السعر الإجمالي لاستخراجها).",
        "أدخل نسبة الضريبة (مثلاً 15 للسعودية و5 للإمارات).",
        "اختر \"إضافة الضريبة\" أو \"استخراج الضريبة\"، ثم اضغط \"احسب\".",
      ] : [
        "Enter the amount (net price to add VAT, or gross price to extract VAT).",
        "Enter the VAT rate (e.g. 15 for Saudi Arabia, 5 for UAE).",
        "Choose Add VAT or Extract VAT, then click Calculate.",
      ]}
      formula={
        <div>
          <p><strong>Add VAT:</strong> Gross = Net × (1 + Rate/100)</p>
          <p><strong>Extract VAT:</strong> Net = Gross / (1 + Rate/100) · VAT = Gross - Net</p>
        </div>
      }
      example={<p>$1,000 + 15% VAT = $1,150. Extracting VAT from $1,150 at 15% → Net = $1,000, VAT = $150.</p>}
      faq={[
        { q: "What is the standard VAT rate in Saudi Arabia?", a: "The standard VAT rate in Saudi Arabia (KSA) is 15%, raised from 5% in July 2020. It applies to most goods and services. Verify the current rate with ZATCA (the Saudi tax authority) for your specific product or service category." },
        { q: "What is the VAT rate in the UAE?", a: "The UAE introduced VAT at 5% in January 2018. It applies to most goods and services, with zero-rated categories including international exports, certain food items, and healthcare. Basic financial services are exempt." },
        { q: "How do I extract VAT from a total (VAT-inclusive) price?", a: "Divide the gross amount by (1 + VAT rate / 100). Example: SAR 115 ÷ 1.15 = SAR 100 net, SAR 15 VAT. This is the 'reverse VAT' or 'VAT extraction' formula." },
        { q: "Is VAT charged on exports?", a: "In most GCC countries, goods and services exported outside the GCC are zero-rated — VAT is charged at 0%. Sellers don't charge output VAT but can still reclaim input VAT on related costs. Always check with your tax adviser for cross-border transactions." },
        { q: "Which MENA countries charge VAT and at what rates?", a: "As of 2026: Saudi Arabia 15%, UAE 5%, Bahrain 10%, Oman 5%, Egypt 14%. Jordan uses a General Sales Tax (GST) at 16%. Qatar has introduced a VAT framework but it is not yet in effect. Always verify current rates with the official tax authority in each country." },
        { q: "Can I use this calculator for a ZATCA-compliant invoice?", a: "This calculator computes the VAT amounts you need to display on an invoice. For a fully ZATCA-compliant e-invoice in Saudi Arabia — including the mandatory QR code, seller TIN, and XML format — use the Xuvilo invoice generator which builds all required ZATCA fields automatically." },
      ]}
      relatedTools={[
        { href: "/calculators/profit-margin", name: t("calc.profit_margin.name") },
        { href: "/calculators/discount", name: t("calc.discount.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.vat.amount")}</Label>
          <Input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
            placeholder="1000"
            data-testid="amount-input"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">{t("calc.vat.rate")}</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={rate}
            onChange={(e) => { setRate(e.target.value); setError(null); }}
            placeholder="15"
            data-testid="rate-input"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t("calc.vat.mode")}</Label>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "add" | "extract")} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="add" id="add" data-testid="mode-add" />
              <Label htmlFor="add" className="text-sm font-normal cursor-pointer">{t("calc.vat.add")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="extract" id="extract" data-testid="mode-extract" />
              <Label htmlFor="extract" className="text-sm font-normal cursor-pointer">{t("calc.vat.extract")}</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Inline validation error */}
        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
