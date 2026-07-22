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

test('keeps the application shell after reloading meetings stored in the complete workspace schema', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('department-v2-meetings', JSON.stringify([
      {
        id: 101,
        title: 'Họp kiểm tra tương thích',
        dateISO: '2026-07-23',
        start: '14:00',
        end: '15:30',
        location: 'Phòng chuyên môn',
        chair: 'Nguyễn Thị Mai',
        agenda: [{ id: 1001, text: 'Rà soát kế hoạch', done: false }],
        conclusions: 'Tiếp tục hoàn thiện hồ sơ.',
      },
    ]));
  });

  await page.reload();
  await expect(page.getByTestId('tab-records')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở thông báo' })).toBeVisible();
  await expect(page.getByText('Rà soát kế hoạch')).toBeVisible();
});
