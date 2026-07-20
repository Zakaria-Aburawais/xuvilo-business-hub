import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcImportCost } from "@/lib/calculations";

export default function ImportCostPage() {
  const { t, lang } = useLanguage();
  const purchaseRef = useRef<HTMLInputElement>(null);
  const freightRef = useRef<HTMLInputElement>(null);
  const insuranceRef = useRef<HTMLInputElement>(null);
  const customsRef = useRef<HTMLInputElement>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const unitsRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ cif: number; duty: number; total: number; perUnit: number; units: number } | null>(null);

  const calculate = () => {
    const p = parseFloat(purchaseRef.current?.value ?? "") || 0;
    const fr = parseFloat(freightRef.current?.value ?? "") || 0;
    const ins = parseFloat(insuranceRef.current?.value ?? "") || 0;
    const cus = parseFloat(customsRef.current?.value ?? "") || 0;
    const loc = parseFloat(localRef.current?.value ?? "") || 0;
    const u = parseInt(unitsRef.current?.value ?? "1") || 1;
    setResult(calcImportCost(p, fr, ins, cus, loc, u));
    trackEvent("calculator_used", { calculator: "import-cost", language: lang });
  };

  const reset = () => {
    if (purchaseRef.current) purchaseRef.current.value = "";
    if (freightRef.current) freightRef.current.value = "";
    if (insuranceRef.current) insuranceRef.current.value = "";
    if (customsRef.current) customsRef.current.value = "";
    if (localRef.current) localRef.current.value = "";
    if (unitsRef.current) unitsRef.current.value = "";
    setResult(null);
  };

  return (
    <CalculatorLayout
      title={t("calc.import_cost.name")}
      description={t("calc.import_cost.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">CIF Value (Cost+Insurance+Freight)</span><span className="font-bold">{result.cif.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Customs Duty</span><span className="font-bold text-orange-600">{result.duty.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm border-t pt-2"><span className="font-semibold">Total Landed Cost</span><span className="font-bold text-2xl text-primary">{result.total.toFixed(2)}</span></div>
          {result.units > 1 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost per Unit</span><span className="font-bold">{result.perUnit.toFixed(2)}</span></div>}
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل سعر شراء البضاعة (قيمة فاتورة المورّد).",
        "أضف تكلفة الشحن وتكلفة التأمين حتى ميناء الوصول.",
        "أدخل نسبة الرسوم الجمركية لفئة منتجك (مثلاً 5 تعني 5٪).",
        "أضف رسوم التوصيل المحلي وعدد الوحدات، ثم اضغط \"احسب\".",
      ] : [
        "Enter the purchase price of the goods (supplier invoice value).",
        "Add the freight cost and insurance cost to your destination port.",
        "Enter the customs duty rate for your product category (e.g. 5 for 5%).",
        "Add any local delivery charges and the number of units, then click Calculate.",
      ]}
      formula={lang === "ar" ? (
        <p>قيمة <span dir="ltr">CIF</span> = سعر الشراء + الشحن + التأمين<br/>الرسوم الجمركية = قيمة <span dir="ltr">CIF</span> × نسبة الجمارك ٪<br/>التكلفة الإجمالية = قيمة <span dir="ltr">CIF</span> + الرسوم الجمركية + التوصيل المحلي</p>
      ) : (
        <p>CIF = Purchase Price + Freight + Insurance<br/>Duty = CIF × Customs Rate %<br/>Total = CIF + Duty + Local Delivery</p>
      )}
      example={lang === "ar" ? (
        <p>شراء <span dir="ltr">$5,000</span> + شحن <span dir="ltr">$800</span> + تأمين <span dir="ltr">$100</span> = قيمة <span dir="ltr">CIF</span> <span dir="ltr">$5,900</span>. رسوم جمركية 5٪ = <span dir="ltr">$295</span>. توصيل محلي <span dir="ltr">$200</span>. الإجمالي = <span dir="ltr">$6,395</span></p>
      ) : (
        <p>Purchase $5,000 + Freight $800 + Insurance $100 = CIF $5,900. 5% duty = $295. Local $200. Total = $6,395</p>
      )}
      faq={[
        { q: "What is CIF?", a: "CIF (Cost, Insurance, Freight) is the valuation basis used by most customs authorities worldwide to calculate import duties. It equals the supplier invoice price plus the cost of international freight and insurance to the destination port." },
        { q: "What is the total landed cost?", a: "Landed cost is everything you pay to bring a product from the supplier's factory to your warehouse: purchase price + international freight + insurance + customs duty + local port and clearing fees + inland delivery. This calculator combines all these elements into one total." },
        { q: "What is a typical customs duty rate?", a: "Duty rates depend on the product's HS (Harmonized System) code, its country of origin, and the destination country. GCC countries typically apply a 5% standard tariff on most goods, with higher rates on tobacco, alcohol, and some luxury items. Always verify with your customs broker or the official customs authority tariff schedule." },
        { q: "How do Free Trade Agreements (FTAs) affect import duties?", a: "Under FTAs, goods originating in a member country may qualify for reduced or zero import duties. The GCC has FTAs with Singapore and some EFTA states and is negotiating others. To claim the preferential rate, you need a certificate of origin proving your goods meet the required rules of origin." },
        { q: "What is the difference between CIF and FOB pricing?", a: "FOB (Free On Board) means the seller's price only covers costs until goods are loaded onto the vessel. CIF means the seller's price includes international freight and insurance to the destination port. Most customs authorities use CIF for duty calculation; the USA is a notable exception and uses FOB." },
      ]}
      relatedTools={[
        { href: "/calculators/shipping-cbm", name: t("calc.cbm.name") },
        { href: "/calculators/vat-tax", name: t("calc.vat.name") },
        { href: "/calculators/freight-cbw", name: t("calc.freight_cbw.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">Purchase Price</Label>
          <Input ref={purchaseRef} type="number" min="0" defaultValue="" placeholder="5000" data-testid="purchase-input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">Freight Cost</Label>
            <Input ref={freightRef} type="number" min="0" defaultValue="" placeholder="800" data-testid="freight-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Insurance</Label>
            <Input ref={insuranceRef} type="number" min="0" defaultValue="" placeholder="100" data-testid="insurance-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-sm">Customs Duty %</Label>
            <Input ref={customsRef} type="number" min="0" max="100" defaultValue="" placeholder="5" data-testid="customs-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Local Delivery</Label>
            <Input ref={localRef} type="number" min="0" defaultValue="" placeholder="200" data-testid="local-input" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Number of Units (for per-unit cost)</Label>
          <Input ref={unitsRef} type="number" min="1" defaultValue="" placeholder="1" data-testid="units-input" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={calculate} className="flex-1" data-testid="calculate-btn">{t("calc.calculate")}</Button>
          <Button variant="outline" onClick={reset} data-testid="reset-btn">{t("calc.reset")}</Button>
        </div>
      </div>
    </CalculatorLayout>
  );
}
