import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

test.describe("Loan calculator", () => {
  test("computes 50000 @ 6% for 5 years -> monthly 966.64", async ({ page }) => {
    await page.goto("/calculators/loan");
    await dismissCookieBanner(page);

    await page.getByTestId("principal-input").fill("50000");
    await page.getByTestId("rate-input").fill("6");
    await page.getByTestId("term-input").fill("5");
    await page.getByTestId("calculate-btn").click();

    await expect(page.getByText("966.64", { exact: true })).toBeVisible();
    await expect(page.getByText("57998.40", { exact: true })).toBeVisible();
    await expect(page.getByText("7998.40", { exact: true })).toBeVisible();

    await page.getByTestId("reset-btn").click();
    await expect(page.getByTestId("principal-input")).toHaveValue("");
    await expect(page.getByTestId("rate-input")).toHaveValue("");
    await expect(page.getByTestId("term-input")).toHaveValue("");
  });
});
