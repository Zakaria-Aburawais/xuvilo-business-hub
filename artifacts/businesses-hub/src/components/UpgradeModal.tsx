import { useEffect } from "react";
import { Link } from "wouter";
import { X, Crown, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  open: boolean;
  onClose: () => void;
  reason?: "limit" | "feature";
  used?: number;
  limit?: number;
}

export function UpgradeModal({ open, onClose, reason = "limit", used = 0, limit = 10 }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const title = reason === "limit"
    ? (isAr ? "وصلت إلى الحد المجاني" : "You've hit the free plan limit")
    : (isAr ? "هذه الميزة في الباقة المدفوعة" : "This is a Pro feature");

  const subtitle = reason === "limit"
    ? (isAr
        ? `استخدمت ${used} من ${limit} مستندات هذا الشهر. ارفع باقتك لإنشاء عدد غير محدود.`
        : `You've used ${used} of ${limit} free documents this month. Upgrade to create unlimited.`)
    : (isAr
        ? "ترقى إلى الباقة المدفوعة لفتح هذه الميزة وغيرها."
        : "Upgrade to Pro to unlock this feature and more.");

  const benefits = isAr
    ? [
        "مستندات غير محدودة",
        "بدون علامة مائية",
        "قوالب احترافية متقدمة",
        "حفظ العملاء والمنتجات",
        "لوحة تحكم وتحليلات",
        "دعم أولوي عبر البريد",
      ]
    : [
        "Unlimited documents per month",
        "No Xuvilo watermark on PDFs",
        "Premium templates & branding",
        "Saved clients & products",
        "Dashboard & analytics",
        "Priority email support",
      ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      data-testid="upgrade-modal"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? "إغلاق" : "Close"}
          className="absolute top-3 end-3 w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500"
          data-testid="upgrade-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 px-6 py-5 text-white">
          <Crown className="w-7 h-7 mb-2" aria-hidden="true" />
          <h2 id="upgrade-modal-title" className="text-xl font-extrabold leading-tight">{title}</h2>
          <p className="text-amber-50 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="px-6 py-5">
          <ul className="space-y-2.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-2">
          <Link href="/pricing" className="flex-1">
            <button
              onClick={onClose}
              className="w-full inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold transition shadow-md"
              data-testid="upgrade-modal-cta"
            >
              {isAr ? "عرض الأسعار" : "See pricing"}
            </button>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            data-testid="upgrade-modal-dismiss"
          >
            {isAr ? "ربما لاحقاً" : "Maybe later"}
          </button>
        </div>
      </div>
    </div>
  );
}
