import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Receipt, BarChart3, Users, Package, Plus, Trash2, Edit2,
  Copy, Key, Shield, ChevronDown, Check, ExternalLink, Building2,
  UserPlus, Sparkles, TrendingUp, PieChart, X, ArrowUpDown, Search, Loader2,
  Upload, Download,
} from "lucide-react";
import { rowsToCsv, parseCsvTable, pickField, pickNumber, downloadCsv } from "@/lib/csv";
import { CsvImportPreviewDialog } from "@/components/CsvImportPreviewDialog";
import { timeAgo } from "@/utils/timeAgo";
import { useAuth, isAdmin } from "@/context/AuthContext";
import { SpamStatsCard } from "@/components/SpamStatsCard";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useToast } from "@/hooks/use-toast";
import { getRfqDashboardStats, listRfqDocuments, type RfqDocument } from "@/lib/rfqApi";
import {
  listDocuments,
  updateDocument as apiUpdateDocument,
  deleteDocument as apiDeleteDocument,
  duplicateDocument as apiDuplicateDocument,
  listClients as apiListClients,
  createClient as apiCreateClient,
  updateClient as apiUpdateClient,
  deleteClient as apiDeleteClient,
  getCompanyProfile,
  type SavedDoc,
  type SavedClient as ApiSavedClient,
  type DocStatus,
  type CompanyProfile,
} from "@/lib/savedDocsApi";
import { useUsage } from "@/hooks/useUsage";
import { Progress } from "@/components/ui/progress";
import { SendButtons } from "@/components/SendButtons";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SavedDocument {
  id: string;
  type: "invoice" | "quotation" | "receipt";
  title: string;
  clientName: string;
  date: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue";
  createdAt: string;
  lastEditedAt?: string;
  workspaceId: string;
  payload: Record<string, unknown>;
}

export interface SavedClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
}

export interface SavedProduct {
  id: string;
  name: string;
  description: string;
  unit: string;
  defaultPrice: number;
  currency: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  invitedAt: string;
}

export interface APIKey {
  id: string;
  label: string;
  token: string;
  createdAt: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getDocsKey(email: string, wsId: string) { return `bh_docs_${email}_${wsId}`; }
function getClientsKey(email: string, wsId: string) { return `bh_clients_${email}_${wsId}`; }
function getProductsKey(email: string, wsId: string) { return `bh_products_${email}_${wsId}`; }
function getWorkspacesKey(email: string) { return `bh_workspaces_${email}`; }
function getTeamKey(email: string, wsId: string) { return `bh_team_${email}_${wsId}`; }
function getAPIKeysKey(email: string) { return `bh_apikeys_${email}`; }

function readJSON<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function writeJSON(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function genId() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

function getWorkspaces(email: string): Workspace[] {
  const ws = readJSON<Workspace[]>(getWorkspacesKey(email), []);
  if (ws.length === 0) {
    const def: Workspace = { id: "ws_default", name: "My Workspace", createdAt: new Date().toISOString() };
    writeJSON(getWorkspacesKey(email), [def]);
    return [def];
  }
  return ws;
}

// ─── Utility ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle, actionLabel, actionHref }: {
  icon: typeof FileText; title: string; subtitle: string; actionLabel: string; actionHref: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
      <Link href={actionHref}>
        <Button size="sm" className="flex items-center gap-2">
          <Plus className="w-4 h-4" />{actionLabel}
        </Button>
      </Link>
    </div>
  );
}

