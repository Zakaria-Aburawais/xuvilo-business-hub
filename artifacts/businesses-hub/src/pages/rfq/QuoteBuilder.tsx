import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Save, Send, FileDown, Plus, Trash2, Loader2, ArrowLeft,
} from "lucide-react";
import {
  createQuote, updateQuote, getQuote, attachQuotePdf, sendQuoteEmail,
  getRfqDocument, fileToBase64, type RfqQuote, type RfqLineItem,
} from "@/lib/rfqApi";
import { getCompanyProfile, type CompanyProfile } from "@/lib/savedDocsApi";
import jsPDF from "jspdf";

type LineRow = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  notes?: string;
};

const blankRow: LineRow = { description: "", quantity: 1, unit: "PC", unitPrice: 0, total: 0 };

export default function QuoteBuilderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [matchNew] = useRoute("/rfq/quote/new");
  const [matchEdit, editParams] = useRoute("/rfq/quote/:id");
  const quoteId = matchEdit ? editParams?.id : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [quote, setQuote] = useState<Partial<RfqQuote>>({
    quoteNumber: "",
    rfqReference: "",
    subject: "",
    quoteDate: new Date().toISOString().slice(0, 10),
    validUntil: "",
    currency: "USD",
    subtotal: 0,
    discount: 0,
    total: 0,
    status: "draft",
    lineItems: [],
    commercialTerms: { paymentTerms: "", deliveryTerms: "", warranty: "", notes: "" },
    notes: "",
  });
  const [lines, setLines] = useState<LineRow[]>([{ ...blankRow }]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: "", cc: "", subject: "", message: "" });

  // Initial load
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    void (async () => {
      try {
        const cp = await getCompanyProfile().catch(() => null);
        setProfile(cp);
        if (quoteId) {
          const q = await getQuote(quoteId);
          setQuote(q);
          setLines(q.lineItems.length ? q.lineItems : [{ ...blankRow }]);
        } else if (matchNew) {
          // From RFQ?
          const rfqId = new URLSearchParams(window.location.search).get("rfq");
          if (rfqId) {
            const rfq = await getRfqDocument(rfqId);
            const items = (rfq.parsedData?.items as RfqLineItem[] | undefined) ?? [];
            setQuote((q) => ({
              ...q,
              rfqDocumentId: rfq.id,
              clientId: rfq.clientId,
              rfqReference: rfq.rfqNumber || rfq.sourceFilename,
              subject: `Quotation for RFQ ${rfq.rfqNumber || rfq.sourceFilename}`,
              currency: rfq.currency || cp?.defaultCurrency || "USD",
              commercialTerms: {
                paymentTerms: rfq.paymentTerms || "",
                deliveryTerms: rfq.deliveryTerms || "",
              },
            }));
            const seeded: LineRow[] = items.map((it) => ({
              description: it.description,
              quantity: it.quantity || 1,
              unit: it.unit || "PC",
              unitPrice: it.research?.estimatedUnitCost ?? 0,
              total: (it.research?.estimatedUnitCost ?? 0) * (it.quantity || 1),
              notes: it.notes,
            }));
            if (seeded.length) setLines(seeded);
          }
        }
      } catch (err) {
        toast({ title: "Failed to load quote", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, quoteId, matchNew, toast]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0), [lines]);
  const discount = Number(quote.discount ?? 0) || 0;
  const total = Math.max(0, subtotal - discount);

  const updateLine = useCallback((idx: number, patch: Partial<LineRow>) => {
    setLines((rows) => rows.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, ...patch };
      next.total = (Number(next.quantity) || 0) * (Number(next.unitPrice) || 0);
      return next;
    }));
  }, []);
  const addLine = useCallback(() => setLines((r) => [...r, { ...blankRow }]), []);
  const removeLine = useCallback((idx: number) => setLines((r) => r.filter((_, i) => i !== idx)), []);

  const persist = useCallback(async (extra: Partial<RfqQuote> = {}): Promise<RfqQuote | null> => {
    setSaving(true);
    try {
      const payload: Partial<RfqQuote> = {
        ...quote,
        ...extra,
        lineItems: lines,
        subtotal, discount, total,
      };
      const saved = quoteId
        ? await updateQuote(quoteId, payload)
        : await createQuote(payload);
      setQuote(saved);
      if (!quoteId) navigate(`/rfq/quote/${saved.id}`, { replace: true });
      toast({ title: "Quote saved" });
      return saved;
    } catch (err) {
      toast({ title: "Save failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
      return null;
    } finally {
      setSaving(false);
    }
  }, [quote, lines, subtotal, discount, total, quoteId, navigate, toast]);

  const generatePdf = useCallback((): Blob => {
    const doc = new jsPDF();
    const M = 14;
    let y = 18;
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("QUOTATION", M, y);
    y += 8;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Quote #: ${quote.quoteNumber || "—"}`, M, y);
    doc.text(`Date: ${quote.quoteDate || ""}`, 140, y);
    y += 6;
    doc.text(`RFQ Ref: ${quote.rfqReference || "—"}`, M, y);
    doc.text(`Valid Until: ${quote.validUntil || ""}`, 140, y);
    y += 10;

    if (profile) {
      doc.setFont("helvetica", "bold");
      doc.text(profile.companyName || "", M, y); y += 5;
      doc.setFont("helvetica", "normal");
      if (profile.address) { doc.text(profile.address, M, y); y += 5; }
      if (profile.email) { doc.text(profile.email, M, y); y += 5; }
      y += 4;
    }

    if (quote.subject) {
      doc.setFont("helvetica", "bold");
      doc.text("Subject:", M, y); y += 5;
      doc.setFont("helvetica", "normal");
      const sub = doc.splitTextToSize(quote.subject, 180);
      doc.text(sub, M, y); y += sub.length * 5 + 4;
    }

    // Table header
    const cols = [
      { label: "#", x: M, w: 8, align: "left" as const },
      { label: "Description", x: M + 10, w: 90, align: "left" as const },
      { label: "Qty", x: M + 105, w: 14, align: "right" as const },
      { label: "Unit", x: M + 120, w: 14, align: "left" as const },
      { label: "Price", x: M + 136, w: 22, align: "right" as const },
      { label: "Total", x: M + 162, w: 24, align: "right" as const },
    ];
    doc.setFillColor(240, 240, 245); doc.rect(M - 2, y - 4, 188, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    cols.forEach((c) => doc.text(c.label, c.x, y, { align: c.align }));
    y += 6;
    doc.setFont("helvetica", "normal");

    lines.forEach((line, i) => {
      const desc = doc.splitTextToSize(line.description || "—", 88);
      const lineH = Math.max(desc.length * 4.5, 6);
      if (y + lineH > 270) { doc.addPage(); y = 20; }
      doc.text(String(i + 1), cols[0]!.x, y);
      doc.text(desc, cols[1]!.x, y);
      doc.text(String(line.quantity), cols[2]!.x, y, { align: "right" });
      doc.text(String(line.unit), cols[3]!.x, y);
      doc.text(line.unitPrice.toFixed(2), cols[4]!.x, y, { align: "right" });
      doc.text(line.total.toFixed(2), cols[5]!.x, y, { align: "right" });
      y += lineH + 2;
    });

    y += 4;
    doc.setDrawColor(180); doc.line(M, y, 196, y); y += 6;
    const cur = quote.currency || "USD";
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal: ${cur} ${subtotal.toFixed(2)}`, 196, y, { align: "right" }); y += 5;
    if (discount > 0) { doc.text(`Discount: ${cur} ${discount.toFixed(2)}`, 196, y, { align: "right" }); y += 5; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`TOTAL: ${cur} ${total.toFixed(2)}`, 196, y, { align: "right" });
    y += 10;

    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const ct = quote.commercialTerms || {};
    [
      ["Payment Terms", ct.paymentTerms],
      ["Delivery Terms", ct.deliveryTerms],
      ["Warranty", ct.warranty],
      ["Notes", quote.notes],
    ].forEach(([label, val]) => {
      if (val) {
        doc.setFont("helvetica", "bold"); doc.text(`${label}:`, M, y); y += 4;
        doc.setFont("helvetica", "normal");
        const split = doc.splitTextToSize(String(val), 180);
        doc.text(split, M, y); y += split.length * 4 + 3;
        if (y > 270) { doc.addPage(); y = 20; }
      }
    });

    if (quote.signatoryName) {
      y = Math.min(y + 10, 260);
      doc.setFont("helvetica", "bold"); doc.text(quote.signatoryName, M, y); y += 4;
      doc.setFont("helvetica", "normal");
      if (quote.signatoryTitle) { doc.text(quote.signatoryTitle, M, y); }
    }

    return doc.output("blob");
  }, [quote, lines, profile, subtotal, discount, total]);

  const handleDownloadPdf = useCallback(async () => {
    const blob = generatePdf();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quote.quoteNumber || "quote"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatePdf, quote.quoteNumber]);

  const handleSend = useCallback(async () => {
    const saved = await persist();
    if (!saved) return;
    setSending(true);
    try {
      const blob = generatePdf();
      const buf = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await attachQuotePdf(saved.id, { filename: `${saved.quoteNumber}.pdf`, dataBase64: b64 });
      await sendQuoteEmail(saved.id, emailForm);
      toast({ title: "Quote sent", description: `Email delivered to ${emailForm.to}` });
      setEmailDialog(false);
      const updated = await getQuote(saved.id);
      setQuote(updated);
    } catch (err) {
      toast({ title: "Send failed", description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [persist, generatePdf, emailForm, toast]);

  if (!user) {
    return <AppLayout><div className="max-w-2xl mx-auto p-12 text-center">Please <Link href="/login" className="underline">sign in</Link>.</div></AppLayout>;
  }
  if (loading) {
    return <AppLayout><div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <Helmet><title>Quote Builder — Xuvilo</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link href="/rfq"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 me-1" /> RFQs</Button></Link>
            <h1 className="text-2xl font-bold">Quote Builder</h1>
            {quote.status && <Badge variant="outline">{quote.status}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadPdf}><FileDown className="w-4 h-4 me-1" /> PDF</Button>
            <Button variant="outline" onClick={() => persist()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Save className="w-4 h-4 me-1" />} Save
            </Button>
            <Button onClick={() => { setEmailForm((f) => ({ ...f, subject: f.subject || `Quotation ${quote.quoteNumber || ""}`.trim() })); setEmailDialog(true); }}>
              <Send className="w-4 h-4 me-1" /> Send
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Quote details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Labeled label="Quote #"><Input value={quote.quoteNumber ?? ""} onChange={(e) => setQuote({ ...quote, quoteNumber: e.target.value })} placeholder="Auto" /></Labeled>
            <Labeled label="RFQ Ref"><Input value={quote.rfqReference ?? ""} onChange={(e) => setQuote({ ...quote, rfqReference: e.target.value })} /></Labeled>
            <Labeled label="Date"><Input type="date" value={quote.quoteDate ?? ""} onChange={(e) => setQuote({ ...quote, quoteDate: e.target.value })} /></Labeled>
            <Labeled label="Valid Until"><Input type="date" value={quote.validUntil ?? ""} onChange={(e) => setQuote({ ...quote, validUntil: e.target.value })} /></Labeled>
            <Labeled label="Currency"><Input value={quote.currency ?? ""} onChange={(e) => setQuote({ ...quote, currency: e.target.value.toUpperCase().slice(0, 8) })} /></Labeled>
            <Labeled label="Discount"><Input type="number" value={quote.discount ?? 0} onChange={(e) => setQuote({ ...quote, discount: Number(e.target.value) || 0 })} /></Labeled>
            <Labeled label="Subject" className="sm:col-span-2 lg:col-span-2"><Input value={quote.subject ?? ""} onChange={(e) => setQuote({ ...quote, subject: e.target.value })} /></Labeled>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-4 h-4 me-1" /> Add line</Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 px-1 text-start text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                  <th className="py-2 px-1 text-start text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="py-2 px-1 text-end text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                  <th className="py-2 px-1 text-start text-xs font-semibold text-gray-500 uppercase w-20">Unit</th>
                  <th className="py-2 px-1 text-end text-xs font-semibold text-gray-500 uppercase w-28">Price</th>
                  <th className="py-2 px-1 text-end text-xs font-semibold text-gray-500 uppercase w-28">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="py-1 px-1 text-xs text-gray-500">{i + 1}</td>
                    <td className="py-1 px-1"><Input value={row.description} onChange={(e) => updateLine(i, { description: e.target.value })} className="h-8" /></td>
                    <td className="py-1 px-1"><Input type="number" value={row.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 0 })} className="h-8 text-end" /></td>
                    <td className="py-1 px-1"><Input value={row.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} className="h-8" /></td>
                    <td className="py-1 px-1"><Input type="number" value={row.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) || 0 })} className="h-8 text-end" /></td>
                    <td className="py-1 px-1 text-end font-mono text-sm">{row.total.toFixed(2)}</td>
                    <td className="py-1 px-1"><Button size="sm" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-gray-800">
                  <td colSpan={5} className="py-2 px-1 text-end font-semibold">Subtotal</td>
                  <td className="py-2 px-1 text-end font-mono">{subtotal.toFixed(2)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={5} className="py-1 px-1 text-end text-sm">Discount</td>
                  <td className="py-1 px-1 text-end font-mono">{discount.toFixed(2)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={5} className="py-2 px-1 text-end font-bold">TOTAL ({quote.currency})</td>
                  <td className="py-2 px-1 text-end font-mono font-bold">{total.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Commercial terms</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Labeled label="Payment Terms"><Textarea rows={2} value={quote.commercialTerms?.paymentTerms ?? ""} onChange={(e) => setQuote({ ...quote, commercialTerms: { ...quote.commercialTerms, paymentTerms: e.target.value } })} /></Labeled>
            <Labeled label="Delivery Terms"><Textarea rows={2} value={quote.commercialTerms?.deliveryTerms ?? ""} onChange={(e) => setQuote({ ...quote, commercialTerms: { ...quote.commercialTerms, deliveryTerms: e.target.value } })} /></Labeled>
            <Labeled label="Warranty"><Textarea rows={2} value={quote.commercialTerms?.warranty ?? ""} onChange={(e) => setQuote({ ...quote, commercialTerms: { ...quote.commercialTerms, warranty: e.target.value } })} /></Labeled>
            <Labeled label="Internal notes"><Textarea rows={2} value={quote.notes ?? ""} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} /></Labeled>
          </CardContent>
        </Card>
      </div>

      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send quote by email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Labeled label="To"><Input value={emailForm.to} onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })} placeholder="customer@example.com" /></Labeled>
            <Labeled label="Cc"><Input value={emailForm.cc} onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })} placeholder="optional" /></Labeled>
            <Labeled label="Subject"><Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} /></Labeled>
            <Labeled label="Message"><Textarea rows={4} value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} /></Labeled>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !emailForm.to}>
              {sending ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Send className="w-4 h-4 me-1" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Labeled({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase text-gray-500 font-semibold mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
