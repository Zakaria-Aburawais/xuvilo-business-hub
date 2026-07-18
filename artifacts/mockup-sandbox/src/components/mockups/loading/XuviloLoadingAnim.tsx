import { useEffect, useRef, useState } from "react";

const R1 = "M16 10 Q14 8 17 8 L23 8 Q26 8 26 11 L29 50 Q29 58 22 60 Q14 60 14 53 Q14 50 17 50 Q20 50 20 52 L20 53 L19 13 Q19 11 17 11 Z";
const R2 = "M30 10 Q28 8 31 8 L37 8 Q40 8 40 11 L43 56 Q43 65 35 66 Q26 66 26 58 Q26 55 29 55 Q32 55 32 57 L32 58 L33 13 Q33 11 31 11 Z";
const R3 = "M44 10 Q42 8 45 8 L51 8 Q54 8 54 11 L57 48 Q57 56 50 58 Q42 58 42 51 Q42 48 45 48 Q48 48 48 50 L48 51 L47 13 Q47 11 45 11 Z";

const STYLES = `
/* ── Base ribbon styles ── */
.xvl-r {
  transform-box: fill-box;
  transform-origin: center;
  will-change: transform, opacity;
}

/* ── Loading fly keyframes ── */
@keyframes xvl-r1 {
  0%   { transform: none; opacity: 1; }
  10%  { transform: translate(-18px,-55px)  rotate(-14deg) scaleX(.78); opacity: .97; }
  30%  { transform: translate(-140px,-195px) rotate(-42deg) scaleX(.38); opacity: .88; }
  52%  { transform: translate(-248px,-72px)  rotate(-62deg) scaleX(.28); opacity: .82; }
  72%  { transform: translate(-168px, 108px) rotate(-30deg) scaleX(.44); opacity: .88; }
  90%  { transform: translate(-26px,  20px)  rotate(-6deg)  scaleX(.88); opacity: .97; }
  100% { transform: none; opacity: 1; }
}
@keyframes xvl-r2 {
  0%   { transform: none; opacity: 1; }
  10%  { transform: translate( 12px,-60px)  rotate( 10deg) scaleX(.78); opacity: .97; }
  30%  { transform: translate( 95px,-208px) rotate( 26deg) scaleX(.4);  opacity: .88; }
  52%  { transform: translate(238px,-115px) rotate( 50deg) scaleX(.28); opacity: .82; }
  72%  { transform: translate(172px,  68px) rotate( 24deg) scaleX(.48); opacity: .88; }
  90%  { transform: translate( 22px,  14px) rotate(  4deg) scaleX(.88); opacity: .97; }
  100% { transform: none; opacity: 1; }
}
@keyframes xvl-r3 {
  0%   { transform: none; opacity: 1; }
  10%  { transform: translate( 42px, 38px)  rotate( 16deg) scaleX(.78); opacity: .97; }
  30%  { transform: translate(125px, 188px) rotate( 40deg) scaleX(.4);  opacity: .88; }
  52%  { transform: translate( 52px, 268px) rotate( 24deg) scaleX(.32); opacity: .82; }
  72%  { transform: translate(-108px,192px) rotate(  8deg) scaleX(.48); opacity: .88; }
  90%  { transform: translate( -22px, 28px) rotate(  3deg) scaleX(.9);  opacity: .97; }
  100% { transform: none; opacity: 1; }
}

.xvl-r.fly1 { animation: xvl-r1 2.2s cubic-bezier(.45,0,.55,1) both; }
.xvl-r.fly2 { animation: xvl-r2 2.2s cubic-bezier(.45,0,.55,1) .07s both; }
.xvl-r.fly3 { animation: xvl-r3 2.2s cubic-bezier(.45,0,.55,1) .05s both; }

/* ── Glow pulse on reassembly ── */
@keyframes xvl-glow {
  0%   { filter: none; }
  45%  { filter: drop-shadow(0 0 14px rgba(37,99,235,.78)) drop-shadow(0 0 28px rgba(99,102,241,.42)); }
  100% { filter: drop-shadow(0 0 5px  rgba(37,99,235,.22)); }
}
.xvl-glow { animation: xvl-glow .65s ease-out both; }

/* ── Loader fade-out ── */
@keyframes xvl-out {
  to { opacity: 0; pointer-events: none; }
}
.xvl-out { animation: xvl-out .5s ease-out forwards; }

/* ── Wordmark transition ── */
.xvl-word { transition: opacity .35s ease; }

/* ── Reduced-motion fallback ── */
@keyframes xvl-pulse {
  0%,100% { opacity: 1; }
  50% { opacity: .6; }
}
@media (prefers-reduced-motion: reduce) {
  .xvl-r.fly1, .xvl-r.fly2, .xvl-r.fly3 { animation: none; }
  .xvl-glow { animation: none; filter: none; }
  .xvl-symbol { animation: xvl-pulse 2s ease-in-out infinite; }
}
`;

