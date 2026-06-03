import { expect, test } from '@playwright/test';

test('start button posts new run and shows runId', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start/i }).click({ force: true });
  await expect(page.getByTestId('active-run-id')).toBeVisible();
});

test('stop button stops active run', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /stop/i }).click();
  await expect(page.getByRole('button', { name: /start/i })).toBeEnabled();
});
