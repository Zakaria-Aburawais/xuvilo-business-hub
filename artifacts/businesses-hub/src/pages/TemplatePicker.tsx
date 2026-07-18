import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_SEO } from "@/lib/seo-config";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/context/LanguageContext";
import { useTemplate } from "@/context/TemplateContext";
import { ArrowLeft, X, ChevronLeft, ChevronRight, Search, SlidersHorizontal, ChevronDown, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { InvoicePreview, ReceiptPreview } from "@/components/document/DocumentPreview";
import type { BusinessInfo, ClientInfo, LineItem, DocumentTotals } from "@/types/document";
import { usePlan } from "@/hooks/usePlan";

type DocType    = "invoice" | "quotation" | "receipt";
type StyleCat   = "minimal" | "corporate" | "arabic-first" | "compact" | "elegant" | "modern" | "government";

const PREMIUM_STYLES = new Set<StyleCat>(["corporate", "modern", "elegant", "government"]);
type LangType   = "en" | "ar" | "bilingual";
type LayoutType = "minimal" | "dark-header" | "gradient" | "arabic" | "compact" | "thermal" | "digital" | "boxed" | "sidebar" | "top-band" | "centered" | "elegant" | "consulting" | "construction" | "two-col-header" | "bold-hero" | "bilingual-split" | "price-list" | "stamp-box" | "split-header";

interface ThumbConfig {
  id: string;
  layout: LayoutType;
  headerBg: string;
  accentColor: string;
  altColor?: string;
  isRTL?: boolean;
  docType: DocType;
}

interface TemplateEntry {
  id: string;
  name: string;
  nameAr: string;
  type: DocType;
  style: StyleCat;
  lang: LangType;
  tags: string[];
  tagsAr: string[];
  thumbConfig: ThumbConfig;
}

/* ─── Sample data for live thumbnail previews ─────────────────────────────── */

const SAMPLE_BUSINESS: BusinessInfo = {
  name: "Nexus Studio",
  address: "Sheikh Zayed Rd, Dubai, UAE",
  phone: "+971 50 123 4567",
  email: "hello@nexusstudio.ae",
  vatNumber: "311000000000003",
  logoUrl: null,
};

const SAMPLE_CLIENT: ClientInfo = {
  name: "Ahmed Al-Rashid",
  company: "Al-Rashid Holdings",
  address: "King Fahd Road, Riyadh, KSA",
  phone: "+966 50 987 6543",
  email: "ahmed@alrashid.sa",
};

const SAMPLE_ITEMS: LineItem[] = [
  { id: "1", description: "Brand Identity Design", quantity: 1, unitPrice: 2200, discountPct: 0, taxPct: 0 },
  { id: "2", description: "Web Development", quantity: 1, unitPrice: 3800, discountPct: 0, taxPct: 0 },
  { id: "3", description: "UI/UX Consulting", quantity: 2, unitPrice: 850, discountPct: 0, taxPct: 0 },
  { id: "4", description: "Project Management", quantity: 1, unitPrice: 600, discountPct: 0, taxPct: 0 },
  { id: "5", description: "QA & Testing", quantity: 1, unitPrice: 450, discountPct: 0, taxPct: 0 },
];

const SAMPLE_TOTALS: DocumentTotals = {
  subtotal: 8750,
  discountTotal: 0,
  taxTotal: 1312.50,
  grandTotal: 10062.50,
};

const SAMPLE_INV_PROPS = {
  businessInfo: SAMPLE_BUSINESS,
  clientInfo: SAMPLE_CLIENT,
  docNumber: "INV-2026-042",
  issueDate: "Apr 1, 2026",
  dueOrValidityDate: "Apr 30, 2026",
  dueOrValidityLabel: "Due Date",
  currency: "USD",
  lineItems: SAMPLE_ITEMS,
  totals: SAMPLE_TOTALS,
  notes: "Payment due within 30 days. Thank you for your business.",
  paymentDetails: "Bank: Chase  ·  IBAN: US12 3456  ·  SWIFT: CHASUS33",
};

const SAMPLE_REC_PROPS = {
  businessInfo: SAMPLE_BUSINESS,
  receiptNumber: "REC-2026-001",
  date: "Apr 1, 2026",
  payerName: "Ahmed Al-Rashid",
  amountReceived: 5000,
  currency: "USD",
  paymentMethod: "Bank Transfer",
  referenceNumber: "TXN-98765",
  notes: "Thank you for your payment.",
};

/* ─── Unified live thumbnail — renders the actual document component scaled ── */

function ThumbnailWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full aspect-[3/4] overflow-hidden rounded-t-xl bg-white relative">
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: "794px",
        transformOrigin: "top left",
        transform: "scale(0.374)",
        pointerEvents: "none",
      }} className="font-sans">
        {children}
      </div>
    </div>
  );
}

function SmartThumb({ c }: { c: ThumbConfig }) {
  return (
    <ThumbnailWrapper>
      {c.docType === "receipt" ? (
        <ReceiptPreview {...SAMPLE_REC_PROPS} template={c.id} />
      ) : (
        <InvoicePreview {...SAMPLE_INV_PROPS} template={c.id} type={c.docType} />
      )}
    </ThumbnailWrapper>
  );
}

/* ─── Template Builder ───────────────────────────────────────────────────── */
const mkT = (
  id: string, name: string, nameAr: string,
  type: DocType, style: StyleCat, lang: LangType,
  tags: string[], tagsAr: string[],
  layout: LayoutType, bg: string, accent: string, alt?: string
): TemplateEntry => ({
  id, name, nameAr, type, style, lang, tags, tagsAr,
  thumbConfig: { id, layout, headerBg: bg, accentColor: accent, altColor: alt, isRTL: lang !== "en", docType: type },
});

