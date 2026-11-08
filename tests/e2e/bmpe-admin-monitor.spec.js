import { test, expect } from '@playwright/test';

// Synthetic offline-demo session only. No production user or student information.
test('Admin opens the on-demand motion lab and stops without background telemetry', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('bes-offline-demo-user-v943', JSON.stringify({
      id: 'bmpe-e2e-admin', authId: 'bmpe-e2e-admin', role: 'admin',
      name: 'BMPE Test Admin', approved: true, provider: 'offline-demo',
      demo: true, permissions: { mode: 'all', allowed: [] },
    }));
    window.localStorage.setItem('bet-language','vi');
  });
  await page.goto('/#/settings', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.settings-launcher-v2')).toBeVisible({ timeout: 20_000 });
  await page.locator('.sl2-tile').filter({ hasText: 'Giao diện' }).locator('.sl2-tile-open').click();
  await expect(page.locator('.settings-launcher-drawer')).toBeVisible();
  await page.locator('.settings-appearance-tabs').getByRole('tab', { name: 'Hiệu ứng' }).click();
  const monitor = page.locator('.bmpe-monitor');
  await expect(monitor).toBeVisible({ timeout: 15_000 });
  await expect(monitor).toContainText('không gửi kết quả lên máy chủ');
  await monitor.getByRole('button', { name: /Đo chuyển động 8,5 giây/ }).click();
  await expect(monitor).toContainText('Đang đo');
  await page.waitForTimeout(1200);
  await monitor.getByRole('button', { name: 'Dừng đo' }).click();
  await expect(monitor).toContainText(/Đã lấy \d+ khoảng frame/, { timeout: 5000 });
  await expect(monitor.getByRole('button', { name: 'Xuất báo cáo JSON' })).toBeEnabled();
});
