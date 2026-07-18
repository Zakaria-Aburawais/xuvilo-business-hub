import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Send, Copy, Download, RotateCcw, Loader2,
  Mail, FileText, Briefcase, AlertTriangle, Languages, MessageSquare,
  Building2, HandCoins, Wand2, Eraser, RefreshCcw, Wrench,
  History, Trash2, Search, X, Star,
} from "lucide-react";
import { getAuthToken } from "@/lib/billingApi";
import { trackEvent } from "@/lib/analytics";
import {
  listAiWriterDrafts,
  deleteAiWriterDraft,
  updateAiWriterDraft,
  type AiWriterDraft,
} from "@/lib/aiWriterApi";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";

type Purpose =
  | "payment_reminder"
  | "invoice_followup"
  | "quotation_submission"
  | "supplier_request"
  | "complaint_clarification"
  | "formal_business"
  | "improve_email"
  | "translate_ar_en"
  | "translate_en_ar";

type Lang = "en" | "ar";
type Tone = "formal" | "polite" | "firm" | "friendly" | "concise" | "professional";
type Length = "short" | "medium" | "detailed";

interface PurposeMeta {
  id: Purpose;
  iconKey: string;
  en: { label: string; description: string };
  ar: { label: string; description: string };
  exampleDetailsEn: string;
  exampleDetailsAr: string;
  exampleDraftEn?: string;
  exampleDraftAr?: string;
  requiresDraft?: boolean;
  /** When set, output language is forced to this value. */
  forcedLang?: Lang;
}

const PURPOSES: PurposeMeta[] = [
  {
    id: "payment_reminder",
    iconKey: "coins",
    en: { label: "Payment Reminder", description: "Friendly nudge for an unpaid invoice." },
    ar: { label: "تذكير بالدفع", description: "تذكير لطيف بفاتورة غير مدفوعة." },
    exampleDetailsEn: "Invoice INV-042 for $1,250 was due 14 days ago. No reply yet from the client. We need confirmation of the payment date.",
    exampleDetailsAr: "فاتورة رقم INV-042 بقيمة 1250 دولار كانت مستحقة منذ 14 يوماً. لا يوجد رد من العميل حتى الآن، ونحتاج تأكيد موعد الدفع.",
  },
  {
    id: "invoice_followup",
    iconKey: "file",
    en: { label: "Invoice Follow-up", description: "Confirm receipt and ask for status." },
    ar: { label: "متابعة فاتورة", description: "تأكيد الاستلام والاستفسار عن الحالة." },
    exampleDetailsEn: "Sent invoice last Monday for the website redesign project. Want to confirm it was received and check the expected payment date.",
    exampleDetailsAr: "أرسلنا الفاتورة الإثنين الماضي لمشروع إعادة تصميم الموقع. نريد تأكيد الاستلام والتحقق من موعد الدفع المتوقع.",
  },
  {
    id: "quotation_submission",
    iconKey: "send",
    en: { label: "Quotation Submission", description: "Send a quote with terms and CTA." },
    ar: { label: "إرسال عرض سعر", description: "إرسال عرض السعر مع الشروط والدعوة للقبول." },
    exampleDetailsEn: "Quotation for office furniture: 12 desks + 24 chairs. 4-week delivery. Quote valid 14 days. Payment 50% advance, 50% on delivery.",
    exampleDetailsAr: "عرض سعر لأثاث مكتبي: 12 مكتب + 24 كرسي. التسليم خلال 4 أسابيع. العرض صالح 14 يوماً. الدفع 50% مقدم و50% عند التسليم.",
  },
  {
    id: "supplier_request",
    iconKey: "building",
    en: { label: "Supplier Request", description: "Ask for quote, sample, or lead time." },
    ar: { label: "طلب من مورد", description: "طلب عرض سعر أو عينة أو موعد تسليم." },
    exampleDetailsEn: "Need quotation for 500 units of part #A-7841. FOB Dubai. Please share lead time, MOQ, and payment terms.",
    exampleDetailsAr: "نحتاج عرض سعر لـ 500 قطعة من الموديل A-7841 تسليم FOB دبي. الرجاء تأكيد موعد التسليم والحد الأدنى للطلب وشروط الدفع.",
  },
  {
    id: "complaint_clarification",
    iconKey: "alert",
    en: { label: "Complaint / Clarification", description: "Raise an issue clearly and professionally." },
    ar: { label: "شكوى / استفسار", description: "إثارة مشكلة بوضوح ومهنية." },
    exampleDetailsEn: "Last shipment had 3 damaged units out of 20. Need replacement units within 10 days, plus clarification on packaging standards.",
    exampleDetailsAr: "آخر شحنة بها 3 قطع تالفة من أصل 20. نحتاج قطع بديلة خلال 10 أيام بالإضافة إلى توضيح معايير التغليف.",
  },
  {
    id: "formal_business",
    iconKey: "briefcase",
    en: { label: "Formal Business Message", description: "General formal correspondence." },
    ar: { label: "رسالة عمل رسمية", description: "مراسلات رسمية عامة." },
    exampleDetailsEn: "Notify a partner that our office address will change effective the 1st of next month. Provide the new address and invite them to update their records.",
    exampleDetailsAr: "إخطار شريك بأن عنوان مكتبنا سيتغير اعتباراً من اليوم الأول من الشهر القادم. توفير العنوان الجديد وطلب تحديث سجلاتهم.",
  },
  {
    id: "improve_email",
    iconKey: "wand",
    en: { label: "Improve Existing Email", description: "Polish your draft without changing facts." },
    ar: { label: "تحسين رسالة موجودة", description: "صقل المسودة دون تغيير الحقائق." },
    exampleDetailsEn: "Make the email more professional and clear, keep all facts as-is.",
    exampleDetailsAr: "اجعل الرسالة أكثر احترافية ووضوحاً مع الحفاظ على جميع الحقائق كما هي.",
    exampleDraftEn:
      "Hi, just checking in about invoice INV-042 for $1,250 from last month. Did you get it? Let me know when you can pay. Thanks.",
    exampleDraftAr:
      "السلام عليكم، أردت السؤال عن فاتورة INV-042 بقيمة 1250 دولار من الشهر الماضي. هل وصلتكم؟ متى تقدرون تدفعون؟ شكراً.",
    requiresDraft: true,
  },
  {
    id: "translate_ar_en",
    iconKey: "languages",
    en: { label: "Translate Arabic → English", description: "Faithful business-grade translation." },
    ar: { label: "ترجمة من العربية إلى الإنجليزية", description: "ترجمة احترافية أمينة." },
    exampleDetailsEn: "",
    exampleDetailsAr: "",
    exampleDraftAr:
      "تحية طيبة،\nنود تذكيركم بفاتورة رقم INV-042 بقيمة 1250 دولار، المستحقة منذ 14 يوماً. نرجو تأكيد موعد الدفع في أقرب وقت.\nمع الشكر.",
    exampleDraftEn:
      "Dear team,\nWe would like to remind you about invoice INV-042 for $1,250 which became due 14 days ago. Please confirm the payment date at your earliest convenience.\nThank you.",
    requiresDraft: true,
    forcedLang: "en",
  },
  {
    id: "translate_en_ar",
    iconKey: "languages",
    en: { label: "Translate English → Arabic", description: "Faithful business-grade translation." },
    ar: { label: "ترجمة من الإنجليزية إلى العربية", description: "ترجمة احترافية أمينة." },
    exampleDetailsEn: "",
    exampleDetailsAr: "",
    exampleDraftEn:
      "Hello,\nWe are writing to confirm receipt of your purchase order PO-998 dated 12 March for 500 units of part A-7841. Estimated lead time is 6 weeks. Please confirm shipping address.\nBest regards.",
    exampleDraftAr:
      "مرحباً،\nنكتب إليكم لتأكيد استلام أمر الشراء PO-998 المؤرخ 12 مارس بطلب 500 قطعة من الموديل A-7841. مدة التسليم المتوقعة 6 أسابيع. يرجى تأكيد عنوان الشحن.\nمع التحية.",
    requiresDraft: true,
    forcedLang: "ar",
  },
];

