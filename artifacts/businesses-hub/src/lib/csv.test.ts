import { describe, it, expect } from "vitest";
import { rowsToCsv, parseCsvTable, pickField, pickNumber } from "./csv";

interface Row {
  name: string;
  email: string;
  balance: number;
}

const columns = [
  { key: "name", get: (r: Row) => r.name },
  { key: "email", get: (r: Row) => r.email },
  { key: "balance", get: (r: Row) => r.balance },
];

describe("rowsToCsv", () => {
  it("serializes simple rows with a header", () => {
    const csv = rowsToCsv<Row>(
      [{ name: "Acme", email: "a@b.com", balance: 10 }],
      columns,
    );
    expect(csv).toBe("name,email,balance\nAcme,a@b.com,10\n");
  });

  it("quotes cells containing commas, quotes, and newlines", () => {
    const csv = rowsToCsv<Row>(
      [{ name: 'Say "hi", ok?', email: "line1\nline2", balance: 0 }],
      columns,
    );
    expect(csv).toBe('name,email,balance\n"Say ""hi"", ok?","line1\nline2",0\n');
  });

  it("handles Arabic text without altering it", () => {
    const csv = rowsToCsv<Row>(
      [{ name: "شركة النور للتجارة", email: "info@alnoor.sa", balance: 1500 }],
      columns,
    );
    expect(csv).toContain("شركة النور للتجارة");
  });
});

describe("rowsToCsv → parseCsvTable round-trip", () => {
  it("round-trips quotes, commas, and Arabic text", () => {
    const rows: Row[] = [
      { name: 'Widget "Pro", XL', email: "x@y.com", balance: 12.5 },
      { name: "منتج مميز، بجودة عالية", email: "ar@example.com", balance: 99 },
      { name: 'قال "مرحبا"', email: "", balance: 0 },
    ];
    const csv = rowsToCsv(rows, columns);
    const parsed = parseCsvTable(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.headers).toEqual(["name", "email", "balance"]);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0]!.name).toBe('Widget "Pro", XL');
    expect(parsed.rows[1]!.name).toBe("منتج مميز، بجودة عالية");
    expect(parsed.rows[2]!.name).toBe('قال "مرحبا"');
    expect(parsed.rows[0]!.balance).toBe("12.5");
  });

  it("round-trips when a UTF-8 BOM is prepended (as downloadCsv does)", () => {
    const rows: Row[] = [{ name: "عميل عربي", email: "c@d.com", balance: 42 }];
    const csv = "\uFEFF" + rowsToCsv(rows, columns);
    const parsed = parseCsvTable(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.headers).toEqual(["name", "email", "balance"]);
    expect(parsed.rows[0]!.name).toBe("عميل عربي");
  });

  it("tolerates CRLF line endings", () => {
    const csv = rowsToCsv<Row>(
      [{ name: "Acme", email: "a@b.com", balance: 1 }],
      columns,
    ).replace(/\n/g, "\r\n");
    const parsed = parseCsvTable(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]!.name).toBe("Acme");
  });
});

describe("parseCsvTable edge cases", () => {
  it("rejects empty input", () => {
    expect(parseCsvTable("").errors).toEqual(["Empty file."]);
  });

  it("requires a header plus at least one data row", () => {
    const parsed = parseCsvTable("name,email\n");
    expect(parsed.errors[0]).toMatch(/No data rows/);
  });

  it("normalises header names to snake_case", () => {
    const parsed = parseCsvTable("Client Name,E-Mail\nAcme,a@b.com\n");
    expect(parsed.headers).toEqual(["client_name", "email"]);
    expect(parsed.rows[0]!.client_name).toBe("Acme");
  });
});

describe("pickField / pickNumber", () => {
  it("picks first non-empty alias", () => {
    const rec = { name: "", client: "Acme", total: "1,500.50" };
    expect(pickField(rec, ["name", "client"])).toBe("Acme");
    expect(pickNumber(rec, ["total"])).toBe(1500.5);
  });
});
