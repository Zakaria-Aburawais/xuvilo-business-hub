import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const FOOTER_SRC = readFileSync(
  resolve(__dirname, "Footer.tsx"),
  "utf-8",
);

describe("Footer social links — no placeholder links", () => {
  it('Footer.tsx contains no href="#" (placeholder social links are banned)', () => {
    const matches = [...FOOTER_SRC.matchAll(/href\s*[:=]\s*["']#["']/g)].map(
      (m) => m[0],
    );
    expect(
      matches,
      'Found href="#" in Footer.tsx. Remove the icon or connect it to a verified URL.',
    ).toHaveLength(0);
  });

  it('Footer.tsx contains no javascript:void(0) links', () => {
    const matches = [...FOOTER_SRC.matchAll(/javascript\s*:\s*void/gi)].map(
      (m) => m[0],
    );
    expect(
      matches,
      'Found javascript:void(0) in Footer.tsx. Remove or fix the link.',
    ).toHaveLength(0);
  });

  it("All external links in Footer.tsx use rel=\"noopener noreferrer\" when target=\"_blank\" is present", () => {
    const blankLinks = [...FOOTER_SRC.matchAll(/target\s*=\s*["']_blank["']/g)];
    for (const match of blankLinks) {
      const surrounding = FOOTER_SRC.slice(
        Math.max(0, match.index! - 200),
        match.index! + 200,
      );
      expect(
        surrounding,
        `Found target="_blank" without rel="noopener noreferrer" near: ...${surrounding.trim()}...`,
      ).toMatch(/rel\s*=\s*["'][^"']*noopener[^"']*noreferrer[^"']*["']/);
    }
  });
});
