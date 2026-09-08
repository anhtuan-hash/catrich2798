import { test, expect } from '@playwright/test';

const CRITICAL_ROUTES = ['#/dashboard', '#/tool/gradebook-studio', '#/settings'];

function captureDiagnostics(page) {
  const pageErrors = [];
  const browserErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error?.message || error)));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    browserErrors.push(text);
    if (text.includes('[AppErrorBoundary]') || /ReferenceError|TypeError|RangeError/i.test(text)) {
      console.log(`[browser-error] ${text}`);
    }
  });
  return { pageErrors, browserErrors };
}

async function dismissOrEnterDemoAdmin(page) {
  const demoAdmin = page.getByRole('button', { name: /Demo Admin/i });
  if (await demoAdmin.isVisible({ timeout: 1200 }).catch(() => false)) {
    await demoAdmin.click();
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

async function assertHealthyShell(page, diagnostics) {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#bes-main-content')).toBeVisible();
  await expect(page.locator('#bes-global-wave-loader')).toHaveCount(0);
  const navFailure = page.getByText(/Không thể mở thanh điều hướng|Cannot open navigation/i).first();
  if (await navFailure.isVisible().catch(() => false)) {
    throw new Error(`Navigation boundary opened. pageErrors=${JSON.stringify(diagnostics.pageErrors)} browserErrors=${JSON.stringify(diagnostics.browserErrors)}`);
  }
  await expect(page.locator('body')).not.toContainText(/Application error|Cannot read properties of undefined|ChunkLoadError/i);
}

test('public shell stays healthy without retired global loader', async ({ page }) => {
  const diagnostics = captureDiagnostics(page);
  await page.goto('/#/home');
  await page.waitForTimeout(300);
  await assertHealthyShell(page, diagnostics);
  expect(diagnostics.pageErrors).toEqual([]);
});

for (const route of CRITICAL_ROUTES) {
  test(`${route} boots or falls back safely`, async ({ page }) => {
    const diagnostics = captureDiagnostics(page);

    await page.goto(`/${route}`);
    await dismissOrEnterDemoAdmin(page);
    if (!page.url().includes(route)) await page.goto(`/${route}`);
    await page.waitForTimeout(300);

    await assertHealthyShell(page, diagnostics);
    expect(diagnostics.pageErrors).toEqual([]);
  });
}
