import { useLanguage } from "@/context/LanguageContext";
import { ar as arTranslations } from "@/i18n/ar";
import type { DocumentTotals, LineItem, BusinessInfo, ClientInfo } from "@/types/document";
import { calcLineItemTotal, formatNumber } from "@/lib/calculations";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { convertNumerals } from "@/utils/numerals";
import type { NumeralStyle } from "@/utils/numerals";
import type { BankDetails } from "@/hooks/useDocumentForm";

/* ─── Shared types / helpers ──────────────────────────────────────────────── */

interface InvoicePreviewProps {
  type: "invoice" | "quotation";
  customTitle?: string;
  template?: string;
  businessInfo: BusinessInfo;
  clientInfo: ClientInfo;
  docNumber: string;
  issueDate: string;
  dueOrValidityDate: string;
  dueOrValidityLabel: string;
  currency: string;
  lineItems: LineItem[];
  totals: DocumentTotals;
  notes: string;
  paymentDetails?: string;
  signatureFooter?: string;
  terms?: string;
  zatcaQR?: string;
  numeralStyle?: NumeralStyle;
  paymentLink?: string;
  bankDetails?: BankDetails;
}

type InvoiceData = Omit<InvoicePreviewProps, "template">;

type BaseLayout = "classic" | "modern-blue" | "minimal" | "bold-corporate" | "arabic" | "compact" | "formal-tender" | "proposal" | "sidebar" | "top-band" | "centered" | "elegant" | "consulting" | "construction" | "two-col-header" | "bold-hero" | "bilingual-split" | "price-list" | "stamp-box" | "split-header" | "dark-header" | "gradient" | "boxed";

interface TemplateRenderInfo {
  layout: BaseLayout;
  accentColor: string;
  headerBg?: string;
  altColor?: string;
  isRTL?: boolean;
}

