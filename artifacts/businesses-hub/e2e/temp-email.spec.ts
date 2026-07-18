import { test, expect } from "@playwright/test";
import { dismissCookieBanner } from "./helpers";

/**
 * Temp Email copy/open flow.
 *
 * The page talks to /api-proxy/api/tempmail/* which relays to the public
 * mail.tm service. To keep this test deterministic (no dependency on an
 * external mail relay, and a guaranteed inbox message to open), all
 * tempmail endpoints are mocked with route interception.
 */

const MSG_ID = "e2e-msg-1";

const LIST_MESSAGE = {
  id: MSG_ID,
  from: { name: "Acme Corp", address: "noreply@acme.test" },
  to: [{ name: "", address: "e2e@xuvilo.test" }],
  subject: "Your verification code",
  intro: "Your code is 424242",
  seen: false,
  isDeleted: false,
  hasAttachments: false,
  createdAt: new Date().toISOString(),
};

const FULL_MESSAGE = {
  ...LIST_MESSAGE,
  html: ["<p>Hello! Your verification code is <b>424242</b>. It expires in 10 minutes.</p>"],
  text: "Hello! Your verification code is 424242. It expires in 10 minutes.",
};

test.describe("Temp Email tool", () => {
  test("generates an address, copies it, and opens an inbox message", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.route("**/api-proxy/api/tempmail/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.endsWith("/domains")) {
        return route.fulfill({
          json: { "hydra:member": [{ domain: "xuvilo-e2e.test", isActive: true }] },
        });
      }
      if (method === "POST" && url.endsWith("/accounts")) {
        const body = route.request().postDataJSON() as { address: string };
        return route.fulfill({ json: { id: "acct-e2e-1", address: body.address } });
      }
      if (method === "POST" && url.endsWith("/token")) {
        return route.fulfill({ json: { token: "e2e-token" } });
      }
      if (method === "GET" && url.endsWith("/messages")) {
        return route.fulfill({ json: { "hydra:member": [LIST_MESSAGE] } });
      }
      if (method === "GET" && url.includes(`/message/${MSG_ID}`) && !url.endsWith("/read")) {
        return route.fulfill({ json: FULL_MESSAGE });
      }
      if (method === "PATCH" && url.endsWith(`/message/${MSG_ID}/read`)) {
        return route.fulfill({ json: { seen: true } });
      }
      if (method === "DELETE") {
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({ status: 404, json: { error: "unmocked tempmail route" } });
    });

    await page.goto("/tools/temp-email");
    await dismissCookieBanner(page);

    // A generated address ending in the mocked domain is shown.
    await expect(page.getByText(/@xuvilo-e2e\.test/)).toBeVisible({ timeout: 20_000 });

    // Copy the address; the button confirms and the clipboard holds the address.
    await page.getByRole("button", { name: /^(Copy|نسخ)$/ }).click();
    await expect(page.getByRole("button", { name: /Copied!|تم النسخ!/ })).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(/@xuvilo-e2e\.test$/);

    // The mocked inbox message is listed; open it and see the full body
    // (HTML bodies render inside a sandboxed iframe).
    // Click the inbox row via its intro text (the subject alone can also
    // match the transient new-mail toast, which disappears mid-click).
    await page.getByText("Your code is 424242").click();
    const body = page.frameLocator('iframe[title="email-body"]');
    await expect(body.getByText(/verification code is/)).toBeVisible();
    await expect(body.getByText("424242")).toBeVisible();
  });
});
