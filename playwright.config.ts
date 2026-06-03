import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'PORT=8787 pnpm --filter @arena/api dev', url: 'http://127.0.0.1:8787/v1/health', reuseExistingServer: !process.env['CI'] },
    { command: 'pnpm --filter @arena/web dev --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env['CI'] },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
