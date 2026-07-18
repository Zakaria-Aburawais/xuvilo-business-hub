import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { countries } from "@/data/countries";
import { FALLBACK_TESTIMONIALS, type ApiTestimonial } from "@/data/testimonials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Receipt, TrendingUp, Tag, Globe, Package, Clock, CalendarDays,
  CheckCircle, Zap, Download, Languages, ArrowRight, BarChart3, Star, Shield,
  Sparkles, LayoutTemplate, RefreshCw, Inbox, Stamp, FolderOpen, Search,
  FileCheck2, Calculator, BookOpen, ChevronLeft, ChevronRight, CreditCard, Building2,
  MapPin, Truck, Phone, Mail,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SEOHead } from "@/components/SEOHead";
import { CountryFlag } from "@/components/CountryFlag";
import { EmailCaptureBar } from "@/components/EmailCaptureBar";
import { PAGE_SEO } from "@/lib/seo-config";
import {
  CURRENCY_COUNT, CURRENCY_COUNT_DISPLAY,
  TEMPLATE_COUNT, TEMPLATE_COUNT_DISPLAY,
  CALCULATOR_COUNT, COUNTRIES_SERVED_COUNT,
} from "@/lib/site-stats";

// Animated counter
// Detect reduced-motion once at module level (stable, doesn't change).
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Respect prefers-reduced-motion: skip animation, jump to final value.
    if (prefersReducedMotion) {
      if (start) setCount(target);
      return;
    }
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(target, 2000, visible);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  // tabular-nums + min-w prevents CLS as the number animates from 0 → target.
  return (
    <div ref={ref} className="text-3xl md:text-4xl font-bold text-blue-600 tabular-nums" style={{ minWidth: "4ch" }}>
      {prefix}{visible ? count.toLocaleString() : 0}{suffix}
    </div>
  );
}

