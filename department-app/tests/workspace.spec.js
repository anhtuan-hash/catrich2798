import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/to-chuyen-mon/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('dashboard renders at proposal scale and tabs work', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Tổng quan tổ chuyên môn' })).toBeVisible();
  const frame = page.locator('.app-frame');
  const box = await frame.boundingBox();
  expect(box.width).toBeGreaterThan(1450);
  await page.getByTestId('tab-tasks').click();
  await expect(page.getByRole('heading', { name: 'Giao việc và theo dõi' })).toBeVisible();
  await page.getByTestId('tab-plans').click();
  await expect(page.getByRole('heading', { name: 'Kế hoạch và tiến độ' })).toBeVisible();
});

test('MacBook viewport uses enlarged, readable density', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  const hero = page.locator('.hero-card');
  const heroBox = await hero.boundingBox();
  expect(heroBox.height).toBeGreaterThanOrEqual(245);
  const heroTitleSize = await page.locator('.hero-copy h1').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const taskTitleSize = await page.locator('.task-copy strong').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const headerHeight = await page.locator('.app-header').evaluate((element) => element.getBoundingClientRect().height);
  expect(heroTitleSize).toBeGreaterThanOrEqual(34);
  expect(taskTitleSize).toBeGreaterThanOrEqual(12);
  expect(headerHeight).toBeGreaterThanOrEqual(86);
});

test('creates and persists a task, filters and updates status', async ({ page }) => {
  await page.getByTestId('tab-tasks').click();
  await page.getByRole('button', { name: 'Tạo nhiệm vụ' }).click();
  await page.getByLabel('Tên nhiệm vụ').fill('Kiểm tra chức năng nhiệm vụ');
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Kiểm tra chức năng nhiệm vụ')).toBeVisible();
  await page.reload();
  await page.getByTestId('tab-tasks').click();
  await expect(page.getByText('Kiểm tra chức năng nhiệm vụ')).toBeVisible();
  const createdTask = page.getByTestId(/task-/).filter({ hasText: 'Kiểm tra chức năng nhiệm vụ' });
  await createdTask.getByRole('button', { name: /Tùy chọn Kiểm tra chức năng nhiệm vụ/ }).click();
  await createdTask.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
  await expect(page.getByText('Hoàn thành').first()).toBeVisible();
});

test('notifications, search, meetings and record approval work', async ({ page }) => {
  await page.getByRole('button', { name: 'Đánh dấu đã đọc' }).click();
  await expect(page.getByText('0 thông báo chưa đọc')).toBeVisible();
  await page.getByLabel('Tìm kiếm nhanh').fill('ma trận');
  await page.locator('.search-results').getByRole('button', { name: /Xây dựng ma trận/ }).click();
  await expect(page.getByRole('heading', { name: 'Giao việc và theo dõi' })).toBeVisible();
  await page.getByTestId('tab-meetings').click();
  const checkbox = page.getByRole('checkbox').first();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await page.getByTestId('tab-records').click();
  await page.getByRole('button', { name: 'Duyệt' }).first().click();
  await expect(page.getByText('Đã duyệt').first()).toBeVisible();
});
