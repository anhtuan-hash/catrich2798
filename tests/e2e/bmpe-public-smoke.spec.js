import { test, expect } from '@playwright/test';

// These guest route checks run against the freshly built Brian application.
// They do NOT claim to validate authenticated Supabase workflows.
for (const viewport of [{ width: 1280, height: 800 }, { width: 1512, height: 982 }]) {
  test(`Brian guest home renders at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/home', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app-shell')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#bes-main-content')).toBeAttached();
    await expect(page.locator('body')).not.toContainText(/ChunkLoadError|Failed to fetch dynamically imported module/);
    // Screenshots are evidence only; they are not automatically "visual parity PASS".
    await page.screenshot({ path: `reports/bmpe-guest-${viewport.width}x${viewport.height}.png`, fullPage: false });
  });
}

test('OS reduced-motion still leaves guest main content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/home', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bes-main-content')).toBeVisible({ timeout: 20_000 });
  const style = await page.locator('#bes-main-content').evaluate(node => {
    const value = getComputedStyle(node);
    return { visibility: value.visibility, opacity: Number(value.opacity), animationDuration: value.animationDuration };
  });
  expect(style.visibility).not.toBe('hidden');
  expect(style.opacity).toBeGreaterThan(0);
});