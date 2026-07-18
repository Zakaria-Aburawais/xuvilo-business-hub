import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, ArrowLeft, MailCheck, Send } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { authForgotPassword, ApiError } from "@/lib/billingApi";
import { Turnstile } from "@/components/Turnstile";

// Cloudflare Turnstile site key. Read from `VITE_TURNSTILE_SITE_KEY` at
// build time. When unset, the widget is not rendered and the form posts
// without a token — the API only enforces Turnstile when its own secret is
// configured, so unsetting both env vars cleanly disables this layer
// (honeypot still runs).
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();

export default function ForgotPasswordPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  // Honeypot: real users never see or fill this. If a submission arrives
  // with this field non-empty, the API silently discards it as spam.
  const [website, setWebsite] = useState("");
  // Turnstile token (set by the widget once the visitor has been verified —
  // invisibly for most real visitors). Empty string means "not yet
  // verified". When the env var is unset, we never render the widget and
  // the token stays empty; the server treats that as "not enforced".
  const [turnstileToken, setTurnstileToken] = useState("");

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

  const t = (en: string, arT: string) => (ar ? arT : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صالح."));
      return;
    }
    if (turnstileEnabled && !turnstileToken) {
      setError(
        t(
          "Please complete the security check before continuing.",
          "يرجى إكمال التحقق من الأمان قبل المتابعة.",
        ),
      );
      return;
    }
    setLoading(true);
    try {
      await authForgotPassword(email.trim(), lang, {
        turnstileToken,
        website,
      });
      setSent(true);
    } catch (err) {
      // Surface a captcha failure inline so the user can retry; otherwise
      // fall back to the original behavior of always showing the success
      // screen (which deliberately leaks no information about whether the
      // email exists). We branch on the structured error CODE rather than
      // the human-readable message to stay robust against localization or
      // wording changes on the server.
      if (err instanceof ApiError && err.code === "captcha_failed") {
        setError(
          t(
            "Security check failed. Please try again.",
            "فشل التحقق من الأمان. يرجى إعادة المحاولة.",
          ),
        );
        setTurnstileToken("");
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout noFooter>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-600 font-bold text-xl mb-6 hover:opacity-80 transition-opacity">
              <LayoutDashboard className="w-6 h-6" />
              <span>Xuvilo — AI Business Tools Hub</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("Forgot your password?", "نسيت كلمة المرور؟")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t(
                "Enter your account email and we'll send you a secure reset link.",
                "أدخل بريدك المسجّل وسنرسل لك رابط إعادة تعيين آمناً.",
              )}
            </p>
          </div>

          <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
            <CardContent className="p-6">
              {sent ? (
                <div className="text-center space-y-4 py-4" data-testid="forgot-sent">
                  <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                    <MailCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("Check your email", "تحقق من بريدك")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t(
                      "If an account exists for that email, we've sent a password reset link. The link expires in 30 minutes.",
                      "إذا كان هناك حساب بهذا البريد فقد أرسلنا رابط إعادة تعيين كلمة المرور. تنتهي صلاحيته خلال 30 دقيقة.",
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSent(false); setEmail(""); }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t("Send to a different email", "إرسال إلى بريد آخر")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/*
                    Honeypot field. Hidden from real users via off-screen
                    positioning (display:none is sometimes ignored by naive
                    bots). Real visitors will never see, focus, or fill this.
                    If a submission arrives with this field non-empty, the
                    API silently discards it as spam.
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
                    <Label htmlFor="forgot-website">Website</Label>
                    <Input
                      id="forgot-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      data-testid="forgot-website-honeypot"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm">
                      {error}
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="forgot-email" className="text-sm font-medium">
                      {t("Email address", "البريد الإلكتروني")}
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      data-testid="forgot-email"
                      className="h-10"
                    />
                  </div>
                  {turnstileEnabled && (
                    <div data-testid="forgot-captcha">
                      <Turnstile
                        siteKey={TURNSTILE_SITE_KEY}
                        language={ar ? "ar" : "en"}
                        onToken={handleTurnstileToken}
                        onExpire={handleTurnstileExpire}
                        onError={handleTurnstileError}
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="forgot-submit"
                    className="w-full h-10 rounded-md bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-600 text-white font-medium inline-flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? (
                      t("Sending…", "جارٍ الإرسال…")
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {t("Send reset link", "إرسال رابط الإعادة")}
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("Back to sign in", "العودة لتسجيل الدخول")}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
