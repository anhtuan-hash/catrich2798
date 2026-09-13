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
