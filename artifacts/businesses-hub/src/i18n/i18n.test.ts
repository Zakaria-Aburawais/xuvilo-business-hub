import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ar } from "./ar";

const PLACEHOLDER_RE = /\{[^{}]+\}/g;

function extractPlaceholders(value: string): string[] {
  return (value.match(PLACEHOLDER_RE) ?? []).slice().sort();
}

describe("i18n dictionaries", () => {
  it("ar.ts has every key present in en.ts", () => {
    const enKeys = Object.keys(en);
    const missingInAr = enKeys.filter((key) => !(key in ar));
    expect(
      missingInAr,
      `Arabic translation is missing keys present in English:\n  - ${missingInAr.join("\n  - ")}`,
    ).toEqual([]);
  });

  it("en.ts has every key present in ar.ts", () => {
    const arKeys = Object.keys(ar);
    const missingInEn = arKeys.filter((key) => !(key in en));
    expect(
      missingInEn,
      `English translation is missing keys present in Arabic:\n  - ${missingInEn.join("\n  - ")}`,
    ).toEqual([]);
  });

  it("placeholder tokens in English values appear in the matching Arabic values", () => {
    const mismatches: string[] = [];

    for (const [key, enValue] of Object.entries(en)) {
      const arValue = ar[key];
      if (typeof arValue !== "string") continue;

      const enPlaceholders = extractPlaceholders(enValue);
      if (enPlaceholders.length === 0) continue;

      const arPlaceholders = extractPlaceholders(arValue);
      const missing = enPlaceholders.filter(
        (token) => !arPlaceholders.includes(token),
      );

      if (missing.length > 0) {
        mismatches.push(
          `  - ${key}: missing ${missing.join(", ")} (en: "${enValue}", ar: "${arValue}")`,
        );
      }
    }

    expect(
      mismatches,
      `Arabic values are missing placeholder tokens that exist in English:\n${mismatches.join("\n")}`,
    ).toEqual([]);
  });
});
