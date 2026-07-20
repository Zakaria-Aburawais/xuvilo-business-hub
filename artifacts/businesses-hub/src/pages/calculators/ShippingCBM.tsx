import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcCBM } from "@/lib/calculations";

export default function ShippingCBMPage() {
  const { t, lang } = useLanguage();
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [qty, setQty] = useState("");
  const [result, setResult] = useState<{ cbmPerUnit: number; totalCBM: number; volumetricWeight: number; chargeableWeight: number } | null>(null);

  const calculate = () => {
    setResult(calcCBM(
      parseFloat(length) || 0,
      parseFloat(width) || 0,
      parseFloat(height) || 0,
      parseInt(qty) || 1,
      parseFloat(weight) || 0,
    ));
    trackEvent("calculator_used", { calculator: "shipping-cbm", language: lang });
  };
  const reset = () => { setLength(""); setWidth(""); setHeight(""); setWeight(""); setQty(""); setResult(null); };

  return (
    <CalculatorLayout
      title={t("calc.cbm.name")}
      description={t("calc.cbm.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.cbm.cbm")} (per unit)</span><span className="font-bold">{result.cbmPerUnit.toFixed(4)} m³</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.cbm.total_cbm")}</span><span className="font-bold text-2xl text-primary">{result.totalCBM.toFixed(4)} m³</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Volumetric Weight</span><span className="font-bold">{result.volumetricWeight.toFixed(2)} kg</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("calc.cbm.chargeable")}</span><span className="font-bold text-orange-600">{result.chargeableWeight.toFixed(2)} kg</span></div>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "أدخل أبعاد الكرتونة (الطول والعرض والارتفاع) بالسنتيمتر.",
        "أدخل الوزن الفعلي بالكيلوغرام وعدد الكراتين.",
        "اضغط \"احسب\" لمعرفة إجمالي الحجم (CBM) والوزن الحجمي والوزن الخاضع للرسوم.",
      ] : [
        "Enter the carton dimensions (length, width, height) in centimeters.",
        "Enter the actual weight in kilograms and the number of cartons.",
        "Click Calculate to see total CBM, volumetric weight, and the chargeable weight.",
      ]}
      formula={lang === "ar" ? (
        <div>
          <p>الحجم <span dir="ltr">(CBM)</span> = الطول × العرض × الارتفاع ÷ 1,000,000 (بالسنتيمتر)</p>
          <p>الوزن الحجمي = الحجم × <span dir="ltr">167 kg/m³</span></p>
          <p>الوزن الخاضع للرسوم = الأكبر بين الوزن الفعلي والوزن الحجمي</p>
        </div>
      ) : (
        <div>
          <p>CBM = Length × Width × Height ÷ 1,000,000 (in cm)</p>
          <p>Volumetric Weight = CBM × 167 kg/m³</p>
          <p>Chargeable Weight = max(Actual Weight, Volumetric Weight)</p>
        </div>
      )}
      example={lang === "ar" ? (
        <p>كرتونة: <span dir="ltr">100×60×50</span> سم، الوزن: 20 كجم ← الحجم = <span dir="ltr">0.3 m³</span> ← الوزن الحجمي = 50.1 كجم ← الوزن الخاضع للرسوم = 50.1 كجم</p>
      ) : (
        <p>Box: 100cm × 60cm × 50cm, Weight: 20kg → CBM = 0.3 m³ → Volumetric = 50.1 kg → Chargeable = 50.1 kg</p>
      )}
      faq={[
        { q: "What is CBM in shipping?", a: "CBM (Cubic Meter) is the standard volumetric unit for measuring cargo size in freight. Carriers bill the higher of actual weight vs. volumetric weight, so calculating CBM in advance lets you forecast shipping costs accurately before booking." },
        { q: "What volumetric weight factor does this calculator use?", a: "For sea freight (LCL), the standard is 1 CBM = 1,000 kg. For air freight, most carriers use 1 CBM = 167 kg (the 1:6000 rule). This calculator defaults to 167 kg/m³. Always confirm the exact factor with your freight forwarder or carrier as it can differ by carrier and route." },
        { q: "What is the difference between CBM and chargeable weight?", a: "CBM measures volume. Chargeable weight is the billable weight used to calculate your freight rate — it is the higher of actual weight and volumetric weight. A bulky but light shipment (e.g. foam packaging) will be charged on its volumetric weight, not its actual weight." },
        { q: "How do I calculate CBM for irregular shapes?", a: "Measure the maximum length, width, and height of the bounding box that contains the item. Most carriers bill on the smallest rectangular box that fully contains the shipment. Efficient, tight packing minimizes wasted cubic space and reduces freight costs." },
        { q: "When is sea freight more cost-effective than air?", a: "Sea freight (FCL or LCL) typically costs 4–6× less per CBM than air freight. It is the right choice for heavy or non-urgent shipments — usually anything over 200 kg or 1 CBM. Air freight is justified for time-sensitive, high-value, or very lightweight goods where the volumetric penalty is low." },
      ]}
      relatedTools={[
        { href: "/calculators/currency-exchange", name: t("calc.currency.name") },
        { href: "/calculators/vat-tax", name: t("calc.vat.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("calc.cbm.length")}</Label>
            <Input type="number" min="0" value={length} onChange={(e) => setLength(e.target.value)} placeholder="100" data-testid="length-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("calc.cbm.width")}</Label>
            <Input type="number" min="0" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="60" data-testid="width-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("calc.cbm.height")}</Label>
            <Input type="number" min="0" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="50" data-testid="height-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("calc.cbm.weight")}</Label>
            <Input type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="20" data-testid="weight-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("calc.cbm.quantity")}</Label>
            <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1" data-testid="qty-input" />
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