/* ─── 310 Templates ──────────────────────────────────────────────────────── */
const ALL_TEMPLATES: TemplateEntry[] = [

  // ═══════════════════════════════════════════════════════════════════
  // INVOICES  (110)
  // ═══════════════════════════════════════════════════════════════════

  // Minimal / Clean (18)
  mkT("inv-classic-white","Classic White","كلاسيك أبيض","invoice","minimal","en",["Clean","Minimal","PDF"],["بسيط","نظيف"],"minimal","#111827","#374151"),
  mkT("inv-pure-min","Pure Minimal","مينيمال فائق","invoice","minimal","en",["Ultra Minimal","Premium","Clean"],["راقي","نظيف"],"centered","#1E293B","#64748B"),
  mkT("inv-slate","Slate Gray","رمادي صخري","invoice","minimal","en",["Slate","Gray","Modern"],["رمادي","حديث"],"centered","#334155","#94A3B8"),
  mkT("inv-ink","Ink Black","أسود الحبر","invoice","minimal","en",["Black","Bold","Contrast"],["أسود","جريء"],"minimal","#030712","#374151"),
  mkT("inv-nordic","Nordic Blue","أزرق نوردي","invoice","minimal","en",["Blue","Nordic","Clean"],["أزرق","سكندنافي"],"minimal","#1E3A8A","#3B82F6"),
  mkT("inv-cream","Cream Elegant","كريمي أنيق","invoice","elegant","en",["Warm","Elegant","Refined"],["دافئ","أنيق"],"top-band","#92400E","#D97706"),
  mkT("inv-forest-min","Forest Minimal","أخضر الغابة","invoice","minimal","en",["Green","Nature","Fresh"],["أخضر","طبيعي"],"top-band","#14532D","#16A34A"),
  mkT("inv-rose-min","Rose Minimal","وردي مبسط","invoice","minimal","en",["Rose","Pink","Soft"],["وردي","ناعم"],"minimal","#9F1239","#E11D48"),
  mkT("inv-gold-min","Gold Minimal","ذهبي مبسط","invoice","elegant","en",["Gold","Premium","Luxury"],["ذهبي","فاخر"],"minimal","#78350F","#B45309"),
  mkT("inv-mint-min","Mint Clean","نعناعي نظيف","invoice","minimal","en",["Mint","Fresh","Light"],["نعناعي","منعش"],"top-band","#065F46","#34D399"),
  mkT("inv-plum-min","Deep Plum","أرجواني عميق","invoice","minimal","en",["Plum","Rich","Dark"],["أرجواني","غامق"],"minimal","#4C1D95","#A855F7"),
  mkT("inv-teal-min","Teal Minimal","فيروزي مبسط","invoice","minimal","en",["Teal","Clean","Modern"],["فيروزي","حديث"],"minimal","#0D9488","#14B8A6"),
  mkT("inv-warm-min","Warm Stone","حجر دافئ","invoice","minimal","en",["Warm","Neutral","Earthy"],["دافئ","ترابي"],"minimal","#7C2D12","#F97316"),
  mkT("inv-concrete","Concrete Gray","رمادي إسمنتي","invoice","minimal","en",["Concrete","Industrial","Clean"],["إسمنتي","صناعي"],"centered","#374151","#9CA3AF"),
  mkT("inv-navy-min","Navy Blue","أزرق ملكي مبسط","invoice","minimal","en",["Navy","Premium","Professional"],["نيفي","احترافي"],"minimal","#1E3A5F","#60A5FA"),
  mkT("inv-copper","Copper Warm","نحاسي دافئ","invoice","minimal","en",["Copper","Warm","Metallic"],["نحاسي","لامع"],"centered","#9A3412","#FB923C"),
  mkT("inv-violet-min","Violet Soft","بنفسجي ناعم","invoice","minimal","en",["Violet","Soft","Modern"],["بنفسجي","ناعم"],"minimal","#6D28D9","#A78BFA"),
  mkT("inv-dark-emerald","Dark Emerald","زمردي داكن","invoice","minimal","en",["Emerald","Dark","Premium"],["زمردي","فاخر"],"minimal","#064E3B","#6EE7B7"),

  // Corporate / Dark-Header (22)
  mkT("inv-modern-blue","Modern Blue","أزرق حديث","invoice","corporate","en",["Corporate","Navy","Professional"],["شركات","نيفي"],"dark-header","#0F172A","#2563EB"),
  mkT("inv-bold-corp","Bold Corporate","شركات مميز","invoice","corporate","en",["Corporate","Bold","Dark"],["شركات","مميز"],"two-col-header","#111827","#F59E0B"),
  mkT("inv-navy-exec","Navy Executive","نيفي تنفيذي","invoice","corporate","en",["Navy","Executive","Elite"],["نيفي","تنفيذي"],"dark-header","#1E3A8A","#3B82F6"),
  mkT("inv-charcoal","Charcoal Pro","فحمي احترافي","invoice","corporate","en",["Charcoal","Modern","Sleek"],["فحمي","أنيق"],"dark-header","#374151","#6B7280"),
  mkT("inv-deepgreen","Deep Forest","أخضر عميق","invoice","corporate","en",["Green","Corporate","Nature"],["أخضر","شركات"],"two-col-header","#14532D","#22C55E"),
  mkT("inv-burgundy","Burgundy","بردوني","invoice","corporate","en",["Burgundy","Rich","Elegant"],["بردوني","فاخر"],"bold-hero","#881337","#F43F5E"),
  mkT("inv-indigo","Indigo Corp","إنديجو","invoice","corporate","en",["Indigo","Tech","Sharp"],["إنديجو","تقني"],"split-header","#312E81","#6366F1"),
  mkT("inv-ocean","Ocean Deep","أعماق المحيط","invoice","corporate","en",["Ocean","Teal","Professional"],["فيروزي","محيطي"],"split-header","#164E63","#06B6D4"),
  mkT("inv-teal-corp","Teal Corporate","شركات فيروزي","invoice","corporate","en",["Teal","Corporate","Fresh"],["فيروزي","شركات"],"bold-hero","#0D9488","#14B8A6"),
  mkT("inv-plum-corp","Plum Corporate","شركات أرجواني","invoice","corporate","en",["Plum","Corporate","Luxury"],["أرجواني","شركات"],"price-list","#581C87","#A855F7"),
  mkT("inv-crimson-corp","Crimson Pro","قرمزي احترافي","invoice","corporate","en",["Crimson","Bold","Professional"],["قرمزي","احترافي"],"price-list","#7F1D1D","#EF4444"),
  mkT("inv-amber-corp","Amber Corporate","كهرماني شركات","invoice","corporate","en",["Amber","Gold","Corporate"],["كهرماني","شركات"],"stamp-box","#92400E","#F59E0B"),
  mkT("inv-navy-gold","Navy & Gold","نيفي وذهبي","invoice","corporate","en",["Navy","Gold","Prestige"],["نيفي","ذهبي"],"stamp-box","#1E3A8A","#D97706"),
  mkT("inv-dark-teal","Dark Teal","فيروزي داكن","invoice","corporate","en",["Dark","Teal","Modern"],["داكن","فيروزي"],"two-col-header","#0F172A","#14B8A6"),
  mkT("inv-banking","Banking Grade","درجة بنكية","invoice","corporate","en",["Finance","Banking","Trust"],["مالي","بنكي"],"bold-hero","#0F172A","#60A5FA"),
  mkT("inv-pharma","Healthcare Blue","أزرق طبي","invoice","corporate","en",["Medical","Health","Blue"],["طبي","صحة"],"price-list","#0C4A6E","#38BDF8"),
  mkT("inv-accounting","Accounting Dark","محاسبة داكن","invoice","corporate","en",["Accounting","Finance","Precise"],["محاسبة","دقيق"],"stamp-box","#374151","#3B82F6"),
  mkT("inv-steel","Steel Industrial","فولاذي صناعي","invoice","corporate","en",["Steel","Industrial","Strong"],["فولاذي","صناعي"],"split-header","#1E293B","#64748B"),
  mkT("inv-security","Security Pro","أمني احترافي","invoice","corporate","en",["Security","Defense","Dark"],["أمني","دفاعي"],"two-col-header","#0F172A","#4B5563"),
  mkT("inv-media","Media Dark","إعلام داكن","invoice","corporate","en",["Media","Creative","Bold"],["إعلام","إبداعي"],"bold-hero","#0F172A","#EC4899"),
  mkT("inv-telecom","Telecom Blue","اتصالات أزرق","invoice","corporate","en",["Telecom","Tech","Blue"],["اتصالات","تقني"],"price-list","#0F172A","#3B82F6"),
  mkT("inv-education","Education Navy","تعليم نيفي","invoice","corporate","en",["Education","Academic","Navy"],["تعليم","أكاديمي"],"stamp-box","#1E3A8A","#93C5FD"),

  // Arabic-First (22)
  mkT("inv-ar-teal","Arabic Teal","عربي فيروزي","invoice","arabic-first","ar",["Arabic","RTL","Teal"],["عربي","فيروزي"],"arabic","#0D9488","#14B8A6"),
  mkT("inv-ar-navy","Arabic Navy","عربي نيفي","invoice","arabic-first","ar",["Arabic","RTL","Navy"],["عربي","نيفي"],"arabic","#1E3A5F","#3B82F6"),
  mkT("inv-ar-emerald","Arabic Emerald","عربي زمردي","invoice","arabic-first","ar",["Arabic","RTL","Green"],["عربي","أخضر"],"arabic","#064E3B","#10B981"),
  mkT("inv-ar-crimson","Arabic Crimson","عربي قرمزي","invoice","arabic-first","ar",["Arabic","RTL","Red"],["عربي","أحمر"],"arabic","#7F1D1D","#F87171"),
  mkT("inv-ar-gold","Arabic Gold","عربي ذهبي","invoice","arabic-first","ar",["Arabic","RTL","Gold"],["عربي","ذهبي"],"arabic","#78350F","#F59E0B"),
  mkT("inv-ar-violet","Arabic Violet","عربي بنفسجي","invoice","arabic-first","ar",["Arabic","RTL","Violet"],["عربي","بنفسجي"],"arabic","#4C1D95","#8B5CF6"),
  mkT("inv-ar-orange","Arabic Orange","عربي برتقالي","invoice","arabic-first","ar",["Arabic","RTL","Orange"],["عربي","برتقالي"],"arabic","#9A3412","#F97316"),
  mkT("inv-ar-dark","Arabic Midnight","عربي منتصف الليل","invoice","arabic-first","ar",["Arabic","RTL","Dark"],["عربي","داكن"],"arabic","#0F0F1A","#8B5CF6"),
  mkT("inv-ar-ocean","Arabic Ocean","عربي محيطي","invoice","arabic-first","ar",["Arabic","RTL","Cyan"],["عربي","سيان"],"arabic","#164E63","#06B6D4"),
  mkT("inv-ar-rose","Arabic Rose","عربي وردي","invoice","arabic-first","ar",["Arabic","RTL","Rose"],["عربي","وردي"],"arabic","#831843","#EC4899"),
  mkT("inv-ar-slate","Arabic Slate","عربي رمادي","invoice","arabic-first","ar",["Arabic","RTL","Gray"],["عربي","رمادي"],"arabic","#1E293B","#94A3B8"),
  mkT("inv-ar-indigo","Arabic Indigo","عربي إنديجو","invoice","arabic-first","ar",["Arabic","RTL","Indigo"],["عربي","إنديجو"],"arabic","#312E81","#818CF8"),
  mkT("inv-bilingual1","Bilingual Blue","ثنائي أزرق","invoice","arabic-first","bilingual",["Bilingual","AR+EN","Blue"],["ثنائي","أزرق"],"bilingual-split","#1E3A5F","#60A5FA"),
  mkT("inv-bilingual2","Bilingual Teal","ثنائي فيروزي","invoice","arabic-first","bilingual",["Bilingual","AR+EN","Teal"],["ثنائي","فيروزي"],"bilingual-split","#0D9488","#F59E0B"),
  mkT("inv-ar-green","Arabic Green","عربي أخضر","invoice","arabic-first","ar",["Arabic","RTL","Forest"],["عربي","غابة"],"arabic","#14532D","#22C55E"),
  mkT("inv-ar-purple","Arabic Purple","عربي أرجواني","invoice","arabic-first","ar",["Arabic","RTL","Purple"],["عربي","أرجواني"],"arabic","#6B21A8","#A855F7"),
  mkT("inv-ar-blue2","Arabic Royal Blue","عربي أزرق ملكي","invoice","arabic-first","ar",["Arabic","RTL","Royal"],["عربي","ملكي"],"arabic","#1D4ED8","#60A5FA"),
  mkT("inv-ar-warm","Arabic Warm","عربي دافئ","invoice","arabic-first","ar",["Arabic","RTL","Warm"],["عربي","دافئ"],"arabic","#92400E","#F59E0B"),
  mkT("inv-ar-silver","Arabic Silver","عربي فضي","invoice","arabic-first","ar",["Arabic","RTL","Silver"],["عربي","فضي"],"arabic","#374151","#D1D5DB"),
  mkT("inv-ar-sky","Arabic Sky","عربي سماوي","invoice","arabic-first","ar",["Arabic","RTL","Sky"],["عربي","سماوي"],"arabic","#0C4A6E","#38BDF8"),
  mkT("inv-bilingual3","Bilingual Green","ثنائي أخضر","invoice","arabic-first","bilingual",["Bilingual","AR+EN","Green"],["ثنائي","أخضر"],"bilingual-split","#064E3B","#34D399"),
  mkT("inv-bilingual4","Bilingual Purple","ثنائي بنفسجي","invoice","arabic-first","bilingual",["Bilingual","AR+EN","Purple"],["ثنائي","بنفسجي"],"bilingual-split","#4C1D95","#C084FC"),

  // Modern / Gradient (28) — 3 kept as gradient, rest spread to new layouts
  mkT("inv-electric","Electric Blue","أزرق كهربائي","invoice","modern","en",["Electric","Bold","Vibrant"],["كهربائي","جريء"],"gradient","#1D4ED8","#2563EB","#06B6D4"),
  mkT("inv-purple-wave","Purple Wave","موجة بنفسجية","invoice","modern","en",["Purple","Vibrant","Creative"],["بنفسجي","نابض"],"gradient","#6D28D9","#7C3AED","#EC4899"),
  mkT("inv-sunset","Sunset Orange","برتقالي غروب","invoice","modern","en",["Orange","Sunset","Warm"],["برتقالي","دافئ"],"gradient","#C2410C","#EA580C","#F59E0B"),
  mkT("inv-emerald-bold","Emerald Bold","زمردي جريء","invoice","modern","en",["Emerald","Bold","Fresh"],["زمردي","منعش"],"two-col-header","#065F46","#059669"),
  mkT("inv-rose-gold","Rose Gold","وردي ذهبي","invoice","modern","en",["Rose","Gold","Luxury"],["وردي","ذهبي"],"bold-hero","#9F1239","#E11D48"),
  mkT("inv-cyan-tech","Cyan Tech","سيان تقني","invoice","modern","en",["Cyan","Tech","Sharp"],["سيان","تقني"],"stamp-box","#0E7490","#0891B2"),
  mkT("inv-fire","Fire","نار","invoice","modern","en",["Fire","Bold","Energy"],["نار","طاقة"],"bold-hero","#0F172A","#EF4444"),
  mkT("inv-purple-pink","Neon Fusion","اندماج نيون","invoice","modern","en",["Neon","Fusion","Bold"],["نيون","اندماج"],"split-header","#6D28D9","#EC4899"),
  mkT("inv-blue-cyan2","Blue Lagoon","بحيرة زرقاء","invoice","modern","en",["Blue","Cyan","Ocean"],["أزرق","سيان"],"two-col-header","#1D4ED8","#06B6D4"),
  mkT("inv-green-teal","Forest Teal","غابة فيروزية","invoice","modern","en",["Green","Teal","Nature"],["أخضر","فيروزي"],"price-list","#065F46","#059669"),
  mkT("inv-fire-orange","Volcanic","بركاني","invoice","modern","en",["Volcanic","Fire","Orange"],["بركاني","برتقالي"],"price-list","#9A3412","#F59E0B"),
  mkT("inv-purple-gold","Royalty","ملكي","invoice","modern","en",["Gold","Purple","Regal"],["ذهبي","بنفسجي","ملكي"],"split-header","#4C1D95","#F59E0B"),
  mkT("inv-dark-teal2","Dark Teal Wave","موجة فيروزية","invoice","modern","en",["Dark","Teal","Wave"],["داكن","فيروزي"],"two-col-header","#0F172A","#14B8A6"),
  mkT("inv-marketing","Marketing Pink","تسويق وردي","invoice","modern","en",["Marketing","Pink","Creative"],["تسويق","وردي"],"split-header","#831843","#EC4899"),
  mkT("inv-freelance","Freelance Creative","مستقل إبداعي","invoice","modern","en",["Freelance","Creative","Colorful"],["مستقل","ملون"],"stamp-box","#6D28D9","#F59E0B"),
  mkT("inv-events","Events & Shows","فعاليات وعروض","invoice","modern","en",["Events","Pink","Vibrant"],["فعاليات","زهري"],"price-list","#831843","#EC4899"),
  mkT("inv-food","Food & Beverage","غذاء ومشروبات","invoice","modern","en",["Food","Red","Restaurant"],["مطعم","أحمر"],"bold-hero","#7F1D1D","#DC2626"),
  mkT("inv-travel","Travel & Tourism","سفر وسياحة","invoice","modern","en",["Travel","Sky","Ocean"],["سفر","سماء"],"stamp-box","#0C4A6E","#0EA5E9"),
  mkT("inv-tech-startup","Tech Startup","شركة تقنية ناشئة","invoice","modern","en",["Tech","Startup","Vibrant"],["تقنية","ناشئة"],"split-header","#1D4ED8","#7C3AED"),
  mkT("inv-fashion","Fashion","أزياء","invoice","modern","en",["Fashion","Pink","Style"],["أزياء","وردي"],"two-col-header","#831843","#EC4899"),
  mkT("inv-auto","Automotive","سيارات","invoice","modern","en",["Auto","Steel","Speed"],["سيارات","فولاذي"],"stamp-box","#1E293B","#64748B"),
  mkT("inv-gym","Sports & Fitness","رياضة ولياقة","invoice","modern","en",["Sports","Energy","Red"],["رياضة","طاقة"],"price-list","#9A3412","#DC2626"),
  mkT("inv-photo","Photography","تصوير فوتوغرافي","invoice","modern","en",["Photography","Purple","Artistic"],["تصوير","فني"],"bold-hero","#0F0F1A","#A78BFA"),
  mkT("inv-spa","Beauty & Spa","تجميل وسبا","invoice","modern","en",["Beauty","Spa","Luxury"],["تجميل","سبا"],"stamp-box","#831843","#EC4899"),
  mkT("inv-boxed-blue","Boxed Blue","مربع أزرق","invoice","corporate","en",["Boxed","Blue","Structured"],["مربع","أزرق"],"boxed","#1E3A8A","#3B82F6"),
  mkT("inv-boxed-dark","Boxed Dark","مربع داكن","invoice","corporate","en",["Boxed","Dark","Bold"],["مربع","داكن"],"split-header","#111827","#374151"),
  mkT("inv-sidebar-navy","Sidebar Navy","شريط جانبي نيفي","invoice","corporate","en",["Sidebar","Navy","Modern"],["شريط","نيفي"],"sidebar","#1E3A8A","#3B82F6"),
  mkT("inv-sidebar-dark","Sidebar Dark","شريط جانبي داكن","invoice","corporate","en",["Sidebar","Dark","Executive"],["شريط","داكن"],"sidebar","#0F172A","#F59E0B"),

  // Elegant (12) — 3 kept as elegant, rest to new layouts
  mkT("inv-gold-exec","Gold Executive","تنفيذي ذهبي","invoice","elegant","en",["Gold","Executive","Premium"],["ذهبي","تنفيذي"],"elegant","#78350F","#B45309"),
  mkT("inv-navy-prem","Navy Premium","نيفي فاخر","invoice","elegant","en",["Navy","Premium","Luxury"],["نيفي","فاخر"],"elegant","#1E3A8A","#1D4ED8"),
  mkT("inv-champagne","Champagne","شمبانيا","invoice","elegant","en",["Champagne","Warm","Refined"],["شمبانيا","راقٍ"],"elegant","#7C2D12","#D97706"),
  mkT("inv-midnight","Midnight Luxury","روعة منتصف الليل","invoice","elegant","en",["Dark","Luxury","Purple"],["داكن","فاخر"],"split-header","#0F0F1A","#8B5CF6"),
  mkT("inv-ivory","Ivory Gold","عاجي ذهبي","invoice","elegant","en",["Ivory","Gold","Classic"],["عاجي","ذهبي"],"split-header","#7C2D12","#D97706"),
  mkT("inv-pearl","Pearl White","أبيض لؤلؤي","invoice","elegant","en",["Pearl","White","Elegant"],["لؤلؤي","أنيق"],"bold-hero","#374151","#9CA3AF"),
  mkT("inv-velvet","Deep Velvet","مخمل عميق","invoice","elegant","en",["Velvet","Dark","Rich"],["مخمل","غني"],"stamp-box","#581C87","#7C3AED"),
  mkT("inv-marble","Marble Classic","رخام كلاسيك","invoice","elegant","en",["Marble","Classic","Timeless"],["رخام","خالد"],"stamp-box","#1E293B","#94A3B8"),
  mkT("inv-gold-boxed","Gold Boxed","مربع ذهبي","invoice","elegant","en",["Gold","Boxed","Luxury"],["ذهبي","مربع"],"boxed","#78350F","#F59E0B"),
  mkT("inv-sidebar-gold","Sidebar Gold","شريط ذهبي","invoice","elegant","en",["Sidebar","Gold","Premium"],["شريط","ذهبي"],"sidebar","#78350F","#D97706"),
  mkT("inv-boxed-violet","Boxed Violet","مربع بنفسجي","invoice","elegant","en",["Boxed","Violet","Premium"],["مربع","بنفسجي"],"stamp-box","#4C1D95","#A855F7"),
  mkT("inv-sidebar-teal","Sidebar Teal","شريط فيروزي","invoice","corporate","en",["Sidebar","Teal","Modern"],["شريط","فيروزي"],"sidebar","#0D9488","#14B8A6"),

  // Industry-Specific (8)
  mkT("inv-it","IT & Software","تقنية المعلومات","invoice","corporate","en",["IT","Software","Tech"],["تقنية","برمجيات"],"split-header","#0C4A6E","#0EA5E9"),
  mkT("inv-medical","Medical / Health","طبي / صحي","invoice","corporate","en",["Medical","Healthcare","Blue"],["طبي","صحة"],"dark-header","#1E3A8A","#38BDF8"),
  mkT("inv-construction","Construction","إنشاءات","invoice","corporate","en",["Construction","Heavy","Orange"],["إنشاءات","ثقيل"],"construction","#9A3412","#EA580C","#F59E0B"),
  mkT("inv-consulting","Consulting","استشارات","invoice","corporate","en",["Consulting","Indigo","Strategy"],["استشارات","استراتيجية"],"consulting","#312E81","#6366F1"),
  mkT("inv-retail","Retail & Commerce","تجزئة وتجارة","invoice","corporate","en",["Retail","Green","Commerce"],["تجزئة","تجارة"],"dark-header","#14532D","#22C55E"),
  mkT("inv-realestate","Real Estate","عقارات","invoice","corporate","en",["Real Estate","Green","Property"],["عقارات","عقار"],"price-list","#064E3B","#10B981"),
  mkT("inv-law","Legal Services","خدمات قانونية","invoice","minimal","en",["Legal","Law","Formal"],["قانوني","رسمي"],"minimal","#1E293B","#B45309"),
  mkT("inv-architecture","Architecture","هندسة معمارية","invoice","corporate","en",["Architecture","Design","Blueprint"],["معماري","تصميم"],"bold-hero","#1E293B","#0EA5E9"),

  // ═══════════════════════════════════════════════════════════════════
  // QUOTATIONS  (110)
  // ═══════════════════════════════════════════════════════════════════

  // Classic / Minimal (15)
  mkT("quo-standard","Standard Quote","عرض أسعار قياسي","quotation","minimal","en",["Classic","Standard","PDF"],["كلاسيك","قياسي"],"dark-header","#111827","#374151"),
  mkT("quo-classic-blue","Classic Blue","أزرق كلاسيك","quotation","minimal","en",["Blue","Classic","Clean"],["أزرق","كلاسيك"],"dark-header","#1E3A8A","#2563EB"),
  mkT("quo-pro-gray","Professional Gray","رمادي احترافي","quotation","minimal","en",["Gray","Professional","Clean"],["رمادي","احترافي"],"dark-header","#374151","#6B7280"),
  mkT("quo-clean-min","Clean Minimal","بسيط نظيف","quotation","minimal","en",["Minimal","Clean","Simple"],["بسيط","نظيف"],"top-band","#111827","#9CA3AF"),
  mkT("quo-slate-min","Slate Minimal","رمادي صخري","quotation","minimal","en",["Slate","Minimal","Modern"],["رمادي","حديث"],"centered","#334155","#94A3B8"),
  mkT("quo-ivory-min","Ivory Minimal","عاجي مبسط","quotation","elegant","en",["Ivory","Warm","Refined"],["عاجي","دافئ"],"top-band","#7C2D12","#D97706"),
  mkT("quo-forest-min","Forest Quote","غابة عرض أسعار","quotation","minimal","en",["Forest","Green","Clean"],["غابة","أخضر"],"top-band","#14532D","#22C55E"),
  mkT("quo-mint-min","Mint Quote","نعناعي عرض أسعار","quotation","minimal","en",["Mint","Fresh","Modern"],["نعناعي","منعش"],"top-band","#065F46","#34D399"),
  mkT("quo-gold-min","Gold Minimal Quote","ذهبي مبسط","quotation","elegant","en",["Gold","Premium","Elegant"],["ذهبي","أنيق"],"minimal","#78350F","#B45309"),
  mkT("quo-navy-min","Navy Minimal","نيفي مبسط","quotation","minimal","en",["Navy","Minimal","Clean"],["نيفي","نظيف"],"centered","#1E3A5F","#60A5FA"),
  mkT("quo-dark-min","Dark Minimal","داكن مبسط","quotation","minimal","en",["Dark","Minimal","Bold"],["داكن","جريء"],"minimal","#030712","#374151"),
  mkT("quo-teal-min","Teal Minimal","فيروزي مبسط","quotation","minimal","en",["Teal","Fresh","Clean"],["فيروزي","منعش"],"minimal","#0D9488","#14B8A6"),
  mkT("quo-rose-min","Rose Minimal","وردي مبسط","quotation","minimal","en",["Rose","Soft","Modern"],["وردي","ناعم"],"minimal","#9F1239","#E11D48"),
  mkT("quo-copper-min","Copper Quote","نحاسي عرض","quotation","minimal","en",["Copper","Warm","Unique"],["نحاسي","فريد"],"centered","#9A3412","#FB923C"),
  mkT("quo-compact-std","Compact Standard","مضغوط قياسي","quotation","compact","en",["Compact","Dense","Multi"],["مضغوط","متعدد"],"compact","#374151","#374151"),

  // Corporate / Dark Header (22)
  mkT("quo-exec","Executive Proposal","مقترح تنفيذي","quotation","corporate","en",["Executive","Navy","Corporate"],["تنفيذي","شركات"],"dark-header","#1E3A8A","#3B82F6"),
  mkT("quo-formal-dark","Formal Dark","داكن رسمي","quotation","corporate","en",["Formal","Dark","Strict"],["رسمي","داكن"],"dark-header","#111827","#D1D5DB"),
  mkT("quo-corp-green","Corporate Green","شركات أخضر","quotation","corporate","en",["Green","Corporate","Fresh"],["أخضر","شركات"],"dark-header","#14532D","#22C55E"),
  mkT("quo-deep-plum","Deep Plum Quote","برقوقي عميق","quotation","corporate","en",["Plum","Luxury","Corporate"],["برقوقي","فاخر"],"two-col-header","#581C87","#A855F7"),
  mkT("quo-burgundy","Burgundy Quote","بردوني عرض","quotation","corporate","en",["Burgundy","Rich","Pro"],["بردوني","غني"],"bold-hero","#881337","#F43F5E"),
  mkT("quo-ocean-corp","Ocean Corporate","محيط شركات","quotation","corporate","en",["Ocean","Teal","Pro"],["محيط","فيروزي"],"two-col-header","#164E63","#06B6D4"),
  mkT("quo-amber-corp","Amber Corporate","كهرماني شركات","quotation","corporate","en",["Amber","Gold","Executive"],["كهرماني","ذهبي"],"price-list","#92400E","#F59E0B"),
  mkT("quo-indigo-corp","Indigo Corporate","إنديجو شركات","quotation","corporate","en",["Indigo","Tech","Corp"],["إنديجو","تقني"],"split-header","#312E81","#6366F1"),
  mkT("quo-charcoal","Charcoal Quote","فحمي عرض","quotation","corporate","en",["Charcoal","Professional","Clean"],["فحمي","احترافي"],"two-col-header","#374151","#6B7280"),
  mkT("quo-navy-gold","Navy Gold Quote","نيفي وذهبي","quotation","corporate","en",["Navy","Gold","Prestige"],["نيفي","ذهبي"],"stamp-box","#1E3A8A","#F59E0B"),
  mkT("quo-banking","Financial Quote","مالي مصرفي","quotation","corporate","en",["Finance","Banking","Precise"],["مالي","مصرفي"],"bold-hero","#0F172A","#60A5FA"),
  mkT("quo-crimson","Crimson Quote","قرمزي عرض","quotation","corporate","en",["Crimson","Bold","Strong"],["قرمزي","قوي"],"price-list","#7F1D1D","#EF4444"),
  mkT("quo-steel","Steel Quote","فولاذي عرض","quotation","corporate","en",["Steel","Industrial","Pro"],["فولاذي","صناعي"],"split-header","#1E293B","#64748B"),
  mkT("quo-dark-teal-corp","Dark Teal Quote","فيروزي داكن","quotation","corporate","en",["Dark","Teal","Modern"],["داكن","فيروزي"],"price-list","#0F172A","#14B8A6"),
  mkT("quo-sidebar-navy","Sidebar Navy Quote","شريط نيفي","quotation","corporate","en",["Sidebar","Navy","Structured"],["شريط","نيفي"],"sidebar","#1E3A8A","#3B82F6"),
  mkT("quo-sidebar-dark","Sidebar Dark Quote","شريط داكن","quotation","corporate","en",["Sidebar","Dark","Bold"],["شريط","داكن"],"sidebar","#0F172A","#F59E0B"),
  mkT("quo-boxed-blue","Boxed Blue Quote","مربع أزرق","quotation","corporate","en",["Boxed","Blue","Clean"],["مربع","أزرق"],"boxed","#1E3A8A","#3B82F6"),
  mkT("quo-boxed-dark","Boxed Dark Quote","مربع داكن","quotation","corporate","en",["Boxed","Dark","Sharp"],["مربع","حاد"],"boxed","#111827","#374151"),
  mkT("quo-telecom-q","Telecom Quote","عرض اتصالات","quotation","corporate","en",["Telecom","Tech","Digital"],["اتصالات","رقمي"],"stamp-box","#0F172A","#3B82F6"),
  mkT("quo-security-q","Security Quote","عرض أمني","quotation","corporate","en",["Security","Defense","Dark"],["أمني","دفاعي"],"two-col-header","#0F172A","#4B5563"),
  mkT("quo-media-q","Media Quote","عرض إعلامي","quotation","corporate","en",["Media","Pink","Creative"],["إعلام","وردي"],"bold-hero","#0F172A","#EC4899"),
  mkT("quo-compact-corp","Compact Corporate","مضغوط شركات","quotation","compact","en",["Compact","Corporate","Dense"],["مضغوط","شركات"],"compact","#1E3A8A","#3B82F6"),

  // Arabic (22)
  mkT("quo-ar-violet","Arabic Violet Quote","عربي بنفسجي","quotation","arabic-first","ar",["Arabic","RTL","Violet"],["عربي","بنفسجي"],"arabic","#4C1D95","#8B5CF6"),
  mkT("quo-ar-amber","Arabic Amber","عربي كهرماني","quotation","arabic-first","ar",["Arabic","RTL","Amber"],["عربي","كهرماني"],"arabic","#78350F","#F59E0B"),
  mkT("quo-ar-teal","Arabic Teal Quote","عرض فيروزي","quotation","arabic-first","ar",["Arabic","RTL","Teal"],["عربي","فيروزي"],"arabic","#0D9488","#14B8A6"),
  mkT("quo-ar-navy","Arabic Navy Quote","عرض نيفي عربي","quotation","arabic-first","ar",["Arabic","RTL","Navy"],["عربي","نيفي"],"arabic","#1E3A5F","#60A5FA"),
  mkT("quo-bilingual1","Bilingual Quote Blue","ثنائي أزرق","quotation","arabic-first","bilingual",["Bilingual","AR+EN","Blue"],["ثنائي","أزرق"],"bilingual-split","#1E3A8A","#60A5FA"),
  mkT("quo-ar-green","Arabic Green Quote","عرض أخضر","quotation","arabic-first","ar",["Arabic","RTL","Green"],["عربي","أخضر"],"arabic","#064E3B","#10B981"),
  mkT("quo-ar-rose","Arabic Rose Quote","عرض وردي","quotation","arabic-first","ar",["Arabic","RTL","Rose"],["عربي","وردي"],"arabic","#831843","#EC4899"),
  mkT("quo-ar-dark","Arabic Dark Quote","عرض داكن عربي","quotation","arabic-first","ar",["Arabic","RTL","Dark"],["عربي","داكن"],"arabic","#0F0F1A","#8B5CF6"),
  mkT("quo-ar-crimson","Arabic Crimson Quote","عرض قرمزي","quotation","arabic-first","ar",["Arabic","RTL","Red"],["عربي","أحمر"],"arabic","#7F1D1D","#F87171"),
  mkT("quo-ar-gold","Arabic Gold Quote","عرض ذهبي","quotation","arabic-first","ar",["Arabic","RTL","Gold"],["عربي","ذهبي"],"arabic","#92400E","#F59E0B"),
  mkT("quo-ar-sky","Arabic Sky Quote","عرض سماوي","quotation","arabic-first","ar",["Arabic","RTL","Sky"],["عربي","سماوي"],"arabic","#0C4A6E","#38BDF8"),
  mkT("quo-ar-ocean","Arabic Ocean Quote","عرض محيطي","quotation","arabic-first","ar",["Arabic","RTL","Cyan"],["عربي","سيان"],"arabic","#164E63","#06B6D4"),
  mkT("quo-ar-purple","Arabic Purple Quote","عرض أرجواني","quotation","arabic-first","ar",["Arabic","RTL","Purple"],["عربي","أرجواني"],"arabic","#6B21A8","#A855F7"),
  mkT("quo-ar-slate","Arabic Slate Quote","عرض رمادي","quotation","arabic-first","ar",["Arabic","RTL","Gray"],["عربي","رمادي"],"arabic","#1E293B","#94A3B8"),
  mkT("quo-ar-indigo","Arabic Indigo Quote","عرض إنديجو","quotation","arabic-first","ar",["Arabic","RTL","Indigo"],["عربي","إنديجو"],"arabic","#312E81","#818CF8"),
  mkT("quo-ar-emerald","Arabic Emerald Quote","عرض زمردي","quotation","arabic-first","ar",["Arabic","RTL","Emerald"],["عربي","زمردي"],"arabic","#064E3B","#34D399"),
  mkT("quo-bilingual2","Bilingual Teal Quote","ثنائي فيروزي","quotation","arabic-first","bilingual",["Bilingual","AR+EN","Teal"],["ثنائي","فيروزي"],"bilingual-split","#0D9488","#F59E0B"),
  mkT("quo-bilingual3","Bilingual Purple Quote","ثنائي بنفسجي","quotation","arabic-first","bilingual",["Bilingual","AR+EN","Purple"],["ثنائي","بنفسجي"],"bilingual-split","#4C1D95","#C084FC"),
  mkT("quo-ar-orange","Arabic Orange Quote","عرض برتقالي","quotation","arabic-first","ar",["Arabic","RTL","Orange"],["عربي","برتقالي"],"arabic","#9A3412","#F97316"),
  mkT("quo-ar-mint","Arabic Mint Quote","عرض نعناعي","quotation","arabic-first","ar",["Arabic","RTL","Mint"],["عربي","نعناعي"],"arabic","#065F46","#34D399"),
  mkT("quo-ar-warm","Arabic Warm Quote","عرض دافئ","quotation","arabic-first","ar",["Arabic","RTL","Warm"],["عربي","دافئ"],"arabic","#7C2D12","#FB923C"),
  mkT("quo-bilingual4","Bilingual Green Quote","ثنائي أخضر","quotation","arabic-first","bilingual",["Bilingual","AR+EN","Green"],["ثنائي","أخضر"],"bilingual-split","#14532D","#22C55E"),

  // Modern / Creative (22) — 3 kept as gradient, rest to new layouts
  mkT("quo-proposal","Proposal Style","نمط مقترح","quotation","modern","en",["Proposal","Creative","Bold"],["مقترح","إبداعي"],"gradient","#6D28D9","#7C3AED","#8B5CF6"),
  mkT("quo-agency","Creative Agency","وكالة إبداعية","quotation","modern","en",["Agency","Pink","Vibrant"],["وكالة","وردي"],"gradient","#6D28D9","#7C3AED","#EC4899"),
  mkT("quo-startup","Startup Style","أسلوب ناشئة","quotation","modern","en",["Startup","Cyan","Bold"],["ناشئة","سيان"],"gradient","#1D4ED8","#2563EB","#06B6D4"),
  mkT("quo-bold-impact","Bold Impact","تأثير جريء","quotation","modern","en",["Orange","Bold","Energy"],["برتقالي","طاقة"],"gradient","#C2410C","#EA580C","#F97316"),
  mkT("quo-electric","Electric Quote","عرض كهربائي","quotation","modern","en",["Electric","Blue","Sharp"],["كهربائي","أزرق"],"two-col-header","#1D4ED8","#2563EB"),
  mkT("quo-emerald-wave","Emerald Wave","موجة زمردية","quotation","modern","en",["Emerald","Green","Wave"],["زمرد","موجة"],"price-list","#065F46","#059669"),
  mkT("quo-sunset-q","Sunset Quote","عرض غروب","quotation","modern","en",["Sunset","Orange","Warm"],["غروب","دافئ"],"bold-hero","#C2410C","#EA580C"),
  mkT("quo-fire-q","Fire Quote","عرض ناري","quotation","modern","en",["Fire","Bold","Dynamic"],["ناري","ديناميكي"],"stamp-box","#0F172A","#EF4444"),
  mkT("quo-royalty","Royalty","ملكي","quotation","modern","en",["Gold","Purple","Royal"],["ذهبي","ملكي"],"split-header","#4C1D95","#F59E0B"),
  mkT("quo-marketing-q","Marketing Bold","تسويق جريء","quotation","modern","en",["Marketing","Pink","Bold"],["تسويق","وردي"],"price-list","#831843","#EC4899"),
  mkT("quo-tech-q","Tech Proposal","مقترح تقني","quotation","modern","en",["Tech","Dark","Digital"],["تقنية","رقمي"],"gradient","#1D4ED8","#7C3AED","#06B6D4"),
  mkT("quo-neon","Neon Style","نيون","quotation","modern","en",["Neon","Vibrant","Electric"],["نيون","كهربائي"],"two-col-header","#6D28D9","#EC4899"),
  mkT("quo-photo-q","Photography Quote","عرض تصوير","quotation","modern","en",["Photography","Purple","Art"],["تصوير","فني"],"bold-hero","#0F0F1A","#A78BFA"),
  mkT("quo-travel-q","Travel Quote","عرض سفر","quotation","modern","en",["Travel","Ocean","Sky"],["سفر","محيط"],"stamp-box","#0C4A6E","#0EA5E9"),
  mkT("quo-food-q","Food & Dining","غذاء ومطاعم","quotation","modern","en",["Food","Red","Restaurant"],["مطعم","أحمر"],"price-list","#7F1D1D","#DC2626"),
  mkT("quo-events-q","Events Quote","عرض فعاليات","quotation","modern","en",["Events","Pink","Party"],["فعاليات","حفلات"],"split-header","#831843","#EC4899"),
  mkT("quo-fashion-q","Fashion Quote","عرض أزياء","quotation","modern","en",["Fashion","Pink","Style"],["أزياء","موضة"],"two-col-header","#831843","#EC4899"),
  mkT("quo-gym-q","Fitness Quote","عرض لياقة","quotation","modern","en",["Fitness","Energy","Sports"],["لياقة","رياضة"],"stamp-box","#9A3412","#DC2626"),
  mkT("quo-spa-q","Beauty Quote","عرض تجميل","quotation","modern","en",["Beauty","Spa","Rose"],["تجميل","وردي"],"price-list","#831843","#EC4899"),
  mkT("quo-sidebar-grad","Sidebar Gradient","شريط متدرج","quotation","modern","en",["Sidebar","Gradient","Modern"],["شريط","متدرج"],"sidebar","#6D28D9","#A855F7"),
  mkT("quo-boxed-grad","Boxed Modern","مربع حديث","quotation","modern","en",["Boxed","Modern","Creative"],["مربع","حديث"],"split-header","#6D28D9","#A855F7"),
  mkT("quo-compact-modern","Compact Modern","مضغوط حديث","quotation","modern","en",["Compact","Modern","Fresh"],["مضغوط","حديث"],"compact","#0D9488","#14B8A6"),

  // Proposal / Government (15)
  mkT("quo-formal-tender","Formal Tender","عطاء رسمي","quotation","government","en",["Government","Formal","Tender"],["حكومي","رسمي"],"minimal","#1E3A5F","#1E3A5F"),
  mkT("quo-gov-rfq","Government RFQ","طلب عرض حكومي","quotation","government","en",["Government","Official","RFQ"],["حكومي","رسمي"],"minimal","#1E3A5F","#374151"),
  mkT("quo-consulting-prop","Consulting Proposal","مقترح استشاري","quotation","corporate","en",["Consulting","Detailed","Indigo"],["استشاري","مفصّل"],"consulting","#312E81","#4338CA"),
  mkT("quo-it-scope","IT Scope","نطاق تقني","quotation","corporate","en",["IT","Tech","Scope"],["تقنية","نطاق"],"gradient","#0C4A6E","#0369A1","#0EA5E9"),
  mkT("quo-agency-prop","Agency Proposal","مقترح وكالة","quotation","corporate","en",["Agency","Proposal","Purple"],["وكالة","مقترح"],"gradient","#4C1D95","#7C3AED","#C084FC"),
  mkT("quo-construction-est","Construction Estimate","تقدير إنشائي","quotation","corporate","en",["Construction","Materials","Orange"],["إنشاءات","مواد"],"construction","#9A3412","#C2410C"),
  mkT("quo-software-scope","Software Scope","نطاق برمجي","quotation","corporate","en",["Software","IT","Dev"],["برمجيات","تطوير"],"split-header","#0C4A6E","#0EA5E9"),
  mkT("quo-medical-svc","Medical Services","خدمات طبية","quotation","corporate","en",["Medical","Healthcare","Care"],["طبي","رعاية"],"dark-header","#1E3A8A","#38BDF8"),
  mkT("quo-design-agency","Design Agency","وكالة تصميم","quotation","modern","en",["Design","Creative","Purple"],["تصميم","إبداعي"],"bold-hero","#4C1D95","#A78BFA"),
  mkT("quo-logistics","Transport & Logistics","نقل ولوجستيات","quotation","corporate","en",["Logistics","Transport","Orange"],["نقل","لوجستيات"],"dark-header","#7C2D12","#EA580C"),
  mkT("quo-ngo","NGO / Nonprofit","غير ربحية","quotation","government","en",["NGO","Nonprofit","Green"],["غير ربحية","أخضر"],"dark-header","#14532D","#16A34A"),
  mkT("quo-gradient-blue","Gradient Blue","تدرج أزرق","quotation","modern","en",["Gradient","Blue","Wave"],["تدرج","أزرق"],"two-col-header","#1E3A8A","#2563EB"),
  mkT("quo-events-catering","Events & Catering","فعاليات وضيافة","quotation","modern","en",["Events","Pink","Catering"],["فعاليات","ضيافة"],"price-list","#831843","#EC4899"),
  mkT("quo-realestate-q","Real Estate Proposal","عقارات مقترح","quotation","corporate","en",["Real Estate","Green","Property"],["عقارات","عقار"],"price-list","#064E3B","#10B981"),
  mkT("quo-compact-gov","Compact Government","مضغوط حكومي","quotation","government","en",["Government","Compact","Formal"],["حكومي","مضغوط"],"compact","#1E3A5F","#374151"),

  // Industry (14)
  mkT("quo-pharmacy-q","Pharmacy Quote","عرض صيدلية","quotation","corporate","en",["Pharmacy","Medical","Blue"],["صيدلية","طبي"],"dark-header","#0C4A6E","#38BDF8"),
  mkT("quo-automotive-q","Automotive Quote","عرض سيارات","quotation","corporate","en",["Auto","Steel","Speed"],["سيارات","فولاذي"],"two-col-header","#1E293B","#64748B"),
  mkT("quo-education-q","Education Proposal","مقترح تعليمي","quotation","corporate","en",["Education","Academic","Navy"],["تعليم","أكاديمي"],"price-list","#1E3A8A","#93C5FD"),
  mkT("quo-hospitality-q","Hotel & Hospitality","فندقي وضيافة","quotation","corporate","en",["Hotel","Luxury","Gold"],["فندقي","ذهبي"],"stamp-box","#1E3A8A","#F59E0B"),
  mkT("quo-marketing-agency","Marketing Agency","وكالة تسويق","quotation","modern","en",["Marketing","Creative","Bold"],["تسويق","إبداعي"],"split-header","#831843","#EC4899"),
  mkT("quo-security-q2","Security Services","خدمات أمنية","quotation","corporate","en",["Security","Dark","Defense"],["أمن","دفاع"],"two-col-header","#0F172A","#4B5563"),
  mkT("quo-cleaning-q","Cleaning Services","خدمات تنظيف","quotation","corporate","en",["Cleaning","Green","Fresh"],["تنظيف","نظافة"],"dark-header","#14532D","#6EE7B7"),
  mkT("quo-catering-q","Catering Quote","عرض ضيافة","quotation","modern","en",["Catering","Food","Warm"],["ضيافة","طعام"],"bold-hero","#7F1D1D","#DC2626"),
  mkT("quo-arch-q","Architecture Quote","عرض معماري","quotation","corporate","en",["Architecture","Design","Precise"],["معماري","دقيق"],"bold-hero","#1E293B","#0EA5E9"),
  mkT("quo-printing-q","Printing & Media","طباعة وإعلام","quotation","corporate","en",["Printing","Media","Creative"],["طباعة","إعلام"],"split-header","#4C1D95","#EC4899"),
  mkT("quo-recruit-q","HR & Recruitment","موارد بشرية","quotation","corporate","en",["HR","People","Teal"],["موارد بشرية","فيروزي"],"split-header","#1E3A5F","#A5B4FC"),
  mkT("quo-legal-q","Legal Services","خدمات قانونية","quotation","minimal","en",["Legal","Formal","Navy"],["قانوني","رسمي"],"minimal","#1E293B","#B45309"),
  mkT("quo-insurance-q","Insurance Quote","عرض تأمين","quotation","corporate","en",["Insurance","Trust","Green"],["تأمين","ثقة"],"dark-header","#14532D","#34D399"),
  mkT("quo-renewable-q","Renewable Energy","طاقة متجددة","quotation","corporate","en",["Solar","Green","Energy"],["طاقة","أخضر"],"gradient","#065F46","#059669","#F59E0B"),

  // ═══════════════════════════════════════════════════════════════════
  // RECEIPTS  (100)
  // ═══════════════════════════════════════════════════════════════════

  // Standard A4 (15)
  mkT("rec-full-a4","Full A4 Receipt","إيصال A4 كامل","receipt","minimal","en",["Full Page","Signature","Stamp"],["صفحة كاملة","ختم"],"dark-header","#111827","#374151"),
  mkT("rec-simple","Simple Receipt","إيصال بسيط","receipt","minimal","en",["Simple","Clean","Minimal"],["بسيط","نظيف"],"minimal","#111827","#059669"),
  mkT("rec-professional","Professional Blue","أزرق احترافي","receipt","corporate","en",["Professional","Blue","Corp"],["احترافي","أزرق"],"dark-header","#1E3A8A","#3B82F6"),
  mkT("rec-corp-gray","Corporate Gray","رمادي شركات","receipt","corporate","en",["Gray","Corporate","Formal"],["رمادي","شركات"],"dark-header","#374151","#9CA3AF"),
  mkT("rec-clean-white","Clean White","أبيض نظيف","receipt","minimal","en",["Clean","White","Pure"],["نظيف","أبيض"],"minimal","#111827","#6B7280"),
  mkT("rec-navy-a4","Navy A4","نيفي A4","receipt","corporate","en",["Navy","Professional","A4"],["نيفي","احترافي"],"dark-header","#1E3A8A","#F59E0B"),
  mkT("rec-forest-a4","Forest A4","غابة A4","receipt","corporate","en",["Green","Forest","Official"],["أخضر","رسمي"],"two-col-header","#14532D","#22C55E"),
  mkT("rec-plum-a4","Plum A4","برقوقي A4","receipt","corporate","en",["Plum","Rich","Formal"],["برقوقي","رسمي"],"bold-hero","#581C87","#A855F7"),
  mkT("rec-teal-a4","Teal A4","فيروزي A4","receipt","corporate","en",["Teal","Modern","Clean"],["فيروزي","حديث"],"split-header","#0D9488","#14B8A6"),
  mkT("rec-amber-a4","Amber A4","كهرماني A4","receipt","elegant","en",["Amber","Gold","Warm"],["كهرماني","دافئ"],"stamp-box","#92400E","#F59E0B"),
  mkT("rec-indigo-a4","Indigo A4","إنديجو A4","receipt","corporate","en",["Indigo","Tech","Modern"],["إنديجو","تقني"],"price-list","#312E81","#6366F1"),
  mkT("rec-ocean-a4","Ocean A4","محيط A4","receipt","corporate","en",["Ocean","Cyan","Deep"],["محيط","سيان"],"two-col-header","#164E63","#06B6D4"),
  mkT("rec-boxed-a4","Boxed Receipt","مربع إيصال","receipt","corporate","en",["Boxed","Structured","Clean"],["مربع","منظم"],"boxed","#1E3A8A","#3B82F6"),
  mkT("rec-sidebar-a4","Sidebar Receipt","شريط إيصال","receipt","corporate","en",["Sidebar","Modern","Bold"],["شريط","حديث"],"sidebar","#1E3A8A","#3B82F6"),
  mkT("rec-compact-a4","Compact Receipt","مضغوط إيصال","receipt","compact","en",["Compact","Dense","Multi"],["مضغوط","متعدد"],"compact","#374151","#374151"),

  // Thermal / POS (15)
  mkT("rec-thermal-pos","Thermal POS","حراري POS","receipt","compact","en",["POS","Thermal","Monospace"],["حراري","كاشير"],"thermal","#111827","#374151"),
  mkT("rec-modern-pos","Modern POS","كاشير حديث","receipt","compact","en",["POS","Modern","Retail"],["كاشير","تجزئة"],"thermal","#374151","#6B7280"),
  mkT("rec-thermal-ar","Arabic Thermal","حراري عربي","receipt","compact","ar",["POS","Arabic","RTL"],["عربي","حراري"],"arabic","#111827","#374151"),
  mkT("rec-thermal-blue","Thermal Blue","حراري أزرق","receipt","compact","en",["Thermal","Blue","POS"],["حراري","أزرق"],"thermal","#1E3A8A","#3B82F6"),
  mkT("rec-thermal-green","Thermal Green","حراري أخضر","receipt","compact","en",["Thermal","Green","Retail"],["حراري","تجزئة"],"thermal","#14532D","#22C55E"),
  mkT("rec-thermal-red","Thermal Red","حراري أحمر","receipt","compact","en",["Thermal","Red","Restaurant"],["حراري","مطعم"],"thermal","#7F1D1D","#EF4444"),
  mkT("rec-thermal-purple","Thermal Purple","حراري بنفسجي","receipt","compact","en",["Thermal","Purple","Style"],["حراري","بنفسجي"],"thermal","#4C1D95","#A855F7"),
  mkT("rec-thermal-orange","Thermal Orange","حراري برتقالي","receipt","compact","en",["Thermal","Orange","Energy"],["حراري","برتقالي"],"thermal","#9A3412","#F97316"),
  mkT("rec-thermal-teal","Thermal Teal","حراري فيروزي","receipt","compact","en",["Thermal","Teal","Fresh"],["حراري","فيروزي"],"thermal","#0D9488","#14B8A6"),
  mkT("rec-thermal-gold","Thermal Gold","حراري ذهبي","receipt","compact","en",["Thermal","Gold","Luxury"],["حراري","ذهبي"],"thermal","#78350F","#F59E0B"),
  mkT("rec-pos-restaurant","Restaurant POS","كاشير مطعم","receipt","compact","en",["Restaurant","POS","Food"],["مطعم","كاشير"],"thermal","#7F1D1D","#DC2626"),
  mkT("rec-pos-cafe","Café POS","كاشير كافيه","receipt","compact","en",["Café","POS","Brown"],["كافيه","كاشير"],"thermal","#92400E","#D97706"),
  mkT("rec-pos-pharmacy","Pharmacy POS","كاشير صيدلية","receipt","compact","en",["Pharmacy","POS","Blue"],["صيدلية","كاشير"],"thermal","#1E3A8A","#38BDF8"),
  mkT("rec-pos-retail","Retail POS","كاشير تجزئة","receipt","compact","en",["Retail","POS","Green"],["تجزئة","كاشير"],"thermal","#14532D","#22C55E"),
  mkT("rec-pos-hotel","Hotel POS","كاشير فندق","receipt","compact","en",["Hotel","POS","Luxury"],["فندق","كاشير"],"thermal","#1E3A5F","#60A5FA"),

  // Digital / Modern (20) — bold-corp 3 kept, rest to new layouts
  mkT("rec-digital","Digital Receipt","إيصال رقمي","receipt","modern","en",["Digital","QR","Modern"],["رقمي","QR"],"dark-header","#1D4ED8","#2563EB"),
  mkT("rec-gradient-success","Gradient Success","نجاح متدرج","receipt","modern","en",["Green","Success","Gradient"],["أخضر","نجاح"],"gradient","#065F46","#059669","#0D9488"),
  mkT("rec-modern-blue","Modern Blue Receipt","إيصال أزرق حديث","receipt","modern","en",["Blue","Modern","Digital"],["أزرق","رقمي"],"gradient","#1D4ED8","#2563EB","#0891B2"),
  mkT("rec-purple-digital","Purple Digital","بنفسجي رقمي","receipt","modern","en",["Purple","Digital","Modern"],["بنفسجي","رقمي"],"gradient","#6D28D9","#7C3AED","#EC4899"),
  mkT("rec-digital-teal","Digital Teal","فيروزي رقمي","receipt","modern","en",["Teal","Digital","Clean"],["فيروزي","رقمي"],"split-header","#0D9488","#14B8A6"),
  mkT("rec-digital-gold","Digital Gold","ذهبي رقمي","receipt","modern","en",["Gold","Premium","Digital"],["ذهبي","رقمي"],"minimal","#78350F","#F59E0B"),
  mkT("rec-digital-rose","Digital Rose","وردي رقمي","receipt","modern","en",["Rose","Pink","Digital"],["وردي","رقمي"],"two-col-header","#9F1239","#E11D48"),
  mkT("rec-digital-dark","Digital Dark","رقمي داكن","receipt","modern","en",["Dark","Digital","Bold"],["داكن","رقمي"],"bold-hero","#0F172A","#8B5CF6"),
  mkT("rec-fire-rec","Fire Receipt","إيصال ناري","receipt","modern","en",["Fire","Orange","Bold"],["ناري","برتقالي"],"stamp-box","#9A3412","#EA580C"),
  mkT("rec-neon-rec","Neon Receipt","إيصال نيون","receipt","modern","en",["Neon","Electric","Vibrant"],["نيون","كهربائي"],"price-list","#1D4ED8","#06B6D4"),
  mkT("rec-rose-rec","Rose Gold Receipt","إيصال وردي ذهبي","receipt","modern","en",["Rose","Gold","Luxury"],["وردي","ذهبي"],"bold-hero","#9F1239","#E11D48"),
  mkT("rec-emerald-rec","Emerald Receipt","إيصال زمردي","receipt","modern","en",["Emerald","Green","Fresh"],["زمردي","أخضر"],"two-col-header","#065F46","#059669"),
  mkT("rec-ocean-rec","Ocean Receipt","إيصال محيطي","receipt","modern","en",["Ocean","Cyan","Deep"],["محيط","سيان"],"split-header","#164E63","#06B6D4"),
  mkT("rec-sunset-rec","Sunset Receipt","إيصال غروب","receipt","modern","en",["Sunset","Orange","Warm"],["غروب","دافئ"],"stamp-box","#C2410C","#EA580C"),
  mkT("rec-digital-navy","Digital Navy","نيفي رقمي","receipt","modern","en",["Navy","Digital","Elite"],["نيفي","رقمي"],"two-col-header","#1E3A8A","#3B82F6"),
  mkT("rec-digital-green","Digital Green","أخضر رقمي","receipt","modern","en",["Green","Success","Digital"],["أخضر","رقمي"],"price-list","#14532D","#22C55E"),
  mkT("rec-boxed-rec","Boxed Receipt Modern","مربع حديث","receipt","modern","en",["Boxed","Modern","Clean"],["مربع","حديث"],"boxed","#6D28D9","#A855F7"),
  mkT("rec-sidebar-rec","Sidebar Receipt Modern","شريط حديث","receipt","modern","en",["Sidebar","Modern","Bold"],["شريط","حديث"],"sidebar","#0D9488","#14B8A6"),
  mkT("rec-compact-modern","Compact Modern Receipt","مضغوط حديث","receipt","modern","en",["Compact","Modern","Dense"],["مضغوط","حديث"],"compact","#0D9488","#14B8A6"),
  mkT("rec-digital-purple","Digital Purple","بنفسجي رقمي 2","receipt","modern","en",["Purple","Digital","Modern"],["بنفسجي","رقمي"],"price-list","#4C1D95","#A855F7"),

  // Arabic (20)
  mkT("rec-ar-teal","Arabic Teal Receipt","إيصال فيروزي عربي","receipt","arabic-first","ar",["Arabic","RTL","Teal"],["عربي","فيروزي"],"arabic","#0F766E","#14B8A6"),
  mkT("rec-ar-blue","Arabic Blue Receipt","إيصال أزرق عربي","receipt","arabic-first","ar",["Arabic","RTL","Blue"],["عربي","أزرق"],"arabic","#1E3A8A","#60A5FA"),
  mkT("rec-ar-gold","Arabic Gold Receipt","إيصال ذهبي عربي","receipt","arabic-first","ar",["Arabic","RTL","Gold"],["عربي","ذهبي"],"arabic","#78350F","#F59E0B"),
  mkT("rec-ar-min","Arabic Minimal Receipt","إيصال عربي مبسط","receipt","arabic-first","ar",["Arabic","RTL","Minimal"],["عربي","مبسط"],"arabic","#374151","#6B7280"),
  mkT("rec-bilingual","Bilingual Receipt","إيصال ثنائي","receipt","arabic-first","bilingual",["Bilingual","AR+EN","Blue"],["ثنائي","أزرق"],"bilingual-split","#1E3A5F","#60A5FA"),
  mkT("rec-ar-violet","Arabic Violet Receipt","إيصال بنفسجي عربي","receipt","arabic-first","ar",["Arabic","RTL","Violet"],["عربي","بنفسجي"],"arabic","#4C1D95","#8B5CF6"),
  mkT("rec-ar-crimson","Arabic Crimson Receipt","إيصال قرمزي عربي","receipt","arabic-first","ar",["Arabic","RTL","Red"],["عربي","أحمر"],"arabic","#7F1D1D","#F87171"),
  mkT("rec-ar-ocean","Arabic Ocean Receipt","إيصال محيطي عربي","receipt","arabic-first","ar",["Arabic","RTL","Cyan"],["عربي","سيان"],"arabic","#164E63","#06B6D4"),
  mkT("rec-ar-rose","Arabic Rose Receipt","إيصال وردي عربي","receipt","arabic-first","ar",["Arabic","RTL","Rose"],["عربي","وردي"],"arabic","#831843","#EC4899"),
  mkT("rec-ar-dark","Arabic Dark Receipt","إيصال داكن عربي","receipt","arabic-first","ar",["Arabic","RTL","Dark"],["عربي","داكن"],"arabic","#0F0F1A","#8B5CF6"),
  mkT("rec-ar-emerald","Arabic Emerald Receipt","إيصال زمردي عربي","receipt","arabic-first","ar",["Arabic","RTL","Emerald"],["عربي","زمردي"],"arabic","#064E3B","#10B981"),
  mkT("rec-ar-sky","Arabic Sky Receipt","إيصال سماوي عربي","receipt","arabic-first","ar",["Arabic","RTL","Sky"],["عربي","سماوي"],"arabic","#0C4A6E","#38BDF8"),
  mkT("rec-ar-slate","Arabic Slate Receipt","إيصال رمادي عربي","receipt","arabic-first","ar",["Arabic","RTL","Gray"],["عربي","رمادي"],"arabic","#1E293B","#94A3B8"),
  mkT("rec-ar-orange","Arabic Orange Receipt","إيصال برتقالي عربي","receipt","arabic-first","ar",["Arabic","RTL","Orange"],["عربي","برتقالي"],"arabic","#9A3412","#F97316"),
  mkT("rec-ar-green","Arabic Green Receipt","إيصال أخضر عربي","receipt","arabic-first","ar",["Arabic","RTL","Green"],["عربي","أخضر"],"arabic","#14532D","#22C55E"),
  mkT("rec-ar-indigo","Arabic Indigo Receipt","إيصال إنديجو عربي","receipt","arabic-first","ar",["Arabic","RTL","Indigo"],["عربي","إنديجو"],"arabic","#312E81","#818CF8"),
  mkT("rec-bilingual2","Bilingual Teal Receipt","إيصال ثنائي فيروزي","receipt","arabic-first","bilingual",["Bilingual","AR+EN","Teal"],["ثنائي","فيروزي"],"bilingual-split","#0D9488","#F59E0B"),
  mkT("rec-bilingual3","Bilingual Purple Receipt","إيصال ثنائي بنفسجي","receipt","arabic-first","bilingual",["Bilingual","AR+EN","Purple"],["ثنائي","بنفسجي"],"bilingual-split","#4C1D95","#C084FC"),
  mkT("rec-ar-warm","Arabic Warm Receipt","إيصال دافئ عربي","receipt","arabic-first","ar",["Arabic","RTL","Warm"],["عربي","دافئ"],"arabic","#7C2D12","#FB923C"),
  mkT("rec-bilingual4","Bilingual Green Receipt","إيصال ثنائي أخضر","receipt","arabic-first","bilingual",["Bilingual","AR+EN","Green"],["ثنائي","أخضر"],"bilingual-split","#064E3B","#34D399"),

  // Elegant (15) — 3 kept as elegant, rest to new layouts
  mkT("rec-gold-foil","Gold Foil","ورقة ذهب","receipt","elegant","en",["Gold","Luxury","Foil"],["ذهب","فاخر"],"elegant","#78350F","#B45309"),
  mkT("rec-premium-black","Premium Black","أسود فاخر","receipt","elegant","en",["Black","Premium","Luxury"],["أسود","فاخر"],"bold-hero","#0F0F1A","#D1D5DB"),
  mkT("rec-ivory-elegant","Ivory Elegant","عاجي أنيق","receipt","elegant","en",["Ivory","Warm","Refined"],["عاجي","راقٍ"],"elegant","#7C2D12","#D97706"),
  mkT("rec-champagne","Champagne Receipt","إيصال شمبانيا","receipt","elegant","en",["Champagne","Gold","Refined"],["شمبانيا","ذهبي"],"elegant","#92400E","#F59E0B"),
  mkT("rec-pearl","Pearl Luxury","فاخر لؤلؤي","receipt","elegant","en",["Pearl","Silver","Luxury"],["لؤلؤي","فضي"],"split-header","#374151","#9CA3AF"),
  mkT("rec-velvet","Velvet Dark","مخمل داكن","receipt","elegant","en",["Velvet","Dark","Rich"],["مخمل","غامق"],"stamp-box","#581C87","#7C3AED"),
  mkT("rec-midnight-lux","Midnight Luxury","فاخر منتصف الليل","receipt","elegant","en",["Midnight","Dark","Purple"],["منتصف الليل","بنفسجي"],"split-header","#0F0F1A","#8B5CF6"),
  mkT("rec-marble","Marble White","رخام أبيض","receipt","elegant","en",["Marble","Classic","White"],["رخام","أبيض"],"stamp-box","#1E293B","#94A3B8"),
  mkT("rec-gold-boxed","Gold Boxed Receipt","مربع ذهبي","receipt","elegant","en",["Gold","Boxed","Luxury"],["ذهبي","مربع"],"boxed","#78350F","#F59E0B"),
  mkT("rec-sidebar-gold","Sidebar Gold Receipt","شريط ذهبي","receipt","elegant","en",["Sidebar","Gold","Premium"],["شريط","ذهبي"],"sidebar","#78350F","#D97706"),
  mkT("rec-boxed-dark","Dark Boxed Receipt","مربع داكن","receipt","elegant","en",["Boxed","Dark","Elite"],["مربع","نخبوي"],"boxed","#0F0F1A","#8B5CF6"),
  mkT("rec-sidebar-dark-lux","Sidebar Dark Luxury","شريط فاخر","receipt","elegant","en",["Sidebar","Dark","Luxury"],["شريط","فاخر"],"sidebar","#0F172A","#F59E0B"),
  mkT("rec-rose-gold-lux","Rose Gold Luxury","وردي ذهبي فاخر","receipt","elegant","en",["Rose","Gold","Luxury"],["وردي","ذهبي"],"bold-hero","#9F1239","#E11D48"),
  mkT("rec-copper-lux","Copper Luxury","نحاسي فاخر","receipt","elegant","en",["Copper","Warm","Metallic"],["نحاسي","معدني"],"minimal","#9A3412","#FB923C"),
  mkT("rec-navy-lux","Navy Luxury","نيفي فاخر","receipt","elegant","en",["Navy","Premium","Elite"],["نيفي","نخبوي"],"stamp-box","#1E3A8A","#F59E0B"),

  // Industry (15) — excess to new layouts
  mkT("rec-retail","Retail Receipt","إيصال تجزئة","receipt","corporate","en",["Retail","Green","POS"],["تجزئة","أخضر"],"dark-header","#14532D","#22C55E"),
  mkT("rec-medical","Medical Receipt","إيصال طبي","receipt","corporate","en",["Medical","Blue","Healthcare"],["طبي","أزرق"],"dark-header","#1E3A8A","#38BDF8"),
  mkT("rec-restaurant","Restaurant Receipt","إيصال مطعم","receipt","corporate","en",["Restaurant","Red","Food"],["مطعم","أحمر"],"price-list","#7F1D1D","#DC2626"),
  mkT("rec-hotel","Hotel Receipt","إيصال فندقي","receipt","elegant","en",["Hotel","Navy","Luxury"],["فندقي","نيفي"],"bold-hero","#1E3A8A","#F59E0B"),
  mkT("rec-transport","Transport Receipt","إيصال نقل","receipt","corporate","en",["Transport","Orange","Logistics"],["نقل","لوجستيات"],"dark-header","#7C2D12","#EA580C"),
  mkT("rec-pharmacy","Pharmacy Receipt","إيصال صيدلية","receipt","corporate","en",["Pharmacy","Blue","Medical"],["صيدلية","طبي"],"dark-header","#0C4A6E","#38BDF8"),
  mkT("rec-salon","Beauty Salon","صالون تجميل","receipt","modern","en",["Beauty","Salon","Pink"],["تجميل","وردي"],"split-header","#831843","#EC4899"),
  mkT("rec-gym-r","Gym & Fitness","نادي رياضي","receipt","modern","en",["Gym","Sports","Energy"],["رياضة","طاقة"],"stamp-box","#9A3412","#DC2626"),
  mkT("rec-grocery","Grocery Store","محل بقالة","receipt","compact","en",["Grocery","Green","POS"],["بقالة","أخضر"],"compact","#14532D","#22C55E"),
  mkT("rec-parking","Parking Receipt","إيصال موقف","receipt","compact","en",["Parking","Gray","Formal"],["موقف","رسمي"],"compact","#374151","#6B7280"),
  mkT("rec-car-wash","Car Wash","غسيل سيارات","receipt","corporate","en",["Auto","Blue","Service"],["سيارات","خدمة"],"dark-header","#1D4ED8","#60A5FA"),
  mkT("rec-construction-r","Construction Receipt","إيصال بناء","receipt","corporate","en",["Construction","Orange","Heavy"],["بناء","برتقالي"],"two-col-header","#9A3412","#EA580C"),
  mkT("rec-school","School Fee Receipt","إيصال رسوم مدرسية","receipt","corporate","en",["School","Education","Blue"],["مدرسة","تعليم"],"dark-header","#1E3A8A","#93C5FD"),
  mkT("rec-clinic","Clinic Receipt","إيصال عيادة","receipt","corporate","en",["Clinic","Medical","Teal"],["عيادة","طبي"],"split-header","#0D9488","#14B8A6"),
  mkT("rec-insurance-r","Insurance Receipt","إيصال تأمين","receipt","corporate","en",["Insurance","Trust","Navy"],["تأمين","ثقة"],"price-list","#14532D","#34D399"),
];

