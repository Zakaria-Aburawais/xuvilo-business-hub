import { describe, expect, it } from "vitest";
import {
  blogPosts,
  getBlogPost,
  getPublishedPosts,
  getRelatedPosts,
  isPublishedPost,
  todayUtcIso,
  type BlogPost,
} from "./blogPosts";

const stub = (date: string): BlogPost => ({
  slug: `stub-${date}`,
  titleAr: "عنوان",
  titleEn: "Title",
  excerptAr: "م",
  excerptEn: "e",
  date,
  readTime: 5,
  category: "tips",
  keywordAr: "ك",
  keywordEn: "k",
  relatedSlugs: [],
  contentAr: "",
  contentEn: "",
});

describe("scheduled publishing", () => {
  it("isPublishedPost compares ISO day strings correctly", () => {
    expect(isPublishedPost(stub("2026-07-19"), "2026-07-20")).toBe(true);
    expect(isPublishedPost(stub("2026-07-20"), "2026-07-20")).toBe(true); // publishes ON its day
    expect(isPublishedPost(stub("2026-07-21"), "2026-07-20")).toBe(false);
    expect(isPublishedPost(stub("2026-08-01"), "2026-07-31")).toBe(false); // month boundary
  });

  it("todayUtcIso returns a YYYY-MM-DD string", () => {
    expect(todayUtcIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getPublishedPosts never returns a future-dated post", () => {
    const today = todayUtcIso();
    for (const p of getPublishedPosts()) {
      expect(p.date <= today).toBe(true);
    }
  });

  it("getBlogPost hides future-dated posts but serves published ones", () => {
    const today = todayUtcIso();
    const future = blogPosts.find((p) => p.date > today);
    const published = blogPosts.find((p) => p.date <= today);
    // The scheduled queue guarantees future posts exist until 2026-08-19;
    // afterwards this branch simply has nothing left to assert.
    if (future) expect(getBlogPost(future.slug)).toBeUndefined();
    expect(published).toBeTruthy();
    expect(getBlogPost(published!.slug)).toEqual(published);
  });

  it("getRelatedPosts silently drops not-yet-published related slugs", () => {
    const today = todayUtcIso();
    const future = blogPosts.find((p) => p.date > today);
    if (!future) return; // queue fully published — nothing to verify
    const related = getRelatedPosts([future.slug]);
    expect(related).toEqual([]);
  });

  it("the scheduled queue is one article per day with no gaps", () => {
    const queue = blogPosts
      .filter((p) => p.date >= "2026-07-21" && p.date <= "2026-08-19")
      .map((p) => p.date)
      .sort();
    expect(queue.length).toBe(30);
    expect(new Set(queue).size).toBe(30);
    // Consecutive days: each date differs from the previous by exactly 1 day.
    for (let i = 1; i < queue.length; i++) {
      const prev = new Date(`${queue[i - 1]}T00:00:00Z`).getTime();
      const cur = new Date(`${queue[i]}T00:00:00Z`).getTime();
      expect(cur - prev).toBe(24 * 60 * 60 * 1000);
    }
  });
});
