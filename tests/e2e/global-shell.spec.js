import { expect, test } from '@playwright/test';

const OFFLINE_SESSION_KEY = 'bes-offline-demo-user-v943';

function demoUser(id, name, email) {
  return {
    id,
    authId: id,
    role: 'admin',
    name,
    email,
    approved: true,
    provider: 'offline-demo',
    demo: true,
  };
}

async function installDemoSession(page, user) {
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: OFFLINE_SESSION_KEY, value: user });
}

test.describe('global shell navigation and notifications', () => {
  test('menu, notification behavior, safe targets, and account isolation', async ({ page }) => {
    const userA = demoUser('shell-user-a', 'Teacher A', 'teacher.a@brian.local');
    const userB = demoUser('shell-user-b', 'Teacher B', 'teacher.b@brian.local');
    await installDemoSession(page, userA);

    await page.goto('/#/home');
    await expect(page.locator('nav.brian-global-shell')).toBeVisible();

    await page.getByRole('button', { name: /^Menu$/ }).click();
    const menuPanel = page.getByTestId('brian-shell-panel-menu');
    await expect(menuPanel).toBeVisible();
    await menuPanel.getByPlaceholder('Tìm ứng dụng hoặc khu vực…').fill('Hub Chuyên môn');
    await expect(menuPanel.getByText('Hub Chuyên môn', { exact: true })).toBeVisible();
    await menuPanel.getByRole('button', { name: 'Đóng' }).click();

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('bes-global-notification', {
        detail: {
          id: 'shell-test-notification',
          title: 'Thông báo kiểm thử',
          message: 'Nội dung kiểm thử bảng thông báo.',
          source: 'E2E Test',
          kind: 'task',
          target: '#/home',
        },
      }));
    });

    await expect(page.getByRole('button', { name: /Thông báo: 1/ })).toBeVisible();
    await page.getByRole('button', { name: /Thông báo: 1/ }).click();
    const notificationPanel = page.getByTestId('brian-shell-panel-notifications');
    await expect(notificationPanel.getByText('Thông báo kiểm thử', { exact: true })).toBeVisible();
    await notificationPanel.locator('.brian-shell-mark-read').click();
    await expect(page.getByRole('button', { name: /Thông báo: 0/ })).toBeVisible();
    await notificationPanel.getByRole('button', { name: 'Đóng' }).click();

    await page.evaluate(() => {
      window.__unsafeNotificationExecuted = false;
      window.dispatchEvent(new CustomEvent('bes-global-notification', {
        detail: {
          id: 'shell-unsafe-target',
          title: 'Liên kết không an toàn',
          source: 'E2E Test',
          target: 'javascript:window.__unsafeNotificationExecuted=true',
        },
      }));
    });
    await page.getByRole('button', { name: /Thông báo: 1/ }).click();
    await notificationPanel.getByText('Liên kết không an toàn', { exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__unsafeNotificationExecuted)).toBe(false);
    await expect(page).toHaveURL(/#\/home$/);
    await notificationPanel.getByRole('button', { name: 'Đóng' }).click();

    await page.evaluate(({ key, user }) => {
      window.localStorage.setItem(key, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('bes-auth-session-updated', { detail: { user } }));
    }, { key: OFFLINE_SESSION_KEY, user: userB });

    await expect(page.getByRole('button', { name: /Teacher B/ })).toBeVisible();
    await page.getByRole('button', { name: /Thông báo: 0/ }).click();
    await expect(notificationPanel.getByText('Thông báo kiểm thử', { exact: true })).toHaveCount(0);
    await expect(notificationPanel.getByText('Liên kết không an toàn', { exact: true })).toHaveCount(0);
    await notificationPanel.getByRole('button', { name: 'Đóng' }).click();

    const userBStored = await page.evaluate((key) => window.localStorage.getItem(key), 'bes-global-notifications:shell-user-b');
    expect(userBStored || '[]').not.toContain('shell-test-notification');
    expect(userBStored || '[]').not.toContain('shell-unsafe-target');

    await page.evaluate(({ key, user }) => {
      window.localStorage.setItem(key, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('bes-auth-session-updated', { detail: { user } }));
    }, { key: OFFLINE_SESSION_KEY, user: userA });

    await expect(page.getByRole('button', { name: /Teacher A/ })).toBeVisible();
    await page.getByRole('button', { name: /Thông báo: 0/ }).click();
    await expect(notificationPanel.getByText('Thông báo kiểm thử', { exact: true })).toBeVisible();
    await expect(notificationPanel.getByText('Liên kết không an toàn', { exact: true })).toBeVisible();
  });

  test('mobile shell does not create page-level horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installDemoSession(page, demoUser('shell-mobile-user', 'Mobile Teacher', 'mobile@brian.local'));
    await page.goto('/#/home');

    await expect(page.locator('nav.brian-global-shell')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await page.getByRole('button', { name: /^Menu$/ }).click();
    const menuPanel = page.getByTestId('brian-shell-panel-menu');
    await expect(menuPanel).toBeVisible();
    const box = await menuPanel.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(390);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(menuPanel).toBeHidden();
  });
});
