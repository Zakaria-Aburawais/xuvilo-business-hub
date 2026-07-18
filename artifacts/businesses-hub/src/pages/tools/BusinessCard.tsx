import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Download, FileImage, Upload, RotateCw, Palette, Sparkles, X,
  MousePointer2, Pencil, Eraser, Square, Circle as CircleIcon, Minus, Type, Undo2, Trash2,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

/* ──────────────────────────────── Types ──────────────────────────────── */

type TemplateId = "modern" | "classic" | "minimal" | "gradient" | "dark" | "creative";

interface CardData {
  name: string;
  title: string;
  company: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logoUrl: string | null;
  accent: string;
  bg: string;
  text: string;
  template: TemplateId;
}

type Side = "front" | "back";
type Tool = "select" | "brush" | "eraser" | "rect" | "circle" | "line" | "text";
type Point = { x: number; y: number };

type PaintOp =
  | { id: string; kind: "stroke"; color: string; width: number; points: Point[] }
  | { id: string; kind: "rect";   color: string; width: number; x: number; y: number; w: number; h: number; fill: boolean }
  | { id: string; kind: "circle"; color: string; width: number; cx: number; cy: number; r: number; fill: boolean }
  | { id: string; kind: "line";   color: string; width: number; x1: number; y1: number; x2: number; y2: number }
  | { id: string; kind: "text";   color: string; size: number; x: number; y: number; text: string };

type ElementKey = "company" | "name" | "title" | "contact" | "logo";
type Positions = Partial<Record<ElementKey, Point>>;
type Rect = { x: number; y: number; w: number; h: number };

/* ──────────────────────────────── Defaults ──────────────────────────────── */

const DEFAULT_DATA: CardData = {
  name: "Sarah Johnson",
  title: "Marketing Director",
  company: "Bright Studio",
  tagline: "Creative branding & strategy",
  phone: "+1 555 123 4567",
  email: "sarah@brightstudio.com",
  website: "www.brightstudio.com",
  address: "Riyadh, Saudi Arabia",
  logoUrl: null,
  accent: "#2563EB",
  bg: "#FFFFFF",
  text: "#0F172A",
  template: "modern",
};

const COLOR_PRESETS = [
  { name: "Royal Blue", accent: "#2563EB", bg: "#FFFFFF", text: "#0F172A" },
  { name: "Forest", accent: "#047857", bg: "#FFFFFF", text: "#0F172A" },
  { name: "Sunset", accent: "#EA580C", bg: "#FFFFFF", text: "#0F172A" },
  { name: "Royal Purple", accent: "#7C3AED", bg: "#FFFFFF", text: "#1E1B4B" },
  { name: "Rose Gold", accent: "#E11D48", bg: "#FFFBEB", text: "#1F1410" },
  { name: "Midnight", accent: "#60A5FA", bg: "#0F172A", text: "#F8FAFC" },
  { name: "Charcoal", accent: "#F59E0B", bg: "#1F2937", text: "#F9FAFB" },
  { name: "Ocean", accent: "#0891B2", bg: "#F0F9FF", text: "#0C4A6E" },
];

const TEMPLATES: { id: TemplateId; en: string; ar: string }[] = [
  { id: "modern",   en: "Modern",   ar: "حديث" },
  { id: "classic",  en: "Classic",  ar: "كلاسيكي" },
  { id: "minimal",  en: "Minimal",  ar: "بسيط" },
  { id: "gradient", en: "Gradient", ar: "متدرج" },
  { id: "dark",     en: "Dark",     ar: "داكن" },
  { id: "creative", en: "Creative", ar: "إبداعي" },
];

const PAINT_PALETTE = [
  "#EF4444", "#F59E0B", "#10B981", "#2563EB", "#7C3AED",
  "#EC4899", "#0F172A", "#FFFFFF",
];

/* Canvas size: 1050 x 600 = 3.5" x 2" @ 300dpi (print-ready) */
const CARD_W = 1050;
const CARD_H = 600;

/* ──────────────────────────────── Layout ──────────────────────────────── */