function WorkspaceSwitcher({ workspaces, activeId, onSwitch, onNew, onManage }: {
  workspaces: Workspace[]; activeId: string;
  onSwitch: (id: string) => void; onNew: () => void; onManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = workspaces.find(w => w.id === activeId) || workspaces[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Building2 className="w-4 h-4 text-amber-500" />
        <span className="max-w-[140px] truncate">{active?.name || "Workspace"}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 start-0 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => { onSwitch(ws.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3.5 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${ws.id === activeId ? "text-primary font-medium" : "text-gray-700 dark:text-gray-300"}`}
            >
              {ws.id === activeId && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              {ws.id !== activeId && <span className="w-3.5" />}
              <span className="truncate">{ws.name}</span>
            </button>
          ))}
          <div className="mx-3 my-1 h-px bg-gray-100 dark:bg-gray-800" />
          <button
            onClick={() => { onNew(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workspace
          </button>
          <button
            onClick={() => { onManage(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Manage Workspaces
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ docs, type, onDelete, onDuplicate, onStatusChange, search, statusFilter, actionLabel, actionHref, icon: Icon }: {
  docs: SavedDoc[]; type: "invoice" | "quotation" | "receipt";
  onDelete: (id: string) => void;
  onDuplicate: (doc: SavedDoc) => void;
  onStatusChange: (id: string, status: DocStatus) => void;
  search: string;
  statusFilter: "all" | DocStatus;
  actionLabel: string; actionHref: string; icon: typeof FileText;
}) {
  const { lang } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"edited" | "created">("edited");
  const q = search.trim().toLowerCase();
  const filtered = docs
    .filter(d => d.type === type)
    .filter(d => statusFilter === "all" ? true : d.status === statusFilter)
    .filter(d => !q ? true : (
      d.title.toLowerCase().includes(q) ||
      d.clientName.toLowerCase().includes(q)
    ))
    .slice()
    .sort((a, b) => {
      const aT = new Date(sortBy === "edited" ? a.lastEditedAt : a.createdAt).getTime();
      const bT = new Date(sortBy === "edited" ? b.lastEditedAt : b.createdAt).getTime();
      return bT - aT;
    });

  const cycleStatus = (id: string, current: DocStatus) => {
    const order: DocStatus[] = ["draft", "sent", "paid", "overdue"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    onStatusChange(id, next);
  };

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title={q || statusFilter !== "all" ? "No matching documents" : "No documents yet"}
        subtitle={q || statusFilter !== "all" ? "Try adjusting your search or filter." : "Save a document from the generator to see it here."}
        actionLabel={actionLabel}
        actionHref={actionHref}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "edited" | "created")}>
            <SelectTrigger className="h-7 text-xs w-44" data-testid="docs-sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edited">Recently edited</SelectItem>
              <SelectItem value="created">Recently created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map(doc => {
          const status = doc.status;
          const editedIso = doc.lastEditedAt;
          const editedTitle = new Date(editedIso).toLocaleString();
          const createdLabel = new Date(doc.createdAt).toLocaleDateString();
          return (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900 transition-colors group" data-testid={`doc-row-${doc.id}`}>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  <span>{doc.clientName}</span>
                  <span> · </span>
                  <span>Created {createdLabel}</span>
                  <span> · </span>
                  <span title={editedTitle} data-testid={`doc-edited-${doc.id}`}>
                    Edited {timeAgo(editedIso, lang)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-semibold">{doc.currency} {doc.amount.toFixed(2)}</span>
                <button
                  onClick={() => cycleStatus(doc.id, status)}
                  data-testid={`doc-status-${doc.id}`}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${STATUS_COLORS[status]}`}
                >
                  {status}
                </button>
                <SendButtons
                  doc={{
                    type: doc.type,
                    title: doc.title,
                    clientName: doc.clientName,
                    amount: doc.amount,
                    currency: doc.currency,
                    date: createdLabel,
                  }}
                  size="sm"
                  className="opacity-0 group-hover:opacity-100"
                />
                <Link href={`${actionHref}?restore=${doc.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" data-testid={`doc-edit-${doc.id}`}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => onDuplicate(doc)} data-testid={`doc-duplicate-${doc.id}`}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600" onClick={() => setDeleteId(doc.id)} data-testid={`doc-delete-${doc.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { onDelete(deleteId!); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────

function ClientsTab() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ApiSavedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ApiSavedClient | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const blank = { name: "", company: "", email: "", phone: "", address: "", country: "", taxId: "" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiListClients();
      setClients(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load clients";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await apiCreateClient(form);
        toast({ title: "Client added" });
      } else if (editing) {
        await apiUpdateClient(editing.id, form);
        toast({ title: "Client updated" });
      }
      await load();
      setEditing(null); setIsNew(false); setForm(blank);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiDeleteClient(id);
      await load();
      toast({ title: "Client deleted" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const openEdit = (client: ApiSavedClient) => {
    setEditing(client);
    setIsNew(false);
    setForm({
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      address: client.address,
      country: client.country,
      taxId: client.taxId,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => { setIsNew(true); setEditing(null); setForm(blank); }} className="gap-2" data-testid="add-client-btn">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading clients…
        </div>
      )}

      {!loading && clients.length === 0 && !isNew && (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No clients yet. Add your first client.</p>
        </div>
      )}

      <div className="space-y-2">
        {clients.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 group" data-testid={`client-row-${c.id}`}>
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{c.name}{c.company ? ` · ${c.company}` : ""}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[c.email, c.phone].filter(Boolean).join(" · ")}
                {c.documentCount > 0 && (
                  <span> · <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{c.documentCount} doc{c.documentCount !== 1 ? "s" : ""}</Badge></span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)} data-testid={`client-edit-${c.id}`}><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(c.id)} data-testid={`client-delete-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isNew || !!editing} onOpenChange={() => { setIsNew(false); setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Client" : "Edit Client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(["name", "company", "email", "phone", "address", "country", "taxId"] as const).map(f => (
              <div key={f} className="space-y-1">
                <Label className="text-xs capitalize">{f === "taxId" ? "Tax ID" : f}</Label>
                <Input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} className="h-8 text-sm" data-testid={`client-field-${f}`} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsNew(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={save} disabled={!form.name.trim() || saving} data-testid="client-save-btn">{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete client?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { remove(deleteId!); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ email, wsId }: { email: string; wsId: string }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<SavedProduct[]>(() => readJSON(getProductsKey(email, wsId), []));
  const [editing, setEditing] = useState<SavedProduct | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const blank: Omit<SavedProduct, "id"> = { name: "", description: "", unit: "unit", defaultPrice: 0, currency: "USD" };
  const [form, setForm] = useState(blank);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<SavedProduct[] | null>(null);

  useEffect(() => { setProducts(readJSON(getProductsKey(email, wsId), [])); }, [email, wsId]);

  const exportCsv = () => {
    const csv = rowsToCsv(products, [
      { key: "name", get: (p: SavedProduct) => p.name },
      { key: "description", get: (p) => p.description },
      { key: "unit", get: (p) => p.unit },
      { key: "default_price", get: (p) => p.defaultPrice },
      { key: "currency", get: (p) => p.currency },
    ]);
    downloadCsv("products.csv", csv);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const { rows, errors } = parseCsvTable(text);
      if (errors.length > 0) {
        toast({ title: "Import failed", description: errors[0], variant: "destructive" });
        return;
      }
      const parsed = rows
        .map((r) => ({
          id: genId(),
          name: pickField(r, ["name", "product", "product_name", "item"]),
          description: pickField(r, ["description", "desc", "details"]),
          unit: pickField(r, ["unit", "uom", "unit_of_measure"]) || "unit",
          defaultPrice: pickNumber(r, ["default_price", "price", "unit_price", "rate"]),
          currency: (pickField(r, ["currency", "curr"]) || "USD").toUpperCase().slice(0, 3),
        }))
        .filter((p) => p.name.trim());
      if (parsed.length === 0) {
        toast({ title: "No valid rows", description: "Every row needs a 'name' column with a value.", variant: "destructive" });
        return;
      }
      setPendingImport(parsed);
    };
    reader.onerror = () => toast({ title: "Could not read file", variant: "destructive" });
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const updated = [...products, ...pendingImport];
    setProducts(updated);
    writeJSON(getProductsKey(email, wsId), updated);
    toast({ title: "Products imported", description: `${pendingImport.length} product${pendingImport.length === 1 ? "" : "s"} imported.` });
    setPendingImport(null);
  };

  const save = () => {
    if (!form.name.trim()) return;
    let updated: SavedProduct[];
    if (isNew) {
      updated = [...products, { ...form, id: genId() }];
    } else {
      updated = products.map(p => p.id === editing!.id ? { ...editing!, ...form } : p);
    }
    setProducts(updated);
    writeJSON(getProductsKey(email, wsId), updated);
    setEditing(null); setIsNew(false); setForm(blank);
    toast({ title: isNew ? "Product added" : "Product updated" });
  };

  const remove = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    writeJSON(getProductsKey(email, wsId), updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">{products.length} item{products.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
            data-testid="products-csv-input"
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2" data-testid="products-import-csv">
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={products.length === 0} className="gap-2" data-testid="products-export-csv">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => { setIsNew(true); setEditing(null); setForm(blank); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>
      </div>

      {products.length === 0 && !isNew && (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No products yet. Add your catalog items.</p>
        </div>
      )}

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 group">
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.currency} {p.defaultPrice.toFixed(2)} / {p.unit}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(p); setIsNew(false); setForm({ name: p.name, description: p.description, unit: p.unit, defaultPrice: p.defaultPrice, currency: p.currency }); }}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(p.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isNew || !!editing} onOpenChange={() => { setIsNew(false); setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? "Add Product / Service" : "Edit Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Unit</Label><Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="h-8 text-sm" /></div>
              <div className="space-y-1"><Label className="text-xs">Default Price</Label><Input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={e => setForm(p => ({ ...p, defaultPrice: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Currency</Label><Input value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))} maxLength={3} className="h-8 text-sm w-24" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsNew(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={save} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportPreviewDialog
        open={!!pendingImport}
        rows={pendingImport ?? []}
        columns={[
          { label: "Name", get: (p: SavedProduct) => p.name },
          { label: "Description", get: (p) => p.description },
          { label: "Unit", get: (p) => p.unit },
          { label: "Price", get: (p) => p.defaultPrice.toFixed(2) },
          { label: "Currency", get: (p) => p.currency },
        ]}
        title="Preview CSV import"
        description={`${pendingImport?.length ?? 0} product${(pendingImport?.length ?? 0) === 1 ? "" : "s"} will be created.`}
        confirmLabel="Import"
        cancelLabel="Cancel"
        moreLabel={`…and ${Math.max((pendingImport?.length ?? 0) - 10, 0)} more row${(pendingImport?.length ?? 0) - 10 === 1 ? "" : "s"} not shown.`}
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
        testIdPrefix="products-import"
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete product?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { remove(deleteId!); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Workspaces Manager ───────────────────────────────────────────────────────

function WorkspacesManager({ email, workspaces, activeId, onSwitch, onRefresh }: {
  email: string; workspaces: Workspace[]; activeId: string;
  onSwitch: (id: string) => void; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const addWs = () => {
    if (!newName.trim()) return;
    const ws: Workspace = { id: genId(), name: newName.trim(), createdAt: new Date().toISOString() };
    const updated = [...workspaces, ws];
    writeJSON(getWorkspacesKey(email), updated);
    setNewName("");
    onSwitch(ws.id);
    onRefresh();
    toast({ title: "Workspace created" });
  };

  const renameWs = () => {
    if (!editId || !editName.trim()) return;
    const updated = workspaces.map(w => w.id === editId ? { ...w, name: editName.trim() } : w);
    writeJSON(getWorkspacesKey(email), updated);
    setEditId(null); setEditName("");
    onRefresh();
    toast({ title: "Workspace renamed" });
  };

  const deleteWs = (id: string) => {
    if (workspaces.length <= 1) { toast({ title: "Cannot delete the only workspace", variant: "destructive" }); return; }
    const updated = workspaces.filter(w => w.id !== id);
    writeJSON(getWorkspacesKey(email), updated);
    if (activeId === id) onSwitch(updated[0].id);
    onRefresh();
    toast({ title: "Workspace deleted" });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New workspace name…" className="h-8 text-sm" />
        <Button size="sm" onClick={addWs} disabled={!newName.trim()}>Create</Button>
      </div>
      <div className="space-y-2">
        {workspaces.map(ws => (
          <div key={ws.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            {editId === ws.id ? (
              <>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm flex-1" autoFocus />
                <Button size="sm" className="h-7" onClick={renameWs}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditId(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium">{ws.name}</span>
                {ws.id === activeId && <Badge variant="secondary" className="text-xs">Active</Badge>}
                {ws.id !== activeId && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => onSwitch(ws.id)}>Switch</Button>}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(ws.id); setEditName(ws.name); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(ws.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </div>
        ))}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete workspace?</AlertDialogTitle><AlertDialogDescription>All data in this workspace will be inaccessible (but not deleted from storage).</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { deleteWs(deleteId!); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({ email, wsId }: { email: string; wsId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>(() => readJSON(getTeamKey(email, wsId), []));
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<TeamMember["role"]>("member");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { setMembers(readJSON(getTeamKey(email, wsId), [])); }, [email, wsId]);

  const invite = () => {
    if (!invEmail.trim() || !invEmail.includes("@")) return;
    if (members.find(m => m.email === invEmail.trim())) { toast({ title: "Already invited", variant: "destructive" }); return; }
    const newMember: TeamMember = { id: genId(), email: invEmail.trim(), role: invRole, invitedAt: new Date().toISOString() };
    const updated = [...members, newMember];
    setMembers(updated);
    writeJSON(getTeamKey(email, wsId), updated);
    setInvEmail("");
    toast({ title: "Invitation recorded", description: `${invEmail} has been added as ${invRole}.` });
  };

  const changeRole = (id: string, role: TeamMember["role"]) => {
    const updated = members.map(m => m.id === id ? { ...m, role } : m);
    setMembers(updated);
    writeJSON(getTeamKey(email, wsId), updated);
  };

  const remove = (id: string) => {
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    writeJSON(getTeamKey(email, wsId), updated);
  };

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
        Invitations are recorded locally. Email delivery will be enabled in a future release.
      </div>
      <div className="flex gap-2">
        <Input value={invEmail} onChange={e => setInvEmail(e.target.value)} placeholder="email@example.com" className="h-8 text-sm flex-1" />
        <Select value={invRole} onValueChange={v => setInvRole(v as TeamMember["role"])}>
          <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={invite} className="gap-1.5 h-8"><UserPlus className="w-3.5 h-3.5" />Invite</Button>
      </div>
      {members.length === 0 ? (
        <div className="text-center py-10">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No team members yet. Invite someone above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400 font-semibold text-sm">
                {m.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.email}</p>
                <p className="text-xs text-muted-foreground">Invited {new Date(m.invitedAt).toLocaleDateString()}</p>
              </div>
              <Select value={m.role} onValueChange={v => changeRole(m.id, v as TeamMember["role"])}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(m.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove team member?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { remove(deleteId!); setDeleteId(null); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ email, wsId }: { email: string; wsId: string }) {
  const docs: SavedDocument[] = readJSON(getDocsKey(email, wsId), []);

  const totalRevenue = docs.filter(d => d.status === "paid").reduce((s, d) => s + d.amount, 0);
  const byStatus = [
    { name: "Draft", value: docs.filter(d => d.status === "draft").length },
    { name: "Sent", value: docs.filter(d => d.status === "sent").length },
    { name: "Paid", value: docs.filter(d => d.status === "paid").length },
    { name: "Overdue", value: docs.filter(d => d.status === "overdue").length },
  ].filter(s => s.value > 0);

  const now = new Date();
  const months: { name: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const name = d.toLocaleString("default", { month: "short" });
    const revenue = docs
      .filter(doc => {
        const dd = new Date(doc.createdAt);
        return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth();
      })
      .reduce((s, doc) => s + doc.amount, 0);
    months.push({ name, revenue });
  }

  const clientRevenue: Record<string, number> = {};
  docs.forEach(d => {
    if (d.clientName) clientRevenue[d.clientName] = (clientRevenue[d.clientName] || 0) + d.amount;
  });
  const topClients = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (docs.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Save some documents to see analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Documents", value: docs.length },
          { label: "Paid Revenue", value: `$${totalRevenue.toFixed(0)}` },
          { label: "Pending", value: docs.filter(d => d.status === "sent").length },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Month (last 6 months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={months}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {topClients.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Clients by Revenue</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topClients.map(([name, rev]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[160px]">{name}</span>
                  <span className="font-medium">${rev.toFixed(0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {byStatus.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <RPieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={11}>
                    {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </RPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function APIKeysTab({ email }: { email: string }) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<APIKey[]>(() => readJSON(getAPIKeysKey(email), []));
  const [label, setLabel] = useState("");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = () => {
    if (!label.trim()) return;
    const token = "bh_" + genId().replace(/-/g, "") + genId().replace(/-/g, "").slice(0, 16);
    const newKey: APIKey = { id: genId(), label: label.trim(), token, createdAt: new Date().toISOString() };
    const updated = [...keys, newKey];
    setKeys(updated);
    writeJSON(getAPIKeysKey(email), updated);
    setLabel("");
    toast({ title: "API key generated", description: "Copy it now — it will not be shown again in full." });
  };

  const copyKey = (token: string, id: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const revoke = (id: string) => {
    const updated = keys.filter(k => k.id !== id);
    setKeys(updated);
    writeJSON(getAPIKeysKey(email), updated);
    toast({ title: "API key revoked" });
  };

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
        API keys are stored locally and will authenticate against the API server in a future release.
      </div>
      <div className="flex gap-2">
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Key label (e.g. My App)" className="h-8 text-sm flex-1" />
        <Button size="sm" onClick={generate} disabled={!label.trim()} className="gap-1.5 h-8"><Key className="w-3.5 h-3.5" />Generate</Button>
      </div>
      {keys.length === 0 ? (
        <div className="text-center py-10">
          <Key className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <Key className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{k.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{k.token.slice(0, 20)}…</p>
                <p className="text-xs text-muted-foreground">Created {new Date(k.createdAt).toLocaleDateString()}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => copyKey(k.token, k.id)}>
                {copied === k.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied === k.id ? "Copied" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setRevokeId(k.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Revoke API key?</AlertDialogTitle><AlertDialogDescription>This key will stop working immediately.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { revoke(revokeId!); setRevokeId(null); }}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, activeWorkspaceId, setActiveWorkspaceId, refreshBilling } = useAuth();
  const { can } = usePlan();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [showWsManager, setShowWsManager] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DocStatus>("all");
  const { usage, refresh: refreshUsage, freeLimit } = useUsage();
  // Setup-checklist data: saved company profile + saved clients count.
  // Both load lazily after auth so they don't block the rest of the dashboard.
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [clientCount, setClientCount] = useState<number | null>(null);

  const refreshWorkspaces = useCallback(() => {
    if (!user) return;
    setWorkspaces(getWorkspaces(user.email));
  }, [user]);

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setDocsLoading(true);
    setDocsError(null);
    try {
      // Pull up to 200 (server max) so the "this month" stat and the
      // recent-docs cards are computed over the full recent history,
      // not just the default 50-row page.
      const r = await listDocuments({ limit: 200, offset: 0 });
      const data = r.documents;
      setDocs(data);
      // Mirror to localStorage for restore-by-id flow on doc pages
      try {
        const mirror = data.map(d => ({
          id: d.id, type: d.type, title: d.title, clientName: d.clientName,
          date: new Date(d.createdAt).toISOString().slice(0, 10),
          amount: d.amount, currency: d.currency, status: d.status,
          createdAt: d.createdAt, lastEditedAt: d.lastEditedAt,
          workspaceId: activeWorkspaceId, payload: d.payload,
        }));
        localStorage.setItem(getDocsKey(user.email, activeWorkspaceId), JSON.stringify(mirror));
      } catch { /* best-effort cache */ }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load documents";
      setDocsError(msg);
    } finally {
      setDocsLoading(false);
    }
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    if (!user) { navigate("/login?next=/dashboard"); return; }
    refreshWorkspaces();
    void loadDocs();
    // Fetch profile + client list count for the setup checklist card.
    // Failures are silent (the card just stays empty) so we never break
    // the dashboard if these endpoints momentarily error.
    getCompanyProfile().then(setCompanyProfile).catch(() => setCompanyProfile(null));
    apiListClients().then((list) => setClientCount(list.length)).catch(() => setClientCount(null));
  }, [user, navigate, refreshWorkspaces, loadDocs]);

  // Sync billing tier after returning from Stripe Checkout
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    const sessionId = params.get("session_id") || undefined;
    const planParam = params.get("plan");
    if (upgrade === "success") {
      let attempts = 0;
      const tryRefresh = async () => {
        attempts += 1;
        await refreshBilling(attempts === 1 ? sessionId : undefined);
      };
      void (async () => {
        const initialTier = user.tier;
        for (let i = 0; i < 4; i++) {
          await tryRefresh();
          await new Promise((r) => setTimeout(r, 1500));
          const fresh = JSON.parse(localStorage.getItem("bh_session_v1") || "null");
          if (fresh && fresh.tier && fresh.tier !== "free" && fresh.tier !== initialTier) break;
        }
        const isAR = lang === "ar";
        const planLabel = planParam === "pro"
          ? (isAR ? "Pro" : "Pro")
          : planParam === "business"
            ? (isAR ? "Business" : "Business")
            : (isAR ? "المدفوعة" : "paid");
        toast({
          title: isAR ? "تم تفعيل الاشتراك" : "Subscription active",
          description: isAR
            ? `أنت الآن على خطة ${planLabel}. مرحبًا بك!`
            : `You're now on the ${planLabel} plan. Welcome aboard!`,
        });
      })();
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  if (!user) return null;

  if (!can("dashboard")) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-20">
          <UpgradePrompt
            requiredTier="pro"
            title="Dashboard requires Pro"
            description="Save and manage all your documents, clients, and products. Upgrade to Pro to unlock the full dashboard."
          />
        </div>
      </AppLayout>
    );
  }

  const isBusiness = can("workspaces");

  const deleteDoc = async (id: string) => {
    const prev = docs;
    setDocs(prev.filter(d => d.id !== id));
    try {
      await apiDeleteDocument(id);
      toast({ title: "Document deleted" });
      void loadDocs();
    } catch (e) {
      setDocs(prev);
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const duplicateDoc = async (doc: SavedDoc) => {
    try {
      await apiDuplicateDocument(doc.id);
      await loadDocs();
      void refreshUsage();
      toast({ title: "Document duplicated" });
    } catch (e) {
      const err = e as { status?: number; message?: string };
      if (err?.status === 402) {
        toast({ title: "Free limit reached", description: "Upgrade to duplicate more documents.", variant: "destructive" });
        navigate("/pricing");
        return;
      }
      toast({ title: err?.message || "Duplicate failed", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: DocStatus) => {
    const prev = docs;
    setDocs(prev.map(d => d.id === id ? { ...d, status } : d));
    try {
      await apiUpdateDocument(id, { status });
    } catch (e) {
      setDocs(prev);
      const msg = e instanceof Error ? e.message : "Status update failed";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleNewWorkspace = () => {
    setShowWsManager(true);
    setActiveTab("workspaces");
  };

  const TABS = [
    { value: "invoices", label: "Invoices" },
    { value: "quotations", label: "Quotations" },
    { value: "receipts", label: "Receipts" },
    { value: "clients", label: "Clients" },
    { value: "products", label: "Products" },
    ...(isBusiness ? [
      { value: "team", label: "Team" },
      { value: "analytics", label: "Analytics" },
      { value: "api-keys", label: "API Keys" },
      { value: "workspaces", label: "Workspaces" },
    ] : []),
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Welcome back, {user.name}</p>
            </div>
            {isBusiness && (
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeId={activeWorkspaceId}
                onSwitch={(id) => { setActiveWorkspaceId(id); }}
                onNew={handleNewWorkspace}
                onManage={() => { setShowWsManager(true); setActiveTab("workspaces"); }}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={user.tier === "business" ? "default" : "secondary"} className="capitalize flex items-center gap-1">
              {user.tier === "business" && <Sparkles className="w-3 h-3" />}
              {user.tier === "business" && <Shield className="w-3 h-3" />}
              {user.tier} plan
            </Badge>
            {user.tier === "business" && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 text-xs gap-1">
                <Shield className="w-3 h-3" /> Dedicated Support
              </Badge>
            )}
          </div>
        </div>

        {/* Setup checklist — company profile completion + saved-clients count.
            Shows a friendly nudge when fields are missing, and turns into a
            quiet "all set" panel when both are done. */}
        {(() => {
          const profileFields: Array<keyof CompanyProfile> = [
            "companyName", "logoData", "address", "city", "country",
            "phone", "email", "website", "taxOrVatNumber", "registrationNumber",
            "defaultPaymentTerms", "defaultNotes",
          ];
          const filled = companyProfile
            ? profileFields.filter((k) => String(companyProfile[k] ?? "").trim().length > 0).length
            : 0;
          const completion = Math.round((filled / profileFields.length) * 100);
          const hasProfile = !!companyProfile;
          const cnt = clientCount ?? 0;
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="border-blue-100 dark:border-blue-900/50" data-testid="dash-company-card">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {hasProfile ? "Company profile" : "Save your company profile"}
                        </p>
                        <span className="text-xs font-semibold tabular-nums text-blue-700 dark:text-blue-300" data-testid="dash-profile-completion">
                          {completion}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {hasProfile
                          ? "Auto-fills on every new invoice, quotation, and receipt."
                          : "Save it once and we'll auto-fill it on every new document."}
                      </p>
                      <Progress value={completion} className="mt-2 h-1.5" />
                      <Link href="/settings/company">
                        <Button variant="link" size="sm" className="px-0 mt-1.5 h-auto text-xs" data-testid="dash-profile-cta">
                          {hasProfile ? "Edit profile →" : "Set up now →"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="dash-clients-card">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium text-sm">Saved clients</p>
                        <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300" data-testid="dash-clients-count">
                          {clientCount === null ? "…" : cnt}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cnt === 0
                          ? "Add clients to pre-fill them with one click on documents."
                          : `Pick from your saved list when filling an invoice or quote.`}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <Link href="/clients">
                          <Button variant="link" size="sm" className="px-0 h-auto text-xs" data-testid="dash-clients-cta">
                            Manage clients →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Admin-only contact-form spam stats. Tells operators whether the
            optional Cloudflare Turnstile layer is actually warranted by
            showing how often the honeypot/captcha layers fire. Hidden for
            non-admin users so it doesn't clutter the regular dashboard. */}
        {isAdmin(user) && (
          <div className="mb-6 space-y-4">
            <AdminNav />
            <SpamStatsCard />
          </div>
        )}

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { href: "/invoice", label: "New Invoice", icon: FileText },
            { href: "/quotation", label: "New Quotation", icon: BarChart3 },
            { href: "/receipt", label: "New Receipt", icon: Receipt },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all" data-testid={`dash-action-${href.replace("/", "")}`}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{label}</span>
                  <Plus className="w-4 h-4 text-muted-foreground ms-auto" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* This-month stat + recent docs (Step 4) — derived from `docs`
            already loaded above; cheap to compute and updates with state. */}
        {(() => {
          const now = new Date();
          const yr = now.getFullYear();
          const mo = now.getMonth();
          const monthLabel = now.toLocaleString("default", { month: "long" });
          const thisMonth = docs.filter((d) => {
            const dt = new Date(d.lastEditedAt || d.createdAt);
            return dt.getFullYear() === yr && dt.getMonth() === mo;
          });
          const sortByEdited = (a: SavedDoc, b: SavedDoc) =>
            +new Date(b.lastEditedAt || b.createdAt) - +new Date(a.lastEditedAt || a.createdAt);
          const recent = {
            invoice: docs.filter((d) => d.type === "invoice").sort(sortByEdited).slice(0, 3),
            quotation: docs.filter((d) => d.type === "quotation").sort(sortByEdited).slice(0, 3),
            receipt: docs.filter((d) => d.type === "receipt").sort(sortByEdited).slice(0, 3),
          };
          const editPath: Record<SavedDoc["type"], string> = {
            invoice: "/invoice", quotation: "/quotation", receipt: "/receipt",
          };
          return (
            <div className="mb-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card data-testid="dash-stat-this-month">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground mb-1">Documents this {monthLabel}</p>
                    <p className="text-2xl font-bold tabular-nums">{thisMonth.length}</p>
                  </CardContent>
                </Card>
                <Card data-testid="dash-stat-total-docs">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground mb-1">Total saved documents</p>
                    <p className="text-2xl font-bold tabular-nums">{docs.length}</p>
                  </CardContent>
                </Card>
                <Link href="/documents">
                  <Card className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all" data-testid="dash-view-all-docs">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">All documents</p>
                        <p className="text-sm font-semibold">View, edit, duplicate or delete →</p>
                      </div>
                      <FileText className="w-6 h-6 text-primary/70" />
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {(recent.invoice.length + recent.quotation.length + recent.receipt.length) > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="dash-recent-docs">
                  {(["invoice", "quotation", "receipt"] as const).map((type) => {
                    const items = recent[type];
                    const titleMap = { invoice: "Recent invoices", quotation: "Recent quotations", receipt: "Recent receipts" };
                    return (
                      <Card key={type}>
                        <CardHeader className="pb-2 flex-row items-center justify-between">
                          <CardTitle className="text-sm">{titleMap[type]}</CardTitle>
                          <Link href={`/documents?type=${type}`}>
                            <Button variant="link" size="sm" className="px-0 h-auto text-xs">View all →</Button>
                          </Link>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {items.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">No {type}s yet.</p>
                          ) : items.map((d) => (
                            <Link key={d.id} href={`${editPath[d.type]}?documentId=${d.id}`}>
                              <div className="flex items-center justify-between gap-2 p-2 -mx-2 rounded hover:bg-muted/40 cursor-pointer text-sm" data-testid={`dash-recent-${d.id}`}>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{d.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{d.clientName || "—"}</p>
                                </div>
                                <span className="text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                                  {d.currency} {Number(d.amount).toFixed(0)}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* RFQ Intelligence widget */}
        <RfqWidget />

        {/* Usage progress bar (free tier) */}
        {usage && usage.limit != null && (
          <Card className="mb-6 border-gray-200 dark:border-gray-800" data-testid="usage-progress-card">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <div className="text-sm">
                  <span className="font-medium">Free plan usage</span>
                  <span className="text-muted-foreground ms-2">
                    {usage.documentsCreated} / {usage.limit} documents this month
                  </span>
                </div>
                {usage.documentsCreated >= usage.limit ? (
                  <Button size="sm" onClick={() => navigate("/pricing")} data-testid="usage-upgrade-btn" className="bg-primary">Upgrade</Button>
                ) : usage.documentsCreated >= Math.max(1, usage.limit - 2) ? (
                  <span className="text-xs text-amber-600 font-medium">Approaching limit</span>
                ) : null}
              </div>
              <Progress
                value={Math.min(100, Math.round((usage.documentsCreated / usage.limit) * 100))}
                className={usage.documentsCreated >= usage.limit ? "[&>div]:bg-red-500" : usage.documentsCreated >= Math.max(1, usage.limit - 2) ? "[&>div]:bg-amber-500" : ""}
                data-testid="usage-progress-bar"
              />
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {TABS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="text-sm">{label}</TabsTrigger>
            ))}
          </TabsList>

          {(activeTab === "invoices" || activeTab === "quotations" || activeTab === "receipts") && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute start-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={lang === "ar" ? "ابحث بالعنوان أو اسم العميل" : "Search by title or client"}
                  className="h-9 ps-8 text-sm"
                  data-testid="docs-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | DocStatus)}>
                <SelectTrigger className="h-9 text-sm w-36" data-testid="docs-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              {docsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          )}

          {docsError && (
            <div className="mb-4 px-3 py-2 rounded-md text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
              {docsError}
            </div>
          )}

          <TabsContent value="invoices">
            <DocumentsTab docs={docs} type="invoice" onDelete={deleteDoc} onDuplicate={duplicateDoc} onStatusChange={handleStatusChange} search={search} statusFilter={statusFilter} actionLabel="New Invoice" actionHref="/invoice" icon={FileText} />
          </TabsContent>
          <TabsContent value="quotations">
            <DocumentsTab docs={docs} type="quotation" onDelete={deleteDoc} onDuplicate={duplicateDoc} onStatusChange={handleStatusChange} search={search} statusFilter={statusFilter} actionLabel="New Quotation" actionHref="/quotation" icon={BarChart3} />
          </TabsContent>
          <TabsContent value="receipts">
            <DocumentsTab docs={docs} type="receipt" onDelete={deleteDoc} onDuplicate={duplicateDoc} onStatusChange={handleStatusChange} search={search} statusFilter={statusFilter} actionLabel="New Receipt" actionHref="/receipt" icon={Receipt} />
          </TabsContent>
          <TabsContent value="clients">
            <ClientsTab />
          </TabsContent>
          <TabsContent value="products">
            <ProductsTab email={user.email} wsId={activeWorkspaceId} />
          </TabsContent>

          {isBusiness && (
            <>
              <TabsContent value="team">
                <TeamTab email={user.email} wsId={activeWorkspaceId} />
              </TabsContent>
              <TabsContent value="analytics">
                <AnalyticsTab email={user.email} wsId={activeWorkspaceId} />
              </TabsContent>
              <TabsContent value="api-keys">
                <APIKeysTab email={user.email} />
              </TabsContent>
              <TabsContent value="workspaces">
                <WorkspacesManager
                  email={user.email}
                  workspaces={workspaces}
                  activeId={activeWorkspaceId}
                  onSwitch={(id) => { setActiveWorkspaceId(id); }}
                  onRefresh={refreshWorkspaces}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

function RfqWidget() {
  const [stats, setStats] = useState<{ pending: number; analyzed: number; quoted: number; overdue: number; nextDeadline?: string } | null>(null);
  const [recent, setRecent] = useState<RfqDocument[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [s, list] = await Promise.all([
          getRfqDashboardStats(),
          listRfqDocuments(),
        ]);
        if (cancelled) return;
        setStats(s);
        setRecent(list.slice(0, 4));
      } catch { /* silently hide on error */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  const totalAll = (stats?.pending ?? 0) + (stats?.analyzed ?? 0) + (stats?.quoted ?? 0);
  if (totalAll === 0 && recent.length === 0) {
    return (
      <Card className="mb-6 border-violet-200 dark:border-violet-900/40 bg-gradient-to-r from-violet-50/40 to-blue-50/40 dark:from-violet-950/20 dark:to-blue-950/20">
        <CardContent className="py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="font-semibold">RFQ Intelligence</div>
              <div className="text-xs text-muted-foreground">Drop a tender PDF and we'll extract items + suggest suppliers.</div>
            </div>
          </div>
          <Link href="/rfq"><Button size="sm">Get started</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-600" /> RFQ Intelligence</CardTitle>
        <Link href="/rfq"><Button size="sm" variant="outline">Open</Button></Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Pending" value={stats?.pending ?? 0} cls="text-amber-600" />
          <Stat label="Analyzed" value={stats?.analyzed ?? 0} cls="text-emerald-600" />
          <Stat label="Quoted" value={stats?.quoted ?? 0} cls="text-violet-600" />
          <Stat label="Overdue" value={stats?.overdue ?? 0} cls="text-red-600" />
        </div>
        {recent.length > 0 && (
          <div className="space-y-1">
            {recent.map((r) => (
              <Link key={r.id} href={`/rfq`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 text-sm no-underline">
                <span className="truncate">{r.detectedClientName || r.sourceFilename}</span>
                <span className="text-xs text-muted-foreground">{r.itemCount} items · {r.closingDate || "—"}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="text-center p-2 rounded-md bg-gray-50 dark:bg-gray-900">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
    </div>
  );
}
