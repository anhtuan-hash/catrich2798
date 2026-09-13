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

test('authenticated phone topbar replaces Search with TTCM and opens Kênh TTCM', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await installAdminSession(page);
  await page.goto('/#/dashboard');

  await expect(page.locator('.bes-mobile-topbar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tìm kiếm', exact: true })).toHaveCount(0);

  const ttcmButton = page.getByRole('button', { name: 'TTCM', exact: true });
  await expect(ttcmButton).toBeVisible();
  const box = await ttcmButton.boundingBox();
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);

  await ttcmButton.click();
  await expect(page.getByRole('dialog', { name: 'Kênh TTCM' })).toBeVisible();
});
