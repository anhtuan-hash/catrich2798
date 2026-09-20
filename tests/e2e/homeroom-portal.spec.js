import { test, expect } from '@playwright/test';

test('public homeroom portal opens without the authenticated shell', async ({ page }) => {
  await page.goto('/#/homeroom-portal');
  await expect(page.locator('.hrp-login-card')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cổng thông tin lớp chủ nhiệm' })).toBeVisible();
  await expect(page.locator('.bes-top-chrome')).toHaveCount(0);
});

test('homeroom portal stays within a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/homeroom-portal');
  await expect(page.locator('.hrp-login-card')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2);
});
