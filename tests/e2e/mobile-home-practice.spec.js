import { test, expect } from '@playwright/test';

async function waitForHome(page) {
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toBeVisible();
}

test('phone uses mobile Home body and reuses the desktop Hero identity', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const mobileHome = page.locator('[data-bes-mobile-home="true"]');
  await expect(mobileHome).toBeVisible();
  await expect(page.locator('.bha-editorial-dateline')).toHaveCount(0);
  await expect(mobileHome.locator('[data-mobile-home-dateline]')).toBeVisible();
  await expect(mobileHome.locator('[data-mobile-home-hero] .hero-cms')).toBeVisible();
  await expect(mobileHome.locator('[data-mobile-home-hero]')).toContainText('Không gian');
  await expect(mobileHome.locator('[data-mobile-home-hero]')).toContainText('Tích hợp các công cụ hỗ trợ giảng dạy');
  await expect(mobileHome.getByRole('button', { name: /Xem hướng dẫn/i })).toBeVisible();
  await expect(mobileHome.locator('.bes-mobile-home__hero-stat')).toHaveCount(0);
});

test('desktop preserves existing Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await waitForHome(page);
  await expect(page.locator('.bha-editorial-dateline')).toBeVisible();
  await expect(page.locator('[data-bes-mobile-home="true"]')).toHaveCount(0);
});

test('portrait iPad uses mobile Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-portrait');
  await waitForHome(page);
  await expect(page.locator('[data-bes-mobile-home="true"]')).toBeVisible();
  await expect(page.locator('.bha-editorial-dateline')).toHaveCount(0);
});

test('landscape iPad preserves desktop Home body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-landscape');
  await waitForHome(page);
  await expect(page.locator('.bha-editorial-dateline')).toBeVisible();
  await expect(page.locator('[data-bes-mobile-home="true"]')).toHaveCount(0);
});

test('mobile Home keeps desktop content hierarchy: Hero, weekly practice, then tools', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const hero = page.locator('[data-mobile-home-hero]');
  const practice = page.locator('[data-mobile-home-practice]');
  const tools = page.locator('[data-mobile-home-tools]');
  await expect(hero).toBeVisible();
  await expect(practice).toBeVisible();
  await expect(tools).toBeVisible();

  const [heroBox, practiceBox, toolsBox] = await Promise.all([
    hero.boundingBox(),
    practice.boundingBox(),
    tools.boundingBox(),
  ]);
  expect(heroBox?.y || 0).toBeLessThan(practiceBox?.y || Number.MAX_SAFE_INTEGER);
  expect(practiceBox?.y || 0).toBeLessThan(toolsBox?.y || Number.MAX_SAFE_INTEGER);
});

test('mobile Weekly Practice shows all three grade summaries simultaneously', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const cards = page.locator('[data-mobile-grade-card]');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('[data-mobile-grade-card="10"]')).toBeVisible();
  await expect(page.locator('[data-mobile-grade-card="11"]')).toBeVisible();
  await expect(page.locator('[data-mobile-grade-card="12"]')).toBeVisible();
});

test('mobile grade summary action meets touch target minimum and opens its lesson list', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const action = page.locator('[data-mobile-grade-card="10"] [data-mobile-grade-toggle]').first();
  const box = await action.boundingBox();
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  await action.click();
  await expect(page.locator('[data-mobile-practice-grade="10"]')).toBeVisible();
});

test('mobile Home stays inside viewport and tools are touch friendly', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  await expect(page.locator('[data-bes-mobile-home="true"]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const cards = page.locator('[data-mobile-tool]');
  expect(await cards.count()).toBeGreaterThan(0);
  const first = await cards.first().boundingBox();
  expect(first?.height || 0).toBeGreaterThanOrEqual(44);

  const columnCount = await page.locator('.bes-mobile-home__tools').evaluate((element) => {
    const columns = getComputedStyle(element).gridTemplateColumns.trim();
    return columns ? columns.split(/\s+/).length : 0;
  });
  expect(columnCount).toBe(1);
});

test('mobile Home uses readable Hero typography and large actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const heroTitleSize = await page.locator('[data-mobile-home-hero] .hero-cms__content h1').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(heroTitleSize).toBeGreaterThanOrEqual(38);

  const primaryAction = await page.locator('[data-mobile-home-hero] .hero-cms__button').first().boundingBox();
  expect(primaryAction?.height || 0).toBeGreaterThanOrEqual(48);

  const toolTitleSize = await page.locator('.bes-mobile-home__tool strong').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(toolTitleSize).toBeGreaterThanOrEqual(15);
});

test('mobile Home brand uses Brian English identity instead of route title', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const brand = page.locator('.bes-mobile-brand[data-home-brand="true"]');
  await expect(brand).toBeVisible();
  await expect(brand).toContainText('Brian English');
  await expect(brand).not.toContainText('Trang chủ');
});

test('mobile weekly practice stays compact until a grade is opened and can expand long lists', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  await expect(page.locator('[data-mobile-practice-panel]')).toHaveCount(0);
  await page.locator('[data-mobile-grade-card="10"] [data-mobile-grade-toggle]').click();
  const cards = page.locator('[data-mobile-practice-grade="10"] [data-mobile-practice-card]');
  const initialCount = await cards.count();
  expect(initialCount).toBeLessThanOrEqual(4);

  const expand = page.getByRole('button', { name: /Xem tất cả bài|View all lessons/i });
  if (await expand.count()) {
    await expand.click();
    expect(await cards.count()).toBeGreaterThan(initialCount);
  }
});