const TEMPLATE_RENDER_MAP: Record<string, TemplateRenderInfo> = {
  // ── Layout shorthand keys (legacy) ──────────────────────────────────────
  "classic":           { layout: "classic",        accentColor: "#2563EB" },
  "modern-blue":       { layout: "modern-blue",    accentColor: "#1E3A5F" },
  "minimal":           { layout: "minimal",         accentColor: "#374151" },
  "bold-corporate":    { layout: "bold-corporate",  accentColor: "#F59E0B" },
  "arabic-first":      { layout: "arabic",          accentColor: "#0D9488", isRTL: true },
  "arabic-modern":     { layout: "arabic",          accentColor: "#1E3A5F", isRTL: true },
  "standard":          { layout: "classic",         accentColor: "#7C3AED" },
  "proposal":          { layout: "proposal",        accentColor: "#7C3AED" },
  "compact":           { layout: "compact",         accentColor: "#374151" },
  "formal-tender":     { layout: "formal-tender",   accentColor: "#1E3A5F" },
  "arabic-quote":      { layout: "arabic",          accentColor: "#6D28D9", isRTL: true },
  "arabic-proposal":   { layout: "arabic",          accentColor: "#B45309", isRTL: true },
  "full-a4":           { layout: "classic",         accentColor: "#059669" },
  "thermal-pos":       { layout: "compact",         accentColor: "#374151" },
  "digital":           { layout: "classic",         accentColor: "#2563EB" },
  "arabic-receipt":    { layout: "arabic",          accentColor: "#0F766E", isRTL: true },

  // ── INVOICES – Minimal / Clean ───────────────────────────────────────────
  "inv-classic-white": { layout: "classic",         accentColor: "#374151" },
  "inv-pure-min":      { layout: "centered",        accentColor: "#64748B" },
  "inv-slate":         { layout: "centered",        accentColor: "#94A3B8" },
  "inv-ink":           { layout: "minimal",         accentColor: "#111827" },
  "inv-nordic":        { layout: "minimal",         accentColor: "#3B82F6" },
  "inv-cream":         { layout: "top-band",        accentColor: "#D97706" },
  "inv-forest-min":    { layout: "top-band",        accentColor: "#16A34A" },
  "inv-rose-min":      { layout: "minimal",         accentColor: "#E11D48" },
  "inv-gold-min":      { layout: "minimal",         accentColor: "#B45309" },
  "inv-mint-min":      { layout: "top-band",        accentColor: "#34D399" },
  "inv-plum-min":      { layout: "minimal",         accentColor: "#A855F7" },
  "inv-teal-min":      { layout: "minimal",         accentColor: "#14B8A6" },
  "inv-warm-min":      { layout: "minimal",         accentColor: "#F97316" },
  "inv-concrete":      { layout: "centered",        accentColor: "#9CA3AF" },
  "inv-navy-min":      { layout: "minimal",         accentColor: "#60A5FA" },
  "inv-copper":        { layout: "centered",        accentColor: "#FB923C" },
  "inv-violet-min":    { layout: "minimal",         accentColor: "#A78BFA" },
  "inv-dark-emerald":  { layout: "minimal",         accentColor: "#6EE7B7" },
  // ── INVOICES – Corporate / Dark-Header ───────────────────────────────────
  "inv-modern-blue":   { layout: "dark-header",     accentColor: "#2563EB",  headerBg: "#0F172A" },
  "inv-navy-exec":     { layout: "dark-header",     accentColor: "#3B82F6",  headerBg: "#1E3A8A" },
  "inv-charcoal":      { layout: "dark-header",     accentColor: "#6B7280",  headerBg: "#374151" },
  // ── INVOICES – Two-Col-Header ─────────────────────────────────────────────
  "inv-bold-corp":     { layout: "two-col-header",  accentColor: "#F59E0B" },
  "inv-deepgreen":     { layout: "two-col-header",  accentColor: "#22C55E" },
  "inv-dark-teal":     { layout: "two-col-header",  accentColor: "#14B8A6" },
  "inv-security":      { layout: "two-col-header",  accentColor: "#4B5563" },
  // ── INVOICES – Bold-Hero ──────────────────────────────────────────────────
  "inv-burgundy":      { layout: "bold-hero",       accentColor: "#F43F5E" },
  "inv-teal-corp":     { layout: "bold-hero",       accentColor: "#14B8A6" },
  "inv-banking":       { layout: "bold-hero",       accentColor: "#60A5FA" },
  "inv-media":         { layout: "bold-hero",       accentColor: "#EC4899" },
  // ── INVOICES – Split-Header ───────────────────────────────────────────────
  "inv-indigo":        { layout: "split-header",    accentColor: "#6366F1" },
  "inv-ocean":         { layout: "split-header",    accentColor: "#06B6D4" },
  "inv-steel":         { layout: "split-header",    accentColor: "#64748B" },
  // ── INVOICES – Price-List ─────────────────────────────────────────────────
  "inv-plum-corp":     { layout: "price-list",      accentColor: "#A855F7" },
  "inv-crimson-corp":  { layout: "price-list",      accentColor: "#EF4444" },
  "inv-pharma":        { layout: "price-list",      accentColor: "#38BDF8" },
  "inv-telecom":       { layout: "price-list",      accentColor: "#3B82F6" },
  // ── INVOICES – Stamp-Box ──────────────────────────────────────────────────
  "inv-amber-corp":    { layout: "stamp-box",       accentColor: "#F59E0B" },
  "inv-navy-gold":     { layout: "stamp-box",       accentColor: "#D97706" },
  "inv-accounting":    { layout: "stamp-box",       accentColor: "#3B82F6" },
  "inv-education":     { layout: "stamp-box",       accentColor: "#93C5FD" },
  // ── INVOICES – Arabic-First ──────────────────────────────────────────────
  "inv-ar-teal":       { layout: "arabic",          accentColor: "#14B8A6", isRTL: true },
  "inv-ar-navy":       { layout: "arabic",          accentColor: "#3B82F6", isRTL: true },
  "inv-ar-emerald":    { layout: "arabic",          accentColor: "#10B981", isRTL: true },
  "inv-ar-crimson":    { layout: "arabic",          accentColor: "#F87171", isRTL: true },
  "inv-ar-gold":       { layout: "arabic",          accentColor: "#F59E0B", isRTL: true },
  "inv-ar-violet":     { layout: "arabic",          accentColor: "#8B5CF6", isRTL: true },
  "inv-ar-orange":     { layout: "arabic",          accentColor: "#F97316", isRTL: true },
  "inv-ar-dark":       { layout: "arabic",          accentColor: "#8B5CF6", isRTL: true },
  "inv-ar-ocean":      { layout: "arabic",          accentColor: "#06B6D4", isRTL: true },
  "inv-ar-rose":       { layout: "arabic",          accentColor: "#EC4899", isRTL: true },
  "inv-ar-slate":      { layout: "arabic",          accentColor: "#94A3B8", isRTL: true },
  "inv-ar-indigo":     { layout: "arabic",          accentColor: "#818CF8", isRTL: true },
  "inv-ar-green":      { layout: "arabic",          accentColor: "#22C55E", isRTL: true },
  "inv-ar-purple":     { layout: "arabic",          accentColor: "#A855F7", isRTL: true },
  "inv-ar-blue2":      { layout: "arabic",          accentColor: "#60A5FA", isRTL: true },
  "inv-ar-warm":       { layout: "arabic",          accentColor: "#F59E0B", isRTL: true },
  "inv-ar-silver":     { layout: "arabic",          accentColor: "#D1D5DB", isRTL: true },
  "inv-ar-sky":        { layout: "arabic",          accentColor: "#38BDF8", isRTL: true },
  "inv-arabic-emerald":{ layout: "arabic",          accentColor: "#065F46", isRTL: true },
  "inv-arabic-crimson":{ layout: "arabic",          accentColor: "#9F1239", isRTL: true },
  "inv-arabic-gold":   { layout: "arabic",          accentColor: "#B45309", isRTL: true },
  "inv-arabic-violet": { layout: "arabic",          accentColor: "#6D28D9", isRTL: true },
  // ── INVOICES – Bilingual Split ────────────────────────────────────────────
  "inv-bilingual1":    { layout: "bilingual-split", accentColor: "#60A5FA" },
  "inv-bilingual2":    { layout: "bilingual-split", accentColor: "#F59E0B" },
  "inv-bilingual3":    { layout: "bilingual-split", accentColor: "#34D399" },
  "inv-bilingual4":    { layout: "bilingual-split", accentColor: "#C084FC" },
  "inv-bilingual":     { layout: "bilingual-split", accentColor: "#1E3A5F" },
  // ── INVOICES – Gradient ───────────────────────────────────────────────────
  "inv-electric":      { layout: "gradient",        accentColor: "#2563EB",  headerBg: "#1D4ED8", altColor: "#06B6D4" },
  "inv-purple-wave":   { layout: "gradient",        accentColor: "#7C3AED",  headerBg: "#6D28D9", altColor: "#EC4899" },
  "inv-sunset":        { layout: "gradient",        accentColor: "#EA580C",  headerBg: "#C2410C", altColor: "#F59E0B" },
  // bold-corporate excess → new layouts
  "inv-emerald-bold":  { layout: "two-col-header",  accentColor: "#059669" },
  "inv-blue-cyan2":    { layout: "two-col-header",  accentColor: "#06B6D4" },
  "inv-dark-teal2":    { layout: "two-col-header",  accentColor: "#14B8A6" },
  "inv-fashion":       { layout: "two-col-header",  accentColor: "#EC4899" },
  "inv-rose-gold":     { layout: "bold-hero",       accentColor: "#E11D48" },
  "inv-fire":          { layout: "bold-hero",       accentColor: "#EF4444" },
  "inv-food":          { layout: "bold-hero",       accentColor: "#DC2626" },
  "inv-photo":         { layout: "bold-hero",       accentColor: "#A78BFA" },
  "inv-purple-pink":   { layout: "split-header",    accentColor: "#EC4899" },
  "inv-purple-gold":   { layout: "split-header",    accentColor: "#F59E0B" },
  "inv-tech-startup":  { layout: "split-header",    accentColor: "#7C3AED" },
  "inv-green-teal":    { layout: "price-list",      accentColor: "#059669" },
  "inv-fire-orange":   { layout: "price-list",      accentColor: "#F59E0B" },
  "inv-events":        { layout: "price-list",      accentColor: "#EC4899" },
  "inv-gym":           { layout: "price-list",      accentColor: "#DC2626" },
  "inv-cyan-tech":     { layout: "stamp-box",       accentColor: "#0891B2" },
  "inv-freelance":     { layout: "stamp-box",       accentColor: "#F59E0B" },
  "inv-travel":        { layout: "stamp-box",       accentColor: "#0EA5E9" },
  "inv-auto":          { layout: "stamp-box",       accentColor: "#64748B" },
  "inv-marketing":     { layout: "split-header",    accentColor: "#EC4899" },
  "inv-spa":           { layout: "stamp-box",       accentColor: "#EC4899" },
  "inv-boxed-blue":    { layout: "boxed",            accentColor: "#3B82F6",  headerBg: "#1E3A8A" },
  "inv-boxed-dark":    { layout: "split-header",    accentColor: "#374151" },
  "inv-sidebar-navy":  { layout: "sidebar",         accentColor: "#3B82F6" },
  "inv-sidebar-dark":  { layout: "sidebar",         accentColor: "#F59E0B" },
  // ── INVOICES – Elegant (3 kept) ──────────────────────────────────────────
  "inv-gold-exec":     { layout: "elegant",         accentColor: "#B45309" },
  "inv-navy-prem":     { layout: "elegant",         accentColor: "#1E3A8A" },
  "inv-champagne":     { layout: "elegant",         accentColor: "#D97706" },
  "inv-midnight":      { layout: "split-header",    accentColor: "#8B5CF6" },
  "inv-ivory":         { layout: "split-header",    accentColor: "#D97706" },
  "inv-pearl":         { layout: "bold-hero",       accentColor: "#9CA3AF" },
  "inv-velvet":        { layout: "stamp-box",       accentColor: "#7C3AED" },
  "inv-marble":        { layout: "stamp-box",       accentColor: "#94A3B8" },
  "inv-gold-boxed":    { layout: "boxed",            accentColor: "#F59E0B",  headerBg: "#78350F" },
  "inv-sidebar-gold":  { layout: "sidebar",         accentColor: "#D97706" },
  "inv-boxed-violet":  { layout: "stamp-box",       accentColor: "#A855F7" },
  "inv-sidebar-teal":  { layout: "sidebar",         accentColor: "#14B8A6" },
  // ── INVOICES – Industry ───────────────────────────────────────────────────
  "inv-it":            { layout: "split-header",    accentColor: "#0EA5E9" },
  "inv-medical":       { layout: "dark-header",     accentColor: "#38BDF8",  headerBg: "#1E3A8A" },
  "inv-construction":  { layout: "construction",    accentColor: "#EA580C" },
  "inv-consulting":    { layout: "consulting",      accentColor: "#6366F1" },
  "inv-retail":        { layout: "dark-header",     accentColor: "#22C55E",  headerBg: "#14532D" },
  "inv-realestate":    { layout: "price-list",      accentColor: "#10B981" },
  "inv-law":           { layout: "formal-tender",   accentColor: "#B45309" },
  "inv-architecture":  { layout: "bold-hero",       accentColor: "#0EA5E9" },
  "inv-forest":        { layout: "classic",         accentColor: "#166534" },
  "inv-stone":         { layout: "classic",         accentColor: "#78716C" },
  "inv-navy":          { layout: "split-header",    accentColor: "#1E3A8A" },
  "inv-purple":        { layout: "split-header",    accentColor: "#7C3AED" },
  "inv-rose":          { layout: "price-list",      accentColor: "#E11D48" },
  "inv-cyan":          { layout: "stamp-box",       accentColor: "#0891B2" },

  // ── QUOTATIONS – Minimal / Clean ─────────────────────────────────────────
  "quo-standard":      { layout: "dark-header",     accentColor: "#374151",  headerBg: "#111827" },
  "quo-classic-blue":  { layout: "dark-header",     accentColor: "#2563EB",  headerBg: "#1E3A8A" },
  "quo-pro-gray":      { layout: "dark-header",     accentColor: "#6B7280",  headerBg: "#374151" },
  "quo-clean-min":     { layout: "top-band",        accentColor: "#9CA3AF" },
  "quo-slate-min":     { layout: "centered",        accentColor: "#94A3B8" },
  "quo-ivory-min":     { layout: "top-band",        accentColor: "#D97706" },
  "quo-forest-min":    { layout: "top-band",        accentColor: "#22C55E" },
  "quo-mint-min":      { layout: "top-band",        accentColor: "#34D399" },
  "quo-gold-min":      { layout: "minimal",         accentColor: "#B45309" },
  "quo-navy-min":      { layout: "centered",        accentColor: "#60A5FA" },
  "quo-dark-min":      { layout: "minimal",         accentColor: "#374151" },
  "quo-teal-min":      { layout: "minimal",         accentColor: "#14B8A6" },
  "quo-rose-min":      { layout: "minimal",         accentColor: "#E11D48" },
  "quo-copper-min":    { layout: "centered",        accentColor: "#FB923C" },
  "quo-compact-std":   { layout: "compact",         accentColor: "#374151" },
  // ── QUOTATIONS – Corporate / Dark-Header ─────────────────────────────────
  "quo-exec":          { layout: "dark-header",     accentColor: "#3B82F6",  headerBg: "#1E3A8A" },
  "quo-formal-dark":   { layout: "dark-header",     accentColor: "#D1D5DB",  headerBg: "#111827" },
  "quo-corp-green":    { layout: "dark-header",     accentColor: "#22C55E",  headerBg: "#14532D" },
  // excess → new layouts
  "quo-deep-plum":     { layout: "two-col-header",  accentColor: "#A855F7" },
  "quo-burgundy":      { layout: "bold-hero",       accentColor: "#F43F5E" },
  "quo-ocean-corp":    { layout: "two-col-header",  accentColor: "#06B6D4" },
  "quo-amber-corp":    { layout: "price-list",      accentColor: "#F59E0B" },
  "quo-indigo-corp":   { layout: "split-header",    accentColor: "#6366F1" },
  "quo-charcoal":      { layout: "two-col-header",  accentColor: "#6B7280" },
  "quo-navy-gold":     { layout: "stamp-box",       accentColor: "#F59E0B" },
  "quo-banking":       { layout: "bold-hero",       accentColor: "#60A5FA" },
  "quo-crimson":       { layout: "price-list",      accentColor: "#EF4444" },
  "quo-steel":         { layout: "split-header",    accentColor: "#64748B" },
  "quo-dark-teal-corp":{ layout: "price-list",      accentColor: "#14B8A6" },
  "quo-sidebar-navy":  { layout: "sidebar",         accentColor: "#3B82F6" },
  "quo-sidebar-dark":  { layout: "sidebar",         accentColor: "#F59E0B" },
  "quo-boxed-blue":    { layout: "boxed",            accentColor: "#3B82F6",  headerBg: "#1E3A8A" },
  "quo-boxed-dark":    { layout: "boxed",            accentColor: "#374151",  headerBg: "#111827" },
  "quo-telecom-q":     { layout: "stamp-box",       accentColor: "#3B82F6" },
  "quo-security-q":    { layout: "two-col-header",  accentColor: "#4B5563" },
  "quo-media-q":       { layout: "bold-hero",       accentColor: "#EC4899" },
  "quo-compact-corp":  { layout: "compact",         accentColor: "#3B82F6" },
  // ── QUOTATIONS – Arabic-First ────────────────────────────────────────────
  "quo-ar-violet":     { layout: "arabic",          accentColor: "#8B5CF6", isRTL: true },
  "quo-ar-amber":      { layout: "arabic",          accentColor: "#F59E0B", isRTL: true },
  "quo-ar-teal":       { layout: "arabic",          accentColor: "#14B8A6", isRTL: true },
  "quo-ar-navy":       { layout: "arabic",          accentColor: "#60A5FA", isRTL: true },
  "quo-ar-green":      { layout: "arabic",          accentColor: "#10B981", isRTL: true },
  "quo-ar-rose":       { layout: "arabic",          accentColor: "#EC4899", isRTL: true },
  "quo-ar-dark":       { layout: "arabic",          accentColor: "#8B5CF6", isRTL: true },
  "quo-ar-crimson":    { layout: "arabic",          accentColor: "#F87171", isRTL: true },
  "quo-ar-gold":       { layout: "arabic",          accentColor: "#F59E0B", isRTL: true },
  "quo-ar-sky":        { layout: "arabic",          accentColor: "#38BDF8", isRTL: true },
  "quo-ar-ocean":      { layout: "arabic",          accentColor: "#06B6D4", isRTL: true },
  "quo-ar-purple":     { layout: "arabic",          accentColor: "#A855F7", isRTL: true },
  "quo-ar-slate":      { layout: "arabic",          accentColor: "#94A3B8", isRTL: true },
  "quo-ar-indigo":     { layout: "arabic",          accentColor: "#818CF8", isRTL: true },
  "quo-ar-emerald":    { layout: "arabic",          accentColor: "#34D399", isRTL: true },
  "quo-ar-orange":     { layout: "arabic",          accentColor: "#F97316", isRTL: true },
  "quo-ar-mint":       { layout: "arabic",          accentColor: "#34D399", isRTL: true },
  "quo-ar-warm":       { layout: "arabic",          accentColor: "#FB923C", isRTL: true },
  "quo-arabic-teal":   { layout: "arabic",          accentColor: "#0D9488", isRTL: true },
  "quo-arabic-amber":  { layout: "arabic",          accentColor: "#B45309", isRTL: true },
  "quo-arabic-navy":   { layout: "arabic",          accentColor: "#1E3A5F", isRTL: true },
  "quo-arabic-green":  { layout: "arabic",          accentColor: "#065F46", isRTL: true },
  // ── QUOTATIONS – Bilingual Split ─────────────────────────────────────────
  "quo-bilingual1":    { layout: "bilingual-split", accentColor: "#60A5FA" },
  "quo-bilingual2":    { layout: "bilingual-split", accentColor: "#F59E0B" },
  "quo-bilingual3":    { layout: "bilingual-split", accentColor: "#C084FC" },
  "quo-bilingual4":    { layout: "bilingual-split", accentColor: "#22C55E" },
  "quo-bilingual":     { layout: "bilingual-split", accentColor: "#1E3A8A" },
  // ── QUOTATIONS – Gradient / Creative ─────────────────────────────────────
  "quo-proposal":      { layout: "gradient",        accentColor: "#7C3AED",  headerBg: "#6D28D9", altColor: "#8B5CF6" },
  "quo-agency":        { layout: "gradient",        accentColor: "#7C3AED",  headerBg: "#6D28D9", altColor: "#EC4899" },
  "quo-startup":       { layout: "gradient",        accentColor: "#2563EB",  headerBg: "#1D4ED8", altColor: "#06B6D4" },
  "quo-bold-impact":   { layout: "gradient",        accentColor: "#EA580C",  headerBg: "#C2410C", altColor: "#F97316" },
  // excess → new layouts
  "quo-electric":      { layout: "two-col-header",  accentColor: "#2563EB" },
  "quo-emerald-wave":  { layout: "price-list",      accentColor: "#059669" },
  "quo-sunset-q":      { layout: "bold-hero",       accentColor: "#EA580C" },
  "quo-fire-q":        { layout: "stamp-box",       accentColor: "#EF4444" },
  "quo-royalty":       { layout: "split-header",    accentColor: "#F59E0B" },
  "quo-marketing-q":   { layout: "price-list",      accentColor: "#EC4899" },
  "quo-tech-q":        { layout: "gradient",        accentColor: "#7C3AED",  headerBg: "#1D4ED8", altColor: "#06B6D4" },
  "quo-neon":          { layout: "two-col-header",  accentColor: "#EC4899" },
  "quo-photo-q":       { layout: "bold-hero",       accentColor: "#A78BFA" },
  "quo-travel-q":      { layout: "stamp-box",       accentColor: "#0EA5E9" },
  "quo-food-q":        { layout: "price-list",      accentColor: "#DC2626" },
  "quo-events-q":      { layout: "split-header",    accentColor: "#EC4899" },
  "quo-fashion-q":     { layout: "two-col-header",  accentColor: "#EC4899" },
  "quo-gym-q":         { layout: "stamp-box",       accentColor: "#DC2626" },
  "quo-spa-q":         { layout: "price-list",      accentColor: "#EC4899" },
  "quo-sidebar-grad":  { layout: "sidebar",         accentColor: "#A855F7" },
  "quo-boxed-grad":    { layout: "split-header",    accentColor: "#A855F7" },
  "quo-compact-modern":{ layout: "compact",         accentColor: "#14B8A6" },
  // ── QUOTATIONS – Government / Formal ─────────────────────────────────────
  "quo-formal-tender": { layout: "formal-tender",   accentColor: "#1E3A5F" },
  "quo-gov-rfq":       { layout: "formal-tender",   accentColor: "#1E3A5F" },
  "quo-consulting-prop":{ layout: "consulting",     accentColor: "#4338CA" },
  "quo-it-scope":      { layout: "gradient",        accentColor: "#0EA5E9",  headerBg: "#0C4A6E", altColor: "#0EA5E9" },
  "quo-agency-prop":   { layout: "gradient",        accentColor: "#C084FC",  headerBg: "#4C1D95", altColor: "#C084FC" },
  "quo-construction-est":{ layout: "construction",  accentColor: "#EA580C" },
  "quo-software-scope":{ layout: "split-header",    accentColor: "#0EA5E9" },
  "quo-medical-svc":   { layout: "dark-header",     accentColor: "#38BDF8",  headerBg: "#1E3A8A" },
  "quo-design-agency": { layout: "bold-hero",       accentColor: "#A78BFA" },
  "quo-logistics":     { layout: "dark-header",     accentColor: "#EA580C",  headerBg: "#7C2D12" },
  "quo-ngo":           { layout: "dark-header",     accentColor: "#16A34A",  headerBg: "#14532D" },
  "quo-gradient-blue": { layout: "two-col-header",  accentColor: "#2563EB" },
  "quo-events-catering":{ layout: "price-list",     accentColor: "#EC4899" },
  "quo-realestate-q":  { layout: "price-list",      accentColor: "#10B981" },
  "quo-compact-gov":   { layout: "compact",         accentColor: "#374151" },
  "quo-professional":  { layout: "classic",         accentColor: "#4B5563" },
  "quo-clean":         { layout: "minimal",         accentColor: "#6B7280" },
  "quo-business-card": { layout: "compact",         accentColor: "#374151" },
  "quo-executive":     { layout: "bold-hero",       accentColor: "#1E3A8A" },
  "quo-navy":          { layout: "two-col-header",  accentColor: "#1E3A5F" },
  "quo-plum":          { layout: "split-header",    accentColor: "#6B21A8" },
  "quo-gradient":      { layout: "stamp-box",       accentColor: "#0891B2" },
  "quo-bold":          { layout: "price-list",      accentColor: "#EA580C" },
  "quo-consulting":    { layout: "consulting",      accentColor: "#4338CA" },
  "quo-it":            { layout: "proposal",        accentColor: "#0EA5E9" },
  "quo-agency-p":      { layout: "proposal",        accentColor: "#7C3AED" },
  "quo-construction":  { layout: "construction",    accentColor: "#EA580C" },
  "quo-software":      { layout: "split-header",    accentColor: "#0EA5E9" },
  "quo-medical":       { layout: "classic",         accentColor: "#0369A1" },
  "quo-events":        { layout: "split-header",    accentColor: "#EC4899" },
  "quo-design":        { layout: "bold-hero",       accentColor: "#8B5CF6" },
  // ── QUOTATIONS – Industry ─────────────────────────────────────────────────
  "quo-pharmacy-q":    { layout: "dark-header",     accentColor: "#38BDF8",  headerBg: "#0C4A6E" },
  "quo-automotive-q":  { layout: "two-col-header",  accentColor: "#64748B" },
  "quo-education-q":   { layout: "price-list",      accentColor: "#93C5FD" },
  "quo-hospitality-q": { layout: "stamp-box",       accentColor: "#F59E0B" },
  "quo-marketing-agency":{ layout: "split-header",  accentColor: "#EC4899" },
  "quo-security-q2":   { layout: "two-col-header",  accentColor: "#4B5563" },
  "quo-cleaning-q":    { layout: "dark-header",     accentColor: "#6EE7B7",  headerBg: "#14532D" },
  "quo-catering-q":    { layout: "bold-hero",       accentColor: "#DC2626" },
  "quo-arch-q":        { layout: "bold-hero",       accentColor: "#0EA5E9" },
  "quo-printing-q":    { layout: "split-header",    accentColor: "#EC4899" },
  "quo-recruit-q":     { layout: "split-header",    accentColor: "#A5B4FC" },
  "quo-legal-q":       { layout: "formal-tender",   accentColor: "#B45309" },
  "quo-insurance-q":   { layout: "dark-header",     accentColor: "#34D399",  headerBg: "#14532D" },
  "quo-renewable-q":   { layout: "gradient",        accentColor: "#F59E0B",  headerBg: "#065F46", altColor: "#F59E0B" },

  // ── RECEIPTS – Standard A4 ────────────────────────────────────────────────
  "rec-full-a4":       { layout: "dark-header",     accentColor: "#374151",  headerBg: "#111827" },
  "rec-simple":        { layout: "classic",         accentColor: "#059669" },
  "rec-professional":  { layout: "dark-header",     accentColor: "#3B82F6",  headerBg: "#1E3A8A" },
  "rec-corp-gray":     { layout: "dark-header",     accentColor: "#9CA3AF",  headerBg: "#374151" },
  "rec-clean-white":   { layout: "minimal",         accentColor: "#6B7280" },
  "rec-navy-a4":       { layout: "dark-header",     accentColor: "#F59E0B",  headerBg: "#1E3A8A" },
  "rec-forest-a4":     { layout: "two-col-header",  accentColor: "#22C55E" },
  "rec-plum-a4":       { layout: "bold-hero",       accentColor: "#A855F7" },
  "rec-teal-a4":       { layout: "split-header",    accentColor: "#14B8A6" },
  "rec-amber-a4":      { layout: "stamp-box",       accentColor: "#F59E0B" },
  "rec-indigo-a4":     { layout: "price-list",      accentColor: "#6366F1" },
  "rec-ocean-a4":      { layout: "two-col-header",  accentColor: "#06B6D4" },
  "rec-boxed-a4":      { layout: "boxed",            accentColor: "#3B82F6",  headerBg: "#1E3A8A" },
  "rec-sidebar-a4":    { layout: "sidebar",         accentColor: "#3B82F6" },
  "rec-compact-a4":    { layout: "compact",         accentColor: "#374151" },
  // ── RECEIPTS – Thermal / POS ─────────────────────────────────────────────
  "rec-thermal-pos":   { layout: "compact",         accentColor: "#374151" },
  "rec-modern-pos":    { layout: "compact",         accentColor: "#6B7280" },
  "rec-thermal-ar":    { layout: "arabic",          accentColor: "#374151", isRTL: true },
  "rec-thermal-blue":  { layout: "compact",         accentColor: "#3B82F6" },
  "rec-thermal-green": { layout: "compact",         accentColor: "#22C55E" },
  "rec-thermal-red":   { layout: "compact",         accentColor: "#EF4444" },
  "rec-thermal-purple":{ layout: "compact",         accentColor: "#A855F7" },
  "rec-thermal-orange":{ layout: "compact",         accentColor: "#F97316" },
  "rec-thermal-teal":  { layout: "compact",         accentColor: "#14B8A6" },
  "rec-thermal-gold":  { layout: "compact",         accentColor: "#F59E0B" },
  "rec-pos-restaurant":{ layout: "compact",         accentColor: "#DC2626" },
  "rec-pos-cafe":      { layout: "compact",         accentColor: "#D97706" },
  "rec-pos-pharmacy":  { layout: "compact",         accentColor: "#38BDF8" },
  "rec-pos-retail":    { layout: "compact",         accentColor: "#22C55E" },
  "rec-pos-hotel":     { layout: "compact",         accentColor: "#60A5FA" },
  // ── RECEIPTS – Digital / Modern ───────────────────────────────────────────
  "rec-digital":       { layout: "dark-header",     accentColor: "#2563EB",  headerBg: "#1D4ED8" },
  "rec-gradient-success":{ layout: "gradient",      accentColor: "#059669",  headerBg: "#065F46", altColor: "#0D9488" },
  "rec-modern-blue":   { layout: "gradient",        accentColor: "#2563EB",  headerBg: "#1D4ED8", altColor: "#0891B2" },
  "rec-purple-digital":{ layout: "gradient",        accentColor: "#7C3AED",  headerBg: "#6D28D9", altColor: "#EC4899" },
  // excess → new layouts
  "rec-digital-teal":  { layout: "split-header",    accentColor: "#14B8A6" },
  "rec-digital-gold":  { layout: "minimal",         accentColor: "#F59E0B" },
  "rec-digital-rose":  { layout: "two-col-header",  accentColor: "#E11D48" },
  "rec-digital-dark":  { layout: "bold-hero",       accentColor: "#8B5CF6" },
  "rec-fire-rec":      { layout: "stamp-box",       accentColor: "#EA580C" },
  "rec-neon-rec":      { layout: "price-list",      accentColor: "#06B6D4" },
  "rec-rose-rec":      { layout: "bold-hero",       accentColor: "#E11D48" },
  "rec-emerald-rec":   { layout: "two-col-header",  accentColor: "#059669" },
  "rec-ocean-rec":     { layout: "split-header",    accentColor: "#06B6D4" },
  "rec-sunset-rec":    { layout: "stamp-box",       accentColor: "#EA580C" },
  "rec-digital-navy":  { layout: "two-col-header",  accentColor: "#3B82F6" },
  "rec-digital-green": { layout: "price-list",      accentColor: "#22C55E" },
  "rec-boxed-rec":     { layout: "boxed",            accentColor: "#A855F7",  headerBg: "#6D28D9" },
  "rec-sidebar-rec":   { layout: "sidebar",         accentColor: "#14B8A6" },
  "rec-compact-modern":{ layout: "compact",         accentColor: "#14B8A6" },
  "rec-digital-purple":{ layout: "price-list",      accentColor: "#A855F7" },
  // ── RECEIPTS – Arabic-First ──────────────────────────────────────────────
  "rec-ar-teal":       { layout: "arabic",          accentColor: "#14B8A6", isRTL: true },
  "rec-ar-blue":       { layout: "arabic",          accentColor: "#60A5FA", isRTL: true },
  "rec-ar-gold":       { layout: "arabic",          accentColor: "#F59E0B", isRTL: true },
  "rec-ar-min":        { layout: "arabic",          accentColor: "#6B7280", isRTL: true },
  "rec-ar-violet":     { layout: "arabic",          accentColor: "#8B5CF6", isRTL: true },
  "rec-ar-crimson":    { layout: "arabic",          accentColor: "#F87171", isRTL: true },
  "rec-ar-ocean":      { layout: "arabic",          accentColor: "#06B6D4", isRTL: true },
  "rec-ar-rose":       { layout: "arabic",          accentColor: "#EC4899", isRTL: true },
  "rec-ar-dark":       { layout: "arabic",          accentColor: "#8B5CF6", isRTL: true },
  "rec-ar-emerald":    { layout: "arabic",          accentColor: "#10B981", isRTL: true },
  "rec-ar-sky":        { layout: "arabic",          accentColor: "#38BDF8", isRTL: true },
  "rec-ar-slate":      { layout: "arabic",          accentColor: "#94A3B8", isRTL: true },
  "rec-ar-orange":     { layout: "arabic",          accentColor: "#F97316", isRTL: true },
  "rec-ar-green":      { layout: "arabic",          accentColor: "#22C55E", isRTL: true },
  "rec-ar-indigo":     { layout: "arabic",          accentColor: "#818CF8", isRTL: true },
  "rec-ar-warm":       { layout: "arabic",          accentColor: "#FB923C", isRTL: true },
  // ── RECEIPTS – Bilingual Split ────────────────────────────────────────────
  "rec-bilingual":     { layout: "bilingual-split", accentColor: "#60A5FA" },
  "rec-bilingual2":    { layout: "bilingual-split", accentColor: "#F59E0B" },
  "rec-bilingual3":    { layout: "bilingual-split", accentColor: "#C084FC" },
  "rec-bilingual4":    { layout: "bilingual-split", accentColor: "#34D399" },
  // ── RECEIPTS – Elegant (3 kept) ──────────────────────────────────────────
  "rec-gold-foil":     { layout: "elegant",         accentColor: "#B45309" },
  "rec-ivory-elegant": { layout: "elegant",         accentColor: "#D97706" },
  "rec-champagne":     { layout: "elegant",         accentColor: "#F59E0B" },
  "rec-pearl":         { layout: "split-header",    accentColor: "#9CA3AF" },
  "rec-velvet":        { layout: "stamp-box",       accentColor: "#7C3AED" },
  "rec-midnight-lux":  { layout: "split-header",    accentColor: "#8B5CF6" },
  "rec-marble":        { layout: "stamp-box",       accentColor: "#94A3B8" },
  "rec-premium-black": { layout: "bold-hero",       accentColor: "#D1D5DB" },
  "rec-gold-boxed":    { layout: "boxed",            accentColor: "#F59E0B",  headerBg: "#78350F" },
  "rec-sidebar-gold":  { layout: "sidebar",         accentColor: "#D97706" },
  "rec-boxed-dark":    { layout: "boxed",            accentColor: "#8B5CF6",  headerBg: "#0F0F1A" },
  "rec-sidebar-dark-lux":{ layout: "sidebar",       accentColor: "#F59E0B" },
  "rec-rose-gold-lux": { layout: "bold-hero",       accentColor: "#E11D48" },
  "rec-copper-lux":    { layout: "minimal",         accentColor: "#FB923C" },
  "rec-navy-lux":      { layout: "stamp-box",       accentColor: "#F59E0B" },
  // ── RECEIPTS – Industry ──────────────────────────────────────────────────
  "rec-retail":        { layout: "dark-header",     accentColor: "#22C55E",  headerBg: "#14532D" },
  "rec-medical":       { layout: "dark-header",     accentColor: "#38BDF8",  headerBg: "#1E3A8A" },
  "rec-restaurant":    { layout: "price-list",      accentColor: "#DC2626" },
  "rec-hotel":         { layout: "bold-hero",       accentColor: "#F59E0B" },
  "rec-transport":     { layout: "dark-header",     accentColor: "#EA580C",  headerBg: "#7C2D12" },
  "rec-pharmacy":      { layout: "dark-header",     accentColor: "#38BDF8",  headerBg: "#0C4A6E" },
  "rec-salon":         { layout: "split-header",    accentColor: "#EC4899" },
  "rec-gym-r":         { layout: "stamp-box",       accentColor: "#DC2626" },
  "rec-grocery":       { layout: "compact",         accentColor: "#22C55E" },
  "rec-parking":       { layout: "compact",         accentColor: "#6B7280" },
  "rec-car-wash":      { layout: "dark-header",     accentColor: "#60A5FA",  headerBg: "#1D4ED8" },
  "rec-construction-r":{ layout: "two-col-header",  accentColor: "#EA580C" },
  "rec-school":        { layout: "dark-header",     accentColor: "#93C5FD",  headerBg: "#1E3A8A" },
  "rec-clinic":        { layout: "classic",         accentColor: "#14B8A6" },
  "rec-insurance-r":   { layout: "classic",         accentColor: "#34D399" },
  "rec-corp":          { layout: "split-header",    accentColor: "#374151" },
  "rec-clean":         { layout: "minimal",         accentColor: "#6B7280" },
  "rec-arabic-blue":   { layout: "arabic",          accentColor: "#1D4ED8", isRTL: true },
  "rec-arabic-gold":   { layout: "arabic",          accentColor: "#B45309", isRTL: true },
  "rec-arabic-min":    { layout: "arabic",          accentColor: "#374151", isRTL: true },
  "rec-gradient":      { layout: "price-list",      accentColor: "#059669" },
  "rec-purple":        { layout: "bold-hero",       accentColor: "#7C3AED" },
  "rec-gold":          { layout: "minimal",         accentColor: "#B45309" },
  "rec-premium":       { layout: "minimal",         accentColor: "#111827" },
  "rec-ivory":         { layout: "minimal",         accentColor: "#92400E" },
};

