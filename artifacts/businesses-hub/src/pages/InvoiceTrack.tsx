import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useLocation } from "wouter";
import { CheckCircle2, MessageCircle, Download, AlertCircle, Loader2, X, ArrowLeft } from "lucide-react";
import { getTrackedInvoice, updateInvoiceStatus, type InvoiceTrackEntry } from "@/utils/invoiceTracking";
import { InvoicePreview } from "@/components/document/DocumentPreview";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/document/InvoicePDF";
import { useToast } from "@/hooks/use-toast";

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Confirm Receipt / تأكيد الاستلام
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Confirm you have received this invoice?
          <br />
          <span dir="rtl" className="block mt-1">هل تؤكد استلام هذه الفاتورة؟</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel / إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
          >
            Confirm / تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

function ThankYouBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-emerald-600 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Thank you! The sender has been notified.</p>
          <p dir="rtl" className="text-xs text-emerald-100 mt-0.5">شكراً! تم إخطار المُرسِل.</p>
        </div>
        <button onClick={onDismiss} className="text-emerald-200 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function InvoiceTrackPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [entry, setEntry] = useState<InvoiceTrackEntry | null | "loading">("loading");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) { setEntry(null); return; }
    const found = getTrackedInvoice(id);
    setEntry(found);
    if (found && found.status === "sent") {
      updateInvoiceStatus(id, "seen");
      setEntry({ ...found, status: "seen" });
    }
  }, [id]);

  const handleConfirmReceipt = () => {
    if (!id) return;
    updateInvoiceStatus(id, "confirmed");
    setEntry(prev => prev && typeof prev !== "string" ? { ...prev, status: "confirmed" } : prev);
    setShowConfirmModal(false);
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 6000);
  };

  const handleSendMessage = () => {
    if (!entry || typeof entry === "string") return;
    const businessPhone = entry.invoiceData.businessInfo?.phone ?? "";
    const phone = businessPhone.replace(/\D/g, "");
    const msg = `مرحباً، لقد استلمت الفاتورة رقم ${entry.invoiceData.docNumber || id}. شكراً!\n\nHello, I received invoice #${entry.invoiceData.docNumber || id}. Thank you!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleDownloadPDF = async () => {
    if (!entry || typeof entry === "string") return;
    setGenerating(true);
    try {
      const d = entry.invoiceData;
      const blob = await pdf(
        <InvoicePDF
          type="invoice"
          businessInfo={d.businessInfo}
          clientInfo={d.clientInfo}
          docNumber={d.docNumber}
          issueDate={d.issueDate}
          dueOrValidityDate={d.dueOrValidityDate}
          dueOrValidityLabel="Due Date"
          currency={d.currency}
          lineItems={d.lineItems}
          totals={d.totals}
          notes={d.notes}
          paymentDetails={d.paymentDetails}
          signatureFooter={d.signatureFooter}
          zatcaQR={d.zatcaQR}
          numeralStyle={d.numeralStyle}
          paymentLink={d.paymentLink}
          paymentQR={d.paymentQR}
          bankDetails={d.bankDetails}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${d.docNumber || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error", description: "Could not generate PDF.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (entry === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Invoice Not Found
          </h1>
          <p dir="rtl" className="text-gray-500 dark:text-gray-400 mb-1 text-sm">الفاتورة غير موجودة</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-3">
            Invoice ID: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{id}</code>
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
            This link is only valid on the device where it was created.
          </p>
          <button
            onClick={() => navigate("/tools/tracker")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tracker
          </button>
        </div>
      </div>
    );
  }

  const d = entry.invoiceData;
  const statusColor =
    entry.status === "confirmed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
    entry.status === "seen"      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" :
    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  const statusLabel =
    entry.status === "confirmed" ? "✅ Confirmed / مؤكد" :
    entry.status === "seen"      ? "👁 Seen / تمت المشاهدة" :
    entry.status === "paid"      ? "💰 Paid / مدفوع" :
    "📤 Sent / مُرسَل";

  return (
    <>
      <Helmet>
        <title>Invoice {d.docNumber} — View & Confirm</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/tools/tracker")}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Back to Tracker"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Tracker</span>
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Invoice / فاتورة</p>
                  <p className="font-bold text-gray-900 dark:text-white">{d.docNumber || id}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={entry.status === "confirmed"}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-1 sm:flex-none justify-center"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Receipt</span>
                <span className="hidden sm:inline" dir="rtl">/ تأكيد الاستلام</span>
              </button>

              <button
                onClick={handleSendMessage}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl transition-colors flex-1 sm:flex-none justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Message</span>
                <span className="hidden sm:inline" dir="rtl">/ إرسال رسالة</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl transition-colors flex-1 sm:flex-none justify-center"
              >
                {generating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />
                }
                <span>Download PDF</span>
                <span className="hidden sm:inline" dir="rtl">/ تحميل PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Invoice preview */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6">
              <InvoicePreview
                type="invoice"
                template={d.template}
                businessInfo={d.businessInfo}
                clientInfo={d.clientInfo}
                docNumber={d.docNumber}
                issueDate={d.issueDate}
                dueOrValidityDate={d.dueOrValidityDate}
                dueOrValidityLabel="Due Date"
                currency={d.currency}
                lineItems={d.lineItems}
                totals={d.totals}
                notes={d.notes}
                paymentDetails={d.paymentDetails}
                signatureFooter={d.signatureFooter}
                zatcaQR={d.zatcaQR}
                numeralStyle={d.numeralStyle}
                paymentLink={d.paymentLink}
                bankDetails={d.bankDetails}
              />
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
            Powered by{" "}
            <a href="/" className="hover:underline text-blue-500">Xuvilo</a>
            {" "}— Free invoice generator for businesses around the world
          </p>
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmModal
          onConfirm={handleConfirmReceipt}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {showThankYou && <ThankYouBanner onDismiss={() => setShowThankYou(false)} />}
    </>
  );
}
