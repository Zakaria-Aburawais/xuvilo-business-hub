import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { BusinessInfo, ClientInfo, LineItem, DocumentTotals } from "@/types/document";
import { calcLineItemTotal, formatNumber } from "@/lib/calculations";
import { getCurrencySymbol } from "@/lib/pdf-utils";
import { convertNumerals } from "@/utils/numerals";
import type { NumeralStyle } from "@/utils/numerals";
import type { BankDetails } from "@/hooks/useDocumentForm";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logoSection: { flex: 1 },
  logo: { width: 120, height: 60, objectFit: "contain", marginBottom: 6 },
  bizName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  bizDetail: { color: "#555", fontSize: 9, marginBottom: 1 },
  docSection: { alignItems: "flex-end" },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#2563eb", marginBottom: 4 },
  docNumber: { color: "#888", fontSize: 9, marginBottom: 2 },
  clientBox: { backgroundColor: "#f8f9fa", padding: 12, borderRadius: 4, marginBottom: 20 },
  clientLabel: { fontSize: 8, color: "#888", marginBottom: 2 },
  clientName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  clientDetail: { color: "#555", fontSize: 9, marginBottom: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#2563eb", padding: "6 4", color: "white" },
  tableRow: { flexDirection: "row", padding: "5 4", borderBottom: "1 solid #eee" },
  tableRowAlt: { flexDirection: "row", padding: "5 4", backgroundColor: "#f8f9fa", borderBottom: "1 solid #eee" },
  col1: { flex: 2, fontSize: 9 },
  col2: { flex: 0.7, textAlign: "right", fontSize: 9 },
  totalsSection: { alignItems: "flex-end", marginTop: 10 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 180, marginBottom: 3 },
  totalLabel: { color: "#555", fontSize: 9 },
  totalValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  separator: { borderTop: "1 solid #ddd", width: 180, marginVertical: 4 },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", width: 180 },
  grandTotalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  notesLabel: { fontSize: 8, color: "#888", marginBottom: 2 },
  notesText: { fontSize: 9, color: "#444" },
  notesSection: { marginTop: 16 },
  footer: { marginTop: 24, paddingTop: 8, borderTop: "1 solid #eee" },
  bankBox: { marginTop: 14, padding: "10 12", backgroundColor: "#f8f9fa", borderRadius: 4 },
  bankLabel: { fontSize: 8, color: "#888", marginBottom: 6 },
  bankRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  bankRowLabel: { fontSize: 8, color: "#888" },
  bankRowValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111" },
});

interface InvoicePDFProps {
  type: "invoice" | "quotation";
  businessInfo: BusinessInfo;
  clientInfo: ClientInfo;
  docNumber: string;
  issueDate: string;
  dueOrValidityDate: string;
  dueOrValidityLabel: string;
  currency: string;
  lineItems: LineItem[];
  totals: DocumentTotals;
  notes: string;
  paymentDetails?: string;
  signatureFooter?: string;
  terms?: string;
  zatcaQR?: string;
  numeralStyle?: NumeralStyle;
  paymentLink?: string;
  paymentQR?: string;
  bankDetails?: BankDetails;
  watermark?: string;
}

