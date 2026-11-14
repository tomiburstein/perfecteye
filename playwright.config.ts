import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests run against the production build (`npm run build` first),
 * served by Cloudflare's local runtime (wrangler) so the ranking API and its
 * D1 database are real. The database starts empty on every run.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
  },
  webServer: {
    command:
      'rm -rf .wrangler/state && npx wrangler pages dev dist --port 4173 --d1 DB --binding PE_TEST_ANY_DAY=1 --compatibility-date 2026-11-01',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'ipad', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' } },
  ],
});
