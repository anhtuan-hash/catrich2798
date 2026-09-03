import { test, expect } from '@playwright/test';

const CRITICAL_ROUTES = ['#/dashboard', '#/tool/gradebook-studio', '#/settings'];

async function dismissOrEnterDemoAdmin(page) {
  const demoAdmin = page.getByRole('button', { name: /Demo Admin/i });
  if (await demoAdmin.isVisible({ timeout: 1200 }).catch(() => false)) {
    await demoAdmin.click();
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

async function assertHealthyShell(page) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#bes-main-content')).toBeVisible();
  await expect(page.locator('#bes-global-wave-loader')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Application error|Cannot read properties of undefined|ChunkLoadError/i);
}

test('public shell stays healthy without retired global loader', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
  await page.goto('/#/home');
  await assertHealthyShell(page);
  expect(pageErrors).toEqual([]);
});

for (const route of CRITICAL_ROUTES) {
  test(`${route} boots or falls back safely`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));

    await page.goto(`/${route}`);
    await dismissOrEnterDemoAdmin(page);
    if (!page.url().includes(route)) await page.goto(`/${route}`);

    await assertHealthyShell(page);
    expect(pageErrors).toEqual([]);
  });
}