/* ─── Filters ────────────────────────────────────────────────────────────── */

const STYLE_FILTERS: { key: StyleCat | "all"; enLabel: string; arLabel: string }[] = [
  { key: "all",          enLabel: "All Styles",    arLabel: "كل الأنماط" },
  { key: "minimal",      enLabel: "Minimal",       arLabel: "بسيط" },
  { key: "corporate",    enLabel: "Corporate",     arLabel: "شركات" },
  { key: "arabic-first", enLabel: "Arabic-First",  arLabel: "عربي أولاً" },
  { key: "modern",       enLabel: "Modern",        arLabel: "حديث" },
  { key: "elegant",      enLabel: "Elegant",       arLabel: "أنيق" },
  { key: "compact",      enLabel: "Compact",       arLabel: "مضغوط" },
  { key: "government",   enLabel: "Government",    arLabel: "رسمي" },
];

const TYPE_FILTERS: { key: DocType | "all"; enLabel: string; arLabel: string }[] = [
  { key: "all",        enLabel: "All Types",   arLabel: "الكل" },
  { key: "invoice",    enLabel: "Invoices",    arLabel: "فواتير" },
  { key: "quotation",  enLabel: "Quotations",  arLabel: "عروض أسعار" },
  { key: "receipt",    enLabel: "Receipts",    arLabel: "إيصالات" },
];

