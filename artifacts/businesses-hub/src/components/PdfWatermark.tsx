import { useLanguage } from "@/context/LanguageContext";

/**
 * Visible "Powered by Xuvilo" watermark for free-tier PDF exports.
 * Placed inside the print/preview surface so html2canvas/jspdf captures it.
 */
export function PdfWatermark({ visible }: { visible: boolean }) {
  const { lang } = useLanguage();
  if (!visible) return null;
  const text = lang === "ar"
    ? "أنشئ بواسطة Xuvilo — xuvilo.com"
    : "Created with Xuvilo — xuvilo.com";
  return (
    <div
      className="pointer-events-none select-none w-full text-center text-[10px] tracking-wide text-gray-400 mt-6 pt-3 border-t border-dashed border-gray-300 dark:border-gray-700 print:text-gray-500"
      data-testid="pdf-watermark"
      aria-hidden="true"
    >
      {text}
    </div>
  );
}
