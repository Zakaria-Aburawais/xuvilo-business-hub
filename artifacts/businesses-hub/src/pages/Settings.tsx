import { useEffect, useRef, useState } from "react";

import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, User, Lock, ShieldAlert, Trash2, Download, Upload, Database, CreditCard, Loader2, Building2, ChevronRight, Sparkles, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getSettings, updateSettings, testAnthropicKey } from "@/lib/rfqApi";
import { Link } from "wouter";
import { openBillingPortal } from "@/lib/billingApi";
import { Switch } from "@/components/ui/switch";
import { encryptBackup, decryptBackup, isEncryptedBackup, scorePasswordStrength, generateBackupPassword } from "@/lib/backupCrypto";

export default function SettingsPage() {
  const { user, updateProfile, deleteAccount, exportUserData, importUserData, refreshBilling } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAR = lang === "ar";
  const [portalBusy, setPortalBusy] = useState(false);

  const handleManageBilling = async () => {
    if (!user) return;
    setPortalBusy(true);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not open billing portal";
      toast({
        title: isAR ? "تعذّر فتح بوابة الفوترة" : "Could not open billing portal",
        description: msg,
        variant: "destructive",
      });
      setPortalBusy(false);
    }
  };

  useEffect(() => {
    if (!user) navigate("/login?next=/settings");
  }, [user, navigate]);

  useEffect(() => {
    if (user) void refreshBilling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("portal") === "return" && user) {
      void refreshBilling();
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameConfirmOpen, setNameConfirmOpen] = useState(false);
  const [nameConfirmPw, setNameConfirmPw] = useState("");
  const [nameConfirmError, setNameConfirmError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  // Peek toggles for the backup-encryption password fields (export + import).
  const [showBackupPw, setShowBackupPw] = useState(false);
  const [showImportPw, setShowImportPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [deletePw, setDeletePw] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [backupBeforeDelete, setBackupBeforeDelete] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<{ json: string; sourceEmail: string; itemCount: number; exportedAt: string; encrypted: boolean; summary?: { docs: number; clients: number; products: number; workspaces: number; team: number; apikeys: number; tracker: boolean; other: number } } | null>(null);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importPw, setImportPw] = useState("");
  const [backupBeforeImport, setBackupBeforeImport] = useState(true);

  const [encryptExport, setEncryptExport] = useState(false);
  const [exportPw, setExportPw] = useState("");
  const [exportPwConfirm, setExportPwConfirm] = useState("");
  const [exportPwError, setExportPwError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => { if (user) setName(user.name); }, [user]);

  if (!user) return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    if (!name.trim()) {
      setNameError(isAR ? "الاسم لا يمكن أن يكون فارغاً." : "Display name cannot be empty.");
      return;
    }
    if (name.trim() === user.name) {
      toast({ title: isAR ? "لا تغييرات" : "No changes", description: isAR ? "الاسم كما هو." : "Name is unchanged." });
      return;
    }
    setNameConfirmPw("");
    setNameConfirmError("");
    setNameConfirmOpen(true);
  };

  const handleConfirmSaveName = async () => {
    setNameConfirmError("");
    if (!nameConfirmPw) {
      setNameConfirmError(isAR ? "أدخل كلمة المرور للتأكيد." : "Enter your password to confirm.");
      return;
    }
    setSavingName(true);
    const res = await updateProfile({ name, currentPassword: nameConfirmPw });
    setSavingName(false);
    if (!res.ok) {
      setNameConfirmError(res.error || (isAR ? "تعذّر التحديث." : "Failed to update."));
      return;
    }
    setNameConfirmOpen(false);
    setNameConfirmPw("");
    toast({ title: isAR ? "تم الحفظ" : "Saved", description: isAR ? "تم تحديث اسمك." : "Your name has been updated." });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (!currentPw) { setPwError(isAR ? "أدخل كلمة المرور الحالية." : "Enter your current password."); return; }
    if (newPw.length < 6) { setPwError(isAR ? "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل." : "New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError(isAR ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."); return; }

    setSavingPw(true);
    const res = await updateProfile({ currentPassword: currentPw, newPassword: newPw });
    setSavingPw(false);
    if (!res.ok) { setPwError(res.error || (isAR ? "تعذّر تحديث كلمة المرور." : "Failed to update password.")); return; }
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    toast({ title: isAR ? "تم التحديث" : "Password updated", description: isAR ? "تم تغيير كلمة المرور بنجاح." : "Your password has been changed." });
  };

  const handleDelete = async () => {
    setDeleteError("");
    if (!deletePw) { setDeleteError(isAR ? "أدخل كلمة المرور للتأكيد." : "Enter your password to confirm."); return; }
    if (backupBeforeDelete) {
      const exported = await handleExport();
      if (!exported) {
        setDeleteError(isAR
          ? "تعذّر تنزيل النسخة الاحتياطية. ألغِ تحديد الخيار للحذف بدون نسخة احتياطية."
          : "Backup download failed. Uncheck the option to delete without a backup.");
        return;
      }
    }
    setDeleting(true);
    const res = await deleteAccount(deletePw);
    setDeleting(false);
    if (!res.ok) { setDeleteError(res.error || (isAR ? "تعذّر حذف الحساب." : "Failed to delete account.")); return; }
    setDeleteOpen(false);
    toast({ title: isAR ? "تم حذف الحساب" : "Account deleted", description: isAR ? "تم حذف حسابك وبياناتك." : "Your account and data have been removed." });
    navigate("/");
  };

  const handleExport = async (): Promise<boolean> => {
    setExportPwError("");
    if (encryptExport && exportPw.length < 6) {
      setExportPwError(isAR ? "يجب أن تكون كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters.");
      return false;
    }
    if (encryptExport && exportPw !== exportPwConfirm) {
      setExportPwError(isAR ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return false;
    }
    const res = exportUserData();
    if (!res.ok || !res.data || !res.filename) {
      toast({ title: isAR ? "تعذّر التصدير" : "Export failed", description: res.error, variant: "destructive" });
      return false;
    }
    const itemCount = Object.keys(res.data.keys).length;
    try {
      let fileContent = JSON.stringify(res.data, null, 2);
      let filename = res.filename;
      if (encryptExport) {
        setExporting(true);
        try {
          const encrypted = await encryptBackup(fileContent, exportPw);
          fileContent = JSON.stringify(encrypted, null, 2);
          filename = filename.replace(/\.json$/, ".encrypted.json");
        } finally {
          setExporting(false);
        }
      }
      const blob = new Blob([fileContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({
        title: isAR ? "تم تنزيل بياناتك" : "Backup downloaded",
        description: encryptExport
          ? (isAR
              ? `تم تصدير ${itemCount} عنصراً في ملف مشفّر. احتفظ بكلمة المرور — لا يمكن استعادتها.`
              : `Exported ${itemCount} item${itemCount === 1 ? "" : "s"} in an encrypted file. Keep your password safe — it cannot be recovered.`)
          : (isAR
              ? `تم تصدير ${itemCount} عنصراً.`
              : `Exported ${itemCount} item${itemCount === 1 ? "" : "s"}.`),
      });
      setExportPw("");
      setExportPwConfirm("");
    } catch {
      toast({ title: isAR ? "تعذّر التنزيل" : "Download failed", variant: "destructive" });
      return false;
    }
    return true;
  };

  const summarizeBackupKeys = (keys: Record<string, unknown>) => {
    const summary = { docs: 0, clients: 0, products: 0, workspaces: 0, team: 0, apikeys: 0, tracker: false, other: 0 };
    const arrLen = (raw: unknown): number => {
      try {
        const v = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(v) ? v.length : 0;
      } catch {
        return 0;
      }
    };
    for (const [key, raw] of Object.entries(keys)) {
      if (key.startsWith("bh_docs_")) summary.docs += arrLen(raw);
      else if (key.startsWith("bh_clients_")) summary.clients += arrLen(raw);
      else if (key.startsWith("bh_products_")) summary.products += arrLen(raw);
      else if (key.startsWith("bh_workspaces_")) summary.workspaces += arrLen(raw);
      else if (key.startsWith("bh_team_")) summary.team += arrLen(raw);
      else if (key.startsWith("bh_apikeys_")) summary.apikeys += arrLen(raw);
      else if (key.startsWith("bh_tracker_")) summary.tracker = true;
      else if (key.startsWith("bh_active_ws_")) { /* setting, not user-visible content */ }
      else summary.other += 1;
    }
    return summary;
  };

  const handlePickImport = () => {
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (isEncryptedBackup(parsed)) {
        setImportPw("");
        setPendingImport({
          json: text,
          sourceEmail: "",
          itemCount: 0,
          exportedAt: String(parsed.exportedAt || ""),
          encrypted: true,
        });
        return;
      }
      if (!parsed || parsed.schema !== "businesses-hub-export" || typeof parsed.keys !== "object") {
        setImportError(isAR ? "هذا الملف ليس نسخة احتياطية صالحة." : "This file is not a valid backup.");
        return;
      }
      setPendingImport({
        json: text,
        sourceEmail: String(parsed.email || ""),
        itemCount: Object.keys(parsed.keys).length,
        exportedAt: String(parsed.exportedAt || ""),
        encrypted: false,
        summary: summarizeBackupKeys(parsed.keys as Record<string, unknown>),
      });
    } catch {
      setImportError(isAR ? "تعذّر قراءة الملف." : "Could not read the file.");
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setImportError("");
    let json = pendingImport.json;
    if (pendingImport.encrypted && !importPw) {
      setImportError(isAR ? "أدخل كلمة مرور النسخة الاحتياطية." : "Enter the backup password.");
      return;
    }
    if (backupBeforeImport) {
      const exported = await handleExport();
      if (!exported) {
        setImportError(isAR
          ? "تعذّر تنزيل النسخة الاحتياطية. ألغِ تحديد الخيار للاستيراد بدون نسخة احتياطية."
          : "Backup download failed. Uncheck the option to import without a backup.");
        return;
      }
    }
    if (pendingImport.encrypted) {
      setImporting(true);
      try {
        json = await decryptBackup(JSON.parse(pendingImport.json), importPw);
      } catch {
        setImporting(false);
        setImportError(isAR ? "كلمة المرور غير صحيحة أو الملف تالف." : "Wrong password or the file is corrupted.");
        return;
      }
      setImporting(false);
    }
    setImporting(true);
    const res = importUserData(json);
    setImporting(false);
    if (!res.ok) {
      setImportError(res.error || (isAR ? "تعذّر الاستيراد." : "Import failed."));
      return;
    }
    setPendingImport(null);
    toast({
      title: isAR ? "تم استيراد البيانات" : "Data imported",
      description: isAR
        ? `تم استعادة ${res.restoredCount ?? 0} عنصراً. أعد تحميل الصفحة لرؤية التغييرات.`
        : `Restored ${res.restoredCount ?? 0} item${res.restoredCount === 1 ? "" : "s"}. Reload the page to see changes.`,
    });
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 px-4 py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="settings-title">
              {isAR ? "إعدادات الحساب" : "Account settings"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isAR ? "إدارة معلومات ملفك الشخصي وكلمة المرور." : "Manage your profile information and password."}
            </p>
          </div>

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4 text-blue-600" />
                {isAR ? "الملف الشخصي" : "Profile"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveName} className="space-y-4">
                <div>
                  <Label>{isAR ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input value={user.email} disabled className="mt-1.5" data-testid="settings-email" />
                  <p className="text-xs text-gray-500 mt-1">{isAR ? "لا يمكن تغيير البريد الإلكتروني." : "Email cannot be changed."}</p>
                </div>
                <div>
                  <Label htmlFor="display-name">{isAR ? "الاسم المعروض" : "Display name"}</Label>
                  <Input
                    id="display-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                    data-testid="settings-name-input"
                  />
                </div>
                {nameError && <p className="text-sm text-red-500" data-testid="settings-name-error">{nameError}</p>}
                <Button type="submit" disabled={savingName} data-testid="settings-save-name">
                  {savingName ? (isAR ? "جارٍ الحفظ..." : "Saving...") : (isAR ? "حفظ" : "Save changes")}
                </Button>
              </form>
              <AlertDialog
                open={nameConfirmOpen}
                onOpenChange={(o) => { setNameConfirmOpen(o); if (!o) { setNameConfirmPw(""); setNameConfirmError(""); } }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{isAR ? "تأكيد كلمة المرور" : "Confirm your password"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isAR
                        ? "لتغيير اسمك المعروض، أدخل كلمة المرور الحالية للتأكيد."
                        : "To change your display name, enter your current password to confirm."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="name-confirm-pw">{isAR ? "كلمة المرور" : "Password"}</Label>
                    <Input
                      id="name-confirm-pw"
                      type="password"
                      value={nameConfirmPw}
                      onChange={(e) => setNameConfirmPw(e.target.value)}
                      data-testid="settings-name-confirm-pw"
                      autoComplete="current-password"
                    />
                    {nameConfirmError && (
                      <p className="text-sm text-red-500" data-testid="settings-name-confirm-error">{nameConfirmError}</p>
                    )}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={savingName}>{isAR ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => { e.preventDefault(); handleConfirmSaveName(); }}
                      disabled={savingName}
                      data-testid="settings-name-confirm-save"
                    >
                      {savingName ? (isAR ? "جارٍ الحفظ..." : "Saving...") : (isAR ? "تأكيد وحفظ" : "Confirm & save")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="w-4 h-4 text-blue-600" />
                {isAR ? "تغيير كلمة المرور" : "Change password"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label htmlFor="current-pw">{isAR ? "كلمة المرور الحالية" : "Current password"}</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="current-pw"
                      type={showPw ? "text" : "password"}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      data-testid="settings-current-pw"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-pw">{isAR ? "كلمة المرور الجديدة" : "New password"}</Label>
                  <Input
                    id="new-pw"
                    type={showPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="mt-1.5"
                    data-testid="settings-new-pw"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-pw">{isAR ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}</Label>
                  <Input
                    id="confirm-pw"
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="mt-1.5"
                    data-testid="settings-confirm-pw"
                  />
                </div>
                {pwError && <p className="text-sm text-red-500" data-testid="settings-pw-error">{pwError}</p>}
                <Button type="submit" disabled={savingPw} data-testid="settings-save-pw">
                  {savingPw ? (isAR ? "جارٍ التحديث..." : "Updating...") : (isAR ? "تحديث كلمة المرور" : "Update password")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Company profile shortcut — saved once, auto-filled on every document. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-blue-600" />
                {isAR ? "ملف الشركة" : "Company profile"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {isAR
                  ? "احفظ بيانات شركتك مرة واحدة (الاسم، الشعار، الرقم الضريبي…) وستُعبَّأ تلقائياً في كل فاتورة وعرض سعر وإيصال جديد."
                  : "Save your business details once (name, logo, VAT number…) and we'll auto-fill them on every new invoice, quotation, and receipt."}
              </p>
              <Link href="/settings/company">
                <Button variant="outline" data-testid="settings-open-company">
                  <Building2 className="w-4 h-4 me-2" />
                  {isAR ? "إدارة ملف الشركة" : "Manage company profile"}
                  <ChevronRight className="w-4 h-4 ms-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Billing & Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4 text-blue-600" />
                {isAR ? "الاشتراك والفوترة" : "Subscription & billing"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {isAR ? "الخطة الحالية" : "Current plan"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="font-semibold capitalize">
                      {user.tier === "free" ? (isAR ? "مجاني" : "Free") : user.tier}
                    </span>
                    {user.tier !== "free" && user.billingInterval && (
                      <span className="text-xs ms-2">
                        ({user.billingInterval === "year"
                          ? (isAR ? "فوترة سنوية" : "billed yearly")
                          : (isAR ? "فوترة شهرية" : "billed monthly")})
                      </span>
                    )}
                  </p>
                  {user.cancelAtPeriodEnd && user.currentPeriodEnd && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {isAR
                        ? `سيتم إلغاء اشتراكك في ${new Date(user.currentPeriodEnd).toLocaleDateString("ar-EG")}`
                        : `Cancels on ${new Date(user.currentPeriodEnd).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                {user.tier !== "free" ? (
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={portalBusy}
                    data-testid="settings-manage-billing"
                  >
                    {portalBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 me-2" />
                        {isAR ? "إدارة الفوترة" : "Manage billing"}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => navigate("/pricing")} data-testid="settings-upgrade">
                    {isAR ? "رفع مستوى الخطة" : "Upgrade plan"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.tier !== "free"
                  ? (isAR
                      ? "افتح بوابة الفوترة الآمنة لتحديث طريقة الدفع، أو تحميل الفواتير، أو إلغاء الاشتراك."
                      : "Open the secure billing portal to update payment method, download invoices, or cancel.")
                  : (isAR
                      ? "أنت على الخطة المجانية. ارفع المستوى للوصول إلى لوحة التحكم وحفظ المستندات."
                      : "You're on the free plan. Upgrade to unlock the dashboard and saved documents.")}
              </p>
            </CardContent>
          </Card>

          {/* Your Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="w-4 h-4 text-blue-600" />
                {isAR ? "بياناتك" : "Your data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {isAR
                  ? "نزّل نسخة من جميع بياناتك المخزّنة في هذا المتصفح (المستندات والعملاء والمنتجات والمساحات). يمكنك استخدامها كنسخة احتياطية أو لاستعادتها لاحقاً."
                  : "Download a copy of everything stored in this browser (documents, clients, products, workspaces). Use it as a backup or to restore later."}
              </p>
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="encrypt-export" className="cursor-pointer">
                      {isAR ? "تشفير بكلمة مرور" : "Encrypt with a password"}
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isAR
                        ? "يحمي ملف النسخة الاحتياطية بحيث لا يمكن قراءته بدون كلمة المرور."
                        : "Protects the backup file so it can't be read without the password."}
                    </p>
                  </div>
                  <Switch
                    id="encrypt-export"
                    checked={encryptExport}
                    onCheckedChange={(v) => { setEncryptExport(v); setExportPwError(""); if (!v) { setExportPw(""); setExportPwConfirm(""); } }}
                    data-testid="settings-encrypt-toggle"
                  />
                </div>
                {encryptExport && (
                  <div>
                    <div className="relative">
                      <Input
                        type={showBackupPw ? "text" : "password"}
                        value={exportPw}
                        onChange={(e) => { setExportPw(e.target.value); setExportPwError(""); }}
                        placeholder={isAR ? "كلمة مرور النسخة الاحتياطية (6 أحرف على الأقل)" : "Backup password (at least 6 characters)"}
                        className="pe-9"
                        data-testid="settings-export-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowBackupPw(!showBackupPw)}
                        className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={isAR ? "إظهار/إخفاء كلمة المرور" : "Show/hide password"}
                        data-testid="settings-export-password-toggle"
                      >
                        {showBackupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = generateBackupPassword();
                        setExportPw(suggested);
                        setExportPwConfirm(suggested);
                        setExportPwError("");
                        // Reveal it — the user must be able to copy it into
                        // their password manager before downloading.
                        setShowBackupPw(true);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
                      data-testid="settings-export-password-suggest"
                    >
                      {isAR ? "اقتراح كلمة مرور قوية" : "Suggest a strong password"}
                    </button>
                    {exportPw.length > 0 && (() => {
                      const strength = scorePasswordStrength(exportPw);
                      const meta = {
                        weak: { label: isAR ? "ضعيفة" : "Weak", bar: "bg-red-500", text: "text-red-600 dark:text-red-400", width: "w-1/3" },
                        okay: { label: isAR ? "مقبولة" : "Okay", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-500", width: "w-2/3" },
                        strong: { label: isAR ? "قوية" : "Strong", bar: "bg-green-500", text: "text-green-600 dark:text-green-500", width: "w-full" },
                      }[strength];
                      return (
                        <div className="mt-2 flex items-center gap-2" data-testid="settings-export-password-strength">
                          <div className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${meta.bar} ${meta.width}`} />
                          </div>
                          <span className={`text-xs font-medium ${meta.text}`} data-testid="settings-export-password-strength-label">
                            {isAR ? `قوة كلمة المرور: ${meta.label}` : `Strength: ${meta.label}`}
                          </span>
                        </div>
                      );
                    })()}
                    <Input
                      type={showBackupPw ? "text" : "password"}
                      value={exportPwConfirm}
                      onChange={(e) => { setExportPwConfirm(e.target.value); setExportPwError(""); }}
                      placeholder={isAR ? "تأكيد كلمة المرور" : "Confirm password"}
                      className="mt-2"
                      data-testid="settings-export-password-confirm"
                    />
                    {exportPwConfirm.length > 0 && exportPw !== exportPwConfirm && (
                      <p className="text-xs text-red-500 mt-1.5" data-testid="settings-export-password-mismatch">
                        {isAR ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."}
                      </p>
                    )}
                    {exportPwError && <p className="text-sm text-red-500 mt-1.5" data-testid="settings-export-password-error">{exportPwError}</p>}
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5">
                      {isAR
                        ? "احتفظ بكلمة المرور في مكان آمن — لا يمكن استعادة النسخة الاحتياطية بدونها."
                        : "Keep this password safe — the backup cannot be restored without it."}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExport} variant="outline" disabled={exporting} data-testid="settings-export-btn">
                  <Download className="w-4 h-4 me-2" />
                  {exporting
                    ? (isAR ? "جارٍ التشفير..." : "Encrypting...")
                    : (isAR ? "تنزيل بياناتي" : "Download my data")}
                </Button>
                <Button onClick={handlePickImport} variant="outline" data-testid="settings-import-btn">
                  <Upload className="w-4 h-4 me-2" />
                  {isAR ? "استيراد بيانات" : "Import data"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleFileChosen}
                  data-testid="settings-import-file"
                />
              </div>
              {importError && (
                <p className="text-sm text-red-500 mt-3" data-testid="settings-import-error">{importError}</p>
              )}
            </CardContent>
          </Card>

          <AlertDialog
            open={!!pendingImport}
            onOpenChange={(o) => { if (!o) { setPendingImport(null); setImportError(""); setImportPw(""); setBackupBeforeImport(true); } }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {pendingImport?.encrypted
                    ? (isAR ? "نسخة احتياطية مشفّرة" : "Encrypted backup")
                    : (isAR ? "تأكيد الاستيراد" : "Confirm import")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingImport && (
                    pendingImport.encrypted
                      ? (isAR
                          ? "هذه النسخة الاحتياطية محمية بكلمة مرور. أدخل كلمة المرور لفك التشفير والاستيراد. ستحلّ البيانات المستوردة محل أي بيانات حالية بنفس الأسماء."
                          : "This backup is password-protected. Enter the password to decrypt and import it. Imported data will overwrite any existing data with the same names.")
                      : (isAR
                          ? `سيتم استعادة ${pendingImport.itemCount} عنصراً من النسخة الاحتياطية الخاصة بـ ${pendingImport.sourceEmail}. ستحلّ البيانات المستوردة محل أي بيانات حالية بنفس الأسماء. هل تريد المتابعة؟`
                          : `This will restore ${pendingImport.itemCount} item${pendingImport.itemCount === 1 ? "" : "s"} from the backup for ${pendingImport.sourceEmail}. Imported data will overwrite any existing data with the same names. Continue?`)
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {pendingImport && pendingImport.exportedAt && (() => {
                const d = new Date(pendingImport.exportedAt);
                if (isNaN(d.getTime())) return null;
                const formatted = d.toLocaleString(isAR ? "ar-EG" : undefined, { dateStyle: "medium", timeStyle: "short" });
                return (
                  <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="settings-import-exported-at">
                    {isAR ? `تم إنشاء النسخة الاحتياطية في ${formatted}` : `Backup created on ${formatted}`}
                  </p>
                );
              })()}
              {pendingImport?.encrypted && (
                <div className="relative">
                  <Input
                    type={showImportPw ? "text" : "password"}
                    value={importPw}
                    onChange={(e) => { setImportPw(e.target.value); setImportError(""); }}
                    placeholder={isAR ? "كلمة مرور النسخة الاحتياطية" : "Backup password"}
                    autoFocus
                    className="pe-9"
                    data-testid="settings-import-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowImportPw(!showImportPw)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={isAR ? "إظهار/إخفاء كلمة المرور" : "Show/hide password"}
                    data-testid="settings-import-password-toggle"
                  >
                    {showImportPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
              {pendingImport && !pendingImport.encrypted && pendingImport.sourceEmail &&
                pendingImport.sourceEmail.toLowerCase().trim() !== user.email.toLowerCase().trim() && (
                <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex gap-3" data-testid="settings-import-email-warning">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">
                      {isAR ? "هذه النسخة الاحتياطية من حساب مختلف" : "This backup is from a different account"}
                    </p>
                    <p>
                      {isAR
                        ? `تم إنشاء النسخة الاحتياطية للحساب ${pendingImport.sourceEmail}، بينما أنت مسجّل الدخول باسم ${user.email}. عند الاستيراد، ستُنقل البيانات إلى حسابك الحالي (${user.email}) وستحلّ محل أي بيانات حالية بنفس الأسماء.`
                        : `This backup was created for ${pendingImport.sourceEmail}, but you are signed in as ${user.email}. If you import it, the data will be moved into your current account (${user.email}) and will overwrite any existing data with the same names.`}
                    </p>
                  </div>
                </div>
              )}
              {pendingImport && !pendingImport.encrypted && pendingImport.summary && (() => {
                const s = pendingImport.summary;
                const rows: { label: string; count: number }[] = [
                  { label: isAR ? "المستندات (فواتير، عروض أسعار، إيصالات)" : "Documents (invoices, quotations, receipts)", count: s.docs },
                  { label: isAR ? "العملاء" : "Clients", count: s.clients },
                  { label: isAR ? "المنتجات" : "Products", count: s.products },
                  { label: isAR ? "مساحات العمل" : "Workspaces", count: s.workspaces },
                  { label: isAR ? "أعضاء الفريق" : "Team members", count: s.team },
                  { label: isAR ? "مفاتيح API" : "API keys", count: s.apikeys },
                ].filter((r) => r.count > 0);
                const extras: string[] = [];
                if (s.tracker) extras.push(isAR ? "بيانات متتبع المستندات" : "Document tracker data");
                if (s.other > 0) extras.push(isAR ? `إعدادات أخرى (${s.other})` : `Other settings (${s.other})`);
                if (rows.length === 0 && extras.length === 0) return null;
                return (
                  <div className="rounded-md border bg-gray-50 dark:bg-gray-900 px-4 py-3" data-testid="settings-import-summary">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {isAR ? "محتويات النسخة الاحتياطية:" : "What's inside this backup:"}
                    </p>
                    <ul className="space-y-1">
                      {rows.map((r) => (
                        <li key={r.label} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 gap-4">
                          <span>{r.label}</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{r.count}</span>
                        </li>
                      ))}
                      {extras.map((label) => (
                        <li key={label} className="text-sm text-gray-600 dark:text-gray-400">{label}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
              <div className="flex items-start gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3">
                <Checkbox
                  id="import-backup-first"
                  checked={backupBeforeImport}
                  onCheckedChange={(v) => setBackupBeforeImport(v === true)}
                  className="mt-0.5"
                  data-testid="settings-import-backup-checkbox"
                />
                <div className="grid gap-1">
                  <Label htmlFor="import-backup-first" className="cursor-pointer font-medium">
                    {isAR ? "تنزيل نسخة احتياطية من بياناتي الحالية أولاً" : "Download a backup of my current data first"}
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isAR
                      ? "سيتم تنزيل ملف يحتوي على مستنداتك وعملائك ومنتجاتك قبل الاستيراد."
                      : "A file with your documents, clients, and products will be downloaded before importing."}
                  </p>
                </div>
              </div>
              {importError && <p className="text-sm text-red-500" data-testid="settings-import-confirm-error">{importError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={importing}>{isAR ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleConfirmImport(); }}
                  disabled={importing}
                  data-testid="settings-import-confirm"
                >
                  {importing ? (isAR ? "جارٍ الاستيراد..." : "Importing...") : (isAR ? "استيراد" : "Import")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* RFQ Intelligence */}
          <RfqSettingsCard isAR={isAR} />

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                <ShieldAlert className="w-4 h-4" />
                {isAR ? "منطقة الخطر" : "Danger Zone"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {isAR
                  ? "حذف حسابك سيزيل جميع بياناتك من هذا المتصفح بشكل دائم — بما في ذلك المستندات والعملاء والمنتجات والمساحات. لا يمكن التراجع عن هذا الإجراء."
                  : "Deleting your account permanently removes all your data from this browser — including documents, clients, products, and workspaces. This cannot be undone."}
              </p>
              <AlertDialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) { setDeletePw(""); setDeleteError(""); setBackupBeforeDelete(true); } }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" data-testid="settings-delete-btn">
                    <Trash2 className="w-4 h-4 me-2" />
                    {isAR ? "حذف الحساب" : "Delete account"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{isAR ? "هل أنت متأكد؟" : "Are you absolutely sure?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isAR
                        ? "سيتم حذف حسابك وجميع البيانات المرتبطة به نهائياً ولا يمكن التراجع عن ذلك. هذه فرصتك الأخيرة لحفظ نسخة من بياناتك. أدخل كلمة المرور للمتابعة."
                        : "Your account and all associated data will be permanently deleted — this cannot be undone. This is your last chance to save a copy of your data. Enter your password to continue."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex items-start gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3">
                    <Checkbox
                      id="delete-backup-first"
                      checked={backupBeforeDelete}
                      onCheckedChange={(v) => setBackupBeforeDelete(v === true)}
                      className="mt-0.5"
                      data-testid="settings-delete-backup-checkbox"
                    />
                    <div className="grid gap-1">
                      <Label htmlFor="delete-backup-first" className="cursor-pointer font-medium">
                        {isAR ? "تنزيل نسخة احتياطية أولاً" : "Download a backup first"}
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isAR
                          ? "سيتم تنزيل ملف يحتوي على مستنداتك وعملائك ومنتجاتك قبل الحذف."
                          : "A file with your documents, clients, and products will be downloaded before deletion."}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="delete-pw">{isAR ? "كلمة المرور" : "Password"}</Label>
                    <Input
                      id="delete-pw"
                      type="password"
                      value={deletePw}
                      onChange={(e) => setDeletePw(e.target.value)}
                      data-testid="settings-delete-pw"
                      autoComplete="current-password"
                    />
                    {deleteError && <p className="text-sm text-red-500" data-testid="settings-delete-error">{deleteError}</p>}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>{isAR ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => { e.preventDefault(); handleDelete(); }}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      data-testid="settings-delete-confirm"
                    >
                      {deleting ? (isAR ? "جارٍ الحذف..." : "Deleting...") : (isAR ? "حذف نهائياً" : "Delete permanently")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

type LlmProvider = "anthropic" | "openai" | "gemini" | "openrouter";

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT-4o, o1)",
  gemini: "Google Gemini",
  openrouter: "OpenRouter (Qwen, DeepSeek, Llama, Mistral, …)",
};

const PROVIDER_KEY_FIELD: Record<LlmProvider, string> = {
  anthropic: "rfq_anthropic_key",
  openai: "rfq_openai_key",
  gemini: "rfq_gemini_key",
  openrouter: "rfq_openrouter_key",
};

const PROVIDER_KEY_LINKS: Record<LlmProvider, { label: string; url: string; placeholder: string }> = {
  anthropic: {
    label: "Get an Anthropic API key",
    url: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-…",
  },
  openai: {
    label: "Get an OpenAI API key",
    url: "https://platform.openai.com/api-keys",
    placeholder: "sk-…",
  },
  gemini: {
    label: "Get a Google Gemini API key",
    url: "https://aistudio.google.com/apikey",
    placeholder: "AIza…",
  },
  openrouter: {
    label: "Get an OpenRouter API key",
    url: "https://openrouter.ai/settings/keys",
    placeholder: "sk-or-…",
  },
};

const CURATED_MODELS: Record<LlmProvider, readonly string[]> = {
  anthropic: [
    "claude-sonnet-4-6",
    "claude-opus-4-7",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "o1-preview"],
  gemini: [
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-exp",
  ],
  openrouter: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3.5-haiku",
    "google/gemini-pro-1.5",
    "qwen/qwen-2.5-72b-instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-large",
  ],
};

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-1.5-pro-latest",
  openrouter: "openai/gpt-4o",
};

const CUSTOM_SENTINEL = "__custom__";

function isProvider(v: string): v is LlmProvider {
  return v === "anthropic" || v === "openai" || v === "gemini" || v === "openrouter";
}

function RfqSettingsCard({ isAR }: { isAR: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [hasKeyOnFile, setHasKeyOnFile] = useState<Record<LlmProvider, boolean>>({
    anthropic: false,
    openai: false,
    gemini: false,
    openrouter: false,
  });
  const [modelMode, setModelMode] = useState<"curated" | "custom">("curated");
  const [form, setForm] = useState({
    rfq_provider: "anthropic" as LlmProvider,
    rfq_model: "",
    rfq_anthropic_key: "",
    rfq_openai_key: "",
    rfq_gemini_key: "",
    rfq_openrouter_key: "",
    rfq_libya_context: "",
    rfq_default_validity_days: "30",
    rfq_default_currency: "USD",
    rfq_auto_create_task: "true",
    rfq_default_task_deadline_days: "7",
  });

  useEffect(() => {
    void (async () => {
      try {
        const s = await getSettings();
        // Server returns "__SET__" sentinel for each provider's API key
        // — never the real value — so secrets never live in client memory.
        const provider: LlmProvider = isProvider(s.rfq_provider ?? "")
          ? (s.rfq_provider as LlmProvider)
          : "anthropic";
        const storedModel = (s.rfq_model || "").trim();
        const isCurated = storedModel.length === 0 || (CURATED_MODELS[provider] as readonly string[]).includes(storedModel);
        setModelMode(isCurated ? "curated" : "custom");
        setHasKeyOnFile({
          anthropic: s.rfq_anthropic_key === "__SET__",
          openai: s.rfq_openai_key === "__SET__",
          gemini: s.rfq_gemini_key === "__SET__",
          openrouter: s.rfq_openrouter_key === "__SET__",
        });
        setForm((f) => ({
          ...f,
          rfq_provider: provider,
          rfq_model: storedModel || DEFAULT_MODELS[provider],
          rfq_anthropic_key: "",
          rfq_openai_key: "",
          rfq_gemini_key: "",
          rfq_openrouter_key: "",
          rfq_libya_context: s.rfq_libya_context || "",
          rfq_default_validity_days: s.rfq_default_validity_days || "30",
          rfq_default_currency: s.rfq_default_currency || "USD",
          rfq_auto_create_task: s.rfq_auto_create_task ?? "true",
          rfq_default_task_deadline_days: s.rfq_default_task_deadline_days || "7",
        }));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const onProviderChange = (next: LlmProvider) => {
    // When the user switches provider, reset the model to that provider's
    // default and assume curated mode — they can still flip to Custom.
    setModelMode("curated");
    setForm((f) => ({ ...f, rfq_provider: next, rfq_model: DEFAULT_MODELS[next] }));
    setShowKey(false);
  };

  const onModelDropdownChange = (value: string) => {
    if (value === CUSTOM_SENTINEL) {
      setModelMode("custom");
      // Keep whatever model id was there so the user can edit it inline.
      return;
    }
    setModelMode("curated");
    setForm((f) => ({ ...f, rfq_model: value }));
  };

  const activeProvider = form.rfq_provider;
  const activeKeyField = PROVIDER_KEY_FIELD[activeProvider] as keyof typeof form;
  const activeKeyValue = String(form[activeKeyField] ?? "");
  const activeKeyOnFile = hasKeyOnFile[activeProvider];
  const linkInfo = PROVIDER_KEY_LINKS[activeProvider];

  const save = async () => {
    setSaving(true);
    try {
      // Only include each API key field when the user actually typed a
      // new value; otherwise we'd overwrite the stored secret with an
      // empty string on every save.
      const patch: Record<string, string> = {
        rfq_provider: form.rfq_provider,
        rfq_model: form.rfq_model.trim(),
        rfq_libya_context: form.rfq_libya_context,
        rfq_default_validity_days: form.rfq_default_validity_days,
        rfq_default_currency: form.rfq_default_currency,
        rfq_auto_create_task: form.rfq_auto_create_task,
        rfq_default_task_deadline_days: form.rfq_default_task_deadline_days,
      };
      const keyFields: LlmProvider[] = ["anthropic", "openai", "gemini", "openrouter"];
      for (const p of keyFields) {
        const fieldName = PROVIDER_KEY_FIELD[p] as keyof typeof form;
        const v = String(form[fieldName] ?? "").trim();
        if (v.length > 0) patch[PROVIDER_KEY_FIELD[p]] = v;
      }
      await updateSettings(patch);
      // Mark any newly-saved keys as on-file and clear inputs.
      const nextHasKey = { ...hasKeyOnFile };
      const reset: Partial<typeof form> = {};
      for (const p of keyFields) {
        const fieldName = PROVIDER_KEY_FIELD[p] as keyof typeof form;
        const v = String(form[fieldName] ?? "").trim();
        if (v.length > 0) {
          nextHasKey[p] = true;
          (reset as Record<string, string>)[fieldName as string] = "";
        }
      }
      setHasKeyOnFile(nextHasKey);
      setForm((f) => ({ ...f, ...reset }));
      toast({ title: isAR ? "تم الحفظ" : "RFQ settings saved" });
    } catch (err) {
      toast({ title: "Save failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try {
      // Send current (possibly unsaved) form state so the user gets
      // accurate feedback without having to click Save first. If the
      // key field is empty we send no key override and the backend
      // falls back to whatever's stored for the chosen provider.
      const typedKey = activeKeyValue.trim();
      const r = await testAnthropicKey({
        provider: form.rfq_provider,
        model: form.rfq_model.trim() || undefined,
        ...(typedKey ? { apiKey: typedKey } : {}),
      });
      const tested = r.provider ?? form.rfq_provider;
      const label = isProvider(tested) ? PROVIDER_LABELS[tested] : tested;
      toast({
        title: r.ok ? `${label} works` : "Test failed",
        description: r.message,
        variant: r.ok ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Test failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally { setTesting(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-violet-600" />
          {isAR ? "ذكاء العطاءات (RFQ)" : "RFQ Intelligence"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase font-semibold text-gray-500">AI provider</Label>
                <select
                  value={form.rfq_provider}
                  onChange={(e) => onProviderChange(e.target.value as LlmProvider)}
                  className="w-full h-10 text-sm rounded-md border border-input bg-background px-2"
                  data-testid="rfq-provider"
                >
                  {(Object.keys(PROVIDER_LABELS) as LlmProvider[]).map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                      {hasKeyOnFile[p] ? " ✓" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500">A check mark means a key is already on file for that provider.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-semibold text-gray-500">Model</Label>
                <select
                  value={modelMode === "custom" ? CUSTOM_SENTINEL : form.rfq_model}
                  onChange={(e) => onModelDropdownChange(e.target.value)}
                  className="w-full h-10 text-sm rounded-md border border-input bg-background px-2"
                  data-testid="rfq-model"
                >
                  {CURATED_MODELS[activeProvider].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value={CUSTOM_SENTINEL}>Custom… (type any model id)</option>
                </select>
                {modelMode === "custom" && (
                  <Input
                    value={form.rfq_model}
                    onChange={(e) => setForm({ ...form, rfq_model: e.target.value })}
                    placeholder="e.g. gpt-4o-2024-11-20"
                    className="mt-1"
                    data-testid="rfq-model-custom"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold text-gray-500">
                {PROVIDER_LABELS[activeProvider]} API key
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={activeKeyValue}
                  onChange={(e) => setForm({ ...form, [activeKeyField]: e.target.value })}
                  placeholder={activeKeyOnFile ? "•••••••••• (key on file — type to replace)" : linkInfo.placeholder}
                  data-testid={`rfq-${activeProvider}-key`}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={test} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {activeKeyOnFile
                  ? "A key is on file for this provider. Leave blank to keep it; type a new value to replace."
                  : (
                    <>
                      Required to power AI extraction &amp; supplier research with{" "}
                      {PROVIDER_LABELS[activeProvider]}. Bring your own key —{" "}
                      <a
                        href={linkInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600 dark:text-blue-400"
                      >
                        {linkInfo.label}
                      </a>
                      . Without a key, RFQ analysis falls back to a basic regex parser and may extract no items.
                    </>
                  )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase font-semibold text-gray-500">Default validity (days)</Label>
                <Input type="number" value={form.rfq_default_validity_days} onChange={(e) => setForm({ ...form, rfq_default_validity_days: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-semibold text-gray-500">Default currency</Label>
                <Input value={form.rfq_default_currency} onChange={(e) => setForm({ ...form, rfq_default_currency: e.target.value.toUpperCase().slice(0, 8) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-semibold text-gray-500">Auto-create task on RFQ analyze</Label>
                <select
                  value={form.rfq_auto_create_task}
                  onChange={(e) => setForm({ ...form, rfq_auto_create_task: e.target.value })}
                  className="w-full h-10 text-sm rounded-md border border-input bg-background px-2"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase font-semibold text-gray-500">Fallback task deadline (days)</Label>
                <Input type="number" value={form.rfq_default_task_deadline_days} onChange={(e) => setForm({ ...form, rfq_default_task_deadline_days: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase font-semibold text-gray-500">Libya / regional context</Label>
              <Textarea
                rows={4}
                value={form.rfq_libya_context}
                onChange={(e) => setForm({ ...form, rfq_libya_context: e.target.value })}
                placeholder="Notes about local supplier preferences, banking, customs, language…"
              />
              <p className="text-xs text-gray-500">Passed to the AI to shape supplier suggestions.</p>
            </div>

            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
              {isAR ? "حفظ" : "Save RFQ settings"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
