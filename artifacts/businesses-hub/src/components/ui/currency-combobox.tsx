import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CURRENCIES_LIST } from "@/lib/pdf-utils";

interface CurrencyComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function CurrencyCombobox({ value, onValueChange, className, "data-testid": testId }: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = CURRENCIES_LIST.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          data-testid={testId}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background",
            "hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="truncate">
            {selected ? (
              <span>
                <span className="font-medium">{selected.code}</span>
                <span className="text-muted-foreground"> — {selected.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select currency…</span>
            )}
          </span>
          <ChevronsUpDown className="ms-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[300px] p-0 shadow-xl"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search by code or name…" />
          <CommandList className="max-h-[260px] overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No currency found.
            </CommandEmpty>
            <CommandGroup>
              {CURRENCIES_LIST.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name}`}
                  onSelect={() => {
                    onValueChange(c.code);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                >
                  <span className="w-10 shrink-0 font-mono text-xs font-semibold text-foreground">{c.code}</span>
                  <span className="text-sm text-muted-foreground truncate">{c.name}</span>
                  {value === c.code && <Check className="ms-auto h-4 w-4 shrink-0 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
