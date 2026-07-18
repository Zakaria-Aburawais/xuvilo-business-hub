import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import useSWR from "swr";
import DOMPurify from "dompurify";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Inbox, Copy, RefreshCw, Trash2, Mail, Printer,
  ChevronLeft, Clock, AlertTriangle, CheckCircle, X, Link,
} from "lucide-react";

/* ──────────────────────────────── Constants ──────────────────────────────── */

const API = "/api-proxy/api/tempmail";
const TOTAL_SECONDS = 600; // 10 minutes
const CIRC = 2 * Math.PI * 45; // SVG ring circumference (r=45)

const ADJECTIVES = ["swift", "bright", "silver", "cyber", "delta", "alpha", "nova", "prime", "bold", "sharp", "quick", "smart", "rapid", "keen", "clear"];
const NOUNS = ["trader", "hub", "desk", "mail", "box", "zone", "link", "node", "port", "base", "inbox", "post", "cloud", "gate", "store"];

/* ──────────────────────────────── Types ──────────────────────────────────── */

interface MailSession {
  address: string;
  password: string;
  token: string;
  accountId: string;
  domain: string;
  createdAt: number;
}

interface MailMessage {
  id: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  subject: string;
  intro: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  createdAt: string;
  html?: string[];
  text?: string;
}

interface ToastItem {
  id: number;
  sender: string;
  subject: string;
}

/* ──────────────────────────────── Helpers ─────────────────────────────────── */

function rand<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function randDigits(n: number) { return String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0"); }
function generateUsername() { return `${rand(ADJECTIVES)}-${rand(NOUNS)}-${randDigits(4)}`; }
function generatePassword() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join("").toUpperCase().slice(0, 16);
}

function relativeTime(dateStr: string, isAR: boolean): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return isAR ? "الآن" : "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return isAR ? `منذ ${m} د` : `${m} min ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return isAR ? `منذ ${h} س` : `${h}h ago`;
  }
  return new Date(dateStr).toLocaleDateString(isAR ? "ar" : undefined);
}

function formatMM_SS(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function ringColor(sec: number) {
  if (sec > 300) return "#22c55e";
  if (sec > 120) return "#f59e0b";
  return "#ef4444";
}

/* ────────────────────────── Sub-components ───────────────────────────────── */

function CountdownRing({ seconds }: { seconds: number }) {
  const offset = CIRC * (1 - seconds / TOTAL_SECONDS);
  const color = ringColor(seconds);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" width="72" height="72" className="rotate-[-90deg]">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="7" className="dark:stroke-gray-700" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear, stroke 1s" }} />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fontSize="18" fontWeight="700" fill={color} className="rotate-90 origin-center"
          style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }}>
          {formatMM_SS(seconds)}
        </text>
      </svg>
      <span className="text-xs text-gray-400">{seconds > 0 ? "expires in" : "expired"}</span>
    </div>
  );
}

