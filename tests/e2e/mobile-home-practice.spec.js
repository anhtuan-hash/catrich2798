import { test, expect } from '@playwright/test';

async function waitForHome(page) {
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toBeVisible();
}

test('phone uses mobile Home body instead of desktop editorial body', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  await expect(page.locator('[data-bes-mobile-home="true"]')).toBeVisible();
  await expect(page.locator('.bha-editorial-dateline')).toHaveCount(0);
  await expect(page.locator('[data-bes-mobile-home="true"] [data-mobile-home-hero]')).toBeVisible();
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

test('mobile Weekly Practice switches grades with accessible chips', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  const grade10 = page.locator('[data-mobile-grade="10"]');
  const grade11 = page.locator('[data-mobile-grade="11"]');
  await expect(grade10).toHaveAttribute('aria-pressed', 'true');
  await grade11.click();
  await expect(grade11).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-mobile-practice-grade="11"]')).toBeVisible();
});

test('mobile grade chips meet touch target minimum', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  const box = await page.locator('[data-mobile-grade="10"]').boundingBox();
  expect(box?.height || 0).toBeGreaterThanOrEqual(44);
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
  expect(columnCount).toBe(2);
});

test('phone Home uses a native mobile visual scale instead of compressed desktop density', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);
  await expect(page.locator('[data-bes-mobile-home="true"]')).toBeVisible();
  await expect(page.locator('[data-mobile-home-hero] h1')).toBeVisible();
  await expect(page.locator('[data-mobile-tool]').first()).toBeVisible();
  await expect(page.locator('[data-mobile-grade="10"]')).toBeVisible();

  const metrics = await page.evaluate(() => {
    const px = (selector, property = 'fontSize') => {
      const element = document.querySelector(selector);
      return element ? Number.parseFloat(getComputedStyle(element)[property]) : 0;
    };
    const height = (selector) => document.querySelector(selector)?.getBoundingClientRect().height || 0;
    return {
      heroTitle: px('.bes-mobile-home__hero h1'),
      sectionTitle: px('.bes-mobile-home__section-head h2'),
      toolLabel: px('.bes-mobile-home__tool strong'),
      toolHeight: height('.bes-mobile-home__tool'),
      practiceTitle: px('.bes-mobile-home__practice-head h2'),
      gradeNumber: px('.bes-mobile-home__grade-selector button > strong'),
      gradeHeight: height('.bes-mobile-home__grade-selector button'),
      topbarHeight: height('.bes-mobile-topbar'),
      brandTitle: px('.bes-mobile-brand__copy strong'),
      bottomLabel: px('.bes-mobile-bottomnav__item'),
    };
  });

  expect(metrics.heroTitle).toBeGreaterThanOrEqual(34);
  expect(metrics.sectionTitle).toBeGreaterThanOrEqual(20);
  expect(metrics.toolLabel).toBeGreaterThanOrEqual(15);
  expect(metrics.toolHeight).toBeGreaterThanOrEqual(104);
  expect(metrics.practiceTitle).toBeGreaterThanOrEqual(23);
  expect(metrics.gradeNumber).toBeGreaterThanOrEqual(20);
  expect(metrics.gradeHeight).toBeGreaterThanOrEqual(60);
  expect(metrics.topbarHeight).toBeGreaterThanOrEqual(68);
  expect(metrics.brandTitle).toBeGreaterThanOrEqual(16);
  expect(metrics.bottomLabel).toBeGreaterThanOrEqual(11);
});

test('mobile Home keeps weekly practice compact until user expands it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await waitForHome(page);

  const cards = page.locator('[data-mobile-practice-card]');
  const initialCount = await cards.count();
  expect(initialCount).toBeLessThanOrEqual(4);

  const expand = page.getByRole('button', { name: /Xem tất cả bài|View all lessons/i });
  if (await expand.count()) {
    await expand.click();
    expect(await cards.count()).toBeGreaterThan(initialCount);
  }
});
