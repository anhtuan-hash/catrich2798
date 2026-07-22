import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/to-chuyen-mon/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('uses the stable local workspace when Supabase is not configured', async ({ page }) => {
  const status = page.getByTestId('department-cloud-status');
  await expect(status).toBeVisible();
  await expect(status.getByText('TTCM')).toBeVisible();
  await expect(status.getByText('Cục bộ')).toBeVisible();

  await page.getByTestId('tab-tasks').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Giao việc và theo dõi' })).toBeVisible();
  await expect(workspace.getByRole('button', { name: 'Tạo nhiệm vụ' })).toBeEnabled();
});
