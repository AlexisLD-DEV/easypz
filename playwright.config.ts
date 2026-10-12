import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testMatch: ["**/portfolio.spec.ts"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-iphone",
      testIgnore: ["**/portfolio.spec.ts"],
      use: {
        ...devices["iPhone 13"],
        // Playwright's "iPhone 13" device defaults to WebKit; this sandbox lacks
        // the WebKit system libs, so we run the same iPhone viewport on Chromium
        // to validate the mobile layout/touch/overflow (the responsive concerns
        // students hit on real devices). CI can enable WebKit with --with-deps.
        defaultBrowserType: "chromium",
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "mobile-pixel",
      testIgnore: ["**/portfolio.spec.ts"],
      use: {
        ...devices["Pixel 5"],
        hasTouch: true,
        isMobile: true,
      },
    },
    ...(process.env.E2E_WEBKIT === "1"
      ? [
          {
            // Real WebKit/Safari engine for the iPhone viewport, enabled only
            // in CI (this sandbox lacks the WebKit system libraries). Validates
            // the layout on the actual Safari engine students use.
            name: "mobile-iphone-webkit",
            testIgnore: ["**/portfolio.spec.ts"],
            use: {
              ...devices["iPhone 13"],
              hasTouch: true,
              isMobile: true,
            },
          } as { name: string; testIgnore?: string[]; use: object },
        ]
      : []),
  ],
  webServer: {
    command: "npm run db:migrate:local && npm run e2e:seed && npm run dev",
    url: "http://127.0.0.1:5173/api/public/quizzes",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
