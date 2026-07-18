import { useLanguage } from "@/context/LanguageContext";
import type { DocumentTotals } from "@/types/document";
import { formatNumber } from "@/lib/calculations";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { Separator } from "@/components/ui/separator";

interface TotalsSectionProps {
  totals: DocumentTotals;
  currency: string;
}

export function TotalsSection({ totals, currency }: TotalsSectionProps) {
  const { t } = useLanguage();
  const sym = getCurrencySymbol(currency);

  const rows = [
    { label: t("doc.subtotal"), value: totals.subtotal, bold: false },
    { label: t("doc.discount_total"), value: -totals.discountTotal, bold: false },
    { label: t("doc.tax_total"), value: totals.taxTotal, bold: false },
  ];

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium">{sym} {formatNumber(Math.abs(row.value))}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between text-base font-bold">
          <span>{t("doc.grand_total")}</span>
          <span data-testid="grand-total">{sym} {formatNumber(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
