import { test, expect } from '@playwright/test';

const DEMO_SESSION_KEY = 'bes-offline-demo-user-v943';

function demoAdmin() {
  return {
    id: 'student-support-admin',
    authId: 'student-support-admin',
    role: 'admin',
    name: 'Student Support Admin',
    school: 'Brian English E2E',
    email: 'student-support.admin@brianenglish.local',
    approved: true,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    permissions: { mode: 'all', allowed: [] },
    provider: 'offline-demo',
    demo: true,
  };
}

async function installDemoAdmin(page) {
  await page.addInitScript(({ key, user }) => {
    window.localStorage.setItem(key, JSON.stringify(user));
    window.localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_SESSION_KEY, user: demoAdmin() });
}

async function openStudentSupport(page) {
  await installDemoAdmin(page);
  await page.goto('/#/student-support');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'student-support');
  await expect(page.getByRole('heading', { name: /Chưa được cấp quyền|Permission required/i })).toHaveCount(0);
  await expect(page.locator('main.student-support-center')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('heading', { name: /Trung tâm Hỗ trợ Học sinh|Student Support Center/i })).toBeVisible();
}

test('protected Student Support route boots without runtime failure', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
  await openStudentSupport(page);
  await expect(page.locator('body')).not.toContainText(/Application error|ChunkLoadError|Cannot read properties of undefined/i);
  expect(pageErrors).toEqual([]);
});

test('Student Support has no horizontal page overflow at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudentSupport(page);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test('Student Support keeps the deterministic no-AI surface visible', async ({ page }) => {
  await openStudentSupport(page);
  await expect(page.getByText(/Không AI|No AI/i).first()).toBeVisible();
  const studentSupportNav = page.getByLabel(/Khu vực Student Support|Student Support sections/i);
  await expect(studentSupportNav.getByRole('button', { name: /Quy tắc|Rules/i })).toBeVisible();
  await expect(studentSupportNav.getByRole('button', { name: /Báo cáo|Reports/i })).toBeVisible();
});
