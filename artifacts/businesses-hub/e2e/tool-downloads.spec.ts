import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test.describe("Design tool downloads", () => {
  test("Stamp Maker exports a PNG", async ({ page }) => {
    await page.goto("/tools/stamp-maker");
    await dismissCookieBanner(page);

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    // First PNG button in the Export & Save section (transparent background).
    await page.getByRole("button", { name: /PNG/ }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^stamp-(transparent|white)\.png$/);
  });

  test("Business Card exports the front side as PNG", async ({ page }) => {
    await page.goto("/tools/business-card");
    await dismissCookieBanner(page);
    await expect(page.getByTestId("bc-canvas-front")).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByTestId("bc-png-front").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test("Company Profile exports a PDF", async ({ page }) => {
    await page.goto("/tools/company-profile");
    await dismissCookieBanner(page);

    // @react-pdf/renderer generation can take a while on first run.
    const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByTestId("cp-download-pdf").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
