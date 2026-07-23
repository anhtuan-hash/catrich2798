import { expect, test } from '@playwright/test';

const OFFLINE_SESSION_KEY = 'bes-offline-demo-user-v943';

function demoAdmin(id = 'premium-dashboard-admin') {
  return {
    id,
    authId: id,
    role: 'admin',
    name: 'Brian Admin',
    email: 'admin.dashboard@brian.local',
    approved: true,
    provider: 'offline-demo',
    demo: true,
  };
}

async function installDemoSession(page, user = demoAdmin()) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: OFFLINE_SESSION_KEY, value: user });
}

test.describe('premium work dashboard', () => {
  test('renders role-aware metrics and workspace panels', async ({ page }) => {
    await installDemoSession(page);
    await page.goto('/#/dashboard');

    await expect(page.locator('.bpd-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Xin chào, Brian Admin/ })).toBeVisible();
    await expect(page.locator('.bpd-metric')).toHaveCount(5);
    await expect(page.getByRole('heading', { name: 'Công việc cần xử lý' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lịch sắp tới' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nội dung chờ duyệt' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hoạt động chuyên môn' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chủ nhiệm' })).toBeVisible();
  });

  test('does not create page-level horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installDemoSession(page, demoAdmin('premium-dashboard-mobile'));
    await page.goto('/#/dashboard');

    await expect(page.locator('.bpd-page')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.locator('.bpd-hero')).toHaveCSS('grid-template-columns', /[0-9.]+px/);
  });
});