function defaultLayout(data: CardData, side: Side, hasLogo: boolean): Record<ElementKey, Point> {
  if (side === "front") {
    const left = data.template === "modern" ? 60 : 60;
    return {
      company: { x: left, y: 60 },
      name:    { x: left, y: 220 },
      title:   { x: left, y: 300 },
      contact: { x: left, y: 400 },
      logo:    { x: data.template === "modern" ? CARD_W - 110 - 60 : 60, y: 60 },
    };
  }
  // BACK — centered logo + company + tagline + website
  return {
    company: { x: CARD_W / 2,            y: CARD_H / 2 + (hasLogo ? 20 : -20) },
    name:    { x: CARD_W / 2,            y: CARD_H / 2 + (hasLogo ? 80 : 40) }, // tagline reuses "name" slot for back
    title:   { x: CARD_W / 2,            y: CARD_H - 60 },                       // website reuses "title" slot for back
    contact: { x: CARD_W / 2,            y: CARD_H - 60 },
    logo:    { x: CARD_W / 2 - 80,       y: CARD_H / 2 - 180 },
  };
}

function resolvedLayout(data: CardData, side: Side, hasLogo: boolean, overrides: Positions): Record<ElementKey, Point> {
  const base = defaultLayout(data, side, hasLogo);
  return {
    company: overrides.company ?? base.company,
    name:    overrides.name    ?? base.name,
    title:   overrides.title   ?? base.title,
    contact: overrides.contact ?? base.contact,
    logo:    overrides.logo    ?? base.logo,
  };
}

/* Approximate bounding boxes for hit-testing draggable elements (front side only).
   Back side uses centered text — we still allow dragging the whole "company" group. */
function elementBounds(data: CardData, side: Side, hasLogo: boolean, overrides: Positions): Partial<Record<ElementKey, Rect>> {
  const L = resolvedLayout(data, side, hasLogo, overrides);
  if (side === "front") {
    const out: Partial<Record<ElementKey, Rect>> = {
      company: { x: L.company.x, y: L.company.y, w: 600, h: 50 },
      name:    { x: L.name.x,    y: L.name.y,    w: 800, h: 80 },
      title:   { x: L.title.x,   y: L.title.y,   w: 600, h: 40 },
      contact: { x: L.contact.x, y: L.contact.y, w: 600, h: 170 },
    };
    if (hasLogo) out.logo = { x: L.logo.x, y: L.logo.y, w: 110, h: 110 };
    return out;
  }
  // Back: rough centered boxes
  const out: Partial<Record<ElementKey, Rect>> = {
    company: { x: L.company.x - 250, y: L.company.y - 40, w: 500, h: 80 },
    name:    { x: L.name.x - 250,    y: L.name.y - 20,    w: 500, h: 40 },
    title:   { x: L.title.x - 200,   y: L.title.y - 16,   w: 400, h: 32 },
  };
  if (hasLogo) out.logo = { x: L.logo.x, y: L.logo.y, w: 160, h: 160 };
  return out;
}

