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

test('2.1 shows the same number of events on the overview card and day agenda', async ({ page }) => {
  await openDashboard(page);
  await expect.poll(async () => {
    const card = await page.locator('.dcc-stat--blue .dcc-stat-number').innerText();
    const agenda = await page.locator('.gd-count-chip').innerText();
    return Number(card.replace(/[^0-9]/g, '')) === Number(agenda.match(/\d+/)?.[0] || -1);
  }).toBe(true);
});

test('2.1 switches from Today to seven grouped days and back', async ({ page }) => {
  await openDashboard(page);
  const toggle = page.locator('.gd-calendar-range-toggle');
  await toggle.getByRole('button', { name: '7 ngày tới' }).click();
  await expect(page.locator('.gd-week-day')).toHaveCount(7);
  await expect(toggle.getByRole('button', { name: '7 ngày tới' })).toHaveAttribute('aria-pressed', 'true');
  await toggle.getByRole('button', { name: 'Hôm nay' }).click();
  await expect(page.locator('.gd-date-poster')).toBeVisible();
});

test('2.1 searches task labels and keeps news collapsed by default', async ({ page }) => {
  await openDashboard(page);
  const search = page.locator('.dcc-task-search input[type="search"]');
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute('aria-label', 'Tìm công việc...');
  await search.fill('a unique phrase that cannot match any task');
  await expect(page.locator('.dcc-empty')).toBeVisible();
  const toggle = page.locator('.dcc-news-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('2.1 week layout avoids horizontal overflow on phones', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await openDashboard(page);
  await page.locator('.gd-calendar-range-toggle').getByRole('button', { name: '7 ngày tới' }).click();
  await expect(page.locator('.gd-week-day')).toHaveCount(7);
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1] + 2);
});
