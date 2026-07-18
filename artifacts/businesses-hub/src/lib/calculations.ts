import type { LineItem, DocumentTotals } from "@/types/document";

export function calcLineItemTotal(item: LineItem): number {
  const base = item.quantity * item.unitPrice;
  const discountAmt = base * (item.discountPct / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (item.taxPct / 100);
  return afterDiscount + taxAmt;
}

export function calcDocumentTotals(items: LineItem[]): DocumentTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const base = item.quantity * item.unitPrice;
    const discountAmt = base * (item.discountPct / 100);
    const afterDiscount = base - discountAmt;
    const taxAmt = afterDiscount * (item.taxPct / 100);

    subtotal += base;
    discountTotal += discountAmt;
    taxTotal += taxAmt;
  }

  const grandTotal = subtotal - discountTotal + taxTotal;

  return { subtotal, discountTotal, taxTotal, grandTotal };
}

export function formatCurrency(amount: number, currency: string, locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(amount: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Calculators
export function calcProfitMargin(cost: number, revenue: number) {
  if (revenue === 0) return { profit: 0, margin: 0, markup: 0 };
  const profit = revenue - cost;
  const margin = (profit / revenue) * 100;
  const markup = cost > 0 ? (profit / cost) * 100 : 0;
  return { profit, margin, markup };
}

export function calcDiscount(originalPrice: number, discountPct: number) {
  const discountAmt = originalPrice * (discountPct / 100);
  const finalPrice = originalPrice - discountAmt;
  return { discountAmt, finalPrice, savings: discountAmt };
}

/**
 * Calculate VAT / tax for a given amount and rate.
 *
 * "add"     – amount is the NET price (exclusive of tax)
 *             → vatAmount = amount × (rate / 100)
 *             → gross     = amount + vatAmount
 *
 * "extract" – amount is the GROSS price (inclusive of tax)
 *             → net       = amount / (1 + rate / 100)
 *             → vatAmount = amount − net
 *
 * Returns null when inputs are invalid (non-positive amount or negative rate).
 */
export function calcVAT(
  amount: number,
  rate: number,
  mode: "add" | "extract"
): { net: number; vatAmount: number; gross: number } | null {
  if (!isFinite(amount) || amount <= 0) return null;
  if (!isFinite(rate) || rate < 0 || rate > 100) return null;

  if (mode === "add") {
    const vatAmount = amount * (rate / 100);
    return { net: amount, vatAmount, gross: amount + vatAmount };
  } else {
    const net = amount / (1 + rate / 100);
    const vatAmount = amount - net;
    return { net, vatAmount, gross: amount };
  }
}

export function calcCBM(
  length: number,
  width: number,
  height: number,
  quantity: number,
  actualWeight: number
) {
  const cbmPerUnit = (length * width * height) / 1_000_000;
  const totalCBM = cbmPerUnit * quantity;
  const volumetricWeight = totalCBM * 167; // standard: 1 CBM = 167 kg
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);
  return { cbmPerUnit, totalCBM, volumetricWeight, chargeableWeight };
}

export function calcOvertime(
  hourlyRate: number,
  regularHours: number,
  overtimeHours: number,
  multiplier: number
) {
  const regularPay = hourlyRate * regularHours;
  const overtimePay = hourlyRate * multiplier * overtimeHours;
  const total = regularPay + overtimePay;
  return { regularPay, overtimePay, total };
}

export function calcLeaveBalance(
  annualEntitlement: number,
  daysTaken: number,
  monthsWorked: number
) {
  const accrued = (annualEntitlement / 12) * monthsWorked;
  const remaining = accrued - daysTaken;
  return { accrued, remaining };
}

export function calcBreakEven(fixedCosts: number, variableCostPerUnit: number, pricePerUnit: number) {
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  if (contributionMargin <= 0) return null;
  const bepUnits = fixedCosts / contributionMargin;
  const bepRevenue = bepUnits * pricePerUnit;
  const contributionRatio = (contributionMargin / pricePerUnit) * 100;
  return { bepUnits, bepRevenue, contributionMargin, contributionRatio };
}

export function calcLoan(principal: number, annualRatePct: number, years: number) {
  if (principal <= 0 || years <= 0) return null;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) {
    return { monthly: principal / n, total: principal, totalInterest: 0 };
  }
  const monthly = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = monthly * n;
  return { monthly, total, totalInterest: total - principal };
}

export function markupToMargin(markupPct: number): number {
  return (markupPct / (100 + markupPct)) * 100;
}

export function marginToMarkup(marginPct: number): number | null {
  if (marginPct >= 100) return null;
  return (marginPct / (100 - marginPct)) * 100;
}

export function calcImportCost(
  purchasePrice: number,
  freight: number,
  insurance: number,
  customsRatePct: number,
  localDelivery: number,
  units: number
) {
  const u = units > 0 ? units : 1;
  const cif = purchasePrice + freight + insurance;
  const duty = cif * (customsRatePct / 100);
  const total = cif + duty + localDelivery;
  return { cif, duty, total, perUnit: total / u, units: u };
}

export function calcInvoiceAging(
  dueDate: Date,
  today: Date,
  amount: number,
  dailyRatePct: number
) {
  const diffMs = today.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const lateFee = daysOverdue > 0 ? amount * (dailyRatePct / 100) * daysOverdue : 0;
  const totalOwed = amount + lateFee;
  let status = "Current";
  if (daysOverdue > 0) status = daysOverdue <= 30 ? "Overdue" : daysOverdue <= 60 ? "Seriously Overdue" : "Critical";
  return { daysOverdue, lateFee, totalOwed, status };
}

export function calcSalaryCost(
  basic: number,
  socialPct: number,
  housing: number,
  transport: number,
  medical: number,
  other: number
) {
  const social = basic * (socialPct / 100);
  const totalCash = basic + housing + transport;
  const totalNonCash = social + medical + other;
  const totalCost = totalCash + totalNonCash;
  return { totalCash, totalNonCash, totalCost, annualCost: totalCost * 12 };
}

export const FREIGHT_FACTORS = { air: 167, sea: 1000, road: 333 } as const;

export function calcFreightCBW(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  weightPerPieceKg: number,
  pieces: number,
  mode: keyof typeof FREIGHT_FACTORS
) {
  const q = pieces > 0 ? pieces : 1;
  const cbm = (lengthCm / 100) * (widthCm / 100) * (heightCm / 100) * q;
  const factor = FREIGHT_FACTORS[mode];
  const volWeight = cbm * factor;
  const actualWeight = weightPerPieceKg * q;
  const chargeableWeight = Math.max(volWeight, actualWeight);
  return { cbm, volWeight, actualWeight, chargeableWeight, factor };
}

/**
 * Convert via EUR-based rates (InfoEuro basis: 1 EUR = rate units of currency).
 */
export function convertViaEur(amount: number, rateFrom: number, rateTo: number) {
  const inEur = amount / rateFrom;
  return { converted: inEur * rateTo, unitRate: rateTo / rateFrom };
}

export const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AED", name: "UAE Dirham" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "INR", name: "Indian Rupee" },
  { code: "PKR", name: "Pakistani Rupee" },
];

export function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}
