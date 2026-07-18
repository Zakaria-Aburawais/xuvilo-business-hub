import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, AlertCircle, Loader2, Mail, Home } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/context/LanguageContext";
import {
  unsubscribeNewsletter,
  type NewsletterUnsubscribeResponse,
} from "@workspace/api-client-react";

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | {
      kind: "done";
      status: NewsletterUnsubscribeResponse["status"];
      email?: string | undefined;
    }
  | { kind: "error" };

function readToken(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("token") ?? "").trim();
}

export default function UnsubscribePage() {
  const { lang, setLang } = useLanguage();
  const isAR = lang === "ar";

  // Allow the email link to override the visitor's preferred language so the
  // confirmation copy matches the language the email was written in. Only
  // honored once per page load; the user can still toggle freely afterwards.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("lang");
    if (wanted === "ar" || wanted === "en") {
      if (wanted !== lang) setLang(wanted);
    }
    // Intentionally only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const token = useMemo(() => readToken(), []);
  const [state, setState] = useState<State>(
    token ? { kind: "loading" } : { kind: "missing" },
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await unsubscribeNewsletter({ token });
        if (cancelled) return;
        setState({ kind: "done", status: data.status, email: data.email });
      } catch {
        if (cancelled) return;
        setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const title = isAR ? "إلغاء الاشتراك في النشرة البريدية" : "Unsubscribe from newsletter";

  return (
    <AppLayout>
      <SEOHead
        title={`${title} — Xuvilo`}
        description={
          isAR
            ? "تأكيد إلغاء اشتراكك في رسائل Xuvilo البريدية."
            : "Confirm that your email has been removed from the Xuvilo newsletter list."
        }
        noindex
      />
      <div className="min-h-[60vh] w-full flex items-center justify-center px-4 py-16">
        <div
          className="w-full max-w-xl text-center"
          data-testid="unsubscribe-page"
        >
          {state.kind === "loading" && <Loading isAR={isAR} />}
          {state.kind === "missing" && <Missing isAR={isAR} />}
          {state.kind === "error" && <NetworkError isAR={isAR} />}
          {state.kind === "done" && state.status === "unsubscribed" && (
            <Done isAR={isAR} email={state.email} />
          )}
          {state.kind === "done" && state.status === "already_unsubscribed" && (
            <AlreadyDone isAR={isAR} email={state.email} />
          )}
          {state.kind === "done" && state.status === "not_found" && (
            <NotFound isAR={isAR} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Card({
  tone,
  icon,
  title,
  body,
  testId,
  children,
}: {
  tone: "blue" | "green" | "amber" | "red";
  icon: React.ReactNode;
  title: string;
  body: string;
  testId: string;
  children?: React.ReactNode;
}) {
  const toneClasses = {
    blue: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400",
    amber: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
  }[tone];

  return (
    <div data-testid={testId}>
      <div
        className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${toneClasses}`}
      >
        {icon}
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
        {title}
      </h1>
      <p className="text-base text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
        {body}
      </p>
      {children}
    </div>
  );
}

function HomeButton({ isAR }: { isAR: boolean }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
    >
      <Home className="w-4 h-4" />
      {isAR ? "العودة إلى الصفحة الرئيسية" : "Back to home"}
    </Link>
  );
}

function Loading({ isAR }: { isAR: boolean }) {
  return (
    <Card
      tone="blue"
      icon={<Loader2 className="w-10 h-10 animate-spin" aria-hidden="true" />}
      title={isAR ? "جارٍ إلغاء الاشتراك..." : "Unsubscribing..."}
      body={
        isAR
          ? "نقوم بإزالة بريدك الإلكتروني من قائمتنا. لحظة من فضلك."
          : "We're removing your email from our list. One moment please."
      }
      testId="unsubscribe-loading"
    />
  );
}

function Done({ isAR, email }: { isAR: boolean; email?: string | undefined }) {
  return (
    <Card
      tone="green"
      icon={<CheckCircle2 className="w-10 h-10" aria-hidden="true" />}
      title={isAR ? "تم إلغاء اشتراكك" : "You've been unsubscribed"}
      body={
        email
          ? isAR
            ? `لن نرسل أي رسائل بريدية أخرى إلى ${email}.`
            : `We won't send any more newsletter emails to ${email}.`
          : isAR
            ? "لن نرسل لك أي رسائل بريدية أخرى."
            : "We won't send you any more newsletter emails."
      }
      testId="unsubscribe-success"
    >
      <HomeButton isAR={isAR} />
    </Card>
  );
}

function AlreadyDone({
  isAR,
  email,
}: {
  isAR: boolean;
  email?: string | undefined;
}) {
  return (
    <Card
      tone="blue"
      icon={<Mail className="w-10 h-10" aria-hidden="true" />}
      title={isAR ? "أنت غير مشترك بالفعل" : "Already unsubscribed"}
      body={
        email
          ? isAR
            ? `${email} غير موجود في قائمتنا البريدية.`
            : `${email} is no longer on our newsletter list.`
          : isAR
            ? "هذا البريد الإلكتروني غير موجود في قائمتنا البريدية."
            : "This email is no longer on our newsletter list."
      }
      testId="unsubscribe-already"
    >
      <HomeButton isAR={isAR} />
    </Card>
  );
}

function NotFound({ isAR }: { isAR: boolean }) {
  return (
    <Card
      tone="amber"
      icon={<Mail className="w-10 h-10" aria-hidden="true" />}
      title={isAR ? "غير موجود في القائمة" : "Not on our list"}
      body={
        isAR
          ? "لم نعثر على هذا البريد الإلكتروني في قائمتنا البريدية، لذلك لن تتلقى أي رسائل."
          : "We couldn't find this email on our newsletter list, so you won't receive any emails."
      }
      testId="unsubscribe-not-found"
    >
      <HomeButton isAR={isAR} />
    </Card>
  );
}

function Missing({ isAR }: { isAR: boolean }) {
  return (
    <Card
      tone="amber"
      icon={<AlertCircle className="w-10 h-10" aria-hidden="true" />}
      title={isAR ? "رابط إلغاء الاشتراك غير مكتمل" : "Unsubscribe link incomplete"}
      body={
        isAR
          ? "هذا الرابط يفتقد إلى رمز التحقق. الرجاء استخدام الرابط الموجود في أحدث رسالة بريدية تلقيتها منا، أو راسلنا للحصول على المساعدة."
          : "This link is missing its verification token. Please use the link from the most recent email we sent you, or contact us for help."
      }
      testId="unsubscribe-missing"
    >
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
      >
        {isAR ? "تواصل معنا" : "Contact us"}
      </Link>
    </Card>
  );
}

function NetworkError({ isAR }: { isAR: boolean }) {
  return (
    <Card
      tone="red"
      icon={<AlertCircle className="w-10 h-10" aria-hidden="true" />}
      title={isAR ? "تعذّر إلغاء الاشتراك" : "Couldn't unsubscribe"}
      body={
        isAR
          ? "تعذّر علينا معالجة طلبك في الوقت الحالي. الرجاء المحاولة مرة أخرى بعد قليل، أو تواصل معنا للحصول على المساعدة."
          : "We couldn't process your request right now. Please try again in a moment, or contact us for help."
      }
      testId="unsubscribe-error"
    >
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
      >
        {isAR ? "حاول مرة أخرى" : "Try again"}
      </button>
    </Card>
  );
}
