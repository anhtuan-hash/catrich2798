import { test, expect } from '@playwright/test';

test('mobile viewport does not overflow horizontally', async ({ page }) => {
  await page.goto('/#/home');
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 2);
});
