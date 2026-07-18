import { describe, it, expect } from "vitest";
import {
  normalizeChar,
  normalizeText,
  normalizeWithMap,
  findHighlightRanges,
} from "./searchHighlight";

function highlightSlices(text: string, query: string): string[] {
  return findHighlightRanges(text, normalizeText(query)).map(([s, e]) => text.slice(s, e));
}

describe("normalizeChar", () => {
  it("lowercases Latin characters", () => {
    expect(normalizeChar("A")).toBe("a");
  });

  it("strips Arabic diacritics", () => {
    expect(normalizeChar("\u064E")).toBe(""); // fatha
    expect(normalizeChar("\u0651")).toBe(""); // shadda
  });

  it("unifies alif variants", () => {
    expect(normalizeChar("أ")).toBe("ا");
    expect(normalizeChar("إ")).toBe("ا");
    expect(normalizeChar("آ")).toBe("ا");
  });

  it("unifies alif maqsura to ya and ta marbuta to ha", () => {
    expect(normalizeChar("ى")).toBe("ي");
    expect(normalizeChar("ة")).toBe("ه");
  });
});

describe("normalizeWithMap", () => {
  it("maps each normalized char back to its original index", () => {
    const { normalized, map } = normalizeWithMap("Abc");
    expect(normalized).toBe("abc");
    expect(map).toEqual([0, 1, 2]);
  });

  it("skips indices for removed diacritics", () => {
    // "فَتْح" — letters at 0,2,4; diacritics at 1,3
    const { normalized, map } = normalizeWithMap("فَتْح");
    expect(normalized).toBe("فتح");
    expect(map).toEqual([0, 2, 4]);
  });

  it("handles empty string", () => {
    expect(normalizeWithMap("")).toEqual({ normalized: "", map: [] });
  });
});

describe("findHighlightRanges", () => {
  it("returns empty for empty query", () => {
    expect(findHighlightRanges("hello", "")).toEqual([]);
  });

  it("returns empty when there is no match", () => {
    expect(findHighlightRanges("hello world", "xyz")).toEqual([]);
  });

  it("returns empty when query is longer than text", () => {
    expect(findHighlightRanges("hi", "hello")).toEqual([]);
  });

  it("matches English case-insensitively", () => {
    expect(highlightSlices("Invoice Templates", "invoice")).toEqual(["Invoice"]);
  });

  it("finds multiple matches", () => {
    expect(highlightSlices("tax and tax again", "tax")).toEqual(["tax", "tax"]);
  });

  it("skips overlapping occurrences (non-overlapping scan) but merges touching ranges", () => {
    // "aba" occurs at 0 and 2 (overlapping); scan takes 0, then resumes at 3,
    // finding the next non-overlapping hit at 4. Ranges [0,3] and [4,7] stay separate.
    expect(findHighlightRanges("abababa", normalizeText("aba"))).toEqual([
      [0, 3],
      [4, 7],
    ]);
  });

  it("merges adjacent matches into one range", () => {
    expect(highlightSlices("aaaa", "aa")).toEqual(["aaaa"]);
  });

  it("matches diacritized Arabic text with a plain query", () => {
    const text = "الفَوَاتِير الإلكترونية";
    const slices = highlightSlices(text, "فواتير");
    expect(slices).toEqual(["فَوَاتِير"]);
  });

  it("matches alif-variant words", () => {
    expect(highlightSlices("الأسعار الجديدة", "الاسعار")).toEqual(["الأسعار"]);
  });

  it("matches ta-marbuta vs ha and alif maqsura vs ya", () => {
    expect(highlightSlices("فاتورة ضريبية", "فاتوره")).toEqual(["فاتورة"]);
    expect(highlightSlices("مستوى عالٍ", "مستوي")).toEqual(["مستوى"]);
  });

  it("handles mixed Arabic/English text", () => {
    const text = "دليل VAT للشركات";
    expect(highlightSlices(text, "vat")).toEqual(["VAT"]);
    expect(highlightSlices(text, "للشركات")).toEqual(["للشركات"]);
  });

  it("does not crash or misalign on emoji/surrogate pairs", () => {
    const text = "🎉 خصم كبير 🎉";
    const slices = highlightSlices(text, "خصم");
    expect(slices).toEqual(["خصم"]);
  });

  it("produces ranges usable to slice original text without off-by-one", () => {
    const text = "شركة ناجحة";
    const ranges = findHighlightRanges(text, normalizeText("ناجحه"));
    expect(ranges).toHaveLength(1);
    const [s, e] = ranges[0];
    expect(text.slice(s, e)).toBe("ناجحة");
  });
});
