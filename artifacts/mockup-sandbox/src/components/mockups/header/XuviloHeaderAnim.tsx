import { useEffect, useRef, useState } from "react";

const R1 = "M16 10 Q14 8 17 8 L23 8 Q26 8 26 11 L29 50 Q29 58 22 60 Q14 60 14 53 Q14 50 17 50 Q20 50 20 52 L20 53 L19 13 Q19 11 17 11 Z";
const R2 = "M30 10 Q28 8 31 8 L37 8 Q40 8 40 11 L43 56 Q43 65 35 66 Q26 66 26 58 Q26 55 29 55 Q32 55 32 57 L32 58 L33 13 Q33 11 31 11 Z";
const R3 = "M44 10 Q42 8 45 8 L51 8 Q54 8 54 11 L57 48 Q57 56 50 58 Q42 58 42 51 Q42 48 45 48 Q48 48 48 50 L48 51 L47 13 Q47 11 45 11 Z";

const STYLES = `
/* ── Ribbon base ── */
.xvh-r {
  transform-box: fill-box;
  transform-origin: center;
  will-change: transform, opacity;
  pointer-events: none;
}

/*
  Ribbon 3 (cyan) flies around the "Xuvilo" wordmark.
  SVG is ~44px wide rendered at h-10 (40px).
  "Xuvilo" text starts ~52px and ends ~160px to the right of SVG left.
  Ribbon 3 natural CSS center ≈ (35px, 22px) within the SVG.
  Offsets are in CSS pixels:
    + x → toward / beyond wordmark
    - y → above nav
    + y → below nav
*/
@keyframes xvh-fly {
  0%   { transform: none; opacity: 1; }
  8%   { transform: translate(-8px,  -28px) rotate(-10deg) scaleX(.76); opacity: .96; }
  22%  { transform: translate( 48px, -52px) rotate(  8deg) scaleX(.55); opacity: .9; }
  40%  { transform: translate(128px, -58px) rotate( 18deg) scaleX(.42); opacity: .86; }
  56%  { transform: translate(165px, -10px) rotate( 28deg) scaleX(.38); opacity: .86; }
  70%  { transform: translate(118px,  34px) rotate( 14deg) scaleX(.48); opacity: .9; }
  85%  { transform: translate( 28px,  22px) rotate(  4deg) scaleX(.78); opacity: .96; }
  100% { transform: none; opacity: 1; }
}
.xvh-r.fly { animation: xvh-fly 3.1s cubic-bezier(.42,0,.58,1) both; }

/* ── Reduced-motion: no flight ── */
@media (prefers-reduced-motion: reduce) {
  .xvh-r.fly { animation: none; }
}
`;

const INTERVAL_MS   = 45_000;
const FIRST_DELAY   = 2_200;
const ANIM_DURATION = 3_200;

function useHeaderRibbonTimer(onTrigger: () => void) {
  const hiddenSince  = useRef<number | null>(null);
  const nextFireAt   = useRef<number>(Date.now() + FIRST_DELAY);
  const mountedRef   = useRef(true);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;

    function schedule(delay: number) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          onTrigger();
          nextFireAt.current = Date.now() + INTERVAL_MS;
          schedule(INTERVAL_MS);
        }
      }, Math.max(0, delay));
    }

    schedule(FIRST_DELAY);

    function handleVisibility() {
      if (document.hidden) {
        hiddenSince.current = Date.now();
        clearTimeout(timerRef.current);
      } else {
        const elapsed  = hiddenSince.current ? Date.now() - hiddenSince.current : 0;
        const remaining = nextFireAt.current - Date.now();
        schedule(Math.max(0, remaining - elapsed));
        hiddenSince.current = null;
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [onTrigger]);
}

function XuviloInlineLogo({ flying }: { flying: boolean }) {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
      {/* SVG symbol — overflow:visible so the ribbon can escape */}
      <svg
        width={44} height={44}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ overflow: "visible", flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="xvh-g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#1e1b4b" />
            <stop offset="55%"  stopColor="#1e40af" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="xvh-g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="xvh-g3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
        </defs>

        {/* Same centering transform used in loading preview */}
        <g transform="translate(50 50) scale(1.389) translate(-35.5 -37)">
          {/* Ribbons 1 and 2 always static */}
          <g className="xvh-r">
            <path d={R1} fill="url(#xvh-g1)" />
          </g>
          <g className="xvh-r">
            <path d={R2} fill="url(#xvh-g2)" />
          </g>
          {/* Ribbon 3 (cyan) — the one that flies */}
          <g className={!reducedMotion && flying ? "xvh-r fly" : "xvh-r"}>
            <path d={R3} fill="url(#xvh-g3)" />
          </g>
        </g>
      </svg>

      {/* Wordmark — stays completely static */}
      <div style={{ lineHeight: 1.05 }}>
        <div style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize: 20, fontWeight: 700,
          color: "#1e40af", letterSpacing: "-.02em",
        }}>
          Xuvilo
        </div>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 8.5, fontWeight: 500, letterSpacing: ".22em",
          color: "#6b7280", textTransform: "uppercase",
        }}>
          Business Hub
        </div>
      </div>
    </div>
  );
}