const LANG_FILTERS: { key: LangType | "all"; enLabel: string; arLabel: string }[] = [
  { key: "all",        enLabel: "All Languages", arLabel: "كل اللغات" },
  { key: "en",         enLabel: "English",       arLabel: "إنجليزي" },
  { key: "ar",         enLabel: "Arabic",        arLabel: "عربي" },
  { key: "bilingual",  enLabel: "Bilingual",     arLabel: "ثنائي" },
];

/* ─── Featured / Staff Picks ─────────────────────────────────────────────── */

const FEATURED_IDS = new Set([
  // Invoices — diverse picks covering all major use-cases and audiences
  "inv-modern-blue", "inv-consulting", "inv-ar-teal", "inv-bilingual1",
  "inv-freelance", "inv-gold-exec", "inv-construction", "inv-classic-white",
  // Quotations
  "quo-exec", "quo-consulting-prop", "quo-ar-teal", "quo-bilingual1",
  "quo-proposal", "quo-agency", "quo-construction-est", "quo-standard",
  // Receipts
  "rec-professional", "rec-thermal-pos", "rec-ar-teal", "rec-digital",
  "rec-full-a4", "rec-modern-blue", "rec-gradient-success", "rec-pos-restaurant",
]);

/* ─── Industry / Use-Case Filters ────────────────────────────────────────── */

