import { Link } from "wouter";
import { useConsent } from "@/context/ConsentContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

export function CookieConsentBanner() {
  const { status, accept, reject } = useConsent();
  const { lang } = useLanguage();
  const isAR = lang === "ar";

  if (status !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      data-testid="cookie-consent-banner"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Cookie className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p
              id="cookie-consent-title"
              className="font-semibold text-sm text-gray-900 dark:text-white mb-1"
            >
              {isAR ? "ملفات تعريف الارتباط والتحليلات" : "Cookies & Analytics"}
            </p>
            <p
              id="cookie-consent-desc"
              className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
            >
              {isAR
                ? "نستخدم Google Analytics لفهم كيفية استخدام الموقع وتحسينه. لن نقوم بتحميل أي شيء حتى توافق."
                : "We use Google Analytics to understand how the site is used and improve it. Nothing is loaded until you agree."}
              {" "}
              <Link
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {isAR ? "سياسة الخصوصية" : "Privacy Policy"}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={reject}
            data-testid="cookie-consent-reject"
          >
            {isAR ? "رفض" : "Reject"}
          </Button>
          <Button
            size="sm"
            onClick={accept}
            data-testid="cookie-consent-accept"
          >
            {isAR ? "قبول" : "Accept"}
          </Button>
        </div>
      </div>
    </div>
  );
}