function pointInRect(p: Point, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/* ──────────────────────────────── Renderer ──────────────────────────────── */

function drawCard(
  ctx: CanvasRenderingContext2D,
  data: CardData,
  side: Side,
  logoImg: HTMLImageElement | null,
  overrides: Positions,
  paintOps: PaintOp[],
  selected: ElementKey | null,
  showOverlays: boolean,
) {
  const W = CARD_W, H = CARD_H;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = data.bg;
  ctx.fillRect(0, 0, W, H);

  const isDark = data.bg === "#0F172A" || data.bg === "#1F2937" || data.template === "dark";
  const accent = data.accent;
  const text = data.text;
  const muted = isDark ? "rgba(248,250,252,0.65)" : "rgba(15,23,42,0.55)";
  const L = resolvedLayout(data, side, !!logoImg, overrides);

  if (side === "front") {
    /* ── Template-specific accents ── */
    if (data.template === "modern") {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 18, H);
    } else if (data.template === "classic") {
      ctx.fillStyle = accent;
      ctx.fillRect(60, 130, W - 120, 3);
      ctx.fillRect(60, H - 40, W - 120, 3);
    } else if (data.template === "gradient") {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, shade(accent, -40));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (data.template === "dark") {
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(W, 0); ctx.lineTo(W, 180); ctx.lineTo(W - 220, 0); ctx.closePath();
      ctx.fill();
    } else if (data.template === "creative") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, H); ctx.lineTo(0, H * 0.55); ctx.lineTo(W, H * 0.15); ctx.lineTo(W, H); ctx.closePath();
      ctx.fill();
    }

    /* ── Text colors based on template ── */
    const useWhite = data.template === "gradient" || data.template === "dark";
    const nameColor = useWhite ? "#FFFFFF" : text;
    const subColor  = useWhite ? "rgba(255,255,255,0.85)" : muted;
    const accentText = useWhite ? "#FFFFFF" : accent;

    /* ── Logo ── */
    if (logoImg) {
      try { ctx.drawImage(logoImg, L.logo.x, L.logo.y, 110, 110); } catch {}
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "top";

    /* Render helper: set canvas text direction per string so Arabic text
       lays out correctly (RTL) while Latin text stays LTR. */
    const HAS_ARABIC = /[\u0600-\u06FF\u0750-\u077F]/;
    const drawText = (txt: string, x: number, y: number) => {
      ctx.direction = HAS_ARABIC.test(txt) ? "rtl" : "ltr";
      ctx.fillText(txt, x, y);
      ctx.direction = "ltr";
    };

    /* Company */
    ctx.fillStyle = accentText;
    ctx.font = "700 36px Inter, system-ui, -apple-system, sans-serif";
    drawText(data.company || "", L.company.x, L.company.y);

    /* Name */
    ctx.fillStyle = nameColor;
    ctx.font = "800 64px Inter, system-ui, -apple-system, sans-serif";
    drawText(data.name || "", L.name.x, L.name.y);

    /* Title */
    ctx.fillStyle = subColor;
    ctx.font = "500 28px Inter, system-ui, -apple-system, sans-serif";
    drawText(data.title || "", L.title.x, L.title.y);

    /* Contact */
    const lineH = 40;
    ctx.font = "500 22px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillStyle = useWhite ? "rgba(255,255,255,0.95)" : text;
    const lines: string[] = [];
    if (data.phone)   lines.push(`☎  ${data.phone}`);
    if (data.email)   lines.push(`✉  ${data.email}`);
    if (data.website) lines.push(`⌘  ${data.website}`);
    if (data.address) lines.push(`◉  ${data.address}`);
    lines.slice(0, 4).forEach((ln, i) => {
      ctx.fillText(ln, L.contact.x, L.contact.y + i * lineH);
    });
  } else {
    /* ── BACK SIDE ── */
    if (data.template === "gradient") {
      const grad = ctx.createLinearGradient(W, 0, 0, H);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, shade(accent, -40));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (data.template === "dark") {
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (logoImg) {
      try { ctx.drawImage(logoImg, L.logo.x, L.logo.y, 160, 160); } catch {}
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 56px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(data.company || "", L.company.x, L.company.y);

    if (data.tagline) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 26px Inter, system-ui, -apple-system, sans-serif";
      ctx.fillText(data.tagline, L.name.x, L.name.y);
    }

    if (data.website) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "500 22px Inter, system-ui, -apple-system, sans-serif";
      ctx.fillText(data.website, L.title.x, L.title.y);
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  /* ── Paint ops on top ── */
  paintOps.forEach(op => drawOp(ctx, op));

  /* ── Selection overlay (only in editor, not in exports) ── */
  if (showOverlays && selected) {
    const bounds = elementBounds(data, side, !!logoImg, overrides)[selected];
    if (bounds) {
      ctx.save();
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(bounds.x - 6, bounds.y - 6, bounds.w + 12, bounds.h + 12);
      ctx.restore();
    }
  }
}

function drawOp(ctx: CanvasRenderingContext2D, op: PaintOp) {
  ctx.save();
  if (op.kind === "stroke") {
    if (op.points.length < 2) {
      ctx.fillStyle = op.color;
      const p = op.points[0];
      if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, op.width / 2, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.strokeStyle = op.color;
      ctx.lineWidth = op.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(op.points[0].x, op.points[0].y);
      for (let i = 1; i < op.points.length; i++) ctx.lineTo(op.points[i].x, op.points[i].y);
      ctx.stroke();
    }
  } else if (op.kind === "rect") {
    if (op.fill) { ctx.fillStyle = op.color; ctx.fillRect(op.x, op.y, op.w, op.h); }
    else { ctx.strokeStyle = op.color; ctx.lineWidth = op.width; ctx.strokeRect(op.x, op.y, op.w, op.h); }
  } else if (op.kind === "circle") {
    ctx.beginPath();
    ctx.arc(op.cx, op.cy, Math.max(1, op.r), 0, Math.PI * 2);
    if (op.fill) { ctx.fillStyle = op.color; ctx.fill(); }
    else { ctx.strokeStyle = op.color; ctx.lineWidth = op.width; ctx.stroke(); }
  } else if (op.kind === "line") {
    ctx.strokeStyle = op.color;
    ctx.lineWidth = op.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(op.x1, op.y1);
    ctx.lineTo(op.x2, op.y2);
    ctx.stroke();
  } else if (op.kind === "text") {
    ctx.fillStyle = op.color;
    ctx.font = `600 ${op.size}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "start";
    ctx.fillText(op.text, op.x, op.y);
  }
  ctx.restore();
}

function distToOpCenter(p: Point, op: PaintOp): number {
  if (op.kind === "stroke") {
    let min = Infinity;
    for (const pt of op.points) {
      const d = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (d < min) min = d;
    }
    return min;
  }
  if (op.kind === "rect")   return Math.hypot(op.x + op.w / 2 - p.x, op.y + op.h / 2 - p.y);
  if (op.kind === "circle") return Math.hypot(op.cx - p.x, op.cy - p.y);
  if (op.kind === "line")   return Math.hypot((op.x1 + op.x2) / 2 - p.x, (op.y1 + op.y2) / 2 - p.y);
  return Math.hypot(op.x - p.x, op.y - p.y);
}

function shade(hex: string, amt: number) {
  const c = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(c.substring(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(c.substring(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(c.substring(4, 6), 16) + amt));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

/* ──────────────────────────────── Component ──────────────────────────────── */

export default function BusinessCardPage() {
  const { lang, isRTL } = useLanguage();
  const { toast } = useToast();
  const isAR = lang === "ar";
  const [data, setData] = useState<CardData>(DEFAULT_DATA);
  const [side, setSide] = useState<Side>("front");
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef  = useRef<HTMLCanvasElement>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  // Drawing state
  const [tool, setTool] = useState<Tool>("select");
  const [paintColor, setPaintColor] = useState("#EF4444");
  const [paintWidth, setPaintWidth] = useState(6);
  const [paintFill, setPaintFill] = useState(false);
  const [paintTextSize, setPaintTextSize] = useState(40);

  const [paintOps, setPaintOps] = useState<{ front: PaintOp[]; back: PaintOp[] }>({ front: [], back: [] });
  const [positions, setPositions] = useState<{ front: Positions; back: Positions }>({ front: {}, back: {} });
  const [history, setHistory] = useState<{ front: PaintOp[][]; back: PaintOp[][] }>({ front: [], back: [] });
  const [selectedEl, setSelectedEl] = useState<ElementKey | null>(null);

  // Pointer drag state (refs to avoid re-renders mid-drag)
  const dragRef = useRef<{
    mode: "paint" | "drag-element" | "stroke" | null;
    elKey?: ElementKey;
    startCanvas?: Point;
    startElPos?: Point;
    inProgress?: PaintOp;
  }>({ mode: null });

  const update = <K extends keyof CardData>(key: K, value: CardData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  /* Load logo */
  useEffect(() => {
    if (!data.logoUrl) { setLogoImg(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLogoImg(img);
    img.onerror = () => setLogoImg(null);
    img.src = data.logoUrl;
  }, [data.logoUrl]);

  /* Redraw both canvases on changes */
  const redraw = useCallback(() => {
    const fc = frontCanvasRef.current?.getContext("2d");
    const bc = backCanvasRef.current?.getContext("2d");
    if (fc) drawCard(fc, data, "front", logoImg, positions.front, paintOps.front, side === "front" ? selectedEl : null, side === "front");
    if (bc) drawCard(bc, data, "back",  logoImg, positions.back,  paintOps.back,  side === "back"  ? selectedEl : null, side === "back");
  }, [data, logoImg, positions, paintOps, selectedEl, side]);

  useEffect(() => { redraw(); }, [redraw]);

  /* ── Pointer mapping (CSS px → canvas px) ── */
  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CARD_W / rect.width),
      y: (e.clientY - rect.top)  * (CARD_H / rect.height),
    };
  };

  const currentOps = paintOps[side];
  const currentPos = positions[side];

  /* History helpers */
  const pushHistory = () => {
    setHistory(h => ({ ...h, [side]: [...h[side], currentOps] }));
  };
  const undo = () => {
    setHistory(h => {
      const stack = h[side];
      if (!stack.length) return h;
      const prev = stack[stack.length - 1];
      setPaintOps(p => ({ ...p, [side]: prev }));
      return { ...h, [side]: stack.slice(0, -1) };
    });
  };
  const clearSide = () => {
    if (currentOps.length === 0) return;
    pushHistory();
    setPaintOps(p => ({ ...p, [side]: [] }));
  };
  const resetPositions = () => {
    setPositions(p => ({ ...p, [side]: {} }));
    setSelectedEl(null);
  };

  /* ── Pointer handlers ── */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getCoords(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "select") {
      // hit test elements (front-most first; iterate in render order reversed)
      const bounds = elementBounds(data, side, !!logoImg, currentPos);
      const order: ElementKey[] = ["logo", "name", "company", "title", "contact"];
      for (const k of order) {
        const r = bounds[k];
        if (r && pointInRect(p, r)) {
          setSelectedEl(k);
          const layout = resolvedLayout(data, side, !!logoImg, currentPos)[k];
          dragRef.current = {
            mode: "drag-element",
            elKey: k,
            startCanvas: p,
            startElPos: { ...layout },
          };
          return;
        }
      }
      setSelectedEl(null);
      return;
    }

    if (tool === "eraser") {
      // remove the closest paint op within ~30px
      let bestIdx = -1, bestDist = Infinity;
      currentOps.forEach((op, i) => {
        const d = distToOpCenter(p, op);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      if (bestIdx >= 0 && bestDist < 60) {
        pushHistory();
        setPaintOps(prev => ({ ...prev, [side]: prev[side].filter((_, i) => i !== bestIdx) }));
      }
      return;
    }

    if (tool === "text") {
      const txt = window.prompt(isAR ? "أدخل النص" : "Enter text:");
      if (!txt) return;
      pushHistory();
      const op: PaintOp = { id: uid(), kind: "text", color: paintColor, size: paintTextSize, x: p.x, y: p.y, text: txt };
      setPaintOps(prev => ({ ...prev, [side]: [...prev[side], op] }));
      return;
    }

    // Paint tools (brush / rect / circle / line) — start an op
    let op: PaintOp;
    if (tool === "brush") {
      op = { id: uid(), kind: "stroke", color: paintColor, width: paintWidth, points: [p] };
    } else if (tool === "rect") {
      op = { id: uid(), kind: "rect", color: paintColor, width: paintWidth, x: p.x, y: p.y, w: 0, h: 0, fill: paintFill };
    } else if (tool === "circle") {
      op = { id: uid(), kind: "circle", color: paintColor, width: paintWidth, cx: p.x, cy: p.y, r: 0, fill: paintFill };
    } else { // line
      op = { id: uid(), kind: "line", color: paintColor, width: paintWidth, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    }
    dragRef.current = { mode: "paint", inProgress: op, startCanvas: p };
    pushHistory();
    setPaintOps(prev => ({ ...prev, [side]: [...prev[side], op] }));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag.mode) return;
    const p = getCoords(e);

    if (drag.mode === "drag-element" && drag.elKey && drag.startCanvas && drag.startElPos) {
      const dx = p.x - drag.startCanvas.x;
      const dy = p.y - drag.startCanvas.y;
      const newPos = { x: drag.startElPos.x + dx, y: drag.startElPos.y + dy };
      setPositions(prev => ({ ...prev, [side]: { ...prev[side], [drag.elKey!]: newPos } }));
      return;
    }

    if (drag.mode === "paint" && drag.inProgress && drag.startCanvas) {
      const op = drag.inProgress;
      setPaintOps(prev => {
        const list = [...prev[side]];
        const idx = list.findIndex(x => x.id === op.id);
        if (idx < 0) return prev;
        const cur = list[idx];
        let updated: PaintOp = cur;
        if (cur.kind === "stroke") {
          updated = { ...cur, points: [...cur.points, p] };
        } else if (cur.kind === "rect") {
          const sx = drag.startCanvas!.x, sy = drag.startCanvas!.y;
          updated = { ...cur, x: Math.min(sx, p.x), y: Math.min(sy, p.y), w: Math.abs(p.x - sx), h: Math.abs(p.y - sy) };
        } else if (cur.kind === "circle") {
          const sx = drag.startCanvas!.x, sy = drag.startCanvas!.y;
          updated = { ...cur, cx: sx, cy: sy, r: Math.hypot(p.x - sx, p.y - sy) };
        } else if (cur.kind === "line") {
          updated = { ...cur, x2: p.x, y2: p.y };
        }
        list[idx] = updated;
        // keep ref in sync so subsequent moves extend the same op shape
        dragRef.current.inProgress = updated;
        return { ...prev, [side]: list };
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    dragRef.current = { mode: null };
  };

  /* ── Cursor based on tool ── */
  const cursor = useMemo(() => {
    switch (tool) {
      case "select": return "default";
      case "eraser": return "cell";
      case "text":   return "text";
      default:       return "crosshair";
    }
  }, [tool]);

  /* ── Logo upload ── */
  const handleLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => update("logoUrl", e.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* ── Exports — render to a clean canvas without selection overlay ── */
  const renderExportCanvas = (s: Side): HTMLCanvasElement => {
    const c = document.createElement("canvas");
    c.width = CARD_W; c.height = CARD_H;
    const ctx = c.getContext("2d")!;
    drawCard(ctx, data, s, logoImg, positions[s], paintOps[s], null, false);
    return c;
  };

  const downloadPNG = useCallback(async (which: Side | "both") => {
    const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
      new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Canvas export failed"))), "image/png");
      });
    const trigger = async (canvas: HTMLCanvasElement, name: string) => {
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };
    try {
      if (which === "front") await trigger(renderExportCanvas("front"), "business-card-front.png");
      if (which === "back")  await trigger(renderExportCanvas("back"),  "business-card-back.png");
      if (which === "both") {
        await trigger(renderExportCanvas("front"), "business-card-front.png");
        await trigger(renderExportCanvas("back"), "business-card-back.png");
      }
    } catch {
      toast({
        variant: "destructive",
        title: lang === "ar" ? "فشل التصدير" : "Export failed",
        description: lang === "ar" ? "تعذر تصدير البطاقة. حاول مرة أخرى." : "Could not export the card. Please try again.",
      });
      return;
    }
    trackEvent("business_card_export", { format: "png", side: which, language: lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, logoImg, positions, paintOps, lang]);

  const downloadPDF = useCallback(() => {
    const front = renderExportCanvas("front");
    const back  = renderExportCanvas("back");
    const pdf = new jsPDF({ orientation: "landscape", unit: "in", format: [3.5, 2] });
    pdf.addImage(front.toDataURL("image/png"), "PNG", 0, 0, 3.5, 2);
    pdf.addPage([3.5, 2], "landscape");
    pdf.addImage(back.toDataURL("image/png"), "PNG", 0, 0, 3.5, 2);
    pdf.save(`business-card-${(data.name || "card").replace(/\s+/g, "-").toLowerCase()}.pdf`);
    trackEvent("business_card_export", { format: "pdf", language: lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, logoImg, positions, paintOps, lang]);

  const applyPreset = (p: typeof COLOR_PRESETS[number]) => {
    setData(prev => ({ ...prev, accent: p.accent, bg: p.bg, text: p.text }));
  };

  /* ──────────────────────────────── UI ──────────────────────────────── */

  const TOOLS: { id: Tool; icon: React.ComponentType<{ className?: string }>; en: string; ar: string }[] = [
    { id: "select", icon: MousePointer2, en: "Select",    ar: "تحديد" },
    { id: "brush",  icon: Pencil,        en: "Brush",     ar: "فرشاة" },
    { id: "line",   icon: Minus,         en: "Line",      ar: "خط" },
    { id: "rect",   icon: Square,        en: "Rectangle", ar: "مستطيل" },
    { id: "circle", icon: CircleIcon,    en: "Circle",    ar: "دائرة" },
    { id: "text",   icon: Type,          en: "Text",      ar: "نص" },
    { id: "eraser", icon: Eraser,        en: "Eraser",    ar: "ممحاة" },
  ];

  return (
    <AppLayout>
      <div dir={isRTL ? "rtl" : "ltr"} className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{isAR ? "صانع بطاقات الأعمال" : "Business Card Maker"}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAR ? "تصميم بطاقات احترافية بدقة طباعة 300 DPI" : "Design print-ready cards at 300 DPI"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => downloadPNG("front")} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800" data-testid="bc-png-front">
              <FileImage className="w-4 h-4" />{isAR ? "PNG أمامي" : "PNG Front"}
            </button>
            <button onClick={() => downloadPNG("back")} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800" data-testid="bc-png-back">
              <FileImage className="w-4 h-4" />{isAR ? "PNG خلفي" : "PNG Back"}
            </button>
            <button onClick={() => downloadPNG("both")} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800" data-testid="bc-png-both">
              <FileImage className="w-4 h-4" />{isAR ? "PNG الوجهان" : "PNG Both"}
            </button>
            <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white shadow-sm" data-testid="bc-pdf">
              <Download className="w-4 h-4" />{isAR ? "تحميل PDF" : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* ── Editor sidebar ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-5 h-fit">
            {/* Templates */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{isAR ? "القالب" : "Template"}</label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => update("template", tpl.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                      data.template === tpl.id
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                    data-testid={`bc-template-${tpl.id}`}
                  >
                    {isAR ? tpl.ar : tpl.en}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {isAR
                  ? "💡 استخدم أداة التحديد لسحب أي عنصر (الاسم، الشركة، الشعار…) إلى المكان الذي تريده."
                  : "💡 Use the Select tool to drag any element (name, company, logo…) anywhere on the card."}
              </p>
            </div>

            {/* Color Presets */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />{isAR ? "الألوان" : "Colors"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    title={p.name}
                    className="aspect-square rounded-lg border-2 hover:scale-105 transition-transform overflow-hidden"
                    style={{
                      borderColor: data.accent === p.accent && data.bg === p.bg ? p.accent : "transparent",
                      background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)`,
                    }}
                    aria-label={p.name}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <ColorInput label={isAR ? "تمييز" : "Accent"} value={data.accent} onChange={v => update("accent", v)} />
                <ColorInput label={isAR ? "خلفية" : "BG"}     value={data.bg}     onChange={v => update("bg", v)} />
                <ColorInput label={isAR ? "نص" : "Text"}      value={data.text}   onChange={v => update("text", v)} />
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{isAR ? "الشعار" : "Logo"}</label>
              {data.logoUrl ? (
                <div className="flex items-center gap-3 p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <img src={data.logoUrl} alt="" className="w-12 h-12 object-contain rounded bg-white" />
                  <span className="text-xs text-gray-500 flex-1 truncate">{isAR ? "تم تحميل الشعار" : "Logo uploaded"}</span>
                  <button onClick={() => update("logoUrl", null)} aria-label={isAR ? "إزالة الشعار" : "Remove logo"} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-sm text-gray-600 dark:text-gray-300">
                  <Upload className="w-4 h-4" />
                  {isAR ? "رفع الشعار" : "Upload Logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleLogo(e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <Field label={isAR ? "الاسم الكامل" : "Full Name"}      value={data.name}    onChange={v => update("name", v)} />
              <Field label={isAR ? "المسمى الوظيفي" : "Job Title"}     value={data.title}   onChange={v => update("title", v)} />
              <Field label={isAR ? "اسم الشركة" : "Company"}           value={data.company} onChange={v => update("company", v)} />
              <Field label={isAR ? "شعار الشركة (نص)" : "Tagline"}     value={data.tagline} onChange={v => update("tagline", v)} />
              <Field label={isAR ? "الهاتف" : "Phone"}                  value={data.phone}   onChange={v => update("phone", v)} />
              <Field label={isAR ? "البريد الإلكتروني" : "Email"}       value={data.email}   onChange={v => update("email", v)} />
              <Field label={isAR ? "الموقع" : "Website"}                value={data.website} onChange={v => update("website", v)} />
              <Field label={isAR ? "العنوان" : "Address"}               value={data.address} onChange={v => update("address", v)} />
            </div>
          </div>

          {/* ── Preview area with paint toolbar ── */}
          <div className="space-y-4">
            {/* Side switch */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSide("front"); setSelectedEl(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${side === "front" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}
              >{isAR ? "أمامي" : "Front"}</button>
              <button
                onClick={() => { setSide("back"); setSelectedEl(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${side === "back" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}
              >{isAR ? "خلفي" : "Back"}</button>
              <button
                onClick={() => { setSide(side === "front" ? "back" : "front"); setSelectedEl(null); }}
                className="ms-auto p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                title={isAR ? "اقلب البطاقة" : "Flip card"}
                aria-label={isAR ? "اقلب البطاقة" : "Flip card"}
              ><RotateCw className="w-4 h-4" /></button>
            </div>

            {/* Paint toolbar */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="flex items-center gap-1 flex-wrap">
                {TOOLS.map(t => {
                  const Icon = t.icon;
                  const active = tool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTool(t.id); if (t.id !== "select") setSelectedEl(null); }}
                      title={isAR ? t.ar : t.en}
                      aria-label={isAR ? t.ar : t.en}
                      data-testid={`bc-tool-${t.id}`}
                      className={`p-2 rounded-lg border transition-colors ${active
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Color swatches */}
                <div className="flex items-center gap-1">
                  {PAINT_PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setPaintColor(c)}
                      aria-label={`Color ${c}`}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${paintColor === c ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900" : ""}`}
                      style={{ background: c, borderColor: c === "#FFFFFF" ? "#E5E7EB" : c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={paintColor}
                    onChange={e => setPaintColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 ms-1"
                    aria-label={isAR ? "لون مخصص" : "Custom color"}
                  />
                </div>

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                {/* Width slider */}
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span>{isAR ? "السمك" : "Size"}</span>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={paintWidth}
                    onChange={e => setPaintWidth(Number(e.target.value))}
                    className="w-24"
                    aria-label={isAR ? "سمك الفرشاة" : "Brush size"}
                  />
                  <span className="w-6 text-center tabular-nums">{paintWidth}</span>
                </label>

                {(tool === "rect" || tool === "circle") && (
                  <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 ms-2">
                    <input type="checkbox" checked={paintFill} onChange={e => setPaintFill(e.target.checked)} />
                    {isAR ? "تعبئة" : "Fill"}
                  </label>
                )}

                {tool === "text" && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 ms-2">
                    <span>{isAR ? "حجم النص" : "Text size"}</span>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={paintTextSize}
                      onChange={e => setPaintTextSize(Number(e.target.value))}
                      className="w-14 px-1 py-0.5 border border-gray-200 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800"
                    />
                  </label>
                )}

                <div className="ms-auto flex items-center gap-1">
                  <button
                    onClick={undo}
                    disabled={history[side].length === 0}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isAR ? "تراجع" : "Undo"}
                  ><Undo2 className="w-3.5 h-3.5" />{isAR ? "تراجع" : "Undo"}</button>
                  <button
                    onClick={clearSide}
                    disabled={currentOps.length === 0}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isAR ? "مسح الرسم" : "Clear drawings"}
                  ><Trash2 className="w-3.5 h-3.5" />{isAR ? "مسح" : "Clear"}</button>
                  <button
                    onClick={resetPositions}
                    disabled={Object.keys(currentPos).length === 0}
                    className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isAR ? "إعادة تعيين المواقع" : "Reset positions"}
                  >{isAR ? "إعادة المواقع" : "Reset layout"}</button>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl p-8 grid place-items-center min-h-[420px]">
              <div
                className="rounded-xl shadow-2xl bg-white overflow-hidden"
                style={{ width: "min(100%, 700px)", aspectRatio: `${CARD_W} / ${CARD_H}` }}
              >
                <canvas
                  ref={frontCanvasRef}
                  width={CARD_W}
                  height={CARD_H}
                  className={`w-full h-full touch-none select-none ${side === "front" ? "block" : "hidden"}`}
                  style={{ cursor }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  data-testid="bc-canvas-front"
                />
                <canvas
                  ref={backCanvasRef}
                  width={CARD_W}
                  height={CARD_H}
                  className={`w-full h-full touch-none select-none ${side === "back" ? "block" : "hidden"}`}
                  style={{ cursor }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  data-testid="bc-canvas-back"
                />
              </div>
            </div>

            {/* Both-sides mini preview */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                {isAR ? "نظرة سريعة على الجانبين" : "Both Sides"}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniPreview canvasRef={frontCanvasRef} label={isAR ? "أمامي" : "Front"} />
                <MiniPreview canvasRef={backCanvasRef}  label={isAR ? "خلفي" : "Back"} />
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {isAR
                ? "الحجم القياسي: 8.9 × 5.1 سم • تصدير 300 DPI جاهز للطباعة"
                : "Standard size: 3.5″ × 2″ • Exported at 300 DPI, print-ready"}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ──────────────────────────────── Small inputs ──────────────────────────────── */

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
      />
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
        <input type="text"  value={value} onChange={e => onChange(e.target.value)} className="w-full text-[11px] bg-transparent focus:outline-none px-1" />
      </div>
    </div>
  );
}

function MiniPreview({ canvasRef, label }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; label: string }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    const id = setInterval(() => {
      if (canvasRef.current) setSrc(canvasRef.current.toDataURL("image/png"));
    }, 600);
    return () => clearInterval(id);
  }, [canvasRef]);
  return (
    <div>
      <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">{label}</div>
      <div className="rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800 aspect-[7/4]">
        {src && <img src={src} alt={label} className="w-full h-full object-cover" />}
      </div>
    </div>
  );
}
