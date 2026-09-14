import { test, expect } from '@playwright/test';

test('iPhone Safari renders the approved premium Hero on a light canvas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-webkit');

  await page.goto('/#/home');
  await expect(page.locator('.app-shell')).toBeVisible();

  const mobileHome = page.locator('[data-bes-mobile-home="true"]');
  await expect(mobileHome).toBeVisible();

  const art = mobileHome.locator('[data-mobile-home-hero-art]');
  await expect(art).toBeVisible();
  await expect(art).toHaveAttribute('src', /mobile-home-premium-hero\.webp$/);
  await expect.poll(
    () => art.evaluate((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
    { message: 'approved premium Hero raster should decode in Safari' },
  ).toBe(true);

  const canvasColor = await mobileHome.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(canvasColor).toBe('rgb(247, 250, 255)');

  const atmosphere = page.locator('.bes-vn-atmosphere');
  if (await atmosphere.count()) {
    await expect(atmosphere).toBeHidden();
  }
});