export default function XuviloHeaderAnim() {
  const [flying, setFlying]           = useState(false);
  const [countdown, setCountdown]     = useState(FIRST_DELAY / 1000);
  const [cycleCount, setCycleCount]   = useState(0);
  const [manualTrigger, setManualTrigger] = useState(0);

  function triggerAnim() {
    if (flying) return;
    setFlying(true);
    setCycleCount(c => c + 1);
    setTimeout(() => setFlying(false), ANIM_DURATION);
  }

  useHeaderRibbonTimer(triggerAnim);

  /* Live countdown for the mockup display */
  useEffect(() => {
    let elapsed = 0;
    const TICK = 100;
    const t = setInterval(() => {
      elapsed += TICK;
      const remaining = Math.max(0, FIRST_DELAY - elapsed);
      setCountdown(+(remaining / 1000).toFixed(1));
    }, TICK);
    return () => clearInterval(t);
  }, [manualTrigger]);

  return (
    <>
      <style>{STYLES}</style>

      <div style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>

        {/* ── Simulated navigation bar ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(255,255,255,.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 24px",
          height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 8px rgba(0,0,0,.06)",
        }}>
          <XuviloInlineLogo flying={flying} />

          {/* Nav links */}
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {["Documents", "Calculators", "Templates", "Pricing"].map(item => (
              <span key={item} style={{
                fontSize: 14, fontWeight: 500, color: "#475569", cursor: "pointer",
              }}>
                {item}
              </span>
            ))}
            <button style={{
              background: "linear-gradient(135deg,#1e40af,#4f46e5)",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Sign Up
            </button>
          </nav>
        </header>

        {/* ── Hero placeholder ── */}
        <main style={{
          maxWidth: 900, margin: "0 auto", padding: "64px 24px",
        }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: "#0f172a", lineHeight: 1.2, marginBottom: 16 }}>
            Create invoices,<br />
            <span style={{ color: "#1e40af" }}>receipts & business</span><br />
            documents in minutes.
          </div>
          <div style={{ color: "#64748b", fontSize: 17, maxWidth: 520, lineHeight: 1.6 }}>
            An AI-powered business toolkit for freelancers and SMEs —
            fully bilingual, 176+ currencies.
          </div>

          {/* ── Animation status panel ── */}
          <div style={{
            marginTop: 52,
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: 14, padding: 24, maxWidth: 480,
            boxShadow: "0 2px 12px rgba(0,0,0,.06)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Header Ribbon Animation
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "State",        value: flying ? "🎞 Flying" : "⬛ Idle", active: flying },
                { label: "Cycle count",  value: cycleCount.toString() },
                { label: "First play",   value: `${FIRST_DELAY / 1000}s after load` },
                { label: "Interval",     value: `${INTERVAL_MS / 1000}s` },
              ].map(({ label, value, active }) => (
                <div key={label} style={{
                  background: active ? "#eff6ff" : "#f8fafc",
                  border: `1px solid ${active ? "#bfdbfe" : "#e2e8f0"}`,
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? "#1e40af" : "#334155" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { triggerAnim(); setManualTrigger(x => x + 1); }}
                disabled={flying}
                style={{
                  flex: 1,
                  background: flying ? "#e2e8f0" : "linear-gradient(135deg,#1e40af,#4f46e5)",
                  color: flying ? "#94a3b8" : "#fff",
                  border: "none", borderRadius: 8,
                  padding: "10px 0", fontSize: 13, fontWeight: 600,
                  cursor: flying ? "default" : "pointer",
                  transition: "all .2s",
                }}
              >
                {flying ? "Animating…" : "▶ Trigger Now"}
              </button>
            </div>

            <p style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
              The cyan ribbon detaches from the symbol, sweeps over and around
              the word "Xuvilo", then returns precisely to its starting position.
              Animation pauses automatically when you switch browser tabs.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