const INDUSTRY_FILTERS: { key: string; enLabel: string; arLabel: string; tags: string[] }[] = [
  { key: "all",          enLabel: "All Industries",       arLabel: "كل القطاعات",      tags: [] },
  { key: "freelance",    enLabel: "Freelancer",           arLabel: "مستقل",            tags: ["Freelance","Creative","Freelancer","Photography","Design"] },
  { key: "agency",       enLabel: "Agency & Marketing",  arLabel: "وكالة وتسويق",     tags: ["Agency","Marketing","Media","Advertising","Printing"] },
  { key: "tech",         enLabel: "Technology",           arLabel: "تقنية",            tags: ["IT","Software","Tech","Startup","Telecom","Digital"] },
  { key: "construction", enLabel: "Construction",         arLabel: "إنشاءات",          tags: ["Construction","Architecture","Heavy","Materials"] },
  { key: "medical",      enLabel: "Healthcare",           arLabel: "صحة",              tags: ["Medical","Healthcare","Pharmacy","Clinic","Health"] },
  { key: "food",         enLabel: "Food & Restaurant",    arLabel: "مطاعم وضيافة",     tags: ["Food","Restaurant","Catering","Café","Grocery","Catering"] },
  { key: "finance",      enLabel: "Finance & Banking",   arLabel: "مالي ومصرفي",      tags: ["Finance","Banking","Insurance","Accounting","Financial"] },
  { key: "legal",        enLabel: "Legal",                arLabel: "قانوني",           tags: ["Legal","Law","Formal"] },
  { key: "travel",       enLabel: "Travel & Hotel",      arLabel: "سفر وفندقة",        tags: ["Travel","Hotel","Hospitality","Tourism"] },
  { key: "education",    enLabel: "Education",            arLabel: "تعليم",            tags: ["Education","Academic","School","University"] },
  { key: "realestate",   enLabel: "Real Estate",          arLabel: "عقارات",           tags: ["Real Estate","Property"] },
  { key: "retail",       enLabel: "Retail & POS",         arLabel: "تجزئة وكاشير",    tags: ["Retail","POS","Commerce","Grocery","Store"] },
  { key: "events",       enLabel: "Events & Sports",      arLabel: "فعاليات ورياضة",  tags: ["Events","Sports","Gym","Fitness","Party"] },
  { key: "government",   enLabel: "Government & NGO",     arLabel: "حكومي وغير ربحي", tags: ["Government","NGO","Nonprofit","Official","Tender"] },
];

