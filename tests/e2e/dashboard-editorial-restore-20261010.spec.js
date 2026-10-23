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


// Newsroom compact editorial regression: deterministic fixture, no reliance on live headlines.
async function mockEditorialNews(page) {
  const square = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800"%3E%3Crect width="600" height="800" fill="%2397c3f3"/%3E%3Ccircle cx="300" cy="235" r="115" fill="%23ffdbb7"/%3E%3C/svg%3E';
  const items = Array.from({ length: 6 }, (_, index) => ({
    id: 'fixture-' + index,
    title: 'Thông tin giáo dục, tuyển sinh và trường học năm 2026 — tin số ' + (index + 1),
    summary: 'Một đoạn thông tin dài để kiểm tra khả năng cắt dòng trong thẻ tin. '.repeat(7),
    image: square,
    source: 'Giáo dục & Thời đại',
    link: 'https://example.org/news-' + index,
    publishedAt: '2026-10-23T07:45:00+07:00',
  }));
  await page.route('**/api/news-feed**', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ items }),
  }));
}

test('Newsroom shows one bounded featured story and three readable stories on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockEditorialNews(page);
  await openDashboard(page);
  await expect(page.locator('.dnh-featured')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.dnh-story')).toHaveCount(3);
  const sizes = await page.evaluate(() => {
    const grid = document.querySelector('.dnh-grid');
    const media = document.querySelector('.dnh-featured-media');
    const img = media?.querySelector('img:not(.dnh-image-backdrop)');
    const headline = document.querySelector('.dnh-story-copy strong');
    return {
      gridHeight: grid?.getBoundingClientRect().height || 0,
      gridColumns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      imageHeight: media?.getBoundingClientRect().height || 0,
      imageFit: img ? getComputedStyle(img).objectFit : '',
      titleSize: headline ? parseFloat(getComputedStyle(headline).fontSize) : 0,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    };
  });
  expect(sizes.gridColumns).toBe(2);
  expect(sizes.imageHeight).toBeLessThanOrEqual(220);
  expect(sizes.imageFit).toBe('contain');
  expect(sizes.titleSize).toBeGreaterThanOrEqual(14);
  expect(sizes.gridHeight).toBeLessThan(560);
  expect(sizes.horizontalOverflow).toBe(false);
});

test('Newsroom fits phone width; full feed and reader continue to work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockEditorialNews(page);
  await openDashboard(page);
  await expect(page.locator('.dnh-story')).toHaveCount(3, { timeout: 15000 });
  const mediaHeight = await page.locator('.dnh-featured-media').evaluate((el) => el.getBoundingClientRect().height);
  expect(mediaHeight).toBeLessThanOrEqual(185);
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1] + 2);
  await page.locator('.dnh-view-all').click();
  await expect(page.locator('.dnh-full-card')).toHaveCount(6);
  await page.locator('.dnh-full-card').first().click();
  await expect(page.locator('.dnh-reader')).toBeVisible();
});
