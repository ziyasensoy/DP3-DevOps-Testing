const { defineConfig, devices } = require('@playwright/test');

// Use a separate port so the tests never talk to a dev server running on 3000.
const PORT = 3100;

module.exports = defineConfig({
  testDir: './tests/e2e',
  // Tests share one in-memory server, so run them one after another.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Start the app before the tests and stop it afterwards.
  webServer: {
    command: 'node src/server.js',
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/health`,
    reuseExistingServer: false,
  },
});
