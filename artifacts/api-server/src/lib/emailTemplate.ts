export type EmailLang = "en" | "ar";

export interface BrandedEmailOptions {
  lang: EmailLang;
  preheader?: string;
  heading: string;
  bodyHtml: string;
  bodyText: string;
  cta?: { label: string; url: string };
  recipientEmail?: string;
  baseUrl: string;
  /**
   * One-click unsubscribe link rendered in the footer. When provided, the
   * generic unsubscribe note is replaced with an actionable "Unsubscribe"
   * link so subscribers can opt out of newsletter / broadcast emails in a
   * single click.
   */
  unsubscribeUrl?: string;
}

export interface BrandedEmail {
  html: string;
  text: string;
}

const BRAND = {
  name: "Xuvilo",
  taglineEn: "Smart business tools for freelancers and small businesses.",
  taglineAr: "أدوات أعمال ذكية للمستقلين والشركات الصغيرة.",
  fullNameEn: "Xuvilo — AI Business Tools Hub",
  fullNameAr: "Xuvilo — منصة أدوات الأعمال بالذكاء الاصطناعي",
};

const COPY = {
  en: {
    visitSite: "Visit Xuvilo",
    contact: "Contact us",
    unsubscribeNote:
      "You're receiving this email because of activity on your Xuvilo account. We only send transactional messages — never marketing.",
    unsubscribe: "Unsubscribe",
    rightsReserved: "All rights reserved.",
    viewInBrowser: "View this email in your browser",
    fallbackButton: "If the button above doesn't work, paste this link into your browser:",
  },
  ar: {
    visitSite: "زيارة Xuvilo",
    contact: "تواصل معنا",
    unsubscribeNote:
      "تتلقى هذا البريد بسبب نشاط على حسابك في Xuvilo. نرسل فقط رسائل المعاملات ولا نرسل أي رسائل تسويقية.",
    unsubscribe: "إلغاء الاشتراك",
    rightsReserved: "جميع الحقوق محفوظة.",
    viewInBrowser: "عرض هذه الرسالة في المتصفح",
    fallbackButton: "إذا لم يعمل الزر أعلاه، الصق هذا الرابط في متصفحك:",
  },
} as const;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export function normalizeLang(value: unknown): EmailLang {
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v.startsWith("ar")) return "ar";
  }
  return "en";
}

function logoUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/xuvilo-logo.png`;
}

function siteUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "") || "https://xuvilo.com";
}

function contactUrl(baseUrl: string): string {
  return `${siteUrl(baseUrl)}/contact`;
}

export function renderBrandedEmail(opts: BrandedEmailOptions): BrandedEmail {
  const {
    lang,
    heading,
    bodyHtml,
    bodyText,
    cta,
    recipientEmail,
    baseUrl,
    preheader,
    unsubscribeUrl,
  } = opts;
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const langAttr = isAr ? "ar" : "en";
  const copy = isAr ? COPY.ar : COPY.en;
  const brandLine = isAr ? BRAND.fullNameAr : BRAND.fullNameEn;
  const tagline = isAr ? BRAND.taglineAr : BRAND.taglineEn;
  const align = isAr ? "right" : "left";
  const fontStack = isAr
    ? "'Tajawal', 'Cairo', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    : "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const site = siteUrl(baseUrl);
  const logo = logoUrl(baseUrl);
  const contact = contactUrl(baseUrl);
  const year = new Date().getFullYear();

  const ctaBlock = cta
    ? `
      <tr>
        <td align="center" style="padding: 28px 32px 8px 32px;">
          <a href="${escapeAttr(cta.url)}"
             style="display: inline-block; padding: 13px 26px; background-color: #2563eb; background-image: linear-gradient(90deg,#2563eb,#06b6d4); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; line-height: 1;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
      <tr>
        <td align="${align}" style="padding: 8px 32px 0 32px; color: #475569; font-size: 13px; line-height: 1.6;">
          ${escapeHtml(copy.fallbackButton)}<br/>
          <a href="${escapeAttr(cta.url)}" style="color:#2563eb; word-break: break-all;">${escapeHtml(cta.url)}</a>
        </td>
      </tr>`
    : "";

  const preheaderBlock = preheader
    ? `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#ffffff;">${escapeHtml(preheader)}</div>`
    : "";

  const recipientLine = recipientEmail
    ? `<div style="margin-top: 6px; color:#94a3b8; font-size: 11px;">${escapeHtml(recipientEmail)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="${langAttr}" dir="${dir}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:${fontStack}; color:#0f172a;" dir="${dir}">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.06);">
          <tr>
            <td align="center" style="padding: 28px 32px 18px 32px; background:#ffffff; border-bottom:1px solid #e2e8f0;">
              <a href="${escapeAttr(site)}" style="text-decoration:none;">
                <img src="${escapeAttr(logo)}" alt="${escapeAttr(BRAND.name)}" width="160"
                     style="display:block; width:160px; max-width:60%; height:auto; border:0; outline:none;"/>
              </a>
            </td>
          </tr>
          <tr>
            <td align="${align}" style="padding: 28px 32px 8px 32px;">
              <h1 style="margin:0; font-size:20px; line-height:1.35; color:#0f172a; font-weight:700;">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          <tr>
            <td align="${align}" style="padding: 12px 32px 0 32px; color:#334155; font-size:15px; line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <hr style="border:none; border-top:1px solid #e2e8f0; margin:0;"/>
            </td>
          </tr>
          <tr>
            <td align="${align}" style="padding: 18px 32px 28px 32px; color:#64748b; font-size:12px; line-height:1.6;">
              <div style="font-weight:600; color:#0f172a; font-size:13px;">${escapeHtml(brandLine)}</div>
              <div style="margin-top:2px;">${escapeHtml(tagline)}</div>
              <div style="margin-top:10px;">
                <a href="${escapeAttr(site)}" style="color:#2563eb; text-decoration:none;">${escapeHtml(copy.visitSite)}</a>
                &nbsp;·&nbsp;
                <a href="${escapeAttr(contact)}" style="color:#2563eb; text-decoration:none;">${escapeHtml(copy.contact)}</a>
              </div>
              <div style="margin-top:12px; color:#94a3b8;">${escapeHtml(copy.unsubscribeNote)}</div>
              ${
                unsubscribeUrl
                  ? `<div style="margin-top:8px;"><a href="${escapeAttr(unsubscribeUrl)}" style="color:#2563eb; text-decoration:underline;">${escapeHtml(copy.unsubscribe)}</a></div>`
                  : ""
              }
              <div style="margin-top:10px; color:#94a3b8;">© ${year} ${escapeHtml(BRAND.name)}. ${escapeHtml(copy.rightsReserved)}</div>
              ${recipientLine}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts: string[] = [];
  textParts.push(brandLine);
  textParts.push(tagline);
  textParts.push("");
  textParts.push(heading);
  textParts.push("");
  textParts.push(bodyText.trim());
  if (cta) {
    textParts.push("");
    textParts.push(`${cta.label}: ${cta.url}`);
  }
  textParts.push("");
  textParts.push("—");
  textParts.push(`${copy.visitSite}: ${site}`);
  textParts.push(`${copy.contact}: ${contact}`);
  textParts.push(copy.unsubscribeNote);
  if (unsubscribeUrl) {
    textParts.push(`${copy.unsubscribe}: ${unsubscribeUrl}`);
  }
  textParts.push(`© ${year} ${BRAND.name}. ${copy.rightsReserved}`);
  if (recipientEmail) {
    textParts.push(recipientEmail);
  }

  const text = textParts.join("\n");

  return { html, text };
}
