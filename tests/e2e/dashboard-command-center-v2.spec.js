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
  const search = page.locator('.dcc-task-search input[role="searchbox"]');
  const visibility = await page.evaluate(() => {
    const field = document.querySelector('.dcc-task-search input');
    const parents = [];
    for (let item = field; item && parents.length < 5; item = item.parentElement) {
      const style = getComputedStyle(item);
      const box = item.getBoundingClientRect();
      parents.push({ tag: item.tagName, class: String(item.className || '').slice(0, 70), display: style.display, visibility: style.visibility, width: box.width, height: box.height, tabindex: item.getAttribute('tabindex') });
    }
    return parents;
  });
  console.log('SEARCH_VISIBILITY_DIAGNOSTIC', JSON.stringify(visibility));
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

test('2.2 shows next event strip, source freshness and task scopes', async ({ page }) => {
  await openDashboard(page);
  await expect(page.locator('.dcc-next-event')).toBeVisible();
  await expect(page.locator('.dcc-sync-strip')).toBeVisible();
  const scope = page.locator('.dcc-scope-switch');
  await expect(scope.getByRole('button', { name: 'Toàn tổ' })).toHaveAttribute('aria-pressed', 'true');
  await scope.getByRole('button', { name: 'Việc của tôi' }).click();
  await expect(scope.getByRole('button', { name: 'Việc của tôi' })).toHaveAttribute('aria-pressed', 'true');
  await scope.getByRole('button', { name: 'Toàn tổ' }).click();
  await expect(scope.getByRole('button', { name: 'Toàn tổ' })).toHaveAttribute('aria-pressed', 'true');
});

test('2.2 can search task 119 beyond the legacy 80-task display cap', async ({ page }) => {
  await openDashboard(page);
  await page.evaluate((user) => {
    const tasks = Array.from({ length: 120 }, (_, index) => ({
      id: 'v22-e2e-task-' + index,
      title: 'Task ' + String(index).padStart(3, '0'),
      description: 'Individual task for search regression',
      item_type: 'task',
      status: 'assigned',
      owner_id: user.id,
      assignee_ids: [user.id],
      due_at: '2026-10-01T09:00:00+07:00',
      priority: 'normal',
    }));
    localStorage.setItem('bes-work-hub-v1093-local:' + user.id, JSON.stringify(tasks));
  }, demoUser);
  await page.reload();
  await expect(page.locator('.dcc-root')).toBeVisible();
  await expect(page.locator('.dcc-count')).toContainText('120', { timeout: 15000 });
  const field = page.locator('.dcc-task-search input[role="searchbox"]');
  await field.fill('Task 119');
  await expect(page.locator('.dcc-row-detail strong')).toContainText('Task 119');
  await expect(page.locator('.dcc-priority-row')).toHaveCount(1);
});

test('2.2 stays within mobile viewport with context strip visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDashboard(page);
  await expect(page.locator('.dcc-next-event')).toBeVisible();
  await expect(page.locator('.dcc-sync-strip')).toBeVisible();
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 2);
});
