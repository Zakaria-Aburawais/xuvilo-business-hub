import { useEffect, useRef } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface AppLayoutProps {
  children: React.ReactNode;
  noFooter?: boolean;
}

function FloatingBrandWatermark() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const el = ref.current;
        if (!el) return;
        // Oscillate within the viewport instead of drifting away,
        // so the watermark stays visible no matter how far we scroll.
        const y = Math.sin(window.scrollY / 350) * 80;
        const x = Math.cos(window.scrollY / 500) * 30;
        const rot = -4 + Math.sin(window.scrollY / 400) * 4;
        el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={ref}
        className="brand-watermark-fade absolute top-1/2 left-1/2 select-none opacity-[0.05] dark:opacity-[0.07] flex flex-col items-center leading-none"
        style={{ transform: "translate(-50%, -50%) rotate(-4deg)" }}
      >
        <span
          className="font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-blue-500 to-violet-600 bg-clip-text text-transparent"
          style={{ fontSize: "clamp(220px, 30vw, 460px)" }}
        >
          Xuvilo
        </span>
        <span
          className="font-semibold text-slate-700 dark:text-slate-300 mt-2"
          style={{ fontSize: "clamp(20px, 2.4vw, 38px)", letterSpacing: "0.32em" }}
        >
          AI BUSINESS TOOLS
        </span>
      </div>
    </div>
  );
}

export function AppLayout({ children, noFooter }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col text-foreground overflow-x-clip">
      <FloatingBrandWatermark />
      <Navbar />
      <main className="flex-1">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}