/* ─── Preview Modal ──────────────────────────────────────────────────────── */

interface ModalProps {
  template: TemplateEntry;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUse: () => void;
  lang: string;
}

function PreviewModal({ template, onClose, onPrev, onNext, onUse, lang }: ModalProps) {
  const isAr = lang === "ar";
  const typeLabel = { invoice: isAr ? "فاتورة" : "INVOICE", quotation: isAr ? "عرض أسعار" : "QUOTATION", receipt: isAr ? "إيصال" : "RECEIPT" }[template.type];
  const typeColors = { invoice: "bg-blue-100 text-blue-700", quotation: "bg-violet-100 text-violet-700", receipt: "bg-green-100 text-green-700" }[template.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", typeColors)}>{typeLabel}</span>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">
              {isAr ? template.nameAr : template.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 p-6 flex items-start justify-center">
          <div className="w-full max-w-xs">
            <div style={{ position: "relative", width: "100%", paddingBottom: "133.3%" }}>
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
                <div style={{ width: "297px", height: "100%", overflow: "hidden" }}>
                  <SmartThumb c={template.thumbConfig} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5 shrink-0">
          {(isAr ? template.tagsAr : template.tags).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">{tag}</span>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onPrev} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {isAr ? "السابق" : "Previous"}
          </button>
          <button onClick={onUse} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all">
            {isAr ? "استخدم هذا القالب ←" : "Use This Template →"}
          </button>
          <button onClick={onNext} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors">
            {isAr ? "التالي" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Template Card ──────────────────────────────────────────────────────── */

function TemplateCard({ tmpl, lang, onPreview, onUse, featured, isPremium, canUsePremium }: {
  tmpl: TemplateEntry; lang: string; onPreview: () => void; onUse: () => void; featured?: boolean;
  isPremium?: boolean; canUsePremium?: boolean;
}) {
  const isAr = lang === "ar";
  const [hovered, setHovered] = useState(false);
  const isLocked = isPremium && !canUsePremium;
  const typeBadge = {
    invoice:   { en: "INVOICE",    ar: "فاتورة",      cls: "bg-blue-500" },
    quotation: { en: "QUOTATION",  ar: "عرض أسعار",   cls: "bg-violet-500" },
    receipt:   { en: "RECEIPT",    ar: "إيصال",        cls: "bg-green-500" },
  }[tmpl.type];
  const langBadge = tmpl.lang === "ar" ? { cls: "bg-teal-500", label: "AR" } : tmpl.lang === "bilingual" ? { cls: "bg-amber-500", label: "AR+EN" } : null;

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-gray-800 rounded-xl border overflow-hidden cursor-pointer transition-all duration-200",
        isLocked ? "opacity-80" : "",
        hovered ? "border-blue-400 shadow-xl -translate-y-1" : "border-gray-200 dark:border-gray-700 hover:-translate-y-0.5 hover:shadow-md"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onUse}
    >
      <div className="relative">
        <SmartThumb c={tmpl.thumbConfig} />
        {isLocked ? (
          <div className={cn(
            "absolute inset-0 bg-gray-900/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 transition-all duration-200 rounded-t-xl",
            hovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <Lock className="w-6 h-6 text-white" />
            <span className="text-white font-semibold text-sm text-center px-4">{isAr ? "قالب Pro — ترقية للوصول" : "Pro Template — Upgrade to Use"}</span>
            <Link href="/pricing" onClick={e => e.stopPropagation()}>
              <span className="px-5 py-2 bg-amber-500 text-white font-semibold text-sm rounded-full shadow-lg hover:bg-amber-600 transition-colors">
                {isAr ? "ترقية ←" : "Upgrade to Pro →"}
              </span>
            </Link>
          </div>
        ) : (
          <div className={cn(
            "absolute inset-0 bg-gray-900/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 transition-all duration-200 rounded-t-xl",
            hovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <button className="px-5 py-2 bg-white text-gray-900 font-semibold text-sm rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              onClick={e => { e.stopPropagation(); onPreview(); }}>
              {isAr ? "معاينة" : "Preview"}
            </button>
            <button className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              onClick={e => { e.stopPropagation(); onUse(); }}>
              {isAr ? "استخدم هذا القالب ←" : "Use This Template →"}
            </button>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={cn("text-[9px] font-bold text-white px-2 py-0.5 rounded-full", typeBadge.cls)}>
            {isAr ? typeBadge.ar : typeBadge.en}
          </span>
        </div>
        {langBadge && (
          <div className="absolute top-2 right-2">
            <span className={cn("text-[9px] font-bold text-white px-2 py-0.5 rounded-full", langBadge.cls)}>
              {langBadge.label}
            </span>
          </div>
        )}
        {featured && (
          <div className="absolute bottom-2 right-2">
            <span className="text-[9px] font-bold text-amber-900 bg-amber-300 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              {isAr ? "مميز" : "Pick"}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
          {isAr ? tmpl.nameAr : tmpl.name}
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {isLocked && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center gap-0.5 font-semibold">
              <Lock className="w-2.5 h-2.5" /> PRO
            </span>
          )}
          {(isAr ? tmpl.tagsAr : tmpl.tags).slice(0, isLocked ? 1 : 2).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function TemplatePicker() {
  const params = useParams<{ type: DocType }>();
  const urlType = (params.type as DocType) || "invoice";
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [, navigate] = useLocation();
  const { setInvoiceTemplate, setQuotationTemplate, setReceiptTemplate } = useTemplate();

  const [typeFilter, setTypeFilter] = useState<DocType | "all">(urlType);
  const [styleFilter, setStyleFilter] = useState<StyleCat | "all">("all");
  const [langFilter, setLangFilter] = useState<LangType | "all">("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "az" | "za">("default");
  const [search, setSearch] = useState("");
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filtered = useMemo(() => {
    let list = ALL_TEMPLATES;
    if (typeFilter !== "all") list = list.filter(t => t.type === typeFilter);
    if (styleFilter !== "all") list = list.filter(t => t.style === styleFilter);
    if (langFilter !== "all") list = list.filter(t => t.lang === langFilter);
    if (industryFilter !== "all") {
      const iDef = INDUSTRY_FILTERS.find(f => f.key === industryFilter);
      if (iDef && iDef.tags.length) {
        const lowerTags = iDef.tags.map(t => t.toLowerCase());
        list = list.filter(t =>
          t.tags.some(tag => lowerTags.some(it => tag.toLowerCase().includes(it)))
        );
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.nameAr.includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)) ||
        t.tagsAr.some(tag => tag.includes(q))
      );
    }
    if (sortBy === "default") {
      list = [...list].sort((a, b) => {
        const af = FEATURED_IDS.has(a.id) ? 0 : 1;
        const bf = FEATURED_IDS.has(b.id) ? 0 : 1;
        return af - bf;
      });
    } else if (sortBy === "az") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "za") {
      list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    }
    return list;
  }, [typeFilter, styleFilter, langFilter, industryFilter, search, sortBy]);

  const featuredInFiltered = useMemo(() => filtered.filter(t => FEATURED_IDS.has(t.id)), [filtered]);
  const regularInFiltered  = useMemo(() => filtered.filter(t => !FEATURED_IDS.has(t.id)), [filtered]);
  const isUnfiltered = styleFilter === "all" && langFilter === "all" && industryFilter === "all" && !search.trim();
  const showFeaturedSection = isUnfiltered && featuredInFiltered.length > 0 && sortBy === "default";

  const { can } = usePlan();

  const isPremiumTemplate = (tmpl: TemplateEntry) => PREMIUM_STYLES.has(tmpl.style);

  const selectTemplate = (id: string, type: DocType, style: StyleCat) => {
    if (PREMIUM_STYLES.has(style) && !can("premium_templates")) {
      navigate("/pricing");
      return;
    }
    if (type === "invoice") setInvoiceTemplate(id);
    else if (type === "quotation") setQuotationTemplate(id);
    else setReceiptTemplate(id);
    navigate(`/${type}`);
  };

  const accentGradients: Record<DocType | "all", string> = {
    all:        "from-gray-500 to-gray-600",
    invoice:    "from-blue-500 to-blue-600",
    quotation:  "from-violet-500 to-violet-600",
    receipt:    "from-green-500 to-green-600",
  };
  const headerGrad = typeFilter === "all" ? accentGradients.invoice : accentGradients[typeFilter];

  const counts = useMemo(() => ({
    invoice:   ALL_TEMPLATES.filter(t => t.type === "invoice").length,
    quotation: ALL_TEMPLATES.filter(t => t.type === "quotation").length,
    receipt:   ALL_TEMPLATES.filter(t => t.type === "receipt").length,
  }), []);

  const seoPath = `/templates/${urlType}` as keyof typeof PAGE_SEO;

  return (
    <AppLayout>
      <SEOHead {...(PAGE_SEO[seoPath] ?? PAGE_SEO["/templates/invoice"])} path={seoPath} />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">

        <div className={`bg-gradient-to-r ${headerGrad} text-white py-10`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href={`/${urlType}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-5 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {isAr ? "تخطي — استخدام القالب الافتراضي" : "Skip — use default template"}
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold">
              {isAr ? "مكتبة القوالب" : "Template Library"}
            </h1>
            <p className="mt-1.5 text-white/80 text-base">
              {isAr
                ? `${ALL_TEMPLATES.length}+ قالب احترافي — جميعها تدعم العربية والإنجليزية وتصدير PDF`
                : `${ALL_TEMPLATES.length}+ professional templates — Arabic, English & PDF export`}
            </p>

            <div className="flex gap-2 mt-5 flex-wrap">
              {(["all", "invoice", "quotation", "receipt"] as const).map(dt => (
                <button
                  key={dt}
                  onClick={() => { setTypeFilter(dt); if (dt !== "all") navigate(`/templates/${dt}`); }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                    typeFilter === dt ? "bg-white text-gray-800 shadow-md" : "bg-white/20 text-white hover:bg-white/30"
                  )}
                >
                  {dt === "all" ? (isAr ? "الكل" : `All (${ALL_TEMPLATES.length})`)
                    : dt === "invoice"   ? (isAr ? `فواتير (${counts.invoice})`    : `Invoices (${counts.invoice})`)
                    : dt === "quotation" ? (isAr ? `عروض (${counts.quotation})`    : `Quotations (${counts.quotation})`)
                    :                     (isAr ? `إيصالات (${counts.receipt})`    : `Receipts (${counts.receipt})`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sticky Filter Bar ────────────────────────────────────────── */}
        <div className="sticky top-16 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">

            {/* Row 1: Search + Sort + template count */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={isAr ? "بحث في القوالب..." : "Search templates..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400"
                  dir={isAr ? "rtl" : "ltr"}
                />
              </div>
              <div className="relative">
                <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="pl-9 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer appearance-none"
                >
                  <option value="default">{isAr ? "الموصى به" : "Recommended"}</option>
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
                </select>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-auto">
                {filtered.length} {isAr ? "قالب" : "templates"}
              </span>
            </div>

            {/* Row 2: Industry / Use-case chips (horizontal scroll on small screens) */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {INDUSTRY_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setIndustryFilter(f.key)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-all flex-shrink-0",
                    industryFilter === f.key
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600"
                  )}
                >
                  {isAr ? f.arLabel : f.enLabel}
                </button>
              ))}
            </div>

            {/* Row 3: Advanced Filters toggle + pills */}
            <div>
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-2"
              >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
                {isAr ? "فلاتر متقدمة" : "Advanced Filters"}
                {(styleFilter !== "all" || langFilter !== "all") && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                )}
              </button>
              {showAdvanced && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider self-center mr-1">
                      {isAr ? "النمط" : "Style"}
                    </span>
                    {STYLE_FILTERS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setStyleFilter(f.key as StyleCat | "all")}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                          styleFilter === f.key
                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                            : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                        )}
                      >
                        {isAr ? f.arLabel : f.enLabel}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider self-center mr-1">
                      {isAr ? "اللغة" : "Language"}
                    </span>
                    {LANG_FILTERS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setLangFilter(f.key as LangType | "all")}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                          langFilter === f.key
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                        )}
                      >
                        {isAr ? f.arLabel : f.enLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Template Grid ────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium">{isAr ? "لا توجد قوالب مطابقة" : "No templates match your filters"}</p>
              <button
                onClick={() => { setSearch(""); setStyleFilter("all"); setLangFilter("all"); setIndustryFilter("all"); }}
                className="mt-3 text-blue-500 text-sm hover:underline"
              >
                {isAr ? "مسح الفلاتر" : "Clear filters"}
              </button>
            </div>
          ) : (
            <>
              {/* Staff Picks section — shown only when browsing without filters */}
              {showFeaturedSection && (
                <div className="mb-10">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">
                      {isAr ? "اختيارات المحررين" : "Staff Picks"}
                    </span>
                    <span className="text-xs text-gray-400">
                      — {isAr ? "أكثر القوالب استخداماً" : "most popular starting points"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {featuredInFiltered.map(tmpl => (
                      <TemplateCard
                        key={tmpl.id}
                        tmpl={tmpl}
                        lang={lang}
                        featured
                        isPremium={isPremiumTemplate(tmpl)}
                        canUsePremium={can("premium_templates")}
                        onPreview={() => setPreviewIdx(filtered.indexOf(tmpl))}
                        onUse={() => selectTemplate(tmpl.id, tmpl.type, tmpl.style)}
                      />
                    ))}
                  </div>

                  {/* Divider before remaining templates */}
                  {regularInFiltered.length > 0 && (
                    <div className="mt-8 mb-2 flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {isAr
                          ? `${regularInFiltered.length} قالب إضافي`
                          : `All ${regularInFiltered.length} templates`}
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                    </div>
                  )}
                </div>
              )}

              {/* Main / remaining grid */}
              {(showFeaturedSection ? regularInFiltered : filtered).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {(showFeaturedSection ? regularInFiltered : filtered).map(tmpl => (
                    <TemplateCard
                      key={tmpl.id}
                      tmpl={tmpl}
                      lang={lang}
                      isPremium={isPremiumTemplate(tmpl)}
                      canUsePremium={can("premium_templates")}
                      onPreview={() => setPreviewIdx(filtered.indexOf(tmpl))}
                      onUse={() => selectTemplate(tmpl.id, tmpl.type, tmpl.style)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewIdx !== null && (
        <PreviewModal
          template={filtered[previewIdx]}
          lang={lang}
          onClose={() => setPreviewIdx(null)}
          onPrev={() => setPreviewIdx(i => i !== null ? Math.max(0, i - 1) : 0)}
          onNext={() => setPreviewIdx(i => i !== null ? Math.min(filtered.length - 1, i + 1) : 0)}
          onUse={() => {
            selectTemplate(filtered[previewIdx].id, filtered[previewIdx].type, filtered[previewIdx].style);
            setPreviewIdx(null);
          }}
        />
      )}
    </AppLayout>
  );
}
