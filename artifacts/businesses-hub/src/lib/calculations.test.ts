import { describe, it, expect } from "vitest";
import {
  calcLineItemTotal,
  calcDocumentTotals,
  calcProfitMargin,
  calcDiscount,
  calcVAT,
  calcCBM,
  calcOvertime,
  calcLeaveBalance,
  calcBreakEven,
  calcLoan,
  markupToMargin,
  marginToMarkup,
  calcImportCost,
  calcInvoiceAging,
  calcSalaryCost,
  calcFreightCBW,
  convertViaEur,
} from "./calculations";

describe("calcProfitMargin", () => {
  it("matches worked example: cost 80, revenue 100", () => {
    const r = calcProfitMargin(80, 100);
    expect(r.profit).toBe(20);
    expect(r.margin).toBeCloseTo(20, 5);
    expect(r.markup).toBeCloseTo(25, 5);
  });
  it("handles zero revenue safely", () => {
    expect(calcProfitMargin(50, 0)).toEqual({ profit: 0, margin: 0, markup: 0 });
  });
});

describe("calcDiscount", () => {
  it("matches worked example: $200 at 15%", () => {
    const r = calcDiscount(200, 15);
    expect(r.discountAmt).toBeCloseTo(30, 5);
    expect(r.finalPrice).toBeCloseTo(170, 5);
    expect(r.savings).toBeCloseTo(30, 5);
  });
});

describe("calcVAT", () => {
  it("adds 15% VAT to 1000 → gross 1150", () => {
    const r = calcVAT(1000, 15, "add")!;
    expect(r.net).toBe(1000);
    expect(r.vatAmount).toBeCloseTo(150, 5);
    expect(r.gross).toBeCloseTo(1150, 5);
  });
  it("extracts 15% VAT from 1150 → net 1000", () => {
    const r = calcVAT(1150, 15, "extract")!;
    expect(r.net).toBeCloseTo(1000, 5);
    expect(r.vatAmount).toBeCloseTo(150, 5);
    expect(r.gross).toBe(1150);
  });
  it("rejects invalid inputs", () => {
    expect(calcVAT(0, 15, "add")).toBeNull();
    expect(calcVAT(100, -1, "add")).toBeNull();
    expect(calcVAT(100, 101, "add")).toBeNull();
  });
});

describe("calcCBM", () => {
  it("matches worked example: 100×60×50 cm, 20 kg", () => {
    const r = calcCBM(100, 60, 50, 1, 20);
    expect(r.cbmPerUnit).toBeCloseTo(0.3, 5);
    expect(r.totalCBM).toBeCloseTo(0.3, 5);
    expect(r.volumetricWeight).toBeCloseTo(50.1, 5); // 0.3 × 167
    expect(r.chargeableWeight).toBeCloseTo(50.1, 5); // volumetric > actual
  });
  it("uses actual weight when heavier", () => {
    const r = calcCBM(100, 60, 50, 1, 100);
    expect(r.chargeableWeight).toBe(100);
  });
});

describe("calcOvertime", () => {
  it("matches worked example: $20/hr, 8 reg, 3 OT @1.5x", () => {
    const r = calcOvertime(20, 8, 3, 1.5);
    expect(r.regularPay).toBe(160);
    expect(r.overtimePay).toBeCloseTo(90, 5);
    expect(r.total).toBeCloseTo(250, 5);
  });
});

describe("calcLeaveBalance", () => {
  it("matches worked example: 30 days entitlement, 9 months, 10 taken", () => {
    const r = calcLeaveBalance(30, 10, 9);
    expect(r.accrued).toBeCloseTo(22.5, 5);
    expect(r.remaining).toBeCloseTo(12.5, 5);
  });
});

describe("calcBreakEven", () => {
  it("matches worked example: FC 10000, VC 30, price 50", () => {
    const r = calcBreakEven(10000, 30, 50)!;
    expect(r.contributionMargin).toBe(20);
    expect(r.contributionRatio).toBeCloseTo(40, 5);
    expect(r.bepUnits).toBeCloseTo(500, 5);
    expect(r.bepRevenue).toBeCloseTo(25000, 5);
  });
  it("returns null when price ≤ variable cost", () => {
    expect(calcBreakEven(1000, 50, 50)).toBeNull();
    expect(calcBreakEven(1000, 60, 50)).toBeNull();
  });
});

describe("calcLoan", () => {
  it("matches bank amortization reference: $50,000 at 6% for 5 years", () => {
    const r = calcLoan(50000, 6, 5)!;
    expect(r.monthly).toBeCloseTo(966.64, 2);
    expect(r.total).toBeCloseTo(57998.4, 0);
    expect(r.totalInterest).toBeCloseTo(7998.4, 0);
  });
  it("handles 0% interest", () => {
    const r = calcLoan(12000, 0, 1)!;
    expect(r.monthly).toBe(1000);
    expect(r.total).toBe(12000);
    expect(r.totalInterest).toBe(0);
  });
  it("rejects invalid inputs", () => {
    expect(calcLoan(0, 6, 5)).toBeNull();
    expect(calcLoan(1000, 6, 0)).toBeNull();
  });
});

