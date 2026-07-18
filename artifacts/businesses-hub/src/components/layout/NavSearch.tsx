import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText, FileCheck2, Receipt, Layers, Calculator,
  Stamp, MailOpen, FolderOpen, Tag, BookOpen, User as UserIcon,
  CreditCard, Building2, BadgePercent, DollarSign, Coins, Globe2,
  Box, Clock, CalendarClock, ShoppingCart, TrendingUp, Banknote,
  Receipt as ReceiptIcon, Wallet, Plane, LogIn, UserPlus, Settings as SettingsIcon,
  LayoutDashboard, Shield, ScrollText,
} from "lucide-react";

interface NavSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAR: boolean;
  isLoggedIn: boolean;
}

interface Item {
  href: string;
  en: string;
  ar: string;
  keywords?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "documents" | "design" | "utilities" | "account";
}

const ITEMS: Item[] = [
  // Documents
  { href: "/invoice",            en: "Create Invoice",     ar: "إنشاء فاتورة",      icon: FileText,    group: "documents", keywords: "bill billing" },
  { href: "/quotation",          en: "Create Quotation",   ar: "إنشاء عرض سعر",     icon: FileCheck2,  group: "documents", keywords: "quote estimate" },
  { href: "/receipt",            en: "Create Receipt",     ar: "إنشاء إيصال",       icon: Receipt,     group: "documents", keywords: "payment proof" },
  { href: "/templates/invoice",  en: "Invoice Templates",  ar: "قوالب الفواتير",    icon: Layers,      group: "documents" },
  { href: "/templates/quotation",en: "Quotation Templates",ar: "قوالب عروض الأسعار", icon: Layers,      group: "documents" },
  { href: "/templates/receipt",  en: "Receipt Templates",  ar: "قوالب الإيصالات",   icon: Layers,      group: "documents" },

  // Design tools
  { href: "/tools/stamp-maker",      en: "Stamp Maker",       ar: "صانع الأختام",   icon: Stamp,    group: "design", keywords: "seal" },
  { href: "/tools/business-card",    en: "Business Card Maker", ar: "بطاقة عمل",     icon: CreditCard, group: "design", keywords: "card" },
  { href: "/tools/company-profile",  en: "Company Profile",   ar: "ملف الشركة",     icon: Building2, group: "design", keywords: "profile pdf" },

  // Utilities & calculators
  { href: "/calculators",                       en: "All Calculators",         ar: "جميع الحاسبات",        icon: Calculator,    group: "utilities" },
  { href: "/calculators/profit-margin",         en: "Profit Margin Calculator",ar: "هامش الربح",            icon: BadgePercent,  group: "utilities" },
  { href: "/calculators/discount",              en: "Discount Calculator",     ar: "حاسبة الخصم",           icon: BadgePercent,  group: "utilities" },
  { href: "/calculators/vat-tax",               en: "VAT / Tax Calculator",    ar: "ضريبة القيمة المضافة",  icon: DollarSign,    group: "utilities" },
  { href: "/calculators/currency-exchange",     en: "Currency Converter",      ar: "محول العملات",         icon: Coins,         group: "utilities" },
  { href: "/calculators/shipping-cbm",          en: "Shipping CBM Calculator", ar: "حجم الشحن",             icon: Box,           group: "utilities" },
  { href: "/calculators/freight-cbw",           en: "Freight CBW Calculator",  ar: "وزن الشحن",             icon: Plane,         group: "utilities" },
  { href: "/calculators/overtime",              en: "Overtime Calculator",     ar: "حاسبة الوقت الإضافي",   icon: Clock,         group: "utilities" },
  { href: "/calculators/leave-balance",         en: "Leave Balance Calculator",ar: "رصيد الإجازات",        icon: CalendarClock, group: "utilities" },
  { href: "/calculators/import-cost",           en: "Import Cost Calculator",  ar: "تكلفة الاستيراد",       icon: ShoppingCart,  group: "utilities" },
  { href: "/calculators/break-even",            en: "Break-even Calculator",   ar: "نقطة التعادل",          icon: TrendingUp,    group: "utilities" },
  { href: "/calculators/markup-margin",         en: "Markup vs Margin",        ar: "الترميز مقابل الهامش",  icon: TrendingUp,    group: "utilities" },
  { href: "/calculators/loan",                  en: "Loan Calculator",         ar: "حاسبة القروض",         icon: Banknote,      group: "utilities" },
  { href: "/calculators/invoice-aging",         en: "Invoice Aging",           ar: "تقادم الفواتير",        icon: ReceiptIcon,   group: "utilities" },
  { href: "/calculators/salary-cost",           en: "Salary Cost",             ar: "تكلفة الراتب",          icon: Wallet,        group: "utilities" },
  { href: "/tools/tracker",                     en: "Invoice Tracker",         ar: "متتبع الفواتير",       icon: FolderOpen,    group: "utilities" },
  { href: "/tools/temp-email",                  en: "Temporary Email",         ar: "البريد المؤقت",         icon: MailOpen,      group: "utilities" },
  { href: "/blog",                              en: "Blog",                    ar: "المدونة",               icon: BookOpen,      group: "utilities" },
  { href: "/pricing",                           en: "Pricing",                 ar: "الأسعار",               icon: Tag,           group: "utilities" },

  // Account
  { href: "/login",     en: "Sign In",       ar: "تسجيل الدخول", icon: LogIn,         group: "account" },
  { href: "/signup",    en: "Create Account",ar: "إنشاء حساب",   icon: UserPlus,      group: "account" },
  { href: "/dashboard", en: "Dashboard",     ar: "لوحة التحكم",  icon: LayoutDashboard, group: "account" },
  { href: "/settings",  en: "Settings",      ar: "الإعدادات",    icon: SettingsIcon,  group: "account" },
  { href: "/privacy",   en: "Privacy",       ar: "الخصوصية",     icon: Shield,        group: "account" },
  { href: "/terms",     en: "Terms",         ar: "الشروط",       icon: ScrollText,    group: "account" },
];

