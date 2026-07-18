import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ClientInfo } from "@/types/document";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { Users, ChevronDown, X } from "lucide-react";
import { listClients, type SavedClient } from "@/lib/savedDocsApi";

interface ClientInfoFormProps {
  clientInfo: ClientInfo;
  onChange: (info: ClientInfo) => void;
}

export function ClientInfoForm({ clientInfo, onChange }: ClientInfoFormProps) {
  const { t } = useLanguage();
  const { user, activeWorkspaceId } = useAuth();
  const { can } = usePlan();
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listClients()
      .then((rows) => {
        if (!cancelled) setSavedClients(rows);
      })
      .catch(() => {
        if (!cancelled) setSavedClients([]);
      });
    return () => { cancelled = true; };
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  const applyClient = (c: SavedClient) => {
    onChange({
      name: c.name || "",
      company: c.company || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
    });
    setPickerOpen(false);
  };

  const field = (key: keyof ClientInfo, label: string, testId: string) => (
    <div className="space-y-1">
      <Label htmlFor={testId} className="text-xs">{label}</Label>
      <Input
        id={testId}
        value={clientInfo[key]}
        onChange={(e) => onChange({ ...clientInfo, [key]: e.target.value })}
        data-testid={testId}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">{t("doc.client_info")}</h3>
        {user && can("saved_clients") && savedClients.length > 0 && (
          <div className="relative" ref={pickerRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
              onClick={() => setPickerOpen(v => !v)}
            >
              <Users className="w-3.5 h-3.5" />
              Pick saved client
              <ChevronDown className="w-3 h-3" />
            </Button>
            {pickerOpen && (
              <div className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-64 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-gray-500">Saved Clients ({savedClients.length})</span>
                  <button onClick={() => setPickerOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {savedClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => applyClient(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</div>
                    {c.company && <div className="text-xs text-gray-500">{c.company}</div>}
                    {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("name", t("doc.client_name"), "client-name")}
        {field("company", t("doc.client_company"), "client-company")}
        {field("phone", t("doc.client_phone"), "client-phone")}
        {field("email", t("doc.client_email"), "client-email")}
      </div>
      <div>
        <Label htmlFor="client-address" className="text-xs">{t("doc.client_address")}</Label>
        <Input
          id="client-address"
          value={clientInfo.address}
          onChange={(e) => onChange({ ...clientInfo, address: e.target.value })}
          data-testid="client-address"
          className="h-8 text-sm mt-1"
        />
      </div>
    </div>
  );
}
