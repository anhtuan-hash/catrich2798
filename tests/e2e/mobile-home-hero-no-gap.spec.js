import { test, expect } from '@playwright/test';

const WIDE_HERO_DATA_URL = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22600%22 viewBox=%220 0 1200 600%22%3E%3Crect width=%221200%22 height=%22600%22 fill=%22%23dbeafe%22/%3E%3C/svg%3E';

async function waitForHome(page) {
  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toBeVisible();
}

test('mobile Hero follows the published artwork ratio so contain mode leaves no vertical blank space', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');

  await page.route('**/hero/mobile-current.json*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        schemaVersion: 1,
        mobileHero: {
          url: WIDE_HERO_DATA_URL,
          fit: 'contain',
        },
      }),
    });
  });

  await waitForHome(page);

  const hero = page.locator('[data-mobile-home-hero]');
  const art = page.locator('[data-mobile-home-hero-art]');
  await expect(hero).toBeVisible();
  await expect(art).toHaveAttribute('data-mobile-home-direct-hero', 'cms');
  await art.evaluate(async (image) => {
    if (!image.complete || image.naturalWidth === 0) await image.decode();
  });

  const geometry = await hero.evaluate((element) => {
    const image = element.querySelector('[data-mobile-home-hero-art]');
    const box = element.getBoundingClientRect();
    const naturalRatio = image.naturalWidth / image.naturalHeight;
    const visibleContainHeight = box.width / naturalRatio;
    return {
      heroRatio: box.width / box.height,
      naturalRatio,
      verticalBlankSpace: Math.max(0, box.height - visibleContainHeight),
    };
  });

  expect(geometry.naturalRatio).toBeCloseTo(2, 2);
  expect(Math.abs(geometry.heroRatio - geometry.naturalRatio)).toBeLessThan(0.03);
  expect(geometry.verticalBlankSpace).toBeLessThanOrEqual(2);
});
