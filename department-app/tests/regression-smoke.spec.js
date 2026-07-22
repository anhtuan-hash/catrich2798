import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/to-chuyen-mon/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('scoped dashboard navigation smoke test', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Tổng quan tổ chuyên môn' })).toBeVisible();
  await page.getByTestId('tab-tasks').click();
  let workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Giao việc và theo dõi' })).toBeVisible();
  await page.getByTestId('tab-plans').click();
  workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Kế hoạch và tiến độ' })).toBeVisible();
});

test('scoped notifications and meetings smoke test', async ({ page }) => {
  await page.getByRole('button', { name: 'Mở thông báo' }).click();
  const drawer = page.getByTestId('global-notification-drawer');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
  await expect(drawer.getByText('0 thông báo chưa đọc')).toBeVisible();
  await drawer.getByRole('button', { name: 'Đóng bảng thông báo' }).click();
  await expect(drawer).toHaveCount(0);

  await page.getByTestId('tab-meetings').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Cuộc họp và biên bản' })).toBeVisible();
  await expect(workspace.locator('[data-testid^="meeting-"]').first()).toBeVisible();
});