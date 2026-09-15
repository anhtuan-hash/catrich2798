import { test, expect } from '@playwright/test';

async function enterDemoAdmin(page) {
  const demoAdmin = page.getByRole('button', { name: /Demo Admin/i });
  if (await demoAdmin.isVisible({ timeout: 1500 }).catch(() => false)) {
    await demoAdmin.click();
    await page.waitForTimeout(250);
  }
}

async function openStudentSupport(page) {
  await page.goto('/#/student-support');
  await enterDemoAdmin(page);
  if (!page.url().includes('#/student-support')) await page.goto('/#/student-support');
  await expect(page.locator('main.student-support-center')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('heading', { name: /Trung tâm Hỗ trợ Học sinh|Student Support Center/i })).toBeVisible();
}

test('protected Student Support route boots without runtime failure', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
  await openStudentSupport(page);
  await expect(page.locator('body')).not.toContainText(/Application error|ChunkLoadError|Cannot read properties of undefined/i);
  expect(pageErrors).toEqual([]);
});

test('Student Support has no horizontal page overflow at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudentSupport(page);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test('Student Support keeps the deterministic no-AI surface visible', async ({ page }) => {
  await openStudentSupport(page);
  await expect(page.getByText(/Không AI|No AI/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Quy tắc|Rules/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Báo cáo|Reports/i })).toBeVisible();
});
