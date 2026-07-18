import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Plus, Edit2, Trash2, Loader2, Search, Building2, MapPin, Mail, Phone,
  Globe, Upload, Download, ArrowLeft, Sparkles,
} from "lucide-react";
import {
  listSuppliers, createSupplier, updateSupplier, deleteSupplier, seedDefaultSuppliers,
  type RfqSupplier,
} from "@/lib/rfqApi";

const blank: Partial<RfqSupplier> = {
  name: "", country: "", city: "", address: "", contactName: "",
  email: "", phone: "", website: "", specialties: [], isLocal: false,
  notes: "", active: true,
};

export default function SuppliersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<RfqSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<RfqSupplier> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [specialtiesText, setSpecialtiesText] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setList(await listSuppliers());
    } catch (err) {
      toast({ title: "Failed to load suppliers", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (user) void reload(); }, [user, reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.specialties.some((sp) => sp.toLowerCase().includes(q)),
    );
  }, [list, search]);

  const openEdit = useCallback((s: RfqSupplier | null) => {
    setEditing(s ? { ...s } : { ...blank });
    setSpecialtiesText(s ? s.specialties.join(", ") : "");
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Partial<RfqSupplier> = {
        ...editing,
        specialties: specialtiesText.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editing.id) {
        await updateSupplier(editing.id, payload);
        toast({ title: "Supplier updated" });
      } else {
        await createSupplier(payload);
        toast({ title: "Supplier created" });
      }
      setEditing(null);
      void reload();
    } catch (err) {
      toast({ title: "Save failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [editing, specialtiesText, reload, toast]);

  const doDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteSupplier(deleteId);
      setDeleteId(null);
      toast({ title: "Supplier deleted" });
      void reload();
    } catch (err) {
      toast({ title: "Delete failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    }
  }, [deleteId, reload, toast]);

  const seed = useCallback(async () => {
    setSeeding(true);
    try {
      const r = await seedDefaultSuppliers();
      toast({ title: "Defaults seeded", description: `${r.inserted} suppliers added` });
      void reload();
    } catch (err) {
      toast({ title: "Seed failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }, [reload, toast]);

  const exportCsv = useCallback(() => {
    const rows = [
      ["name", "country", "city", "contactName", "email", "phone", "website", "specialties", "isLocal", "active", "notes"],
      ...list.map((s) => [
        s.name, s.country, s.city, s.contactName, s.email, s.phone, s.website,
        s.specialties.join("|"), String(s.isLocal), String(s.active), s.notes,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "suppliers.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [list]);

  const importCsv = useCallback(async (file: File) => {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean).map((l) => {
      const cells: string[] = []; let cur = ""; let q = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else { q = !q; } }
        else if (ch === "," && !q) { cells.push(cur); cur = ""; }
        else cur += ch;
      }
      cells.push(cur);
      return cells;
    });
    const header = rows.shift();
    if (!header) return;
    const idx = (k: string) => header.findIndex((h) => h.trim().toLowerCase() === k);
    let inserted = 0;
    for (const r of rows) {
      try {
        await createSupplier({
          name: r[idx("name")] ?? "",
          country: r[idx("country")] ?? "",
          city: r[idx("city")] ?? "",
          contactName: r[idx("contactname")] ?? "",
          email: r[idx("email")] ?? "",
          phone: r[idx("phone")] ?? "",
          website: r[idx("website")] ?? "",
          specialties: (r[idx("specialties")] ?? "").split("|").filter(Boolean),
          isLocal: (r[idx("islocal")] ?? "").toLowerCase() === "true",
          active: (r[idx("active")] ?? "true").toLowerCase() !== "false",
          notes: r[idx("notes")] ?? "",
        });
        inserted++;
      } catch { /* skip row */ }
    }
    toast({ title: "Import complete", description: `${inserted} rows added` });
    void reload();
  }, [reload, toast]);

  if (!user) {
    return <AppLayout><div className="p-12 text-center">Please <Link href="/login" className="underline">sign in</Link>.</div></AppLayout>;
  }

  return (
    <AppLayout>
      <Helmet><title>Supplier Database — Xuvilo Business Hub</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href="/rfq"><Button variant="ghost" size="sm" className="-ms-2"><ArrowLeft className="w-4 h-4 me-1" /> Back to RFQs</Button></Link>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500 font-semibold mb-1">Procurement</div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7" /> Supplier Database
              <span className="text-base font-normal text-gray-500">— Manage</span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
              Maintain your master list of suppliers. Per-RFQ matched suppliers are shown
              under each line item on the <Link href="/rfq" className="underline">RFQ Intelligence</Link> page —
              this page is for adding, editing, importing, and exporting your directory.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={seed} disabled={seeding}>
              {seeding ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 me-1" />} Seed defaults
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-3.5 h-3.5 me-1" /> Export CSV</Button>
            <label>
              <input type="file" accept=".csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.currentTarget.value = ""; }} />
              <Button variant="outline" size="sm" asChild><span><Upload className="w-3.5 h-3.5 me-1" /> Import CSV</span></Button>
            </label>
            <Button onClick={() => openEdit(null)}><Plus className="w-4 h-4 me-1" /> Add supplier</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, country, city, specialty…" className="ps-9" />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-gray-500">
            No suppliers yet. Click <strong>Seed defaults</strong> to load a starter set.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => (
              <Card key={s.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city}{s.city && s.country ? ", " : ""}{s.country}</div>
                    </div>
                    {s.isLocal && <Badge variant="outline" className="text-[10px]">Local</Badge>}
                    {!s.active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {s.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.specialties.slice(0, 4).map((sp) => <Badge key={sp} variant="secondary" className="text-[10px]">{sp}</Badge>)}
                    </div>
                  )}
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                    {s.contactName && <div>{s.contactName}</div>}
                    {s.email && <div className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{s.email}</div>}
                    {s.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</div>}
                    {s.website && <div className="flex items-center gap-1 truncate"><Globe className="w-3 h-3" /><a href={s.website} target="_blank" rel="noreferrer" className="hover:underline">{s.website}</a></div>}
                  </div>
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit/create dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name *"><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Country"><Input value={editing.country ?? ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /></Field>
              <Field label="City"><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
              <Field label="Contact name"><Input value={editing.contactName ?? ""} onChange={(e) => setEditing({ ...editing, contactName: e.target.value })} /></Field>
              <Field label="Email"><Input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Website"><Input value={editing.website ?? ""} onChange={(e) => setEditing({ ...editing, website: e.target.value })} /></Field>
              <Field label="Address"><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
              <Field label="Specialties (comma-separated)" className="sm:col-span-2">
                <Input value={specialtiesText} onChange={(e) => setSpecialtiesText(e.target.value)} placeholder="electrical, hardware, safety" />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea rows={3} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </Field>
              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editing.isLocal} onChange={(e) => setEditing({ ...editing, isLocal: e.target.checked })} />
                  Local supplier
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                  Active
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !editing?.name}>
              {saving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase text-gray-500 font-semibold mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
