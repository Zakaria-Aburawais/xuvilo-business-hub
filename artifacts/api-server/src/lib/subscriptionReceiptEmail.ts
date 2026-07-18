// Branded subscription receipt / welcome email sent after a successful
// Stripe checkout or renewal. Reuses the shared branded email layout and the
// SendGrid integration. Sending is best-effort: failures are logged, never
// thrown, so webhook processing is not disrupted.
import { logger } from "./logger";
import { getUncachableSendGridClient } from "./sendgrid";
import { renderBrandedEmail, normalizeLang, type EmailLang } from "./emailTemplate";

export type ReceiptKind = "started" | "renewed";

export interface SubscriptionReceiptInput {
  to: string;
  name: string;
  lang: unknown;
  kind: ReceiptKind;
  planTier: string;
  interval: string | null;
  amountCents: number | null;
  currency: string | null;
  nextBillingDate: Date | null;
  baseUrl: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function planLabel(tier: string, lang: EmailLang): string {
  const t = tier.toLowerCase();
  if (lang === "ar") {
    if (t === "pro") return "الخطة الاحترافية (Pro)";
    if (t === "business") return "خطة الأعمال (Business)";
    return tier;
  }
  if (t === "pro") return "Pro";
  if (t === "business") return "Business";
  return tier;
}

function intervalLabel(interval: string | null, lang: EmailLang): string | null {
  if (interval === "month") return lang === "ar" ? "شهرياً" : "monthly";
  if (interval === "year") return lang === "ar" ? "سنوياً" : "yearly";
  return null;
}

function formatAmount(amountCents: number | null, currency: string | null, lang: EmailLang): string | null {
  if (amountCents === null || !currency) return null;
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar" : "en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(d: Date | null, lang: EmailLang): string | null {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export async function sendSubscriptionReceiptEmail(input: SubscriptionReceiptInput): Promise<void> {
  try {
    const lang = normalizeLang(input.lang);
    const isAr = lang === "ar";
    const plan = planLabel(input.planTier, lang);
    const cycle = intervalLabel(input.interval, lang);
    const amount = formatAmount(input.amountCents, input.currency, lang);
    const nextBilling = formatDate(input.nextBillingDate, lang);
    const displayName = input.name || input.to;
    const safeName = escapeHtml(displayName);
    const dashboardUrl = `${input.baseUrl.replace(/\/$/, "")}/dashboard`;

    const started = input.kind === "started";
    const subject = isAr
      ? started
        ? `مرحباً بك في خطة ${plan} من Xuvilo`
        : `تم تجديد اشتراكك في خطة ${plan} — Xuvilo`
      : started
        ? `Welcome to Xuvilo ${plan} — your subscription is active`
        : `Your Xuvilo ${plan} subscription has renewed`;

    const heading = isAr
      ? started
        ? `اشتراكك في خطة ${plan} أصبح فعالاً`
        : `تم تجديد اشتراكك في خطة ${plan}`
      : started
        ? `Your ${plan} plan is now active`
        : `Your ${plan} plan has renewed`;

    const rows: Array<[string, string]> = [];
    rows.push([isAr ? "الخطة" : "Plan", cycle ? `${plan} — ${cycle}` : plan]);
    if (amount) rows.push([isAr ? "المبلغ" : "Amount", amount]);
    if (nextBilling) rows.push([isAr ? "تاريخ الفاتورة القادمة" : "Next billing date", nextBilling]);

    const align = isAr ? "right" : "left";
    const detailsHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:16px 0; border:1px solid #e2e8f0; border-radius:8px; border-collapse:separate; overflow:hidden;">
        ${rows
          .map(
            ([label, value], i) => `
        <tr style="${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">
          <td align="${align}" style="padding:10px 14px; background:#f8fafc; color:#64748b; font-size:13px; white-space:nowrap; ${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">${escapeHtml(label)}</td>
          <td align="${align}" style="padding:10px 14px; color:#0f172a; font-size:14px; font-weight:600; ${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>`;

    const introHtml = isAr
      ? started
        ? `<p style="margin:0 0 12px 0;">مرحباً ${safeName}،</p><p style="margin:0 0 12px 0;">شكراً لاشتراكك! تم تفعيل خطتك بنجاح وأصبحت جميع مزايا خطة ${escapeHtml(plan)} متاحة لك الآن.</p>`
        : `<p style="margin:0 0 12px 0;">مرحباً ${safeName}،</p><p style="margin:0 0 12px 0;">تم تجديد اشتراكك في خطة ${escapeHtml(plan)} بنجاح. لا حاجة لأي إجراء من طرفك — هذا تأكيد لسجلاتك.</p>`
      : started
        ? `<p style="margin:0 0 12px 0;">Hi ${safeName},</p><p style="margin:0 0 12px 0;">Thanks for subscribing! Your plan is now active and all ${escapeHtml(plan)} features are unlocked.</p>`
        : `<p style="margin:0 0 12px 0;">Hi ${safeName},</p><p style="margin:0 0 12px 0;">Your ${escapeHtml(plan)} subscription has renewed successfully. No action is needed — this is a confirmation for your records.</p>`;

    const outroHtml = isAr
      ? `<p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">يمكنك إدارة اشتراكك أو تحديث وسيلة الدفع في أي وقت من صفحة الإعدادات.</p>`
      : `<p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">You can manage your subscription or update your payment method anytime from your settings page.</p>`;

    const bodyHtml = `${introHtml}${detailsHtml}${outroHtml}`;

    const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    const bodyText = isAr
      ? `${started ? `مرحباً ${displayName},\n\nشكراً لاشتراكك! تم تفعيل خطتك بنجاح.` : `مرحباً ${displayName},\n\nتم تجديد اشتراكك بنجاح.`}\n\n${textRows}\n\nيمكنك إدارة اشتراكك في أي وقت من صفحة الإعدادات.`
      : `${started ? `Hi ${displayName},\n\nThanks for subscribing! Your plan is now active.` : `Hi ${displayName},\n\nYour subscription has renewed successfully.`}\n\n${textRows}\n\nYou can manage your subscription anytime from your settings page.`;

    const preheader = isAr
      ? started
        ? `تم تفعيل خطة ${plan}${amount ? ` — ${amount}` : ""}.`
        : `تم تجديد خطة ${plan}${amount ? ` — ${amount}` : ""}.`
      : started
        ? `Your ${plan} plan is active${amount ? ` — ${amount}` : ""}.`
        : `Your ${plan} plan renewed${amount ? ` — ${amount}` : ""}.`;

    const rendered = renderBrandedEmail({
      lang,
      preheader,
      heading,
      bodyHtml,
      bodyText,
      cta: { label: isAr ? "الذهاب إلى لوحة التحكم" : "Go to your dashboard", url: dashboardUrl },
      recipientEmail: input.to,
      baseUrl: input.baseUrl,
    });

    const { client, fromEmail } = await getUncachableSendGridClient();
    await client.send({
      to: input.to,
      from: fromEmail,
      subject,
      text: rendered.text,
      html: rendered.html,
    });
    logger.info(
      { to: input.to, kind: input.kind, plan: input.planTier, lang },
      "Sent subscription receipt email",
    );
  } catch (err) {
    logger.error({ err, to: input.to, kind: input.kind }, "Failed to send subscription receipt email");
  }
}

export interface SubscriptionPaymentFailedInput {
  to: string;
  name: string;
  lang: unknown;
  planTier: string;
  amountCents: number | null;
  currency: string | null;
  /** When Stripe will retry the charge, if known. */
  nextRetryDate: Date | null;
  /** Where the "update payment method" button points (billing portal or settings). */
  updatePaymentUrl: string;
  baseUrl: string;
}

// Branded "payment failed — update your card" email sent when a renewal
// charge fails (invoice.payment_failed). Best-effort like its siblings:
// failures are logged, never thrown. Returns true when the email was
// actually handed to SendGrid, so callers can decide whether to record
// the send for dedup purposes.
export async function sendSubscriptionPaymentFailedEmail(
  input: SubscriptionPaymentFailedInput,
): Promise<boolean> {
  try {
    const lang = normalizeLang(input.lang);
    const isAr = lang === "ar";
    const plan = planLabel(input.planTier, lang);
    const amount = formatAmount(input.amountCents, input.currency, lang);
    const nextRetry = formatDate(input.nextRetryDate, lang);
    const displayName = input.name || input.to;
    const safeName = escapeHtml(displayName);

    const subject = isAr
      ? `تعذّر تجديد اشتراكك في خطة ${plan} — يرجى تحديث وسيلة الدفع`
      : `Action needed: your Xuvilo ${plan} renewal payment failed`;

    const heading = isAr
      ? `تعذّرت عملية دفع تجديد اشتراكك`
      : `We couldn't process your renewal payment`;

    const rows: Array<[string, string]> = [[isAr ? "الخطة" : "Plan", plan]];
    if (amount) rows.push([isAr ? "المبلغ" : "Amount", amount]);
    if (nextRetry)
      rows.push([isAr ? "ستتم إعادة المحاولة في" : "Next retry", nextRetry]);

    const align = isAr ? "right" : "left";
    const detailsHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:16px 0; border:1px solid #e2e8f0; border-radius:8px; border-collapse:separate; overflow:hidden;">
        ${rows
          .map(
            ([label, value], i) => `
        <tr style="${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">
          <td align="${align}" style="padding:10px 14px; background:#f8fafc; color:#64748b; font-size:13px; white-space:nowrap; ${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">${escapeHtml(label)}</td>
          <td align="${align}" style="padding:10px 14px; color:#0f172a; font-size:14px; font-weight:600; ${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>`;

    const introHtml = isAr
      ? `<p style="margin:0 0 12px 0;">مرحباً ${safeName}،</p><p style="margin:0 0 12px 0;">لم نتمكن من تحصيل دفعة تجديد اشتراكك في خطة ${escapeHtml(plan)}. قد يكون السبب انتهاء صلاحية البطاقة أو عدم توفر رصيد كافٍ.</p><p style="margin:0 0 12px 0;">يرجى تحديث وسيلة الدفع لتجنّب انقطاع مزايا خطتك.${nextRetry ? ` سنعيد محاولة الخصم تلقائياً في ${escapeHtml(nextRetry)}.` : " سنعيد محاولة الخصم تلقائياً خلال الأيام القادمة."}</p>`
      : `<p style="margin:0 0 12px 0;">Hi ${safeName},</p><p style="margin:0 0 12px 0;">We couldn't charge your card for your ${escapeHtml(plan)} subscription renewal. This usually happens when a card has expired or has insufficient funds.</p><p style="margin:0 0 12px 0;">Please update your payment method to keep your ${escapeHtml(plan)} features running without interruption.${nextRetry ? ` We'll automatically retry the charge on ${escapeHtml(nextRetry)}.` : " We'll automatically retry the charge over the next few days."}</p>`;

    const outroHtml = isAr
      ? `<p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">إذا كنت قد حدّثت وسيلة الدفع بالفعل، يمكنك تجاهل هذه الرسالة.</p>`
      : `<p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">If you've already updated your payment method, you can safely ignore this email.</p>`;

    const bodyHtml = `${introHtml}${detailsHtml}${outroHtml}`;

    const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    const bodyText = isAr
      ? `مرحباً ${displayName},\n\nلم نتمكن من تحصيل دفعة تجديد اشتراكك. يرجى تحديث وسيلة الدفع لتجنّب انقطاع مزايا خطتك.\n\n${textRows}\n\nتحديث وسيلة الدفع: ${input.updatePaymentUrl}`
      : `Hi ${displayName},\n\nWe couldn't charge your card for your subscription renewal. Please update your payment method to avoid losing access to your plan.\n\n${textRows}\n\nUpdate your payment method: ${input.updatePaymentUrl}`;

    const preheader = isAr
      ? `تعذّر تجديد خطة ${plan} — يرجى تحديث وسيلة الدفع.`
      : `Your ${plan} renewal failed — please update your payment method.`;

    const rendered = renderBrandedEmail({
      lang,
      preheader,
      heading,
      bodyHtml,
      bodyText,
      cta: {
        label: isAr ? "تحديث وسيلة الدفع" : "Update payment method",
        url: input.updatePaymentUrl,
      },
      recipientEmail: input.to,
      baseUrl: input.baseUrl,
    });

    const { client, fromEmail } = await getUncachableSendGridClient();
    await client.send({
      to: input.to,
      from: fromEmail,
      subject,
      text: rendered.text,
      html: rendered.html,
    });
    logger.info(
      { to: input.to, plan: input.planTier, lang },
      "Sent subscription payment-failed email",
    );
    return true;
  } catch (err) {
    logger.error(
      { err, to: input.to },
      "Failed to send subscription payment-failed email",
    );
    return false;
  }
}

// "cancel_scheduled": the user turned off auto-renew (cancel_at_period_end);
// access continues until the end of the paid period.
// "ended": the subscription is fully cancelled/expired and access has stopped.
export type CancellationKind = "cancel_scheduled" | "ended";

export interface SubscriptionCancellationInput {
  to: string;
  name: string;
  lang: unknown;
  kind: CancellationKind;
  planTier: string;
  accessUntil: Date | null;
  baseUrl: string;
}

export async function sendSubscriptionCancellationEmail(
  input: SubscriptionCancellationInput,
): Promise<void> {
  try {
    const lang = normalizeLang(input.lang);
    const isAr = lang === "ar";
    const plan = planLabel(input.planTier, lang);
    const accessUntil = formatDate(input.accessUntil, lang);
    const displayName = input.name || input.to;
    const safeName = escapeHtml(displayName);
    const pricingUrl = `${input.baseUrl.replace(/\/$/, "")}/pricing`;

    const scheduled = input.kind === "cancel_scheduled";
    const subject = isAr
      ? scheduled
        ? `تم إلغاء تجديد اشتراكك في خطة ${plan} — Xuvilo`
        : `انتهى اشتراكك في خطة ${plan} — Xuvilo`
      : scheduled
        ? `Your Xuvilo ${plan} subscription has been cancelled`
        : `Your Xuvilo ${plan} subscription has ended`;

    const heading = isAr
      ? scheduled
        ? `تم إلغاء تجديد اشتراكك`
        : `انتهى اشتراكك`
      : scheduled
        ? `Your subscription has been cancelled`
        : `Your subscription has ended`;

    const rows: Array<[string, string]> = [[isAr ? "الخطة" : "Plan", plan]];
    if (accessUntil) {
      rows.push([
        scheduled
          ? isAr
            ? "تبقى مزايا الخطة متاحة حتى"
            : "Access until"
          : isAr
            ? "تاريخ انتهاء الوصول"
            : "Access ended",
        accessUntil,
      ]);
    }

    const align = isAr ? "right" : "left";
    const detailsHtml = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:16px 0; border:1px solid #e2e8f0; border-radius:8px; border-collapse:separate; overflow:hidden;">
        ${rows
          .map(
            ([label, value], i) => `
        <tr style="${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">
          <td align="${align}" style="padding:10px 14px; background:#f8fafc; color:#64748b; font-size:13px; white-space:nowrap; ${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">${escapeHtml(label)}</td>
          <td align="${align}" style="padding:10px 14px; color:#0f172a; font-size:14px; font-weight:600; ${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>`;

    const introHtml = isAr
      ? scheduled
        ? `<p style="margin:0 0 12px 0;">مرحباً ${safeName}،</p><p style="margin:0 0 12px 0;">تم إلغاء التجديد التلقائي لاشتراكك في خطة ${escapeHtml(plan)}. ${accessUntil ? `ستظل جميع مزايا خطتك متاحة حتى ${escapeHtml(accessUntil)}، ولن يتم خصم أي مبالغ أخرى.` : "لن يتم خصم أي مبالغ أخرى."}</p>`
        : `<p style="margin:0 0 12px 0;">مرحباً ${safeName}،</p><p style="margin:0 0 12px 0;">انتهى اشتراكك في خطة ${escapeHtml(plan)} وتم تحويل حسابك إلى الخطة المجانية. تبقى مستنداتك وبياناتك محفوظة في حسابك.</p>`
      : scheduled
        ? `<p style="margin:0 0 12px 0;">Hi ${safeName},</p><p style="margin:0 0 12px 0;">Auto-renewal for your ${escapeHtml(plan)} subscription has been cancelled. ${accessUntil ? `You'll keep full access to all ${escapeHtml(plan)} features until ${escapeHtml(accessUntil)}, and you won't be charged again.` : "You won't be charged again."}</p>`
        : `<p style="margin:0 0 12px 0;">Hi ${safeName},</p><p style="margin:0 0 12px 0;">Your ${escapeHtml(plan)} subscription has ended and your account is now on the Free plan. Your documents and data are safe in your account.</p>`;

    const outroHtml = isAr
      ? `<p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">${scheduled ? "غيّرت رأيك؟ يمكنك إعادة تفعيل اشتراكك في أي وقت من صفحة الأسعار." : "يمكنك إعادة الاشتراك في أي وقت لاستعادة جميع المزايا."}</p>`
      : `<p style="margin:14px 0 0 0; color:#64748b; font-size:13px;">${scheduled ? "Changed your mind? You can resubscribe anytime from the pricing page." : "You can resubscribe anytime to get all features back."}</p>`;

    const bodyHtml = `${introHtml}${detailsHtml}${outroHtml}`;

    const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    const bodyText = isAr
      ? `${scheduled ? `مرحباً ${displayName},\n\nتم إلغاء التجديد التلقائي لاشتراكك.${accessUntil ? ` تبقى المزايا متاحة حتى ${accessUntil}.` : ""}` : `مرحباً ${displayName},\n\nانتهى اشتراكك وتم تحويل حسابك إلى الخطة المجانية.`}\n\n${textRows}\n\nيمكنك إعادة الاشتراك في أي وقت: ${pricingUrl}`
      : `${scheduled ? `Hi ${displayName},\n\nAuto-renewal for your subscription has been cancelled.${accessUntil ? ` You keep access until ${accessUntil}.` : ""}` : `Hi ${displayName},\n\nYour subscription has ended and your account is now on the Free plan.`}\n\n${textRows}\n\nYou can resubscribe anytime: ${pricingUrl}`;

    const preheader = isAr
      ? scheduled
        ? `تم إلغاء تجديد خطة ${plan}${accessUntil ? ` — تبقى المزايا حتى ${accessUntil}` : ""}.`
        : `انتهى اشتراكك في خطة ${plan}.`
      : scheduled
        ? `Your ${plan} plan won't renew${accessUntil ? ` — access until ${accessUntil}` : ""}.`
        : `Your ${plan} plan has ended.`;

    const rendered = renderBrandedEmail({
      lang,
      preheader,
      heading,
      bodyHtml,
      bodyText,
      cta: { label: isAr ? "عرض خطط الأسعار" : "View pricing plans", url: pricingUrl },
      recipientEmail: input.to,
      baseUrl: input.baseUrl,
    });

    const { client, fromEmail } = await getUncachableSendGridClient();
    await client.send({
      to: input.to,
      from: fromEmail,
      subject,
      text: rendered.text,
      html: rendered.html,
    });
    logger.info(
      { to: input.to, kind: input.kind, plan: input.planTier, lang },
      "Sent subscription cancellation email",
    );
  } catch (err) {
    logger.error(
      { err, to: input.to, kind: input.kind },
      "Failed to send subscription cancellation email",
    );
  }
}
