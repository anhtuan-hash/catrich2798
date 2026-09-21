import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'bes-regional-font-settings-v1';

test('fresh login keeps custom regional font authority over auth CSS', async ({ page }) => {
  await page.addInitScript(({ storageKey }) => {
    const fakeFont = {
      preset: 'custom',
      name: 'Regional Runtime QA',
      url: 'data:font/ttf;base64,AA==',
      path: '',
      format: 'ttf',
      size: 2,
    };
    window.localStorage.setItem(storageKey, JSON.stringify({
      pageTitle: fakeFont,
      navigation: fakeFont,
    }));
  }, { storageKey: STORAGE_KEY });

  await page.goto('/#/login');
  await expect(page.locator('.auth-google-copy h1')).toBeVisible();
  await expect(page.locator('.brian-nav')).toBeVisible();

  await expect.poll(async () => page.locator('.auth-google-copy h1').evaluate((node) => ({
    family: getComputedStyle(node).fontFamily,
    runtime: node.getAttribute('data-bes-regional-font-family-runtime'),
  }))).toEqual(expect.objectContaining({
    runtime: 'pageTitle',
  }));

  const titleFamily = await page.locator('.auth-google-copy h1').evaluate((node) => getComputedStyle(node).fontFamily);
  expect(titleFamily).toContain('BrianRegionalCustom-pageTitle');

  const navTarget = page.locator('.brian-nav__brand > span, .brian-nav__primary > button, .brian-nav__primary > a').first();
  await expect(navTarget).toBeVisible();
  await expect.poll(async () => navTarget.evaluate((node) => ({
    family: getComputedStyle(node).fontFamily,
    runtime: node.getAttribute('data-bes-regional-font-family-runtime'),
  }))).toEqual(expect.objectContaining({
    runtime: 'navigation',
  }));

  const navFamily = await navTarget.evaluate((node) => getComputedStyle(node).fontFamily);
  expect(navFamily).toContain('BrianRegionalCustom-navigation');
});
