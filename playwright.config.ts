import { defineConfig } from '@playwright/test';

const PORT = 4331;

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
    // Leave unset on your Mac (uses the Chromium that `npm run test:setup` installs).
    // Set PW_CHANNEL=chrome to use an installed Google Chrome instead.
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Builds the production site and serves it, so the tests check what you would deploy.
  webServer: {
    command: `npm run build && npx astro preview --host 127.0.0.1 --port ${PORT} --ignore-lock`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
