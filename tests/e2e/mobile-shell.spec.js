import { test, expect } from '@playwright/test';

async function expectMobileChrome(page) {
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'mobile');
  await expect(page.locator('.bes-mobile-topbar')).toBeVisible();
  await expect(page.locator('.bes-mobile-bottomnav')).toBeVisible();
  await expect(page.locator('.brian-nav')).toHaveCount(0);
}

async function expectDesktopChrome(page) {
  await expect(page.locator('.app-shell')).toHaveAttribute('data-presentation', 'desktop');
  await expect(page.locator('.brian-nav')).toBeVisible();
  await expect(page.locator('.bes-mobile-bottomnav')).toHaveCount(0);
}

test('phone uses mobile chrome and hides desktop navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'phone');
  await expectMobileChrome(page);
  await expect(page.locator('.bes-mobile-bridge-host')).toHaveAttribute('hidden', '');

  const bottomPadding = await page.locator('#bes-main-content').evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBottom));
  expect(bottomPadding).toBeGreaterThanOrEqual(68);
});

test('portrait iPad uses mobile chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-portrait');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'tablet');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-orientation', 'portrait');
  await expectMobileChrome(page);
});

test('landscape iPad uses desktop chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad-landscape');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'tablet');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-orientation', 'landscape');
  await expectDesktopChrome(page);
});

test('desktop remains desktop after narrow viewport resize', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'desktop');
  await expectDesktopChrome(page);

  await page.setViewportSize({ width: 560, height: 900 });
  await expect(page.locator('.app-shell')).toHaveAttribute('data-device-class', 'desktop');
  await expectDesktopChrome(page);
});

test('mobile menu opens a touch-friendly route sheet without changing the current route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/#/home');
  const originalHash = await page.evaluate(() => window.location.hash);

  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Điều hướng Brian English' })).toBeVisible();
  const firstButtonMinHeight = await page.locator('.bes-mobile-sheet button').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).minHeight));
  expect(firstButtonMinHeight).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => window.location.hash)).toBe(originalHash);
});