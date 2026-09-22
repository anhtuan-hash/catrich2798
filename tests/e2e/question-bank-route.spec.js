import { test, expect } from '@playwright/test';

const DEMO_SESSION_KEY = 'bes-offline-demo-user-v943';

function demoAdmin() {
  return {
    id: 'question-bank-admin',
    authId: 'question-bank-admin',
    role: 'admin',
    name: 'Question Bank Admin',
    school: 'Brian English E2E',
    email: 'question-bank.admin@brianenglish.local',
    approved: true,
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    permissions: { mode: 'all', allowed: [] },
    provider: 'offline-demo',
    demo: true,
  };
}

async function openQuestionBank(page) {
  await page.addInitScript(({ key, user }) => {
    window.localStorage.setItem(key, JSON.stringify(user));
    window.localStorage.setItem('bet-language', 'vi');
  }, { key: DEMO_SESSION_KEY, user: demoAdmin() });

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error?.message || error)));

  await page.goto('/#/assessment-core');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-route', 'assessment-core');
  await expect(page.getByRole('heading', { name: /Chưa được cấp quyền|Permission required/i })).toHaveCount(0);
  await expect(page.locator('#bes-main-content > .bqa-content-safe-frame > .qb-shell')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /Ngân hàng/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Kho câu hỏi/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Nhập từ ChatGPT/i }).first()).toBeVisible();
  await expect(page.locator('#bes-main-content')).not.toHaveCSS('height', '0px');
  await expect(pageErrors, `Unhandled Question Bank errors: ${pageErrors.join('\n')}`).toEqual([]);
}

test('Question Bank route renders a non-blank workspace in Chromium', async ({ page }) => {
  await openQuestionBank(page);
});

test('Question Bank route stays visible on a 16:9 desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await openQuestionBank(page);
  const box = await page.locator('.qb-shell').boundingBox();
  expect(box?.height || 0).toBeGreaterThan(300);
});


test('Question Bank exposes the zero-cost ChatGPT paste-import workspace', async ({ page }) => {
  await openQuestionBank(page);
  await page.getByRole('button', { name: /^Nhập từ ChatGPT$/i }).first().click();
  await expect(page.getByRole('heading', { name: /^Nhập từ ChatGPT$/i })).toBeVisible();
  await expect(page.getByText(/Không gọi OpenAI API/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Phân tích nội dung/i })).toBeVisible();
  await expect(page.locator('.qb-paste-textarea textarea')).toBeVisible();
});

test('Assessment Core V7 keeps premium horizontal navigation across all modules', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await openQuestionBank(page);

  await expect(page.locator('.qb-shell.qb-shell-v7')).toBeVisible();
  await expect(page.locator('.qb-tabs-horizontal button')).toHaveCount(11);
  await expect(page.locator('.qb-v6-hero')).toBeVisible();
  await expect(page.locator('.qb-v7-hero-graphic svg')).toBeVisible();
  await expect(page.locator('.qb-v7-hero-label')).toBeVisible();

  const modules = [
    ['Kho câu hỏi', 'questions'],
    ['Chùm bài', 'bundles'],
    ['Quản trị', 'manage'],
    ['Phân quyền', 'share'],
    ['Ma trận', 'blueprints'],
    ['Phủ ma trận', 'coverage'],
    ['Chất lượng', 'quality'],
    ['Tạo đề', 'builder'],
    ['Đề thi', 'tests'],
    ['Nhập từ ChatGPT', 'import'],
    ['API / Plugin', 'chatgpt'],
  ];

  for (const [label, tab] of modules) {
    await page.getByRole('button', { name: label, exact: true }).first().click();
    await expect(page.locator('.qb-shell.qb-shell-v7')).toHaveAttribute('data-qb-tab', tab);
    await expect(page.locator('.qb-v6-hero')).toBeVisible();
    await expect(page.locator('.qb-v7-hero-graphic svg')).toBeVisible();
    await expect(page.locator('.qb-v7-hero-label')).toBeVisible();
  }
});

test('Assessment Core V7 uses the canonical global Dashboard footer', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await openQuestionBank(page);

  const footer = page.locator('footer[data-app-shell-footer="true"]');
  await expect(footer).toHaveAttribute('data-footer-mode', 'full');
  await expect(footer).toHaveClass(/signature-footer-dashboard-global/);
  await expect(footer.locator('.signature-footer-expanded-panel')).toBeVisible();
  await expect(footer.locator('.signature-footer-static-summary')).toBeVisible();
  await expect(footer.getByText(/English Hub v/i)).toBeVisible();
});

test('Assessment Core V7 hero is product graphics only', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 960 });
  await openQuestionBank(page);

  await expect(page.locator('.qb-v7-hero-graphic svg')).toBeVisible();
  await expect(page.locator('.qb-v6-handwritten')).toHaveCount(0);
  await expect(page.locator('.qb-v7-hero-label')).toBeVisible();
});

