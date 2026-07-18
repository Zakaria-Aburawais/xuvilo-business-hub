import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, PlusCircle, Hash, Package, ChevronDown, X, HelpCircle, Upload, Download } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LineItem } from "@/types/document";
import { calcLineItemTotal, formatNumber } from "@/lib/calculations";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { csvToLineItems, lineItemsToCsv, downloadCsv } from "@/lib/csv";
import { useToast } from "@/hooks/use-toast";

interface SavedProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  taxPct?: number;
}

interface LineItemsTableProps {
  items: LineItem[];
  currency: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  /** Optional — when supplied, adds CSV import/export buttons. Receives parsed rows; the parent decides how to merge/replace. */
  onImportCsv?: (items: LineItem[]) => void;
  /** Filename stem for CSV exports, e.g. "invoice-INV-001". ".csv" is appended. */
  csvFilename?: string;
}

/* ── NumericCell ──────────────────────────────────────────────────────────────
 * A controlled number-as-text input that preserves what the user typed
 * (so "0", "0.5", "1." etc. don't disappear or jump). It only commits a parsed
 * number to the parent on every change but keeps the local string for display.
 */
function NumericCell({
  value,
  onChange,
  placeholder,
  testId,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  testId?: string;
  max?: number;
}) {
  const [text, setText] = useState<string>(() => (value === 0 ? "" : String(value)));
  const focused = useRef(false);

  // Keep local text in sync when the parent value changes from outside (e.g. catalog picker)
  // but only when the input isn't actively being typed in.
  useEffect(() => {
    if (focused.current) return;
    const parsed = parseFloat(text);
    const same = Number.isFinite(parsed) ? parsed === value : value === 0;
    if (!same) setText(value === 0 ? "" : String(value));
  }, [value, text]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only empty, digits, single dot. (Disallow leading "-" — these fields are non-negative.)
    if (!/^\d*\.?\d*$/.test(raw)) return;
    setText(raw);
    if (raw === "" || raw === ".") {
      onChange(0);
      return;
    }
    let n = parseFloat(raw);
    if (!Number.isFinite(n)) n = 0;
    if (typeof max === "number" && n > max) n = max;
    onChange(n);
  }, [onChange, max]);

  const handleBlur = useCallback(() => {
    focused.current = false;
    const parsed = parseFloat(text);
    if (!Number.isFinite(parsed)) {
      setText("");
      return;
    }
    let n = parsed;
    if (typeof max === "number" && n > max) n = max;
    setText(n === 0 ? "" : String(n));
    if (n !== value) onChange(n);
  }, [text, value, onChange, max]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        // Select existing value on focus so the user can immediately overtype
        // — the most common interaction in a line-items table.
        e.currentTarget.select();
      }}
      onChange={handleChange}
      onBlur={handleBlur}
      data-testid={testId}
      className="h-9 text-sm"
    />
  );
}

function LabelWithHint({
  children,
  hint,
  testId,
}: {
  children: React.ReactNode;
  hint: string;
  testId?: string;
}) {
  return (
    <Label className="text-xs text-muted-foreground inline-flex items-center gap-1">
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={typeof children === "string" ? `${children} info` : "More info"}
            data-testid={testId}
            className="text-muted-foreground/70 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
          {hint}
        </TooltipContent>
      </Tooltip>
    </Label>
  );
}

