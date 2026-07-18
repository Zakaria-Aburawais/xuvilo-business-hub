import { defineConfig } from "@playwright/test";

// E2E tests run against the dev server through the shared proxy on port 80.
// Start workflows first (web app must be running), then:
//   pnpm --filter @workspace/businesses-hub run test:e2e
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:80",
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true,
  },
});
