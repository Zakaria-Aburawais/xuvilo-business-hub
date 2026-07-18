import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { authResetPassword, setAuthToken } from "@/lib/billingApi";
import { useAuth } from "@/context/AuthContext";

export default function ResetPasswordPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const auth = useAuth();

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const t = (en: string, arT: string) => (ar ? arT : en);

  useEffect(() => {
    if (!token) {
      setError(t("This reset link is missing or invalid.", "رابط إعادة التعيين غير صالح أو مفقود."));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError(t("This reset link is missing or invalid.", "رابط إعادة التعيين غير صالح أو مفقود."));
      return;
    }
    if (password.length < 6) {
      setError(t("Password must be at least 6 characters.", "يجب أن تكون كلمة المرور 6 أحرف على الأقل."));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords don't match.", "كلمتا المرور غير متطابقتين."));
      return;
    }
    setLoading(true);
    try {
      const res = await authResetPassword(token, password);
      setAuthToken(res.token);
      setSuccess(true);
      toast({
        title: t("Password updated", "تم تحديث كلمة المرور"),
        description: t("You're now signed in.", "تم تسجيل دخولك."),
      });
      try {
        await auth.refreshBilling();
      } catch {
        // ignore
      }
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not reset password.", "تعذّر إعادة تعيين كلمة المرور."));
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
              {t("Choose a new password", "اختر كلمة مرور جديدة")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t("Make it strong and easy to remember.", "اجعلها قوية وسهلة التذكر.")}
            </p>
          </div>

          <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
            <CardContent className="p-6">
              {success ? (
                <div className="text-center space-y-3 py-4" data-testid="reset-success">
                  <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("Password updated", "تم تحديث كلمة المرور")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("Redirecting you to your dashboard…", "جارٍ تحويلك إلى لوحة التحكم…")}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="new-password" className="text-sm font-medium">
                      {t("New password", "كلمة المرور الجديدة")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        data-testid="reset-password"
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

                  <div className="space-y-1">
                    <Label htmlFor="confirm-password" className="text-sm font-medium">
                      {t("Confirm new password", "تأكيد كلمة المرور")}
                    </Label>
                    <Input
                      id="confirm-password"
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      data-testid="reset-confirm"
                      className="h-10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !token}
                    data-testid="reset-submit"
                    className="w-full h-10 rounded-md bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-600 text-white font-medium hover:opacity-95 disabled:opacity-60"
                  >
                    {loading
                      ? t("Updating…", "جارٍ التحديث…")
                      : t("Update password", "تحديث كلمة المرور")}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600"
                >
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
