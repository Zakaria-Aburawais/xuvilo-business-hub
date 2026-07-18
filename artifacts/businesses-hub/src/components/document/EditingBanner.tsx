import { useState } from "react";
import { Info, X, Copy } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface EditingBannerProps {
  docTitle: string;
  docTypeLabel: { en: string; ar: string };
  onSaveAsNew: () => void;
}

export function EditingBanner({ docTitle, docTypeLabel, onSaveAsNew }: EditingBannerProps) {
  const { lang } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const typeLabel = lang === "ar" ? docTypeLabel.ar : docTypeLabel.en;

  return (
    <div
      role="status"
      data-testid="editing-banner"
      className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3"
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {lang === "ar"
              ? `تحرير ${typeLabel} المحفوظ`
              : `Editing saved ${typeLabel}`}
            {docTitle && (
              <span className="font-normal text-blue-800 dark:text-blue-200">
                {" — "}
                <span className="font-semibold">{docTitle}</span>
              </span>
            )}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            {lang === "ar"
              ? "ستحدث التغييرات السجل الموجود في لوحة التحكم."
              : "Changes will update the existing entry in your dashboard."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ms-7 sm:ms-0">
        <button
          type="button"
          onClick={onSaveAsNew}
          data-testid="save-as-new-btn"
          className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-900/40 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          {lang === "ar" ? "حفظ كنسخة جديدة" : "Save as new copy"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={lang === "ar" ? "إغلاق" : "Dismiss"}
          data-testid="editing-banner-dismiss"
          className="rounded-md p-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
