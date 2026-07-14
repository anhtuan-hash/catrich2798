import { test, expect } from '@playwright/test';

test('public classroom join route opens without the authenticated shell', async ({ page }) => {
  await page.goto('/#/classroom-join?code=ABC234');
  await expect(page.locator('.classroom-join-page')).toBeVisible();
  await expect(page.locator('.cj-form')).toBeVisible();
  await expect(page.locator('.cj-form input').first()).toHaveValue('ABC234');
  await expect(page.locator('.bes-top-chrome')).toHaveCount(0);
});

test('classroom join page stays within a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/classroom-join');
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2);
});