const GROUP_TITLES: Record<Item["group"], { en: string; ar: string }> = {
  documents: { en: "Documents", ar: "المستندات" },
  design:    { en: "Design Tools", ar: "أدوات التصميم" },
  utilities: { en: "Utilities & Calculators", ar: "أدوات وحاسبات" },
  account:   { en: "Account", ar: "الحساب" },
};

export function NavSearch({ open, onOpenChange, isAR, isLoggedIn }: NavSearchProps) {
  const [, navigate] = useLocation();

  const items = ITEMS.filter((it) => {
    if (it.group !== "account") return true;
    if (isLoggedIn) return it.href !== "/login" && it.href !== "/signup";
    return it.href !== "/dashboard" && it.href !== "/settings";
  });

  const groupedItems = (Object.keys(GROUP_TITLES) as Item["group"][])
    .map((g) => ({ group: g, list: items.filter((it) => it.group === g) }))
    .filter((g) => g.list.length > 0);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={isAR ? "ابحث عن أداة أو حاسبة أو صفحة…" : "Search tools, calculators, pages…"}
        data-testid="nav-search-input"
      />
      <CommandList>
        <CommandEmpty>
          {isAR ? "لا توجد نتائج" : "No results found"}
        </CommandEmpty>
        {groupedItems.map(({ group, list }, idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={isAR ? GROUP_TITLES[group].ar : GROUP_TITLES[group].en}>
              {list.map((it) => {
                const Icon = it.icon;
                const label = isAR ? it.ar : it.en;
                const value = `${it.en} ${it.ar} ${it.keywords ?? ""} ${it.href}`.toLowerCase();
                return (
                  <CommandItem
                    key={it.href}
                    value={value}
                    onSelect={() => handleSelect(it.href)}
                    data-testid={`nav-search-item-${it.href}`}
                  >
                    <Icon className="me-2 h-4 w-4 text-blue-500" />
                    <span>{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function useCmdK(setOpen: (v: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Deterministic open — close is handled by Escape / dialog controls.
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);
}

export function useNavSearchToggle() {
  const [open, setOpen] = useState(false);
  useCmdK(setOpen);
  return { open, setOpen };
}