function getIcon(key: string) {
  switch (key) {
    case "coins":     return HandCoins;
    case "file":      return FileText;
    case "send":      return Send;
    case "building":  return Building2;
    case "alert":     return AlertTriangle;
    case "briefcase": return Briefcase;
    case "languages": return Languages;
    case "mail":      return Mail;
    case "wand":      return Wand2;
    default:          return MessageSquare;
  }
}

const TONES: { id: Tone; en: string; ar: string }[] = [
  { id: "formal",       en: "Formal",       ar: "رسمي" },
  { id: "polite",       en: "Polite",       ar: "مهذب" },
  { id: "firm",         en: "Firm",         ar: "حازم" },
  { id: "friendly",     en: "Friendly",     ar: "ودّي" },
  { id: "concise",      en: "Concise",      ar: "موجز" },
  { id: "professional", en: "Professional", ar: "احترافي" },
];

const LENGTHS: { id: Length; en: string; ar: string; hintEn: string; hintAr: string }[] = [
  { id: "short",    en: "Short",    ar: "قصيرة",   hintEn: "~40–80 words",   hintAr: "40–80 كلمة" },
  { id: "medium",   en: "Medium",   ar: "متوسطة",  hintEn: "~80–160 words",  hintAr: "80–160 كلمة" },
  { id: "detailed", en: "Detailed", ar: "مفصّلة",  hintEn: "~160–280 words", hintAr: "160–280 كلمة" },
];

interface GeneratedOutput {
  subject: string;
  body: string;
}

interface FormState {
  purpose: Purpose;
  outLang: Lang;
  tone: Tone;
  length: Length;
  senderName: string;
  recipientName: string;
  recipientCompany: string;
  mainPurpose: string;
  details: string;
  references: string;
  instructions: string;
  existingDraft: string;
}

const INITIAL_FORM = (lang: Lang): FormState => ({
  purpose: "payment_reminder",
  outLang: lang,
  tone: "polite",
  length: "medium",
  senderName: "",
  recipientName: "",
  recipientCompany: "",
  mainPurpose: "",
  details: "",
  references: "",
  instructions: "",
  existingDraft: "",
});

