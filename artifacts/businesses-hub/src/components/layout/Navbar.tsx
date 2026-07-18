import { useState, useEffect, useRef, useCallback } from "react";
import { getRfqDashboardStats } from "@/lib/rfqApi";
import { CURRENCY_COUNT_DISPLAY } from "@/lib/site-stats";
import { Link, useLocation } from "wouter";
import {
  Menu, X, Moon, Sun, ChevronDown,
  FileText, FileCheck2, Receipt, Layers, Calculator,
  Stamp, MailOpen, FolderOpen, Tag, BookOpen,
  LogOut, Settings as SettingsIcon, Search, CreditCard, Building2,
  Sparkles, MessageSquare, ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth, isAdmin } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ToolsTicker } from "./ToolsTicker";
import { NavSearch, useNavSearchToggle } from "./NavSearch";

const R1 = "M16 10 Q14 8 17 8 L23 8 Q26 8 26 11 L29 50 Q29 58 22 60 Q14 60 14 53 Q14 50 17 50 Q20 50 20 52 L20 53 L19 13 Q19 11 17 11 Z";
const R2 = "M30 10 Q28 8 31 8 L37 8 Q40 8 40 11 L43 56 Q43 65 35 66 Q26 66 26 58 Q26 55 29 55 Q32 55 32 57 L32 58 L33 13 Q33 11 31 11 Z";
const R3 = "M44 10 Q42 8 45 8 L51 8 Q54 8 54 11 L57 48 Q57 56 50 58 Q42 58 42 51 Q42 48 45 48 Q48 48 48 50 L48 51 L47 13 Q47 11 45 11 Z";

/* Floating-silk animation: the three ribbons sway continuously and gently,
   like strips of silk in a light breeze. Subtler angles than the page loader
   because the header logo is small and always in view. The turbulence filter
   adds a slow cloth-like ripple. */
const NAV_RIBBON_STYLES = `
.xvn-r{transform-box:fill-box;transform-origin:50% 6%;will-change:transform;pointer-events:none}
@keyframes xvn-sway1{
  0%,100%{transform:rotate(-1.8deg) skewX(-1.2deg) translateY(0)}
  33%{transform:rotate(1.4deg) skewX(1.6deg) translateY(-.9px)}
  66%{transform:rotate(-.6deg) skewX(-1.8deg) translateY(-.4px)}
}
@keyframes xvn-sway2{
  0%,100%{transform:rotate(1.6deg) skewX(1.3deg) translateY(-.5px)}
  33%{transform:rotate(-1.5deg) skewX(-1.6deg) translateY(0)}
  66%{transform:rotate(.8deg) skewX(1.8deg) translateY(-1px)}
}
@keyframes xvn-sway3{
  0%,100%{transform:rotate(-1.3deg) skewX(1.5deg) translateY(-.7px)}
  33%{transform:rotate(1.7deg) skewX(-1.4deg) translateY(-.2px)}
  66%{transform:rotate(-.8deg) skewX(1.1deg) translateY(-1.1px)}
}
.xvn-r.s1{animation:xvn-sway1 4.6s ease-in-out infinite}
.xvn-r.s2{animation:xvn-sway2 5.6s ease-in-out -1.3s infinite}
.xvn-r.s3{animation:xvn-sway3 4.1s ease-in-out -2.2s infinite}
@media(prefers-reduced-motion:reduce){
  .xvn-r.s1,.xvn-r.s2,.xvn-r.s3{animation:none}
  .xvn-cloth{filter:none}
}
`;