function getAccentColor(template: string | undefined, isInvoice: boolean): string {
  if (template && TEMPLATE_RENDER_MAP[template]) return TEMPLATE_RENDER_MAP[template].accentColor;
  return isInvoice ? "#2563EB" : "#7C3AED";
}

interface SharedBodyProps {
  data: InvoiceData;
  accentColor: string;
  headerBg?: string;
  altColor?: string;
  isAR: boolean;
  t: (k: string) => string;
  sym: string;
  ar: (en: string, a: string) => string;
  startBorder: React.CSSProperties;
  showQuoteDetailsBox?: boolean;
}

function BillToPanel({ data, accentColor, isAR, t, startBorder }: SharedBodyProps) {
  const { clientInfo } = data;
  return (
    <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "10px", padding: "16px 20px", ...startBorder }}>
      <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "6px" }}>
        {t("doc.to")}
      </div>
      <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{clientInfo.name || "—"}</div>
      {clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px", marginTop: "2px" }}>{clientInfo.company}</div>}
      {clientInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{clientInfo.address}</div>}
      {clientInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{clientInfo.phone}</div>}
      {clientInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{clientInfo.email}</div>}
    </div>
  );
}

function QuoteDetailsBox({ data, accentColor, isAR, ar }: SharedBodyProps) {
  const { docNumber, issueDate, dueOrValidityDate } = data;
  return (
    <div style={{ width: "220px", background: "#F8FAFC", borderRadius: "10px", padding: "16px 20px" }}>
      <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "8px" }}>
        {ar("Quote Details", "تفاصيل العرض")}
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px", fontSize: "12px", color: "#6B7280" }}>
        {docNumber && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{ar("Quote #", "رقم العرض")}</span><span style={{ fontWeight: "600", color: "#374151" }}>{docNumber}</span></div>}
        {issueDate && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{ar("Date", "التاريخ")}</span><span style={{ fontWeight: "600", color: "#374151" }}>{issueDate}</span></div>}
        {dueOrValidityDate && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{ar("Valid until", "صالح حتى")}</span><span style={{ fontWeight: "600", color: "#374151" }}>{dueOrValidityDate}</span></div>}
      </div>
    </div>
  );
}