describe("markup/margin conversion", () => {
  it("50% markup = 33.33% margin", () => {
    expect(markupToMargin(50)).toBeCloseTo(33.3333, 3);
  });
  it("33.3333% margin ≈ 50% markup (round trip)", () => {
    expect(marginToMarkup(markupToMargin(50))!).toBeCloseTo(50, 5);
  });
  it("25% margin = 33.33% markup", () => {
    expect(marginToMarkup(25)!).toBeCloseTo(33.3333, 3);
  });
  it("rejects margin ≥ 100", () => {
    expect(marginToMarkup(100)).toBeNull();
  });
});

describe("calcImportCost", () => {
  it("matches worked example: 5000 + 800 + 100, 5% duty, 200 local", () => {
    const r = calcImportCost(5000, 800, 100, 5, 200, 1);
    expect(r.cif).toBe(5900);
    expect(r.duty).toBeCloseTo(295, 5);
    expect(r.total).toBeCloseTo(6395, 5);
    expect(r.perUnit).toBeCloseTo(6395, 5);
  });
  it("computes per-unit cost", () => {
    const r = calcImportCost(5000, 800, 100, 5, 200, 10);
    expect(r.perUnit).toBeCloseTo(639.5, 5);
  });
});

describe("calcInvoiceAging", () => {
  it("matches worked example: $5,000 due Jan 1, checked Feb 15 at 0.1%/day", () => {
    const r = calcInvoiceAging(new Date(2026, 0, 1), new Date(2026, 1, 15), 5000, 0.1);
    expect(r.daysOverdue).toBe(45);
    expect(r.lateFee).toBeCloseTo(225, 5);
    expect(r.totalOwed).toBeCloseTo(5225, 5);
    expect(r.status).toBe("Seriously Overdue");
  });
  it("charges no fee when not overdue", () => {
    const r = calcInvoiceAging(new Date(2026, 5, 1), new Date(2026, 4, 1), 5000, 0.1);
    expect(r.lateFee).toBe(0);
    expect(r.status).toBe("Current");
  });
  it("classifies aging buckets", () => {
    const day = (n: number) => new Date(2026, 0, 1 + n);
    expect(calcInvoiceAging(new Date(2026, 0, 1), day(10), 100, 0).status).toBe("Overdue");
    expect(calcInvoiceAging(new Date(2026, 0, 1), day(45), 100, 0).status).toBe("Seriously Overdue");
    expect(calcInvoiceAging(new Date(2026, 0, 1), day(90), 100, 0).status).toBe("Critical");
  });
});

describe("calcSalaryCost", () => {
  it("matches worked example: basic 3000, 12% social, 500 housing, 200 transport", () => {
    const r = calcSalaryCost(3000, 12, 500, 200, 0, 0);
    expect(r.totalCash).toBe(3700);
    expect(r.totalNonCash).toBeCloseTo(360, 5);
    expect(r.totalCost).toBeCloseTo(4060, 5);
    expect(r.annualCost).toBeCloseTo(48720, 5);
  });
});

describe("calcFreightCBW", () => {
  it("matches worked example: 80×60×50 cm, 10 kg, air", () => {
    const r = calcFreightCBW(80, 60, 50, 10, 1, "air");
    expect(r.cbm).toBeCloseTo(0.24, 5);
    expect(r.volWeight).toBeCloseTo(40.08, 2);
    expect(r.actualWeight).toBe(10);
    expect(r.chargeableWeight).toBeCloseTo(40.08, 2);
    expect(r.factor).toBe(167);
  });
  it("sea freight uses factor 1000 and actual weight when heavier", () => {
    const r = calcFreightCBW(100, 100, 100, 1200, 1, "sea");
    expect(r.volWeight).toBeCloseTo(1000, 5);
    expect(r.chargeableWeight).toBe(1200);
  });
});

describe("convertViaEur", () => {
  it("converts USD→EUR through EUR base rates", () => {
    // 1 EUR = 1.0842 USD, 1 EUR = 1 EUR
    const r = convertViaEur(1000, 1.0842, 1);
    expect(r.converted).toBeCloseTo(922.34, 1);
    expect(r.unitRate).toBeCloseTo(1 / 1.0842, 6);
  });
  it("cross-rate conversion is consistent", () => {
    // 1 EUR = 4 AAA, 1 EUR = 2 BBB → 1 AAA = 0.5 BBB
    const r = convertViaEur(10, 4, 2);
    expect(r.converted).toBeCloseTo(5, 10);
    expect(r.unitRate).toBeCloseTo(0.5, 10);
  });
});

describe("document totals", () => {
  const item = { quantity: 2, unitPrice: 100, discountPct: 10, taxPct: 15 } as any;
  it("line item: 2×100 −10% +15% = 207", () => {
    expect(calcLineItemTotal(item)).toBeCloseTo(207, 5);
  });
  it("document totals aggregate correctly", () => {
    const r = calcDocumentTotals([item, item]);
    expect(r.subtotal).toBe(400);
    expect(r.discountTotal).toBeCloseTo(40, 5);
    expect(r.taxTotal).toBeCloseTo(54, 5);
    expect(r.grandTotal).toBeCloseTo(414, 5);
  });
});
