import { describe, expect, it } from "vitest";
import { analyzeSubscriberCsv, parseCsv } from "./csvImport";

describe("parseCsv", () => {
  it("parses simple comma-separated rows", () => {
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles quoted cells with commas and escaped quotes", () => {
    expect(parseCsv('"x, y",z\n"he said ""hi""",w')).toEqual([
      ["x, y", "z"],
      ['he said "hi"', "w"],
    ]);
  });

  it("strips a UTF-8 BOM and skips blank lines", () => {
    expect(parseCsv("﻿a@b.co\n\n\nc@d.co")).toEqual([
      ["a@b.co"],
      ["c@d.co"],
    ]);
  });

  it("sniffs semicolon-separated files (Arabic-locale Excel)", () => {
    expect(parseCsv("email;name\na@b.co;Ali")).toEqual([
      ["email", "name"],
      ["a@b.co", "Ali"],
    ]);
  });
});

describe("analyzeSubscriberCsv", () => {
  it("detects the email column by header and classifies rows", () => {
    const csv = [
      "name,email",
      "Ali,ali@example-company.com",
      "Info,info@business.com",
      "Bad,not-an-email",
      "Dup,ali@example-company.com",
      "Temp,user@mailinator.com",
    ].join("\n");
    const a = analyzeSubscriberCsv(csv);
    expect(a.hadHeader).toBe(true);
    expect(a.emailColumn).toBe(1);
    expect(a.counts).toEqual({
      valid: 1,
      suspicious: 2, // info@ role mailbox + mailinator disposable
      invalid: 1,
      duplicate: 1,
    });
    const dup = a.rows.find((r) => r.status === "duplicate");
    expect(dup?.email).toBe("ali@example-company.com");
  });

  it("works without a header row and normalizes case", () => {
    const a = analyzeSubscriberCsv("ALI@Company.COM\nzed@firm.net");
    expect(a.hadHeader).toBe(false);
    expect(a.counts.valid).toBe(2);
    expect(a.rows[0].email).toBe("ali@company.com");
  });

  it("flags placeholder domains and keyboard mashing as suspicious", () => {
    const a = analyzeSubscriberCsv("someone@example.com\nasdfasdf@real.co");
    expect(a.rows.every((r) => r.status === "suspicious")).toBe(true);
  });

  it("returns empty analysis for an empty file", () => {
    const a = analyzeSubscriberCsv("");
    expect(a.rows).toEqual([]);
    expect(a.counts.valid).toBe(0);
  });
});