function CatalogPicker({ onSelect }: { onSelect: (p: SavedProduct) => void }) {
  const { user, activeWorkspaceId } = useAuth();
  const { can } = usePlan();
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !can("saved_products")) return;
    try {
      const key = `bh_products_${user.email}_${activeWorkspaceId}`;
      const raw = localStorage.getItem(key);
      setProducts(raw ? JSON.parse(raw) : []);
    } catch { setProducts([]); }
  }, [user, activeWorkspaceId, can]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user || !can("saved_products") || products.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 border border-violet-200 dark:border-violet-800 rounded-md px-1.5 py-0.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
      >
        <Package className="w-3 h-3" />
        Catalog
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-60 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-500">Products ({products.length})</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors"
            >
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{p.name}</div>
              <div className="text-[10px] text-gray-500">Price: {p.price}{p.taxPct ? ` · Tax: ${p.taxPct}%` : ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LineItemsTable({ items, currency, onAdd, onRemove, onUpdate, onImportCsv, csvFilename }: LineItemsTableProps) {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const isAR = lang === "ar";
  const symbol = getCurrencySymbol(currency);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tt = (en: string, ar: string) => (isAR ? ar : en);

  const handleExport = useCallback(() => {
    const csv = lineItemsToCsv(items);
    const stem = (csvFilename || "line-items").replace(/[^a-zA-Z0-9._-]/g, "_");
    downloadCsv(`${stem}.csv`, csv);
  }, [items, csvFilename]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow importing the same file twice
    if (!file || !onImportCsv) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const { items: parsed, errors } = csvToLineItems(text);
      if (errors.length > 0 && parsed.length === 0) {
        toast({ title: tt("Import failed", "فشل الاستيراد"), description: errors[0], variant: "destructive" });
        return;
      }
      onImportCsv(parsed);
      toast({
        title: tt("Items imported", "تم استيراد العناصر"),
        description: tt(`${parsed.length} item${parsed.length === 1 ? "" : "s"} imported.`, `تم استيراد ${parsed.length} عنصرًا.`),
      });
    };
    reader.onerror = () => {
      toast({ title: tt("Could not read file", "تعذرت قراءة الملف"), variant: "destructive" });
    };
    reader.readAsText(file);
  }, [onImportCsv, toast, tt]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-sm text-foreground">{t("doc.line_items")}</h3>
          <div className="flex items-center gap-2 ms-auto">
            <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            {onImportCsv && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFile}
                  data-testid="line-items-csv-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="line-items-import-csv"
                  className="h-7 px-2 text-[11px]"
                >
                  <Upload className="w-3 h-3 me-1" />
                  {tt("Import CSV", "استيراد CSV")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={items.length === 0}
                  data-testid="line-items-export-csv"
                  className="h-7 px-2 text-[11px]"
                >
                  <Download className="w-3 h-3 me-1" />
                  {tt("Export CSV", "تصدير CSV")}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3 transition-shadow hover:shadow-sm"
            >
              {/* Row header: item number + catalog picker + delete */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Hash className="w-3.5 h-3.5" />
                  Item {idx + 1}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <CatalogPicker
                    onSelect={(p) => onUpdate(item.id, {
                      description: p.description || p.name,
                      unitPrice: p.price,
                      taxPct: p.taxPct ?? item.taxPct,
                    })}
                  />
                  <button
                    onClick={() => onRemove(item.id)}
                    disabled={items.length === 1}
                    data-testid={`item-remove-${item.id}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description — full width */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("doc.item_description")}</Label>
                <Input
                  placeholder="e.g. Website Design, Consulting, Product..."
                  value={item.description}
                  onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                  data-testid={`item-description-${item.id}`}
                  className="h-9 text-sm"
                />
              </div>

              {/* Qty + Unit Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("doc.item_qty")}</Label>
                  <NumericCell
                    value={item.quantity}
                    onChange={(n) => onUpdate(item.id, { quantity: n })}
                    placeholder="1"
                    testId={`item-qty-${item.id}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("doc.item_unit_price")} ({symbol})
                  </Label>
                  <NumericCell
                    value={item.unitPrice}
                    onChange={(n) => onUpdate(item.id, { unitPrice: n })}
                    placeholder="0.00"
                    testId={`item-unit-price-${item.id}`}
                  />
                </div>
              </div>

              {/* Discount + Tax + Line Total */}
              <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-3 items-end">
                <div className="space-y-1">
                  <LabelWithHint
                    hint={tt(
                      "Discount applied to this line as a percentage of (Qty × Unit Price). Use 0 for no discount.",
                      "خصم يُطبَّق على هذا البند كنسبة مئوية من (الكمية × سعر الوحدة). استخدم 0 لعدم وجود خصم.",
                    )}
                    testId={`item-discount-hint-${item.id}`}
                  >
                    {t("doc.item_discount")} (%)
                  </LabelWithHint>
                  <NumericCell
                    value={item.discountPct}
                    onChange={(n) => onUpdate(item.id, { discountPct: n })}
                    placeholder="0"
                    max={100}
                    testId={`item-discount-${item.id}`}
                  />
                </div>
                <div className="space-y-1">
                  <LabelWithHint
                    hint={tt(
                      "Tax (e.g. VAT) applied to this line after the discount, as a percentage. KSA standard VAT is 15%, UAE 5%.",
                      "ضريبة (مثل القيمة المضافة) تُطبَّق على هذا البند بعد الخصم كنسبة مئوية. ضريبة القيمة المضافة في السعودية 15% وفي الإمارات 5%.",
                    )}
                    testId={`item-tax-hint-${item.id}`}
                  >
                    {t("doc.item_tax")} (%)
                  </LabelWithHint>
                  <NumericCell
                    value={item.taxPct}
                    onChange={(n) => onUpdate(item.id, { taxPct: n })}
                    placeholder="0"
                    max={100}
                    testId={`item-tax-${item.id}`}
                  />
                </div>
                {/* Line total */}
                <div
                  className="h-9 flex items-center justify-end px-3 rounded-lg bg-primary/8 border border-primary/20 font-semibold text-sm text-primary"
                  data-testid={`item-total-${item.id}`}
                >
                  {symbol} {formatNumber(calcLineItemTotal(item))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          data-testid="add-line-item"
          className="flex items-center gap-2 border-dashed hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          {t("doc.add_item")}
        </Button>
      </div>
    </TooltipProvider>
  );
}
