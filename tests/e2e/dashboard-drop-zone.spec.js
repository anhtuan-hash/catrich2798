import { test, expect } from '@playwright/test';

const DEMO_SESSION_KEY = 'bes-offline-demo-user-v943';

function demoAdmin() {
  return {
    id: 'dashboard-drop-zone-admin',
    authId: 'dashboard-drop-zone-admin',
    role: 'admin',
    name: 'Drop Zone Admin',
    school: 'Brian English E2E',
    email: 'dropzone.admin@brianenglish.local',
    approved: true,
    createdAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z',
    permissions: { mode: 'all', allowed: [] },
    provider: 'offline-demo',
    demo: true,
  };
}

async function openDashboard(page) {
  await page.addInitScript(({ key, user }) => {
    localStorage.setItem(key, JSON.stringify(user));
    localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_SESSION_KEY, user: demoAdmin() });
  await page.goto('/#/dashboard');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'dashboard');
  await expect(page.locator('.brian-dashboard-drop-zone')).toBeVisible({ timeout: 10000 });
}

test('Brian Drop Zone sends dropped text directly to Question Bank import', async ({ page }) => {
  await openDashboard(page);

  const sample = '1. Which option is correct?\nA. Alpha\nB. Beta\nC. Gamma\nD. Delta\nANSWER: A';
  await page.evaluate((text) => {
    const zone = document.querySelector('.brian-dashboard-drop-zone');
    const transfer = new DataTransfer();
    transfer.setData('text/plain', text);
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, sample);

  await expect(page.locator('.brian-dashboard-drop-zone')).toHaveClass(/has-packet/);
  await page.getByRole('button', { name: /Nhập Ngân hàng câu hỏi/i }).click();

  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'assessment-core');
  await expect(page.locator('.qb-paste-import')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.qb-paste-textarea textarea')).toHaveValue(sample);
});

test('Brian Drop Zone stages a dropped file in Resource Library upload form', async ({ page }) => {
  await openDashboard(page);

  await page.evaluate(() => {
    const zone = document.querySelector('.brian-dashboard-drop-zone');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['worksheet content'], 'Unit-1-worksheet.txt', { type: 'text/plain' }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });

  await expect(page.locator('.brian-dashboard-drop-zone')).toHaveClass(/has-packet/);
  await page.getByRole('button', { name: /Lưu Kho học liệu/i }).click();

  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'resource-library');
  const modal = page.locator('.resource-upload-modal');
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(modal).toContainText('Unit-1-worksheet.txt');
  await expect(modal.locator('input').first()).toHaveValue('Unit-1-worksheet');
});

test('Brian Drop Zone stays compact and usable on phone width', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await openDashboard(page);

  const zone = page.locator('.brian-dashboard-drop-zone');
  const box = await zone.boundingBox();
  expect(box?.width || 0).toBeLessThanOrEqual(430);
  await expect(zone.getByRole('button', { name: /Chọn file/i })).toBeVisible();
  await expect(zone.getByRole('button', { name: /Dán văn bản/i })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
});