// Scroll reveal — skipped entirely when prefers-reduced-motion is set so
// elements are immediately visible (no opacity-0 hiding above/near the fold).
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(prefersReducedMotion);
  useEffect(() => {
    if (prefersReducedMotion) return; // Already visible, no observer needed.
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={prefersReducedMotion ? undefined : { transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Floating Document Mockup ─────────────────────────────────────────────────
// Cycles between several tool previews so visitors immediately see what the site offers.
const SHOWCASE_ROUTES: Record<string, string> = {
  invoice: "/invoice",
  stamp: "/tools/stamp-maker",
  email: "/tools/temp-email",
  card: "/tools/business-card",
  profile: "/tools/company-profile",
  tracker: "/tracker",
};

const SHOWCASE_OPEN_LABELS: Record<string, { en: string; ar: string }> = {
  invoice: { en: "Open Invoice Maker", ar: "افتح صانع الفواتير" },
  stamp:   { en: "Open Stamp Maker",   ar: "افتح صانع الأختام" },
  email:   { en: "Open Temp Email",    ar: "افتح البريد المؤقت" },
  card:    { en: "Open Business Card", ar: "افتح بطاقة العمل" },
  profile: { en: "Open Company Profile", ar: "افتح ملف الشركة" },
  tracker: { en: "Open Tracker",       ar: "افتح المتتبع" },
};

function FloatingDocMockup() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const slides = [
    { key: "invoice", caption: isAR ? "إنشاء فاتورة احترافية…" : "Creating a professional invoice…",
      badge: isAR ? "PDF جاهز ✓" : "PDF Ready ✓",     badgeBg: "bg-green-500",
      side:  isAR ? "عربي RTL ✓" : "Arabic RTL ✓",     sideBg:  "bg-blue-600",
      bottom: isAR ? `${CURRENCY_COUNT} عملة` : `${CURRENCY_COUNT} Currencies`, bottomBg: "bg-violet-600" },
    { key: "stamp",   caption: isAR ? "اصنع ختمك الخاص في ثوانٍ…" : "Make your own stamp in seconds…",
      badge: isAR ? "الختم جاهز ✓" : "Stamp Ready ✓", badgeBg: "bg-emerald-500",
      side:  isAR ? "شعار مخصص ✓" : "Custom Logo ✓",   sideBg:  "bg-indigo-600",
      bottom: isAR ? "تصدير PNG" : "PNG Export",       bottomBg: "bg-rose-600" },
    { key: "email",   caption: isAR ? "صندوق بريد مؤقت فوري — بدون تسجيل…" : "Instant disposable inbox — no sign-up…",
      badge: isAR ? "البريد مباشر ✓" : "Inbox Live ✓", badgeBg: "bg-cyan-500",
      side:  isAR ? "بدون تسجيل ✓" : "No Sign-up ✓",   sideBg:  "bg-teal-600",
      bottom: isAR ? "تحديث تلقائي" : "Auto-refresh",  bottomBg: "bg-amber-600" },
    { key: "card",    caption: isAR ? "صمّم بطاقة عملك في دقيقة…" : "Designing your business card…",
      badge: isAR ? "البطاقة جاهزة ✓" : "Card Ready ✓", badgeBg: "bg-fuchsia-500",
      side:  isAR ? "وجهان ✓" : "Dual Side ✓",          sideBg:  "bg-purple-600",
      bottom: isAR ? "PDF · PNG" : "PDF · PNG",         bottomBg: "bg-pink-600" },
    { key: "profile", caption: isAR ? "بناء ملف الشركة التعريفي…" : "Building your company profile…",
      badge: isAR ? "الملف جاهز ✓" : "Profile Ready ✓", badgeBg: "bg-orange-500",
      side:  isAR ? "متعدد الصفحات ✓" : "Multi-page ✓", sideBg:  "bg-amber-600",
      bottom: isAR ? "قابل للطباعة" : "Print Ready",   bottomBg: "bg-red-600" },
    { key: "tracker", caption: isAR ? "تتبّع شحناتك وفواتيرك…" : "Tracking your shipments & invoices…",
      badge: isAR ? "مباشر ✓" : "Live ✓",               badgeBg: "bg-sky-500",
      side:  isAR ? "تحديث فوري ✓" : "Real-time ✓",     sideBg:  "bg-blue-600",
      bottom: isAR ? "بدون اشتراك" : "No Account",     bottomBg: "bg-teal-600" },
  ];

  const [slide, setSlide] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [introPulse, setIntroPulse] = useState(false);
  const paused = isHovered || isFocusWithin;

  // Briefly pulse the prev/next buttons on first load so first-time visitors
  // notice they exist. Skip entirely if the user prefers reduced motion.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setIntroPulse(true);
    const id = window.setTimeout(() => setIntroPulse(false), 2600);
    return () => window.clearTimeout(id);
  }, []);

  // Stop the intro pulse as soon as the user interacts with the showcase.
  useEffect(() => {
    if (introPulse && (isHovered || isFocusWithin)) setIntroPulse(false);
  }, [introPulse, isHovered, isFocusWithin]);
  const SLIDE_MS = 5000;
  const TICK_MS = 50;
  const progress = Math.min(100, (elapsed / SLIDE_MS) * 100);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    if (paused) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = e + TICK_MS;
        if (next >= SLIDE_MS) {
          setSlide((s) => (s + 1) % slides.length);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [slides.length, paused]);

  // Touch swipe handling for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    // In RTL, swiping right means "next" (forward in reading order)
    const swipedLeft = dx < 0;
    const goNext = isAR ? !swipedLeft : swipedLeft;
    setSlide((s) => (goNext ? (s + 1) % slides.length : (s - 1 + slides.length) % slides.length));
    setElapsed(0);
  };

  const cur = slides[slide];

  const navigate = (dir: "next" | "prev") => {
    setSlide((s) =>
      dir === "next"
        ? (s + 1) % slides.length
        : (s - 1 + slides.length) % slides.length
    );
    setElapsed(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const pressedLeft = e.key === "ArrowLeft";
    const goNext = isAR ? pressedLeft : !pressedLeft;
    navigate(goNext ? "next" : "prev");
  };

  // In RTL the "next" (forward) chevron should point left, prev points right.
  const NextIcon = isAR ? ChevronLeft : ChevronRight;
  const PrevIcon = isAR ? ChevronRight : ChevronLeft;

  return (
    <div
      className="group relative w-72 h-96 mx-auto select-none touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
      data-testid="hero-showcase"
      tabIndex={0}
      role="region"
      aria-label={isAR ? "عرض الأدوات — استخدم مفاتيح الأسهم للتنقل" : "Tool showcase — use arrow keys to navigate"}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocusWithin(false);
      }}
    >
      {/* Screen reader announcement of the active slide caption */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="hero-showcase-live"
      >
        {cur.caption}
      </div>
      {/* Prev / Next chevron buttons — always visible at low contrast so first-time
          visitors can spot them, brightening fully on hover/focus. A brief intro
          pulse on first load draws the eye, gated by prefers-reduced-motion. */}
      <button
        type="button"
        onClick={() => navigate("prev")}
        aria-label={isAR ? "الشريحة السابقة" : "Previous slide"}
        data-testid="hero-prev-button"
        className="absolute top-1/2 -translate-y-1/2 -start-3 sm:-start-10 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-white hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {introPulse && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping pointer-events-none"
          />
        )}
        <PrevIcon className="w-5 h-5 relative" />
      </button>
      <button
        type="button"
        onClick={() => navigate("next")}
        aria-label={isAR ? "الشريحة التالية" : "Next slide"}
        data-testid="hero-next-button"
        className="absolute top-1/2 -translate-y-1/2 -end-3 sm:-end-10 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-white hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {introPulse && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping pointer-events-none"
          />
        )}
        <NextIcon className="w-5 h-5 relative" />
      </button>

      {/* Slide indicators */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
        {slides.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { setSlide(i); setElapsed(0); }}
            aria-label={`Show ${s.key} preview`}
            className="relative h-1.5 rounded-full overflow-hidden transition-all"
            style={{ width: i === slide ? 28 : 10, background: i === slide ? "rgba(99,102,241,0.18)" : "rgba(148,163,184,0.4)" }}
          >
            {i === slide && (
              <span
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Slides — all rendered, only active visible (avoids layout jumps) */}
      <div className="relative w-full h-full">
        {/* Clickable overlay — turns the active slide into a link to its tool page.
            Sits above slide visuals (z-20) but below chevrons & dot indicators (z-30),
            so navigation controls keep working. Native click only fires on a real
            tap (no movement), so swipe gestures on the parent still register. */}
        <Link
          href={SHOWCASE_ROUTES[cur.key] ?? "/"}
          className="absolute inset-0 z-20 rounded-2xl cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none"
          aria-label={isAR ? SHOWCASE_OPEN_LABELS[cur.key]?.ar : SHOWCASE_OPEN_LABELS[cur.key]?.en}
          title={isAR ? SHOWCASE_OPEN_LABELS[cur.key]?.ar : SHOWCASE_OPEN_LABELS[cur.key]?.en}
          data-testid="hero-showcase-link"
        />
        {/* Slide 1: Invoice */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            slide === 0 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          {/* Back quote card */}
          <div className="absolute top-8 left-8 w-60 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-purple-100 dark:border-purple-900 overflow-hidden rotate-[-4deg] opacity-80">
            <div className="h-10 bg-gradient-to-r from-violet-600 to-purple-600 flex items-center px-4">
              <span className="text-white text-xs font-bold tracking-wide">QUOTATION</span>
              <span className="text-white/60 text-xs ms-auto">#QUO-018</span>
            </div>
            <div className="p-4 space-y-2">
              {["Web Design Package","Development","QA Testing"].map((s,i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-400">{s}</span>
                  <div className="w-10 h-2 rounded bg-gray-100 dark:bg-gray-700 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
          {/* Front invoice */}
          <div className="absolute top-0 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-900 overflow-hidden rotate-[2deg] hero-card-float">
            <div className="h-12 bg-gradient-to-r from-blue-600 to-blue-500 flex items-center px-4">
              <span className="text-white text-xs font-extrabold tracking-widest">INVOICE</span>
              <span className="text-blue-200 text-xs ms-auto">#INV-042</span>
            </div>
            <div className="p-5">
              <div className="text-blue-600 font-bold text-lg mb-3 hero-typewrite">SAR 12,450.00</div>
              <div className="space-y-2">
                {[
                  { label: "Consulting Services", shade: "w-24", delay: "0ms" },
                  { label: "Design Work",         shade: "w-16", delay: "180ms" },
                  { label: "Implementation",      shade: "w-20", delay: "360ms" },
                ].map(({ label, shade, delay }) => (
                  <div key={label} className="flex justify-between items-center hero-line-in" style={{ animationDelay: delay }}>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <div className={`${shade} h-2 rounded bg-blue-50 dark:bg-blue-900`} />
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 mt-3 pt-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total</span>
                <span className="text-sm font-bold text-blue-600">SAR 12,450</span>
              </div>
            </div>
            <div className="px-5 pb-4 text-right">
              <span className="text-xs text-gray-300 dark:text-gray-700">Xuvilo</span>
            </div>
          </div>
        </div>

        {/* Slide 2: Stamp Maker */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            slide === 1 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          {/* Back tools panel */}
          <div className="absolute top-10 left-10 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-900 overflow-hidden rotate-[-4deg] opacity-80">
            <div className="h-10 bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center px-4">
              <span className="text-white text-xs font-bold tracking-wide">STAMP TOOLS</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              {["Round","Square","Logo","Color","Border","Text"].map((s,i) => (
                <div key={i} className="text-[9px] text-center py-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{s}</div>
              ))}
            </div>
          </div>
          {/* Front stamp card */}
          <div className="absolute top-0 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-900 overflow-hidden rotate-[2deg] hero-card-float">
            <div className="h-12 bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center px-4">
              <span className="text-white text-xs font-extrabold tracking-widest">STAMP MAKER</span>
              <Stamp className="w-3.5 h-3.5 text-emerald-100 ms-auto" />
            </div>
            <div className="p-5 flex flex-col items-center">
              {/* Animated circular stamp */}
              <div className="relative w-32 h-32 my-2">
                <svg viewBox="0 0 120 120" className="w-full h-full hero-stamp-spin">
                  <defs>
                    <path id="stamp-arc" d="M 60,60 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0" />
                  </defs>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#059669" strokeWidth="3" />
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#059669" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text fill="#059669" fontSize="9" fontWeight="700" letterSpacing="2">
                    <textPath href="#stamp-arc" startOffset="0">XUVILO • OFFICIAL •</textPath>
                  </text>
                  <text x="60" y="58" textAnchor="middle" fill="#059669" fontSize="11" fontWeight="800">APPROVED</text>
                  <text x="60" y="72" textAnchor="middle" fill="#059669" fontSize="7">2026</text>
                </svg>
              </div>
              <div className="w-full border-t border-gray-100 dark:border-gray-800 mt-2 pt-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Export</span>
                <span className="text-xs font-bold text-emerald-600">PNG · SVG · PDF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 3: Temp Email Inbox */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            slide === 2 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
          aria-hidden={slide !== 2}
        >
          {/* Back card */}
          <div className="absolute top-10 left-10 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-cyan-100 dark:border-cyan-900 overflow-hidden rotate-[-4deg] opacity-80">
            <div className="h-10 bg-gradient-to-r from-cyan-600 to-sky-500 flex items-center px-4">
              <span className="text-white text-xs font-bold tracking-wide">DISPOSABLE</span>
            </div>
            <div className="p-3 space-y-1.5">
              {["a3kf2@…","tmp7xq@…","mailbox@…"].map((s,i) => (
                <div key={i} className="text-[10px] font-mono text-gray-500 truncate">{s}</div>
              ))}
            </div>
          </div>
          {/* Front inbox card */}
          <div className="absolute top-0 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-cyan-100 dark:border-cyan-900 overflow-hidden rotate-[2deg] hero-card-float">
            <div className="h-12 bg-gradient-to-r from-cyan-600 to-sky-500 flex items-center px-4">
              <span className="text-white text-xs font-extrabold tracking-widest">INBOX</span>
              <Inbox className="w-3.5 h-3.5 text-cyan-100 ms-auto" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-cyan-50 dark:bg-cyan-950/40 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 truncate">a3kf2.temp@bhub.io</span>
              </div>
              <div className="space-y-2">
                {[
                  { from: "GitHub",   subj: "Verify your account",      time: "2s",  delay: "0ms" },
                  { from: "Stripe",   subj: "Welcome — confirm email",  time: "12s", delay: "300ms" },
                  { from: "Notion",   subj: "Your sign-in code: 729184", time: "47s", delay: "600ms" },
                ].map((m) => (
                  <div key={m.from} className="hero-inbox-in flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60" style={{ animationDelay: m.delay }}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {m.from.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{m.from}</span>
                        <span className="text-[9px] text-gray-400">{m.time}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{m.subj}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slide 4: Business Card Maker */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            slide === 3 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
          aria-hidden={slide !== 3}
        >
          {/* Back card (reverse side) */}
          <div className="absolute top-12 left-12 w-56 h-32 bg-gradient-to-br from-fuchsia-600 to-purple-700 rounded-2xl shadow-xl border border-fuchsia-200 dark:border-fuchsia-900 overflow-hidden rotate-[-5deg] opacity-90">
            <div className="absolute inset-0 flex items-center justify-center">
              <CreditCard className="w-12 h-12 text-white/30" />
            </div>
            <div className="absolute bottom-2 right-3 text-white/70 text-[9px] font-mono tracking-wider">XBH</div>
          </div>
          {/* Front card */}
          <div className="absolute top-2 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-fuchsia-100 dark:border-fuchsia-900 overflow-hidden rotate-[2deg] hero-card-float">
            <div className="h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 flex items-center px-4">
              <span className="text-white text-xs font-extrabold tracking-widest">BUSINESS CARD</span>
              <CreditCard className="w-3.5 h-3.5 text-fuchsia-100 ms-auto" />
            </div>
            <div className="p-4">
              {/* Card preview */}
              <div className="rounded-lg bg-gradient-to-br from-slate-50 to-fuchsia-50 dark:from-gray-800 dark:to-fuchsia-950/50 p-3 border border-fuchsia-100 dark:border-fuchsia-900">
                <div className="flex items-start gap-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                    A
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="hero-line-in" style={{ animationDelay: "0ms" }}>
                      <div className="text-[12px] font-extrabold text-gray-900 dark:text-white truncate">Ahmed Al-Rashid</div>
                    </div>
                    <div className="hero-line-in text-[9px] text-fuchsia-600 dark:text-fuchsia-400 font-semibold" style={{ animationDelay: "150ms" }}>
                      Founder &amp; CEO
                    </div>
                  </div>
                </div>
                <div className="border-t border-fuchsia-100 dark:border-fuchsia-900 my-2" />
                <div className="space-y-1">
                  {[
                    { Icon: Phone, text: "+966 50 123 4567", delay: "300ms" },
                    { Icon: Mail,  text: "ahmed@xuvilo.io",   delay: "450ms" },
                    { Icon: Globe, text: "xuvilo.io",         delay: "600ms" },
                  ].map(({ Icon, text, delay }) => (
                    <div key={text} className="hero-line-in flex items-center gap-1.5" style={{ animationDelay: delay }}>
                      <Icon className="w-2.5 h-2.5 text-fuchsia-600 dark:text-fuchsia-400 flex-shrink-0" />
                      <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">Export</span>
                <span className="text-[10px] font-bold text-fuchsia-600">PDF · PNG</span>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 5: Company Profile Maker */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            slide === 4 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
          aria-hidden={slide !== 4}
        >
          {/* Back page */}
          <div className="absolute top-10 left-10 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-orange-100 dark:border-orange-900 overflow-hidden rotate-[-4deg] opacity-80">
            <div className="h-10 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center px-4">
              <span className="text-white text-xs font-bold tracking-wide">PAGE 02 — TEAM</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square rounded-md bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40" />
              ))}
            </div>
          </div>
          {/* Front profile cover */}
          <div className="absolute top-0 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-orange-100 dark:border-orange-900 overflow-hidden rotate-[2deg] hero-card-float">
            <div className="h-12 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center px-4">
              <span className="text-white text-xs font-extrabold tracking-widest">COMPANY PROFILE</span>
              <Building2 className="w-3.5 h-3.5 text-orange-100 ms-auto" />
            </div>
            <div className="p-4">
              {/* Cover area */}
              <div className="rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 p-4 text-white relative overflow-hidden">
                <Building2 className="absolute -bottom-2 -right-2 w-16 h-16 text-white/15" />
                <div className="text-[9px] font-bold opacity-80 tracking-widest">EST. 2020</div>
                <div className="hero-typewrite text-sm font-extrabold leading-tight mt-0.5">XUVILO TRADING CO.</div>
                <div className="text-[9px] opacity-90 mt-1">Riyadh · Saudi Arabia</div>
              </div>
              {/* Sections */}
              <div className="mt-3 space-y-1.5">
                {[
                  { label: "About Us",          w: "w-3/4", delay: "0ms" },
                  { label: "Our Services",      w: "w-2/3", delay: "150ms" },
                  { label: "Mission & Vision",  w: "w-1/2", delay: "300ms" },
                  { label: "Contact",           w: "w-3/5", delay: "450ms" },
                ].map((s) => (
                  <div key={s.label} className="hero-line-in flex items-center justify-between" style={{ animationDelay: s.delay }}>
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{s.label}</span>
                    <div className={`${s.w} h-1.5 rounded bg-orange-100 dark:bg-orange-900/60`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slide 6: Order / Invoice Tracker */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            slide === 5 ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
          aria-hidden={slide !== 5}
        >
          {/* Back map card */}
          <div className="absolute top-10 left-10 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-sky-100 dark:border-sky-900 overflow-hidden rotate-[-4deg] opacity-80">
            <div className="h-10 bg-gradient-to-r from-sky-600 to-blue-600 flex items-center px-4">
              <span className="text-white text-xs font-bold tracking-wide">ROUTE MAP</span>
            </div>
            <div className="p-3 h-20 relative bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/50 dark:to-blue-950/50">
              <svg viewBox="0 0 200 60" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <path d="M 10,45 Q 60,5 100,30 T 190,15" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="10" cy="45" r="3" fill="#0284c7" />
                <circle cx="190" cy="15" r="3" fill="#0284c7" />
              </svg>
            </div>
          </div>
          {/* Front tracker card */}
          <div className="absolute top-0 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-sky-100 dark:border-sky-900 overflow-hidden rotate-[2deg] hero-card-float">
            <div className="h-12 bg-gradient-to-r from-sky-600 to-blue-600 flex items-center px-4">
              <span className="text-white text-xs font-extrabold tracking-widest">TRACKER</span>
              <Truck className="w-3.5 h-3.5 text-sky-100 ms-auto" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-sky-50 dark:bg-sky-950/40 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 truncate">#TRK-9482-AB</span>
              </div>
              <div className="relative ps-5">
                {/* Vertical timeline */}
                <div className="absolute start-[7px] top-1.5 bottom-1.5 w-0.5 bg-gradient-to-b from-sky-500 via-sky-400 to-gray-200 dark:to-gray-700" />
                {[
                  { Icon: CheckCircle, label: "Order placed", time: "10:02", color: "text-emerald-500", bg: "bg-emerald-500", delay: "0ms" },
                  { Icon: Package,     label: "Packed",       time: "11:15", color: "text-emerald-500", bg: "bg-emerald-500", delay: "200ms" },
                  { Icon: Truck,       label: "Out for delivery", time: "13:40", color: "text-sky-500", bg: "bg-sky-500", delay: "400ms" },
                  { Icon: MapPin,      label: "Arriving soon",   time: "ETA 30m", color: "text-gray-400", bg: "bg-gray-300 dark:bg-gray-600", delay: "600ms" },
                ].map((s, i) => (
                  <div key={s.label} className="hero-inbox-in relative flex items-center gap-2 py-1.5" style={{ animationDelay: s.delay }}>
                    <span className={cn("absolute -start-5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-gray-900", s.bg)} />
                    <s.Icon className={cn("w-3 h-3 flex-shrink-0", s.color)} />
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 flex-1">{s.label}</span>
                    <span className="text-[9px] text-gray-400">{s.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges (cycle text with each slide) — pulled in slightly so they don't clip */}
      <div key={`b1-${slide}`} className={cn("absolute -top-3 right-1 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg hero-badge-1 whitespace-nowrap z-20", cur.badgeBg)}>
        {cur.badge}
      </div>
      <div key={`b2-${slide}`} className={cn("absolute top-1/2 -left-3 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg hero-badge-2 whitespace-nowrap z-20", cur.sideBg)}>
        {cur.side}
      </div>
      <div key={`b3-${slide}`} className={cn("absolute bottom-2 -right-2 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg hero-badge-3 whitespace-nowrap z-20", cur.bottomBg)}>
        {cur.bottom}
      </div>

      {/* Caption underneath — explains what the user is seeing */}
      <div
        key={`cap-${slide}`}
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 hero-caption-in text-center w-72 px-3"
        dir={isAR ? "rtl" : "ltr"}
      >
        <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          {cur.caption}
        </p>
      </div>
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
const SEARCH_INDEX = [
  { href: "/invoice",              en: "Invoice Generator",          ar: "مولّد الفواتير",           cat_en: "Document",    cat_ar: "مستند",    icon: FileText,      keywords: "invoice fatura bill" },
  { href: "/quotation",            en: "Quotation Generator",        ar: "مولّد عروض الأسعار",       cat_en: "Document",    cat_ar: "مستند",    icon: FileCheck2,    keywords: "quotation quote offer price سعر عرض" },
  { href: "/receipt",              en: "Receipt Generator",          ar: "مولّد الإيصالات",          cat_en: "Document",    cat_ar: "مستند",    icon: Receipt,       keywords: "receipt payment إيصال" },
  { href: "/templates/invoice",    en: "Invoice Templates",          ar: "قوالب الفواتير",           cat_en: "Templates",   cat_ar: "قوالب",    icon: LayoutTemplate, keywords: "template design layout قوالب" },
  { href: "/calculators",          en: "Business Calculators",       ar: "حاسبات الأعمال",           cat_en: "Tools",       cat_ar: "أدوات",    icon: Calculator,    keywords: "calculator calc vat tax حاسبة ضريبة" },
  { href: "/calculators/vat-tax",  en: "VAT / Tax Calculator",       ar: "حاسبة الضريبة",            cat_en: "Calculator",  cat_ar: "حاسبة",    icon: Calculator,    keywords: "vat gst tax ضريبة" },
  { href: "/calculators/discount", en: "Discount Calculator",        ar: "حاسبة الخصم",              cat_en: "Calculator",  cat_ar: "حاسبة",    icon: Calculator,    keywords: "discount خصم" },
  { href: "/tools/stamp-maker",    en: "Stamp Maker",                ar: "صانع الأختام",             cat_en: "Tools",       cat_ar: "أدوات",    icon: Stamp,         keywords: "stamp ختم seal" },
  { href: "/tools/business-card",  en: "Business Card Maker",        ar: "صانع بطاقات الأعمال",      cat_en: "Tools",       cat_ar: "أدوات",    icon: FileText,      keywords: "business card بطاقة أعمال vcard print" },
  { href: "/tools/company-profile",en: "Company Profile Maker",      ar: "صانع ملف الشركة",          cat_en: "Tools",       cat_ar: "أدوات",    icon: FileText,      keywords: "company profile ملف الشركة pdf brochure cover" },
  { href: "/tools/tracker",        en: "Invoice Tracker",            ar: "متتبع الفواتير",           cat_en: "Tools",       cat_ar: "أدوات",    icon: FolderOpen,    keywords: "tracker track status تتبع" },
  { href: "/blog",                 en: "Arabic Business Blog",       ar: "مدونة الأعمال",            cat_en: "Blog",        cat_ar: "مدونة",    icon: BookOpen,      keywords: "blog article مدونة مقالة" },
  { href: "/pricing",              en: "Pricing Plans",              ar: "خطط الأسعار",              cat_en: "Info",        cat_ar: "معلومات",  icon: Tag,           keywords: "price plan pricing أسعار" },
  { href: "/countries",            en: "Country Invoice Guides",     ar: "أدلة الفواتير حسب البلد",  cat_en: "Guide",       cat_ar: "دليل",     icon: Globe,         keywords: "country guide دول" },
];

function SearchBar({ lang }: { lang: string }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const isAR = lang === "ar";

  const results = query.trim().length < 1 ? [] : SEARCH_INDEX.filter(item => {
    const q = query.toLowerCase();
    return (
      item.en.toLowerCase().includes(q) ||
      item.ar.includes(query) ||
      item.keywords.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  const go = (href: string) => {
    setQuery("");
    setOpen(false);
    navigate(href);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(v => Math.min(v + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(results[active].href);
      else if (results[0]) go(results[0].href);
    } else if (e.key === "Escape") { setOpen(false); setActive(-1); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative max-w-xl mx-auto" dir={isAR ? "rtl" : "ltr"}>
      <div className="relative flex items-center group">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKey}
          placeholder={t("home.search.placeholder")}
          className="w-full ps-10 pe-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500 text-gray-700 dark:text-gray-200 transition-all"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl shadow-gray-200/60 dark:shadow-black/40 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t("home.search.suggestions")}
            </p>
          </div>
          <div className="pb-2">
            {results.map((item, i) => {
              const Icon = item.icon;
              const isActive = i === active;
              return (
                <button
                  key={item.href}
                  onMouseDown={() => go(item.href)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-xl text-start transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  }`}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? "bg-blue-100 dark:bg-blue-800/50" : "bg-gray-100 dark:bg-gray-800"
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-200"}`}>
                      {isAR ? item.ar : item.en}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-800/60 text-blue-600 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}>
                    {isAR ? item.cat_ar : item.cat_en}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-blue-400" : "text-gray-300 dark:text-gray-600"}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute z-50 top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl px-4 py-4 text-center">
          <Search className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("home.search.no_results")}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {t("home.search.no_matches").replace("{query}", query)}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { qKey: "home.faq.1.q", aKey: "home.faq.1.a" },
  { qKey: "home.faq.2.q", aKey: "home.faq.2.a" },
  { qKey: "home.faq.3.q", aKey: "home.faq.3.a" },
  { qKey: "home.faq.4.q", aKey: "home.faq.4.a" },
];

const TOOLS = [
  { href: "/invoice",   icon: FileText,       titleKey: "tool.invoice.name",          descKey: "tool.invoice.desc",          iconBg: "bg-blue-100 dark:bg-blue-900",     iconColor: "text-blue-600 dark:text-blue-400",    badgeKey: "tool.badge.most_popular", badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { href: "/quotation", icon: BarChart3,      titleKey: "tool.quotation.name",        descKey: "tool.quotation.desc",        iconBg: "bg-violet-100 dark:bg-violet-900", iconColor: "text-violet-600 dark:text-violet-400", badgeKey: "tool.badge.free",          badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
  { href: "/receipt",   icon: Receipt,        titleKey: "tool.receipt.name",          descKey: "tool.receipt.desc",          iconBg: "bg-green-100 dark:bg-green-900",   iconColor: "text-green-600 dark:text-green-400",  badgeKey: "tool.badge.instant_pdf",   badgeColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { href: "/calculators",         icon: TrendingUp,     titleKey: "tool.calculators.name",      descKey: "tool.calculators.desc",      iconBg: "bg-amber-100 dark:bg-amber-900",   iconColor: "text-amber-600 dark:text-amber-400",  badge: `${CALCULATOR_COUNT} Tools`,   badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { href: "/templates/invoice",   icon: LayoutTemplate, titleKey: "tool.doc_templates.name",    descKey: "tool.doc_templates.desc",    iconBg: "bg-rose-100 dark:bg-rose-900",     iconColor: "text-rose-600 dark:text-rose-400",    badge: `${TEMPLATE_COUNT_DISPLAY} Templates`, badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
  { href: "/calculators/currency-exchange", icon: RefreshCw, titleKey: "tool.currency_converter.name", descKey: "tool.currency_converter.desc", iconBg: "bg-teal-100 dark:bg-teal-900", iconColor: "text-teal-600 dark:text-teal-400", badge: `${CURRENCY_COUNT_DISPLAY} Rates`, badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
  { href: "/tools/stamp-maker",    icon: Stamp,     titleKey: "tool.stamp.name",          descKey: "tool.stamp.desc",          iconBg: "bg-indigo-100 dark:bg-indigo-900",  iconColor: "text-indigo-600 dark:text-indigo-400",  badge: "NEW", badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  { href: "/tools/business-card",  icon: FileText,  titleKey: "tool.business_card.name",  descKey: "tool.business_card.desc",  iconBg: "bg-pink-100 dark:bg-pink-900",      iconColor: "text-pink-600 dark:text-pink-400",      badge: "NEW", badgeColor: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
  { href: "/tools/company-profile", icon: FileText, titleKey: "tool.company_profile.name", descKey: "tool.company_profile.desc", iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900", iconColor: "text-fuchsia-600 dark:text-fuchsia-400", badge: "NEW", badgeColor: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300" },
  { href: "/tools/temp-email",     icon: Inbox,     titleKey: "tool.temp_email.name",     descKey: "tool.temp_email.desc",     iconBg: "bg-violet-100 dark:bg-violet-900",  iconColor: "text-violet-600 dark:text-violet-400",  badge: "NEW", badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
  { href: "/tools/tracker",        icon: FolderOpen, titleKey: "tool.tracker.name",        descKey: "tool.tracker.desc",        iconBg: "bg-blue-100 dark:bg-blue-900",      iconColor: "text-blue-600 dark:text-blue-400",      badge: "NEW", badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
];

const CALCS = [
  { href: "/calculators/profit-margin",    icon: TrendingUp,   titleKey: "calc.profit_margin.name" },
  { href: "/calculators/discount",         icon: Tag,          titleKey: "calc.discount.name" },
  { href: "/calculators/vat-tax",          icon: Receipt,      titleKey: "calc.vat.name" },
  { href: "/calculators/currency-exchange", icon: Globe,       titleKey: "calc.currency.name" },
  { href: "/calculators/shipping-cbm",     icon: Package,      titleKey: "calc.cbm.name" },
  { href: "/calculators/overtime",         icon: Clock,        titleKey: "calc.overtime.name" },
  { href: "/calculators/leave-balance",    icon: CalendarDays, titleKey: "calc.leave.name" },
  { href: "/calculators/import-cost",      icon: Package,      titleKey: "calc.import_cost.name" },
  { href: "/calculators/break-even",       icon: BarChart3,    titleKey: "calc.break_even.name" },
  { href: "/calculators/markup-margin",    icon: TrendingUp,   titleKey: "calc.markup_margin.name" },
  { href: "/calculators/loan",             icon: Zap,          titleKey: "calc.loan.name" },
  { href: "/calculators/invoice-aging",    icon: Clock,        titleKey: "calc.invoice_aging.name" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
// Timezone → country slug mapping (covers top 40 countries by traffic)
const TZ_TO_SLUG: Record<string, string> = {
  "Asia/Riyadh": "saudi-arabia", "Asia/Kuwait": "kuwait", "Asia/Qatar": "qatar",
  "Asia/Bahrain": "bahrain", "Asia/Muscat": "oman", "Asia/Dubai": "uae",
  "Asia/Baghdad": "iraq", "Asia/Damascus": "syria", "Asia/Beirut": "lebanon",
  "Asia/Amman": "jordan", "Asia/Gaza": "palestine", "Africa/Cairo": "egypt",
  "Africa/Tripoli": "libya", "Africa/Khartoum": "sudan", "Asia/Aden": "yemen",
  "Africa/Mogadishu": "somalia", "Africa/Nouakchott": "mauritania",
  "Africa/Djibouti": "djibouti", "Indian/Comoro": "comoros",
  "Africa/Casablanca": "morocco", "Africa/Algiers": "algeria",
  "Africa/Tunis": "tunisia", "Africa/Lagos": "nigeria", "Africa/Accra": "ghana",
  "Africa/Nairobi": "kenya", "Africa/Johannesburg": "south-africa",
  "Africa/Addis_Ababa": "ethiopia", "Africa/Dar_es_Salaam": "tanzania",
  "Africa/Dakar": "senegal", "Africa/Kampala": "uganda",
  "Africa/Douala": "cameroon", "Africa/Abidjan": "cote-divoire",
  "Africa/Harare": "zimbabwe", "Africa/Kigali": "rwanda",
  "Europe/London": "united-kingdom", "America/New_York": "usa",
  "America/Chicago": "usa", "America/Los_Angeles": "usa",
  "America/Toronto": "canada", "America/Vancouver": "canada",
  "Australia/Sydney": "australia", "Australia/Melbourne": "australia",
  "Europe/Berlin": "germany", "Europe/Paris": "france",
  "Asia/Kolkata": "india", "Asia/Karachi": "pakistan",
  "Europe/Istanbul": "turkey", "Asia/Kuala_Lumpur": "malaysia",
  "Asia/Jakarta": "indonesia", "Asia/Dhaka": "bangladesh",
  "Asia/Manila": "philippines", "Europe/Madrid": "spain",
  "Europe/Rome": "italy", "Europe/Amsterdam": "netherlands",
  "Asia/Tokyo": "japan", "Asia/Singapore": "singapore",
  "America/Sao_Paulo": "brazil", "America/Mexico_City": "mexico",
  "Asia/Shanghai": "china", "Asia/Hong_Kong": "china",
  "Europe/Stockholm": "sweden", "Europe/Zurich": "switzerland",
};

function CountryDetectionBanner() {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [country, setCountry] = useState<(typeof countries)[0] | null>(null);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const slug = TZ_TO_SLUG[tz];
      if (slug) {
        const found = countries.find((c) => c.slug === slug);
        if (found) setCountry(found);
      }
    } catch {
      // silently fail
    }
  }, []);

  if (!country || dismissed) return null;

  const vatLabel = country.vatRate > 0 ? `${country.vatRate}% ${country.vatName}` : country.vatName;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-xl">{country.flag}</span>
          <span className="text-gray-700 dark:text-gray-300">
            {t("home.country_banner.text")
              .replace("{name}", country.nameEn)
              .replace("{currency}", country.currency)
              .replace("{tax}", vatLabel)}
          </span>
          <Link
            href={`/invoice-generator-${country.slug}`}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline whitespace-nowrap"
          >
            {t("home.country_banner.link").replace("{name}", country.nameEn)}
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

const TESTIMONIALS_API = "/api-proxy/api/testimonials";

export default function HomePage() {
  const { t, lang } = useLanguage();
  const isAR = lang === "ar";
  const [testimonials, setTestimonials] = useState<ApiTestimonial[]>(FALLBACK_TESTIMONIALS);

  useEffect(() => {
    // Defer the testimonials API call to idle time so it doesn't compete
    // with critical resources during the initial page load. Falls back to
    // a 2-second setTimeout in browsers that don't support rIC.
    const doFetch = () => {
      fetch(TESTIMONIALS_API)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<ApiTestimonial[]>;
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) setTestimonials(data);
        })
        .catch(() => {});
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(doFetch, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(doFetch, 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <AppLayout>
      <SEOHead
        {...PAGE_SEO["/"]}
        path="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: t(item.qKey),
            acceptedAnswer: {
              "@type": "Answer",
              text: t(item.aKey).replace("{count}", CURRENCY_COUNT_DISPLAY),
            },
          })),
        }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative hero-gradient border-b border-gray-200 dark:border-gray-800">
        {/* Decorative background layers — clipped to hero bounds so the
            search suggestions dropdown (rendered outside this wrapper) can
            still overflow the hero section. */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {/* Animated wave background — sits above gradient, behind content */}
          <div className="hero-waves absolute inset-0">
            <svg className="hero-wave hero-wave-1 absolute inset-x-0 bottom-0 w-[200%] h-40 md:h-56" viewBox="0 0 1440 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,120 C240,180 480,40 720,90 C960,140 1200,60 1440,110 L1440,200 L0,200 Z" fill="currentColor" className="text-blue-400/15 dark:text-blue-500/10" />
            </svg>
            <svg className="hero-wave hero-wave-2 absolute inset-x-0 bottom-0 w-[200%] h-32 md:h-44" viewBox="0 0 1440 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,150 C300,90 600,170 900,120 C1140,80 1320,160 1440,130 L1440,200 L0,200 Z" fill="currentColor" className="text-violet-400/15 dark:text-violet-500/10" />
            </svg>
            <svg className="hero-wave hero-wave-3 absolute inset-x-0 top-0 w-[200%] h-28 md:h-40 -scale-y-100" viewBox="0 0 1440 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,140 C240,80 480,180 720,120 C960,60 1200,160 1440,100 L1440,200 L0,200 Z" fill="currentColor" className="text-cyan-400/10 dark:text-cyan-500/10" />
            </svg>
          </div>

          {/* Soft blobs */}
          <div className="absolute top-0 end-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 start-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-300/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left — Text */}
            <div className="hero-fade-up">
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight mb-3 text-gray-900 dark:text-white" data-testid="hero-title">
                {t("home.hero.title_part1")}{" "}
                <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  {t("home.hero.title_highlight")}
                </span>
                {" "}{t("home.hero.title_part2")}
              </h1>

              {/* #1 — Audience sub-headline */}
              <p className="text-base font-medium text-blue-600 dark:text-blue-400 mb-3" data-testid="hero-audience">
                {t("home.hero.audience")}
              </p>

              <p className="text-lg text-gray-500 dark:text-gray-400 mb-6 leading-relaxed" data-testid="hero-subtitle">
                {t("home.hero.desc").replace("{count}", CURRENCY_COUNT_DISPLAY)}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link href="/invoice">
                  <button className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-full shadow-lg hover:shadow-[0_8px_30px_rgba(99,102,241,0.4)] transition-all duration-200 flex items-center gap-2 justify-center" data-testid="hero-cta-primary">
                    {t("home.hero.cta_create")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <Link href="/templates/invoice">
                  <button className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-full hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all duration-200 flex items-center gap-2 justify-center" data-testid="hero-cta-secondary">
                    <LayoutTemplate className="w-4 h-4" />
                    {t("home.hero.cta_browse")}
                  </button>
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center gap-5 mb-4">
                {[
                  { icon: Shield, labelKey: "home.hero.no_signup" },
                  { icon: Download, labelKey: "home.hero.free_pdf" },
                  { icon: Languages, labelKey: "home.hero.bilingual" },
                ].map(({ icon: Icon, labelKey }) => (
                  <div key={labelKey} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t(labelKey)}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: t("home.hero.badge_zatca"), color: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
                  { label: t("home.hero.badge_currencies").replace("{count}", CURRENCY_COUNT_DISPLAY), color: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
                  { label: t("home.hero.badge_rtl"), color: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
                  { label: t("home.hero.badge_pdf"), color: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
                  {
                    label: lang === "ar" ? "🌍 ‎+40 دولة" : "🌍 40+ countries",
                    color: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
                  },
                ].map(({ label, color }) => (
                  <span key={label} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${color}`} data-testid={label.includes("+40") || label.includes("40+") ? "trust-countries-badge" : undefined}>
                    {label}
                  </span>
                ))}
              </div>
              {/* Country flags row — visual trust signal */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3" data-testid="trust-flags-row" aria-label={lang === "ar" ? "البلدان المدعومة" : "Supported countries"}>
                {["sa","ae","eg","qa","kw","bh","om","jo","lb","ly","ma","dz","tn","sd","iq","ye","gb","us","eu"].map((code) => (
                  <CountryFlag key={code} code={code} size="md" lang={lang === "ar" ? "ar" : "en"} />
                ))}
                <span className="text-xs text-gray-500 dark:text-gray-400 ms-1">
                  {lang === "ar" ? "والمزيد" : "and more"}
                </span>
              </div>
            </div>

            {/* Right — Floating card mockup */}
            <div className="flex justify-center lg:justify-end">
              <FloatingDocMockup />
            </div>
          </div>

          {/* #7 — Search bar */}
          <div className="mt-8 md:mt-10">
            <SearchBar lang={lang} />
          </div>
        </div>
      </section>

      {/* ── Newsletter capture bar (between hero and tools/feature sections) ── */}
      <EmailCaptureBar />

      {/* ── AI Writer feature section ─────────────────────────────────────── */}
      <section
        className="relative py-16 md:py-20 bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-violet-950/40 dark:via-gray-950 dark:to-blue-950/40 border-b border-gray-100 dark:border-gray-800"
        data-testid="home-ai-writer-section"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="grid lg:grid-cols-5 gap-10 items-center">
              {/* Left: copy + CTA */}
              <div className="lg:col-span-3">
                <Badge className="mb-4 bg-gradient-to-r from-violet-500 to-blue-500 text-white border-0 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("home.ai_writer.badge")}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                  {t("home.ai_writer.title")}
                </h2>
                <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 max-w-2xl">
                  {t("home.ai_writer.subtitle")}
                </p>
                <ul className="space-y-2.5 mb-7 max-w-2xl">
                  {[
                    t("home.ai_writer.bullet1"),
                    t("home.ai_writer.bullet2"),
                    t("home.ai_writer.bullet3"),
                  ].map((line, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm md:text-base text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/ai-writer">
                  <Button
                    size="lg"
                    data-testid="home-ai-writer-cta"
                    className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-md rounded-full px-7"
                  >
                    <Sparkles className="me-2 w-4 h-4" />
                    {t("home.ai_writer.cta")}
                    <ArrowRight className="ms-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Right: faux email card preview */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 ms-2">ai-writer / payment_reminder</div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                      {isAR ? "الموضوع" : "Subject"}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      {isAR
                        ? "تذكير بفاتورة INV-042 المستحقة"
                        : "Friendly reminder — Invoice INV-042 outstanding"}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                      {isAR ? "نص الرسالة" : "Body"}
                    </div>
                    <div
                      dir={isAR ? "rtl" : "ltr"}
                      className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line"
                    >
                      {isAR
                        ? "السيد أحمد المحترم،\n\nأود متابعة فاتورة INV-042 بقيمة 1,250 دولار، التي كانت مستحقة بتاريخ 12 مارس. هل تكرمتم بمشاركتنا موعد السداد؟\n\nمع التقدير،\nمحمد العلي"
                        : "Dear Mr. Smith,\n\nI'm following up on invoice INV-042 for $1,250, which was due on 12 March. Could you kindly confirm a payment date?\n\nBest regards,\nJohn Doe"}
                    </div>
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <Sparkles className="w-3 h-3 text-violet-500" />
                    <span>{isAR ? "تم بواسطة Xuvilo AI Writer" : "Generated with Xuvilo AI Writer"}</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── How it Works ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
                {t("home.how_it_works.title")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
                {t("home.how_it_works.subtitle")}
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-blue-200 via-violet-200 to-green-200 dark:from-blue-800 dark:via-violet-800 dark:to-green-800" />
            {[
              {
                step: "01",
                icon: FileText,
                bg: "bg-blue-50 dark:bg-blue-950",
                iconColor: "text-blue-600 dark:text-blue-400",
                stepColor: "text-blue-600 dark:text-blue-400",
                title: t("home.how_it_works.step1.title"),
                desc: t("home.how_it_works.step1.desc"),
                href: "/invoice",
              },
              {
                step: "02",
                icon: LayoutTemplate,
                bg: "bg-violet-50 dark:bg-violet-950",
                iconColor: "text-violet-600 dark:text-violet-400",
                stepColor: "text-violet-600 dark:text-violet-400",
                title: t("home.how_it_works.step2.title"),
                desc: t("home.how_it_works.step2.desc").replace("{count}", TEMPLATE_COUNT_DISPLAY),
                href: "/templates/invoice",
              },
              {
                step: "03",
                icon: Download,
                bg: "bg-green-50 dark:bg-green-950",
                iconColor: "text-green-600 dark:text-green-400",
                stepColor: "text-green-600 dark:text-green-400",
                title: t("home.how_it_works.step3.title"),
                desc: t("home.how_it_works.step3.desc"),
                href: "/invoice",
              },
            ].map(({ step, icon: Icon, bg, iconColor, stepColor, title, desc, href }, i) => (
              <FadeIn key={step} delay={i * 100}>
                <Link href={href} className="block group">
                  <div className="flex flex-col items-center text-center relative cursor-pointer">
                    <div className={`relative w-20 h-20 rounded-2xl ${bg} flex items-center justify-center mb-5 z-10 transition-transform group-hover:scale-110`}>
                      <Icon className={`w-9 h-9 ${iconColor}`} />
                      <span className={`absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-white dark:bg-gray-900 border-2 border-current flex items-center justify-center text-xs font-extrabold ${stepColor} shadow-sm`}>
                        {step}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 group-hover:underline">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">{desc}</p>
                    <span
                      className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${stepColor} opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 [@media(hover:none)]:opacity-70 [@media(hover:none)]:translate-y-0`}
                      aria-hidden="true"
                    >
                      {t("home.how_it_works.step_hint")}
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}>
            <div className="text-center mt-10">
              <Link href="/invoice">
                <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-full px-6">
                  {t("home.how_it_works.cta")}
                  <ArrowRight className="ms-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="py-12 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            {[
              { label: t("home.stats.currencies"), target: CURRENCY_COUNT, suffix: "+" },
              { label: t("home.stats.calcs"), target: CALCULATOR_COUNT, suffix: "" },
              { label: t("home.stats.countries"), target: COUNTRIES_SERVED_COUNT, suffix: "+" },
            ].map(({ label, target, suffix }) => (
              <FadeIn key={label}>
                <AnimatedCounter target={target} suffix={suffix} />
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Country detection banner */}
      <CountryDetectionBanner />

      {/* ── Testimonials — only rendered when real consented testimonials exist in DB ── */}
      {testimonials.length > 0 && (
        <>
          <div className="overflow-hidden -mb-1">
            <svg viewBox="0 0 1440 60" className="w-full fill-gray-50 dark:fill-gray-900" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" />
            </svg>
          </div>
          <section className="py-20 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <FadeIn>
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
                    {t("home.testimonials.title")}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    {t("home.testimonials.subtitle")}
                  </p>
                </div>
              </FadeIn>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {testimonials.map((testimonial, i) => (
                  <FadeIn key={testimonial.id} delay={i * 80} className={i === 3 ? "md:col-start-1" : i === 4 ? "md:col-start-2" : ""}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-full flex flex-col hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200">
                      <div className="flex gap-0.5 mb-3">
                        {Array.from({ length: testimonial.stars }).map((_, si) => (
                          <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1 mb-4">
                        "{isAR ? testimonial.quoteAr : testimonial.quoteEn}"
                      </p>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{isAR ? testimonial.roleAr : testimonial.roleEn}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </section>
          <div className="overflow-hidden -mt-1">
            <svg viewBox="0 0 1440 60" className="w-full fill-white dark:fill-gray-950" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" />
            </svg>
          </div>
        </>
      )}

      {/* ── Tool Cards ────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
                {t("home.tools.title")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                {t("home.tools.subtitle")}
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
            {TOOLS.map(({ href, icon: Icon, titleKey, descKey, iconBg, iconColor, badge, badgeKey, badgeColor }, i) => {
              const displayTitle = t(titleKey);
              const displayDesc = t(descKey);
              const displayBadge = badgeKey ? t(badgeKey) : badge;
              return (
                <FadeIn key={`${href}-${i}`} delay={i * 60} className="xl:col-span-2">
                  <Link href={href}>
                    <div
                      className="group relative h-[260px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer overflow-hidden hover:-translate-y-1.5 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-gray-900/60 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200"
                      data-testid={`tool-card-${href.replace(/\//g, "-").replace(/^-/, "")}`}
                    >
                      {/* Dot pattern on hover */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(99,102,241,0.06)_1px,_transparent_1px)] bg-[length:20px_20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      {/* Badge */}
                      {displayBadge && (
                        <div className={`absolute top-3 end-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
                          {displayBadge}
                        </div>
                      )}

                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className={`w-7 h-7 ${iconColor}`} />
                      </div>

                      {/* Text */}
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{displayTitle}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-snug">{displayDesc}</p>

                      {/* Open CTA */}
                      <div className="absolute bottom-4 start-5 end-5 flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                        <span>{t("home.tools.open")}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wave */}
      <div className="overflow-hidden -mb-1">
        <svg viewBox="0 0 1440 60" className="w-full fill-gray-50 dark:fill-gray-900" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" />
        </svg>
      </div>

      {/* ── Calculators ───────────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">{t("home.calculators.title")}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">{t("home.calculators.subtitle")}</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CALCS.map(({ href, icon: Icon, titleKey, title }: any, i) => (
              <FadeIn key={href} delay={i * 40}>
                <Link href={href}>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer group" data-testid={`calc-chip-${href.split("/").pop()}`}>
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{titleKey ? t(titleKey) : title}</span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/calculators">
              <Button variant="outline">
                {t("home.calcs.view_all").replace("{count}", String(CALCULATOR_COUNT))}
                <ArrowRight className="ms-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Wave */}
      <div className="overflow-hidden -mt-1">
        <svg viewBox="0 0 1440 60" className="w-full fill-white dark:fill-gray-950" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" />
        </svg>
      </div>

      {/* ── Global Features ─────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
                {t("home.features.title")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {t("home.features.subtitle").replace("{count}", CURRENCY_COUNT_DISPLAY)}
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Languages, titleKey: "home.features.bilingual.title", descKey: "home.features.bilingual.desc", bg: "bg-blue-50 dark:bg-blue-950", color: "text-blue-600" },
              { icon: Shield, titleKey: "home.features.private.title", descKey: "home.features.private.desc", bg: "bg-green-50 dark:bg-green-950", color: "text-green-600" },
              { icon: Star, titleKey: "home.features.gulf.title", descKey: "home.features.gulf.desc", bg: "bg-amber-50 dark:bg-amber-950", color: "text-amber-600" },
            ].map(({ icon: Icon, titleKey, descKey, bg, color }, i) => (
              <FadeIn key={titleKey} delay={i * 100}>
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`w-8 h-8 ${color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t(titleKey)}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t(descKey)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Wave */}
      <div className="overflow-hidden -mb-1">
        <svg viewBox="0 0 1440 60" className="w-full fill-gray-50 dark:fill-gray-900" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 C360,60 1080,60 1440,0 L1440,60 L0,60 Z" />
        </svg>
      </div>

      {/* ── Pricing Preview ───────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">{t("home.pricing.title")}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-10">{t("home.pricing.subtitle")}</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                plan: "pricing.free",
                price: "$0",
                features: lang === "ar"
                  ? ["جميع الأدوات الأساسية مجانية خلال الإطلاق", "جميع الحاسبات الـ١٤", "أكثر من ٣٢٠ قالباً", "لا يتطلب حساباً"]
                  : ["All core tools free during launch phase", "All 14 calculators", "320+ templates", "No account required"],
                badge: null,
                highlight: false,
              },
              {
                plan: "pricing.pro",
                price: "$9",
                features: lang === "ar"
                  ? ["مستندات غير محدودة", "جميع الحاسبات (١٤+)", "أكثر من ١٠٠ قالب مميز", "بدون علامة مائية على ملفات PDF", "سجل المستندات المحفوظة"]
                  : ["Unlimited documents", "All 14+ calculators", "100+ premium templates", "No watermark on PDFs", "Saved document history"],
                badge: "pricing.popular",
                highlight: true,
              },
              {
                plan: "pricing.business",
                price: "$24",
                features: lang === "ar"
                  ? ["كل ما في خطة Pro", "٣ مقاعد لأعضاء الفريق", "AI Writer مشمول", "دعم زاتكا (المرحلة الثانية)"]
                  : ["Everything in Pro", "3 team member seats", "AI Writer included", "ZATCA Phase 2 support"],
                badge: null,
                highlight: false,
              },
            ].map(({ plan, price, features, badge, highlight }, i) => (
              <FadeIn key={plan} delay={i * 80}>
                <Card className={`relative ${highlight ? "border-blue-500 shadow-xl shadow-blue-100 dark:shadow-blue-900/20 scale-[1.02]" : ""}`}>
                  {badge && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white">{t(badge)}</Badge>}
                  <CardHeader>
                    <CardTitle className="text-lg">{t(plan)}</CardTitle>
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{price}<span className="text-base text-gray-400 font-normal">{t("pricing.month")}</span></div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-400">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/pricing">
              <Button variant="outline">{t("nav.pricing")} <ArrowRight className="ms-2 w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Wave */}
      <div className="overflow-hidden -mt-1">
        <svg viewBox="0 0 1440 60" className="w-full fill-white dark:fill-gray-950" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" />
        </svg>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white text-center mb-10">{t("home.faq.title")}</h2>
          </FadeIn>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t(item.qKey)}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t(item.aKey).replace("{count}", CURRENCY_COUNT_DISPLAY)}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-gradient-to-br from-blue-600 to-violet-700">
        <FadeIn>
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-3">{t("home.cta.title")}</h2>
            <p className="text-blue-100 text-lg mb-8">{t("home.cta.subtitle")}</p>
            <Link href="/signup">
              <button className="px-8 py-4 text-lg font-semibold bg-white text-blue-600 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200" data-testid="home-cta-button">
                {t("home.cta.button")}
                <ArrowRight className="inline ms-2 w-5 h-5" />
              </button>
            </Link>
          </div>
        </FadeIn>
      </section>

    </AppLayout>
  );
}
