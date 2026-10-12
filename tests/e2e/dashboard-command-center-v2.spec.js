import { test, expect } from '@playwright/test';

const DEMO_KEY = 'bes-offline-demo-user-v943';
const demoUser = {
  id: 'command-center-e2e', authId: 'command-center-e2e',
  role: 'admin', name: 'Dashboard QA', school: 'Brian QA',
  email: 'dashboard.qa@brianenglish.local', approved: true,
  createdAt: '2026-09-24T00:00:00.000Z', updatedAt: '2026-09-24T00:00:00.000Z',
  permissions: { mode: 'all', allowed: [] }, provider: 'offline-demo', demo: true,
};

async function openDashboard(page) {
  await page.addInitScript(({ key, user }) => {
    localStorage.setItem(key, JSON.stringify(user));
    localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_KEY, user: demoUser });
  await page.goto('/#/dashboard');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'dashboard');
  await expect(page.locator('.dcc-root')).toBeVisible({ timeout: 15000 });
}

test('command center exposes actionable cards and role-aware filters', async ({ page }) => {
  await openDashboard(page);
  await expect(page.locator('.dcc-stat')).toHaveCount(4);
  await expect(page.locator('.dcc-filters button')).toHaveCount(5);
  await page.locator('.dcc-filters').getByRole('button', { name: 'Quá hạn' }).click();
  await expect(page.locator('.dcc-filters').getByRole('button', { name: 'Quá hạn' })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.dcc-stats').getByRole('button', { name: /Chờ duyệt/i }).click();
  await expect(page.locator('.dcc-filters').getByRole('button', { name: 'Chờ duyệt' })).toHaveAttribute('aria-pressed', 'true');
});

test('weather location persists without changing other app settings', async ({ page }) => {
  await openDashboard(page);
  const location = page.locator('.editorial-weather-location');
  await expect(location).toHaveValue('binh-duong');
  await location.selectOption('ho-chi-minh');
  await expect(location).toHaveValue('ho-chi-minh');
  await page.reload();
  await expect(page.locator('.editorial-weather-location')).toHaveValue('ho-chi-minh');
});

test('mobile Bento UI does not introduce horizontal overflow and retains Drop Zone', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await openDashboard(page);
  await expect(page.locator('.dcc-stat')).toHaveCount(4);
  await expect(page.locator('.brian-dashboard-drop-zone')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 2);
});
