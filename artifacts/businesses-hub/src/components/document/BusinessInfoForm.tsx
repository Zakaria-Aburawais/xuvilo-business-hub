import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { BusinessInfo } from "@/types/document";
import { Upload, X, Building2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCompanyProfile, type CompanyProfile } from "@/lib/savedDocsApi";

interface BusinessInfoFormProps {
  businessInfo: BusinessInfo;
  onChange: (info: BusinessInfo) => void;
  onLogoUpload: (file: File | null) => void;
}

/**
 * Maps a saved CompanyProfile (server shape) into the BusinessInfo shape
 * the document forms use locally. Empty server values fall through to
 * empty strings so they don't overwrite anything the user has typed.
 */
function profileToBusinessInfo(p: CompanyProfile): BusinessInfo {
  return {
    name: p.companyName || "",
    address: p.address || "",
    phone: p.phone || "",
    email: p.email || "",
    vatNumber: p.taxOrVatNumber || "",
    logoUrl: p.logoData || null,
  };
}

/**
 * True when none of the user-facing fields contain content yet. We use
 * this to decide whether it's safe to auto-fill from a saved profile —
 * we never blow away values the user has already typed.
 */
function isBusinessInfoBlank(b: BusinessInfo): boolean {
  return !(b.name?.trim() || b.address?.trim() || b.phone?.trim() || b.email?.trim() || b.vatNumber?.trim() || b.logoUrl);
}

export function BusinessInfoForm({ businessInfo, onChange, onLogoUpload }: BusinessInfoFormProps) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const isAr = lang === "ar";
  const fileRef = useRef<HTMLInputElement>(null);

  // Local cache of the user's saved company profile (or null if none / not signed in).
  // We fetch it once on mount when the user is signed in. Used both for the
  // "Use my company profile" button and the one-shot auto-fill.
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const autoFilledRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    let cancelled = false;
    getCompanyProfile()
      .then((p) => {
        if (!cancelled) {
          setProfile(p);
          setProfileLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setProfileLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  // One-shot auto-fill: when the user is signed in, has a saved profile,
  // and the form is still completely blank, populate it. We guard with a
  // ref so we never overwrite manual edits that come later.
  useEffect(() => {
    if (autoFilledRef.current) return;
    if (!profileLoaded || !profile) return;
    if (!isBusinessInfoBlank(businessInfo)) return;
    autoFilledRef.current = true;
    onChange(profileToBusinessInfo(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profileLoaded]);

  const applyProfile = () => {
    if (!profile) return;
    autoFilledRef.current = true;
    onChange(profileToBusinessInfo(profile));
  };

  const field = (key: keyof BusinessInfo, label: string, testId: string) => (
    <div className="space-y-1">
      <Label htmlFor={testId} className="text-xs">{label}</Label>
      <Input
        id={testId}
        value={businessInfo[key] as string ?? ""}
        onChange={(e) => onChange({ ...businessInfo, [key]: e.target.value })}
        data-testid={testId}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-sm text-foreground">{t("doc.business_info")}</h3>
        {user && profile && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
            onClick={applyProfile}
            data-testid="business-use-profile"
            title={isAr ? "استخدم ملف الشركة المحفوظ" : "Use my saved company profile"}
          >
            <Building2 className="w-3.5 h-3.5" />
            {isAr ? "استخدم ملفي" : "Use my profile"}
          </Button>
        )}
        {user && profileLoaded && !profile && (
          <Link
            href="/settings/company"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            data-testid="business-create-profile"
          >
            <Sparkles className="w-3 h-3" />
            {isAr ? "احفظ ملف شركتك للتعبئة التلقائية" : "Save your company profile to auto-fill"}
          </Link>
        )}
      </div>

      {!user && (
        <div
          className="text-[11px] leading-relaxed px-2.5 py-2 rounded-md bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900 text-blue-900 dark:text-blue-200"
          data-testid="business-anon-prompt"
        >
          <Sparkles className="w-3 h-3 inline-block me-1 -mt-0.5" />
          {isAr ? (
            <>
              <Link href="/signup" className="font-semibold underline">أنشئ حساباً مجانياً</Link>
              {" "}لحفظ بيانات شركتك مرة واحدة وتعبئتها تلقائياً في كل فاتورة.
            </>
          ) : (
            <>
              <Link href="/signup" className="font-semibold underline">Create a free account</Link>
              {" "}to save your company info once and auto-fill it on every document.
            </>
          )}
        </div>
      )}

      {/* Logo */}
      <div className="space-y-1">
        <Label className="text-xs">{t("doc.logo")}</Label>
        {businessInfo.logoUrl ? (
          <div className="flex items-center gap-2">
            <img src={businessInfo.logoUrl} alt="Logo" className="h-10 w-auto object-contain rounded border border-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onLogoUpload(null)}
              data-testid="remove-logo"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                onLogoUpload(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2"
              data-testid="upload-logo"
            >
              <Upload className="w-4 h-4" />
              {t("doc.upload_logo")}
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("name", t("doc.business_name"), "business-name")}
        {field("phone", t("doc.business_phone"), "business-phone")}
        {field("email", t("doc.business_email"), "business-email")}
        {field("vatNumber", t("doc.vat_number"), "business-vat")}
      </div>
      <div>
        <Label htmlFor="business-address" className="text-xs">{t("doc.business_address")}</Label>
        <Input
          id="business-address"
          value={businessInfo.address}
          onChange={(e) => onChange({ ...businessInfo, address: e.target.value })}
          data-testid="business-address"
          className="h-8 text-sm mt-1"
        />
      </div>
    </div>
  );
}