export default function AiWriterPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const { toast } = useToast();
  const { user } = useAuth();
  const isSignedIn = !!user;

  const [form, setForm] = useState<FormState>(() => INITIAL_FORM(lang));
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  // Optional backend-supplied detail message for the 503 panel (e.g. "Your
  // OpenAI account is out of credits..."). When set, it replaces the generic
  // "AI service is being set up" copy so the user sees the real reason.
  const [aiUnavailableMessage, setAiUnavailableMessage] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<FormState | null>(null);

  const [drafts, setDrafts] = useState<AiWriterDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [draftsSearch, setDraftsSearch] = useState("");
  const [draftsPurposeFilter, setDraftsPurposeFilter] = useState<Purpose | "">("");
  const [draftsLangFilter, setDraftsLangFilter] = useState<Lang | "">("");
  const [draftsPinnedOnly, setDraftsPinnedOnly] = useState(false);
  type DraftsSort = "newest" | "oldest" | "purpose";
  const [draftsSort, setDraftsSort] = useState<DraftsSort>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("aiwriter-drafts-sort");
      if (saved === "newest" || saved === "oldest" || saved === "purpose") return saved;
    }
    return "newest";
  });
  const changeDraftsSort = (v: DraftsSort) => {
    setDraftsSort(v);
    try {
      window.localStorage.setItem("aiwriter-drafts-sort", v);
    } catch {
      /* localStorage unavailable (private mode) — sort still works for the session */
    }
  };

  // Upgrade modal — shown when the server returns 402 (free tier monthly cap
  // for AI Writer generations). Mirrors the Save-document flow.
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeUsed, setUpgradeUsed] = useState(0);
  const [upgradeLimit, setUpgradeLimit] = useState(20);

  // Warn before leaving with unsaved edits. The snapshot covers the input
  // form only; generated output is either saved server-side (signed-in) or
  // regenerable from the form. markClean() is called after a successful
  // draft-save, when a saved draft is opened, and on explicit clear.
  const formSnapshot = JSON.stringify(form);
  const { markClean, dialog } = useUnsavedChangesWarning(formSnapshot);

  const purposeMeta = useMemo(
    () => PURPOSES.find((p) => p.id === form.purpose)!,
    [form.purpose],
  );
  const requiresDraft = !!purposeMeta.requiresDraft;
  const forcedLang = purposeMeta.forcedLang;

  // When a forced-language purpose is selected, lock the language picker.
  useEffect(() => {
    if (forcedLang && form.outLang !== forcedLang) {
      setForm((f) => ({ ...f, outLang: forcedLang }));
    }
  }, [forcedLang, form.outLang]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const buildRequestBody = (state: FormState) => ({
    purpose:          state.purpose,
    language:         state.outLang,
    tone:             state.tone,
    length:           state.length,
    senderName:       state.senderName.trim(),
    recipientName:    state.recipientName.trim(),
    recipientCompany: state.recipientCompany.trim(),
    mainPurpose:      state.mainPurpose.trim(),
    details:          state.details.trim(),
    references:       state.references.trim(),
    instructions:     state.instructions.trim(),
    existingDraft:    state.existingDraft.trim(),
  });

  const runGeneration = async (state: FormState) => {
    if (requiresDraft && !state.existingDraft.trim()) {
      toast({
        title: isAR ? "ألصق المسودة أولاً" : "Paste your existing draft",
        description: isAR
          ? "هذه الأداة تحتاج إلى نص موجود لتحسينه أو ترجمته."
          : "This tool needs an existing message to improve or translate.",
        variant: "destructive",
      });
      return;
    }
    if (!requiresDraft && !state.details.trim() && !state.mainPurpose.trim()) {
      toast({
        title: isAR ? "أضف بعض التفاصيل" : "Add some details",
        description: isAR
          ? "اكتب الغرض الرئيسي أو بعض التفاصيل لكي يصاغ النص بشكل صحيح."
          : "Add a main purpose or key details so the message can be drafted properly.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setError(null);
    setAiUnavailable(false);
    setAiUnavailableMessage(null);
    setOutput(null);

    const endpoint = "/api-proxy/api/ai-writer/generate";
    const fallbackUnexpected = isAR
      ? "ردّت خدمة الذكاء الاصطناعي بشكل غير متوقّع. حاول مرة أخرى أو راجع سجلات الخادم."
      : "The AI service returned an unexpected response. Please try again or check the server logs.";
    const fallbackNetwork = isAR
      ? "تعذّر الوصول إلى خدمة الذكاء الاصطناعي. تحقّق من اتصالك ثم أعد المحاولة."
      : "Couldn't reach the AI service. Check your connection and try again.";

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Send the auth token so the server can persist the draft to the user's account.
      const token = getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(buildRequestBody(state)),
      });

      // Parse JSON safely. If the server returns HTML (e.g. dev proxy fallback
      // when the API is down) or any non-JSON payload, treat it as a server
      // error rather than crashing on JSON.parse.
      const contentType = resp.headers.get("content-type") || "";
      let data: {
        success?: boolean;
        subject?: unknown;
        body?: unknown;
        provider?: unknown;
        error?: unknown;
        message?: unknown;
      } | null = null;
      if (contentType.includes("application/json")) {
        try {
          data = await resp.json();
        } catch {
          data = null;
        }
      } else {
        // Drain the body so the connection can be reused.
        await resp.text().catch(() => "");
      }

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[ai-writer]", {
          endpoint,
          status: resp.status,
          contentType,
          hasSuccess: typeof data?.success === "boolean",
          hasSubject: typeof data?.subject === "string",
          hasBody: typeof data?.body === "string",
          hasMessage: typeof data?.message === "string",
        });
      }

      // Calm "service is being set up" panel for the unavailable case.
      // Forward the backend's detail message (e.g. quota / billing) so the
      // user sees the real reason instead of a generic copy.
      if (resp.status === 503) {
        setAiUnavailable(true);
        setAiUnavailableMessage(
          typeof data?.message === "string" && data.message.trim().length > 0
            ? data.message.trim()
            : null,
        );
        setLastPayload(state);
        return;
      }

      // Free-tier monthly cap reached — open the same upgrade modal the
      // Save-to-dashboard flow uses, instead of a destructive toast.
      if (resp.status === 402) {
        const used =
          typeof (data as { aiWriterGenerations?: unknown })?.aiWriterGenerations === "number"
            ? (data as { aiWriterGenerations: number }).aiWriterGenerations
            : 0;
        const lim =
          typeof (data as { limit?: unknown })?.limit === "number"
            ? (data as { limit: number }).limit
            : 20;
        setUpgradeUsed(used);
        setUpgradeLimit(lim);
        setUpgradeOpen(true);
        setLastPayload(state);
        return;
      }

      // Server returned an HTTP error — surface its friendly message.
      if (!resp.ok) {
        const serverMsg =
          (typeof data?.message === "string" && data.message) ||
          (typeof data?.error === "string" && data.error) ||
          fallbackNetwork;
        throw new Error(serverMsg);
      }

      // 2xx but the payload doesn't match the documented success shape.
      const subject = typeof data?.subject === "string" ? data.subject : "";
      const body    = typeof data?.body    === "string" ? data.body    : "";
      const ok = data?.success === true && (subject.length > 0 || body.length > 0);
      if (!ok) {
        // Prefer a server-supplied message if one was sent, otherwise the
        // friendly fallback. Never expose "Request failed (200)" to the user.
        const serverMsg =
          (typeof data?.message === "string" && data.message) ||
          (typeof data?.error === "string" && data.error) ||
          fallbackUnexpected;
        throw new Error(serverMsg);
      }

      setOutput({ subject, body });
      setLastPayload(state);
      trackEvent("ai_writer_generated", {
        purpose: state.purpose,
        language: state.outLang,
        tone: state.tone,
        length: state.length,
      });
      // If the server saved the draft (signed-in users), refresh the history list.
      if (isSignedIn && typeof (data as { draftId?: unknown } | undefined)?.draftId === "string") {
        // The server persisted this draft — the current form is now saved.
        markClean();
        void refreshDrafts();
      }
    } catch (e) {
      // Network failure (fetch threw) or any error thrown above.
      const msg =
        e instanceof Error && e.message ? e.message : fallbackNetwork;
      setError(msg);
      toast({
        title: isAR ? "تعذر إنشاء الرسالة" : "Couldn't generate message",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => runGeneration(form);
  const handleRegenerate = () => runGeneration(lastPayload ?? form);

  const handleClear = () => {
    setForm(INITIAL_FORM(lang));
    setOutput(null);
    setError(null);
    setAiUnavailable(false);
    setAiUnavailableMessage(null);
    setLastPayload(null);
    // Explicit reset — treat the fresh form as the new pristine baseline.
    markClean();
  };

  const refreshDrafts = useCallback(async () => {
    if (!isSignedIn) return;
    setDraftsLoading(true);
    setDraftsError(null);
    try {
      const list = await listAiWriterDrafts();
      setDrafts(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load drafts";
      setDraftsError(msg);
    } finally {
      setDraftsLoading(false);
    }
  }, [isSignedIn]);

  // Load saved drafts when the user is signed in (or when their account changes).
  useEffect(() => {
    if (!isSignedIn) {
      setDrafts([]);
      setDraftsError(null);
      setDraftsSearch("");
      setDraftsPurposeFilter("");
      setDraftsLangFilter("");
      return;
    }
    void refreshDrafts();
  }, [isSignedIn, user?.email, refreshDrafts]);

  // Set of purpose IDs that exist in the current drafts list — used to render
  // the filter pills only for purposes the user has actually saved.
  const draftPurposes = useMemo(() => {
    const set = new Set<Purpose>();
    for (const d of drafts) {
      if (PURPOSES.some((p) => p.id === d.purpose)) {
        set.add(d.purpose as Purpose);
      }
    }
    // Preserve PURPOSES ordering for display.
    return PURPOSES.filter((p) => set.has(p.id)).map((p) => p.id);
  }, [drafts]);

  // If the active purpose filter is no longer represented in the loaded
  // drafts (e.g. the last draft of that purpose was deleted), drop the filter.
  useEffect(() => {
    if (draftsPurposeFilter && !draftPurposes.includes(draftsPurposeFilter)) {
      setDraftsPurposeFilter("");
    }
  }, [draftPurposes, draftsPurposeFilter]);

  // Set of languages present in the current drafts list — only used so the
  // language filter row appears when the user has drafts in more than one
  // language (otherwise the control would be redundant).
  const draftLanguages = useMemo(() => {
    const set = new Set<Lang>();
    for (const d of drafts) {
      if (d.language === "ar" || d.language === "en") set.add(d.language);
    }
    return (["en", "ar"] as Lang[]).filter((l) => set.has(l));
  }, [drafts]);

  useEffect(() => {
    if (draftsLangFilter && !draftLanguages.includes(draftsLangFilter)) {
      setDraftsLangFilter("");
    }
  }, [draftLanguages, draftsLangFilter]);

  const filteredDrafts = useMemo(() => {
    const q = draftsSearch.trim().toLowerCase();
    return drafts.filter((d) => {
      if (draftsPinnedOnly && !d.pinned) return false;
      if (draftsPurposeFilter && d.purpose !== draftsPurposeFilter) return false;
      if (draftsLangFilter && d.language !== draftsLangFilter) return false;
      if (q) {
        const subject = (d.subject || "").toLowerCase();
        const body = (d.body || "").toLowerCase();
        if (!subject.includes(q) && !body.includes(q)) return false;
      }
      return true;
    });
  }, [drafts, draftsSearch, draftsPurposeFilter, draftsLangFilter, draftsPinnedOnly]);

  const pinnedCount = useMemo(
    () => drafts.reduce((n, d) => n + (d.pinned ? 1 : 0), 0),
    [drafts],
  );

  // If the user unpins their last pinned draft while the pinned-only filter is
  // active, drop the filter so the list doesn't appear empty for no reason.
  useEffect(() => {
    if (draftsPinnedOnly && pinnedCount === 0) {
      setDraftsPinnedOnly(false);
    }
  }, [draftsPinnedOnly, pinnedCount]);

  // Apply the user's chosen sort on top of the filtered list. "purpose" groups
  // drafts by purpose (in the canonical PURPOSES order) with newest first
  // inside each group.
  const sortedDrafts = useMemo(() => {
    const list = [...filteredDrafts];
    const time = (d: AiWriterDraft) => new Date(d.createdAt).getTime();
    // Pinned drafts always float above unpinned ones, regardless of sort.
    const pin = (a: AiWriterDraft, b: AiWriterDraft) =>
      Number(b.pinned) - Number(a.pinned);
    if (draftsSort === "oldest") {
      list.sort((a, b) => pin(a, b) || time(a) - time(b));
    } else if (draftsSort === "purpose") {
      const order = new Map<string, number>(PURPOSES.map((p, i) => [p.id, i]));
      list.sort((a, b) => {
        const p = pin(a, b);
        if (p !== 0) return p;
        const pa = order.get(a.purpose) ?? PURPOSES.length;
        const pb = order.get(b.purpose) ?? PURPOSES.length;
        if (pa !== pb) return pa - pb;
        return time(b) - time(a);
      });
    } else {
      list.sort((a, b) => pin(a, b) || time(b) - time(a));
    }
    return list;
  }, [filteredDrafts, draftsSort]);

  const draftsFiltering =
    draftsSearch.trim().length > 0 ||
    !!draftsPurposeFilter ||
    !!draftsLangFilter ||
    draftsPinnedOnly;
  const clearDraftsFilters = () => {
    setDraftsSearch("");
    setDraftsPurposeFilter("");
    setDraftsLangFilter("");
    setDraftsPinnedOnly(false);
  };

  const langLabel = (l: Lang | ""): string => {
    if (l === "en") return isAR ? "إنجليزي" : "English";
    if (l === "ar") return isAR ? "عربي" : "Arabic";
    return isAR ? "الكل" : "All";
  };

  const loadDraft = (d: AiWriterDraft) => {
    const inputs = d.inputs || {};
    const isPurpose = (v: string): v is Purpose =>
      PURPOSES.some((p) => p.id === v);
    const purpose: Purpose = isPurpose(d.purpose) ? d.purpose : form.purpose;
    const restored: FormState = {
      purpose,
      outLang: d.language === "ar" ? "ar" : "en",
      tone: (d.tone as Tone) || "polite",
      length: (d.length as Length) || "medium",
      senderName:       inputs.senderName       ?? "",
      recipientName:    inputs.recipientName    ?? "",
      recipientCompany: inputs.recipientCompany ?? "",
      mainPurpose:      inputs.mainPurpose      ?? "",
      details:          inputs.details          ?? "",
      references:       inputs.references       ?? "",
      instructions:     inputs.instructions     ?? "",
      existingDraft:    inputs.existingDraft    ?? "",
    };
    setForm(restored);
    setLastPayload(restored);
    // Programmatic restore of an already-saved draft — not a user edit.
    markClean();
    setOutput({ subject: d.subject, body: d.body });
    setError(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    toast({
      title: isAR ? "تم فتح الرسالة المحفوظة" : "Saved draft opened",
      description: isAR
        ? "تم استرجاع الإعدادات والنص — يمكنك التعديل أو النسخ من جديد."
        : "Settings and message restored — edit or copy as needed.",
    });
  };

  const togglePin = async (d: AiWriterDraft) => {
    const next = !d.pinned;
    // Optimistic update — revert on failure.
    setDrafts((list) =>
      list.map((x) => (x.id === d.id ? { ...x, pinned: next } : x)),
    );
    try {
      await updateAiWriterDraft(d.id, { pinned: next });
    } catch (e) {
      setDrafts((list) =>
        list.map((x) => (x.id === d.id ? { ...x, pinned: d.pinned } : x)),
      );
      const msg = e instanceof Error ? e.message : "Could not update draft";
      toast({
        title: isAR ? "تعذر تحديث التثبيت" : "Couldn't update pin",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const removeDraft = async (id: string) => {
    const prev = drafts;
    setDrafts((d) => d.filter((x) => x.id !== id));
    try {
      await deleteAiWriterDraft(id);
    } catch (e) {
      setDrafts(prev);
      const msg = e instanceof Error ? e.message : "Could not delete draft";
      toast({
        title: isAR ? "تعذر حذف الرسالة" : "Couldn't delete draft",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const formatDraftTime = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const min = Math.round(diffMs / 60_000);
    if (min < 1) return isAR ? "الآن" : "just now";
    if (min < 60) {
      return isAR ? `قبل ${min} دقيقة` : `${min} min ago`;
    }
    const hr = Math.round(min / 60);
    if (hr < 24) {
      return isAR ? `قبل ${hr} ساعة` : `${hr} hr ago`;
    }
    const day = Math.round(hr / 24);
    if (day < 30) {
      return isAR ? `قبل ${day} يوم` : `${day} day ago`;
    }
    return d.toLocaleDateString(isAR ? "ar" : "en");
  };

  const purposeLabel = (id: string): string => {
    const p = PURPOSES.find((x) => x.id === id);
    if (!p) return id;
    return isAR ? p.ar.label : p.en.label;
  };

  const fillExample = () => {
    setForm((f) => ({
      ...f,
      senderName:       isAR ? "محمد العلي — مدير المبيعات" : "John Doe — Sales Manager",
      recipientName:    isAR ? "السيد أحمد الشمري" : "Mr. Smith",
      recipientCompany: isAR ? "شركة الأمل التجارية" : "Acme Trading Co.",
      mainPurpose:      isAR
        ? (purposeMeta.ar.description || "")
        : (purposeMeta.en.description || ""),
      details:          isAR ? purposeMeta.exampleDetailsAr : purposeMeta.exampleDetailsEn,
      references:       isAR
        ? "فاتورة INV-042، 1,250 دولار، تاريخ الاستحقاق 12 مارس."
        : "Invoice INV-042, $1,250, due 12 March.",
      instructions:     isAR
        ? "اجعلها مهذبة وقصيرة، واطلب تأكيد موعد الدفع."
        : "Keep it polite and short, ask for confirmation of the payment date.",
      existingDraft:    requiresDraft
        ? (isAR
            ? (purposeMeta.exampleDraftAr || "")
            : (purposeMeta.exampleDraftEn || ""))
        : f.existingDraft,
    }));
  };

  const fullEmail = output
    ? (output.subject ? `Subject: ${output.subject}\n\n${output.body}` : output.body)
    : "";

  const copyTo = async (text: string, labelEn: string, labelAr: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: isAR ? "تم النسخ" : "Copied",
        description: isAR ? labelAr : labelEn,
      });
    } catch {
      toast({
        title: isAR ? "تعذر النسخ" : "Copy failed",
        description: isAR ? "حاول النسخ يدوياً." : "Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([fullEmail], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xuvilo-${form.purpose}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <SEOHead
        title={isAR
          ? "كاتب الذكاء الاصطناعي — رسائل بريد احترافية بالعربية والإنجليزية | Xuvilo"
          : "AI Writer — Professional Business Emails in Arabic & English | Xuvilo"}
        description={isAR
          ? "اكتب تذكيرات الدفع، متابعات الفواتير، عروض الأسعار، طلبات الموردين، الشكاوى والترجمة بين العربية والإنجليزية بالذكاء الاصطناعي. مجاني."
          : "Write payment reminders, invoice follow-ups, quotation emails, supplier requests, complaints, and Arabic↔English translations with AI. Free."}
        path="/ai-writer"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-gradient-to-r from-violet-500 to-blue-500 text-white border-0">
            <Sparkles className="w-3.5 h-3.5 me-1.5" />
            {isAR ? "ميزة جديدة" : "NEW"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {isAR ? "كاتب الذكاء الاصطناعي" : "AI Writer"}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {isAR
              ? "اكتب رسائل بريد احترافية بالعربية أو الإنجليزية في ثوانٍ — تذكيرات دفع، متابعات، عروض أسعار، طلبات موردين، شكاوى، تحسين رسالة، وترجمة. مدعوم بالذكاء الاصطناعي، مجاني."
              : "Draft polished business emails in Arabic or English in seconds — payment reminders, follow-ups, quotations, supplier requests, complaints, improve a draft, or translate. Powered by AI. Free."}
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* ── LEFT: Form ── */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  {isAR ? "إعدادات الرسالة" : "Message setup"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    {isAR ? "الغرض من الرسالة" : "Message purpose"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PURPOSES.map((p) => {
                      const Icon = getIcon(p.iconKey);
                      const active = form.purpose === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setField("purpose", p.id)}
                          data-testid={`purpose-${p.id}`}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border text-start transition-all min-h-[64px] ${
                            active
                              ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-sm"
                              : "border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            active ? "bg-violet-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                              {isAR ? p.ar.label : p.en.label}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                              {isAR ? p.ar.description : p.en.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language + Tone + Length */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      {isAR ? "اللغة" : "Language"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["en", "ar"] as Lang[]).map((l) => {
                        const disabled = !!forcedLang && forcedLang !== l;
                        const active = form.outLang === l;
                        return (
                          <button
                            key={l}
                            type="button"
                            onClick={() => !disabled && setField("outLang", l)}
                            disabled={disabled}
                            data-testid={`lang-${l}`}
                            className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                              active
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                : disabled
                                  ? "border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300"
                            }`}
                          >
                            {l === "en" ? "English" : "العربية"}
                          </button>
                        );
                      })}
                    </div>
                    {forcedLang && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        {isAR
                          ? "اللغة محددة تلقائياً لهذه الأداة."
                          : "Language is fixed for this tool."}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      {isAR ? "نبرة الرسالة" : "Tone"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setField("tone", t.id)}
                          data-testid={`tone-${t.id}`}
                          className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                            form.tone === t.id
                              ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-300"
                          }`}
                        >
                          {isAR ? t.ar : t.en}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      {isAR ? "الطول" : "Length"}
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {LENGTHS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setField("length", l.id)}
                          data-testid={`length-${l.id}`}
                          className={`flex flex-col items-start px-3 py-1.5 rounded-lg border text-xs font-medium transition-all text-start ${
                            form.length === l.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                              : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300"
                          }`}
                        >
                          <span>{isAR ? l.ar : l.en}</span>
                          <span className="text-[10px] opacity-60">{isAR ? l.hintAr : l.hintEn}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sender / Recipient names */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      {isAR ? "اسمك / اسم شركتك" : "Your name / company"}
                      <span className="ms-2 text-xs font-normal text-gray-400">
                        {isAR ? "اختياري" : "optional"}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.senderName}
                      onChange={(e) => setField("senderName", e.target.value)}
                      data-testid="sender-input"
                      placeholder={isAR ? "مثال: محمد العلي — مدير المبيعات" : "e.g. John Doe — Sales Manager"}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      {isAR ? "اسم المستلم" : "Recipient name"}
                      <span className="ms-2 text-xs font-normal text-gray-400">
                        {isAR ? "اختياري" : "optional"}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.recipientName}
                      onChange={(e) => setField("recipientName", e.target.value)}
                      data-testid="recipient-input"
                      placeholder={isAR ? "السيد أحمد الشمري" : "e.g. Mr. Smith"}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    {isAR ? "شركة المستلم" : "Recipient company"}
                    <span className="ms-2 text-xs font-normal text-gray-400">
                      {isAR ? "اختياري" : "optional"}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.recipientCompany}
                    onChange={(e) => setField("recipientCompany", e.target.value)}
                    data-testid="recipient-company-input"
                    placeholder={isAR ? "شركة الأمل التجارية" : "e.g. Acme Trading Co."}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Main purpose */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    {isAR ? "الهدف الرئيسي (سطر واحد)" : "Main purpose (one line)"}
                    {!requiresDraft && (
                      <span className="ms-2 text-xs font-normal text-gray-400">
                        {isAR ? "موصى به" : "recommended"}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.mainPurpose}
                    onChange={(e) => setField("mainPurpose", e.target.value)}
                    data-testid="main-purpose-input"
                    placeholder={isAR
                      ? "مثال: متابعة فاتورة متأخرة وطلب تأكيد موعد الدفع."
                      : "e.g. Follow up on an overdue invoice and ask for a payment date."}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Existing draft (only for improve/translate) */}
                {requiresDraft && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {isAR ? "نص المسودة الحالية" : "Existing draft text"}
                        <span className="ms-2 text-xs font-bold text-red-500">
                          {isAR ? "مطلوب" : "required"}
                        </span>
                      </label>
                    </div>
                    <textarea
                      value={form.existingDraft}
                      onChange={(e) => setField("existingDraft", e.target.value)}
                      rows={6}
                      data-testid="existing-draft-input"
                      dir="auto"
                      placeholder={isAR
                        ? "ألصق هنا الرسالة التي تريد تحسينها أو ترجمتها."
                        : "Paste the email you want to improve or translate."}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y leading-relaxed"
                    />
                  </div>
                )}

                {/* Details — hidden for translates (translation should not invent details) */}
                {form.purpose !== "translate_ar_en" && form.purpose !== "translate_en_ar" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {isAR ? "التفاصيل الرئيسية" : "Key details"}
                      </label>
                      <button
                        type="button"
                        onClick={fillExample}
                        className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
                        data-testid="fill-example-btn"
                      >
                        {isAR ? "املأ مثالاً" : "Fill an example"}
                      </button>
                    </div>
                    <textarea
                      value={form.details}
                      onChange={(e) => setField("details", e.target.value)}
                      rows={requiresDraft ? 3 : 5}
                      data-testid="details-input"
                      placeholder={isAR ? purposeMeta.exampleDetailsAr : purposeMeta.exampleDetailsEn}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y leading-relaxed"
                    />
                  </div>
                )}

                {/* References + Instructions */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {form.purpose !== "translate_ar_en" && form.purpose !== "translate_en_ar" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {isAR ? "تواريخ ومبالغ ومراجع" : "Dates, amounts, references"}
                        <span className="ms-2 text-xs font-normal text-gray-400">
                          {isAR ? "اختياري" : "optional"}
                        </span>
                      </label>
                      <textarea
                        value={form.references}
                        onChange={(e) => setField("references", e.target.value)}
                        rows={3}
                        data-testid="references-input"
                        placeholder={isAR
                          ? "فاتورة INV-042، 1,250 دولار، تاريخ الاستحقاق 12 مارس."
                          : "Invoice INV-042, $1,250, due 12 March."}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y leading-relaxed"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      {isAR ? "تعليمات إضافية" : "Additional instructions"}
                      <span className="ms-2 text-xs font-normal text-gray-400">
                        {isAR ? "اختياري" : "optional"}
                      </span>
                    </label>
                    <textarea
                      value={form.instructions}
                      onChange={(e) => setField("instructions", e.target.value)}
                      rows={3}
                      data-testid="instructions-input"
                      placeholder={isAR
                        ? "مثال: اختصرها لفقرتين واطلب تأكيد المستلم."
                        : "e.g. Keep it to two paragraphs and ask the recipient to confirm."}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y leading-relaxed"
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-400 -mt-2">
                  {isAR
                    ? "كلما كانت التفاصيل أوضح، كانت الرسالة أدق. لا ترسل بيانات حساسة."
                    : "Clearer details produce a sharper message. Don't paste sensitive data."}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    data-testid="generate-btn"
                    className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-md min-h-[44px] px-6"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                        {isAR ? "جارٍ الكتابة…" : "Generating…"}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 me-2" />
                        {isAR ? "أنشئ الرسالة" : "Generate message"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={generating || !lastPayload}
                    data-testid="regenerate-btn"
                    className="min-h-[44px]"
                  >
                    <RefreshCcw className="w-4 h-4 me-2" />
                    {isAR ? "إعادة التوليد" : "Regenerate"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    data-testid="clear-btn"
                    className="min-h-[44px]"
                  >
                    <Eraser className="w-4 h-4 me-2" />
                    {isAR ? "مسح النموذج" : "Clear form"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20">
              <CardContent className="py-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <p className="font-semibold text-violet-800 dark:text-violet-300">
                  {isAR ? "نصائح للحصول على أفضل نتيجة" : "Tips for the best results"}
                </p>
                <ul className="list-disc ms-5 space-y-1 leading-relaxed">
                  <li>{isAR ? "اذكر الأرقام الفعلية: مبالغ، تواريخ، أرقام فواتير." : "Mention actual numbers: amounts, dates, invoice numbers."}</li>
                  <li>{isAR ? "وضّح النتيجة المرغوبة (تأكيد، رد، اجتماع، دفع)." : "Spell out the outcome you want (confirmation, reply, meeting, payment)."}</li>
                  <li>{isAR ? "اختر النبرة والطول بحسب طبيعة العلاقة." : "Pick a tone and length that match your relationship with the recipient."}</li>
                  <li>{isAR ? "في أدوات الترجمة والتحسين: ألصق النص الأصلي كما هو." : "For improve / translate tools: paste the original text exactly as-is."}</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT: Output ── */}
          <div className="lg:col-span-2">
            <Card className="lg:sticky lg:top-28 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="w-5 h-5 text-blue-500" />
                  {isAR ? "الرسالة المُولّدة" : "Generated message"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!output && !generating && !error && !aiUnavailable && (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      {isAR
                        ? "املأ التفاصيل ثم انقر «أنشئ الرسالة» وستظهر هنا."
                        : "Fill in the details and click \"Generate message\" — your draft will appear here."}
                    </p>
                  </div>
                )}

                {generating && (
                  <div className="text-center py-12">
                    <Loader2 className="w-10 h-10 mx-auto animate-spin text-violet-500 mb-3" />
                    <p className="text-sm text-gray-500">
                      {isAR ? "نصيغ رسالتك بعناية…" : "Drafting your message carefully…"}
                    </p>
                  </div>
                )}

                {aiUnavailable && !generating && (
                  <div
                    data-testid="ai-unavailable-panel"
                    className="rounded-xl border border-violet-200 dark:border-violet-900 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30 p-6 text-center"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-900 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-violet-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                      {isAR
                        ? "خدمة الذكاء الاصطناعي غير متاحة الآن"
                        : "AI service is unavailable right now"}
                    </p>
                    <p
                      className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 max-w-sm mx-auto whitespace-pre-line"
                      data-testid="ai-unavailable-message"
                    >
                      {aiUnavailableMessage
                        ? aiUnavailableMessage
                        : isAR
                          ? "كاتب الذكاء الاصطناعي غير متاح مؤقتاً لأن مزوّد الذكاء الاصطناعي لم يُهيَّأ بعد. يرجى المحاولة لاحقاً."
                          : "AI Writer is temporarily unavailable because the AI provider hasn't been configured yet. Please try again a little later."}
                    </p>
                    <a
                      href="https://docs.xuvilo.com/ai-writer-setup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-xs font-medium text-violet-600 dark:text-violet-300 hover:underline"
                      data-testid="ai-unavailable-help-link"
                    >
                      {isAR ? "تعليمات الإعداد" : "Setup instructions"}
                    </a>
                  </div>
                )}

                {error && !generating && !aiUnavailable && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">
                          {isAR ? "تعذر إنشاء الرسالة" : "Couldn't generate message"}
                        </p>
                        <p className="text-xs leading-relaxed" data-testid="error-message">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {output && !generating && isSignedIn && (
                  <div
                    className="mb-3 -mt-1 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400"
                    data-testid="autosave-indicator"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {isAR
                        ? "تم حفظ هذه الرسالة في حسابك تلقائياً."
                        : "This draft was saved to your account automatically."}
                    </span>
                  </div>
                )}

                {output && !generating && (
                  <div
                    dir={form.outLang === "ar" ? "rtl" : "ltr"}
                    data-testid="generated-output"
                    className="space-y-4"
                  >
                    {/* Subject */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          {isAR ? "الموضوع" : "Subject"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyTo(
                            output.subject,
                            "Subject copied to clipboard.",
                            "نُسخ الموضوع إلى الحافظة.",
                          )}
                          disabled={!output.subject}
                          data-testid="copy-subject-btn"
                          className="h-7 px-2 text-xs"
                        >
                          <Copy className="w-3 h-3 me-1" />
                          {isAR ? "نسخ" : "Copy"}
                        </Button>
                      </div>
                      <div
                        data-testid="output-subject"
                        className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {output.subject || (isAR ? "(بدون موضوع)" : "(no subject)")}
                      </div>
                    </div>

                    {/* Body */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                          {isAR ? "نص الرسالة" : "Body"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyTo(
                            output.body,
                            "Body copied to clipboard.",
                            "نُسخ نص الرسالة إلى الحافظة.",
                          )}
                          disabled={!output.body}
                          data-testid="copy-body-btn"
                          className="h-7 px-2 text-xs"
                        >
                          <Copy className="w-3 h-3 me-1" />
                          {isAR ? "نسخ" : "Copy"}
                        </Button>
                      </div>
                      <div
                        data-testid="output-body"
                        className="rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-3 py-3 whitespace-pre-wrap text-[14px] leading-relaxed text-gray-800 dark:text-gray-200 font-sans min-h-[180px]"
                      >
                        {output.body}
                      </div>
                    </div>

                    {/* Bottom actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => copyTo(
                          fullEmail,
                          "Full email copied to clipboard.",
                          "نُسخت الرسالة كاملة إلى الحافظة.",
                        )}
                        data-testid="copy-full-btn"
                        className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white"
                      >
                        <Copy className="w-3.5 h-3.5 me-1.5" />
                        {isAR ? "نسخ الرسالة كاملة" : "Copy full email"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerate}
                        disabled={generating}
                        data-testid="regenerate-output-btn"
                      >
                        <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                        {isAR ? "إعادة" : "Regenerate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownload}
                        data-testid="download-btn"
                      >
                        <Download className="w-3.5 h-3.5 me-1.5" />
                        {isAR ? "تحميل" : "Download"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent saved drafts (signed-in users only) */}
            {isSignedIn && (
              <Card
                className="mt-4 border-gray-200 dark:border-gray-800"
                data-testid="recent-drafts-card"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <History className="w-5 h-5 text-violet-500" />
                      {isAR ? "الرسائل المحفوظة" : "Recent drafts"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void refreshDrafts()}
                      disabled={draftsLoading}
                      data-testid="refresh-drafts-btn"
                      className="h-7 px-2 text-xs"
                      aria-label={isAR ? "تحديث" : "Refresh"}
                    >
                      {draftsLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCcw className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {draftsLoading && drafts.length === 0 && (
                    <div className="text-center py-6 text-xs text-gray-400">
                      <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin" />
                      {isAR ? "جارٍ التحميل…" : "Loading…"}
                    </div>
                  )}

                  {!draftsLoading && draftsError && (
                    <p className="text-xs text-red-600 dark:text-red-400" data-testid="drafts-error">
                      {draftsError}
                    </p>
                  )}

                  {!draftsLoading && !draftsError && drafts.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {isAR
                        ? "ستظهر الرسائل التي تنشئها هنا تلقائياً لتتمكن من إعادة فتحها أو نسخها لاحقاً."
                        : "Messages you generate will appear here automatically so you can re-open or copy them later."}
                    </p>
                  )}

                  {drafts.length > 0 && (
                    <>
                      {/* Search + filter controls */}
                      <div className="mb-3 space-y-2">
                        <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search
                            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 ${
                              isAR ? "right-2.5" : "left-2.5"
                            }`}
                          />
                          <Input
                            type="search"
                            value={draftsSearch}
                            onChange={(e) => setDraftsSearch(e.target.value)}
                            placeholder={
                              isAR
                                ? "ابحث في الموضوع أو نص الرسالة…"
                                : "Search subject or body…"
                            }
                            aria-label={
                              isAR ? "البحث في الرسائل المحفوظة" : "Search saved drafts"
                            }
                            data-testid="drafts-search-input"
                            className={`h-8 text-xs ${isAR ? "pe-8 ps-2.5" : "ps-8 pe-2.5"}`}
                          />
                          {draftsSearch && (
                            <button
                              type="button"
                              onClick={() => setDraftsSearch("")}
                              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ${
                                isAR ? "left-2" : "right-2"
                              }`}
                              aria-label={isAR ? "مسح البحث" : "Clear search"}
                              data-testid="drafts-search-clear"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <select
                          value={draftsSort}
                          onChange={(e) => changeDraftsSort(e.target.value as DraftsSort)}
                          aria-label={isAR ? "ترتيب الرسائل المحفوظة" : "Sort saved drafts"}
                          data-testid="drafts-sort-select"
                          className="h-8 shrink-0 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs text-gray-700 dark:text-gray-200 px-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="newest">{isAR ? "الأحدث أولاً" : "Newest first"}</option>
                          <option value="oldest">{isAR ? "الأقدم أولاً" : "Oldest first"}</option>
                          <option value="purpose">{isAR ? "حسب الغرض" : "By purpose"}</option>
                        </select>
                        </div>

                        {draftPurposes.length > 1 && (
                          <div
                            className="flex flex-wrap gap-1.5"
                            role="group"
                            aria-label={isAR ? "تصفية حسب الغرض" : "Filter by purpose"}
                            data-testid="drafts-purpose-filters"
                          >
                            <button
                              type="button"
                              onClick={() => setDraftsPurposeFilter("")}
                              data-testid="drafts-purpose-all"
                              data-active={draftsPurposeFilter === ""}
                              aria-pressed={draftsPurposeFilter === ""}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                                draftsPurposeFilter === ""
                                  ? "bg-violet-600 text-white border-violet-600"
                                  : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-300"
                              }`}
                            >
                              {isAR ? "الكل" : "All"}
                            </button>
                            {draftPurposes.map((pid) => (
                              <button
                                key={pid}
                                type="button"
                                onClick={() => setDraftsPurposeFilter(pid)}
                                data-testid={`drafts-purpose-${pid}`}
                                data-active={draftsPurposeFilter === pid}
                                aria-pressed={draftsPurposeFilter === pid}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                                  draftsPurposeFilter === pid
                                    ? "bg-violet-600 text-white border-violet-600"
                                    : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-300"
                                }`}
                              >
                                {purposeLabel(pid)}
                              </button>
                            ))}
                          </div>
                        )}

                        {draftLanguages.length > 1 && (
                          <div
                            className="flex flex-wrap items-center gap-1.5"
                            role="group"
                            aria-label={isAR ? "تصفية حسب اللغة" : "Filter by language"}
                            data-testid="drafts-lang-filters"
                          >
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide me-1">
                              {isAR ? "اللغة" : "Lang"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDraftsLangFilter("")}
                              data-testid="drafts-lang-all"
                              data-active={draftsLangFilter === ""}
                              aria-pressed={draftsLangFilter === ""}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                                draftsLangFilter === ""
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                              }`}
                            >
                              {langLabel("")}
                            </button>
                            {draftLanguages.map((l) => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setDraftsLangFilter(l)}
                                data-testid={`drafts-lang-${l}`}
                                data-active={draftsLangFilter === l}
                                aria-pressed={draftsLangFilter === l}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                                  draftsLangFilter === l
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                }`}
                              >
                                {langLabel(l)}
                              </button>
                            ))}
                          </div>
                        )}

                        {pinnedCount > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDraftsPinnedOnly((v) => !v)}
                              data-testid="drafts-pinned-only"
                              data-active={draftsPinnedOnly}
                              aria-pressed={draftsPinnedOnly}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                                draftsPinnedOnly
                                  ? "bg-amber-500 text-white border-amber-500"
                                  : "bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-300"
                              }`}
                            >
                              <Star
                                className={`w-3 h-3 ${
                                  draftsPinnedOnly
                                    ? "fill-white"
                                    : "text-amber-500 fill-amber-500"
                                }`}
                                aria-hidden="true"
                              />
                              {isAR ? "المثبتة فقط" : "Pinned only"}
                            </button>
                            <span className="text-[10px] text-gray-400">
                              {isAR
                                ? "الرسائل المثبتة لا تُحذف تلقائياً"
                                : "Pinned drafts are never auto-deleted"}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span data-testid="drafts-result-count">
                            {draftsFiltering
                              ? isAR
                                ? `عرض ${filteredDrafts.length} من ${drafts.length}`
                                : `Showing ${filteredDrafts.length} of ${drafts.length}`
                              : isAR
                                ? `${drafts.length} رسالة`
                                : `${drafts.length} draft${drafts.length === 1 ? "" : "s"}`}
                            {pinnedCount > 0 && (
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                data-testid="drafts-pinned-count"
                              >
                                {" · "}
                                {isAR
                                  ? `${pinnedCount} مثبتة`
                                  : `${pinnedCount} pinned`}
                              </span>
                            )}
                          </span>
                          {draftsFiltering && (
                            <button
                              type="button"
                              onClick={clearDraftsFilters}
                              className="text-[10px] font-medium text-violet-600 dark:text-violet-300 hover:underline"
                              data-testid="drafts-clear-filters"
                            >
                              {isAR ? "إعادة ضبط" : "Reset"}
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredDrafts.length === 0 && (
                        <p
                          className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed py-3 text-center"
                          data-testid="drafts-no-matches"
                        >
                          {isAR
                            ? "لا توجد رسائل مطابقة للبحث الحالي."
                            : "No drafts match your current filters."}
                        </p>
                      )}
                    </>
                  )}

                  {drafts.length > 0 && filteredDrafts.length > 0 && (
                    <ul className="space-y-2 max-h-[420px] overflow-y-auto -mx-1 px-1" data-testid="drafts-list">
                      {sortedDrafts.map((d, i) => (
                        <Fragment key={d.id}>
                          {draftsSort === "purpose" &&
                            (i === 0 ||
                              sortedDrafts[i - 1].purpose !== d.purpose) && (
                              <li
                                className="pt-1 first:pt-0"
                                aria-hidden="true"
                                data-testid={`draft-group-header-${d.purpose}`}
                              >
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-1">
                                  {purposeLabel(d.purpose)}
                                </div>
                              </li>
                            )}
                        <li
                          className="group rounded-lg border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 bg-white dark:bg-gray-950 transition-colors"
                          data-testid={`draft-item-${d.id}`}
                        >
                          <div className="flex items-stretch">
                            <button
                              type="button"
                              onClick={() => loadDraft(d)}
                              className="flex-1 min-w-0 text-start px-3 py-2.5"
                              data-testid={`draft-open-${d.id}`}
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                {d.pinned && (
                                  <Star
                                    className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0"
                                    aria-hidden="true"
                                  />
                                )}
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0"
                                >
                                  {purposeLabel(d.purpose)}
                                </Badge>
                                <span className="text-[10px] text-gray-400 ms-auto whitespace-nowrap">
                                  {formatDraftTime(d.createdAt)}
                                </span>
                              </div>
                              <div
                                className="text-sm font-medium text-gray-900 dark:text-white truncate"
                                dir="auto"
                              >
                                {d.subject || (isAR ? "(بدون موضوع)" : "(no subject)")}
                              </div>
                              <div
                                className="text-xs text-gray-500 dark:text-gray-400 truncate"
                                dir="auto"
                              >
                                {(d.body || "").replace(/\s+/g, " ").trim().slice(0, 90)}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => void togglePin(d)}
                              className={`flex items-center justify-center px-3 focus:outline-none transition-colors border-s border-gray-100 dark:border-gray-800 ${
                                d.pinned
                                  ? "text-amber-500 hover:text-amber-600"
                                  : "text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              }`}
                              aria-label={
                                d.pinned
                                  ? (isAR ? "إلغاء التثبيت" : "Unpin")
                                  : (isAR ? "تثبيت" : "Pin")
                              }
                              aria-pressed={d.pinned}
                              title={
                                d.pinned
                                  ? (isAR ? "إلغاء تثبيت الرسالة" : "Unpin draft")
                                  : (isAR ? "تثبيت الرسالة في الأعلى" : "Pin draft to top")
                              }
                              data-testid={`draft-pin-${d.id}`}
                            >
                              <Star
                                className={`w-4 h-4 ${d.pinned ? "fill-amber-500" : ""}`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeDraft(d.id)}
                              className="flex items-center justify-center px-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:text-red-500 focus:outline-none transition-colors border-s border-gray-100 dark:border-gray-800"
                              aria-label={isAR ? "حذف" : "Delete"}
                              data-testid={`draft-delete-${d.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                        </Fragment>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Promo card for anonymous users — encourages sign-in to save history */}
            {!isSignedIn && (
              <Card
                className="mt-4 border-violet-200 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/20"
                data-testid="signin-promo-card"
              >
                <CardContent className="py-4 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-start gap-2">
                    <History className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed">
                      {isAR
                        ? "أنشئ حساباً مجانياً لحفظ الرسائل المُولّدة وفتحها لاحقاً للتعديل أو النسخ."
                        : "Sign in to keep a history of your generated drafts so you can re-open and copy them later."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ── Use cases ── */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            {isAR ? "كل أنواع الرسائل التجارية في مكان واحد" : "Every kind of business message — in one place"}
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            {isAR
              ? "من تذكيرات الدفع إلى الترجمة الاحترافية، صياغة دقيقة بالعربية والإنجليزية في ثوانٍ."
              : "From payment reminders to professional translation — accurate drafts in Arabic and English in seconds."}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PURPOSES.map((p) => {
              const Icon = getIcon(p.iconKey);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setField("purpose", p.id);
                    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-start p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-violet-300 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {isAR ? p.ar.label : p.en.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                    {isAR ? p.ar.description : p.en.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Privacy disclaimer ── */}
        <div className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500 max-w-2xl mx-auto leading-relaxed">
          {isAR
            ? "تنبيه: لا تُرسل بيانات سرية أو شخصية حساسة. الرسائل تُولّد بواسطة نموذج ذكاء اصطناعي ويجب مراجعتها قبل الإرسال."
            : "Note: don't paste confidential or sensitive personal data. Messages are generated by an AI model and should always be reviewed before sending."}
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="limit"
        used={upgradeUsed}
        limit={upgradeLimit}
      />
      <UnsavedChangesDialog open={dialog.open} lang={lang} onStay={dialog.stay} onLeave={dialog.leave} />
    </AppLayout>
  );
}
