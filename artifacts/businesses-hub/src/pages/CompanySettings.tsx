import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Loader2,
  Upload,
  X,
  CheckCircle,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import {
  getCompanyProfile,
  saveCompanyProfile,
  type CompanyProfile,
} from "@/lib/savedDocsApi";

// Maximum size of the in-memory data URL we will accept for the logo.
// Server enforces ~1.4 MB (1 MB raw image), so we mirror that to give a
// friendly client-side message before the network round trip.
const MAX_LOGO_BYTES = 1_000_000;

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "EGP", "LYD", "QAR", "KWD", "OMR", "BHD"];
const LANGS = ["en", "ar", "fr", "es"];

interface FormState {
  companyName: string;
  logoData: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxOrVatNumber: string;
  registrationNumber: string;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultPaymentTerms: string;
  defaultNotes: string;
}

const blankForm: FormState = {
  companyName: "",
  logoData: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  email: "",
  website: "",
  taxOrVatNumber: "",
  registrationNumber: "",
  defaultCurrency: "USD",
  defaultLanguage: "en",
  defaultPaymentTerms: "Net 30 days",
  defaultNotes: "",
};

function profileToForm(p: CompanyProfile): FormState {
  return {
    companyName: p.companyName,
    logoData: p.logoData,
    address: p.address,
    city: p.city,
    country: p.country,
    phone: p.phone,
    email: p.email,
    website: p.website,
    taxOrVatNumber: p.taxOrVatNumber,
    registrationNumber: p.registrationNumber,
    defaultCurrency: p.defaultCurrency || "USD",
    defaultLanguage: p.defaultLanguage || "en",
    defaultPaymentTerms: p.defaultPaymentTerms,
    defaultNotes: p.defaultNotes,
  };
}

