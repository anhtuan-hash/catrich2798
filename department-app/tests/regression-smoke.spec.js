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

test('scoped notifications search and meetings smoke test', async ({ page }) => {
  await page.getByRole('button', { name: 'Đánh dấu đã đọc' }).click();
  await expect(page.getByText('0 thông báo chưa đọc')).toBeVisible();
  await page.getByLabel('Tìm kiếm nhanh').fill('ma trận');
  await page.locator('.search-results').getByRole('button', { name: /Xây dựng ma trận/ }).click();
  await page.getByTestId('tab-meetings').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Cuộc họp và biên bản' })).toBeVisible();
  const firstMeeting = workspace.locator('[data-testid^="meeting-"]').first();
  await firstMeeting.locator('.mw-main').click();
  const checkbox = page.getByTestId('meeting-detail-panel').locator('.mw-agenda input[type="checkbox"]').first();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
});
