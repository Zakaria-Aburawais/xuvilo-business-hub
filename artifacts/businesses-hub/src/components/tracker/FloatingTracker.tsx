import { useInvoiceTrack } from "@/context/InvoiceTrackContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import { FolderOpen, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

const SEEN_KEY = "tracker-seen-count";

function getSeenCount(): number {
  const v = localStorage.getItem(SEEN_KEY);
  return v ? parseInt(v, 10) : 0;
}

function markAllSeen(count: number) {
  localStorage.setItem(SEEN_KEY, String(count));
}

export default function FloatingTracker() {
  const { invoices } = useInvoiceTrack();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const tracker = useEntitlement("tracker");
  const isAR = lang === "ar";
  const [location, navigate] = useLocation();
  const count = invoices.length;

  const [seenCount, setSeenCount] = useState(getSeenCount);
  const unseen = Math.max(0, count - seenCount);

  /* When the user is ON the tracker page, immediately mark everything seen */
  useEffect(() => {
    if (location === "/tools/tracker" || location.startsWith("/invoice/track/")) {
      setSeenCount(count);
      markAllSeen(count);
    }
  }, [location, count]);

  if (location === "/tools/tracker" || location.startsWith("/invoice/track/")) return null;
  // Tracker is a subscriber-only feature — hide the floating launcher for
  // guests, free-tier users, and while we're still verifying the entitlement
  // (avoids briefly flashing the launcher to a free user on slow networks).
  if (!user || tracker.loading || !tracker.allowed) return null;

  function handleClick() {
    setSeenCount(count);
    markAllSeen(count);
    navigate(user ? "/tools/tracker" : "/login?next=/tools/tracker");
  }

  const tooltipLabel = user
    ? (isAR ? "متتبع المستندات" : "Document Tracker")
    : (isAR ? "سجّل دخولك للوصول" : "Sign in to access tracker");

  return (
    <div
      className={`fixed bottom-24 ${isAR ? "left-5" : "right-5"} group`}
      style={{ zIndex: 9999 }}
    >
      {/* Tooltip */}
      <div
        className={`absolute bottom-full mb-2 ${isAR ? "left-0" : "right-0"} pointer-events-none`}
      >
        <span className="block whitespace-nowrap bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
          {tooltipLabel}
        </span>
      </div>

      <button
        onClick={handleClick}
        className={`relative w-14 h-14 rounded-2xl shadow-xl transition-all duration-200 flex items-center justify-center ${
          user
            ? "bg-gradient-to-br from-blue-600 to-violet-600 hover:scale-105 hover:shadow-2xl"
            : "bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500"
        }`}
        aria-label={tooltipLabel}
      >
        {user ? <FolderOpen className="w-6 h-6 text-white" /> : <Lock className="w-5 h-5 text-white" />}
        {user && unseen > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {unseen > 99 ? "99+" : unseen}
          </span>
        )}
      </button>
    </div>
  );
}
