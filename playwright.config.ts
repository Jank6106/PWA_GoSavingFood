import { defineConfig, devices } from '@playwright/test';
import { getE2EConfig } from './scripts/lib/e2e-env.mjs';

getE2EConfig();
export default defineConfig({
  testDir: './tests/e2e', timeout: 60_000,
  expect: { timeout: 15_000 }, fullyParallel: false, workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: { baseURL: 'http://localhost:3000', timezoneId: 'Asia/Ho_Chi_Minh', actionTimeout: 15_000, trace: 'on-first-retry', screenshot: 'only-on-failure', serviceWorkers: 'block' },
  webServer: {
    command: 'node scripts/e2e-servers.mjs', url: 'http://localhost:3000/explore/',
    reuseExistingServer: false, timeout: 120_000,
  },
  projects: [
    { name: 'Customer Mobile', use: { ...devices['Pixel 7'] } },
    { name: 'Merchant Desktop', testMatch: /01-auth-flow\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
  ],
});
