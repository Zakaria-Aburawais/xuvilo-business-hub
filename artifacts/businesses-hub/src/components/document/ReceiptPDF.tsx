import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { BusinessInfo } from "@/types/document";
import { formatNumber } from "@/lib/calculations";
import { getCurrencySymbol } from "@/lib/pdf-utils";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 120, height: 60, objectFit: "contain", marginBottom: 6 },
  bizName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  bizDetail: { color: "#555", fontSize: 9, marginBottom: 1 },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#2563eb", marginBottom: 4 },
  docNumber: { color: "#888", fontSize: 9 },
  infoBox: { backgroundColor: "#f8f9fa", padding: 16, borderRadius: 4, marginBottom: 24 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoItem: { width: "50%", marginBottom: 12 },
  infoLabel: { fontSize: 8, color: "#888", marginBottom: 2 },
  infoValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  amountSection: { alignItems: "center", padding: 32 },
  amountLabel: { fontSize: 9, color: "#888", marginBottom: 6 },
  amountValue: { fontSize: 32, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  amountCurrency: { fontSize: 11, color: "#888", marginTop: 4 },
  notesSection: { marginTop: 16, paddingTop: 12, borderTop: "1 solid #eee" },
  notesLabel: { fontSize: 8, color: "#888", marginBottom: 2 },
  notesText: { fontSize: 9, color: "#444" },
});

interface ReceiptPDFProps {
  businessInfo: BusinessInfo;
  receiptNumber: string;
  date: string;
  payerName: string;
  amountReceived: number;
  currency: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  watermark?: string;
}

export function ReceiptPDF({
  businessInfo,
  receiptNumber,
  date,
  payerName,
  amountReceived,
  currency,
  paymentMethod,
  referenceNumber,
  notes,
  watermark,
}: ReceiptPDFProps) {
  const sym = getCurrencySymbol(currency);

  const pmLabels: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    card: "Card",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {businessInfo.logoUrl && <Image style={styles.logo} src={businessInfo.logoUrl} />}
            <Text style={styles.bizName}>{businessInfo.name || "Business Name"}</Text>
            {businessInfo.address && <Text style={styles.bizDetail}>{businessInfo.address}</Text>}
            {businessInfo.phone && <Text style={styles.bizDetail}>{businessInfo.phone}</Text>}
            {businessInfo.email && <Text style={styles.bizDetail}>{businessInfo.email}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.docTitle}>RECEIPT</Text>
            <Text style={styles.docNumber}>#{receiptNumber}</Text>
            <Text style={styles.docNumber}>{date}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>RECEIVED FROM</Text>
              <Text style={styles.infoValue}>{payerName || "—"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PAYMENT METHOD</Text>
              <Text style={styles.infoValue}>{pmLabels[paymentMethod] ?? paymentMethod}</Text>
            </View>
            {referenceNumber ? (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>REFERENCE</Text>
                <Text style={styles.infoValue}>{referenceNumber}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>AMOUNT RECEIVED</Text>
          <Text style={styles.amountValue}>{sym} {formatNumber(amountReceived)}</Text>
          <Text style={styles.amountCurrency}>{currency}</Text>
        </View>

        {notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <Text style={styles.notesText}>{notes}</Text>
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
