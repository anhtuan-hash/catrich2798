import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/to-chuyen-mon/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('evidence workspace creates files and persists after reload', async ({ page }) => {
  await page.getByTestId('tab-evidence').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Minh chứng và xác minh' })).toBeVisible();
  await workspace.getByRole('button', { name: 'Thêm minh chứng' }).click();

  const modal = page.getByTestId('evidence-editor-modal');
  await modal.getByLabel('Tên minh chứng').fill('Minh chứng chuyên đề chuyển đổi số tháng 7');
  await modal.getByLabel('Loại minh chứng').selectOption('Chuyên đề');
  await modal.getByLabel('Tiêu chí minh chứng').selectOption('Ứng dụng công nghệ');
  await modal.getByLabel('Người phụ trách minh chứng').selectOption('Phạm Thu Hà');
  await modal.getByLabel('Mô tả minh chứng').fill('Tài liệu, hình ảnh và sản phẩm sau buổi sinh hoạt chuyên đề.');
  await modal.getByLabel('Liên kết minh chứng').fill('Kế hoạch chuyên đề ứng dụng AI');
  await modal.locator('input[type=file]').setInputFiles({
    name: 'minh-chung-chuyen-de.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('evidence-demo'),
  });
  await modal.getByRole('button', { name: 'Thêm minh chứng' }).click();

  await page.waitForFunction(() => {
    const items = JSON.parse(localStorage.getItem('department-v2-evidence') || '[]');
    return items.some((item) => item.title === 'Minh chứng chuyên đề chuyển đổi số tháng 7' && item.attachments?.some((file) => file.name === 'minh-chung-chuyen-de.pdf'));
  });
  await page.reload();
  await page.getByTestId('tab-evidence').click();
  const restored = page.locator('.task-workspace-bridge');
  await restored.getByLabel('Tìm minh chứng').fill('chuyển đổi số tháng 7');
  const restoredRow = restored.getByTestId(/evidence-/).filter({ hasText: 'Minh chứng chuyên đề chuyển đổi số tháng 7' });
  await expect(restoredRow).toBeVisible();
  await expect(restoredRow.locator('.ew-status')).toHaveText('Chờ xác minh');
});

test('evidence workspace supports feedback verification and archive', async ({ page }) => {
  await page.getByTestId('tab-evidence').click();
  const workspace = page.locator('.task-workspace-bridge');
  await workspace.getByLabel('Tìm minh chứng').fill('bồi dưỡng học sinh giỏi');
  const row = workspace.getByTestId('evidence-2');
  await expect(row).toBeVisible();
  await row.locator('.ew-main').click();

  const detail = page.getByTestId('evidence-detail-panel');
  await detail.getByLabel('Phản hồi minh chứng').fill('Minh chứng đầy đủ, đề nghị xác minh và lưu kho.');
  await detail.getByRole('button', { name: 'Gửi phản hồi' }).click();
  await expect(detail.getByText('Minh chứng đầy đủ, đề nghị xác minh và lưu kho.')).toBeVisible();
  await detail.getByRole('button', { name: 'Xác minh', exact: true }).click();
  await expect(detail.locator('header .ew-status')).toHaveText('Đã xác minh');
  await detail.getByRole('button', { name: 'Lưu kho', exact: true }).click();
  await expect(detail.locator('header .ew-status')).toHaveText('Đã lưu kho');
  await page.waitForFunction(() => {
    const items = JSON.parse(localStorage.getItem('department-v2-evidence') || '[]');
    return items.some((item) => item.id === 2 && item.status === 'Đã lưu kho');
  });
});