export default function CompanySettingsPage() {
  const { user } = useAuth();
  const { lang, isRTL } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAr = lang === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Redirect anonymous users to login while preserving deep link.
  useEffect(() => {
    if (!user) {
      navigate("/login?next=/settings/company");
    }
  }, [user, navigate]);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const p = await getCompanyProfile();
      if (p) {
        setHasProfile(true);
        setForm(profileToForm(p));
      } else {
        setHasProfile(false);
        // Seed defaults for first-time setup; do not blow away user typing.
        setForm((prev) => (prev.companyName ? prev : blankForm));
      }
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : t("Could not load profile", "تعذّر تحميل الملف"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast, isAr]);

  useEffect(() => { void reload(); }, [reload]);

  const onLogo = (file: File | null) => {
    setError("");
    if (!file) {
      setForm((p) => ({ ...p, logoData: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(t("Logo must be an image (PNG, JPG, SVG).", "يجب أن يكون الشعار صورة (PNG, JPG, SVG)."));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(t("Logo must be under 1 MB.", "يجب أن يكون الشعار أقل من 1 ميغابايت."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setForm((p) => ({ ...p, logoData: dataUrl }));
    };
    reader.onerror = () => {
      setError(t("Could not read the image.", "تعذّر قراءة الصورة."));
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.companyName.trim()) {
      setError(t("Company name is required.", "اسم الشركة مطلوب."));
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCompanyProfile({
        ...form,
        companyName: form.companyName.trim(),
      });
      setForm(profileToForm(saved));
      setHasProfile(true);
      toast({
        title: t("Company profile saved", "تم حفظ ملف الشركة"),
        description: t(
          "We'll use it to auto-fill new invoices, quotations, and receipts.",
          "سنستخدمه لتعبئة الفواتير وعروض الأسعار والإيصالات الجديدة تلقائياً.",
        ),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Profile completion is shown to the user as a friendly nudge to fill
  // optional fields (improves auto-fill quality on documents). Counts the
  // 12 user-facing fields below, ignoring system fields.
  const completion = (() => {
    const fields: Array<keyof FormState> = [
      "companyName", "logoData", "address", "city", "country",
      "phone", "email", "website", "taxOrVatNumber", "registrationNumber",
      "defaultPaymentTerms", "defaultNotes",
    ];
    const filled = fields.filter((k) => String(form[k] ?? "").trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  })();

  if (!user) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet>
        <title>{t("Company profile — Xuvilo", "ملف الشركة — Xuvilo")}</title>
        <meta
          name="description"
          content={t(
            "Save your business details once. They'll auto-fill on every invoice, quotation, and receipt you create.",
            "احفظ تفاصيل عملك مرة واحدة. سنعبّئها تلقائياً في كل فاتورة وعرض سعر وإيصال.",
          )}
        />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                data-testid="link-back-settings"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t("Account settings", "إعدادات الحساب")}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="company-settings-title">
                {t("Company profile", "ملف الشركة")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  "Saved once, used everywhere. Auto-fills on new invoices, quotations, and receipts.",
                  "احفظ مرة واحدة، واستخدمه في كل مكان. يُعبّأ تلقائياً في الفواتير وعروض الأسعار والإيصالات الجديدة.",
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{t("Completion", "اكتمال")}</div>
              <div className="text-lg font-semibold tabular-nums" data-testid="company-completion">
                {completion}%
              </div>
            </div>
          </div>

          {!hasProfile && !loading && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <strong>{t("Tip:", "نصيحة:")}</strong>{" "}
                {t(
                  "Fill the basics now (name + email) and finish the rest later. Your profile is private and only used to pre-fill your own documents.",
                  "املأ الأساسيات الآن (الاسم والبريد الإلكتروني) وأكمل الباقي لاحقاً. ملفك خاص ويُستخدم فقط لتعبئة مستنداتك.",
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    {t("Business details", "تفاصيل العمل")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo */}
                  <div>
                    <Label className="text-xs">{t("Logo", "الشعار")}</Label>
                    {form.logoData ? (
                      <div className="flex items-center gap-3 mt-1.5">
                        <img
                          src={form.logoData}
                          alt="Logo"
                          className="h-14 w-auto object-contain rounded border border-border bg-white p-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => onLogo(null)}
                          data-testid="company-remove-logo"
                        >
                          <X className="w-4 h-4 me-1" />
                          {t("Remove", "إزالة")}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1.5 gap-2"
                          onClick={() => fileRef.current?.click()}
                          data-testid="company-upload-logo"
                        >
                          <Upload className="w-4 h-4" />
                          {t("Upload logo", "رفع الشعار")}
                        </Button>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("PNG, JPG, or SVG up to 1 MB.", "PNG أو JPG أو SVG حتى 1 ميغابايت.")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="cp-name" className="text-xs">
                        {t("Company name", "اسم الشركة")} *
                      </Label>
                      <Input
                        id="cp-name"
                        value={form.companyName}
                        onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                        data-testid="company-name"
                        autoComplete="organization"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-phone" className="text-xs">{t("Phone", "الهاتف")}</Label>
                      <Input
                        id="cp-phone"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        data-testid="company-phone"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-email" className="text-xs">{t("Email", "البريد الإلكتروني")}</Label>
                      <Input
                        id="cp-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        data-testid="company-email"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-website" className="text-xs">{t("Website", "الموقع الإلكتروني")}</Label>
                      <Input
                        id="cp-website"
                        type="url"
                        placeholder="https://example.com"
                        value={form.website}
                        onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                        data-testid="company-website"
                        autoComplete="url"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-tax" className="text-xs">{t("Tax / VAT number", "الرقم الضريبي")}</Label>
                      <Input
                        id="cp-tax"
                        value={form.taxOrVatNumber}
                        onChange={(e) => setForm((p) => ({ ...p, taxOrVatNumber: e.target.value }))}
                        data-testid="company-tax"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-reg" className="text-xs">
                        {t("Registration number", "رقم السجل التجاري")}
                      </Label>
                      <Input
                        id="cp-reg"
                        value={form.registrationNumber}
                        onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                        data-testid="company-reg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-city" className="text-xs">{t("City", "المدينة")}</Label>
                      <Input
                        id="cp-city"
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        data-testid="company-city"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-country" className="text-xs">{t("Country (ISO-2)", "الدولة (ISO-2)")}</Label>
                      <Input
                        id="cp-country"
                        maxLength={3}
                        placeholder="SA"
                        value={form.country}
                        onChange={(e) => setForm((p) => ({ ...p, country: e.target.value.toUpperCase() }))}
                        data-testid="company-country"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="cp-addr" className="text-xs">{t("Address", "العنوان")}</Label>
                      <Input
                        id="cp-addr"
                        value={form.address}
                        onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                        data-testid="company-address"
                        autoComplete="street-address"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("Document defaults", "الإعدادات الافتراضية للمستندات")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      "Used as starting values when you create a new invoice, quotation, or receipt.",
                      "تُستخدم كقيم بداية عند إنشاء فاتورة أو عرض سعر أو إيصال جديد.",
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="cp-cur" className="text-xs">{t("Default currency", "العملة الافتراضية")}</Label>
                      <select
                        id="cp-cur"
                        value={form.defaultCurrency}
                        onChange={(e) => setForm((p) => ({ ...p, defaultCurrency: e.target.value }))}
                        className="w-full h-9 text-sm rounded-md border border-input bg-background px-2"
                        data-testid="company-default-currency"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cp-lang" className="text-xs">{t("Default language", "اللغة الافتراضية")}</Label>
                      <select
                        id="cp-lang"
                        value={form.defaultLanguage}
                        onChange={(e) => setForm((p) => ({ ...p, defaultLanguage: e.target.value }))}
                        className="w-full h-9 text-sm rounded-md border border-input bg-background px-2"
                        data-testid="company-default-language"
                      >
                        {LANGS.map((l) => (
                          <option key={l} value={l}>{l.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cp-terms" className="text-xs">
                      {t("Default payment terms", "شروط الدفع الافتراضية")}
                    </Label>
                    <Input
                      id="cp-terms"
                      placeholder="Net 30 days"
                      value={form.defaultPaymentTerms}
                      onChange={(e) => setForm((p) => ({ ...p, defaultPaymentTerms: e.target.value }))}
                      data-testid="company-default-terms"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cp-notes" className="text-xs">
                      {t("Default notes / footer", "الملاحظات الافتراضية / التذييل")}
                    </Label>
                    <Textarea
                      id="cp-notes"
                      rows={3}
                      placeholder={t(
                        "Thank you for your business. Bank details: …",
                        "نشكرك على ثقتك. تفاصيل الحساب البنكي: …",
                      )}
                      value={form.defaultNotes}
                      onChange={(e) => setForm((p) => ({ ...p, defaultNotes: e.target.value }))}
                      data-testid="company-default-notes"
                    />
                  </div>
                </CardContent>
              </Card>

              {error && (
                <p className="text-sm text-red-500" data-testid="company-error">{error}</p>
              )}

              <div className="flex flex-wrap gap-2 items-center justify-between">
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  {hasProfile && (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      {t("Profile saved · auto-filling on new documents.", "تم الحفظ · سيُستخدم في المستندات الجديدة.")}
                    </>
                  )}
                </p>
                <div className="flex gap-2">
                  <Link href="/dashboard">
                    <Button type="button" variant="outline" data-testid="company-cancel">
                      {t("Back to dashboard", "العودة للوحة التحكم")}
                    </Button>
                  </Link>
                  <Button type="submit" disabled={saving || !form.companyName.trim()} data-testid="company-save">
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t("Saving…", "جاري الحفظ…")}
                      </span>
                    ) : (
                      t("Save profile", "حفظ الملف")
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
