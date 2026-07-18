import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { ALL_CURRENCIES, COMMON_CURRENCIES, type Currency } from "@/lib/currencies";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface CurrencySelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function CurrencySelect({ value, onChange, className, "data-testid": testId }: CurrencySelectProps) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = ALL_CURRENCIES.find(c => c.code === value) ?? ALL_CURRENCIES[0];

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const common = ALL_CURRENCIES.filter(c => COMMON_CURRENCIES.includes(c.code));
  const rest = ALL_CURRENCIES.filter(c => !COMMON_CURRENCIES.includes(c.code));

  const filterCurrencies = (list: Currency[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  };

  const filteredCommon = filterCurrencies(common);
  const filteredRest = filterCurrencies(rest);

  const handleSelect = (c: Currency) => {
    onChange(c.code);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)} data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors text-start"
      >
        <span className="text-base">{selected.flag}</span>
        <span className="font-medium">{selected.code}</span>
        <span className="text-muted-foreground text-xs hidden sm:inline truncate flex-1">{selected.name}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground ms-auto flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search currency..."
                className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-64">
            {filteredCommon.length > 0 && !search && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                  Common
                </div>
                {filteredCommon.map(c => (
                  <CurrencyOption key={c.code} currency={c} selected={value === c.code} onSelect={handleSelect} />
                ))}
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border-t border-border">
                  All Currencies
                </div>
              </>
            )}
            {filteredRest.map(c => (
              <CurrencyOption key={c.code} currency={c} selected={value === c.code} onSelect={handleSelect} />
            ))}
            {filteredCommon.length === 0 && filteredRest.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">No currencies found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CurrencyOption({ currency, selected, onSelect }: { currency: Currency; selected: boolean; onSelect: (c: Currency) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(currency)}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-start",
        selected && "bg-primary/10 text-primary font-medium"
      )}
    >
      <span className="text-base w-6 text-center">{currency.flag}</span>
      <span className="font-medium w-10 flex-shrink-0">{currency.code}</span>
      <span className="text-muted-foreground truncate">{currency.name}</span>
      <span className="ms-auto text-muted-foreground flex-shrink-0">{currency.symbol}</span>
    </button>
  );
}
