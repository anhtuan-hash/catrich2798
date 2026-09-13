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
