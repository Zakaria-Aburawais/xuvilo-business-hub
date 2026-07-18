import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type Tier, type Interval } from "@/context/AuthContext";
import { startCheckout } from "@/lib/billingApi";
import { getStoredPricingCurrency } from "@/lib/pricing-fx";
import { trackEvent } from "@/lib/analytics";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { Turnstile } from "@/components/Turnstile";

// Cloudflare Turnstile site key. Read from `VITE_TURNSTILE_SITE_KEY` at
// build time. When unset, the widget is not rendered and the form posts
// without a token — the API only enforces Turnstile when its own secret is
// configured, so unsetting both env vars cleanly disables this layer
// (honeypot still runs).
const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();

export default function SignupPage() {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const auth = useAuth();
  const isAR = lang === "ar";

  const params = new URLSearchParams(window.location.search);
  const planParam = params.get("plan") as Tier | null;
  const intervalParam = params.get("interval");
  const initialTier: Tier = planParam === "pro" || planParam === "business" ? planParam : "free";
  const checkoutInterval: Interval = intervalParam === "year" ? "year" : "month";

  useEffect(() => {
    if (auth.user && initialTier === "free") navigate("/dashboard");
  }, [auth.user, navigate, initialTier]);

  const [name, setName]         = useState("");
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

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);
  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError(isAR ? "يرجى إدخال اسمك." : "Please enter your name."); return; }
    if (!email.trim() || !email.includes("@")) { setError(isAR ? "يرجى إدخال بريد إلكتروني صالح." : "Please enter a valid email address."); return; }
    if (password.length < 8) { setError(isAR ? "يجب ألا تقل كلمة المرور عن 8 أحرف." : "Password must be at least 8 characters."); return; }
    if (turnstileEnabled && !turnstileToken) {
      setError(
        isAR
          ? "يرجى إكمال التحقق من الأمان قبل المتابعة."
          : "Please complete the security check before continuing.",
      );
      return;
    }

    setLoading(true);
    const result = await auth.signup(name, email, password, "free", {
      turnstileToken,
      website,
    }, lang);
    if (!result.ok) {
      setLoading(false);
      // Branch on the structured API error code (set by AuthContext.signup
      // when the server returns a JSON body like { error: "captcha_failed" }).
      // We deliberately do NOT pattern-match `result.error` (the human-readable
      // message), because that text is localized server-side and would change
      // between deployments.
      if (result.code === "captcha_failed") {
        setError(
          isAR
            ? "فشل التحقق من الأمان. يرجى إعادة المحاولة."
            : "Security check failed. Please try again.",
        );
        setTurnstileToken("");
        return;
      }
      setError(result.error || (isAR ? "تعذّر إنشاء الحساب." : "Sign up failed."));
      return;
    }

    trackEvent("signup_completed", { tier: initialTier, language: lang });

    if (initialTier !== "free") {
      try {
        const { url } = await startCheckout({
          name: name.trim(),
          plan: initialTier,
          interval: checkoutInterval,
          currency: getStoredPricingCurrency(),
        });
        window.location.href = url;
        return;
      } catch (err) {
        setLoading(false);
        const msg = err instanceof Error ? err.message : "Could not start checkout";
        toast({
          title: isAR ? "تم إنشاء الحساب" : "Account created",
          description: isAR
            ? `لكن تعذّر بدء الدفع: ${msg}. يمكنك المحاولة من صفحة الأسعار.`
            : `But checkout couldn't start: ${msg}. Try again from the Pricing page.`,
          variant: "destructive",
        });
        navigate("/pricing");
        return;
      }
    }

    setLoading(false);
    toast({ title: "Account created!", description: "Welcome to Xuvilo — AI Business Tools Hub!" });
    navigate("/dashboard");
  };

  const tierBadge = initialTier !== "free" ? (
    <div className="mb-4 flex items-center justify-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-full text-xs text-violet-700 dark:text-violet-300 font-medium">
      {isAR ? (
        <>سيتم توجيهك إلى الدفع لخطة <span className="font-bold capitalize">{initialTier}</span> ({checkoutInterval === "year" ? "سنوي" : "شهري"}) بعد إنشاء الحساب</>
      ) : (
        <>You'll be redirected to checkout for the <span className="font-bold capitalize">{initialTier}</span> plan ({checkoutInterval === "year" ? "yearly" : "monthly"}) after sign-up</>
      )}
    </div>
  ) : null;

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
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{t("auth.signup.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("auth.signup.subtitle")}</p>
          </div>

          {tierBadge}

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
                  <Label htmlFor="signup-website">Website</Label>
                  <Input
                    id="signup-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    data-testid="signup-website-honeypot"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t("auth.signup.name")}</Label>
                  <Input
                    type="text"
                    placeholder="Ahmed Al-Rashid"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="signup-name"
                    autoComplete="name"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t("auth.signup.email")}</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="signup-email"
                    autoComplete="email"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t("auth.signup.password")}</Label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="signup-password"
                      autoComplete="new-password"
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
                  {password && (
                    <div className="flex gap-1 mt-1">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${password.length >= i * 2 ? (password.length >= 10 ? "bg-green-500" : "bg-amber-400") : "bg-gray-200 dark:bg-gray-700"}`} />
                      ))}
                    </div>
                  )}
                </div>

                {turnstileEnabled && (
                  <div data-testid="signup-captcha">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      language={isAR ? "ar" : "en"}
                      onToken={handleTurnstileToken}
                      onExpire={handleTurnstileExpire}
                      onError={handleTurnstileError}
                    />
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  data-testid="signup-submit"
                  className="w-full h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      {t("auth.signup.submit")}
                    </span>
                  )}
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  {t("auth.signup.have_account")}{" "}
                  <Link href="/login" className="text-blue-600 hover:underline font-medium">
                    {t("auth.signup.login_link")}
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
