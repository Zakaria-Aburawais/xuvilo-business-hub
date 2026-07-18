import type { Page } from "@playwright/test";

/** Dismiss the cookie consent banner if present so it never blocks clicks. */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const btn = page
    .getByRole("button", { name: /accept|agree|got it|موافق|قبول/i })
    .first();
  try {
    await btn.click({ timeout: 3000 });
  } catch {
    // Banner not shown (already accepted or not rendered) — fine.
  }
}
