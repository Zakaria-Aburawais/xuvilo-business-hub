import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Download, Upload, Plus, X, Building2, Target, Eye, Heart,
  Briefcase, Users, Phone, Mail, Globe, MapPin, FileText, Sparkles, Image as ImageIcon
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

/* ──────────────────────────────── Types ──────────────────────────────── */

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
  bio: string;
}

interface Value {
  id: string;
  title: string;
  description: string;
}

interface ProfileData {
  // Cover / front
  companyName: string;
  tagline: string;
  year: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  industry: string;
  // About
  about: string;
  mission: string;
  vision: string;
  values: Value[];
  // Services
  services: Service[];
  // Team
  team: TeamMember[];
  // Contact
  phone: string;
  email: string;
  website: string;
  address: string;
  // Theme
  primary: string;
  secondary: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT: ProfileData = {
  companyName: "Bright Studio",
  tagline: "Creative branding & strategy for modern businesses",
  year: "2026",
  logoUrl: null,
  coverImageUrl: null,
  industry: "Marketing & Design",
  about: "Bright Studio is a full-service branding and marketing agency dedicated to helping businesses build memorable identities. With a passionate team of designers, strategists, and storytellers, we craft experiences that connect brands with the people who matter most.",
  mission: "To empower every business — from startup to enterprise — with the tools, strategy, and creative work needed to grow with confidence.",
  vision: "A world where every brand has the chance to tell its story beautifully and reach the audience it deserves.",
  values: [
    { id: uid(), title: "Excellence", description: "We hold ourselves to the highest standard in every project." },
    { id: uid(), title: "Integrity",  description: "Honest communication, transparent pricing, and ethical practice." },
    { id: uid(), title: "Innovation", description: "We embrace new ideas and modern tools to push our craft forward." },
  ],
  services: [
    { id: uid(), title: "Brand Identity",     description: "Logos, typography, and visual systems that capture your unique voice.", icon: "✦" },
    { id: uid(), title: "Web Design",         description: "Modern, responsive websites built to convert visitors into customers.",   icon: "◐" },
    { id: uid(), title: "Marketing Strategy", description: "Data-driven campaigns and content planning that delivers results.",      icon: "◆" },
    { id: uid(), title: "Print & Packaging",  description: "Beautifully designed print collateral and product packaging.",            icon: "▣" },
  ],
  team: [
    { id: uid(), name: "Sarah Johnson", role: "Founder & Creative Director", photoUrl: null, bio: "15 years of branding leadership across global agencies." },
    { id: uid(), name: "Ahmed Khalil",  role: "Head of Strategy",            photoUrl: null, bio: "Former strategy lead at top consulting firms." },
    { id: uid(), name: "Lina Saad",     role: "Senior Designer",             photoUrl: null, bio: "Award-winning designer with a passion for typography." },
  ],
  phone: "+966 11 234 5678",
  email: "hello@brightstudio.com",
  website: "www.brightstudio.com",
  address: "Riyadh, Saudi Arabia",
  primary: "#2563EB",
  secondary: "#7C3AED",
};

const COLOR_THEMES = [
  { name: "Royal Blue",  primary: "#2563EB", secondary: "#7C3AED" },
  { name: "Emerald",     primary: "#059669", secondary: "#0891B2" },
  { name: "Sunset",      primary: "#EA580C", secondary: "#DC2626" },
  { name: "Midnight",    primary: "#1E40AF", secondary: "#0F172A" },
  { name: "Rose",        primary: "#E11D48", secondary: "#BE185D" },
  { name: "Forest",      primary: "#15803D", secondary: "#166534" },
  { name: "Charcoal",    primary: "#374151", secondary: "#F59E0B" },
  { name: "Ocean",       primary: "#0E7490", secondary: "#0369A1" },
];

/* ──────────────────────────────── Component ──────────────────────────────── */

export default function CompanyProfilePage() {
  const { lang, isRTL } = useLanguage();
  const isAR = lang === "ar";
  const [data, setData] = useState<ProfileData>(DEFAULT);
  const [activeSection, setActiveSection] = useState<string>("cover");
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const update = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
    setData(prev => ({ ...prev, [key]: value }));

  const handleImage = (key: "logoUrl" | "coverImageUrl") => (file: File) => {
    const reader = new FileReader();
    reader.onload = e => update(key, e.target?.result as string);
    reader.readAsDataURL(file);
  };

  /* Section update helpers */
  const addService = () => update("services", [...data.services, { id: uid(), title: "New Service", description: "", icon: "✦" }]);
  const updateService = (id: string, patch: Partial<Service>) =>
    update("services", data.services.map(s => s.id === id ? { ...s, ...patch } : s));
  const removeService = (id: string) => update("services", data.services.filter(s => s.id !== id));

  const addValue = () => update("values", [...data.values, { id: uid(), title: "", description: "" }]);
  const updateValue = (id: string, patch: Partial<Value>) =>
    update("values", data.values.map(v => v.id === id ? { ...v, ...patch } : v));
  const removeValue = (id: string) => update("values", data.values.filter(v => v.id !== id));

  const addTeam = () => update("team", [...data.team, { id: uid(), name: "Name", role: "Role", photoUrl: null, bio: "" }]);
  const updateTeam = (id: string, patch: Partial<TeamMember>) =>
    update("team", data.team.map(m => m.id === id ? { ...m, ...patch } : m));
  const removeTeam = (id: string) => update("team", data.team.filter(m => m.id !== id));
  const teamPhoto = (id: string) => (file: File) => {
    const reader = new FileReader();
    reader.onload = e => updateTeam(id, { photoUrl: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  /* PDF generation: render each page in a fixed 794px offscreen container,
     capture at scale=2 for consistent print quality regardless of viewport. */
  const downloadPDF = useCallback(async () => {
    if (!exportRef.current) return;
    setGenerating(true);
    try {
      const pages = exportRef.current.querySelectorAll<HTMLElement>(".pdf-page");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210, pageH = 297;
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 794,
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      }
      const safeName = (data.companyName || "company")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase() || "company";
      pdf.save(`${safeName}-profile.pdf`);
      trackEvent("company_profile_export", { language: lang });
    } catch (err) {
      console.error("PDF export failed:", err);
      toast({
        title: isAR ? "تعذّر إنشاء ملف PDF" : "Couldn't create PDF",
        description: isAR ? "حدث خطأ أثناء إنشاء الملف. حاول مرة أخرى." : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }, [data.companyName, toast, isAR, lang]);

  const SECTIONS = [
    { id: "cover",    label: isAR ? "الغلاف" : "Cover",      icon: ImageIcon },
    { id: "about",    label: isAR ? "نبذة عنا" : "About",     icon: Building2 },
    { id: "values",   label: isAR ? "قيمنا" : "Values",       icon: Heart },
    { id: "services", label: isAR ? "خدماتنا" : "Services",   icon: Briefcase },
    { id: "team",     label: isAR ? "فريقنا" : "Team",        icon: Users },
    { id: "contact",  label: isAR ? "تواصل" : "Contact",      icon: Phone },
    { id: "theme",    label: isAR ? "الألوان" : "Theme",      icon: Sparkles },
  ];

  return (
    <AppLayout>
      <div dir={isRTL ? "rtl" : "ltr"} className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {isAR ? "صانع ملف الشركة" : "Company Profile Maker"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAR ? "ملف تعريفي احترافي متعدد الصفحات بصفحة غلاف وأقسام كاملة" : "Multi-page professional profile with front cover and full sections"}
              </p>
            </div>
          </div>
          <button
            onClick={downloadPDF}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-md disabled:opacity-60"
            data-testid="cp-download-pdf"
          >
            <Download className="w-4 h-4" />
            {generating
              ? (isAR ? "جاري الإنشاء…" : "Generating…")
              : (isAR ? "تحميل ملف PDF" : "Download PDF")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* ── Editor sidebar ── */}
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-2 sticky top-4">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === s.id
                        ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    data-testid={`cp-tab-${s.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              {activeSection === "cover" && (
                <div className="space-y-3">
                  <SectionTitle>{isAR ? "صفحة الغلاف" : "Cover Page"}</SectionTitle>
                  <Field label={isAR ? "اسم الشركة" : "Company Name"} value={data.companyName} onChange={v => update("companyName", v)} />
                  <Field label={isAR ? "الشعار النصي" : "Tagline"}     value={data.tagline}     onChange={v => update("tagline", v)} />
                  <Field label={isAR ? "المجال" : "Industry"}          value={data.industry}    onChange={v => update("industry", v)} />
                  <Field label={isAR ? "السنة" : "Year"}                value={data.year}        onChange={v => update("year", v)} />
                  <ImageField label={isAR ? "الشعار" : "Logo"} value={data.logoUrl} onChange={handleImage("logoUrl")} onClear={() => update("logoUrl", null)} />
                  <ImageField label={isAR ? "صورة الغلاف" : "Cover Image"} value={data.coverImageUrl} onChange={handleImage("coverImageUrl")} onClear={() => update("coverImageUrl", null)} />
                </div>
              )}

              {activeSection === "about" && (
                <div className="space-y-3">
                  <SectionTitle>{isAR ? "نبذة عن الشركة" : "About Us"}</SectionTitle>
                  <TextArea label={isAR ? "نبذة عامة" : "Description"} value={data.about}   onChange={v => update("about", v)} rows={6} />
                  <TextArea label={isAR ? "مهمتنا" : "Mission"}         value={data.mission} onChange={v => update("mission", v)} rows={3} />
                  <TextArea label={isAR ? "رؤيتنا" : "Vision"}          value={data.vision}  onChange={v => update("vision", v)} rows={3} />
                </div>
              )}

              {activeSection === "values" && (
                <div className="space-y-3">
                  <SectionTitle>{isAR ? "القيم" : "Core Values"}</SectionTitle>
                  {data.values.map((v, i) => (
                    <div key={v.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 relative">
                      <button onClick={() => removeValue(v.id)} aria-label={isAR ? "حذف القيمة" : "Remove value"} className="absolute top-2 end-2 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500"><X className="w-3.5 h-3.5" /></button>
                      <div className="text-[10px] uppercase font-semibold text-gray-500">#{i + 1}</div>
                      <Field label={isAR ? "العنوان" : "Title"}        value={v.title}       onChange={val => updateValue(v.id, { title: val })} />
                      <TextArea label={isAR ? "الوصف" : "Description"} value={v.description} onChange={val => updateValue(v.id, { description: val })} rows={2} />
                    </div>
                  ))}
                  <button onClick={addValue} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"><Plus className="w-4 h-4" />{isAR ? "إضافة قيمة" : "Add Value"}</button>
                </div>
              )}

              {activeSection === "services" && (
                <div className="space-y-3">
                  <SectionTitle>{isAR ? "الخدمات" : "Services"}</SectionTitle>
                  {data.services.map((s, i) => (
                    <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 relative">
                      <button onClick={() => removeService(s.id)} aria-label={isAR ? "حذف الخدمة" : "Remove service"} className="absolute top-2 end-2 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500"><X className="w-3.5 h-3.5" /></button>
                      <div className="text-[10px] uppercase font-semibold text-gray-500">#{i + 1}</div>
                      <div className="grid grid-cols-[60px_1fr] gap-2">
                        <Field label={isAR ? "أيقونة" : "Icon"} value={s.icon} onChange={val => updateService(s.id, { icon: val })} />
                        <Field label={isAR ? "العنوان" : "Title"} value={s.title} onChange={val => updateService(s.id, { title: val })} />
                      </div>
                      <TextArea label={isAR ? "الوصف" : "Description"} value={s.description} onChange={val => updateService(s.id, { description: val })} rows={2} />
                    </div>
                  ))}
                  <button onClick={addService} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"><Plus className="w-4 h-4" />{isAR ? "إضافة خدمة" : "Add Service"}</button>
                </div>
              )}

              {activeSection === "team" && (
                <div className="space-y-3">
                  <SectionTitle>{isAR ? "الفريق" : "Team"}</SectionTitle>
                  {data.team.map((m, i) => (
                    <div key={m.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 relative">
                      <button onClick={() => removeTeam(m.id)} aria-label={isAR ? "حذف العضو" : "Remove member"} className="absolute top-2 end-2 p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500"><X className="w-3.5 h-3.5" /></button>
                      <div className="text-[10px] uppercase font-semibold text-gray-500">#{i + 1}</div>
                      <Field label={isAR ? "الاسم" : "Name"} value={m.name} onChange={val => updateTeam(m.id, { name: val })} />
                      <Field label={isAR ? "المنصب" : "Role"} value={m.role} onChange={val => updateTeam(m.id, { role: val })} />
                      <TextArea label={isAR ? "نبذة" : "Bio"} value={m.bio} onChange={val => updateTeam(m.id, { bio: val })} rows={2} />
                      <ImageField label={isAR ? "الصورة" : "Photo"} value={m.photoUrl} onChange={teamPhoto(m.id)} onClear={() => updateTeam(m.id, { photoUrl: null })} small />
                    </div>
                  ))}
                  <button onClick={addTeam} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"><Plus className="w-4 h-4" />{isAR ? "إضافة عضو" : "Add Member"}</button>
                </div>
              )}

              {activeSection === "contact" && (
                <div className="space-y-3">
                  <SectionTitle>{isAR ? "بيانات التواصل" : "Contact Information"}</SectionTitle>
                  <Field label={isAR ? "الهاتف" : "Phone"}   value={data.phone}   onChange={v => update("phone", v)} />
                  <Field label={isAR ? "البريد" : "Email"}   value={data.email}   onChange={v => update("email", v)} />
                  <Field label={isAR ? "الموقع" : "Website"} value={data.website} onChange={v => update("website", v)} />
                  <Field label={isAR ? "العنوان" : "Address"} value={data.address} onChange={v => update("address", v)} />
                </div>
              )}

              {activeSection === "theme" && (
                <div className="space-y-3">
                  <SectionTitle>{isAR ? "اللون والتصميم" : "Theme Colors"}</SectionTitle>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_THEMES.map(t => (
                      <button
                        key={t.name}
                        onClick={() => setData(prev => ({ ...prev, primary: t.primary, secondary: t.secondary }))}
                        title={t.name}
                        className="aspect-square rounded-lg border-2 hover:scale-105 transition-transform overflow-hidden"
                        style={{
                          borderColor: data.primary === t.primary ? t.primary : "transparent",
                          background: `linear-gradient(135deg, ${t.primary} 50%, ${t.secondary} 50%)`,
                        }}
                        aria-label={t.name}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <ColorInput label={isAR ? "اللون الأساسي" : "Primary"}   value={data.primary}   onChange={v => update("primary", v)} />
                    <ColorInput label={isAR ? "اللون الثانوي" : "Secondary"} value={data.secondary} onChange={v => update("secondary", v)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Live Preview (visible, responsive width) ── */}
          <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl p-4 sm:p-6 overflow-x-auto">
            <div ref={previewRef} className="space-y-6 mx-auto" style={{ width: "min(100%, 794px)" }}>
              <CoverPage data={data} isAR={isAR} />
              <AboutPage data={data} isAR={isAR} />
              <ServicesPage data={data} isAR={isAR} />
              <TeamPage data={data} isAR={isAR} />
              <ContactPage data={data} isAR={isAR} />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden offscreen export container at fixed 794px (A4 width @ 96dpi)
          ensures consistent PDF quality regardless of viewport size. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: -10000,
          width: 794,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <div ref={exportRef} style={{ width: 794 }}>
          <CoverPage data={data} isAR={isAR} />
          <AboutPage data={data} isAR={isAR} />
          <ServicesPage data={data} isAR={isAR} />
          <TeamPage data={data} isAR={isAR} />
          <ContactPage data={data} isAR={isAR} />
        </div>
      </div>
    </AppLayout>
  );
}

/* ─── Reusable inputs ─── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{children}</div>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500" />
    </div>
  );
}
function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows ?? 3} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 resize-none" />
    </div>
  );
}
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full text-[11px] bg-transparent focus:outline-none px-1" />
      </div>
    </div>
  );
}
function ImageField({ label, value, onChange, onClear, small }: { label: string; value: string | null; onChange: (f: File) => void; onClear: () => void; small?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {value ? (
        <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
          <img src={value} alt="" className={`${small ? "w-10 h-10" : "w-12 h-12"} object-cover rounded bg-white`} />
          <span className="text-xs text-gray-500 flex-1 truncate">Uploaded</span>
          <button onClick={onClear} aria-label="Remove image" className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-red-500"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-violet-400 text-xs text-gray-600 dark:text-gray-300">
          <Upload className="w-3.5 h-3.5" /> Upload
          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onChange(e.target.files[0])} />
        </label>
      )}
    </div>
  );
}

/* ─── PDF Pages (each is .pdf-page; A4 ratio 210×297 mm → 794×1123 px @ 96dpi) ─── */

const PAGE_STYLE: React.CSSProperties = {
  width: "100%",
  aspectRatio: "210 / 297",
  backgroundColor: "#ffffff",
  color: "#0F172A",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  borderRadius: 8,
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
};

function CoverPage({ data, isAR }: { data: ProfileData; isAR: boolean }) {
  return (
    <div className="pdf-page" style={PAGE_STYLE}>
      {/* Top color block */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${data.primary}, ${data.secondary})` }} />
      {/* Decorative shapes */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", bottom: -120, left: -120, width: 400, height: 400, borderRadius: "50%", background: "rgba(0,0,0,0.12)" }} />

      {/* Cover image (optional, top half) */}
      {data.coverImageUrl && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", overflow: "hidden" }}>
          <img src={data.coverImageUrl} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 0%, ${data.primary}cc 100%)` }} />
        </div>
      )}

      {/* Content */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8% 8%", color: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {data.logoUrl ? (
            <img src={data.logoUrl} alt="" crossOrigin="anonymous" style={{ width: 70, height: 70, objectFit: "contain", background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: 6 }} />
          ) : <div />}
          <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85, fontWeight: 600 }}>
            {isAR ? "ملف الشركة" : "Company Profile"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", opacity: 0.85, marginBottom: 12, fontWeight: 600 }}>
            {data.industry}
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05, marginBottom: 18, textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            {data.companyName}
          </div>
          <div style={{ fontSize: 18, opacity: 0.92, fontWeight: 400, maxWidth: "85%", lineHeight: 1.4 }}>
            {data.tagline}
          </div>
          <div style={{ marginTop: 36, height: 3, width: 80, background: "rgba(255,255,255,0.85)" }} />
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.85, fontWeight: 500 }}>
            {data.year} · {data.website}
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage({ data, isAR }: { data: ProfileData; isAR: boolean }) {
  return (
    <div className="pdf-page" style={PAGE_STYLE}>
      <div style={{ padding: "8% 8%", height: "100%", display: "flex", flexDirection: "column" }}>
        <PageHeader number="01" title={isAR ? "نبذة عنا" : "About Us"} primary={data.primary} />
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#334155", marginTop: 28, marginBottom: 36 }}>
          {data.about}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: "auto" }}>
          <PillarCard icon={<Target size={20} />} title={isAR ? "مهمتنا" : "Our Mission"} body={data.mission} color={data.primary} />
          <PillarCard icon={<Eye size={20} />}    title={isAR ? "رؤيتنا" : "Our Vision"}  body={data.vision}  color={data.secondary} />
        </div>
        <PageFooter data={data} pageNo="2" />
      </div>
    </div>
  );
}

function ServicesPage({ data, isAR }: { data: ProfileData; isAR: boolean }) {
  return (
    <div className="pdf-page" style={PAGE_STYLE}>
      <div style={{ padding: "8% 8%", height: "100%", display: "flex", flexDirection: "column" }}>
        <PageHeader number="02" title={isAR ? "قيمنا وخدماتنا" : "Values & Services"} primary={data.primary} />

        {data.values.length > 0 && (
          <>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 14, fontWeight: 700 }}>
              {isAR ? "قيمنا الجوهرية" : "Core Values"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(data.values.length, 3)}, 1fr)`, gap: 16, marginBottom: 28 }}>
              {data.values.map(v => (
                <div key={v.id} style={{ borderLeft: `3px solid ${data.primary}`, paddingLeft: 12, paddingTop: 4, paddingBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{v.description}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#64748B", marginBottom: 14, fontWeight: 700 }}>
          {isAR ? "خدماتنا" : "What We Do"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
          {data.services.map(s => (
            <div key={s.id} style={{ background: "#F8FAFC", borderRadius: 10, padding: 18, border: "1px solid #E2E8F0" }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: `linear-gradient(135deg, ${data.primary}, ${data.secondary})`, color: "#fff", display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{s.description}</div>
            </div>
          ))}
        </div>
        <PageFooter data={data} pageNo="3" />
      </div>
    </div>
  );
}

function TeamPage({ data, isAR }: { data: ProfileData; isAR: boolean }) {
  const cols = data.team.length <= 2 ? 2 : 3;
  return (
    <div className="pdf-page" style={PAGE_STYLE}>
      <div style={{ padding: "8% 8%", height: "100%", display: "flex", flexDirection: "column" }}>
        <PageHeader number="03" title={isAR ? "فريقنا" : "Meet The Team"} primary={data.primary} />
        <p style={{ fontSize: 13, color: "#475569", marginTop: 16, marginBottom: 28 }}>
          {isAR ? "تعرّف على الأشخاص الذين يصنعون الفرق كل يوم." : "The people who make it all happen, every single day."}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 18, flex: 1 }}>
          {data.team.map(m => (
            <div key={m.id} style={{ background: "#F8FAFC", borderRadius: 12, padding: 18, textAlign: "center", border: "1px solid #E2E8F0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 12px", background: `linear-gradient(135deg, ${data.primary}, ${data.secondary})`, display: "grid", placeItems: "center", color: "#fff", fontSize: 24, fontWeight: 700, overflow: "hidden" }}>
                {m.photoUrl
                  ? <img src={m.photoUrl} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (m.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: data.primary, fontWeight: 600, marginBottom: 8 }}>{m.role}</div>
              {m.bio && <div style={{ fontSize: 10.5, color: "#64748B", lineHeight: 1.5 }}>{m.bio}</div>}
            </div>
          ))}
        </div>
        <PageFooter data={data} pageNo="4" />
      </div>
    </div>
  );
}

function ContactPage({ data, isAR }: { data: ProfileData; isAR: boolean }) {
  return (
    <div className="pdf-page" style={PAGE_STYLE}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${data.primary} 0%, ${data.secondary} 100%)` }} />
      <div style={{ position: "absolute", top: -100, left: -100, width: 360, height: 360, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />

      <div style={{ position: "absolute", inset: 0, padding: "8% 8%", color: "#FFFFFF", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85, fontWeight: 600, marginBottom: 12 }}>04 — {isAR ? "تواصل معنا" : "Get In Touch"}</div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05, marginBottom: 18 }}>
            {isAR ? "لنبدأ مشروعك القادم معاً." : "Let's start your next project together."}
          </div>
          <div style={{ fontSize: 16, opacity: 0.92, maxWidth: "85%", lineHeight: 1.5 }}>
            {isAR
              ? "نحن متحمسون للتعاون مع الشركات التي تشاركنا الشغف بالعمل الجيد. تواصل معنا وسنرد خلال 24 ساعة."
              : "We're excited to collaborate with businesses that share our passion for great work. Reach out — we'll get back within 24 hours."}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <ContactRow icon={<Phone size={16} />}  label={isAR ? "هاتف" : "Phone"}     value={data.phone} />
          <ContactRow icon={<Mail size={16} />}   label={isAR ? "بريد" : "Email"}     value={data.email} />
          <ContactRow icon={<Globe size={16} />}  label={isAR ? "الموقع" : "Website"} value={data.website} />
          <ContactRow icon={<MapPin size={16} />} label={isAR ? "العنوان" : "Address"} value={data.address} />
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 14, fontSize: 11, opacity: 0.7, display: "flex", justifyContent: "space-between" }}>
          <span>© {data.year} {data.companyName}. {isAR ? "جميع الحقوق محفوظة." : "All rights reserved."}</span>
          <span>{isAR ? "صنع بفخر" : "Crafted with care"}</span>
        </div>
      </div>
    </div>
  );
}

function PageHeader({ number, title, primary }: { number: string; title: string; primary: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontSize: 44, fontWeight: 800, color: primary, letterSpacing: -1 }}>{number}</span>
        <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", marginTop: 6, letterSpacing: -0.5 }}>{title}</div>
    </div>
  );
}

function PillarCard({ icon, title, body, color }: { icon: React.ReactNode; title: string; body: string; color: string }) {
  return (
    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 22 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color, color: "#fff", display: "grid", placeItems: "center", marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.12)", padding: 14, borderRadius: 10, backdropFilter: "blur(4px)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, opacity: 0.75, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}

function PageFooter({ data, pageNo }: { data: ProfileData; pageNo: string }) {
  return (
    <div style={{ position: "absolute", bottom: 24, left: "8%", right: "8%", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8" }}>
      <span>{data.companyName} · {data.year}</span>
      <span>{pageNo}</span>
    </div>
  );
}
