import { Mail, MessageCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface SendButtonsDoc {
  type: "invoice" | "quotation" | "receipt";
  title: string;
  clientName?: string;
  amount?: number;
  currency?: string;
  number?: string;
  date?: string;
}

interface SendButtonsProps {
  doc: SendButtonsDoc;
  size?: "sm" | "md";
  className?: string;
}

function buildBody(doc: SendButtonsDoc, isAR: boolean): string {
  const typeLabelEn: Record<string, string> = {
    invoice: "Invoice",
    quotation: "Quotation",
    receipt: "Receipt",
  };
  const typeLabelAr: Record<string, string> = {
    invoice: "فاتورة",
    quotation: "عرض سعر",
    receipt: "إيصال",
  };
  const label = isAR ? typeLabelAr[doc.type] : typeLabelEn[doc.type];
  const number = doc.number ? ` #${doc.number}` : "";
  const amount =
    typeof doc.amount === "number" && doc.currency
      ? `${doc.currency} ${doc.amount.toFixed(2)}`
      : "";
  if (isAR) {
    return [
      `مرحبًا${doc.clientName ? ` ${doc.clientName}` : ""}،`,
      ``,
      `أرفق لكم ${label}${number}${amount ? ` بقيمة ${amount}` : ""}.`,
      doc.date ? `التاريخ: ${doc.date}` : "",
      ``,
      `تم الإنشاء عبر Xuvilo — xuvilo.com`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `Hello${doc.clientName ? ` ${doc.clientName}` : ""},`,
    ``,
    `Please find ${label}${number}${amount ? ` for ${amount}` : ""} attached.`,
    doc.date ? `Date: ${doc.date}` : "",
    ``,
    `Created with Xuvilo — xuvilo.com`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSubject(doc: SendButtonsDoc, isAR: boolean): string {
  const map: Record<string, [string, string]> = {
    invoice: ["Invoice", "فاتورة"],
    quotation: ["Quotation", "عرض سعر"],
    receipt: ["Receipt", "إيصال"],
  };
  const [en, ar] = map[doc.type];
  const label = isAR ? ar : en;
  const number = doc.number ? ` #${doc.number}` : "";
  return `${label}${number}`;
}

export function SendButtons({ doc, size = "md", className }: SendButtonsProps) {
  const { lang } = useLanguage();
  const isAR = lang === "ar";
  const body = buildBody(doc, isAR);
  const subject = buildSubject(doc, isAR);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(body)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // 44x44 minimum tap target on mobile (h-11 w-11 = 44px)
  const baseBtn =
    size === "sm"
      ? "h-9 min-w-9 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors"
      : "h-11 min-w-11 px-4 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={isAR ? "إرسال عبر واتساب" : "Send via WhatsApp"}
        data-testid="send-whatsapp"
        className={`${baseBtn} text-white hover:opacity-90`}
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span className="hidden sm:inline">{isAR ? "واتساب" : "WhatsApp"}</span>
      </a>
      <a
        href={mailtoUrl}
        aria-label={isAR ? "إرسال عبر البريد الإلكتروني" : "Send via Email"}
        data-testid="send-email"
        className={`${baseBtn} bg-blue-600 text-white hover:bg-blue-700`}
      >
        <Mail className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        <span className="hidden sm:inline">{isAR ? "بريد" : "Email"}</span>
      </a>
    </div>
  );
}
