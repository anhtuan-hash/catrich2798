import { test, expect } from '@playwright/test';

const DEMO_ADMIN = {
  id: 'mobile-ttcm-admin',
  authId: 'mobile-ttcm-admin',
  role: 'admin',
  name: 'Mobile TTCM Admin',
  email: 'mobile.ttcm.admin@brianenglish.local',
  approved: true,
  permissions: { mode: 'all', allowed: [] },
  provider: 'offline-demo',
  demo: true,
};

async function installAdminSession(page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('bes-offline-demo-user-v943', JSON.stringify(user));
  }, DEMO_ADMIN);
}

test('authenticated phone topbar uses original Brian logo and opens TTCM', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await installAdminSession(page);
  await page.goto('/#/dashboard');

  await expect(page.locator('.bes-mobile-topbar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tìm kiếm', exact: true })).toHaveCount(0);

  const brandMark = page.locator('.bes-mobile-brand__mark');
  await expect(brandMark).not.toHaveText('B');
  const originalLogo = brandMark.locator('img[src="/brian-english-brand-logo.png"]');
  await expect(originalLogo).toBeVisible();
  const logoLoaded = await originalLogo.evaluate((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  expect(logoLoaded).toBe(true);

  const ttcmButton = page.getByRole('button', { name: 'TTCM', exact: true });
  await expect(ttcmButton).toBeVisible();
  const box = await ttcmButton.boundingBox();
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);

  await ttcmButton.click();
  await expect(page.getByRole('dialog', { name: 'Kênh TTCM' })).toBeVisible();
});

test('authenticated avatar opens mobile account menu without leaving dashboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await installAdminSession(page);
  await page.goto('/#/dashboard');

  const avatar = page.locator('.bes-mobile-topbar .bes-mobile-avatar-button');
  await expect(avatar).toBeVisible();
  await avatar.click();

  await expect(page).toHaveURL(/#\/dashboard$/);
  const menu = page.getByRole('dialog', { name: 'Menu tài khoản' });
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Mobile TTCM Admin', { exact: true })).toBeVisible();
  await expect(menu.getByText('Quản trị viên', { exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Tài khoản của tôi/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Cài đặt/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Thông báo/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Trợ giúp & hướng dẫn/ })).toBeVisible();
  await expect(menu.getByRole('button', { name: /Đăng xuất/ })).toBeVisible();

  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
});