type Phase = "idle" | "flying" | "glowing";

export default function XuviloLoadingAnim() {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [wordVis, setWordVis]     = useState(true);
  const [done, setDone]           = useState(false);
  const [showBtn, setShowBtn]     = useState(false);
  const mounted                   = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const ids: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { if (mounted.current) fn(); }, ms);
      ids.push(t);
    };

    function cycle() {
      setWordVis(false);
      later(() => {
        setPhase("flying");
        later(() => {
          setPhase("glowing");
          setWordVis(true);
          later(() => {
            setPhase("idle");
            later(cycle, 300);
          }, 650);
        }, 2250);
      }, 200);
    }

    later(cycle, 500);
    later(() => setShowBtn(true), 1600);

    return () => { mounted.current = false; ids.forEach(clearTimeout); };
  }, []);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      <style>{STYLES}</style>

      <div
        className={done ? "xvl-out" : ""}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "linear-gradient(135deg,#ffffff 0%,#eff6ff 55%,#e0e7ff 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 0,
        }}
        aria-hidden="true"
      >
        {/* ── SVG symbol with independently-animated ribbon groups ── */}
        <div style={{ position: "relative" }}>
          <svg
            className={phase === "glowing" ? "xvl-symbol xvl-glow" : "xvl-symbol"}
            width={110} height={110}
            viewBox="0 0 100 100"
            style={{ overflow: "visible", display: "block" }}
          >
            <defs>
              <linearGradient id="xvl-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#1e1b4b" />
                <stop offset="55%"  stopColor="#1e40af" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id="xvl-g2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#2563eb" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <linearGradient id="xvl-g3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#bae6fd" />
              </linearGradient>
            </defs>

            {/*
              Group positions the three favicon ribbon paths (72×72 viewBox)
              centred at SVG (50,50):
              translate(50,50) · scale(1.389) · translate(-35.5,-37)
            */}
            <g transform="translate(50 50) scale(1.389) translate(-35.5 -37)">
              <g className={
                !reducedMotion && phase === "flying"
                  ? "xvl-r fly1" : "xvl-r"
              }>
                <path d={R1} fill="url(#xvl-g1)" />
              </g>
              <g className={
                !reducedMotion && phase === "flying"
                  ? "xvl-r fly2" : "xvl-r"
              }>
                <path d={R2} fill="url(#xvl-g2)" />
              </g>
              <g className={
                !reducedMotion && phase === "flying"
                  ? "xvl-r fly3" : "xvl-r"
              }>
                <path d={R3} fill="url(#xvl-g3)" />
              </g>
            </g>
          </svg>
        </div>

        {/* ── Wordmark ── */}
        <div
          className="xvl-word"
          style={{
            marginTop: 22,
            textAlign: "center",
            opacity: wordVis ? 1 : 0,
          }}
        >
          <div style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: 38, fontWeight: 700,
            color: "#1e40af", letterSpacing: "-.02em", lineHeight: 1.1,
          }}>
            Xuvilo
          </div>
          <div style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: 10.5, fontWeight: 500, letterSpacing: ".26em",
            color: "#6b7280", marginTop: 5, textTransform: "uppercase",
          }}>
            Business Hub
          </div>
        </div>

        {/* ── Loading caption ── */}
        <p style={{
          marginTop: 36,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13, fontWeight: 500,
          color: "#6366f1", opacity: .85, letterSpacing: ".01em",
        }}>
          Preparing your business tools…
        </p>

        {/* ── Phase indicator (mockup only) ── */}
        <div style={{
          marginTop: 18,
          fontFamily: "monospace", fontSize: 11,
          color: "#94a3b8", letterSpacing: ".04em",
        }}>
          phase: <strong style={{ color: "#3b82f6" }}>{phase}</strong>
          {" · "}ribbons: <strong style={{ color: "#8b5cf6" }}>
            {phase === "flying" ? "flying" : "assembled"}
          </strong>
        </div>

        {/* ── Simulate "app ready" ── */}
        {showBtn && (
          <button
            onClick={() => setDone(true)}
            style={{
              position: "fixed", bottom: 28, right: 28,
              background: "linear-gradient(135deg,#1e40af,#4f46e5)",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 20px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(30,64,175,.35)",
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: ".02em",
            }}
          >
            Simulate: App Ready →
          </button>
        )}
      </div>

      {/* ── Placeholder "website content" visible after loader fades ── */}
      {done && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "white",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1e40af" }}>Xuvilo</div>
          <div style={{ color: "#6b7280", fontSize: 15 }}>
            ✓ Loader exited — website content visible
          </div>
          <button
            onClick={() => { setDone(false); setPhase("idle"); setWordVis(true); }}
            style={{
              marginTop: 8, padding: "8px 18px",
              background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: 8, cursor: "pointer", fontSize: 13,
              color: "#1e40af", fontFamily: "'Inter', system-ui",
            }}
          >
            ← Replay animation
          </button>
        </div>
      )}
    </>
  );
}