function XuviloNavLogo() {
  return (
    <>
      <style>{NAV_RIBBON_STYLES}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg
          width={44} height={44}
          viewBox="0 0 100 100"
          aria-hidden="true"
          style={{ overflow: "visible", flexShrink: 0, display: "block" }}
        >
          <defs>
            <linearGradient id="xvn-g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b"/>
              <stop offset="55%" stopColor="#1e40af"/>
              <stop offset="100%" stopColor="#2563eb"/>
            </linearGradient>
            <linearGradient id="xvn-g2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb"/>
              <stop offset="100%" stopColor="#60a5fa"/>
            </linearGradient>
            <linearGradient id="xvn-g3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc"/>
              <stop offset="100%" stopColor="#bae6fd"/>
            </linearGradient>
            <filter id="xvn-silk" x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves={2} seed={4} result="n">
                <animate attributeName="baseFrequency" dur="8s"
                         values="0.012 0.05;0.018 0.072;0.012 0.05" repeatCount="indefinite"/>
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale={3}
                                 xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          <g className="xvn-cloth" filter="url(#xvn-silk)" transform="translate(50 50) scale(1.389) translate(-35.5 -37)">
            <g className="xvn-r s1"><path d={R1} fill="url(#xvn-g1)"/></g>
            <g className="xvn-r s2"><path d={R2} fill="url(#xvn-g2)"/></g>
            <g className="xvn-r s3"><path d={R3} fill="url(#xvn-g3)"/></g>
          </g>
        </svg>
        <div style={{ lineHeight: 1.05 }}>
          <div style={{
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            fontSize: 20, fontWeight: 700,
            color: "var(--color-blue-800, #1e40af)", letterSpacing: "-.02em",
          }}>
            Xuvilo
          </div>
          <div style={{
            fontFamily: "'Inter',system-ui,sans-serif",
            fontSize: 8, fontWeight: 500, letterSpacing: ".22em",
            color: "var(--color-gray-500, #6b7280)", textTransform: "uppercase",
          }}>
            Business Hub
          </div>
        </div>
      </div>
    </>
  );
}

function RfqDeadlineBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState<{ pending: number; overdue: number } | null>(null);
  useEffect(() => {
    if (!user) { setCount(null); return; }
    let cancelled = false;
    void (async () => {
      try {
        const s = await getRfqDashboardStats();
        if (!cancelled) setCount({ pending: s.pending ?? 0, overdue: s.overdue ?? 0 });
      } catch { /* silent — badge is optional */ }
    })();
    return () => { cancelled = true; };
  }, [user]);
  if (!count || (count.pending === 0 && count.overdue === 0)) return null;
  const total = count.pending + count.overdue;
  const danger = count.overdue > 0;
  return (
    <span
      className={`ms-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold ${
        danger ? "bg-red-500 text-white" : "bg-violet-500 text-white"
      }`}
      data-testid="rfq-badge"
    >
      {total}
    </span>
  );
}

