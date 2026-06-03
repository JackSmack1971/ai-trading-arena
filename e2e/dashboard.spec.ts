import { expect, test } from '@playwright/test';

test('dashboard renders price chart panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('price-chart-panel')).toBeVisible();
});

test('agent reasoning panel shows decisions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('agent-decision-entry').first()).toBeVisible();
});

test('WebSocket status badge reflects connection', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('ws-status-badge')).toHaveText(/connecting|open|degraded|reconnecting/);
});
