import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { Turnstile } from "@/components/Turnstile";

// Cloudflare Turnstile site key. Read from `VITE_TURNSTILE_SITE_KEY` at
// build time. When unset, the widget is not rendered and the form posts
// without a token — the API only enforces Turnstile when its own secret is
// configured, so unsetting both env vars cleanly disables this layer
// (honeypot still runs).
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();

export default function LoginPage() {
  const { t, lang } = useLanguage();
  const isAR = lang === "ar";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const auth = useAuth();

  useEffect(() => {
    if (auth.user) navigate("/dashboard");
  }, [auth.user, navigate]);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  // Honeypot: real users never see or fill this. If a submission arrives
  // with this field non-empty, the API silently discards it as spam.
  const [website, setWebsite] = useState("");
  // Turnstile token (set by the widget once the visitor has been verified —
  // invisibly for most real visitors). Empty string means "not yet
  // verified". When the env var is unset, we never render the widget and
  // the token stays empty; the server treats that as "not enforced".
  const [turnstileToken, setTurnstileToken] = useState("");

  const turnstileEnabled = TURNSTILE_SITE_KEY.length > 0;

  // Bumping the key remounts the Turnstile widget, giving the visitor a
  // manual "try again" when the script or challenge failed to load.
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const [turnstileFailed, setTurnstileFailed] = useState(false);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileFailed(false);
    setTurnstileToken(token);
  }, []);
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);
  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
    setTurnstileFailed(true);
  }, []);
  const retryTurnstile = useCallback(() => {
    setTurnstileFailed(false);
    setTurnstileToken("");
    setTurnstileAttempt((n) => n + 1);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (turnstileEnabled && !turnstileToken) {
      setError(
        isAR
          ? "يرجى إكمال التحقق من الأمان قبل المتابعة."
          : "Please complete the security check before continuing.",
      );
      return;
    }

    setLoading(true);
    const result = await auth.login(email, password, { turnstileToken, website }, lang);
    setLoading(false);

    if (!result.ok) {
      // Branch on the structured API error code, not the human-readable
      // message (which is localized server-side and can change).
      if (result.code === "captcha_failed") {
        setError(
          isAR
            ? "فشل التحقق من الأمان. يرجى إعادة المحاولة."
            : "Security check failed. Please try again.",
        );
        setTurnstileToken("");
        return;
      }
      setError(result.error || "Login failed.");
      return;
    }
    toast({ title: "Welcome back!", description: "You are now signed in." });
    const params = new URLSearchParams(window.location.search);
    navigate(params.get("next") || "/tools/tracker");
  };

  return (
    <AppLayout noFooter>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center mb-6 hover:opacity-80 transition-opacity"
              aria-label={t("nav.brand")}
            >
              <AnimatedLogo showWordmark className="[&_img]:h-10 sm:[&_img]:h-12" />
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{t("auth.login.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("auth.login.subtitle")}</p>
          </div>

          <Card className="shadow-lg border-gray-200 dark:border-gray-800">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/*
                  Honeypot field. Hidden from real users via off-screen
                  positioning (display:none is sometimes ignored by naive
                  bots). Real visitors will never see, focus, or fill this.
                  If a submission arrives with this field non-empty, the API
                  silently discards it as spam.
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
                  <Label htmlFor="login-website">Website</Label>
                  <Input
                    id="login-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    data-testid="login-website-honeypot"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm font-medium">{t("auth.login.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="login-email"
                    autoComplete="email"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">{t("auth.login.password")}</Label>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => navigate("/forgot-password")}
                      data-testid="login-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="login-password"
                      autoComplete="current-password"
                      className="h-10 pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute inset-y-0 end-3 flex items-center text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {turnstileEnabled && (
                  <div data-testid="login-captcha">
                    <Turnstile
                      key={turnstileAttempt}
                      siteKey={TURNSTILE_SITE_KEY}
                      language={isAR ? "ar" : "en"}
                      onToken={handleTurnstileToken}
                      onExpire={handleTurnstileExpire}
                      onError={handleTurnstileError}
                    />
                    {turnstileFailed && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-lg mt-2">
                        {isAR
                          ? "تعذّر تحميل فحص الأمان — قد يكون السبب مانع إعلانات أو مشكلة في الشبكة. "
                          : "The security check couldn't load — an ad blocker or network issue may be the cause. "}
                        <button
                          type="button"
                          onClick={retryTurnstile}
                          className="underline font-medium"
                          data-testid="login-captcha-retry"
                        >
                          {isAR ? "إعادة المحاولة" : "Try again"}
                        </button>
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  data-testid="login-submit"
                  className="w-full h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      {t("auth.login.submit")}
                    </span>
                  )}
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  {t("auth.login.no_account")}{" "}
                  <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                    {t("auth.login.signup_link")}
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          <div className="mt-5 px-4 py-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              All free tools work without an account.{" "}
              <Link href="/invoice" className="font-semibold hover:underline">Try Invoice Generator →</Link>
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
