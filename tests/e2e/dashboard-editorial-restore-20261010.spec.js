import { test, expect } from '@playwright/test';

const DEMO_KEY = 'bes-offline-demo-user-v943';
const demoUser = {
  id: 'editorial-restore-e2e', authId: 'editorial-restore-e2e',
  role: 'admin', name: 'Dashboard QA', school: 'Brian QA',
  email: 'dashboard.qa@brianenglish.local', approved: true,
  createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z',
  permissions: { mode: 'all', allowed: [] }, provider: 'offline-demo', demo: true,
};

async function openDashboard(page) {
  await page.addInitScript(({ key, user }) => {
    localStorage.setItem(key, JSON.stringify(user));
    localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_KEY, user: demoUser });
  await page.goto('/#/dashboard');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'dashboard');
  await expect(page.locator('.editorial-hero')).toBeVisible({ timeout: 15000 });
}

test('October 10 restore displays hero, one calendar and complete news hub', async ({ page }) => {
  await openDashboard(page);
  await expect(page.locator('#dashboard-calendar')).toHaveCount(1);
  await expect(page.locator('#dashboard-calendar')).toBeVisible();
  await expect(page.locator('.dnh')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.dnh [role="tab"]')).toHaveCount(2);
  await expect(page.locator('.dcc-root, .gd-v32-planner, .gd-v3-widget-board, .brian-dashboard-drop-zone')).toHaveCount(0);
  await expect(page.locator('.gd-quick-surface')).toHaveCount(0);
});

test('calendar and news remain accessible at mobile width without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page);
  await expect(page.locator('.editorial-hero')).toBeVisible();
  await expect(page.locator('#dashboard-calendar')).toBeVisible();
  await expect(page.locator('.dnh')).toBeVisible({ timeout: 15000 });
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 2);
});

test('news channel selection survives restored dashboard layout', async ({ page }) => {
  await openDashboard(page);
  await expect(page.locator('.dnh')).toBeVisible({ timeout: 15000 });
  const english = page.locator('.dnh [role="tab"]').last();
  await english.click();
  await expect(english).toHaveAttribute('aria-selected', 'true');
});
