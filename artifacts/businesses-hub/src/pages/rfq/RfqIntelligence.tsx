import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Upload, FileText, Loader2, Sparkles, Trash2, ArrowRight,
  Calendar, AlertTriangle, CheckCircle2, Package, Database,
  ImageIcon, Globe, MapPin, Mail, Phone, ExternalLink, Search,
  Wrench, Info, RefreshCw, X, ChevronDown, ChevronUp,
  Inbox, ShieldCheck, Clock, FileSearch, Settings as SettingsIcon,
} from "lucide-react";
import {
  listRfqDocuments, uploadRfqPdf, analyzeRfqDocument, deleteRfqDocument,
  getRfqDocument, fileToBase64,
  type RfqDocument, type RfqLineItem, type RfqResearchedItem,
  type RfqResearchSupplier, type RfqMatchedDbSupplier,
} from "@/lib/rfqApi";

const MAX_BYTES = 10 * 1024 * 1024;

const COLOR = {
  success: { fg: "text-[#3B6D11]", bg: "bg-[#3B6D11]/10", border: "border-[#3B6D11]/30", solid: "bg-[#3B6D11]" },
  warn:    { fg: "text-[#BA7517]", bg: "bg-[#BA7517]/10", border: "border-[#BA7517]/30", solid: "bg-[#BA7517]" },
  error:   { fg: "text-[#A32D2D]", bg: "bg-[#A32D2D]/10", border: "border-[#A32D2D]/30", solid: "bg-[#A32D2D]" },
} as const;

/** Only allow http(s) and mailto/tel for any user/AI-supplied URL. */
function safeUrl(raw: string | null | undefined, addProtocol = false): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return trimmed;
  if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return trimmed;
  if (addProtocol && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}
function safeImageUrl(raw: string | null | undefined): string | null {
  const u = safeUrl(raw);
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : null;
}

type QueueItem = {
  id: string;
  filename: string;
  status: "queued" | "uploading" | "uploaded" | "analyzing" | "done" | "error";
  docId?: string;
  error?: string;
};

