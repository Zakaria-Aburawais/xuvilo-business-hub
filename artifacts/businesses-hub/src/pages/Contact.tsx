import { useCallback, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { Turnstile } from "@/components/Turnstile";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, LifeBuoy } from "lucide-react";

// Cloudflare Turnstile site key. Read from `VITE_TURNSTILE_SITE_KEY` at build
// time. When unset, the widget is not rendered and the form posts without a
// token — the API only enforces Turnstile when its own secret is configured,
// so unsetting both env vars cleanly disables this layer (honeypot still
// runs).
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();

export default function ContactPage() {
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot: real users never see or fill this. If it has any value when the
  // form is submitted, the server treats the submission as spam and silently
  // discards it (returning a fake 200).
  const [website, setWebsite] = useState("");
  // Turnstile token (set by the widget callback once the visitor has been
  // verified — invisibly for most real visitors). Empty string means
  // "not yet verified". When the env var is unset, we never render the widget
  // and the token stays empty; the server treats that as "not enforced".
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const turnstileEnabled = TURNSTILE_SITE_KEY.length > 0;

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);
  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = isAR ? "الاسم مطلوب" : "Name is required";
    if (!email.trim()) e.email = isAR ? "البريد الإلكتروني مطلوب" : "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = isAR ? "بريد إلكتروني غير صحيح" : "Invalid email";
    if (!subject.trim()) e.subject = isAR ? "الموضوع مطلوب" : "Subject is required";
    if (!message.trim() || message.trim().length < 10)
      e.message = isAR ? "يجب ألا تقل الرسالة عن 10 أحرف" : "Message must be at least 10 characters";
    if (turnstileEnabled && !turnstileToken) {
      e.captcha = isAR
        ? "يرجى إكمال التحقق من الأمان قبل الإرسال."
        : "Please complete the security check before sending.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      let response: Response;
      try {
        response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            subject,
            message,
            lang,
            website,
            // Always include the field; an empty string means "no token".
            // The server only enforces presence when its secret is configured.
            turnstileToken,
          }),
        });
      } catch {
        toast({
          variant: "destructive",
          title: isAR ? "تعذّر الإرسال" : "Couldn't send",
          description: isAR
            ? "تحقّق من اتصالك بالإنترنت ثم أعد المحاولة، أو راسلنا على support@xuvilo.com."
            : "Check your internet connection and try again, or email us at support@xuvilo.com.",
        });
        return;
      }

      const body = await response
        .json()
        .catch(() => null) as { success?: boolean; error?: string } | null;

      if (response.ok && body?.success !== false) {
        toast({
          title: isAR ? "تم استلام رسالتك" : "Message received",
          description: isAR
            ? "شكراً لتواصلك معنا. سنرد عليك على بريدك الإلكتروني في أقرب وقت."
            : "Thanks for reaching out. We'll reply to your email as soon as possible.",
        });
        setName(""); setEmail(""); setSubject(""); setMessage(""); setWebsite("");
        setTurnstileToken("");
        return;
      }

      if (response.status === 429) {
        toast({
          variant: "destructive",
          title: isAR ? "يرجى التمهّل قليلاً" : "Please slow down",
          description: isAR
            ? "لقد أرسلت عدداً كبيراً من الرسائل في وقت قصير. الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى."
            : "You've sent a lot of messages in a short time. Please wait a bit and try again.",
        });
        return;
      }

      // Map known server-side validation errors (HTTP 400) to inline field
      // messages so the user can fix the specific field and retry, instead
      // of being told to email support. Unknown error codes fall through to
      // the generic toast below.
      if (response.status === 400 && body?.error) {
        // Captcha failure: surface inline next to the widget and reset the
        // cached token so Turnstile re-issues a fresh one on retry.
        if (body.error === "captcha_failed") {
          setErrors({
            captcha: isAR
              ? "فشل التحقق من الأمان. يرجى إعادة المحاولة."
              : "Security check failed. Please try again.",
          });
          setTurnstileToken("");
          return;
        }
        const fieldErrorMap: Record<string, { field: string; message: string }> = {
          invalid_name: {
            field: "name",
            message: isAR ? "الاسم مطلوب" : "Name is required",
          },
          invalid_email: {
            field: "email",
            message: isAR ? "بريد إلكتروني غير صحيح" : "Invalid email",
          },
          invalid_subject: {
            field: "subject",
            message: isAR ? "الموضوع مطلوب" : "Subject is required",
          },
          invalid_message: {
            field: "message",
            message: isAR
              ? "يجب ألا تقل الرسالة عن 10 أحرف"
              : "Message must be at least 10 characters",
          },
        };
        const mapped = fieldErrorMap[body.error];
        if (mapped) {
          setErrors({ [mapped.field]: mapped.message });
          return;
        }
      }

      toast({
        variant: "destructive",
        title: isAR ? "تعذّر الإرسال" : "Couldn't send",
        description: isAR
          ? "حدث خطأ أثناء إرسال رسالتك. الرجاء مراسلتنا على support@xuvilo.com."
          : "Something went wrong sending your message — please email support@xuvilo.com.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <SEOHead
        title={isAR ? "تواصل معنا — Xuvilo" : "Contact Us — Xuvilo"}
        description={
          isAR
            ? "تواصل مع فريق Xuvilo للحصول على الدعم، الملاحظات، استفسارات الأعمال، أو الإبلاغ عن مشاكل تقنية. نحن هنا لمساعدتك."
            : "Get in touch with the Xuvilo team for support, feedback, business inquiries, or to report a technical issue. We're here to help."
        }
        path="/contact"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {isAR ? "تواصل معنا" : "Contact Us"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {isAR
              ? "نحن نحب أن نسمع منك. سواء كنت تحتاج دعمًا، أو لديك ملاحظة، أو ترغب في الإبلاغ عن مشكلة، استخدم النموذج أدناه أو راسلنا على البريد الإلكتروني."
              : "We'd love to hear from you. Whether you need support, have feedback, or want to report an issue, use the form below or email us directly."}
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-950">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{isAR ? "البريد الإلكتروني" : "Email"}</h3>
              <a href="mailto:support@xuvilo.com" className="text-sm text-blue-600 dark:text-blue-400 break-all">
                support@xuvilo.com
              </a>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-950">
              <LifeBuoy className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{isAR ? "الدعم" : "Support"}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isAR
                  ? "أسئلة عامة، مشاكل في الأدوات، أو طلب ميزة جديدة."
                  : "General questions, tool issues, or feature requests."}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-950">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{isAR ? "استفسارات الأعمال" : "Business inquiries"}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isAR
                  ? "للشراكات، الإعلانات، أو التعاون التجاري."
                  : "Partnerships, advertising, or business collaborations."}
              </p>
            </div>
          </aside>

          <form onSubmit={onSubmit} className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-950 space-y-5">
            {/*
              Honeypot field. Hidden from real users via off-screen positioning
              (display:none is sometimes ignored by naive bots). Real visitors
              will never see, focus, or fill this. If a submission arrives with
              this field non-empty, the API rejects it as spam.
            */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-10000px",
                top: "auto",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
            >
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                data-testid="contact-website-honeypot"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{isAR ? "الاسم" : "Name"}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" data-testid="contact-name" />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="email">{isAR ? "البريد الإلكتروني" : "Email"}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" data-testid="contact-email" />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="subject">{isAR ? "الموضوع" : "Subject"}</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" data-testid="contact-subject" />
              {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject}</p>}
            </div>
            <div>
              <Label htmlFor="message">{isAR ? "الرسالة" : "Message"}</Label>
              <Textarea id="message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5" data-testid="contact-message" />
              {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
            </div>
            {turnstileEnabled && (
              <div data-testid="contact-captcha">
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  language={isAR ? "ar" : "en"}
                  onToken={handleTurnstileToken}
                  onExpire={handleTurnstileExpire}
                  onError={handleTurnstileError}
                />
                {errors.captcha && (
                  <p className="text-xs text-red-600 mt-2">{errors.captcha}</p>
                )}
              </div>
            )}
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto" data-testid="contact-submit">
              {submitting ? (isAR ? "جارٍ الإرسال..." : "Sending...") : isAR ? "إرسال" : "Send Message"}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isAR
                ? "بإرسال هذا النموذج فإنك توافق على سياسة الخصوصية الخاصة بنا. نستخدم بريدك الإلكتروني فقط للرد على رسالتك."
                : "By submitting this form you agree to our Privacy Policy. We'll use your email only to reply to your message."}
            </p>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
