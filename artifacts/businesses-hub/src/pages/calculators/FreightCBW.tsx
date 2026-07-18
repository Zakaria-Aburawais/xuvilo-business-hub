import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { CalculatorLayout } from "@/components/calculators/CalculatorLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcFreightCBW, FREIGHT_FACTORS } from "@/lib/calculations";

export default function FreightCBWPage() {
  const { t, lang } = useLanguage();
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [qty, setQty] = useState("");
  const [mode, setMode] = useState<"air" | "sea" | "road">("air");
  const [result, setResult] = useState<{ cbm: number; volWeight: number; actualWeight: number; chargeableWeight: number; factor: number } | null>(null);

  const calculate = () => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const wt = parseFloat(weight) || 0;
    const q = parseInt(qty) || 1;
    setResult(calcFreightCBW(l, w, h, wt, q, mode));
    trackEvent("calculator_used", { calculator: "freight-cbw", language: lang });
  };

  const reset = () => { setLength(""); setWidth(""); setHeight(""); setWeight(""); setQty(""); setResult(null); };

  return (
    <CalculatorLayout
      title={t("calc.freight_cbw.name")}
      description={t("calc.freight_cbw.desc")}
      result={result ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Volume (CBM)</span><span className="font-bold">{result.cbm.toFixed(4)} m³</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Volumetric Weight (×{result.factor})</span><span className="font-bold">{result.volWeight.toFixed(2)} kg</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Actual Weight</span><span className="font-bold">{result.actualWeight.toFixed(2)} kg</span></div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-semibold">Chargeable Weight</span>
            <span className="font-bold text-2xl text-primary">{result.chargeableWeight.toFixed(2)} kg</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {result.volWeight > result.actualWeight ? "⚠️ Volumetric weight applies (item is light but bulky)" : "✓ Actual weight applies"}
          </p>
        </div>
      ) : undefined}
      howToUse={lang === "ar" ? [
        "اختر وسيلة الشحن — جوي أو بحري أو بري (لكل وسيلة معامل حجمي مختلف).",
        "أدخل أبعاد الكرتونة بالسنتيمتر ووزن القطعة الواحدة بالكيلوغرام.",
        "أدخل عدد القطع.",
        "اضغط \"احسب\" لمعرفة أيهما يُطبَّق: الوزن الحجمي أم الفعلي، والوزن الخاضع للرسوم.",
      ] : [
        "Choose your freight mode — air, sea, or road (each uses a different volumetric factor).",
        "Enter the carton dimensions in centimeters and the weight per piece in kilograms.",
        "Enter the number of pieces.",
        "Click Calculate to see whether volumetric or actual weight applies and the chargeable weight.",
      ]}
      formula={
        <div>
          <p>CBM = L(cm) × W(cm) × H(cm) ÷ 1,000,000</p>
          <p>Volumetric Weight = CBM × Factor (Air: 167, Sea: 1000, Road: 333)</p>
          <p>Chargeable Weight = max(Actual Weight, Volumetric Weight)</p>
        </div>
      }
      example={<p>Box 80×60×50cm, 10kg, air freight → CBM = 0.24m³ → Vol = 40.1kg → Chargeable = 40.1kg (volumetric)</p>}
      faq={[
        { q: "Why is the sea freight volumetric factor 1,000 kg/m³?", a: "Ships carry dense, heavy goods and are rarely volume-constrained, so sea freight uses a generous volumetric factor of 1 CBM = 1,000 kg. This means a light but bulky cargo item weighing under 1,000 kg per cubic meter is billed by actual weight — very different from air freight." },
        { q: "What are the common air freight volumetric factors?", a: "Most IATA airlines use 1 kg = 6,000 cm³, equivalent to 167 kg/m³. Some carriers and premium services use 1 kg = 5,000 cm³ (200 kg/m³). Always confirm the exact factor with your airline or freight forwarder before booking, as it directly determines your freight cost." },
        { q: "What is the road freight volumetric factor?", a: "Road freight typically uses 1 CBM = 333 kg (the 1:3 rule). This sits between air and sea: road tolerates denser cargo than air but lighter cargo than sea. Some road freight operators use different factors depending on the vehicle type, load type, or route." },
        { q: "How can I reduce volumetric charges on air shipments?", a: "Use packaging that fits tightly around the product, eliminating wasted cubic space. Consolidate multiple items into one shipment. Remove unnecessary packaging inserts. If the shipment is not time-critical, switching to sea or road freight will dramatically reduce volumetric penalties." },
        { q: "What is the difference between the FreightCBW and ShippingCBM calculators?", a: "ShippingCBM calculates total cubic meters and chargeable weight for a single carton size with multiple pieces, defaulting to air freight factor. FreightCBW specifically compares volumetric weight across all three freight modes (air, sea, road) and their respective standard volumetric factors, helping you choose the most cost-effective shipping method." },
      ]}
      relatedTools={[
        { href: "/calculators/shipping-cbm", name: t("calc.cbm.name") },
        { href: "/calculators/import-cost", name: t("calc.import_cost.name") },
      ]}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm">Freight Mode</Label>
          <Select value={mode} onValueChange={v => setMode(v as typeof mode)}>
            <SelectTrigger data-testid="mode-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="air">✈️ Air Freight (factor: {FREIGHT_FACTORS.air})</SelectItem>
              <SelectItem value="sea">🚢 Sea Freight (factor: {FREIGHT_FACTORS.sea})</SelectItem>
              <SelectItem value="road">🚛 Road Freight (factor: {FREIGHT_FACTORS.road})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Length (cm)</Label>
            <Input type="number" min="0" value={length} onChange={e => setLength(e.target.value)} placeholder="80" data-testid="length-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Width (cm)</Label>
            <Input type="number" min="0" value={width} onChange={e => setWidth(e.target.value)} placeholder="60" data-testid="width-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height (cm)</Label>
            <Input type="number" min="0" value={height} onChange={e => setHeight(e.target.value)} placeholder="50" data-testid="height-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Weight (kg/piece)</Label>
            <Input type="number" min="0" value={weight} onChange={e => setWeight(e.target.value)} placeholder="10" data-testid="weight-input" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pieces</Label>
            <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="1" data-testid="qty-input" />
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