function ToastNotification({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-200 dark:border-blue-700 px-4 py-3 max-w-xs animate-in slide-in-from-right-4">
          <span className="text-xl">📬</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">New email from {t.sender}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.subject}</p>
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function EmptyInbox({ isAR }: { isAR: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <svg width="80" height="80" viewBox="0 0 80 80" className="mb-4 opacity-20 dark:opacity-15">
        <rect x="8" y="24" width="64" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M8 30 L40 52 L72 30" stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round" />
        <path d="M8 68 L28 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M72 68 L52 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="56" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" />
      </svg>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        {isAR ? "في انتظار الرسائل..." : "Waiting for emails..."}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-52">
        {isAR ? "انسخ العنوان أعلاه واستخدمه في أي موقع" : "Copy the address above and use it on any website"}
      </p>
    </div>
  );
}

function EmailRow({ msg, selected, readSet, onSelect, onDelete, isAR }: {
  msg: MailMessage;
  selected: boolean;
  readSet: Set<string>;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isAR: boolean;
}) {
  const isRead = readSet.has(msg.id) || msg.seen;
  return (
    <div onClick={onSelect}
      className={`group relative flex flex-col px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${selected ? "bg-blue-50 dark:bg-blue-900/20" : ""} ${!isRead ? "border-l-2 border-l-blue-500" : ""}`}>
      {!isRead && (
        <span className="absolute top-3 right-4 w-2 h-2 rounded-full bg-blue-500" />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm truncate ${!isRead ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>
          {msg.from.name || msg.from.address}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0">{relativeTime(msg.createdAt, isAR)}</span>
      </div>
      <span className={`text-xs truncate ${!isRead ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}`}>
        {msg.subject || "(no subject)"}
      </span>
      <span className="text-xs text-gray-400 truncate">{(msg.intro || "").slice(0, 80)}</span>
      <button onClick={onDelete}
        className="absolute right-3 bottom-3 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* ──────────────────────────── Main Page ───────────────────────────────────── */

export default function TempEmail() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  /* Ref so generateSession (deps: []) can read the current language without
     re-creating the callback — which would re-trigger the session effect. */
  const langRef = useRef(lang);
  langRef.current = lang;
  const [, navigate] = useLocation();

  const [session, setSession] = useState<MailSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<MailMessage | null>(null);
  const [fullMsg, setFullMsg] = useState<MailMessage | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [showExpiry, setShowExpiry] = useState(false);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [mobileView, setMobileView] = useState<"inbox" | "reader">("inbox");
  const prevMsgIds = useRef<Set<string>>(new Set());
  const toastId = useRef(0);
  const openReqId = useRef(0);

  const t = (en: string, ar: string) => isAR ? ar : en;

  /* ─── Load domains on mount ─── */
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API}/domains`, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        const raw = Array.isArray(d) ? d : (d["hydra:member"] || []);
        const list: string[] = raw.map((x: { domain: string }) => x.domain);
        setDomains(list);
        if (list.length > 0) setSelectedDomain(list[0]);
        else setError("No email domains available — please try again later.");
      })
      .catch(e => {
        if ((e as Error).name !== "AbortError") {
          console.error("[TempEmail] domain fetch failed:", e);
          setError("Could not reach mail service. Please refresh the page.");
        }
      });
    return () => ctrl.abort();
  }, []);

  /* ─── Timed fetch helper ─── */
  async function timedFetch(url: string, opts: RequestInit = {}, ms = 15000): Promise<Response> {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new Error("Request timed out after 15 s — check your connection and try again.");
      throw e;
    } finally {
      clearTimeout(id);
    }
  }

  /* ─── Restore or generate session ─── */
  const generateSession = useCallback(async (domain: string) => {
    setGenerating(true);
    setError(null);
    try {
      const username = generateUsername();
      const password = generatePassword();
      const address = `${username}@${domain}`;

      const acctRes = await timedFetch(`${API}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, password }),
      });
      const acct = await acctRes.json();
      if (!acctRes.ok) {
        const msg = acct?.["hydra:description"] || acct?.detail || `HTTP ${acctRes.status}`;
        throw new Error(`Account creation failed: ${msg}`);
      }

      const tokenRes = await timedFetch(`${API}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, password }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`Auth failed: HTTP ${tokenRes.status}`);
      if (!tokenData.token) throw new Error("No token returned — please try again.");

      const sess: MailSession = {
        address,
        password,
        token: tokenData.token,
        accountId: acct.id,
        domain,
        createdAt: Date.now(),
      };
      sessionStorage.setItem("tmpmail", JSON.stringify(sess));
      setSession(sess);
      trackEvent("temp_email_created", { language: langRef.current });
      setTimeLeft(TOTAL_SECONDS);
      setShowExpiry(false);
    } catch (e) {
      const msg = (e as Error).message || "Unknown error";
      console.error("[TempEmail] generateSession failed:", msg);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDomain) return;
    const saved = sessionStorage.getItem("tmpmail");
    if (saved) {
      try {
        const parsed: MailSession = JSON.parse(saved);
        if (parsed.domain === selectedDomain && Date.now() - parsed.createdAt < 30 * 60 * 1000) {
          setSession(parsed);
          setTimeLeft(TOTAL_SECONDS);
          return;
        }
      } catch {}
    }
    generateSession(selectedDomain);
  }, [selectedDomain, generateSession]);

  /* ─── Countdown timer ─── */
  useEffect(() => {
    if (!session || showExpiry) return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setShowExpiry(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [session, showExpiry]);

  const resetTimer = () => setTimeLeft(TOTAL_SECONDS);

  /* ─── SWR polling ─── */
  const { data: messagesData, mutate: refreshMessages, isValidating } = useSWR(
    session ? `messages-${session.address}` : null,
    async () => {
      const r = await fetch(`${API}/messages`, {
        headers: { Authorization: `Bearer ${session!.token}` },
      });
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    { refreshInterval: 10000, dedupingInterval: 5000 }
  );

  const messages: MailMessage[] = messagesData
    ? (Array.isArray(messagesData) ? messagesData : (messagesData["hydra:member"] || []))
    : [];

  /* ─── Detect new emails → toast ─── */
  useEffect(() => {
    if (!messages.length) return;
    const newMsgs = messages.filter(m => !prevMsgIds.current.has(m.id));
    newMsgs.forEach(m => {
      const id = ++toastId.current;
      setToasts(prev => [...prev.slice(-2), { id, sender: m.from.name || m.from.address, subject: m.subject || "(no subject)" }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    });
    prevMsgIds.current = new Set(messages.map(m => m.id));
  }, [messages]);

  /* ─── Open email full content ─── */
  const openEmail = async (msg: MailMessage) => {
    setSelectedMsg(msg);
    setFullMsg(null);
    setMobileView("reader");
    setReadSet(prev => new Set([...prev, msg.id]));
    resetTimer();
    if (!session) return;
    openReqId.current += 1;
    const reqId = openReqId.current;
    try {
      const r = await fetch(`${API}/message/${msg.id}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await r.json();
      if (reqId !== openReqId.current) return; // a newer email was opened
      setFullMsg(data);
      await fetch(`${API}/message/${msg.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => {});
    } catch {}
  };

  /* ─── Delete email ─── */
  const deleteEmail = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!session) return;
    await fetch(`${API}/message/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.token}` },
    }).catch(() => {});
    if (selectedMsg?.id === id) { setSelectedMsg(null); setFullMsg(null); }
    refreshMessages();
  };

  /* ─── Copy address ─── */
  const copyAddress = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("Couldn't copy — please select and copy the address manually.", "تعذّر النسخ — يرجى تحديد العنوان ونسخه يدويًا."));
      setTimeout(() => setError(null), 4000);
    }
    resetTimer();
  };

  /* ─── New address ─── */
  const handleNewAddress = () => {
    setShowNewConfirm(true);
  };
  const confirmNewAddress = () => {
    setShowNewConfirm(false);
    sessionStorage.removeItem("tmpmail");
    setSession(null);
    setSelectedMsg(null);
    setFullMsg(null);
    setReadSet(new Set());
    prevMsgIds.current = new Set();
    if (selectedDomain) generateSession(selectedDomain);
  };

  const unreadCount = messages.filter(m => !readSet.has(m.id) && !m.seen).length;

  /* ────────────────────────── RENDER ──────────────────────────────────────── */

  return (
    <AppLayout>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={isAR ? "rtl" : "ltr"}>
      {/* Toasts */}
      <ToastNotification toasts={toasts} onDismiss={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* Expiry overlay */}
      {showExpiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 max-w-md text-center space-y-5">
            <div className="text-6xl">⏰</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("Your inbox has expired", "انتهت صلاحية صندوق بريدك")}
            </h2>
            <p className="text-sm text-gray-500">
              {t("All emails have been deleted. Generate a new inbox to continue.", "تم حذف جميع الرسائل. أنشئ صندوقاً جديداً للمتابعة.")}
            </p>
            <button onClick={confirmNewAddress}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              {t("Generate New Inbox", "إنشاء صندوق بريد جديد")}
            </button>
          </div>
        </div>
      )}

      {/* Confirm new address dialog */}
      {showNewConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-bold text-gray-900 dark:text-white">
              {t("Delete current inbox?", "حذف صندوق البريد الحالي؟")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("This will permanently delete your current address and all emails.", "سيؤدي هذا إلى حذف عنوانك الحالي وجميع رسائله نهائياً.")}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowNewConfirm(false)}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                {t("Cancel", "إلغاء")}
              </button>
              <button onClick={confirmNewAddress}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">
                {t("Yes, delete", "نعم، احذف")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-min warning banner */}
      {timeLeft > 0 && timeLeft <= 60 && !showExpiry && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 text-sm font-medium">
          <AlertTriangle size={15} />
          {t("Your inbox expires in 1 minute — click Extend to keep it.", "ينتهي صندوق بريدك خلال دقيقة — اضغط 'تمديد' للإبقاء عليه.")}
          <button onClick={resetTimer} className="ml-2 underline font-semibold">
            {t("Extend", "تمديد")}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("Free Temporary Email", "بريد إلكتروني مؤقت مجاني")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("Instant disposable inbox — no signup, auto-refreshes every 10 seconds", "صندوق بريد مؤقت فوري — بدون تسجيل، يتجدد تلقائياً كل 10 ثوانٍ")}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* ── Address Card ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">

            {/* Icon + label */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Inbox className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t("Your temporary email", "بريدك المؤقت")}
                </p>
                <p className="text-xs text-gray-400">{t("Auto-refreshes every 10s", "يتجدد كل 10 ثوانٍ")}</p>
              </div>
            </div>

            {/* Address display */}
            <div className="flex-1 min-w-0">
              {(generating || (!selectedDomain && !error)) ? (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                    {t("Generating your email address…", "جارٍ إنشاء بريدك الإلكتروني…")}
                  </span>
                </div>
              ) : session ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="font-mono text-lg font-bold text-gray-900 dark:text-white flex-1 min-w-0 truncate">
                    {session.address}
                  </span>
                </div>
              ) : error ? (
                <div className="flex flex-col gap-1.5 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    ⚠ {t("Could not generate inbox", "تعذّر إنشاء صندوق البريد")}
                  </span>
                  <span className="text-xs text-red-500 dark:text-red-400 break-all">{error}</span>
                  <button onClick={() => generateSession(selectedDomain)}
                    className="self-start text-xs font-semibold text-blue-600 dark:text-blue-400 underline mt-0.5">
                    {t("↺ Try again", "↺ حاول مجدداً")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                    {t("Generating your email address…", "جارٍ إنشاء بريدك الإلكتروني…")}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={copyAddress} disabled={!session}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${copied ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600"}`}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? t("Copied!", "تم النسخ!") : t("Copy", "نسخ")}
              </button>
              <button onClick={handleNewAddress} disabled={generating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 transition-all">
                <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
                {t("New", "جديد")}
              </button>
            </div>

            {/* Countdown ring */}
            {session && <CountdownRing seconds={timeLeft} />}
          </div>

          {/* Domain selector + extend + shortcut */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            {domains.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t("Domain:", "النطاق:")}</span>
                <select value={selectedDomain} onChange={e => {
                  setSelectedDomain(e.target.value);
                  sessionStorage.removeItem("tmpmail");
                  setSession(null);
                }}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {domains.map(d => <option key={d} value={d}>@{d}</option>)}
                </select>
              </div>
            )}
            <button onClick={resetTimer}
              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
              <Clock size={13} />
              {t("Extend timer", "تمديد المؤقت")}
            </button>
            <button onClick={() => session && navigate(`/signup?email=${encodeURIComponent(session.address)}`)}
              disabled={!session}
              className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium disabled:opacity-40">
              <Link size={13} />
              {t("Use this email to sign up on Xuvilo", "استخدم هذا البريد للتسجيل في Xuvilo")}
            </button>
          </div>

          {/* Privacy notice */}
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
            ⚠️ {isAR
              ? "هذا صندوق بريد مؤقت. لا تستخدمه للحسابات المهمة أو الاتصالات الخاصة. يتم حذف الرسائل تلقائياً بعد 10 دقائق من عدم النشاط."
              : "This is a temporary inbox. Do not use it for important accounts or private communications. Emails are automatically deleted after 10 minutes of inactivity."}
          </div>
        </div>

        {/* ── Inbox + Reader ─────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 min-h-[500px]">

          {/* Inbox list */}
          <div className={`lg:w-[35%] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col ${mobileView === "reader" ? "hidden lg:flex" : "flex"}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                  {t("Inbox", "البريد الوارد")}
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">{unreadCount}</span>
                )}
              </div>
              <button onClick={() => { refreshMessages(); resetTimer(); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={15} className={isValidating ? "animate-spin" : ""} />
              </button>
            </div>

            {isValidating && messages.length === 0 && (
              <div className="flex justify-center py-3">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <EmptyInbox isAR={isAR} />
              ) : (
                messages.map(msg => (
                  <EmailRow key={msg.id} msg={msg} selected={selectedMsg?.id === msg.id}
                    readSet={readSet}
                    isAR={isAR}
                    onSelect={() => openEmail(msg)}
                    onDelete={(e) => deleteEmail(msg.id, e)} />
                ))
              )}
            </div>
          </div>

          {/* Email reader */}
          <div className={`lg:w-[65%] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col ${mobileView === "inbox" ? "hidden lg:flex" : "flex"}`}>
            {!selectedMsg ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-gray-400">
                <Mail className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">{t("Select an email to read it", "اختر رسالة لقراءتها")}</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Reader header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => { setMobileView("inbox"); setSelectedMsg(null); }}
                      className="lg:hidden flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                      <ChevronLeft size={16} /> {t("Back", "رجوع")}
                    </button>
                    <div className="flex items-center gap-2 ms-auto">
                      <button onClick={() => window.print()}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors" title={t("Print", "طباعة")}>
                        <Printer size={15} />
                      </button>
                      <button onClick={() => deleteEmail(selectedMsg.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {selectedMsg.subject || t("(no subject)", "(بدون موضوع)")}
                  </h3>
                  <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">{t("From:", "من:")} </span>{selectedMsg.from.name ? `${selectedMsg.from.name} <${selectedMsg.from.address}>` : selectedMsg.from.address}</div>
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">{t("To:", "إلى:")} </span>{selectedMsg.to?.[0]?.address || session?.address}</div>
                    <div><span className="font-medium text-gray-700 dark:text-gray-300">{t("Date:", "التاريخ:")} </span>{new Date(selectedMsg.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                  {!fullMsg ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : fullMsg.html?.[0] ? (
                    <iframe
                      title="email-body"
                      sandbox="allow-same-origin"
                      srcDoc={DOMPurify.sanitize(fullMsg.html[0])}
                      className="w-full h-full min-h-[400px] border-0"
                    />
                  ) : (
                    <pre className="p-5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                      {fullMsg.text || t("No message content.", "لا يوجد محتوى للرسالة.")}
                    </pre>
                  )}
                </div>

                {/* Attachments notice */}
                {fullMsg?.hasAttachments && (
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                    📎 {t("This email contains attachments (downloads may not be supported in the preview).", "تحتوي هذه الرسالة على مرفقات (قد لا تكون التنزيلات مدعومة في المعاينة).")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── SEO Content Block ──────────────────────────────────── */}
        <div className="space-y-8 pt-6 pb-12 text-gray-700 dark:text-gray-300">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {isAR ? "ما هو البريد الإلكتروني المؤقت ومتى يجب استخدامه؟" : "What is a Temporary Email and When Should You Use One?"}
            </h2>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>{isAR
                ? "البريد الإلكتروني المؤقت (أو البريد الإلكتروني القابل للتخلص) هو عنوان بريد إلكتروني يُنشأ فورياً في المتصفح دون الحاجة إلى تسجيل أي بيانات شخصية. يُستخدم للتواصل لفترة محدودة ثم يُحذف تلقائياً، مما يحمي هويتك وبياناتك الحقيقية من الانكشاف."
                : "A temporary email (also called a disposable email address) is an inbox created instantly in your browser without any personal registration. It is used for short-term communication and automatically deleted afterward, protecting your real identity and primary inbox from exposure."}
              </p>
              <p>{isAR
                ? "من أبرز استخدامات البريد المؤقت: التسجيل في المواقع التي تشترط بريداً إلكترونياً دون أن تحتاج لمتابعتها، تجنب الرسائل الترويجية والبريد العشوائي بعد التسجيل، وإجراء اختبارات الأنظمة والتطبيقات التي تتطلب تأكيد البريد الإلكتروني."
                : "Key use cases include: registering on websites that require an email without wanting follow-up marketing, preventing spam from hitting your main inbox after sign-up, and testing applications or systems that require email verification during development."}
              </p>
              <p>{isAR
                ? "تعمل هذه الخدمة عبر API مخصصة تُنشئ صندوق بريد مؤقت فوري. يُعرض العنوان الذي تم إنشاؤه في الصفحة ويمكنك نسخه على الفور. كل رسالة تصل إلى هذا العنوان تُعرض في الصندوق الذي يتجدد تلقائياً كل 10 ثوانٍ، ويمكنك قراءة الرسائل مباشرة دون مغادرة الصفحة."
                : "The service works through a dedicated API that creates an instant temporary mailbox. The generated address is displayed immediately and you can copy it with one click. Every email sent to this address appears in the inbox, which auto-refreshes every 10 seconds, and you can read messages directly in the built-in email viewer."}
              </p>
              <p>{isAR
                ? "ضع في اعتبارك القيود التالية: البريد المؤقت غير مناسب للحسابات المهمة أو طويلة الأمد، لا يمكن استخدامه لإرسال رسائل، ولا ينبغي الاعتماد عليه للمعلومات الحساسة. يُنصح باستخدامه فقط للتحقق السريع من الرسائل الترحيبية وأكواد التفعيل."
                : "Be aware of limitations: temporary email is not suitable for important or long-term accounts, cannot be used to send emails, and should not hold sensitive information. It is best used for quick verification of welcome emails and activation codes only."}
              </p>
            </div>
          </div>

          {/* Internal links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/invoice", en: "Invoice Generator", ar: "مولّد الفواتير" },
              { href: "/tools/stamp-maker", en: "Stamp Maker", ar: "صانع الأختام" },
              { href: "/calculators", en: "Business Calculators", ar: "الآلات الحاسبة" },
            ].map(link => (
              <button key={link.href} onClick={() => navigate(link.href)}
                className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-medium transition-colors border border-blue-200 dark:border-blue-800">
                <Link size={14} />
                {isAR ? link.ar : link.en}
              </button>
            ))}
          </div>

          {/* FAQ */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {isAR ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
            </h3>
            {[
              {
                q: isAR ? "ما هو عنوان البريد الإلكتروني المؤقت؟" : "What is a temporary email address?",
                a: isAR ? "هو عنوان بريد إلكتروني يُنشأ فورياً للاستخدام المؤقت، دون الحاجة إلى التسجيل ببيانات شخصية. يُحذف تلقائياً بعد فترة محددة من عدم النشاط." : "A temporary email address is an instantly generated inbox for short-term use, requiring no personal registration. It is automatically deleted after a period of inactivity.",
              },
              {
                q: isAR ? "هل البريد المؤقت آمن للاستخدام؟" : "Is temporary email safe to use?",
                a: isAR ? "البريد المؤقت آمن للتسجيل السريع وتلقي أكواد التفعيل. لكن لا تستخدمه لتلقي معلومات حساسة ككلمات المرور أو البيانات المالية، إذ قد يتمكن أي شخص يعلم بالعنوان من قراءة رسائله." : "Temporary email is safe for quick registrations and receiving activation codes. However, do not use it for sensitive information like passwords or financial data, as anyone who knows the address could potentially read its messages.",
              },
              {
                q: isAR ? "كم تدوم مدة البريد المؤقت؟" : "How long does a temporary email last?",
                a: isAR ? "تستمر صلاحية صندوق البريد المؤقت في هذه الخدمة لمدة 10 دقائق من آخر نشاط. يمكنك تمديده بالضغط على زر 'تمديد' أو بقراءة الرسائل ونسخ العنوان." : "The temporary inbox in this service lasts 10 minutes from the last activity. You can extend it by clicking the 'Extend' button or by reading messages and copying the address.",
              },
              {
                q: isAR ? "هل يمكنني استقبال أي بريد إلكتروني على عنوان مؤقت؟" : "Can I receive any email on a temporary address?",
                a: isAR ? "نعم، يمكنك استقبال معظم الرسائل من أي موقع. قد يرفض بعض المواقع عناوين من النطاقات المؤقتة المعروفة. في هذه الحالة، جرب اختيار نطاق مختلف من القائمة المنسدلة." : "Yes, you can receive most emails from any website. Some sites block known temporary email domains. In that case, try selecting a different domain from the dropdown selector.",
              },
              {
                q: isAR ? "ما الفرق بين البريد المؤقت والبريد المجهول؟" : "What is the difference between temporary email and anonymous email?",
                a: isAR ? "البريد المؤقت يُستخدم لاستقبال رسائل لفترة قصيرة ثم يُحذف. أما البريد المجهول فيُستخدم لإرسال رسائل دون الكشف عن هوية المرسل. الاثنان أدوات مختلفة لأغراض مختلفة." : "Temporary email is for receiving messages for a short time before deletion. Anonymous email is for sending messages without revealing the sender's identity. They are different tools for different privacy purposes.",
              },
            ].map((item, i) => (
              <details key={i} className="group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer font-semibold text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 list-none flex items-center justify-between">
                  {item.q}
                  <ChevronLeft size={16} className="text-gray-400 group-open:rotate-90 transition-transform rotate-[-90deg]" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
