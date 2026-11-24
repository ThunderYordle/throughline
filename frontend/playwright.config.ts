import { defineConfig } from "@playwright/test";

const apiPort = process.env.TL_E2E_PORT ?? "8000";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: [
    {
      command: "../scripts/e2e-backend.sh",
      url: `http://localhost:${apiPort}/api/health`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: { ...process.env, TL_E2E_PORT: apiPort } as Record<string, string>,
    },
    {
      command: "npm run dev -- --port 5173",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      env: { ...process.env, TL_API_URL: `http://localhost:${apiPort}` } as Record<string, string>,
    },
  ],
});
