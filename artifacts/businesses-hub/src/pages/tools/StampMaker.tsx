import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTracker } from "@/context/TrackerContext";
import { Download, Copy, FileText, Shuffle, ChevronDown, ChevronRight, Upload, X, Link, Sparkles, Brush, Eraser, Undo2, Trash2, ImageIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import { trackEvent } from "@/lib/analytics";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";

/* ───────────────────────────────────── Types ──────────────────────────────── */

type StampMode = "generate" | "upload" | "draw";
type StampShape = "circle" | "oval" | "rounded-square" | "rounded-rect";
type CenterType = "initials" | "logo" | "icon" | "text" | "blank";
type StampEffect = "clean" | "ink" | "worn";
type EffectIntensity = "light" | "medium" | "heavy";

interface StampState {
  shape: StampShape;
  borderRings: 1 | 2 | 3;
  borderThickness: number;
  stampColor: string;
  bgMode: "transparent" | "white" | "custom";
  bgColor: string;
  textColorMode: "match" | "white" | "black" | "custom";
  textColor: string;
  outerText: string;
  outerFont: string;
  outerFontSize: number;
  outerSpacing: number;
  outerStars: boolean;
  innerText: string;
  innerFont: string;
  innerFontSize: number;
  innerSpacing: number;
  innerDividers: boolean;
  centerType: CenterType;
  centerInitials: string;
  centerInitialsSize: number;
  centerLogoUrl: string | null;
  centerIcon: string;
  centerText: string;
  centerTextSize: number;
  innerDecorativeRing: boolean;
  horizontalDividers: boolean;
  dotRing: boolean;
  effect: StampEffect;
  effectIntensity: EffectIntensity;
  mode: StampMode;
  uploadedStampUrl: string | null;
  uploadedStampEffect: StampEffect;
  uploadedStampIntensity: EffectIntensity;
  uploadedStampTint: string | null;
  drawnStampUrl: string | null;
}

/* ──────────────────────────────── Constants ──────────────────────────────── */

const COLOR_PRESETS = [
  { name: "Classic Red", color: "#CC0000" },
  { name: "Navy", color: "#003087" },
  { name: "Forest Green", color: "#1B5E20" },
  { name: "Black", color: "#1A1A1A" },
  { name: "Purple", color: "#4A0080" },
  { name: "Gold", color: "#C9A94A" },
  { name: "Teal", color: "#006666" },
  { name: "Burgundy", color: "#800020" },
];

const FONT_OPTIONS = [
  { id: "Cairo", label: "Cairo", sample: "شركة  ABC" },
  { id: "Montserrat", label: "Montserrat", sample: "COMPANY" },
  { id: "Playfair Display", label: "Playfair", sample: "Company" },
  { id: "Oswald", label: "Oswald", sample: "COMPANY" },
  { id: "Rajdhani", label: "Rajdhani", sample: "Company" },
];

const STAMP_ICONS: Record<string, string> = {
  star: "M 0,-58 L 16,-22 L 55,-18 L 27,9 L 34,48 L 0,28 L -34,48 L -27,9 L -55,-18 L -16,-22 Z",
  crescent: "M 15,-58 Q 58,-38 58,0 Q 58,38 15,58 Q 52,42 52,0 Q 52,-42 15,-58 Z M 6,-22 L 10,-10 L 22,-6 L 10,-2 L 6,10 L 2,-2 L -10,-6 L 2,-10 Z",
  eagle: "M 0,-55 Q 22,-38 38,-18 Q 22,-8 8,-18 L 0,58 L -8,-18 Q -22,-8 -38,-18 Q -22,-38 0,-55 M -55,-28 Q -30,-20 8,-18 M 55,-28 Q 30,-20 -8,-18",
  palm: "M 0,58 L 0,-30 M -5,-15 Q -42,-18 -58,-42 Q -26,-28 0,-15 M 5,-15 Q 38,-22 48,-52 Q 22,-28 0,-15 M -3,-5 Q -28,-5 -38,-22 Q -18,-10 0,-5 M 3,-5 Q 22,-8 32,-22 Q 16,-10 0,-5",
  anchor: "M 0,-55 L 0,48 M -28,48 Q -28,62 0,62 Q 28,62 28,48 M -28,-38 Q -52,-38 -52,-8 Q -52,28 0,28 Q 52,28 52,-8 Q 52,-38 28,-38 M -18,-55 Q -52,-48 -52,-35 Q -52,-18 0,-18 Q 52,-18 52,-35 Q 52,-48 18,-55 Z",
  globe: "M 0,-58 A 58,58 0 1,0 0.1,-58 Z M -58,0 L 58,0 M 0,-58 Q -35,0 0,58 Q 35,0 0,-58 M -50,-30 Q 0,-44 50,-30 M -50,30 Q 0,44 50,30",
  shield: "M 0,-60 L 50,-36 L 50,-2 Q 50,40 0,62 Q -50,40 -50,-2 L -50,-36 Z",
  wheat: "M 0,62 L 0,-62 M -14,28 Q -40,18 -40,-2 Q -20,4 0,4 M 14,28 Q 40,18 40,-2 Q 20,4 0,4 M -14,4 Q -40,-8 -40,-28 Q -20,-20 0,-20 M 14,4 Q 40,-8 40,-28 Q 20,-20 0,-20 M -10,-22 Q -34,-36 -28,-55 Q -10,-40 0,-40 M 10,-22 Q 34,-36 28,-55 Q 10,-40 0,-40",
  handshake: "M -55,0 L -22,-20 L 8,-14 L 28,-24 L 55,0 L 28,20 L -22,14 Z",
  building: "M -40,62 L -40,-52 L 40,-52 L 40,62 M -24,-34 L -24,-16 L -10,-16 L -10,-34 Z M 10,-34 L 10,-16 L 24,-16 L 24,-34 Z M -24,-8 L -24,10 L -10,10 L -10,-8 Z M 10,-8 L 10,10 L 24,10 L 24,-8 Z M -18,62 L -18,32 L 18,32 L 18,62",
  diamond: "M 0,-58 L 44,-10 L 0,58 L -44,-10 Z M -44,-10 L 44,-10 M -22,-34 L 22,-34 M -22,34 L 22,34",
  crown: "M -52,28 L -52,-12 L -28,-42 L 0,-18 L 28,-42 L 52,-12 L 52,28 L -52,28 M -52,28 L 52,28",
};

const DEFAULT_STATE: StampState = {
  shape: "circle",
  borderRings: 2,
  borderThickness: 4,
  stampColor: "#CC0000",
  bgMode: "transparent",
  bgColor: "#FFFFFF",
  textColorMode: "match",
  textColor: "#CC0000",
  outerText: "COMPANY NAME",
  outerFont: "Montserrat",
  outerFontSize: 22,
  outerSpacing: 2,
  outerStars: true,
  innerText: "OFFICIAL SEAL · EST. 2020",
  innerFont: "Montserrat",
  innerFontSize: 14,
  innerSpacing: 1,
  innerDividers: false,
  centerType: "initials",
  centerInitials: "",
  centerInitialsSize: 56,
  centerLogoUrl: null,
  centerIcon: "star",
  centerText: "",
  centerTextSize: 28,
  innerDecorativeRing: true,
  horizontalDividers: false,
  dotRing: false,
  effect: "clean",
  effectIntensity: "medium",
  mode: "generate",
  uploadedStampUrl: null,
  uploadedStampEffect: "clean",
  uploadedStampIntensity: "medium",
  uploadedStampTint: null,
  drawnStampUrl: null,
};

const PRESETS: { label: string; labelAR: string; state: Partial<StampState> }[] = [
  {
    label: "Classic Arabic",
    labelAR: "عربي كلاسيكي",
    state: { shape: "circle", borderRings: 2, stampColor: "#CC0000", outerText: "اسم الشركة", innerText: "المدينة · المملكة العربية السعودية", centerType: "icon", centerIcon: "crescent", effect: "worn", outerFont: "Cairo", innerFont: "Cairo", outerStars: true, innerDecorativeRing: true },
  },
  {
    label: "Modern Corporate",
    labelAR: "شركات عصري",
    state: { shape: "circle", borderRings: 1, stampColor: "#003087", outerText: "COMPANY NAME", innerText: "REGISTERED · SINCE 2010", centerType: "initials", effect: "clean", outerStars: false, innerDividers: false },
  },
  {
    label: "Government Official",
    labelAR: "حكومي رسمي",
    state: { shape: "circle", borderRings: 3, stampColor: "#003087", outerText: "وزارة الشؤون الرسمية", innerText: "OFFICIAL · AUTHORIZED", centerType: "icon", centerIcon: "eagle", effect: "clean", outerFont: "Cairo", innerFont: "Montserrat", outerStars: false, innerDecorativeRing: true },
  },
  {
    label: "Logistics & Trade",
    labelAR: "لوجستيك وتجارة",
    state: { shape: "circle", borderRings: 1, stampColor: "#006666", outerText: "LOGISTICS & TRADE CO.", innerText: "CERTIFIED · INTERNATIONAL", centerType: "icon", centerIcon: "anchor", effect: "clean", outerStars: false },
  },
  {
    label: "Legal & Law",
    labelAR: "قانوني",
    state: { shape: "rounded-square", borderRings: 2, stampColor: "#1A1A1A", outerText: "LAW FIRM NAME", innerText: "ATTORNEYS AT LAW", centerType: "initials", effect: "clean", outerStars: false, innerDecorativeRing: false },
  },
  {
    label: "NGO / Organization",
    labelAR: "منظمة غير ربحية",
    state: { shape: "circle", borderRings: 1, stampColor: "#1B5E20", outerText: "ORGANIZATION NAME", innerText: "FOR THE PUBLIC GOOD", centerType: "icon", centerIcon: "globe", effect: "clean" },
  },
  {
    label: "Vintage Trader",
    labelAR: "تاجر عريق",
    state: { shape: "circle", borderRings: 2, stampColor: "#800020", outerText: "التاجر العريق", innerText: "منذ ١٩٨٥ · تراث وأصالة", centerType: "icon", centerIcon: "star", effect: "worn", effectIntensity: "medium", outerFont: "Cairo", innerFont: "Cairo", outerStars: true },
  },
  {
    label: "Gold Executive",
    labelAR: "تنفيذي ذهبي",
    state: { shape: "circle", borderRings: 2, stampColor: "#C9A94A", outerText: "EXECUTIVE GROUP", innerText: "AUTHORIZED SIGNATURE", centerType: "icon", centerIcon: "crown", effect: "clean", textColorMode: "match", innerDecorativeRing: true },
  },
];

/* ─────────────────────────────── Helpers ──────────────────────────────────── */

function isArabicText(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function getInitials(name: string): string {
  if (!name) return "CO";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function resolvedTextColor(s: StampState): string {
  if (s.textColorMode === "match") return s.stampColor;
  if (s.textColorMode === "white") return "#FFFFFF";
  if (s.textColorMode === "black") return "#000000";
  return s.textColor;
}

/* ──────────────────────────── SVG Generator ──────────────────────────────── */

function generateStampSVG(s: StampState, size = 400): string {
  const cx = size / 2, cy = size / 2;
  const scale = size / 400;

  function sc(v: number) { return v * scale; }

  const color = s.stampColor;
  const textCol = resolvedTextColor(s);
  const bgFill = s.bgMode === "white" ? "white" : s.bgMode === "custom" ? s.bgColor : "none";

  const baseR = sc(185);
  const th = sc(s.borderThickness);
  const ringGap = th + sc(4);
  const firstR = baseR;
  const secondR = firstR - ringGap;
  const thirdR = secondR - ringGap;

  // Innermost border radius (used as the bound for the text arc).
  const innerBorderR =
    s.borderRings === 3 ? thirdR : s.borderRings === 2 ? secondR : firstR;

  // For non-circular shapes the text would otherwise be drawn on a circle that
  // pokes past the straight edges of the square / rectangle. Clamp the text
  // arc radius to the *vertical* half-extent of the bounding shape so the
  // curved text stays fully inside the visible border.
  const verticalHalfExtent =
    s.shape === "rounded-square" ? innerBorderR * 0.8
    : s.shape === "rounded-rect" ? innerBorderR
    : s.shape === "oval" ? innerBorderR
    : innerBorderR;

  const outerTextR = verticalHalfExtent - sc(12);
  const innerTextR = outerTextR - sc(28);
  const decorR = innerTextR - sc(6);
  const centerR = decorR - sc(8);

  const outerFontFamily = isArabicText(s.outerText) ? "Cairo" : s.outerFont;
  const innerFontFamily = isArabicText(s.innerText) ? "Cairo" : s.innerFont;

  let filterDef = "";
  let filterRef = "";
  if (s.effect !== "clean") {
    const base = s.effect === "worn" ? 0.85 : 0.65;
    const intensity = s.effectIntensity === "light" ? 3 : s.effectIntensity === "medium" ? 6 : 11;
    filterDef = `<filter id="stampFx" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="${base}" numOctaves="4" result="noise" seed="42"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${intensity * scale}" xChannelSelector="R" yChannelSelector="G" result="disp"/>
      ${s.effect === "worn" ? `<feComponentTransfer in="disp"><feFuncA type="table" tableValues="0 0 0.4 0.7 0.85 0.95 1"/></feComponentTransfer>` : ""}
    </filter>`;
    filterRef = ` filter="url(#stampFx)"`;
  }

  function getBorderShape(r: number): string {
    if (s.shape === "oval") {
      return `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.25}" ry="${r}" stroke="${color}" stroke-width="${th}" fill="none"/>`;
    }
    if (s.shape === "rounded-square") {
      const side = r * 1.6;
      return `<rect x="${cx - side / 2}" y="${cy - side / 2}" width="${side}" height="${side}" rx="${sc(18)}" stroke="${color}" stroke-width="${th}" fill="none"/>`;
    }
    if (s.shape === "rounded-rect") {
      const hw = r * 1.5, hh = r;
      return `<rect x="${cx - hw}" y="${cy - hh}" width="${hw * 2}" height="${hh * 2}" rx="${sc(14)}" stroke="${color}" stroke-width="${th}" fill="none"/>`;
    }
    return `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${color}" stroke-width="${th}" fill="none"/>`;
  }

  const topArcPath = `M ${cx - outerTextR},${cy} A ${outerTextR},${outerTextR} 0 1,0 ${cx + outerTextR},${cy}`;
  const botArcPath = `M ${cx - innerTextR},${cy} A ${innerTextR},${innerTextR} 0 0,1 ${cx + innerTextR},${cy}`;

  const outerDisplayText = s.outerStars ? `★  ${s.outerText}  ★` : s.outerText;
  const innerDisplayText = s.innerDividers ? `◆  ${s.innerText}  ◆` : s.innerText;

  let centerContent = "";
  if (s.centerType === "initials") {
    const initials = s.centerInitials || getInitials(s.outerText);
    const fontFam = isArabicText(initials) ? "Cairo" : s.outerFont;
    centerContent = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="${fontFam}, sans-serif" font-size="${sc(s.centerInitialsSize)}" font-weight="bold" fill="${textCol}" letter-spacing="-1">${escapeXml(initials)}</text>`;
  } else if (s.centerType === "icon") {
    const iconPath = STAMP_ICONS[s.centerIcon] || STAMP_ICONS.star;
    const iconScale = centerR / 70;
    const useStroke = ["anchor", "globe", "wheat", "handshake", "building", "eagle", "palm"].includes(s.centerIcon);
    centerContent = `<g transform="translate(${cx},${cy}) scale(${iconScale})">
      <path d="${iconPath}" ${useStroke ? `fill="none" stroke="${textCol}" stroke-width="${2 / iconScale}" stroke-linejoin="round" stroke-linecap="round"` : `fill="${textCol}"`}/>
    </g>`;
  } else if (s.centerType === "text" && s.centerText) {
    const fontFam = isArabicText(s.centerText) ? "Cairo" : s.outerFont;
    centerContent = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="${fontFam}, sans-serif" font-size="${sc(s.centerTextSize)}" font-weight="bold" fill="${textCol}">${escapeXml(s.centerText)}</text>`;
  } else if (s.centerType === "logo" && s.centerLogoUrl) {
    const r = centerR - sc(8);
    centerContent = `<defs><clipPath id="logoClip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
      <image href="${s.centerLogoUrl}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const dots = s.dotRing
    ? Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const dr = (outerTextR + innerTextR) / 2;
        return `<circle cx="${(cx + dr * Math.cos(angle)).toFixed(1)}" cy="${(cy + dr * Math.sin(angle)).toFixed(1)}" r="${sc(2)}" fill="${color}"/>`;
      }).join("")
    : "";

  // NOTE: "&" must be escaped as "&amp;" — this SVG is also loaded as a
  // standalone XML document (via blob URL -> <img>) during PNG/PDF export,
  // and a raw "&" makes the XML ill-formed, breaking the export.
  const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&amp;family=Montserrat:wght@700&amp;family=Playfair+Display:wght@700&amp;family=Oswald:wght@600&amp;family=Rajdhani:wght@600&amp;display=swap');`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <style>${fontImport}</style>
    ${filterDef}
    <path id="topArc_${size}" d="${topArcPath}" fill="none"/>
    <path id="botArc_${size}" d="${botArcPath}" fill="none"/>
  </defs>
  ${bgFill !== "none" ? `<rect width="${size}" height="${size}" fill="${bgFill}"/>` : ""}
  <g${filterRef}>
    ${getBorderShape(firstR)}
    ${s.borderRings >= 2 ? getBorderShape(secondR) : ""}
    ${s.borderRings >= 3 ? getBorderShape(thirdR) : ""}
    ${s.innerDecorativeRing ? `<circle cx="${cx}" cy="${cy}" r="${decorR}" stroke="${color}" stroke-width="${sc(1)}" fill="none" opacity="0.65"/>` : ""}
    ${dots}
    ${s.horizontalDividers
      ? `<line x1="${cx + sc(18)}" y1="${cy}" x2="${cx + centerR - sc(6)}" y2="${cy}" stroke="${color}" stroke-width="${sc(1.5)}" opacity="0.6"/>
         <line x1="${cx - sc(18)}" y1="${cy}" x2="${cx - centerR + sc(6)}" y2="${cy}" stroke="${color}" stroke-width="${sc(1.5)}" opacity="0.6"/>`
      : ""}
    ${s.outerText
      ? `<text font-family="${outerFontFamily}, sans-serif" font-size="${sc(s.outerFontSize)}" fill="${textCol}" font-weight="bold" letter-spacing="${s.outerSpacing}">
          <textPath href="#topArc_${size}" startOffset="50%" text-anchor="middle">${escapeXml(outerDisplayText)}</textPath>
        </text>`
      : ""}
    ${s.innerText
      ? `<text font-family="${innerFontFamily}, sans-serif" font-size="${sc(s.innerFontSize)}" fill="${textCol}" font-weight="600" letter-spacing="${s.innerSpacing}">
          <textPath href="#botArc_${size}" startOffset="50%" text-anchor="middle" dy="${sc(-4)}">${escapeXml(innerDisplayText)}</textPath>
        </text>`
      : ""}
    ${centerContent}
  </g>
</svg>`;
}

/* ─────────────────────── Uploaded-stamp Effect SVG ──────────────────────── */

function buildUploadedStampSVG(s: StampState, size = 400): string {
  if (!s.uploadedStampUrl) return "";
  const useFx = s.uploadedStampEffect !== "clean";
  const base = s.uploadedStampEffect === "worn" ? 0.85 : 0.65;
  const intensity = s.uploadedStampIntensity === "light" ? 3 : s.uploadedStampIntensity === "medium" ? 6 : 11;
  const tint = s.uploadedStampTint;

  // Build a SINGLE filter chain so tint + texture compose reliably across browsers.
  const primitives: string[] = [];
  let lastResult = "SourceGraphic";

  if (tint) {
    const r = parseInt(tint.slice(1, 3), 16) / 255;
    const g = parseInt(tint.slice(3, 5), 16) / 255;
    const b = parseInt(tint.slice(5, 7), 16) / 255;
    primitives.push(
      `<feColorMatrix in="${lastResult}" type="matrix" values="
        0 0 0 0 ${r}
        0 0 0 0 ${g}
        0 0 0 0 ${b}
        0 0 0 1 0" result="tinted"/>`
    );
    lastResult = "tinted";
  }

  if (useFx) {
    primitives.push(`<feTurbulence type="fractalNoise" baseFrequency="${base}" numOctaves="4" result="noise" seed="42"/>`);
    primitives.push(
      `<feDisplacementMap in="${lastResult}" in2="noise" scale="${intensity}" xChannelSelector="R" yChannelSelector="G" result="disp"/>`
    );
    lastResult = "disp";
    if (s.uploadedStampEffect === "worn") {
      primitives.push(
        `<feComponentTransfer in="${lastResult}" result="worn"><feFuncA type="table" tableValues="0 0 0.4 0.7 0.85 0.95 1"/></feComponentTransfer>`
      );
      lastResult = "worn";
    }
  }

  const hasFilter = primitives.length > 0;
  const filterDef = hasFilter
    ? `<filter id="uplFx" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">${primitives.join("")}</filter>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>${filterDef}</defs>
    <image href="${s.uploadedStampUrl}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"${hasFilter ? ` filter="url(#uplFx)"` : ""}/>
  </svg>`;
}

/* ──────────────────────────── Export Helpers ─────────────────────────────── */

async function svgToCanvas(svgString: string, size: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load stamp SVG for export (SVG may be malformed)"));
    };
    img.src = url;
  });
}

function downloadFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

/* ─────────────────────────── UI Sub-components ──────────────────────────── */

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-2">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && <div className="p-4 bg-white dark:bg-gray-900 space-y-3">{children}</div>}
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue-600 cursor-pointer" />
    </div>
  );
}

/* ──────────────────────────── Main Component ─────────────────────────────── */

export default function StampMaker() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const { addDoc } = useTracker();
  const [, navigate] = useLocation();
  const [stamp, setStamp] = useState<StampState>(DEFAULT_STATE);

  // Warn before leaving with unexported edits. The design only lives in
  // memory, so "saved" means the user exported it (PNG/SVG/PDF download or
  // Use in Documents) — markClean() runs after each of those.
  const stampSnapshot = JSON.stringify(stamp);
  const { markClean, isDirty, dialog, requestLeave } = useUnsavedChangesWarning(stampSnapshot);

  // Programmatic navigation (button onClick → navigate) bypasses the hook's
  // anchor-click interception, so gate it explicitly.
  const guardedNavigate = (href: string) => {
    requestLeave(() => navigate(href));
  };
  const [copied, setCopied] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampUploadInputRef = useRef<HTMLInputElement>(null);

  // Drawing state
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [brushColor, setBrushColor] = useState("#CC0000");
  const [brushSize, setBrushSize] = useState(6);
  const [drawTool, setDrawTool] = useState<"brush" | "eraser">("brush");
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  const set = useCallback((partial: Partial<StampState>) => {
    setStamp((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setStamp((prev) => ({ ...prev, ...preset.state, mode: "generate" }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set({ centerType: "logo", centerLogoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set({ uploadedStampUrl: ev.target?.result as string, mode: "upload" });
    reader.readAsDataURL(file);
  };

  /* ── Drawing canvas handlers ──────────────────────────────────────────── */
  // Canvas stays transparent natively (CSS gives it a white background visually)
  // so transparent exports don't need lossy white-pixel removal.
  const setupDrawCanvas = useCallback((restoreUrl: string | null) => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, c.width, c.height);
    if (restoreUrl) {
      // Restore the canvas content after a tab round-trip.
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        historyRef.current = [ctx.getImageData(0, 0, c.width, c.height)];
      };
      img.onerror = () => {
        // Stale or corrupted dataURL — fall back to a clean baseline so
        // undo/clear keep working instead of operating on an uninitialized canvas.
        ctx.clearRect(0, 0, c.width, c.height);
        historyRef.current = [ctx.getImageData(0, 0, c.width, c.height)];
      };
      img.src = restoreUrl;
    } else if (historyRef.current.length === 0) {
      historyRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    }
  }, []);

  useEffect(() => {
    if (stamp.mode === "draw") {
      // setup runs after canvas mounts; restore previous drawing if any.
      requestAnimationFrame(() => setupDrawCanvas(stamp.drawnStampUrl));
    } else {
      // Reset stroke state if user switches mid-stroke so the canvas
      // doesn't keep a dangling pointer-down on remount.
      isDrawingRef.current = false;
      lastPtRef.current = null;
    }
    // We intentionally read stamp.drawnStampUrl only when the mode flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp.mode, setupDrawCanvas]);

  // Cleanup on unmount of the whole component
  useEffect(() => {
    return () => {
      isDrawingRef.current = false;
      lastPtRef.current = null;
      historyRef.current = [];
    };
  }, []);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = drawCanvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const applyDrawComposite = (ctx: CanvasRenderingContext2D) => {
    if (drawTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
    }
  };

  const onDrawPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    try { c.setPointerCapture(e.pointerId); } catch {}
    isDrawingRef.current = true;
    const p = getCanvasPoint(e);
    lastPtRef.current = p;
    applyDrawComposite(ctx);
    ctx.beginPath();
    ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const onDrawPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx || !lastPtRef.current) return;
    const p = getCanvasPoint(e);
    applyDrawComposite(ctx);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPtRef.current = p;
  };

  const onDrawPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPtRef.current = null;
    const c = drawCanvasRef.current;
    if (!c) return;
    try { c.releasePointerCapture(e.pointerId); } catch {}
    const ctx = c.getContext("2d")!;
    historyRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
    set({ drawnStampUrl: c.toDataURL("image/png") });
  };

  const handleDrawUndo = () => {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const c = drawCanvasRef.current!;
    const ctx = c.getContext("2d")!;
    const last = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(last, 0, 0);
    set({ drawnStampUrl: c.toDataURL("image/png") });
  };

  const handleDrawClear = () => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, c.width, c.height);
    historyRef.current = [ctx.getImageData(0, 0, c.width, c.height)];
    set({ drawnStampUrl: null });
  };

  const svgString = generateStampSVG(stamp, 400);

  /* ── Build a high-res canvas of whatever the current mode is ───────────── */
  const buildExportCanvas = async (size: number, transparent: boolean): Promise<HTMLCanvasElement | null> => {
    if (stamp.mode === "generate") {
      const hi = generateStampSVG({ ...stamp, bgMode: transparent ? "transparent" : "white" }, size);
      const canvas = await svgToCanvas(hi, size);
      if (!transparent) {
        const ctx = canvas.getContext("2d")!;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);
      }
      return canvas;
    }
    if (stamp.mode === "upload") {
      if (!stamp.uploadedStampUrl) return null;
      const svg = buildUploadedStampSVG(stamp, size);
      const canvas = await svgToCanvas(svg, size);
      if (!transparent) {
        const ctx = canvas.getContext("2d")!;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, size, size);
      }
      return canvas;
    }
    // draw mode — drawing canvas is natively transparent
    const src = drawCanvasRef.current;
    if (!src) return null;
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d")!;
    if (!transparent) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
    }
    ctx.drawImage(src, 0, 0, size, size);
    return out;
  };

  const exportTitle = stamp.mode === "generate" ? (stamp.outerText || "Stamp")
    : stamp.mode === "upload" ? "Uploaded Stamp"
    : "Drawn Stamp";

  const handleDownloadPNG = async (transparent: boolean) => {
    const canvas = await buildExportCanvas(1000, transparent);
    if (!canvas) return;
    const fn = transparent ? "stamp-transparent.png" : "stamp-white.png";
    downloadFile(canvas.toDataURL("image/png"), fn);
    addDoc({ type: "stamp", title: exportTitle, subtitle: `PNG (${transparent ? "transparent" : "white"} bg)`, fileName: fn });
    trackEvent("stamp_export", { format: "png", language: lang });
    markClean();
  };

  const handleDownloadSVG = () => {
    let svg: string;
    if (stamp.mode === "generate") svg = generateStampSVG(stamp, 400);
    else if (stamp.mode === "upload" && stamp.uploadedStampUrl) svg = buildUploadedStampSVG(stamp, 400);
    else if (stamp.mode === "draw" && stamp.drawnStampUrl) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><image href="${stamp.drawnStampUrl}" x="0" y="0" width="400" height="400"/></svg>`;
    } else return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    downloadFile(URL.createObjectURL(blob), "stamp.svg");
    addDoc({ type: "stamp", title: exportTitle, subtitle: "SVG format", fileName: "stamp.svg" });
    trackEvent("stamp_export", { format: "svg", language: lang });
    markClean();
  };

  const handleDownloadPDF = async () => {
    const canvas = await buildExportCanvas(800, false);
    if (!canvas) return;
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const marginX = (210 - 100) / 2;
    const marginY = (297 - 100) / 2;
    pdf.addImage(imgData, "PNG", marginX, marginY, 100, 100);
    pdf.save("stamp.pdf");
    addDoc({ type: "stamp", title: exportTitle, subtitle: "PDF format", fileName: "stamp.pdf" });
    trackEvent("stamp_export", { format: "pdf", language: lang });
    markClean();
  };

  const handleCopy = async () => {
    const canvas = await buildExportCanvas(800, true);
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        downloadFile(canvas.toDataURL("image/png"), "stamp.png");
      }
    }, "image/png");
  };

  const handleSaveToDocuments = async () => {
    const canvas = await buildExportCanvas(400, true);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const wrapperSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><image href="${dataUrl}" x="0" y="0" width="400" height="400"/></svg>`;
    localStorage.setItem("savedStamp", JSON.stringify({ svg: wrapperSvg, color: stamp.stampColor, savedAt: Date.now() }));
    markClean();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const handleRandomize = () => {
    const colors = COLOR_PRESETS.map((c) => c.color);
    const icons = Object.keys(STAMP_ICONS);
    const effects: StampEffect[] = ["clean", "clean", "ink", "worn"];
    set({
      stampColor: colors[Math.floor(Math.random() * colors.length)],
      centerIcon: icons[Math.floor(Math.random() * icons.length)],
      centerType: Math.random() > 0.5 ? "icon" : "initials",
      effect: effects[Math.floor(Math.random() * effects.length)],
    });
  };

  const t = (en: string, ar: string) => isAR ? ar : en;

  return (
    <AppLayout>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("Free Company Stamp / Seal Maker", "صانع أختام الشركات مجاناً")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("Create professional company stamps in Arabic & English — instant PNG, SVG & PDF export", "أنشئ ختم شركتك الاحترافي بالعربي والإنجليزي — تصدير فوري بصيغ PNG وSVG وPDF")}
          </p>
        </div>
      </div>

      {/* Tool Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: Controls ───────────────────────────────────────── */}
          <div className="lg:w-[42%] space-y-0">

            {/* Mode Selector */}
            <div className="mb-3 grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              {([
                { id: "generate", icon: Sparkles, en: "Generate", ar: "إنشاء" },
                { id: "upload", icon: ImageIcon, en: "Upload", ar: "رفع" },
                { id: "draw", icon: Brush, en: "Draw", ar: "رسم" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => set({ mode: m.id as StampMode })}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    stamp.mode === m.id
                      ? "bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <m.icon size={16} />
                  {t(m.en, m.ar)}
                </button>
              ))}
            </div>

            {/* ── Upload-mode controls ─────────────────────────────────── */}
            {stamp.mode === "upload" && (
              <div className="space-y-3 mb-3">
                <AccordionSection title={t("Upload your stamp image", "ارفع صورة ختمك")} defaultOpen={true}>
                  <input
                    ref={stampUploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleStampUpload}
                  />
                  {stamp.uploadedStampUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <img src={stamp.uploadedStampUrl} alt="Stamp" className="w-20 h-20 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white" />
                        <div className="flex-1">
                          <button
                            onClick={() => stampUploadInputRef.current?.click()}
                            className="w-full text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                          >
                            {t("Replace image", "استبدال الصورة")}
                          </button>
                          <button
                            onClick={() => set({ uploadedStampUrl: null, uploadedStampTint: null, uploadedStampEffect: "clean" })}
                            className="w-full mt-1.5 text-xs px-3 py-1.5 rounded-md border border-red-200 dark:border-red-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            {t("Remove", "إزالة")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => stampUploadInputRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex flex-col items-center justify-center gap-2"
                    >
                      <Upload size={22} />
                      <span>{t("Click to upload PNG / JPG / SVG", "انقر لرفع PNG / JPG / SVG")}</span>
                      <span className="text-[10px] text-gray-400">{t("Square image works best", "الصور المربعة هي الأفضل")}</span>
                    </button>
                  )}
                </AccordionSection>

                {stamp.uploadedStampUrl && (
                  <AccordionSection title={t("After-effects", "تأثيرات إضافية")} defaultOpen={true}>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Texture", "النسيج")}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["clean", "ink", "worn"] as StampEffect[]).map((ef) => (
                          <button
                            key={ef}
                            onClick={() => set({ uploadedStampEffect: ef })}
                            className={`py-2 text-xs font-medium rounded-md border transition-all ${stamp.uploadedStampEffect === ef ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"}`}
                          >
                            {ef === "clean" ? t("Clean", "نظيف") : ef === "ink" ? t("Ink", "حبر") : t("Worn", "قديم")}
                          </button>
                        ))}
                      </div>
                    </div>
                    {stamp.uploadedStampEffect !== "clean" && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Intensity", "الشدة")}</p>
                        <div className="flex gap-2">
                          {(["light", "medium", "heavy"] as EffectIntensity[]).map((lv) => (
                            <button
                              key={lv}
                              onClick={() => set({ uploadedStampIntensity: lv })}
                              className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${stamp.uploadedStampIntensity === lv ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                            >
                              {lv === "light" ? t("Light", "خفيف") : lv === "medium" ? t("Medium", "متوسط") : t("Heavy", "ثقيل")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Recolor (tint)", "إعادة تلوين")}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          onClick={() => set({ uploadedStampTint: null })}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-all ${!stamp.uploadedStampTint ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                        >
                          {t("Original", "أصلي")}
                        </button>
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c.color}
                            title={c.name}
                            onClick={() => set({ uploadedStampTint: c.color })}
                            style={{ backgroundColor: c.color }}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${stamp.uploadedStampTint === c.color ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`}
                          />
                        ))}
                        <input
                          type="color"
                          value={stamp.uploadedStampTint || "#CC0000"}
                          onChange={(e) => set({ uploadedStampTint: e.target.value })}
                          className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer"
                          title={t("Custom tint", "لون مخصص")}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {t("Tip: tint works best on solid black or single-color stamps.", "ملاحظة: يعمل التلوين بشكل أفضل مع الأختام السوداء أو أحادية اللون.")}
                      </p>
                    </div>
                  </AccordionSection>
                )}
              </div>
            )}

            {/* ── Draw-mode controls ───────────────────────────────────── */}
            {stamp.mode === "draw" && (
              <div className="space-y-3 mb-3">
                <AccordionSection title={t("Draw your own stamp", "ارسم ختمك بنفسك")} defaultOpen={true}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("Use the canvas on the right to paint your stamp freehand. Your stroke is exported as PNG / SVG / PDF.", "استخدم لوحة الرسم على اليمين لرسم ختمك يدوياً. سيتم تصدير الرسم بصيغ PNG و SVG و PDF.")}
                  </p>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Tool", "الأداة")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDrawTool("brush")}
                        className={`flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-md border transition-all ${drawTool === "brush" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                      >
                        <Brush size={14} /> {t("Brush", "فرشاة")}
                      </button>
                      <button
                        onClick={() => setDrawTool("eraser")}
                        className={`flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-md border transition-all ${drawTool === "eraser" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                      >
                        <Eraser size={14} /> {t("Eraser", "ممحاة")}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Brush color", "لون الفرشاة")}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.color}
                          title={c.name}
                          onClick={() => { setBrushColor(c.color); setDrawTool("brush"); }}
                          style={{ backgroundColor: c.color }}
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${brushColor === c.color && drawTool === "brush" ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => { setBrushColor(e.target.value); setDrawTool("brush"); }}
                        className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer"
                        title={t("Custom color", "لون مخصص")}
                      />
                    </div>
                  </div>
                  <SliderRow
                    label={t("Brush size", "حجم الفرشاة")}
                    value={brushSize}
                    min={1}
                    max={40}
                    onChange={setBrushSize}
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleDrawUndo}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Undo2 size={14} /> {t("Undo", "تراجع")}
                    </button>
                    <button
                      onClick={handleDrawClear}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md border border-red-200 dark:border-red-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} /> {t("Clear", "مسح")}
                    </button>
                  </div>
                </AccordionSection>
              </div>
            )}

            {/* ── Generate-mode controls (existing) ────────────────────── */}
            {stamp.mode === "generate" && (
            <>

            {/* Presets */}
            <AccordionSection title={t("Quick Presets", "القوالب الجاهزة")} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => applyPreset(p)}
                    className="text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all text-xs font-medium text-gray-700 dark:text-gray-200">
                    {isAR ? p.labelAR : p.label}
                  </button>
                ))}
              </div>
            </AccordionSection>

            {/* Shape & Size */}
            <AccordionSection title={t("1. Shape & Border", "١. الشكل والحدود")} defaultOpen={true}>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Shape", "الشكل")}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["circle", "oval", "rounded-square", "rounded-rect"] as StampShape[]).map((shape) => (
                    <button key={shape} onClick={() => set({ shape })}
                      className={`py-2 rounded-md text-xs font-medium border transition-all ${stamp.shape === shape ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                      {shape === "circle" ? t("Circle", "دائري") : shape === "oval" ? t("Oval", "بيضاوي") : shape === "rounded-square" ? t("Square", "مربع") : t("Rect", "مستطيل")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Border Rings", "الحلقات")}</p>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button key={n} onClick={() => set({ borderRings: n as 1 | 2 | 3 })}
                      className={`flex-1 py-2 rounded-md text-sm font-semibold border transition-all ${stamp.borderRings === n ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow label={t("Border Thickness", "سُمك الحدود")} value={stamp.borderThickness} min={1} max={12} step={1} onChange={(v) => set({ borderThickness: v })} />
            </AccordionSection>

            {/* Colors */}
            <AccordionSection title={t("2. Colors", "٢. الألوان")} defaultOpen={true}>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Stamp Color", "لون الختم")}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COLOR_PRESETS.map((c) => (
                    <button key={c.color} title={c.name} onClick={() => set({ stampColor: c.color })}
                      style={{ backgroundColor: c.color }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${stamp.stampColor === c.color ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`} />
                  ))}
                  <input type="color" value={stamp.stampColor} onChange={(e) => set({ stampColor: e.target.value })}
                    className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer" title={t("Custom color", "لون مخصص")} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Background", "الخلفية")}</p>
                <div className="flex gap-2">
                  {(["transparent", "white", "custom"] as const).map((mode) => (
                    <button key={mode} onClick={() => set({ bgMode: mode })}
                      className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${stamp.bgMode === mode ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                      {mode === "transparent" ? t("None", "شفاف") : mode === "white" ? t("White", "أبيض") : t("Custom", "مخصص")}
                    </button>
                  ))}
                </div>
                {stamp.bgMode === "custom" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="color" value={stamp.bgColor} onChange={(e) => set({ bgColor: e.target.value })} className="w-8 h-8 rounded border" />
                    <span className="text-xs text-gray-400">{stamp.bgColor}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Text Color", "لون النص")}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["match", "white", "black", "custom"] as const).map((m) => (
                    <button key={m} onClick={() => set({ textColorMode: m })}
                      className={`py-1.5 text-xs rounded-md border transition-all ${stamp.textColorMode === m ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                      {m === "match" ? t("Match", "مطابق") : m === "white" ? t("White", "أبيض") : m === "black" ? t("Black", "أسود") : t("Custom", "مخصص")}
                    </button>
                  ))}
                </div>
                {stamp.textColorMode === "custom" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input type="color" value={stamp.textColor} onChange={(e) => set({ textColor: e.target.value })} className="w-8 h-8 rounded border" />
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* Outer Text */}
            <AccordionSection title={t("3. Outer Text (Top Arc)", "٣. النص الخارجي (قوس علوي)")} defaultOpen={true}>
              <div>
                <input
                  type="text" value={stamp.outerText}
                  onChange={(e) => set({ outerText: e.target.value })}
                  placeholder={t("Company name…", "اسم الشركة…")}
                  dir="auto"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Font", "الخط")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {FONT_OPTIONS.map((f) => (
                    <button key={f.id} onClick={() => set({ outerFont: f.id })}
                      style={{ fontFamily: `${f.id}, sans-serif` }}
                      className={`px-2 py-1 text-xs rounded border transition-all ${stamp.outerFont === f.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-600"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow label={t("Font Size", "حجم الخط")} value={stamp.outerFontSize} min={12} max={36} onChange={(v) => set({ outerFontSize: v })} />
              <SliderRow label={t("Letter Spacing", "تباعد الحروف")} value={stamp.outerSpacing} min={-2} max={10} onChange={(v) => set({ outerSpacing: v })} />
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={stamp.outerStars} onChange={(e) => set({ outerStars: e.target.checked })} className="accent-blue-500" />
                {t("Add ★ star dividers", "إضافة نجمة ★ كفاصل")}
              </label>
            </AccordionSection>

            {/* Inner Text */}
            <AccordionSection title={t("4. Inner Text (Bottom Arc)", "٤. النص الداخلي (قوس سفلي)")}>
              <input
                type="text" value={stamp.innerText}
                onChange={(e) => set({ innerText: e.target.value })}
                placeholder={t("City · Country · Reg. No.", "المدينة · الدولة · رقم التسجيل")}
                dir="auto"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Font", "الخط")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {FONT_OPTIONS.map((f) => (
                    <button key={f.id} onClick={() => set({ innerFont: f.id })}
                      style={{ fontFamily: `${f.id}, sans-serif` }}
                      className={`px-2 py-1 text-xs rounded border transition-all ${stamp.innerFont === f.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-600"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow label={t("Font Size", "حجم الخط")} value={stamp.innerFontSize} min={10} max={28} onChange={(v) => set({ innerFontSize: v })} />
              <SliderRow label={t("Letter Spacing", "تباعد الحروف")} value={stamp.innerSpacing} min={-2} max={8} onChange={(v) => set({ innerSpacing: v })} />
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={stamp.innerDividers} onChange={(e) => set({ innerDividers: e.target.checked })} className="accent-blue-500" />
                {t("Add ◆ diamond dividers", "إضافة ◆ كفاصل")}
              </label>
            </AccordionSection>

            {/* Center Content */}
            <AccordionSection title={t("5. Center Content", "٥. محتوى المركز")} defaultOpen={true}>
              <div className="grid grid-cols-5 gap-1.5">
                {(["initials", "icon", "text", "logo", "blank"] as CenterType[]).map((c) => (
                  <button key={c} onClick={() => set({ centerType: c })}
                    className={`py-2 text-xs rounded-md border transition-all ${stamp.centerType === c ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                    {c === "initials" ? t("ABC", "حروف") : c === "icon" ? t("Icon", "أيقونة") : c === "text" ? t("Text", "نص") : c === "logo" ? t("Logo", "شعار") : t("Blank", "فارغ")}
                  </button>
                ))}
              </div>

              {stamp.centerType === "initials" && (
                <div className="space-y-2">
                  <input type="text" value={stamp.centerInitials} onChange={(e) => set({ centerInitials: e.target.value })}
                    placeholder={t("Leave blank = auto from company name", "اتركه فارغاً للاستخراج التلقائي")}
                    dir="auto" maxLength={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <SliderRow label={t("Size", "الحجم")} value={stamp.centerInitialsSize} min={24} max={88} onChange={(v) => set({ centerInitialsSize: v })} />
                </div>
              )}

              {stamp.centerType === "icon" && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Choose Icon", "اختر الأيقونة")}</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Object.entries(STAMP_ICONS).map(([key]) => (
                      <button key={key} onClick={() => set({ centerIcon: key })} title={key}
                        className={`py-2 text-xs rounded-md border transition-all capitalize ${stamp.centerIcon === key ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"}`}>
                        <svg viewBox="-70 -70 140 140" className="w-6 h-6 mx-auto" style={{ overflow: "visible" }}>
                          <path d={STAMP_ICONS[key]}
                            fill={["anchor", "globe", "wheat", "handshake", "building", "eagle", "palm"].includes(key) ? "none" : stamp.centerIcon === key ? "#3B82F6" : "#6B7280"}
                            stroke={["anchor", "globe", "wheat", "handshake", "building", "eagle", "palm"].includes(key) ? (stamp.centerIcon === key ? "#3B82F6" : "#6B7280") : "none"}
                            strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stamp.centerType === "text" && (
                <div className="space-y-2">
                  <input type="text" value={stamp.centerText} onChange={(e) => set({ centerText: e.target.value })}
                    placeholder={t("Center text…", "النص المركزي…")} dir="auto"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <SliderRow label={t("Size", "الحجم")} value={stamp.centerTextSize} min={12} max={60} onChange={(v) => set({ centerTextSize: v })} />
                </div>
              )}

              {stamp.centerType === "logo" && (
                <div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  {stamp.centerLogoUrl ? (
                    <div className="flex items-center gap-2">
                      <img src={stamp.centerLogoUrl} alt="Logo" className="w-12 h-12 object-contain rounded border border-gray-200" />
                      <button onClick={() => set({ centerLogoUrl: null })} className="text-red-500 hover:text-red-700 p-1">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => logoInputRef.current?.click()}
                      className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                      <Upload size={16} /> {t("Upload logo image", "رفع صورة الشعار")}
                    </button>
                  )}
                </div>
              )}
            </AccordionSection>

            {/* Decorative */}
            <AccordionSection title={t("6. Decorative Elements", "٦. عناصر زخرفية")}>
              <div className="space-y-2">
                {([
                  ["innerDecorativeRing", t("Inner decorative ring", "حلقة داخلية زخرفية")] as const,
                  ["horizontalDividers", t("Horizontal divider lines", "خطوط فاصلة أفقية")] as const,
                  ["dotRing", t("Dot pattern ring", "حلقة نقطية")] as const,
                ]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={stamp[key as keyof StampState] as boolean}
                      onChange={(e) => set({ [key]: e.target.checked })} className="accent-blue-500" />
                    {label}
                  </label>
                ))}
              </div>
            </AccordionSection>

            {/* Effects */}
            <AccordionSection title={t("7. Ink / Texture Effect", "٧. تأثيرات الحبر والنسيج")}>
              <div className="grid grid-cols-3 gap-2">
                {(["clean", "ink", "worn"] as StampEffect[]).map((ef) => (
                  <button key={ef} onClick={() => set({ effect: ef })}
                    className={`py-3 text-xs font-medium rounded-lg border transition-all ${stamp.effect === ef ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"}`}>
                    <div className="text-lg mb-1">{ef === "clean" ? "✦" : ef === "ink" ? "✵" : "✻"}</div>
                    {ef === "clean" ? t("Clean", "نظيف") : ef === "ink" ? t("Ink Stamp", "بصمة حبر") : t("Worn Vintage", "قديم كلاسيكي")}
                  </button>
                ))}
              </div>
              {stamp.effect !== "clean" && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("Intensity", "الشدة")}</p>
                  <div className="flex gap-2">
                    {(["light", "medium", "heavy"] as EffectIntensity[]).map((lv) => (
                      <button key={lv} onClick={() => set({ effectIntensity: lv })}
                        className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${stamp.effectIntensity === lv ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                        {lv === "light" ? t("Light", "خفيف") : lv === "medium" ? t("Medium", "متوسط") : t("Heavy", "ثقيل")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </AccordionSection>
            </>
            )}
          </div>

          {/* ── Right: Preview ──────────────────────────────────────── */}
          <div className="lg:w-[58%]">
            <div className="sticky top-4 space-y-4">

              {/* Stamp Preview Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {stamp.mode === "draw" ? t("Drawing canvas", "لوحة الرسم") : t("Live Preview", "معاينة مباشرة")}
                  </h2>
                  {stamp.mode === "generate" && (
                    <button onClick={handleRandomize}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium">
                      <Shuffle size={14} /> {t("Randomize", "تشكيلة عشوائية")}
                    </button>
                  )}
                </div>

                {/* Mode-aware preview/canvas */}
                <div className="flex items-center justify-center py-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  {stamp.mode === "generate" && (
                    <div
                      className="relative"
                      style={{ width: 300, height: 300 }}
                      dangerouslySetInnerHTML={{ __html: generateStampSVG(stamp, 300) }}
                    />
                  )}
                  {stamp.mode === "upload" && (
                    stamp.uploadedStampUrl ? (
                      <div
                        className="relative"
                        style={{ width: 300, height: 300 }}
                        dangerouslySetInnerHTML={{ __html: buildUploadedStampSVG(stamp, 300) }}
                      />
                    ) : (
                      <div className="text-center text-gray-400 px-6 py-12">
                        <Upload size={36} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">{t("Upload an image to see your stamp here", "ارفع صورة لرؤية ختمك هنا")}</p>
                      </div>
                    )
                  )}
                  {stamp.mode === "draw" && (
                    <div className="relative" style={{ width: 320, height: 320 }}>
                      <canvas
                        ref={drawCanvasRef}
                        width={400}
                        height={400}
                        onPointerDown={onDrawPointerDown}
                        onPointerMove={onDrawPointerMove}
                        onPointerUp={onDrawPointerUp}
                        onPointerCancel={onDrawPointerUp}
                        onPointerLeave={onDrawPointerUp}
                        className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white touch-none"
                        style={{ width: 320, height: 320, cursor: drawTool === "eraser" ? "cell" : "crosshair" }}
                      />
                    </div>
                  )}
                </div>

                {/* Stamp on document preview */}
                <div className="mt-4 relative">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium">{t("Preview on document", "معاينة على وثيقة")}</p>
                  <div className="relative bg-white dark:bg-gray-100 rounded-lg border border-gray-200 overflow-hidden"
                    style={{ height: 180 }}>
                    {/* Mock document lines */}
                    <div className="absolute inset-0 p-4 opacity-20">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-2 bg-gray-400 rounded mb-2.5" style={{ width: `${50 + Math.random() * 40}%` }} />
                      ))}
                    </div>
                    {stamp.mode === "generate" && (
                      <div className="absolute bottom-3 right-3 opacity-75"
                        dangerouslySetInnerHTML={{ __html: generateStampSVG(stamp, 90) }} />
                    )}
                    {stamp.mode === "upload" && stamp.uploadedStampUrl && (
                      <div className="absolute bottom-3 right-3 opacity-75"
                        dangerouslySetInnerHTML={{ __html: buildUploadedStampSVG(stamp, 90) }} />
                    )}
                    {stamp.mode === "draw" && stamp.drawnStampUrl && (
                      <img src={stamp.drawnStampUrl} alt="" className="absolute bottom-3 right-3 w-[90px] h-[90px] opacity-75 object-contain" />
                    )}
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
                  {t("Dimensions: 300 × 300 mm (export at 1000 × 1000 px)", "الأبعاد: 300 × 300 مم (تصدير 1000 × 1000 بكسل)")}
                </p>
              </div>

              {/* Export Buttons */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t("Export & Save", "تصدير وحفظ")}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleDownloadPNG(true)}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                    <Download size={14} />
                    {t("PNG (transparent)", "PNG شفاف")}
                  </button>
                  <button onClick={() => handleDownloadPNG(false)}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-700 transition-colors">
                    <Download size={14} />
                    {t("PNG (white bg)", "PNG خلفية بيضاء")}
                  </button>
                  <button onClick={handleDownloadSVG}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 text-green-700 dark:text-green-300 text-sm font-medium rounded-lg border border-green-200 dark:border-green-700 transition-colors">
                    <Download size={14} />
                    {t("SVG (vector)", "SVG متجه")}
                  </button>
                  <button onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg border border-red-200 dark:border-red-700 transition-colors">
                    <Download size={14} />
                    {t("PDF (A4 page)", "PDF صفحة A4")}
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                    <Copy size={14} /> {copied ? t("Copied!", "تم النسخ!") : t("Copy PNG", "نسخ PNG")}
                  </button>
                  <button onClick={handleSaveToDocuments}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                    <FileText size={14} />
                    {savedMsg ? t("Saved!", "تم الحفظ!") : t("Use in Documents", "استخدام في الوثائق")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Content Block */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 text-gray-700 dark:text-gray-300">
        <div className="prose dark:prose-invert max-w-none">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isAR
              ? "لماذا تحتاج كل شركة حول العالم إلى ختم رسمي"
              : "Why Every Business Around the World Needs an Official Company Stamp"}
          </h2>
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              {isAR
                ? "يُعدّ ختم الشركة وثيقةً رسميةً قانونيةً في معظم الدول العربية، إذ يُثبت هوية الشركة ويضفي الشرعية على الوثائق الصادرة عنها. تُلزم دول مثل المملكة العربية السعودية والإمارات والكويت ومصر وسائر دول الخليج باستخدام الختم الرسمي على الفواتير والعقود والمراسلات التجارية."
                : "A company stamp is a legally and culturally essential element of business around the world. In many regions — including Saudi Arabia, UAE, Kuwait, Egypt, and all GCC nations — an official stamp is required on invoices, contracts, quotations, and official correspondence. Without a stamp, documents may be considered incomplete or unenforceable."}
            </p>
            <p>
              {isAR
                ? "يجب أن يتضمن ختم الشركة عادةً: اسم الشركة باللغتين العربية والإنجليزية، رقم السجل التجاري، المدينة والدولة، وفي بعض الأحيان رقم الرخصة أو اسم المسؤول. يُميز الختم الرسمي بين الوثائق الموثوقة وتلك غير المعتمدة في نظر السلطات والشركاء التجاريين."
                : "An official company stamp typically contains: the company name in Arabic and English, commercial registration number, city and country, and sometimes the license number or authorized signatory. The stamp distinguishes authenticated documents from unverified ones in the eyes of government authorities and business partners."}
            </p>
            <p>
              {isAR
                ? "في المملكة العربية السعودية والإمارات والبحرين والكويت وعُمان وقطر، يُعتبر الختم الرسمي ضرورياً على جميع الفواتير الضريبية، وعروض الأسعار، وطلبات الشراء، والعقود، وخطابات التوصية. يُسهم غياب الختم في تأخير المدفوعات ورفض الوثائق رسمياً."
                : "In Saudi Arabia, UAE, Bahrain, Kuwait, Oman, and Qatar, an official stamp is required on tax invoices, quotations, purchase orders, contracts, and recommendation letters. The absence of a stamp can delay payments and cause official rejection of documents by government entities and large corporations."}
            </p>
            <p>
              {isAR
                ? "يتيح لك هذا الأداة المجانية إنشاء ختم شركتك الاحترافي بدقيقتين فقط، بالكامل في المتصفح دون الحاجة لتحميل أي برنامج. صُمّم لدعم العربية واللاتينية معاً، مع خيارات متعددة للتصدير تضمن جودة الاستخدام في الوثائق الورقية والرقمية."
                : "This free tool lets you create your professional company stamp in under 2 minutes, entirely in the browser without any software download. Built with full Arabic and English support, multiple export formats ensure your stamp works perfectly in both printed and digital documents."}
            </p>
          </div>
        </div>

        {/* Internal Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/invoice", en: "Invoice Generator", ar: "مولّد الفواتير" },
            { href: "/quotation", en: "Quotation Generator", ar: "مولّد عروض الأسعار" },
            { href: "/receipt", en: "Receipt Generator", ar: "مولّد الإيصالات" },
          ].map((link) => (
            <button key={link.href} onClick={() => guardedNavigate(link.href)}
              className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-medium transition-colors border border-blue-200 dark:border-blue-800">
              <Link size={14} />
              {isAR ? link.ar : link.en}
            </button>
          ))}
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isAR ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
          </h2>
          {[
            {
              q: isAR ? "ما المعلومات التي يجب أن يحتوي عليها ختم الشركة؟" : "What information should be on a company stamp in Arabic?",
              a: isAR
                ? "يجب أن يتضمن ختم الشركة: اسم الشركة باللغتين العربية والإنجليزية، رقم السجل التجاري، اسم المدينة والدولة، ويمكن إضافة رقم الرخصة أو موقع الشركة الإلكتروني."
                : "A company stamp in Arabic should include: company name in both Arabic and English, commercial registration number, city and country. Optional additions include the license number, website, or authorized signatory name.",
            },
            {
              q: isAR ? "هل الختم الرسمي مطلوب على الفواتير في الدول العربية؟" : "Is a company stamp required on invoices in Arab countries?",
              a: isAR
                ? "نعم، في معظم دول الخليج العربي، يُعدّ الختم الرسمي شرطاً أساسياً على الفواتير الضريبية والتجارية، خاصةً للمعاملات مع الجهات الحكومية والشركات الكبرى."
                : "Yes, in most GCC and Arab countries, an official stamp is a standard requirement on tax invoices and commercial transactions — especially when dealing with government entities or large corporations. While digital signatures are gaining acceptance, physical stamps remain the norm.",
            },
            {
              q: isAR ? "كيف أصنع ختم شركة مجاناً على الإنترنت؟" : "How do I make a company stamp online for free?",
              a: isAR
                ? "باستخدام أداة صانع الأختام في Xuvilo، يمكنك تصميم ختم احترافي في دقائق: اختر الشكل والألوان، أدخل اسم شركتك، واختر الأيقونة المناسبة، ثم قم بتصديره بصيغة PNG أو SVG أو PDF — مجاناً بالكامل."
                : "Use the Xuvilo Stamp Maker: choose your shape and color, enter your company name, select a center icon or initials, and export as PNG, SVG, or PDF — completely free, no account required.",
            },
            {
              q: isAR ? "هل يمكن استخدام الختم الرقمي في الوثائق الرسمية؟" : "Can I use a digital stamp on official documents?",
              a: isAR
                ? "يُقبل الختم الرقمي في العديد من التطبيقات التجارية، خاصةً على الفواتير الإلكترونية ومستندات PDF. غير أن بعض الجهات الحكومية لا تزال تشترط الختم الفيزيائي. تحقق دائماً من متطلبات الجهة المعنية."
                : "Digital stamps are accepted in many business applications, especially for e-invoices and PDF documents. However, some government agencies still require physical rubber stamps. Always check the specific requirements of the receiving authority.",
            },
            {
              q: isAR ? "ما الفرق بين الختم والطابع؟" : "What is the difference between a stamp and a seal?",
              a: isAR
                ? "الختم (stamp) هو أداة تستخدم الحبر لترك بصمة على الورق، بينما الطابع (seal) يُشير عادةً إلى ختم بارز (embossed) يترك أثراً ثلاثي الأبعاد دون حبر. في السياق التجاري العربي، يُستخدم المصطلحان أحياناً بشكل مترادف."
                : "A stamp uses ink to leave an impression on paper, while a seal typically refers to an embossed mark creating a 3D impression without ink. In Arab business contexts, both terms are often used interchangeably, though rubber ink stamps are far more common in daily commercial use.",
            },
          ].map((item, i) => (
            <details key={i} className="group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer font-semibold text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 list-none flex items-center justify-between">
                {item.q}
                <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
      <UnsavedChangesDialog open={dialog.open} lang={lang} onStay={dialog.stay} onLeave={dialog.leave} />
    </AppLayout>
  );
}