type StatusKey = "pending" | "analyzing" | "analyzed" | "quoted" | "failed" | "error";
const STATUS_META: Record<StatusKey, { label: string; tone: "success" | "warn" | "error" | "info" | "muted" }> = {
  pending:   { label: "Pending",   tone: "warn" },
  analyzing: { label: "Analyzing", tone: "info" },
  analyzed:  { label: "Analyzed",  tone: "success" },
  quoted:    { label: "Quoted",    tone: "info" },
  failed:    { label: "Failed",    tone: "error" },
  error:     { label: "Error",     tone: "error" },
};
function toneClasses(tone: "success" | "warn" | "error" | "info" | "muted"): string {
  switch (tone) {
    case "success": return `${COLOR.success.bg} ${COLOR.success.fg} ${COLOR.success.border}`;
    case "warn":    return `${COLOR.warn.bg} ${COLOR.warn.fg} ${COLOR.warn.border}`;
    case "error":   return `${COLOR.error.bg} ${COLOR.error.fg} ${COLOR.error.border}`;
    case "info":    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
    default:        return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status as StatusKey] ?? { label: status, tone: "muted" as const };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${toneClasses(meta.tone)}`}>
      {meta.label}
    </span>
  );
}

function deadlineMeta(closing?: string) {
  if (!closing) return { text: "—", tone: "muted" as const, days: null };
  const d = new Date(closing);
  if (Number.isNaN(d.getTime())) return { text: closing, tone: "muted" as const, days: null };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400_000);
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, tone: "error"  as const, days };
  if (days <= 5) return { text: `${days}d left`,              tone: "warn"   as const, days };
  return            { text: `${days}d left`,                  tone: "success" as const, days };
}

function formatDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function RfqIntelligencePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<RfqDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<RfqDocument | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listRfqDocuments();
      setDocs(list);
    } catch (err) {
      toast({ title: "Failed to load RFQs", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (user) void reload(); }, [user, reload]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: QueueItem[] = [];
    const SUPPORTED = /\.(pdf|png|jpe?g|webp|tiff?|bmp)$/i;
    for (const file of Array.from(files)) {
      if (!SUPPORTED.test(file.name)) {
        toast({ title: `Skipped ${file.name}`, description: "Upload a PDF or image (PNG, JPG, WebP, TIFF, BMP).", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast({ title: `Skipped ${file.name}`, description: "Larger than 10 MB limit.", variant: "destructive" });
        continue;
      }
      items.push({ id: crypto.randomUUID(), filename: file.name, status: "queued" });
    }
    if (items.length === 0) return;
    setQueue((q) => [...q, ...items]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const file = Array.from(files).find((f) => f.name === it.filename)!;
      setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, status: "uploading" } : x)));
      try {
        const dataBase64 = await fileToBase64(file);
        const doc = await uploadRfqPdf({ filename: file.name, dataBase64 });
        setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, status: "analyzing", docId: doc.id } : x)));
        const analyzed = await analyzeRfqDocument(doc.id);
        setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, status: "done", docId: analyzed.id } : x)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, status: "error", error: msg } : x)));
      }
    }
    void reload();
  }, [reload, toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    void handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this RFQ?")) return;
    try {
      await deleteRfqDocument(id);
      setDocs((d) => d.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: "RFQ deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    }
  }, [selected, toast]);

  const openDetail = useCallback(async (id: string) => {
    try {
      const doc = await getRfqDocument(id);
      setSelected(doc);
    } catch (err) {
      toast({ title: "Could not load RFQ", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    }
  }, [toast]);

  const reanalyze = useCallback(async () => {
    if (!selected) return;
    setReanalyzing(true);
    try {
      const updated = await analyzeRfqDocument(selected.id);
      setSelected(updated);
      setDocs((d) => d.map((x) => (x.id === updated.id ? updated : x)));
      toast({ title: "Re-analyzed", description: `${updated.itemCount} items extracted` });
    } catch (err) {
      toast({ title: "Re-analyze failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setReanalyzing(false);
    }
  }, [selected, toast]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) =>
      (d.rfqNumber || "").toLowerCase().includes(q) ||
      (d.detectedClientName || "").toLowerCase().includes(q) ||
      (d.sourceFilename || "").toLowerCase().includes(q),
    );
  }, [docs, search]);

  const grouped = useMemo(() => {
    const buckets: Record<"active" | "analyzed" | "completed" | "failed", RfqDocument[]> = {
      active: [], analyzed: [], completed: [], failed: [],
    };
    for (const d of filteredDocs) {
      if (d.status === "pending" || d.status === "analyzing") buckets.active.push(d);
      else if (d.status === "analyzed") buckets.analyzed.push(d);
      else if (d.status === "quoted") buckets.completed.push(d);
      else if (d.status === "failed" || d.status === "error") buckets.failed.push(d);
      else buckets.analyzed.push(d);
    }
    return buckets;
  }, [filteredDocs]);

  const inProgress = queue.filter((q) => q.status !== "done" && q.status !== "error").length;

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-3">Sign in to use RFQ Intelligence</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Upload tender PDFs, auto-extract items, and generate quotes.</p>
          <Link href="/login"><Button>Sign in</Button></Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Helmet><title>RFQ Intelligence — Xuvilo Business Hub</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500 font-semibold mb-1">Procurement</div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-violet-600" /> RFQ Intelligence
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Drop tender PDFs to extract items, match suppliers from your database, and draft quotes.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/rfq/suppliers"><Button variant="outline" size="sm"><Database className="w-4 h-4 me-1" /> Supplier DB</Button></Link>
            <Link href="/rfq/history"><Button variant="outline" size="sm"><FileText className="w-4 h-4 me-1" /> History</Button></Link>
            <Link href="/settings"><Button variant="outline" size="sm"><SettingsIcon className="w-4 h-4 me-1" /> Settings</Button></Link>
          </div>
        </header>

        {/* Upload zone */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-0">
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              data-testid="rfq-dropzone"
            >
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="font-semibold mb-1">Drop RFQ files here or click to upload</p>
              <p className="text-xs text-gray-500">PDF or image (PNG · JPG · WebP · TIFF · BMP) · max 10 MB each · multiple files supported</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp,image/tiff,image/bmp,.pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.bmp"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
            {queue.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-2">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Upload queue · {inProgress} active
                </div>
                {queue.slice().reverse().map((it) => (
                  <div key={it.id} className="flex items-center gap-3 text-sm">
                    {it.status === "done" && <CheckCircle2 className={`w-4 h-4 ${COLOR.success.fg}`} />}
                    {it.status === "error" && <AlertTriangle className={`w-4 h-4 ${COLOR.error.fg}`} />}
                    {(it.status === "uploading" || it.status === "analyzing") && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    {(it.status === "queued" || it.status === "uploaded") && <FileText className="w-4 h-4 text-gray-400" />}
                    <span className="flex-1 truncate font-mono text-xs">{it.filename}</span>
                    <span className="text-xs text-gray-500">{it.status}{it.error ? `: ${it.error}` : ""}</span>
                    {it.status === "done" && it.docId && (
                      <Button size="sm" variant="ghost" onClick={() => openDetail(it.docId!)}>Open</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* List + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Queue */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search RFQs by number, client, file…"
                className="ps-9 h-9 text-sm"
              />
            </div>
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-2 max-h-[700px] overflow-y-auto">
                {loading ? (
                  <QueueSkeleton />
                ) : filteredDocs.length === 0 ? (
                  <EmptyQueue />
                ) : (
                  <div className="space-y-4">
                    <QueueGroup label="In Progress"  icon={<Loader2 className="w-3 h-3" />} items={grouped.active}    selectedId={selected?.id} onPick={openDetail} />
                    <QueueGroup label="Analyzed"     icon={<ShieldCheck className="w-3 h-3" />} items={grouped.analyzed}  selectedId={selected?.id} onPick={openDetail} />
                    <QueueGroup label="Quoted"       icon={<CheckCircle2 className="w-3 h-3" />} items={grouped.completed} selectedId={selected?.id} onPick={openDetail} />
                    <QueueGroup label="Errors"       icon={<AlertTriangle className="w-3 h-3" />} items={grouped.failed}    selectedId={selected?.id} onPick={openDetail} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail */}
          <div className="lg:col-span-8">
            {!selected ? (
              <DetailEmpty />
            ) : (
              <RfqDetail
                doc={selected}
                onDelete={() => handleDelete(selected.id)}
                onCreateQuote={() => navigate(`/rfq/quote/new?rfq=${selected.id}`)}
                onReanalyze={reanalyze}
                reanalyzing={reanalyzing}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ============================ Queue ============================ */

function QueueGroup({
  label, icon, items, selectedId, onPick,
}: {
  label: string;
  icon: React.ReactNode;
  items: RfqDocument[];
  selectedId?: string;
  onPick: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gray-500 font-semibold">
        {icon} {label} <span className="text-gray-400">· {items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((d) => (
          <QueueItem key={d.id} doc={d} selected={selectedId === d.id} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function QueueItem({ doc: d, selected, onPick }: { doc: RfqDocument; selected: boolean; onPick: (id: string) => void }) {
  const dl = deadlineMeta(d.closingDate);
  return (
    <button
      onClick={() => onPick(d.id)}
      className={`w-full text-start ps-3 pe-3 py-2.5 rounded-md border transition-all relative group ${
        selected
          ? `border-[#3B6D11]/40 bg-[#3B6D11]/5 dark:bg-[#3B6D11]/10`
          : "border-transparent hover:border-gray-200 dark:hover:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40"
      }`}
      data-testid={`rfq-queue-item-${d.id}`}
    >
      {selected && <span className={`absolute start-0 top-2 bottom-2 w-1 rounded-r ${COLOR.success.solid}`} />}
      <div className="flex items-center gap-2 mb-1">
        <StatusPill status={d.status} />
        <span className="text-[10px] font-mono text-gray-500 truncate flex-1">{d.rfqNumber || d.sourceFilename}</span>
      </div>
      <div className="text-sm font-semibold truncate leading-tight">{d.detectedClientName || "Unknown client"}</div>
      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1 tabular-nums"><Package className="w-3 h-3" />{d.itemCount} items</span>
        {d.closingDate && (
          <span className={`inline-flex items-center gap-1 tabular-nums font-medium ${
            dl.tone === "error" ? COLOR.error.fg :
            dl.tone === "warn"  ? COLOR.warn.fg  :
            dl.tone === "success" ? COLOR.success.fg : "text-gray-500"
          }`}>
            <Calendar className="w-3 h-3" />{dl.text}
          </span>
        )}
      </div>
    </button>
  );
}

function QueueSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[68px] rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="py-10 text-center px-4">
      <Inbox className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
      <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">No RFQs yet</div>
      <div className="text-xs text-gray-500 mt-1">Drop a tender PDF above to get started.</div>
    </div>
  );
}

function DetailEmpty() {
  return (
    <Card className="border-gray-200 dark:border-gray-800 h-full">
      <CardContent className="py-20 text-center">
        <FileSearch className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
        <div className="font-semibold text-base text-gray-700 dark:text-gray-300">Select an RFQ to begin</div>
        <div className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          Pick an RFQ from the list on the left to see extracted line items, matched suppliers, and AI research.
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================ Detail ============================ */

function RfqDetail({
  doc, onDelete, onCreateQuote, onReanalyze, reanalyzing,
}: {
  doc: RfqDocument;
  onDelete: () => void;
  onCreateQuote: () => void;
  onReanalyze: () => void;
  reanalyzing: boolean;
}) {
  const items = useMemo<RfqLineItem[]>(() => {
    const arr = (doc.parsedData?.items as RfqLineItem[] | undefined) ?? [];
    return Array.isArray(arr) ? arr : [];
  }, [doc.parsedData]);
  const researched = useMemo<RfqResearchedItem[]>(() => {
    const r = doc.researchData as unknown;
    return Array.isArray(r) ? (r as RfqResearchedItem[]) : [];
  }, [doc.researchData]);

  const requirementTags = useMemo<string[]>(() => {
    const t = (doc.parsedData?.requirementTags as string[] | undefined) ?? [];
    return Array.isArray(t) ? t : [];
  }, [doc.parsedData]);

  const dl = deadlineMeta(doc.closingDate);

  const noItemsAfterAnalysis = doc.status !== "pending" && doc.status !== "analyzing" && items.length === 0;
  const anyItemHasError = researched.some((r) => r.error);
  const noKey = researched.some((r) => r.error === "no_anthropic_key" || r.error === "no_api_key");

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <StatusPill status={doc.status} />
                <span className="text-[11px] font-mono text-gray-500">{doc.sourceFilename}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight truncate">
                {doc.rfqNumber || "(no RFQ number)"}
              </h2>
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                {doc.detectedClientName || "Unknown client"}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1 tabular-nums"><Package className="w-3 h-3" />{items.length} items</span>
                <span>·</span>
                <span>Received {formatDate(doc.createdAt)}</span>
                {doc.prNumber && (<><span>·</span><span className="font-mono">PR {doc.prNumber}</span></>)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={onReanalyze} disabled={reanalyzing} data-testid="rfq-reanalyze">
                {reanalyzing ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 me-1" />}
                Re-analyze
              </Button>
              <Button size="sm" variant="outline" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5 me-1" /> Delete
              </Button>
              <Button size="sm" onClick={onCreateQuote} className={`${COLOR.success.solid} hover:bg-[#2f580d] text-white`}>
                Create Quote <ArrowRight className="w-3.5 h-3.5 ms-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Closing date"
          value={formatDate(doc.closingDate)}
          sub={doc.closingDate ? dl.text : undefined}
          tone={dl.tone === "muted" ? undefined : dl.tone}
          icon={<Calendar className="w-3.5 h-3.5" />}
        />
        <KpiCard
          label="Submit to"
          value={doc.submissionEmail || "—"}
          mono
          icon={<Mail className="w-3.5 h-3.5" />}
          link={doc.submissionEmail ? `mailto:${doc.submissionEmail}` : undefined}
        />
        <KpiCard
          label="Validity"
          value={doc.validityDays ? `${doc.validityDays} days` : "—"}
          icon={<Clock className="w-3.5 h-3.5" />}
        />
        <KpiCard
          label="Currency"
          value={doc.currency || "—"}
          mono
          icon={<Info className="w-3.5 h-3.5" />}
        />
      </div>

      {/* OCR-used informational badge (when items WERE found via OCR) */}
      {!noItemsAfterAnalysis && doc.parsedData?.wasOcr && (
        <Card className={`border ${COLOR.warn.border} ${COLOR.warn.bg}`}>
          <CardContent className="p-3 flex items-start gap-3">
            <Info className={`w-4 h-4 ${COLOR.warn.fg} shrink-0 mt-0.5`} />
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <span className={`font-semibold ${COLOR.warn.fg}`}>OCR used</span> — this
              PDF had no text layer, so we ran image-based OCR (English). Item names,
              part numbers and quantities may need a quick visual review against the
              original.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty / diagnostic state for items */}
      {noItemsAfterAnalysis && (() => {
        const isScanned = !!doc.parsedData?.isScanned;
        const wasOcr = !!doc.parsedData?.wasOcr;
        const tone = isScanned ? "error" : "warn";
        const c = tone === "error" ? COLOR.error : COLOR.warn;
        return (
          <Card className={`border ${c.border} ${c.bg}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 ${c.fg} shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className={`font-semibold ${c.fg}`}>
                  {isScanned
                    ? "Scanned PDF — could not read with OCR"
                    : wasOcr
                      ? "OCR ran, but no structured items detected"
                      : "No line items extracted"}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {isScanned ? (
                    <>
                      The PDF has no text layer and OCR also returned only{" "}
                      <span className="font-mono">{doc.parsedData?.extractedTextLength ?? 0}</span>{" "}
                      characters. The page images may be too low-resolution, rotated,
                      or in a script the OCR engine doesn't support. Try re-scanning at
                      300 dpi or running it through Adobe Acrobat "Recognize Text"
                      first, then upload the OCR'd version.
                    </>
                  ) : wasOcr ? (
                    <>
                      We OCR'd the PDF and got{" "}
                      <span className="font-mono">{doc.parsedData?.extractedTextLength ?? 0}</span>{" "}
                      characters of text, but couldn't find a structured items table.
                      OCR text often loses column alignment — try re-analyzing with an
                      AI provider configured in{" "}
                      <Link href="/settings" className="underline">Settings</Link>.
                    </>
                  ) : (
                    "The parser could not detect a structured items table in this PDF."
                  )}
                </div>
                {!isScanned && !wasOcr && (
                  <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 list-disc list-inside space-y-0.5">
                    <li>Configure an AI provider (Anthropic / OpenAI / Gemini / OpenRouter) in <Link href="/settings" className="underline">Settings</Link> for AI-assisted extraction.</li>
                    <li>Try <strong>Re-analyze</strong> after pasting your API key.</li>
                    <li>If the PDF was created from a photo or scan, OCR it first.</li>
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Requirements */}
      {(requirementTags.length > 0 || doc.paymentTerms || doc.deliveryTerms || doc.submissionInstructions) && (
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 space-y-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold">Requirements</div>
            {requirementTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {requirementTags.map((t) => (
                  <span key={t} className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${toneClasses("warn")}`}>
                    {t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {doc.paymentTerms && <Block label="Payment" value={doc.paymentTerms} />}
              {doc.deliveryTerms && <Block label="Delivery" value={doc.deliveryTerms} />}
              {doc.submissionInstructions && <Block label="Submission" value={doc.submissionInstructions} />}
            </div>
          </CardContent>
        </Card>
      )}

      {noKey && (
        <div className={`flex items-start gap-2 p-3 rounded-md border ${COLOR.warn.border} ${COLOR.warn.bg} text-sm`}>
          <Info className={`w-4 h-4 ${COLOR.warn.fg} shrink-0 mt-0.5`} />
          <div className={COLOR.warn.fg}>
            <strong>AI research disabled.</strong>{" "}
            Configure an AI provider in <Link href="/settings" className="underline">Settings</Link> for richer per-item insights.
            Database supplier matches are still shown below.
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-600 dark:text-gray-400">
              Line items <span className="text-gray-400 font-normal">· {items.length}</span>
            </h3>
            {anyItemHasError && !noKey && (
              <span className={`text-[11px] ${COLOR.warn.fg} inline-flex items-center gap-1`}>
                <AlertTriangle className="w-3 h-3" /> Some items had research errors
              </span>
            )}
          </div>
          {items.map((it, i) => (
            <ItemCard key={i} index={i} item={it} researched={researched[i]} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ KPI / Block ============================ */

function KpiCard({
  label, value, sub, tone, icon, mono = false, link,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "warn" | "error";
  icon?: React.ReactNode;
  mono?: boolean;
  link?: string;
}) {
  const subColor = tone === "error" ? COLOR.error.fg
                : tone === "warn"  ? COLOR.warn.fg
                : tone === "success" ? COLOR.success.fg : "text-gray-500";
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950">
      <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500 font-semibold flex items-center gap-1 mb-1">
        {icon}{label}
      </div>
      <div className={`text-sm font-semibold truncate ${mono ? "font-mono" : ""}`}>
        {link ? <a href={link} className="hover:underline" target="_blank" rel="noreferrer">{value}</a> : value}
      </div>
      {sub && <div className={`text-[11px] mt-0.5 tabular-nums font-medium ${subColor}`}>{sub}</div>}
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-gray-500 font-semibold mb-1">{label}</div>
      <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{value}</div>
    </div>
  );
}

function MetaCell({
  label, value, mono = false, wide = false,
}: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-1" : ""}>
      <div className="text-[9px] uppercase tracking-[0.14em] text-gray-400 font-semibold mb-0.5">{label}</div>
      <div
        className={`text-xs font-medium text-gray-800 dark:text-gray-200 truncate ${mono ? "font-mono tabular-nums" : ""}`}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================ Item card ============================ */

function ItemCard({ index, item, researched }: { index: number; item: RfqLineItem; researched?: RfqResearchedItem }) {
  const r = researched?.research;
  const number = item.itemNumber ?? index + 1;
  const imageUrl = safeImageUrl(r?.image_url);
  const productPageUrl = safeUrl(r?.product_page_url ?? null);
  const datasheetUrl = safeUrl(r?.datasheet_url ?? null);
  const searchQuery = r?.image_search_query
    ?? `${item.manufacturer || ""} ${item.partNo || ""} ${item.description}`.trim().slice(0, 120);
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;

  const matchedDb = researched?.matchedDbSuppliers ?? [];
  const local = r?.local_suppliers ?? [];
  const intl = r?.international_suppliers ?? [];
  const alts = r?.alternatives ?? [];

  const [openDb, setOpenDb] = useState(true);
  const [openWeb, setOpenWeb] = useState(false);
  const [openAlts, setOpenAlts] = useState(false);

  const confTone = researched?.imageBadge?.confidence === "exact" ? "success"
                : researched?.imageBadge?.confidence === "high"  ? "success"
                : researched?.imageBadge?.confidence === "medium" ? "warn"
                : "muted";

  return (
    <Card className="border-gray-200 dark:border-gray-800 overflow-hidden" data-testid={`rfq-item-${number}`}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-4 p-4">
          {/* Image */}
          <div className="w-full md:w-36 shrink-0">
            <div className="aspect-square bg-gray-50 dark:bg-gray-900 rounded-md flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-800">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.description}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : researched?.categoryIcon ? (
                <span className="text-5xl">{researched.categoryIcon}</span>
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-300" />
              )}
            </div>
            {researched?.imageBadge && (
              <div className={`mt-2 text-[10px] uppercase tracking-wider font-semibold text-center px-1.5 py-0.5 rounded ${toneClasses(confTone)}`}>
                {researched.imageBadge.confidence}
              </div>
            )}
            <a
              href={googleImagesUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 text-[11px] text-violet-600 hover:underline flex items-center gap-1 justify-center"
            >
              <Search className="w-3 h-3" /> Search images
            </a>
          </div>

          {/* Description + meta */}
          <div className="flex-1 min-w-0">
            {/* Title row: large mono # + product name (clamped to 2 lines) */}
            <div className="flex items-start gap-3 mb-2">
              <span
                className="font-mono tabular-nums text-sm font-bold text-white bg-gray-800 dark:bg-gray-700 rounded px-2 py-0.5 shrink-0 mt-0.5"
                title={`Item ${number}`}
              >
                #{number}
              </span>
              <h3
                className="font-semibold text-base flex-1 leading-snug line-clamp-2"
                title={r?.product_name || item.description}
              >
                {r?.product_name || item.description}
              </h3>
            </div>

            {/* Metadata strip — Qty | Unit | Part No | Manufacturer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs mb-2 border-y border-gray-100 dark:border-gray-800 py-2">
              <MetaCell label="Qty" value={item.quantity ? String(item.quantity) : "—"} mono />
              <MetaCell label="Unit" value={item.unit || "—"} mono />
              <MetaCell
                label="Part No"
                value={r?.part_number_confirmed || item.partNo || "—"}
                mono
                wide
              />
              <MetaCell
                label="Make"
                value={r?.manufacturer || item.manufacturer || "—"}
              />
            </div>

            {/* Optional: original RFQ text shown only if AI re-titled the item */}
            {r?.product_name && r.product_name.toLowerCase() !== item.description.toLowerCase() && (
              <div className="text-[11px] text-gray-500 mb-2 italic line-clamp-2" title={item.description}>
                RFQ text: {item.description}
              </div>
            )}

            {/* AI-enriched badges (price / HS / lead) — only when present */}
            <div className="flex flex-wrap gap-1.5 text-xs mb-2">
              {r?.estimated_price_usd && (
                <Badge className={`${COLOR.success.bg} ${COLOR.success.fg} border ${COLOR.success.border} font-mono tabular-nums`}>
                  ~${r.estimated_price_usd}
                  {r.lead_time && <span className="opacity-70 ms-1 font-sans">· {r.lead_time}</span>}
                </Badge>
              )}
              {r?.hs_code && (
                <Badge variant="outline" className="font-mono">HS {r.hs_code}</Badge>
              )}
            </div>

            {r?.product_description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{r.product_description}</p>
            )}
            {r?.technical_notes && (
              <div className={`text-xs ${COLOR.warn.bg} border ${COLOR.warn.border} ${COLOR.warn.fg} rounded p-2 mb-2 flex gap-2`}>
                <Wrench className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{r.technical_notes}</span>
              </div>
            )}
            {(productPageUrl || datasheetUrl) && (
              <div className="flex flex-wrap gap-3 text-xs">
                {productPageUrl && (
                  <a href={productPageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Product page
                  </a>
                )}
                {datasheetUrl && (
                  <a href={datasheetUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Datasheet (PDF)
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DB-matched suppliers (always shown) */}
        <SectionToggle
          open={openDb}
          onToggle={() => setOpenDb((v) => !v)}
          icon={<Database className={`w-3.5 h-3.5 ${COLOR.success.fg}`} />}
          label="From your supplier database"
          count={matchedDb.length}
          accent="success"
        >
          {matchedDb.length === 0 ? (
            <div className="text-xs text-gray-500 px-4 pb-4">
              No matches in your supplier database for the keywords:{" "}
              <span className="font-mono">
                {(researched?.matchKeywords ?? []).slice(0, 6).join(", ") || "—"}
              </span>
              .{" "}
              <Link href="/rfq/suppliers" className="underline">Add suppliers</Link> to improve matching.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-4 pb-4">
              {matchedDb.map((s) => <DbSupplierRow key={s.id} s={s} />)}
            </div>
          )}
        </SectionToggle>

        {/* Web-researched suppliers (collapsed by default) */}
        {(local.length > 0 || intl.length > 0) && (
          <SectionToggle
            open={openWeb}
            onToggle={() => setOpenWeb((v) => !v)}
            icon={<Globe className="w-3.5 h-3.5 text-blue-600" />}
            label="Suppliers researched online"
            count={local.length + intl.length}
            accent="info"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800">
              <SupplierColumn
                title="Local / Regional"
                icon={<MapPin className={`w-3 h-3 ${COLOR.success.fg}`} />}
                suppliers={local}
              />
              <SupplierColumn
                title="International"
                icon={<Globe className="w-3 h-3 text-blue-600" />}
                suppliers={intl}
              />
            </div>
          </SectionToggle>
        )}

        {/* Alternatives */}
        {alts.length > 0 && (
          <SectionToggle
            open={openAlts}
            onToggle={() => setOpenAlts((v) => !v)}
            icon={<Info className="w-3.5 h-3.5 text-gray-500" />}
            label="Alternative products"
            count={alts.length}
            accent="muted"
          >
            <div className="px-4 pb-4 flex flex-wrap gap-1.5">
              {alts.map((a, idx) => (
                <Badge key={idx} variant="outline" className="text-xs font-normal">
                  {[a.manufacturer, a.part_number || a.name].filter(Boolean).join(" · ")}
                  {a.notes && <span className="opacity-60 ms-1">— {a.notes}</span>}
                </Badge>
              ))}
            </div>
          </SectionToggle>
        )}

        {researched?.error && researched.error !== "no_anthropic_key" && researched.error !== "no_api_key" && (
          <div className={`px-4 py-2 text-xs ${COLOR.error.bg} ${COLOR.error.fg} border-t ${COLOR.error.border} flex items-center gap-2`}>
            <X className="w-3 h-3" /> Research failed: {researched.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionToggle({
  open, onToggle, icon, label, count, accent, children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  accent: "success" | "info" | "muted";
  children: React.ReactNode;
}) {
  const accentBg = accent === "success" ? "bg-[#3B6D11]/5"
                : accent === "info"    ? "bg-blue-50 dark:bg-blue-950/20"
                : "bg-gray-50 dark:bg-gray-900/40";
  return (
    <div className={`border-t border-gray-200 dark:border-gray-800 ${accentBg}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-start hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-gray-700 dark:text-gray-300">
          {icon}
          {label}
          <span className="text-gray-400 font-normal tabular-nums">· {count}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && children}
    </div>
  );
}

function DbSupplierRow({ s }: { s: RfqMatchedDbSupplier }) {
  const websiteUrl = safeUrl(s.website, true);
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{s.name}</div>
          <div className="text-[11px] text-gray-500 truncate">
            {[s.city, s.country].filter(Boolean).join(", ") || "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {s.isLocal && (
            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${COLOR.success.bg} ${COLOR.success.fg}`}>
              Local
            </span>
          )}
          <span className="text-[10px] tabular-nums font-mono text-gray-500" title="Relevance score">
            ★ {s.relevanceScore.toFixed(1)}
          </span>
        </div>
      </div>
      {s.matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {s.matchedKeywords.slice(0, 5).map((kw) => (
            <span key={kw} className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${COLOR.success.bg} ${COLOR.success.fg}`}>
              {kw}
            </span>
          ))}
        </div>
      )}
      <div className="text-[11px] text-gray-600 dark:text-gray-400 space-y-0.5">
        {s.email && (
          <a href={`mailto:${s.email}`} className="flex items-center gap-1 truncate hover:underline">
            <Mail className="w-3 h-3" />{s.email}
          </a>
        )}
        {s.phone && (
          <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:underline">
            <Phone className="w-3 h-3" />{s.phone}
          </a>
        )}
        {websiteUrl && (
          <a href={websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-blue-600 hover:underline">
            <Globe className="w-3 h-3" />{s.website}
          </a>
        )}
      </div>
    </div>
  );
}

function SupplierColumn({
  title, icon, suppliers,
}: {
  title: string;
  icon: React.ReactNode;
  suppliers: RfqResearchSupplier[];
}) {
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500 font-semibold mb-2 flex items-center gap-1">
        {icon}{title} <span className="text-gray-400 font-normal">· {suppliers.length}</span>
      </div>
      {suppliers.length === 0 ? (
        <div className="text-xs text-gray-400">None identified.</div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s, idx) => {
            const ws = safeUrl(s.website, true);
            return (
              <div key={idx} className="text-xs">
                <div className="font-semibold text-sm">
                  {s.name}
                  {s.country && <span className="text-gray-500 font-normal ms-1">· {s.country}</span>}
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 space-y-0.5 mt-0.5">
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="flex items-center gap-1 truncate hover:underline">
                      <Mail className="w-3 h-3" />{s.email}
                    </a>
                  )}
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:underline">
                      <Phone className="w-3 h-3" />{s.phone}
                    </a>
                  )}
                  {ws && (
                    <a href={ws} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-blue-600 hover:underline">
                      <Globe className="w-3 h-3" />{s.website}
                    </a>
                  )}
                  {s.notes && <div className="opacity-70">{s.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
