const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "on-first-retry",
    channel: "chrome"
  },
  webServer: [
    {
      command: "PORT=5004 CLIENT_ORIGIN=http://127.0.0.1:4173 npm --workspace backend start",
      url: "http://127.0.0.1:5004/health",
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command:
        "VITE_API_BASE_URL=http://127.0.0.1:5004 npm --workspace frontend run build && VITE_API_BASE_URL=http://127.0.0.1:5004 npm --workspace frontend run preview -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
      timeout: 90_000
    }
  ]
});
