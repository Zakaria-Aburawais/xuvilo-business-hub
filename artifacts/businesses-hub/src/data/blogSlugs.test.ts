import { describe, it, expect } from "vitest";
import { blogSlugs } from "./blogSlugs";
import { blogPosts } from "./blogPosts";

describe("blogSlugs", () => {
  it("stays exactly in sync with blogPosts slugs (same values, same order)", () => {
    expect(blogSlugs).toEqual(blogPosts.map((p) => p.slug));
  });

  it("contains no duplicate slugs", () => {
    expect(new Set(blogSlugs).size).toBe(blogSlugs.length);
  });
});
