import { expect, test } from '@playwright/test';

const OFFLINE_SESSION_KEY = 'bes-offline-demo-user-v943';

function adminUser(id = 'premium-apps-admin') {
  return {
    id,
    authId: id,
    role: 'admin',
    name: 'Brian Admin',
    email: 'admin@brian.local',
    approved: true,
    provider: 'offline-demo',
    demo: true,
  };
}

async function installDemoSession(page, user = adminUser()) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: OFFLINE_SESSION_KEY, value: user });
}

test.describe('premium applications directory', () => {
  test('searches applications and exposes launcher editing controls', async ({ page }) => {
    await installDemoSession(page);
    await page.goto('/#/apps');

    await expect(page.locator('.bp-apps-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mọi công cụ. Một không gian.' })).toBeVisible();
    await expect(page.locator('.bp-app-card').first()).toBeVisible();

    const search = page.getByPlaceholder('Tìm theo tên, chức năng hoặc nhóm…');
    await search.fill('Lesson Architect');
    await expect(page.locator('.bp-app-card')).toHaveCount(1);
    await expect(page.getByText('Lesson Architect', { exact: true })).toBeVisible();

    await search.fill('không-có-ứng-dụng-này');
    await expect(page.getByText('Không có ứng dụng phù hợp.', { exact: true })).toBeVisible();
    await search.fill('');

    await page.getByRole('button', { name: 'Tùy chỉnh thư viện' }).click();
    await expect(page.locator('.bp-apps-editor')).toBeVisible();
    await expect(page.locator('.bp-app-editor-controls').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeVisible();
    await page.getByRole('button', { name: 'Thoát chỉnh sửa' }).click();
    await expect(page.locator('.bp-apps-editor')).toBeHidden();
  });

  test('does not create page-level horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installDemoSession(page, adminUser('premium-apps-mobile'));
    await page.goto('/#/apps');

    await expect(page.locator('.bp-apps-page')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.locator('.bp-apps-grid')).toHaveCSS('grid-template-columns', /[0-9.]+px/);
  });
});