function LineItemsTable({ data, accentColor, isAR, t, sym }: SharedBodyProps) {
  const { lineItems } = data;
  const ar = (en: string, a: string) => isAR ? a : en;
  return (
    <div style={{ marginBottom: "28px", borderRadius: "10px", overflow: "hidden", border: "1px solid #E5E7EB" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: accentColor, color: "white" }}>
            <th style={{ padding: "10px 14px", textAlign: isAR ? "right" : "left", fontWeight: "600" }}>{t("doc.item_description")}</th>
            <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: "600", width: "55px" }}>{t("doc.item_qty")}</th>
            <th style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "90px" }}>{t("doc.item_unit_price")}</th>
            <th style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "70px" }}>{t("doc.item_discount")}</th>
            <th style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "60px" }}>{t("doc.item_tax")}</th>
            <th style={{ padding: "10px 14px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "90px" }}>{t("doc.item_total")}</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? "#FFFFFF" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
              <td style={{ padding: "10px 14px", color: "#374151" }}>{item.description || "—"}</td>
              <td style={{ padding: "10px 10px", textAlign: "center", color: "#6B7280" }}>{item.quantity}</td>
              <td style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{sym} {formatNumber(item.unitPrice)}</td>
              <td style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.discountPct}%</td>
              <td style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.taxPct}%</td>
              <td style={{ padding: "10px 14px", textAlign: isAR ? "left" : "right", fontWeight: "600", color: "#111827" }}>{sym} {formatNumber(calcLineItemTotal(item))}</td>
            </tr>
          ))}
          {lineItems.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontStyle: "italic" }}>
                {ar("No items added yet", "لا توجد بنود بعد")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBlock({ data, accentColor, isAR, t, sym }: SharedBodyProps) {
  const { totals } = data;
  const ns = data.numeralStyle || "western";
  const fmt = (n: number) => convertNumerals(formatNumber(n), ns);
  return (
    <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "32px" }}>
      <div style={{ width: "260px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6", fontSize: "12px" }}>
          <span style={{ color: "#6B7280" }}>{t("doc.subtotal")}</span>
          <span style={{ color: "#374151" }}>{sym} {fmt(totals.subtotal)}</span>
        </div>
        {totals.discountTotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6", fontSize: "12px" }}>
            <span style={{ color: "#6B7280" }}>{t("doc.discount_total")}</span>
            <span style={{ color: "#DC2626" }}>− {sym} {fmt(totals.discountTotal)}</span>
          </div>
        )}
        {totals.taxTotal > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F3F4F6", fontSize: "12px" }}>
            <span style={{ color: "#6B7280" }}>{t("doc.tax_total")}</span>
            <span style={{ color: "#374151" }}>+ {sym} {fmt(totals.taxTotal)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "8px", marginTop: "8px", background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
          <span style={{ fontWeight: "700", fontSize: "13px", color: "#111827" }}>{t("doc.grand_total")}</span>
          <span style={{ fontWeight: "800", fontSize: "18px", color: accentColor }}>{sym} {fmt(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

function PaymentSection({ data, accentColor, isAR }: SharedBodyProps) {
  const { paymentLink, bankDetails } = data;
  const hasPayment = paymentLink || bankDetails?.enabled;
  if (!hasPayment) return null;
  const ar = (en: string, a: string) => isAR ? a : en;
  return (
    <div style={{ marginBottom: "24px" }}>
      {paymentLink && (
        <div style={{ marginBottom: "12px" }}>
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", borderRadius: "8px", background: accentColor, color: "white", fontWeight: "700", fontSize: "13px", textDecoration: "none" }}
          >
            <span>💳</span>
            <span>{ar("Pay Now", "ادفع الآن")}</span>
          </a>
          <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "4px" }}>{paymentLink}</div>
        </div>
      )}
      {bankDetails?.enabled && (
        <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px", border: "1px solid #E5E7EB", fontSize: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "10px" }}>
            {ar("Bank Transfer Details", "تفاصيل التحويل البنكي")}
          </div>
          {[
            [ar("Bank", "البنك"), bankDetails.bankName],
            [ar("Account Holder", "اسم صاحب الحساب"), bankDetails.accountName],
            [ar("Account Number", "رقم الحساب"), bankDetails.accountNumber],
            bankDetails.iban ? [ar("IBAN", "آيبان"), bankDetails.iban] : null,
            bankDetails.swift ? [ar("SWIFT/BIC", "سويفت"), bankDetails.swift] : null,
          ].filter((row): row is [string, string] => row !== null).map(([label, value]) => value && (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #F3F4F6" }}>
              <span style={{ color: "#9CA3AF" }}>{label}</span>
              <span style={{ fontWeight: "600", color: "#111827" }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesPaymentBlock({ data, accentColor, isAR, t }: SharedBodyProps) {
  const { notes, paymentDetails, terms } = data;
  if (!notes && !paymentDetails && !terms) return null;
  return (
    <div style={{ marginBottom: "28px", borderTop: "1px solid #E5E7EB", paddingTop: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {notes && (
          <div>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "6px" }}>{t("doc.notes")}</div>
            <p style={{ fontSize: "12px", color: "#4B5563", whiteSpace: "pre-wrap" as const }}>{notes}</p>
          </div>
        )}
        {paymentDetails && (
          <div>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "6px" }}>{t("doc.payment_details")}</div>
            <p style={{ fontSize: "12px", color: "#4B5563", whiteSpace: "pre-wrap" as const }}>{paymentDetails}</p>
          </div>
        )}
        {terms && (
          <div>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "6px" }}>{t("quot.terms")}</div>
            <p style={{ fontSize: "12px", color: "#4B5563", whiteSpace: "pre-wrap" as const }}>{terms}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SignatureFooter({ data, accentColor, isAR, ar }: SharedBodyProps) {
  const { signatureFooter, zatcaQR } = data;
  return (
    <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "20px" }}>
          {zatcaQR && (
            <div style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: "0",
              border: "1px solid #BBF7D0",
              borderRadius: "8px",
              padding: "8px 12px",
              background: "#F0FDF4",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                <span style={{ fontSize: "8px", color: "#15803D", letterSpacing: "0.05em" }}>ZATCA</span>
                <span style={{ fontSize: "8px", fontWeight: "700", color: "#15803D" }}>✓ COMPLIANT</span>
              </div>
              <img src={zatcaQR} alt="ZATCA QR" style={{ width: "80px", height: "80px", display: "block" }} />
              <div style={{ fontSize: "8px", color: "#6B7280", textAlign: "center" as const, marginTop: "6px", lineHeight: "1.4" }}>
                Scan to Verify / للتحقق امسح
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "24px" }}>{ar("Authorized by", "معتمد من")}</div>
            <div style={{ borderTop: "1px solid #9CA3AF", width: "180px", paddingTop: "4px" }}>
              <div style={{ fontSize: "12px", color: "#6B7280" }}>{signatureFooter || ar("Signature & Stamp", "التوقيع والختم")}</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: isAR ? "left" : "right" }}>
          <div style={{ fontSize: "11px", color: "#9CA3AF", fontStyle: "italic" }}>{ar("Thank you for your business", "شكراً لتعاملكم معنا")}</div>
          <div style={{ marginTop: "4px", fontSize: "11px", fontWeight: "600", background: `linear-gradient(90deg, ${accentColor}, #7C3AED)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Xuvilo
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: CLASSIC  (classic | standard)
   ════════════════════════════════════════════════════════════════════════════ */
function ClassicLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  return (
    <>
      {/* Top accent bar */}
      <div style={{ height: "4px", background: accentColor }} />
      <div style={{ padding: "36px 48px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px", marginBottom: "28px" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "100px", maxWidth: "260px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "12px" }} />
            ) : (
              <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: accentColor, marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: "900", fontSize: "22px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827", lineHeight: "1.3" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px", marginTop: "2px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.email}</div>}
            {businessInfo.vatNumber && <div style={{ color: "#9CA3AF", fontSize: "11px", marginTop: "4px" }}>{t("doc.vat_number")}: {businessInfo.vatNumber}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "32px", fontWeight: "800", color: accentColor, letterSpacing: "1px", textTransform: "uppercase" as const }}>{data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار")}</div>
            <div style={{ fontWeight: "600", color: "#374151", fontSize: "14px", marginTop: "8px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "3px" }}>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "#9CA3AF", fontSize: "12px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
            <div style={{ display: "inline-block", marginTop: "8px", background: "#F8FAFC", border: `1px solid ${accentColor}30`, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: "600", color: accentColor }}>{currency}</div>
          </div>
        </div>
        <div style={{ height: "1px", background: "#E5E7EB", marginBottom: "24px" }} />
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
      <div style={{ height: "3px", background: accentColor, marginTop: "auto" }} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: MODERN BLUE  (modern-blue)
   Full dark navy header, white body
   ════════════════════════════════════════════════════════════════════════════ */
function ModernBlueLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <>
      {/* Full dark navy header */}
      <div style={{ background: "#0F2444", padding: "36px 48px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "88px", maxWidth: "240px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "12px", filter: "brightness(0) invert(1) opacity(0.9)" }} />
            ) : (
              <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <span style={{ color: "white", fontWeight: "900", fontSize: "22px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ color: "white", fontWeight: "700", fontSize: "17px", lineHeight: "1.3" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginTop: "2px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px" }}>{businessInfo.email}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "32px", fontWeight: "900", color: "#60A5FA", letterSpacing: "2px", textTransform: "uppercase" as const }}>{docTitle}</div>
            <div style={{ color: "rgba(255,255,255,0.95)", fontWeight: "600", fontSize: "14px", marginTop: "8px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginTop: "3px" }}>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", marginTop: "3px" }}>{currency}</div>
          </div>
        </div>
      </div>
      <div style={{ height: "3px", background: "#60A5FA" }} />
      {/* White body */}
      <div style={{ padding: "28px 48px" }}>
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
      <div style={{ height: "3px", background: "#60A5FA", marginTop: "auto" }} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: MINIMAL  (minimal)
   No color, monochrome, thin top line
   ════════════════════════════════════════════════════════════════════════════ */
function MinimalLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor: "#374151", isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <>
      <div style={{ height: "3px", background: accentColor }} />
      <div style={{ padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px", marginBottom: "28px", paddingBottom: "24px", borderBottom: "1.5px solid #E5E7EB" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "88px", maxWidth: "240px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "12px", filter: "grayscale(100%)" }} />
            ) : (
              <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: "900", fontSize: "20px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ fontWeight: "700", fontSize: "15px", color: "#111827", lineHeight: "1.3" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px", marginTop: "2px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.email}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "30px", fontWeight: "800", color: "#111827", letterSpacing: "3px", textTransform: "uppercase" as const }}>{docTitle}</div>
            <div style={{ color: accentColor, fontSize: "14px", fontWeight: "600", marginTop: "8px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "#9CA3AF", fontSize: "12px", marginTop: "3px" }}>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "#9CA3AF", fontSize: "12px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
            {currency && <div style={{ color: "#D1D5DB", fontSize: "11px", marginTop: "4px", letterSpacing: "0.05em" }}>{currency}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        {/* Minimal table — no color, black header */}
        <div style={{ marginBottom: "28px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderTop: "1px solid #111827", borderBottom: "1px solid #111827" }}>
                <th style={{ padding: "10px 0", textAlign: isAR ? "right" : "left", fontWeight: "700", color: "#111827", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{t("doc.item_description")}</th>
                <th style={{ padding: "10px 0", textAlign: "center", fontWeight: "700", color: "#111827", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" as const, width: "55px" }}>{t("doc.item_qty")}</th>
                <th style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", fontWeight: "700", color: "#111827", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" as const, width: "90px" }}>{t("doc.item_unit_price")}</th>
                <th style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", fontWeight: "700", color: "#111827", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" as const, width: "70px" }}>{t("doc.item_discount")}</th>
                <th style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", fontWeight: "700", color: "#111827", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" as const, width: "60px" }}>{t("doc.item_tax")}</th>
                <th style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", fontWeight: "700", color: "#111827", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase" as const, width: "90px" }}>{t("doc.item_total")}</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={{ padding: "10px 0", color: "#374151" }}>{item.description || "—"}</td>
                  <td style={{ padding: "10px 0", textAlign: "center", color: "#6B7280" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{sym} {formatNumber(item.unitPrice)}</td>
                  <td style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.discountPct}%</td>
                  <td style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.taxPct}%</td>
                  <td style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", fontWeight: "600" }}>{sym} {formatNumber(calcLineItemTotal(item))}</td>
                </tr>
              ))}
              {data.lineItems.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "20px 0", textAlign: "center", color: "#9CA3AF", fontStyle: "italic" }}>{ar("No items added yet", "لا توجد بنود بعد")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Minimal totals */}
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "32px" }}>
          <div style={{ width: "260px" }}>
            {data.totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.discount_total")}</span><span style={{ color: "#DC2626" }}>− {sym} {formatNumber(data.totals.discountTotal)}</span></div>}
            {data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.tax_total")}</span><span>+ {sym} {formatNumber(data.totals.taxTotal)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #111827", paddingTop: "10px", marginTop: "6px" }}>
              <span style={{ fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: "0.05em", fontSize: "12px" }}>{t("doc.grand_total")}</span>
              <span style={{ fontWeight: "900", fontSize: "20px" }}>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: BOLD CORPORATE  (bold-corporate)
   Amber accent, bold header bar
   ════════════════════════════════════════════════════════════════════════════ */
function BoldCorporateLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <>
      <div style={{ background: "#111827", padding: "28px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "76px", maxWidth: "180px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            ) : (
              <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: "800", fontSize: "20px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <div style={{ color: "white", fontWeight: "700", fontSize: "16px" }}>{businessInfo.name || t("doc.business_name")}</div>
              {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>{businessInfo.address}</div>}
            </div>
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#F59E0B", letterSpacing: "2px", textTransform: "uppercase" as const }}>{docTitle}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", marginTop: "4px" }}>#{docNumber || "---"}</div>
          </div>
        </div>
      </div>
      {/* Amber bar with dates */}
      <div style={{ background: "#F59E0B", padding: "10px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "32px" }}>
          {issueDate && <div><span style={{ fontSize: "10px", fontWeight: "700", color: "rgba(0,0,0,0.6)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}:&nbsp;</span><span style={{ fontWeight: "700", color: "#111827", fontSize: "12px" }}>{issueDate}</span></div>}
          {dueOrValidityDate && <div><span style={{ fontSize: "10px", fontWeight: "700", color: "rgba(0,0,0,0.6)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{dueOrValidityLabel}:&nbsp;</span><span style={{ fontWeight: "700", color: "#111827", fontSize: "12px" }}>{dueOrValidityDate}</span></div>}
        </div>
        <div style={{ fontWeight: "700", color: "#111827", fontSize: "12px" }}>{currency}</div>
      </div>
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        <LineItemsTable {...props} />
        {/* Bold total bar */}
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "32px" }}>
          <div style={{ width: "280px" }}>
            {data.totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.discount_total")}</span><span style={{ color: "#DC2626" }}>− {sym} {formatNumber(data.totals.discountTotal)}</span></div>}
            {data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.tax_total")}</span><span>+ {sym} {formatNumber(data.totals.taxTotal)}</span></div>}
            <div style={{ background: "#F59E0B", padding: "14px 20px", borderRadius: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "800", fontSize: "13px", color: "white", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{t("doc.grand_total")}</span>
              <span style={{ fontWeight: "900", fontSize: "20px", color: "white" }}>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: DARK HEADER
   Full-width dark header, white body, accent table header + total bar
   ════════════════════════════════════════════════════════════════════════════ */
function DarkHeaderLayout({ data, accentColor, headerBg, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const bg = headerBg || "#1E293B";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <>
      <div style={{ background: bg, padding: "32px 48px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "84px", maxWidth: "240px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "12px", filter: "brightness(0) invert(1) opacity(0.9)" }} />
            ) : (
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <span style={{ color: "white", fontWeight: "900", fontSize: "20px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ color: "white", fontWeight: "700", fontSize: "17px", lineHeight: "1.3" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", marginTop: "3px" }}>{businessInfo.address}</div>}
            {businessInfo.email && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}>{businessInfo.email}</div>}
            {businessInfo.phone && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}>{businessInfo.phone}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ color: accentColor, fontWeight: "900", fontSize: "30px", letterSpacing: "2px", textTransform: "uppercase" as const }}>{docTitle}</div>
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px", fontWeight: "600", marginTop: "6px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", marginTop: "3px" }}>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "3px" }}>{currency}</div>
          </div>
        </div>
      </div>
      <div style={{ height: "3px", background: accentColor }} />
      <div style={{ padding: "28px 48px" }}>
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        <LineItemsTable {...props} />
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "32px" }}>
          <div style={{ width: "280px" }}>
            {data.totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.discount_total")}</span><span style={{ color: "#DC2626" }}>− {sym} {formatNumber(data.totals.discountTotal)}</span></div>}
            {data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.tax_total")}</span><span>+ {sym} {formatNumber(data.totals.taxTotal)}</span></div>}
            <div style={{ background: bg, padding: "12px 18px", borderRadius: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "700", fontSize: "11px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{t("doc.grand_total")}</span>
              <span style={{ fontWeight: "900", fontSize: "20px", color: accentColor }}>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: GRADIENT
   Diagonal gradient header, tinted client box, subtle table, gradient total
   ════════════════════════════════════════════════════════════════════════════ */
function GradientLayout({ data, accentColor, headerBg, altColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const gradStart = headerBg || accentColor;
  const gradEnd = altColor || accentColor;
  const grad = `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`;
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <>
      <div style={{ background: grad, padding: "28px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "white", fontWeight: "900", fontSize: "26px", letterSpacing: "1px", textTransform: "uppercase" as const }}>{docTitle}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", marginTop: "4px" }}>#{docNumber || "---"}{issueDate ? `  ·  ${issueDate}` : ""}</div>
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "64px", maxWidth: "180px", objectFit: "contain", objectPosition: isAR ? "left" : "right", marginBottom: "8px", filter: "brightness(0) invert(1) opacity(0.9)" }} />
            ) : null}
            <div style={{ color: "white", fontWeight: "700", fontSize: "15px" }}>{businessInfo.name || t("doc.business_name")}</div>
            {dueOrValidityDate && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginTop: "3px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>{currency}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "24px 48px 16px" }}>
        <div style={{ background: `${gradStart}10`, borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", ...(isAR ? { borderRight: `3px solid ${gradEnd}` } : { borderLeft: `3px solid ${gradEnd}` }) }}>
          {data.clientInfo?.name && <div style={{ fontWeight: "600", color: "#374151", fontSize: "13px" }}>{data.clientInfo.name}</div>}
          {data.clientInfo?.address && <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{data.clientInfo.address}</div>}
          {data.clientInfo?.email && <div style={{ fontSize: "11px", color: "#6B7280" }}>{data.clientInfo.email}</div>}
          {data.clientInfo?.phone && <div style={{ fontSize: "11px", color: "#6B7280" }}>{data.clientInfo.phone}</div>}
        </div>
        {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        <LineItemsTable {...props} />
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "28px" }}>
          <div style={{ width: "260px" }}>
            {data.totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#6B7280" }}><span>{t("doc.discount_total")}</span><span style={{ color: "#DC2626" }}>− {sym} {formatNumber(data.totals.discountTotal)}</span></div>}
            {data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#6B7280" }}><span>{t("doc.tax_total")}</span><span>+ {sym} {formatNumber(data.totals.taxTotal)}</span></div>}
            <div style={{ background: grad, color: "white", padding: "12px 16px", borderRadius: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: "1px" }}>{t("doc.grand_total")}</span>
              <span style={{ fontSize: "20px", fontWeight: "900" }}>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: BOXED
   Slate background, stacked rounded cards, 2-col FROM/BILL TO, dark total box
   ════════════════════════════════════════════════════════════════════════════ */
function BoxedLayout({ data, accentColor, headerBg, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const bg = headerBg || accentColor;
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <div style={{ background: "#F8FAFC", padding: "24px", display: "flex", flexDirection: "column", gap: "14px", minHeight: "100%" }}>
      {/* Header card */}
      <div style={{ background: "white", border: `2px solid ${bg}`, borderRadius: "12px", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "68px", maxWidth: "200px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "8px" }} />
          ) : null}
          <div style={{ fontWeight: "900", fontSize: "22px", color: bg, letterSpacing: "1px", textTransform: "uppercase" as const }}>{docTitle}</div>
          <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "3px" }}>{businessInfo.name || t("doc.business_name")}{businessInfo.address ? `  ·  ${businessInfo.address}` : ""}</div>
        </div>
        <div style={{ textAlign: isAR ? "left" : "right" }}>
          <div style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>#{docNumber || "---"}</div>
          {issueDate && <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}: {issueDate}</div>}
          {dueOrValidityDate && <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
          <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{currency}</div>
        </div>
      </div>
      {/* FROM / BILL TO 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "12px 16px" }}>
          <div style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "2px", marginBottom: "5px" }}>{ar("FROM", "من")}</div>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
          {businessInfo.email && <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{businessInfo.email}</div>}
          {businessInfo.phone && <div style={{ fontSize: "11px", color: "#6B7280" }}>{businessInfo.phone}</div>}
          {businessInfo.vatNumber && <div style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "2px" }}>{t("doc.vat_number")}: {businessInfo.vatNumber}</div>}
        </div>
        <div style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}30`, borderRadius: "10px", padding: "12px 16px" }}>
          <div style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "2px", marginBottom: "5px" }}>{ar("BILL TO", "إلى")}</div>
          {data.clientInfo?.name ? (
            <>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>{data.clientInfo.name}</div>
              {data.clientInfo.address && <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{data.clientInfo.address}</div>}
              {data.clientInfo.email && <div style={{ fontSize: "11px", color: "#6B7280" }}>{data.clientInfo.email}</div>}
            </>
          ) : (
            <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>{t("doc.client_name")}</div>
          )}
        </div>
      </div>
      {showQuoteDetailsBox && (
        <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "12px 16px" }}>
          <QuoteDetailsBox {...props} />
        </div>
      )}
      {/* Items table card */}
      <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ background: bg, padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", fontWeight: "600", textTransform: "uppercase" as const }}>{ar("Description", "البيان")}</span>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", fontWeight: "600", textTransform: "uppercase" as const }}>{ar("Amount", "المبلغ")}</span>
        </div>
        <div style={{ padding: "0 0 8px" }}>
          {(data.lineItems ?? []).map((item, i) => (
            <div key={item.id ?? i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#374151", fontWeight: "500" }}>{item.description || "—"}</div>
                {item.quantity > 1 && <div style={{ fontSize: "10px", color: "#9CA3AF" }}>{item.quantity} × {sym} {formatNumber(item.unitPrice)}</div>}
              </div>
              <div style={{ fontSize: "12px", color: "#111827", fontWeight: "600" }}>{sym} {formatNumber(calcLineItemTotal(item))}</div>
            </div>
          ))}
          {(data.lineItems ?? []).length === 0 && (
            <div style={{ padding: "16px", textAlign: "center", color: "#9CA3AF", fontStyle: "italic", fontSize: "12px" }}>
              {ar("No items added yet", "لا توجد بنود بعد")}
            </div>
          )}
        </div>
      </div>
      {/* Totals */}
      <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end" }}>
        <div style={{ width: "260px" }}>
          {data.totals.subtotal > 0 && data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#6B7280" }}><span>{t("doc.subtotal")}</span><span>{sym} {formatNumber(data.totals.subtotal)}</span></div>}
          {data.totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#6B7280" }}><span>{t("doc.discount_total")}</span><span style={{ color: "#DC2626" }}>− {sym} {formatNumber(data.totals.discountTotal)}</span></div>}
          {data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#6B7280" }}><span>{t("doc.tax_total")}</span><span>+ {sym} {formatNumber(data.totals.taxTotal)}</span></div>}
          <div style={{ background: bg, borderRadius: "10px", padding: "12px 18px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", fontWeight: "700", textTransform: "uppercase" as const }}>{t("doc.grand_total")}</span>
            <span style={{ fontSize: "20px", color: accentColor === bg ? "white" : accentColor, fontWeight: "900" }}>{sym} {formatNumber(data.totals.grandTotal)}</span>
          </div>
        </div>
      </div>
      <PaymentSection {...props} />
      <NotesPaymentBlock {...props} />
      <SignatureFooter {...props} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: ARABIC (arabic-* templates)
   RTL, colored full-width header
   ════════════════════════════════════════════════════════════════════════════ */
function ArabicLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR: true, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <>
      {/* Colored header */}
      <div style={{ background: accentColor, padding: "32px 48px" }} dir="rtl">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "white", fontWeight: "900", fontSize: "32px", fontFamily: "'Cairo', sans-serif" }}>{docTitle}</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", marginTop: "4px", fontFamily: "'Cairo', sans-serif" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
          </div>
          <div style={{ textAlign: "left" }}>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "88px", maxWidth: "200px", objectFit: "contain", marginBottom: "8px", filter: "brightness(0) invert(1) opacity(0.9)" }} />
            ) : (
              <div style={{ width: "56px", height: "56px", borderRadius: "10px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                <span style={{ color: "white", fontWeight: "800", fontSize: "22px" }}>{(businessInfo.name || "ب").charAt(0)}</span>
              </div>
            )}
            <div style={{ color: "white", fontWeight: "700", fontSize: "15px", fontFamily: "'Cairo', sans-serif" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", fontFamily: "'Cairo', sans-serif" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>{businessInfo.email}</div>}
          </div>
        </div>
      </div>
      {/* White body — RTL */}
      <div style={{ padding: "28px 48px" }} dir="rtl">
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
      <div style={{ height: "3px", background: accentColor }} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: PROPOSAL (proposal | arabic-proposal)
   Violet gradient header + project overview box
   ════════════════════════════════════════════════════════════════════════════ */
function ProposalLayout({ data, accentColor, isAR, t, sym, ar, startBorder }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  return (
    <>
      <div style={{ background: "linear-gradient(135deg, #5B21B6, #7C3AED)", padding: "36px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "white", marginBottom: "4px" }}>{ar("Project Proposal", "مقترح مشروع")}</div>
            {docNumber && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px" }}>#{docNumber}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "76px", maxWidth: "180px", objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", marginBottom: "6px" }} />
            ) : (
              <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "6px", marginLeft: "auto" }}>
                <span style={{ color: "white", fontWeight: "800", fontSize: "20px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ color: "white", fontWeight: "600", fontSize: "14px" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{businessInfo.address}</div>}
          </div>
        </div>
      </div>
      <div style={{ padding: "32px 48px" }}>
        {/* Meta bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {[
            { label: ar("Prepared for", "مقدم إلى"), value: data.clientInfo.name || "—" },
            { label: ar("Date", "التاريخ"), value: issueDate || "—" },
            { label: ar("Valid until", "صالح حتى"), value: dueOrValidityDate || "—" },
            { label: ar("Currency", "العملة"), value: currency },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#F5F3FF", borderRadius: "8px", padding: "12px 14px", borderLeft: "3px solid #7C3AED" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#7C3AED", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontWeight: "600", color: "#111827", fontSize: "13px" }}>{value}</div>
            </div>
          ))}
        </div>
        <LineItemsTable {...props} />
        {/* Violet total bar */}
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "32px" }}>
          <div style={{ width: "280px" }}>
            {data.totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.discount_total")}</span><span style={{ color: "#DC2626" }}>− {sym} {formatNumber(data.totals.discountTotal)}</span></div>}
            {data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.tax_total")}</span><span>+ {sym} {formatNumber(data.totals.taxTotal)}</span></div>}
            <div style={{ background: "#7C3AED", padding: "14px 20px", borderRadius: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "800", fontSize: "13px", color: "white", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{t("doc.grand_total")}</span>
              <span style={{ fontWeight: "900", fontSize: "20px", color: "white" }}>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: FORMAL TENDER  (formal-tender)
   Government/official style with grid borders
   ════════════════════════════════════════════════════════════════════════════ */
function FormalTenderLayout({ data, accentColor, isAR, t, sym, ar, startBorder }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar("TENDER QUOTATION", "عطاء رسمي");
  return (
    <>
      <div style={{ padding: "40px 48px 32px" }}>
        {/* Official header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #111827", paddingBottom: "24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#6B7280", letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: "6px" }}>
            {ar("OFFICIAL TENDER DOCUMENT", "وثيقة العطاء الرسمية")}
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#111827", letterSpacing: "2px" }}>{docTitle}</div>
          {docNumber && <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "6px" }}>{ar("Reference No:", "رقم المرجع:")} {docNumber}</div>}
        </div>
        {/* Metadata grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: ar("Issuing Party", "جهة الإصدار"), value: businessInfo.name || t("doc.business_name") },
            { label: ar("Date Issued", "تاريخ الإصدار"), value: issueDate || "—" },
            { label: ar("Supplier / Bidder", "مقدم العطاء"), value: businessInfo.name || "—" },
            { label: ar("Submission Deadline", "آخر موعد للتقديم"), value: dueOrValidityDate || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ border: "1px solid #D1D5DB", padding: "10px 14px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#6B7280", marginBottom: "2px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontWeight: "600", color: "#111827", fontSize: "13px" }}>{value}</div>
            </div>
          ))}
        </div>
        {/* Bordered table */}
        <div style={{ marginBottom: "28px", border: "1px solid #9CA3AF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#F3F4F6", borderBottom: "1px solid #9CA3AF" }}>
                <th style={{ padding: "10px 12px", textAlign: isAR ? "right" : "left", fontWeight: "700", border: "1px solid #9CA3AF" }}>{t("doc.item_description")}</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "700", border: "1px solid #9CA3AF", width: "55px" }}>{t("doc.item_qty")}</th>
                <th style={{ padding: "10px 12px", textAlign: isAR ? "left" : "right", fontWeight: "700", border: "1px solid #9CA3AF", width: "90px" }}>{t("doc.item_unit_price")}</th>
                <th style={{ padding: "10px 12px", textAlign: isAR ? "left" : "right", fontWeight: "700", border: "1px solid #9CA3AF", width: "90px" }}>{t("doc.item_total")}</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #D1D5DB" }}>
                  <td style={{ padding: "10px 12px", color: "#374151", border: "1px solid #D1D5DB" }}>{item.description || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: "#6B7280", border: "1px solid #D1D5DB" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 12px", textAlign: isAR ? "left" : "right", color: "#6B7280", border: "1px solid #D1D5DB" }}>{sym} {formatNumber(item.unitPrice)}</td>
                  <td style={{ padding: "10px 12px", textAlign: isAR ? "left" : "right", fontWeight: "600", border: "1px solid #D1D5DB" }}>{sym} {formatNumber(calcLineItemTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "32px" }}>
          <div style={{ width: "260px", borderTop: "2px solid #111827", paddingTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "14px" }}>
              <span style={{ textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{ar("Total Bid", "إجمالي العطاء")}</span>
              <span>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: COMPACT QUOTE  (compact)
   Dense 2-col item list
   ════════════════════════════════════════════════════════════════════════════ */
function CompactLayout({ data, accentColor, isAR, t, sym, ar, startBorder }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar("QUOTATION", "عرض أسعار");
  return (
    <>
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #111827", paddingBottom: "16px", marginBottom: "20px" }}>
          <div>
            <div style={{ fontWeight: "900", fontSize: "20px", letterSpacing: "1px" }}>
              {docTitle} {docNumber ? `#${docNumber}` : ""}
            </div>
            <div style={{ fontWeight: "600", fontSize: "13px", color: "#374151", marginTop: "2px" }}>{businessInfo.name || t("doc.business_name")}</div>
          </div>
          <div style={{ textAlign: isAR ? "left" : "right", fontSize: "12px", color: "#6B7280" }}>
            {issueDate && <div>{ar("Date", "التاريخ")}: <strong style={{ color: "#374151" }}>{issueDate}</strong></div>}
            {dueOrValidityDate && <div>{dueOrValidityLabel}: <strong style={{ color: "#374151" }}>{dueOrValidityDate}</strong></div>}
            <div>{ar("Currency", "العملة")}: <strong style={{ color: "#374151" }}>{currency}</strong></div>
          </div>
        </div>
        {/* 2-col items */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", marginBottom: "20px" }}>
          {data.lineItems.map((item, i) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 8px", borderBottom: "1px solid #E5E7EB", borderRight: i % 2 === 0 ? "1px solid #E5E7EB" : "none" }}>
              <span style={{ fontSize: "12px", color: "#374151", flex: 1, paddingRight: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description || `Item ${i + 1}`}</span>
              <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: "600", flexShrink: 0 }}>{sym}{formatNumber(calcLineItemTotal(item))}</span>
            </div>
          ))}
          {data.lineItems.length === 0 && (
            <div style={{ gridColumn: "span 2", padding: "20px", textAlign: "center", color: "#9CA3AF", fontStyle: "italic" }}>{ar("No items added yet", "لا توجد بنود بعد")}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "28px" }}>
          <div style={{ width: "240px", borderTop: "2px solid #111827", paddingTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "14px" }}>
              <span>{t("doc.grand_total")}</span>
              <span>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: SIDEBAR  (sidebar)
   Colored left sidebar (22%) + main content (78%)
   ════════════════════════════════════════════════════════════════════════════ */
function SidebarLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  const sidebar = (
    <div style={{ width: "210px", flexShrink: 0, background: accentColor, padding: "40px 22px", display: "flex", flexDirection: "column" as const, color: "white", minHeight: "1123px" }}>
      {businessInfo.logoUrl ? (
        <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "76px", maxWidth: "170px", objectFit: "contain", objectPosition: "left", filter: "brightness(0) invert(1) opacity(0.9)", marginBottom: "14px" }} />
      ) : (
        <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
          <span style={{ color: "white", fontWeight: "800", fontSize: "20px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div style={{ fontWeight: "800", fontSize: "13px", marginBottom: "3px", wordBreak: "break-word" as const }}>{businessInfo.name || t("doc.business_name")}</div>
      {businessInfo.email && <div style={{ fontSize: "10px", opacity: 0.75, marginTop: "2px", wordBreak: "break-word" as const }}>{businessInfo.email}</div>}
      {businessInfo.phone && <div style={{ fontSize: "10px", opacity: 0.75, marginTop: "2px" }}>{businessInfo.phone}</div>}
      {businessInfo.address && <div style={{ fontSize: "10px", opacity: 0.7, marginTop: "4px", lineHeight: "1.4" }}>{businessInfo.address}</div>}
      {businessInfo.vatNumber && <div style={{ fontSize: "10px", opacity: 0.65, marginTop: "6px" }}>{t("doc.vat_number")}: {businessInfo.vatNumber}</div>}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", margin: "26px 0 22px" }} />
      <div style={{ fontSize: "9px", opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>{ar("Document #", "رقم المستند")}</div>
      <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "14px" }}>{docNumber || "—"}</div>
      <div style={{ fontSize: "9px", opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>{ar("Date", "التاريخ")}</div>
      <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "14px" }}>{issueDate || "—"}</div>
      {dueOrValidityDate && <>
        <div style={{ fontSize: "9px", opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>{dueOrValidityLabel}</div>
        <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "14px" }}>{dueOrValidityDate}</div>
      </>}
      <div style={{ fontSize: "9px", opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "4px" }}>{ar("Currency", "العملة")}</div>
      <div style={{ fontSize: "12px", fontWeight: "600" }}>{currency}</div>
      <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: "18px" }}>
        <div style={{ fontSize: "9px", opacity: 0.6, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "5px" }}>{t("doc.grand_total")}</div>
        <div style={{ fontSize: "22px", fontWeight: "900" }}>{sym}{formatNumber(data.totals.grandTotal)}</div>
      </div>
    </div>
  );
  const mainContent = (
    <div style={{ flex: 1, padding: "40px 44px", display: "flex", flexDirection: "column" as const }}>
      <div style={{ marginBottom: "26px" }}>
        <div style={{ fontSize: "32px", fontWeight: "900", color: accentColor, letterSpacing: "0px" }}>{docTitle}</div>
      </div>
      <BillToPanel {...props} />
      <div style={{ marginBottom: "28px" }} />
      <LineItemsTable {...props} />
      <TotalsBlock {...props} />
      <PaymentSection {...props} />
      <NotesPaymentBlock {...props} />
      <SignatureFooter {...props} />
    </div>
  );
  return (
    <div style={{ display: "flex", minHeight: "1123px", direction: "ltr" }}>
      {isAR ? <>{mainContent}{sidebar}</> : <>{sidebar}{mainContent}</>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: TOP BAND  (top-band)
   Thin colour ribbon at top, centered logo, two-column FROM / BILL TO
   ════════════════════════════════════════════════════════════════════════════ */
function TopBandLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <>
      <div style={{ height: "10px", background: accentColor }} />
      <div style={{ padding: "36px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px", paddingBottom: "24px", borderBottom: "1px solid #E5E7EB" }}>
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "104px", maxWidth: "260px", objectFit: "contain", margin: "0 auto 10px", display: "block" }} />
          ) : (
            <div style={{ width: "62px", height: "62px", borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <span style={{ color: "white", fontWeight: "800", fontSize: "24px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div style={{ fontWeight: "700", fontSize: "17px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
          {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px", marginTop: "2px" }}>{businessInfo.address}</div>}
          {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.phone}</div>}
          {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.email}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: accentColor, letterSpacing: "1px" }}>{docTitle}</div>
            <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>#{docNumber || "---"}</div>
          </div>
          <div style={{ textAlign: isAR ? "left" : "right", fontSize: "12px", color: "#6B7280" }}>
            {issueDate && <div>{ar("Date", "التاريخ")}: <strong style={{ color: "#374151" }}>{issueDate}</strong></div>}
            {dueOrValidityDate && <div>{dueOrValidityLabel}: <strong style={{ color: "#374151" }}>{dueOrValidityDate}</strong></div>}
            <div style={{ color: "#374151", fontWeight: "600" }}>{currency}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
          <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "16px 20px", borderTop: `3px solid ${accentColor}` }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "8px" }}>{ar("FROM", "من")}</div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.vatNumber && <div style={{ color: "#6B7280", fontSize: "12px" }}>{t("doc.vat_number")}: {businessInfo.vatNumber}</div>}
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "16px 20px", borderTop: `3px solid ${accentColor}` }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "8px" }}>{t("doc.to")}</div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{data.clientInfo.name || "—"}</div>
            {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px", marginTop: "2px" }}>{data.clientInfo.company}</div>}
            {data.clientInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.address}</div>}
            {data.clientInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.email}</div>}
          </div>
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
      <div style={{ height: "6px", background: accentColor, marginTop: "auto" }} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: CENTERED MINIMAL  (centered)
   Giant invoice number as hero, centered header, two-col FROM/TO
   ════════════════════════════════════════════════════════════════════════════ */
function CenteredLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <>
      <div style={{ padding: "52px 64px" }}>
        <div style={{ textAlign: "center", marginBottom: "44px" }}>
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "84px", maxWidth: "220px", objectFit: "contain", margin: "0 auto 18px", display: "block" }} />
          ) : (
            <div style={{ width: "58px", height: "58px", borderRadius: "50%", background: `${accentColor}18`, border: `2px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <span style={{ color: accentColor, fontWeight: "800", fontSize: "22px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.2em", textTransform: "uppercase" as const, marginBottom: "8px" }}>{docTitle}</div>
          <div style={{ fontSize: "54px", fontWeight: "900", color: accentColor, letterSpacing: "-1px", lineHeight: "1" }}>{docNumber || "---"}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "14px", fontSize: "12px", color: "#6B7280" }}>
            {issueDate && <span>{ar("Date", "التاريخ")}: <strong style={{ color: "#374151" }}>{issueDate}</strong></span>}
            {dueOrValidityDate && <span>{dueOrValidityLabel}: <strong style={{ color: "#374151" }}>{dueOrValidityDate}</strong></span>}
            <span style={{ color: "#374151", fontWeight: "600" }}>{currency}</span>
          </div>
        </div>
        <div style={{ height: "1px", background: `${accentColor}30`, marginBottom: "32px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "36px" }}>
          <div style={{ textAlign: isAR ? "right" : "left" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "7px" }}>{ar("From", "من")}</div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.email}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "7px" }}>{t("doc.to")}</div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{data.clientInfo.name || "—"}</div>
            {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px" }}>{data.clientInfo.company}</div>}
            {data.clientInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.address}</div>}
            {data.clientInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.email}</div>}
          </div>
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>{ar("Thank you for your business", "شكراً لتعاملكم معنا")}</div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: ELEGANT PREMIUM  (elegant)
   Decorative corner accents, thin-line table, serif-weight typography
   ════════════════════════════════════════════════════════════════════════════ */
function ElegantLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <div style={{ border: `1px solid ${accentColor}40`, margin: "18px", padding: "34px 44px", position: "relative" as const, flexGrow: 1 }}>
      <div style={{ position: "absolute" as const, top: "10px", left: "10px", width: "22px", height: "22px", borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
      <div style={{ position: "absolute" as const, top: "10px", right: "10px", width: "22px", height: "22px", borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />
      <div style={{ position: "absolute" as const, bottom: "10px", left: "10px", width: "22px", height: "22px", borderBottom: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
      <div style={{ position: "absolute" as const, bottom: "10px", right: "10px", width: "22px", height: "22px", borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />
      <div style={{ textAlign: "center", marginBottom: "30px", paddingBottom: "22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "14px" }}>
          <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, transparent, ${accentColor}50)` }} />
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "72px", maxWidth: "170px", objectFit: "contain" }} />
          ) : (
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: `1px solid ${accentColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: accentColor, fontWeight: "700", fontSize: "18px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, ${accentColor}50, transparent)` }} />
        </div>
        <div style={{ fontWeight: "700", fontSize: "15px", color: "#1F2937", letterSpacing: "0.05em" }}>{businessInfo.name || t("doc.business_name")}</div>
        {businessInfo.address && <div style={{ color: "#9CA3AF", fontSize: "11px", marginTop: "2px" }}>{businessInfo.address}</div>}
        {businessInfo.email && <div style={{ color: "#9CA3AF", fontSize: "11px" }}>{businessInfo.email}</div>}
        <div style={{ marginTop: "18px", display: "inline-block" }}>
          <div style={{ color: accentColor, fontSize: "24px", fontWeight: "300", letterSpacing: "0.3em", textTransform: "uppercase" as const, borderBottom: `1px solid ${accentColor}40`, paddingBottom: "7px" }}>{docTitle}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "26px", fontSize: "12px" }}>
        <div>
          <div style={{ fontSize: "9px", color: accentColor, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "5px" }}>{t("doc.to")}</div>
          <div style={{ fontWeight: "600", color: "#1F2937" }}>{data.clientInfo.name || "—"}</div>
          {data.clientInfo.company && <div style={{ color: "#6B7280" }}>{data.clientInfo.company}</div>}
          {data.clientInfo.address && <div style={{ color: "#6B7280" }}>{data.clientInfo.address}</div>}
          {data.clientInfo.email && <div style={{ color: "#6B7280" }}>{data.clientInfo.email}</div>}
        </div>
        <div style={{ textAlign: isAR ? "left" : "right" }}>
          <div style={{ fontSize: "9px", color: accentColor, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "5px" }}>{ar("Details", "التفاصيل")}</div>
          <div style={{ color: "#1F2937" }}>#{docNumber || "---"}</div>
          {issueDate && <div style={{ color: "#6B7280" }}>{issueDate}</div>}
          {dueOrValidityDate && <div style={{ color: "#6B7280" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
          <div style={{ color: "#6B7280" }}>{currency}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
        <div style={{ flex: 1, height: "1px", background: `${accentColor}35` }} />
        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: accentColor, opacity: 0.5 }} />
        <div style={{ flex: 1, height: "1px", background: `${accentColor}35` }} />
      </div>
      <div style={{ marginBottom: "26px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${accentColor}55` }}>
              <th style={{ padding: "8px 0", textAlign: isAR ? "right" : "left", fontWeight: "600", color: accentColor, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{t("doc.item_description")}</th>
              <th style={{ padding: "8px 0", textAlign: "center", fontWeight: "600", color: accentColor, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: "55px" }}>{t("doc.item_qty")}</th>
              <th style={{ padding: "8px 0", textAlign: isAR ? "left" : "right", fontWeight: "600", color: accentColor, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: "90px" }}>{t("doc.item_unit_price")}</th>
              <th style={{ padding: "8px 0", textAlign: isAR ? "left" : "right", fontWeight: "600", color: accentColor, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: "90px" }}>{t("doc.item_total")}</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #F9FAFB" }}>
                <td style={{ padding: "10px 0", color: "#374151" }}>{item.description || "—"}</td>
                <td style={{ padding: "10px 0", textAlign: "center", color: "#6B7280" }}>{item.quantity}</td>
                <td style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{sym} {formatNumber(item.unitPrice)}</td>
                <td style={{ padding: "10px 0", textAlign: isAR ? "left" : "right", fontWeight: "600", color: "#1F2937" }}>{sym} {formatNumber(calcLineItemTotal(item))}</td>
              </tr>
            ))}
            {data.lineItems.length === 0 && (
              <tr><td colSpan={4} style={{ padding: "20px 0", textAlign: "center", color: "#9CA3AF", fontStyle: "italic" }}>{ar("No items added yet", "لا توجد بنود بعد")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <TotalsBlock {...props} />
      <PaymentSection {...props} />
      <NotesPaymentBlock {...props} />
      <SignatureFooter {...props} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: CONSULTING / SERVICES  (consulting)
   Coloured header bar, "Rate / Unit" + "Qty / Hrs" column labelling
   ════════════════════════════════════════════════════════════════════════════ */
function ConsultingLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  const ns = data.numeralStyle || "western";
  const fmt = (n: number) => convertNumerals(formatNumber(n), ns);
  return (
    <>
      <div style={{ background: accentColor, padding: "30px 48px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "72px", maxWidth: "180px", objectFit: "contain", objectPosition: isAR ? "right" : "left", filter: "brightness(0) invert(1) opacity(0.9)", marginBottom: "8px" }} />
            ) : (
              <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                <span style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ color: "white", fontWeight: "700", fontSize: "15px" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px", marginTop: "2px" }}>{businessInfo.address}</div>}
            {businessInfo.email && <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px" }}>{businessInfo.email}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ color: "white", fontSize: "28px", fontWeight: "900", letterSpacing: "0.5px" }}>{docTitle}</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600", fontSize: "14px", marginTop: "5px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginTop: "2px" }}>{ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
          </div>
        </div>
      </div>
      <div style={{ padding: "26px 48px" }}>
        <div style={{ display: "flex", gap: "20px", marginBottom: "28px" }}>
          <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px", ...startBorder }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "4px" }}>{t("doc.to")}</div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{data.clientInfo.name || "—"}</div>
            {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px" }}>{data.clientInfo.company}</div>}
            {data.clientInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.email}</div>}
          </div>
          <div style={{ width: "200px", background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "4px" }}>{ar("Project Details", "تفاصيل المشروع")}</div>
            {docNumber && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}><span style={{ color: "#9CA3AF" }}>{ar("Ref#", "المرجع")}</span><span style={{ fontWeight: "600", color: "#374151" }}>{docNumber}</span></div>}
            {currency && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span style={{ color: "#9CA3AF" }}>{ar("Currency", "العملة")}</span><span style={{ fontWeight: "600", color: "#374151" }}>{currency}</span></div>}
          </div>
        </div>
        <div style={{ marginBottom: "28px", borderRadius: "10px", overflow: "hidden", border: "1px solid #E5E7EB" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: accentColor, color: "white" }}>
                <th style={{ padding: "10px 14px", textAlign: isAR ? "right" : "left", fontWeight: "600" }}>{ar("Service / Description", "الخدمة / الوصف")}</th>
                <th style={{ padding: "10px 10px", textAlign: "center", fontWeight: "600", width: "80px" }}>{ar("Qty / Hrs", "الكمية")}</th>
                <th style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "105px" }}>{ar("Rate / Unit", "السعر / الوحدة")}</th>
                <th style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "70px" }}>{t("doc.item_discount")}</th>
                <th style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "60px" }}>{t("doc.item_tax")}</th>
                <th style={{ padding: "10px 14px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "90px" }}>{t("doc.item_total")}</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? "#FFFFFF" : "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 14px", color: "#374151" }}>{item.description || "—"}</td>
                  <td style={{ padding: "10px 10px", textAlign: "center", color: "#6B7280", fontWeight: "600" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{sym} {fmt(item.unitPrice)}</td>
                  <td style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.discountPct}%</td>
                  <td style={{ padding: "10px 10px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.taxPct}%</td>
                  <td style={{ padding: "10px 14px", textAlign: isAR ? "left" : "right", fontWeight: "600", color: "#111827" }}>{sym} {fmt(calcLineItemTotal(item))}</td>
                </tr>
              ))}
              {data.lineItems.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontStyle: "italic" }}>{ar("Add services above", "أضف الخدمات أعلاه")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: CONSTRUCTION / ENGINEERING  (construction)
   Dark header with accent stripe, "Type" badge column, acceptance block
   ════════════════════════════════════════════════════════════════════════════ */
function ConstructionLayout({ data, accentColor, isAR, t, sym, ar, startBorder }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : "QUOTATION", isInvoice ? "فاتورة" : "عرض أسعار");
  const ns = data.numeralStyle || "western";
  const fmt = (n: number) => convertNumerals(formatNumber(n), ns);
  return (
    <>
      <div style={{ background: "#1A1A2E" }}>
        <div style={{ height: "8px", background: accentColor }} />
        <div style={{ padding: "28px 48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              {businessInfo.logoUrl ? (
                <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "72px", maxWidth: "180px", objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", marginBottom: "8px" }} />
              ) : (
                <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                  <span style={{ color: "white", fontWeight: "900", fontSize: "16px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div style={{ color: "white", fontWeight: "800", fontSize: "15px", letterSpacing: "0.02em" }}>{businessInfo.name || t("doc.business_name")}</div>
              {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", marginTop: "2px" }}>{businessInfo.address}</div>}
              {businessInfo.phone && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>{businessInfo.phone}</div>}
            </div>
            <div style={{ textAlign: isAR ? "left" : "right" }}>
              <div style={{ color: accentColor, fontSize: "30px", fontWeight: "900", letterSpacing: "1px" }}>{docTitle}</div>
              <div style={{ color: "white", fontWeight: "600", fontSize: "14px", marginTop: "5px" }}>#{docNumber || "---"}</div>
              {issueDate && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", marginTop: "2px" }}>{ar("Date", "التاريخ")}: {issueDate}</div>}
              {dueOrValidityDate && <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px", marginTop: "2px" }}>{currency}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: "26px 48px" }}>
        <div style={{ display: "flex", gap: "20px", marginBottom: "28px" }}>
          <div style={{ flex: 1, background: "#FFF8F4", borderRadius: "8px", padding: "14px 18px", borderLeft: isAR ? "none" : `4px solid ${accentColor}`, borderRight: isAR ? `4px solid ${accentColor}` : "none" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "4px" }}>{ar("Client / Project Owner", "العميل / صاحب المشروع")}</div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{data.clientInfo.name || "—"}</div>
            {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px" }}>{data.clientInfo.company}</div>}
            {data.clientInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{ar("Site", "الموقع")}: {data.clientInfo.address}</div>}
          </div>
          <div style={{ width: "220px", background: "#F8FAFC", borderRadius: "8px", padding: "14px 18px" }}>
            {([[ar("Invoice/Quote #", "رقم المستند"), docNumber], [ar("Date", "التاريخ"), issueDate], [dueOrValidityLabel, dueOrValidityDate]] as [string, string | undefined][]).filter(([, v]) => v).map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                <span style={{ color: "#9CA3AF" }}>{l}</span><span style={{ fontWeight: "600", color: "#374151" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "28px", borderRadius: "8px", overflow: "hidden", border: "1px solid #E5E7EB" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#1A1A2E", color: "white" }}>
                <th style={{ padding: "10px 12px", textAlign: isAR ? "right" : "left", fontWeight: "600" }}>{ar("Work Item / Description", "بند العمل / الوصف")}</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "600", width: "60px" }}>{ar("Type", "النوع")}</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: "600", width: "55px" }}>{t("doc.item_qty")}</th>
                <th style={{ padding: "10px 8px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "85px" }}>{t("doc.item_unit_price")}</th>
                <th style={{ padding: "10px 8px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "65px" }}>{t("doc.item_discount")}</th>
                <th style={{ padding: "10px 8px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "55px" }}>{t("doc.item_tax")}</th>
                <th style={{ padding: "10px 12px", textAlign: isAR ? "left" : "right", fontWeight: "600", width: "85px" }}>{t("doc.item_total")}</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? "#FFFFFF" : "#FFFBF7", borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 12px", color: "#374151" }}>{item.description || "—"}</td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: "600", color: accentColor, background: `${accentColor}18`, padding: "2px 6px", borderRadius: "4px" }}>{ar("Labor", "عمالة")}</span>
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "center", color: "#6B7280" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 8px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{sym} {fmt(item.unitPrice)}</td>
                  <td style={{ padding: "10px 8px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.discountPct}%</td>
                  <td style={{ padding: "10px 8px", textAlign: isAR ? "left" : "right", color: "#6B7280" }}>{item.taxPct}%</td>
                  <td style={{ padding: "10px 12px", textAlign: isAR ? "left" : "right", fontWeight: "600", color: "#111827" }}>{sym} {fmt(calcLineItemTotal(item))}</td>
                </tr>
              ))}
              {data.lineItems.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#9CA3AF", fontStyle: "italic" }}>{ar("Add work items above", "أضف بنود العمل أعلاه")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <div style={{ marginTop: "22px", background: "#F8FAFC", borderRadius: "8px", padding: "16px 20px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#374151", marginBottom: "12px" }}>{ar("Acceptance / Signature", "الموافقة / التوقيع")}</div>
          <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: "1px solid #9CA3AF", height: "38px" }} />
              <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "4px" }}>{ar("Client Signature & Date", "توقيع العميل والتاريخ")}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: "1px solid #9CA3AF", height: "38px" }} />
              <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "4px" }}>{ar("Authorized Signature & Stamp", "التوقيع المعتمد والختم")}</div>
            </div>
          </div>
        </div>
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: TWO-COL-HEADER
   Accent title bar across the top; FROM (business) and TO (client) side-by-side
   ════════════════════════════════════════════════════════════════════════════ */
function TwoColHeaderLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <>
      <div style={{ background: accentColor, padding: "14px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "white", fontSize: "20px", fontWeight: "900", letterSpacing: "1.5px" }}>{docTitle}</div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", fontWeight: "600" }}>#{docNumber || "---"}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "2px solid #E5E7EB" }}>
        <div style={{ padding: "28px 40px 24px", borderRight: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: accentColor, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "12px" }}>{ar("FROM", "من")}</div>
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "68px", maxWidth: "180px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "10px" }} />
          ) : (
            <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: `${accentColor}18`, border: `2px solid ${accentColor}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
              <span style={{ color: accentColor, fontWeight: "800", fontSize: "18px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
          {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px", marginTop: "3px" }}>{businessInfo.address}</div>}
          {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.phone}</div>}
          {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.email}</div>}
          {businessInfo.vatNumber && <div style={{ color: "#9CA3AF", fontSize: "11px", marginTop: "4px" }}>{t("doc.vat_number")}: {businessInfo.vatNumber}</div>}
        </div>
        <div style={{ padding: "28px 40px 24px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: accentColor, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "12px" }}>{t("doc.to")}</div>
          <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827", marginBottom: "4px" }}>{data.clientInfo.name || "—"}</div>
          {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px" }}>{data.clientInfo.company}</div>}
          {data.clientInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.address}</div>}
          {data.clientInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.email}</div>}
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #F3F4F6", display: "flex", gap: "24px", flexWrap: "wrap" as const, fontSize: "12px", color: "#6B7280" }}>
            {issueDate && <span>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}: <strong style={{ color: "#374151" }}>{issueDate}</strong></span>}
            {dueOrValidityDate && <span>{dueOrValidityLabel}: <strong style={{ color: "#374151" }}>{dueOrValidityDate}</strong></span>}
            {currency && <span style={{ color: accentColor, fontWeight: "600" }}>{currency}</span>}
          </div>
        </div>
      </div>
      <div style={{ padding: "32px 48px" }}>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: BOLD-HERO
   Giant document number as visual hero on the right; compact company info left
   ════════════════════════════════════════════════════════════════════════════ */
function BoldHeroLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <>
      <div style={{ padding: "44px 48px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "76px", maxWidth: "200px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "12px" }} />
            ) : (
              <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: `${accentColor}15`, border: `2px solid ${accentColor}25`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <span style={{ color: accentColor, fontWeight: "800", fontSize: "20px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#9CA3AF", fontSize: "11px", marginTop: "2px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "#9CA3AF", fontSize: "11px" }}>{businessInfo.phone}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.18em", textTransform: "uppercase" as const, marginBottom: "4px" }}>{docTitle}</div>
            <div style={{ fontSize: "80px", fontWeight: "900", color: accentColor, lineHeight: "0.9", letterSpacing: "-3px" }}>{docNumber || "001"}</div>
          </div>
        </div>
        <div style={{ height: "3px", background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, margin: "20px 0 0" }} />
      </div>
      <div style={{ padding: "24px 48px" }}>
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px", flexWrap: "wrap" as const, alignItems: "flex-start" }}>
          <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px", ...startBorder }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "5px" }}>{t("doc.to")}</div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{data.clientInfo.name || "—"}</div>
            {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px" }}>{data.clientInfo.company}</div>}
            {data.clientInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.address}</div>}
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px", minWidth: "180px" }}>
            {issueDate && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}><span style={{ color: "#9CA3AF" }}>{isInvoice ? t("doc.invoice_date") : ar("Date", "التاريخ")}</span><span style={{ fontWeight: "600", color: "#374151" }}>{issueDate}</span></div>}
            {dueOrValidityDate && <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}><span style={{ color: "#9CA3AF" }}>{dueOrValidityLabel}</span><span style={{ fontWeight: "600", color: "#374151" }}>{dueOrValidityDate}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}><span style={{ color: "#9CA3AF" }}>{ar("Currency", "العملة")}</span><span style={{ fontWeight: "600", color: accentColor }}>{currency}</span></div>
          </div>
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: BILINGUAL-SPLIT
   Left column English LTR / Right column Arabic RTL — truly mirrored header
   ════════════════════════════════════════════════════════════════════════════ */
function BilingualSplitLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR: false, t, sym, ar, startBorder };
  return (
    <div style={{ display: "flex", flexDirection: "column" as const }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ background: accentColor, padding: "28px 36px", direction: "ltr" }}>
          {businessInfo.logoUrl ? (
            <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "64px", maxWidth: "160px", objectFit: "contain", objectPosition: "left", filter: "brightness(0) invert(1) opacity(0.9)", marginBottom: "10px" }} />
          ) : (
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
              <span style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div style={{ color: "white", fontWeight: "800", fontSize: "14px" }}>{businessInfo.name || t("doc.business_name")}</div>
          {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", marginTop: "2px" }}>{businessInfo.address}</div>}
          <div style={{ marginTop: "14px" }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{isInvoice ? "INVOICE" : "QUOTATION"}</div>
            <div style={{ color: "white", fontWeight: "900", fontSize: "22px", marginTop: "2px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}>Date: {issueDate}</div>}
          </div>
        </div>
        <div style={{ background: "#1A1A2E", padding: "28px 36px", direction: "rtl" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: `${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px", marginRight: "auto" }}>
            <span style={{ color: "white", fontWeight: "800", fontSize: "16px", fontFamily: "'Cairo', sans-serif" }}>{(businessInfo.name || "ب").charAt(0)}</span>
          </div>
          <div style={{ color: "white", fontWeight: "800", fontSize: "14px", fontFamily: "'Cairo', sans-serif" }}>{businessInfo.name || "اسم الشركة"}</div>
          {businessInfo.address && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", marginTop: "2px", fontFamily: "'Cairo', sans-serif" }}>{businessInfo.address}</div>}
          <div style={{ marginTop: "14px" }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "9px", fontFamily: "'Cairo', sans-serif" }}>{isInvoice ? "فاتورة" : "عرض أسعار"}</div>
            <div style={{ color: accentColor, fontWeight: "900", fontSize: "22px", marginTop: "2px", fontFamily: "'Cairo', sans-serif" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", fontFamily: "'Cairo', sans-serif" }}>التاريخ: {issueDate}</div>}
          </div>
        </div>
      </div>
      <div style={{ padding: "32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
          <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px", borderLeft: `4px solid ${accentColor}` }} dir="ltr">
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "5px" }}>BILL TO</div>
            <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827" }}>{data.clientInfo.name || "—"}</div>
            {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px" }}>{data.clientInfo.company}</div>}
            {data.clientInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{data.clientInfo.email}</div>}
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px", borderRight: `4px solid ${accentColor}` }} dir="rtl">
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: "5px", fontFamily: "'Cairo', sans-serif" }}>فاتورة إلى</div>
            <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827", fontFamily: "'Cairo', sans-serif" }}>{data.clientInfo.name || "—"}</div>
            {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px", fontFamily: "'Cairo', sans-serif" }}>{data.clientInfo.company}</div>}
            {dueOrValidityDate && <div style={{ color: "#6B7280", fontSize: "12px", fontFamily: "'Cairo', sans-serif" }}>{isInvoice ? "الاستحقاق" : "صالح حتى"}: {dueOrValidityDate}</div>}
          </div>
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: PRICE-LIST
   Standard header; items displayed as 2-column card grid instead of table
   ════════════════════════════════════════════════════════════════════════════ */
function PriceListLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <>
      <div style={{ padding: "36px 48px 28px", borderBottom: `3px solid ${accentColor}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "100px", maxWidth: "240px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "10px" }} />
            ) : (
              <div style={{ width: "60px", height: "60px", borderRadius: "10px", background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                <span style={{ color: accentColor, fontWeight: "800", fontSize: "22px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.address}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ display: "inline-block", background: accentColor, color: "white", fontWeight: "900", fontSize: "13px", letterSpacing: "0.15em", padding: "4px 16px", borderRadius: "4px", marginBottom: "10px" }}>{docTitle}</div>
            <div style={{ fontWeight: "600", fontSize: "15px", color: "#111827" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "#6B7280", fontSize: "12px" }}>{ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "#6B7280", fontSize: "12px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
            <div style={{ color: accentColor, fontWeight: "600", fontSize: "12px" }}>{currency}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "28px 48px" }}>
        <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "14px 18px", marginBottom: "28px", ...startBorder }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "4px" }}>{t("doc.to")}</div>
          <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{data.clientInfo.name || "—"}</div>
          {data.clientInfo.company && <div style={{ color: "#4B5563", fontSize: "12px" }}>{data.clientInfo.company}</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>
          {data.lineItems.length === 0 ? (
            <div style={{ gridColumn: "span 2", padding: "32px", textAlign: "center", color: "#9CA3AF", fontStyle: "italic", border: "2px dashed #E5E7EB", borderRadius: "10px" }}>{ar("No items added yet", "لا توجد بنود بعد")}</div>
          ) : data.lineItems.map((item, i) => (
            <div key={item.id} style={{ border: "1px solid #E5E7EB", borderRadius: "10px", padding: "16px 18px", borderTop: `3px solid ${accentColor}` }}>
              <div style={{ fontWeight: "600", fontSize: "13px", color: "#111827", marginBottom: "8px" }}>{item.description || `${ar("Item", "البند")} ${i + 1}`}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "11px", color: "#9CA3AF" }}>
                  {ar("Qty", "الكمية")}: <span style={{ color: "#374151", fontWeight: "600" }}>{item.quantity}</span>
                  &nbsp;&nbsp;{ar("Rate", "السعر")}: <span style={{ color: "#374151", fontWeight: "600" }}>{sym}{formatNumber(item.unitPrice)}</span>
                </div>
                <div style={{ fontWeight: "800", fontSize: "14px", color: accentColor }}>{sym}{formatNumber(calcLineItemTotal(item))}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: isAR ? "flex-start" : "flex-end", marginBottom: "32px" }}>
          <div style={{ width: "280px" }}>
            {data.totals.discountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.discount_total")}</span><span style={{ color: "#DC2626" }}>− {sym} {formatNumber(data.totals.discountTotal)}</span></div>}
            {data.totals.taxTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px" }}><span style={{ color: "#6B7280" }}>{t("doc.tax_total")}</span><span>+ {sym} {formatNumber(data.totals.taxTotal)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderRadius: "8px", background: `${accentColor}18`, border: `1px solid ${accentColor}30`, marginTop: "8px" }}>
              <span style={{ fontWeight: "700", fontSize: "13px", color: "#111827" }}>{t("doc.grand_total")}</span>
              <span style={{ fontWeight: "800", fontSize: "18px", color: accentColor }}>{sym} {formatNumber(data.totals.grandTotal)}</span>
            </div>
          </div>
        </div>
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: STAMP-BOX
   Classic header + 3 signature/stamp boxes at the bottom for formal documents
   ════════════════════════════════════════════════════════════════════════════ */
function StampBoxLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <>
      <div style={{ height: "6px", background: `linear-gradient(90deg, ${accentColor}, #7C3AED)` }} />
      <div style={{ padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px", marginBottom: "32px" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "110px", maxWidth: "240px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "10px" }} />
            ) : (
              <div style={{ width: "68px", height: "68px", borderRadius: "12px", background: `linear-gradient(135deg, ${accentColor}, #7C3AED)`, marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: "800", fontSize: "26px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.email}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "34px", fontWeight: "800", color: accentColor }}>{docTitle}</div>
            <div style={{ fontWeight: "600", color: "#374151", fontSize: "14px", marginTop: "6px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "#9CA3AF", fontSize: "12px" }}>{ar("Date", "التاريخ")}: {issueDate}</div>}
            {dueOrValidityDate && <div style={{ color: "#9CA3AF", fontSize: "12px" }}>{dueOrValidityLabel}: {dueOrValidityDate}</div>}
            <div style={{ color: "#374151", fontWeight: "600", fontSize: "12px" }}>{currency}</div>
          </div>
        </div>
        <div style={{ height: "1px", background: "#E5E7EB", marginBottom: "28px" }} />
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <div style={{ marginTop: "32px", borderTop: "1px solid #E5E7EB", paddingTop: "28px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "16px" }}>{ar("Signatures & Stamps", "التوقيعات والأختام")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            {([ar("Client Signature", "توقيع العميل"), ar("Official Stamp", "الختم الرسمي"), ar("Authorized Signatory", "المفوض بالتوقيع")] as string[]).map((label, i) => (
              <div key={label}>
                <div style={{ height: "72px", border: `1px dashed ${accentColor}60`, borderRadius: i === 1 ? "50%" : "6px", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: `${accentColor}05` }}>
                  {i === 1 && <div style={{ width: "48px", height: "48px", borderRadius: "50%", border: `1px dashed ${accentColor}80` }} />}
                </div>
                <div style={{ fontSize: "10px", color: "#6B7280", textAlign: "center" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${accentColor}, #7C3AED)` }} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LAYOUT: SPLIT-HEADER
   Thin accent strip + two colored info cards (company tinted / doc dark) then table
   ════════════════════════════════════════════════════════════════════════════ */
function SplitHeaderLayout({ data, accentColor, isAR, t, sym, ar, startBorder, showQuoteDetailsBox }: SharedBodyProps) {
  const { businessInfo, docNumber, issueDate, dueOrValidityDate, dueOrValidityLabel, currency } = data;
  const isInvoice = data.type === "invoice";
  const props: SharedBodyProps = { data, accentColor, isAR, t, sym, ar, startBorder };
  const docTitle = data.customTitle || ar(isInvoice ? "INVOICE" : (data.type === "quotation" ? "QUOTATION" : "RECEIPT"), isInvoice ? "فاتورة" : (data.type === "quotation" ? "عرض أسعار" : "إيصال"));
  return (
    <>
      <div style={{ height: "5px", background: accentColor }} />
      <div style={{ padding: "32px 48px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
          <div style={{ background: `${accentColor}10`, borderRadius: "12px", padding: "22px 24px", border: `1px solid ${accentColor}25` }}>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "64px", maxWidth: "170px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "10px" }} />
            ) : (
              <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                <span style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "11px", marginTop: "3px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "11px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "11px" }}>{businessInfo.email}</div>}
          </div>
          <div style={{ background: "#111827", borderRadius: "12px", padding: "22px 24px" }}>
            <div style={{ color: accentColor, fontSize: "22px", fontWeight: "900", letterSpacing: "0.5px", marginBottom: "6px" }}>{docTitle}</div>
            <div style={{ color: "white", fontWeight: "700", fontSize: "16px" }}>#{docNumber || "---"}</div>
            {issueDate && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginTop: "8px" }}>{ar("Date", "التاريخ")}: <span style={{ color: "rgba(255,255,255,0.9)" }}>{issueDate}</span></div>}
            {dueOrValidityDate && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{dueOrValidityLabel}: <span style={{ color: "rgba(255,255,255,0.9)" }}>{dueOrValidityDate}</span></div>}
            <div style={{ color: accentColor, fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>{currency}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", marginBottom: "28px" }}>
          <BillToPanel {...props} />
          {showQuoteDetailsBox && <QuoteDetailsBox {...props} />}
        </div>
        <LineItemsTable {...props} />
        <TotalsBlock {...props} />
        <PaymentSection {...props} />
        <NotesPaymentBlock {...props} />
        <SignatureFooter {...props} />
      </div>
      <div style={{ height: "4px", background: accentColor }} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN ROUTER — InvoicePreview
   ════════════════════════════════════════════════════════════════════════════ */

export function InvoicePreview(props: InvoicePreviewProps) {
  const { t, isRTL } = useLanguage();
  const { template, type } = props;
  const sym = getCurrencySymbol(props.currency);
  const isInvoice = type === "invoice";

  const renderInfo = template ? TEMPLATE_RENDER_MAP[template] : undefined;
  const forceArabic = renderInfo?.isRTL ?? !!template?.startsWith("arabic");
  const isAR = isRTL || forceArabic;
  const accentColor = getAccentColor(template, isInvoice);
  const ar = (en: string, a: string) => isAR ? a : en;

  // When the document must be Arabic (Arabic template + English UI), use the
  // Arabic translation file directly so every label in every sub-component
  // renders in Arabic regardless of the current UI language setting.
  const tDoc = (key: string) => isAR ? (arTranslations[key] ?? t(key)) : t(key);

  const startBorder: React.CSSProperties = isAR
    ? { borderRight: `4px solid ${accentColor}`, borderLeft: "none" }
    : { borderLeft: `4px solid ${accentColor}`, borderRight: "none" };

  // When an Arabic template is forced but the title is in Latin script (e.g. the
  // English-mode default "INVOICE" / "QUOTATION"), clear it so each layout falls
  // back to the proper Arabic heading.
  const hasArabic = /[\u0600-\u06FF]/.test(props.customTitle || "");
  const resolvedCustomTitle = forceArabic && !hasArabic ? undefined : props.customTitle;

  // Override pre-evaluated labels that were translated by the parent in UI language.
  const resolvedDueLabel = isAR
    ? tDoc(isInvoice ? "doc.due_date" : "quot.validity_date")
    : props.dueOrValidityLabel;

  const propsWithTitle = { ...props, customTitle: resolvedCustomTitle, dueOrValidityLabel: resolvedDueLabel };

  const headerBg = renderInfo?.headerBg;
  const altColor = renderInfo?.altColor;
  const shared: SharedBodyProps = { data: propsWithTitle, accentColor, headerBg, altColor, isAR, t: tDoc, sym, ar, startBorder };
  const sharedWithQuoteBox: SharedBodyProps = { ...shared, showQuoteDetailsBox: !isInvoice };

  const fontFamily = isAR
    ? "'Cairo', 'Noto Sans Arabic', sans-serif"
    : template === "minimal" ? "'Georgia', serif" : "'Inter', sans-serif";

  const resolvedLayout = renderInfo?.layout ?? "classic";

  let content: React.ReactNode;
  if (resolvedLayout === "arabic" || template?.startsWith("arabic")) {
    content = <ArabicLayout {...sharedWithQuoteBox} isAR={true} />;
  } else if (resolvedLayout === "modern-blue") {
    content = <ModernBlueLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "minimal") {
    content = <MinimalLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "bold-corporate") {
    content = <BoldCorporateLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "proposal") {
    content = <ProposalLayout {...shared} showQuoteDetailsBox={false} />;
  } else if (resolvedLayout === "formal-tender") {
    content = <FormalTenderLayout {...shared} />;
  } else if (resolvedLayout === "compact") {
    content = <CompactLayout {...shared} />;
  } else if (resolvedLayout === "sidebar") {
    content = <SidebarLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "top-band") {
    content = <TopBandLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "centered") {
    content = <CenteredLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "elegant") {
    content = <ElegantLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "consulting") {
    content = <ConsultingLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "construction") {
    content = <ConstructionLayout {...shared} />;
  } else if (resolvedLayout === "two-col-header") {
    content = <TwoColHeaderLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "bold-hero") {
    content = <BoldHeroLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "bilingual-split") {
    content = <BilingualSplitLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "price-list") {
    content = <PriceListLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "stamp-box") {
    content = <StampBoxLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "split-header") {
    content = <SplitHeaderLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "dark-header") {
    content = <DarkHeaderLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "gradient") {
    content = <GradientLayout {...sharedWithQuoteBox} />;
  } else if (resolvedLayout === "boxed") {
    content = <BoxedLayout {...sharedWithQuoteBox} />;
  } else {
    content = <ClassicLayout {...sharedWithQuoteBox} />;
  }

  return (
    <div
      id="document-preview"
      dir={isAR ? "rtl" : "ltr"}
      className="bg-white text-gray-900 shadow-xl ring-1 ring-gray-200"
      style={{ width: "794px", minHeight: "1123px", fontFamily, fontSize: "13px", lineHeight: "1.5", display: "flex", flexDirection: "column" }}
    >
      {content}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   RECEIPT PREVIEW
   ════════════════════════════════════════════════════════════════════════════ */

interface ReceiptPreviewProps {
  customTitle?: string;
  template?: string;
  businessInfo: BusinessInfo;
  receiptNumber: string;
  date: string;
  payerName: string;
  amountReceived: number;
  currency: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
}

export function ReceiptPreview({
  customTitle,
  template,
  businessInfo,
  receiptNumber,
  date,
  payerName,
  amountReceived,
  currency,
  paymentMethod,
  referenceNumber,
  notes,
}: ReceiptPreviewProps) {
  const { t, isRTL } = useLanguage();
  const sym = getCurrencySymbol(currency);
  const recRenderInfo = template ? TEMPLATE_RENDER_MAP[template] : undefined;
  const forceArabic = recRenderInfo?.isRTL ?? !!template?.startsWith("arabic");
  const isAR = isRTL || forceArabic;
  const ar = (en: string, a: string) => isAR ? a : en;
  const tDoc = (key: string) => isAR ? (arTranslations[key] ?? t(key)) : t(key);

  const accentColor = recRenderInfo?.accentColor ?? (template === "arabic-receipt" ? "#0F766E" : "#059669");
  const hasArabicTitle = /[\u0600-\u06FF]/.test(customTitle || "");
  const resolvedTitle = forceArabic && !hasArabicTitle ? undefined : customTitle;
  const receiptTitle = resolvedTitle || ar(t("rec.title"), "إيصال");
  const fontFamily = isAR ? "'Cairo', 'Noto Sans Arabic', sans-serif" : "'Inter', sans-serif";

  if (template === "thermal-pos") {
    return (
      <div id="receipt-preview" className="bg-white text-gray-900 shadow-xl ring-1 ring-gray-200"
        style={{ width: "794px", minHeight: "600px", fontFamily: "monospace", fontSize: "13px" }}>
        <div style={{ maxWidth: "340px", margin: "0 auto", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", borderBottom: "1px dashed #6B7280", paddingBottom: "16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: "900", fontSize: "18px", letterSpacing: "2px" }}>{businessInfo.name?.toUpperCase() || "COMPANY NAME"}</div>
            {businessInfo.address && <div style={{ fontSize: "12px", color: "#6B7280" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ fontSize: "12px", color: "#6B7280" }}>{businessInfo.phone}</div>}
          </div>
          <div style={{ fontSize: "12px", color: "#4B5563", marginBottom: "16px" }}>
            {[
              [ar("Receipt #", "رقم الإيصال"), receiptNumber || "---"],
              [ar("Date", "التاريخ"), date],
              [ar("Cashier", "الكاشير"), businessInfo.name || "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{l}:</span><span>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px dashed #6B7280", paddingTop: "12px", marginBottom: "12px", fontSize: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{ar("Received from", "المستلم منه")}</span><span style={{ fontWeight: "600" }}>{payerName || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{ar("Method", "الطريقة")}</span><span>{t(`rec.payment_methods.${paymentMethod}`)}</span>
            </div>
            {referenceNumber && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{ar("Ref", "المرجع")}</span><span>{referenceNumber}</span>
              </div>
            )}
          </div>
          <div style={{ borderTop: "1px dashed #6B7280", borderBottom: "1px dashed #6B7280", padding: "10px 0", margin: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "16px" }}>
              <span>TOTAL</span><span>{sym} {formatNumber(amountReceived)}</span>
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: "11px", color: "#9CA3AF", marginTop: "16px" }}>
            <div>{ar("Thank you!", "شكراً لك!")}</div>
            <div>*** {ar("KEEP FOR YOUR RECORDS", "احتفظ بهذا الإيصال")} ***</div>
          </div>
        </div>
      </div>
    );
  }

  if (template === "digital") {
    return (
      <div id="receipt-preview" className="bg-gray-100 text-gray-900 shadow-xl ring-1 ring-gray-200"
        style={{ width: "794px", minHeight: "600px", fontFamily: "'Inter', sans-serif", fontSize: "13px", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px" }}>
        <div style={{ background: "white", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", width: "380px", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #2563EB, #7C3AED)", padding: "32px 28px", textAlign: "center" }}>
            <div style={{ width: "52px", height: "52px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <span style={{ color: "white", fontSize: "24px" }}>✓</span>
            </div>
            <div style={{ color: "white", fontWeight: "700", fontSize: "18px" }}>{ar("Payment Confirmed", "تم تأكيد الدفع")}</div>
            <div style={{ color: "white", fontWeight: "900", fontSize: "32px", marginTop: "6px" }}>{sym} {formatNumber(amountReceived)}</div>
          </div>
          <div style={{ padding: "24px 28px" }}>
            {[
              [ar("Receipt #", "رقم الإيصال"), receiptNumber || "---"],
              [ar("Date", "التاريخ"), date],
              [ar("From", "من"), businessInfo.name || "—"],
              [ar("To", "إلى"), payerName || "—"],
              [ar("Method", "الطريقة"), t(`rec.payment_methods.${paymentMethod}`)],
              ...(referenceNumber ? [[ar("Reference", "المرجع"), referenceNumber]] : []),
            ].map(([l, v]) => (
              <div key={l as string} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6", fontSize: "13px" }}>
                <span style={{ color: "#9CA3AF" }}>{l}</span>
                <span style={{ fontWeight: "600", color: "#111827" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // full-a4, arabic-receipt, and default
  return (
    <div id="receipt-preview" dir={isAR ? "rtl" : "ltr"}
      className="bg-white text-gray-900 shadow-xl ring-1 ring-gray-200"
      style={{ width: "794px", minHeight: "600px", fontFamily, fontSize: "13px" }}>
      <div style={{ height: "6px", background: `linear-gradient(90deg, ${accentColor}, #10B981)` }} />
      <div style={{ padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            {businessInfo.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="Logo" style={{ height: "120px", maxWidth: "260px", objectFit: "contain", objectPosition: isAR ? "right" : "left", marginBottom: "10px" }} />
            ) : (
              <div style={{ width: "72px", height: "72px", borderRadius: "12px", background: `linear-gradient(135deg, ${accentColor}, #10B981)`, marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontWeight: "800", fontSize: "26px" }}>{(businessInfo.name || "B").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div style={{ fontWeight: "700", fontSize: "16px" }}>{businessInfo.name || t("doc.business_name")}</div>
            {businessInfo.address && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.address}</div>}
            {businessInfo.phone && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.phone}</div>}
            {businessInfo.email && <div style={{ color: "#6B7280", fontSize: "12px" }}>{businessInfo.email}</div>}
          </div>
          <div style={{ textAlign: isAR ? "left" : "right" }}>
            <div style={{ fontSize: "32px", fontWeight: "800", color: accentColor }}>{receiptTitle}</div>
            <div style={{ color: "#374151", fontWeight: "600", fontSize: "14px", marginTop: "6px" }}>#{receiptNumber || "---"}</div>
            <div style={{ color: "#6B7280", fontSize: "12px" }}>{date}</div>
          </div>
        </div>
        <div style={{ height: "1px", background: "#E5E7EB", marginBottom: "24px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
          {[
            { label: t("rec.payer"), value: payerName || "—" },
            { label: t("rec.payment_method"), value: t(`rec.payment_methods.${paymentMethod}`) },
            { label: t("rec.reference"), value: referenceNumber || "—" },
            { label: ar("Currency", "العملة"), value: currency },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#F8FAFC", borderRadius: "8px", padding: "14px 16px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
              <div style={{ fontWeight: "600", color: "#111827" }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", padding: "32px", background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", borderRadius: "12px", border: "1px solid #BBF7D0", marginBottom: "28px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: accentColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>{t("rec.amount")}</div>
          <div style={{ fontSize: "40px", fontWeight: "800", color: "#065F46" }}>{sym} {formatNumber(amountReceived)}</div>
          <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "4px" }}>{currency}</div>
        </div>
        {notes && (
          <div style={{ marginBottom: "20px", borderTop: "1px solid #E5E7EB", paddingTop: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>{t("rec.notes")}</div>
            <p style={{ fontSize: "12px", color: "#4B5563" }}>{notes}</p>
          </div>
        )}
        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "20px", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "20px" }}>{ar("Authorized by", "معتمد من")}</div>
            <div style={{ borderTop: "1px solid #9CA3AF", width: "160px", paddingTop: "4px", fontSize: "12px", color: "#6B7280" }}>{ar("Signature", "التوقيع")}</div>
          </div>
          <div style={{ textAlign: isAR ? "left" : "right", fontSize: "11px", color: "#9CA3AF" }}>
            <div>{ar("Payment Received ✓", "تم الاستلام ✓")}</div>
            <div style={{ fontWeight: "600", color: accentColor }}>Xuvilo</div>
          </div>
        </div>
      </div>
      <div style={{ height: "4px", background: `linear-gradient(90deg, ${accentColor}, #10B981)` }} />
    </div>
  );
}