function AnnouncementBar() {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem("ann-bar-v3-dismissed") === "1"
  );
  if (dismissed) return null;
  return (
    <div className="relative min-h-9 flex items-center justify-center bg-gradient-to-r from-blue-600 to-violet-600 shrink-0 py-1.5">
      <Link href="/invoice" className="text-white text-xs sm:text-sm font-medium hover:underline px-8 text-center leading-tight">
        <span className="sm:hidden">✦ {t("nav.announcement.sm")}</span>
        <span className="hidden sm:inline">✦ {t("nav.announcement.md").replace("{count}", CURRENCY_COUNT_DISPLAY)}</span>
      </Link>
      <button
        onClick={() => { setDismissed(true); localStorage.setItem("ann-bar-v3-dismissed", "1"); }}
        className="absolute end-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface MenuItem {
  href: string;
  label: string;
  desc?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  dividerBefore?: boolean;
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

export function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const search = useNavSearchToggle();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdowns on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setUserOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenMenu(null);
    setUserOpen(false);
    setMobileOpen(false);
    setOpenMobileGroup(null);
  }, [location]);

  const isAR = lang === "ar";

  const PROTECTED_PATHS = ["/tools/tracker", "/tracker"];

  const handleLogout = useCallback(() => {
    logout();
    toast({
      title: isAR ? "تم تسجيل الخروج" : "Signed out",
      description: isAR ? "تم تسجيل خروجك بنجاح." : "You've been signed out successfully.",
    });
    if (PROTECTED_PATHS.some(p => location.startsWith(p))) {
      navigate("/");
    }
  }, [logout, toast, location, navigate, isAR]);

  const groups: MenuGroup[] = [
    {
      id: "documents",
      label: isAR ? "المستندات" : "Documents",
      items: [
        { href: "/invoice",                    label: isAR ? "فاتورة" : "Invoice",                      desc: isAR ? "إنشاء فواتير احترافية" : "Create professional invoices",   icon: FileText },
        { href: "/quotation",                  label: isAR ? "عرض سعر" : "Quotation",                   desc: isAR ? "أرسل عروض الأسعار" : "Send polished quotes",               icon: FileCheck2 },
        { href: "/receipt",                    label: isAR ? "إيصال" : "Receipt",                       desc: isAR ? "إثبات الدفع" : "Issue payment receipts",                  icon: Receipt },
        { href: "/templates/invoice",          label: isAR ? "قوالب" : "Templates",                    desc: isAR ? "320+ تصميم جاهز" : "320+ ready-made designs",             icon: Layers },
        { href: "/arabic-invoice-generator",   label: isAR ? "مولد الفواتير العربية" : "Arabic Invoice Generator",   desc: isAR ? "فواتير عربية جاهزة للطباعة" : "Arabic-ready invoices",        icon: FileText,    dividerBefore: true },
        { href: "/zatca-invoice-saudi",        label: isAR ? "فاتورة ZATCA" : "ZATCA Invoice",          desc: isAR ? "متوافق مع هيئة الزكاة" : "Saudi ZATCA-compliant",           icon: ShieldCheck },
        { href: "/quotation-generator-arabic", label: isAR ? "عرض سعر عربي" : "Arabic Quotation",      desc: isAR ? "عروض أسعار باللغة العربية" : "Bilingual quote generator",    icon: FileCheck2 },
      ],
    },
    {
      id: "design",
      label: isAR ? "أدوات التصميم" : "Design Tools",
      items: [
        { href: "/tools/stamp-maker",     label: isAR ? "صانع الأختام" : "Stamp Maker",      desc: isAR ? "أختام شركة جاهزة" : "Custom company stamps",          icon: Stamp },
        { href: "/tools/business-card",   label: isAR ? "بطاقة عمل" : "Business Card",        desc: isAR ? "صمم وحمّل" : "Design and download",                   icon: CreditCard, badge: "NEW" },
        { href: "/tools/company-profile", label: isAR ? "ملف الشركة" : "Company Profile",     desc: isAR ? "ملف PDF احترافي" : "Polished PDF profile",            icon: Building2,  badge: "NEW" },
      ],
    },
    {
      id: "utilities",
      label: isAR ? "أدوات" : "Utilities",
      items: [
        { href: "/calculators",       label: isAR ? "الحاسبات" : "Calculators",   desc: isAR ? "14 حاسبة عمل" : "14 business calculators",  icon: Calculator },
        { href: "/tools/tracker",     label: isAR ? "متتبع الفواتير" : "Invoice Tracker", desc: isAR ? "للمشتركين فقط" : "Subscribers only",        icon: FolderOpen },
        { href: "/tools/temp-email",  label: isAR ? "بريد مؤقت" : "Temp Email",  desc: isAR ? "صناديق بريد مؤقتة" : "Disposable inboxes",  icon: MailOpen },
        { href: "/blog",              label: isAR ? "المدونة" : "Blog",          desc: isAR ? "نصائح ودروس" : "Tips & guides",             icon: BookOpen },
      ],
    },
  ];

  const aiWriterLabel = isAR ? "كاتب الذكاء الاصطناعي" : "AI Writer";

  const isActive = (href: string) =>
    location === href ||
    (href === "/templates/invoice" && location.startsWith("/templates")) ||
    (href === "/calculators" && location.startsWith("/calculators"));

  const groupHasActive = (g: MenuGroup) => g.items.some((it) => isActive(it.href));

  const triggerCls = (active: boolean, isOpen: boolean) => cn(
    "inline-flex items-center gap-1 px-2 2xl:px-2.5 py-2 rounded-xl text-xs 2xl:text-sm font-semibold transition-all duration-200 select-none whitespace-nowrap min-h-[44px]",
    active || isOpen
      ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-700/60",
  );

  return (
    <div className="sticky top-0 z-50 flex flex-col">
      <AnnouncementBar />
      <ToolsTicker />
      <nav
        className={cn(
          "bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 transition-all duration-300",
          scrolled && "shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 sm:h-24 items-center gap-2 xl:gap-3 min-w-0 overflow-hidden">

            {/* ── Brand ── */}
            <Link
              href="/"
              className="flex items-center flex-shrink-0 group"
              data-testid="nav-brand"
              aria-label={t("nav.brand")}
            >
              <XuviloNavLogo />
            </Link>

            {/* ── Desktop grouped nav (lg+) ── */}
            <div ref={navRef} className="hidden xl:flex flex-1 items-center justify-start gap-0.5 2xl:gap-1 ms-1 2xl:ms-2 min-w-0 overflow-hidden">
              {groups.map((g) => {
                const isOpen = openMenu === g.id;
                const active = groupHasActive(g);
                return (
                  <div key={g.id} className="relative">
                    <button
                      type="button"
                      className={triggerCls(active, isOpen)}
                      onClick={() => setOpenMenu(isOpen ? null : g.id)}
                      aria-expanded={isOpen}
                      aria-haspopup="menu"
                      data-testid={`nav-group-${g.id}`}
                    >
                      <span>{g.label}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
                    </button>

                    {isOpen && (
                      <div
                        className="absolute top-full mt-2 start-0 w-72 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl shadow-gray-300/30 dark:shadow-black/50 py-2 z-50"
                      >
                        {g.items.map((it) => {
                          const Icon = it.icon;
                          const itemActive = isActive(it.href);
                          return (
                            <div key={it.href}>
                              {it.dividerBefore && (
                                <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-800" />
                              )}
                              <Link
                                href={it.href}
                                onClick={() => setOpenMenu(null)}
                                data-testid={`nav-item-${it.href.replace(/\//g, "-").replace(/^-/, "")}`}
                                className={cn(
                                  "flex items-start gap-3 px-3 py-2.5 mx-1 rounded-xl cursor-pointer transition-colors no-underline",
                                  itemActive
                                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                                )}
                              >
                                <div className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                                  itemActive
                                    ? "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                                )}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-sm">{it.label}</span>
                                    {it.badge && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">{it.badge}</span>
                                    )}
                                  </div>
                                  {it.desc && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{it.desc}</p>
                                  )}
                                </div>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* AI Writer — promoted top-level link.
                  Arabic label "كاتب الذكاء الاصطناعي" is ~180px wide and causes
                  RTL overflow at xl (1280px). Show icon-only at xl in AR; full
                  label + badge at 2xl (1536px+) or always in EN. */}
              <Link
                href="/ai-writer"
                data-testid="nav-link-ai-writer"
                title={aiWriterLabel}
                aria-label={aiWriterLabel}
                className={cn(
                  triggerCls(isActive("/ai-writer"), false),
                  "relative",
                )}
              >
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span className={isAR ? "hidden 2xl:inline" : ""}>{aiWriterLabel}</span>
                <span className={cn(
                  "ms-1 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full leading-none",
                  isAR && "hidden 2xl:inline",
                )}>
                  NEW
                </span>
              </Link>

              {/* Pricing — flat link */}
              <Link
                href="/pricing"
                data-testid="nav-link-pricing"
                className={triggerCls(isActive("/pricing"), false)}
              >
                <Tag className="w-4 h-4" />
                <span>{isAR ? "الأسعار" : "Pricing"}</span>
              </Link>

              {/* Contact — flat link */}
              <Link
                href="/contact"
                data-testid="nav-link-contact"
                className={triggerCls(isActive("/contact"), false)}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isAR ? "اتصل بنا" : "Contact"}</span>
              </Link>
            </div>

            {/* ── Right action controls (lg+) ── */}
            <div className="hidden xl:flex items-center gap-1.5 2xl:gap-2 flex-shrink-0 relative z-10">

              {/* Search trigger */}
              <button
                onClick={() => search.setOpen(true)}
                className="flex items-center gap-2 px-3 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex-shrink-0"
                data-testid="nav-search"
                aria-label={isAR ? "بحث" : "Search"}
                title={isAR ? "بحث (Ctrl/Cmd + K)" : "Search (Ctrl/Cmd + K)"}
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 flex-shrink-0"
                aria-label="Toggle dark mode"
                data-testid="theme-toggle"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Language pill */}
              <button
                onClick={() => setLang(lang === "en" ? "ar" : "en")}
                className="flex items-center gap-0 px-1 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 transition-all duration-200 text-xs font-semibold overflow-hidden flex-shrink-0"
                data-testid="lang-toggle"
                aria-label={isAR ? "تغيير اللغة" : "Toggle language"}
              >
                <span className={cn("px-2.5 py-1 rounded-full", lang === "en" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400")}>EN</span>
                <span className={cn("px-2.5 py-1 rounded-full", lang === "ar" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400")}>ع</span>
              </button>

              {/* Auth area */}
              {user ? (
                <div ref={userRef} className="relative flex-shrink-0">
                  <button
                    onClick={() => setUserOpen(!userOpen)}
                    className="flex items-center gap-1.5 px-2.5 h-10 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    title={user.email}
                    data-testid="user-menu-btn"
                    aria-expanded={userOpen}
                    aria-haspopup="menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", userOpen && "rotate-180")} />
                  </button>

                  {userOpen && (
                    <div className="absolute top-full mt-2 end-0 w-52 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl py-1.5 z-50">
                      <div className="px-3.5 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                        <p className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">{user.tier}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] no-underline"
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span>{isAR ? "لوحة التحكم" : "Dashboard"}</span>
                      </Link>
                      <Link
                        href="/clients"
                        onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] no-underline"
                        data-testid="nav-clients"
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span>{isAR ? "العملاء" : "Clients"}</span>
                      </Link>
                      <Link
                        href="/rfq"
                        onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-600 transition-colors cursor-pointer min-h-[44px] no-underline"
                        data-testid="nav-rfq"
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span>{isAR ? "ذكاء العطاءات" : "RFQ Intelligence"}</span>
                        <RfqDeadlineBadge />
                      </Link>
                      <Link
                        href="/tools/tracker"
                        onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] no-underline"
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span>{isAR ? "متتبع الفواتير" : "My Tracker"}</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] no-underline"
                        data-testid="nav-settings"
                      >
                        <SettingsIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{isAR ? "الإعدادات" : "Settings"}</span>
                      </Link>
                      {isAdmin(user) && (
                        <Link
                          href="/admin/analytics"
                          onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] no-underline"
                          data-testid="nav-admin"
                        >
                          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                          <span>{isAR ? "لوحة الإدارة" : "Admin"}</span>
                        </Link>
                      )}
                      {isAdmin(user) && (
                        <Link
                          href="/admin/contact-messages"
                          onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors cursor-pointer min-h-[44px] no-underline"
                          data-testid="nav-contact-inbox"
                        >
                          <MailOpen className="w-4 h-4 flex-shrink-0" />
                          <span>{isAR ? "صندوق رسائل التواصل" : "Contact inbox"}</span>
                        </Link>
                      )}
                      <button
                        onClick={() => { handleLogout(); setUserOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors min-h-[44px]"
                        data-testid="nav-logout"
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <span>{isAR ? "تسجيل الخروج" : "Log out"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-3 h-10 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-full text-gray-700 dark:text-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex-shrink-0 whitespace-nowrap no-underline"
                    data-testid="nav-login"
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center px-3 h-10 text-xs font-semibold bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-full shadow-sm hover:shadow-[0_0_16px_rgba(124,58,237,0.4)] transition-all flex-shrink-0 whitespace-nowrap no-underline"
                    data-testid="nav-signup"
                  >
                    {t("nav.signup")}
                  </Link>
                </>
              )}
            </div>

            {/* ── Mobile controls ── */}
            <div className="xl:hidden flex items-center gap-1.5 ms-auto flex-shrink-0">
              <button
                onClick={() => search.setOpen(true)}
                className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                aria-label={isAR ? "بحث" : "Search"}
                data-testid="nav-search-mobile"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                className="p-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                data-testid="nav-mobile-toggle"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        <div className={cn(
          "xl:hidden overflow-hidden transition-all duration-300 ease-out",
          mobileOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="border-t border-gray-100 dark:border-gray-800 bg-white/98 dark:bg-gray-950/98 backdrop-blur-md px-4 py-3 max-h-[75vh] overflow-y-auto">
            {/* Grouped collapsible sections */}
            <div className="space-y-1.5 mb-3">
              {groups.map((g) => {
                const isOpen = openMobileGroup === g.id;
                const active = groupHasActive(g);
                return (
                  <div key={g.id} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <button
                      onClick={() => setOpenMobileGroup(isOpen ? null : g.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-3 text-sm font-semibold transition-colors min-h-[48px]",
                        active || isOpen
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                          : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200",
                      )}
                      aria-expanded={isOpen}
                      data-testid={`nav-mobile-group-${g.id}`}
                    >
                      <span>{g.label}</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="bg-white dark:bg-gray-950">
                        {g.items.map((it) => {
                          const Icon = it.icon;
                          const itemActive = isActive(it.href);
                          return (
                            <div key={it.href}>
                              {it.dividerBefore && (
                                <div className="mx-3 border-t border-gray-100 dark:border-gray-800" />
                              )}
                              <Link href={it.href} onClick={() => setMobileOpen(false)}>
                                <div className={cn(
                                  "flex items-center gap-3 px-3 py-3 text-sm min-h-[52px] border-b border-gray-100 dark:border-gray-800",
                                  itemActive
                                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                                    : "text-gray-700 dark:text-gray-300",
                                )}>
                                  <Icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="flex-1 font-medium">{it.label}</span>
                                  {it.badge && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">{it.badge}</span>
                                  )}
                                </div>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <Link
                href="/ai-writer"
                onClick={() => setMobileOpen(false)}
                data-testid="nav-mobile-ai-writer"
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border text-sm font-semibold min-h-[48px] no-underline",
                  isActive("/ai-writer")
                    ? "bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300"
                    : "bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30 border-violet-200 dark:border-violet-900 text-violet-700 dark:text-violet-300",
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span className="flex-1">{aiWriterLabel}</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full leading-none">
                  NEW
                </span>
              </Link>

              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold min-h-[48px] no-underline",
                  isActive("/pricing")
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                    : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200",
                )}
              >
                <Tag className="w-4 h-4" />
                <span>{isAR ? "الأسعار" : "Pricing"}</span>
              </Link>

              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold min-h-[48px] no-underline",
                  isActive("/contact")
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                    : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200",
                )}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isAR ? "اتصل بنا" : "Contact"}</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap">
              <button
                onClick={() => { setLang(lang === "en" ? "ar" : "en"); }}
                className="flex items-center gap-0 px-1 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold overflow-hidden"
              >
                <span className={cn("px-2.5 py-1 rounded-full", lang === "en" ? "bg-blue-600 text-white" : "text-gray-500")}>EN</span>
                <span className={cn("px-2.5 py-1 rounded-full", lang === "ar" ? "bg-blue-600 text-white" : "text-gray-500")}>عربي</span>
              </button>

              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 h-10 rounded-full border border-gray-200 dark:border-gray-700 no-underline"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-[9px] font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{user.name.split(" ")[0]}</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3 h-10 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full no-underline"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    {isAR ? "الإعدادات" : "Settings"}
                  </Link>
                  {isAdmin(user) && (
                    <Link
                      href="/admin/analytics"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center gap-1.5 px-3 h-10 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full no-underline"
                      data-testid="nav-mobile-admin"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isAR ? "لوحة الإدارة" : "Admin"}
                    </Link>
                  )}
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="px-3 h-10 text-xs text-red-500 border border-red-200 dark:border-red-800 rounded-full"
                    data-testid="nav-logout"
                  >
                    {isAR ? "خروج" : "Log out"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center px-3 h-10 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-full text-gray-700 dark:text-gray-300 no-underline"
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center px-4 h-10 text-sm font-semibold bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-full no-underline"
                  >
                    {t("nav.signup")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <NavSearch
        open={search.open}
        onOpenChange={search.setOpen}
        isAR={isAR}
        isLoggedIn={!!user}
      />
    </div>
  );
}
