import QRCode from "qrcode";

export interface ZATCAInvoiceData {
  sellerName: string;
  vatNumber: string;
  invoiceDate: string;
  totalWithVAT: number;
  vatAmount: number;
}

function tlvField(tag: number, value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  const result = new Uint8Array(2 + encoded.length);
  result[0] = tag;
  result[1] = encoded.length;
  result.set(encoded, 2);
  return result;
}

export function buildZATCABase64(data: ZATCAInvoiceData): string {
  const fields = [
    tlvField(1, data.sellerName),
    tlvField(2, data.vatNumber),
    tlvField(3, data.invoiceDate),
    tlvField(4, data.totalWithVAT.toFixed(2)),
    tlvField(5, data.vatAmount.toFixed(2)),
  ];
  let total = 0;
  fields.forEach((f) => (total += f.length));
  const combined = new Uint8Array(total);
  let offset = 0;
  fields.forEach((f) => { combined.set(f, offset); offset += f.length; });
  let binary = "";
  for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
  return btoa(binary);
}

export async function generateZATCAQRCode(data: ZATCAInvoiceData): Promise<string> {
  const payload = buildZATCABase64(data);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