export function InvoicePDF({
  type,
  businessInfo,
  clientInfo,
  docNumber,
  issueDate,
  dueOrValidityDate,
  dueOrValidityLabel,
  currency,
  lineItems,
  totals,
  notes,
  paymentDetails,
  signatureFooter,
  terms,
  zatcaQR,
  numeralStyle = "western",
  paymentLink,
  paymentQR,
  bankDetails,
  watermark,
}: InvoicePDFProps) {
  const sym = getCurrencySymbol(currency);
  const title = type === "invoice" ? "INVOICE" : "QUOTATION";
  const fmt = (n: number) => convertNumerals(formatNumber(n), numeralStyle);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {businessInfo.logoUrl && (
              <Image style={styles.logo} src={businessInfo.logoUrl} />
            )}
            <Text style={styles.bizName}>{businessInfo.name || "Business Name"}</Text>
            {businessInfo.address && <Text style={styles.bizDetail}>{businessInfo.address}</Text>}
            {businessInfo.phone && <Text style={styles.bizDetail}>{businessInfo.phone}</Text>}
            {businessInfo.email && <Text style={styles.bizDetail}>{businessInfo.email}</Text>}
            {businessInfo.vatNumber && <Text style={styles.bizDetail}>VAT: {businessInfo.vatNumber}</Text>}
          </View>
          <View style={styles.docSection}>
            <Text style={styles.docTitle}>{title}</Text>
            <Text style={styles.docNumber}>#{docNumber}</Text>
            <Text style={styles.docNumber}>Date: {issueDate}</Text>
            {dueOrValidityDate && <Text style={styles.docNumber}>{dueOrValidityLabel}: {dueOrValidityDate}</Text>}
            <Text style={styles.docNumber}>{currency}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={styles.clientBox}>
          <Text style={styles.clientLabel}>BILL TO</Text>
          <Text style={styles.clientName}>{clientInfo.name || "Client Name"}</Text>
          {clientInfo.company && <Text style={styles.clientDetail}>{clientInfo.company}</Text>}
          {clientInfo.address && <Text style={styles.clientDetail}>{clientInfo.address}</Text>}
          {clientInfo.phone && <Text style={styles.clientDetail}>{clientInfo.phone}</Text>}
          {clientInfo.email && <Text style={styles.clientDetail}>{clientInfo.email}</Text>}
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Description</Text>
          <Text style={styles.col2}>Qty</Text>
          <Text style={styles.col2}>Unit Price</Text>
          <Text style={styles.col2}>Disc %</Text>
          <Text style={styles.col2}>Tax %</Text>
          <Text style={styles.col2}>Total</Text>
        </View>

        {/* Table rows */}
        {lineItems.map((item, i) => (
          <View key={item.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.col1}>{item.description || "—"}</Text>
            <Text style={styles.col2}>{convertNumerals(String(item.quantity), numeralStyle)}</Text>
            <Text style={styles.col2}>{sym} {fmt(item.unitPrice)}</Text>
            <Text style={styles.col2}>{convertNumerals(String(item.discountPct), numeralStyle)}%</Text>
            <Text style={styles.col2}>{convertNumerals(String(item.taxPct), numeralStyle)}%</Text>
            <Text style={styles.col2}>{sym} {fmt(calcLineItemTotal(item))}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{sym} {fmt(totals.subtotal)}</Text>
          </View>
          {totals.discountTotal > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>- {sym} {fmt(totals.discountTotal)}</Text>
            </View>
          )}
          {totals.taxTotal > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>+ {sym} {fmt(totals.taxTotal)}</Text>
            </View>
          )}
          <View style={styles.separator} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{sym} {fmt(totals.grandTotal)}</Text>
          </View>
        </View>

        {/* Payment Link */}
        {paymentLink && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>PAY ONLINE</Text>
            <Text style={{ fontSize: 9, color: "#2563eb" }}>{paymentLink}</Text>
          </View>
        )}

        {/* Bank Details */}
        {bankDetails?.enabled && (
          <View style={styles.bankBox}>
            <Text style={styles.bankLabel}>BANK TRANSFER DETAILS</Text>
            {bankDetails.bankName ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankRowLabel}>Bank</Text>
                <Text style={styles.bankRowValue}>{bankDetails.bankName}</Text>
              </View>
            ) : null}
            {bankDetails.accountName ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankRowLabel}>Account Holder</Text>
                <Text style={styles.bankRowValue}>{bankDetails.accountName}</Text>
              </View>
            ) : null}
            {bankDetails.accountNumber ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankRowLabel}>Account Number</Text>
                <Text style={styles.bankRowValue}>{bankDetails.accountNumber}</Text>
              </View>
            ) : null}
            {bankDetails.iban ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankRowLabel}>IBAN</Text>
                <Text style={styles.bankRowValue}>{bankDetails.iban}</Text>
              </View>
            ) : null}
            {bankDetails.swift ? (
              <View style={styles.bankRow}>
                <Text style={styles.bankRowLabel}>SWIFT/BIC</Text>
                <Text style={styles.bankRowValue}>{bankDetails.swift}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Notes / Payment / Terms */}
        {notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <Text style={styles.notesText}>{notes}</Text>
          </View>
        ) : null}
        {paymentDetails ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>PAYMENT DETAILS</Text>
            <Text style={styles.notesText}>{paymentDetails}</Text>
          </View>
        ) : null}
        {terms ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>TERMS & CONDITIONS</Text>
            <Text style={styles.notesText}>{terms}</Text>
          </View>
        ) : null}
        {(signatureFooter || zatcaQR || paymentQR) ? (
          <View style={styles.footer}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              {/* Left: signature */}
              {signatureFooter ? (
                <Text style={{ fontSize: 9, color: "#888", maxWidth: 220 }}>{signatureFooter}</Text>
              ) : <View />}

              {/* Right: QR codes */}
              {(zatcaQR || paymentQR) ? (
                <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-end" }}>

                  {paymentQR ? (
                    <View style={{
                      alignItems: "center",
                      border: "1 solid #E5E7EB",
                      borderRadius: 6,
                      padding: "8 10",
                      backgroundColor: "#FAFAFA",
                    }}>
                      <Text style={{ fontSize: 7, color: "#6B7280", marginBottom: 5, textAlign: "center", letterSpacing: 0.3 }}>
                        SCAN TO PAY
                      </Text>
                      <Image src={paymentQR} style={{ width: 72, height: 72 }} />
                      <Text style={{ fontSize: 7, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                        للدفع امسح الرمز
                      </Text>
                    </View>
                  ) : null}

                  {zatcaQR ? (
                    <View style={{
                      alignItems: "center",
                      border: "1 solid #BBF7D0",
                      borderRadius: 6,
                      padding: "8 10",
                      backgroundColor: "#F0FDF4",
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 5 }}>
                        <Text style={{ fontSize: 7, color: "#15803D", letterSpacing: 0.3 }}>ZATCA</Text>
                        <Text style={{ fontSize: 7, color: "#15803D", fontFamily: "Helvetica-Bold" }}>✓ COMPLIANT</Text>
                      </View>
                      <Image src={zatcaQR} style={{ width: 72, height: 72 }} />
                      <Text style={{ fontSize: 7, color: "#6B7280", marginTop: 4, textAlign: "center" }}>
                        Scan to Verify / للتحقق امسح
                      </Text>
                    </View>
                  ) : null}

                </View>
              ) : null}
            </View>
          </View>
        ) : null}
        {watermark ? (
          <Text
            fixed
            style={{
              position: "absolute",
              bottom: 12,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 7,
              color: "#9CA3AF",
              letterSpacing: 0.4,
            }}
          >
            {watermark}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
