import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/to-chuyen-mon/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('complete calendar workspace supports views, creation, editing and persistence', async ({ page }) => {
  await page.getByTestId('tab-calendar').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Lịch công tác và hoạt động' })).toBeVisible();

  await workspace.getByRole('button', { name: 'Tuần', exact: true }).click();
  await expect(workspace.locator('.cw-calendar.cw-tuần')).toBeVisible();
  await workspace.getByRole('button', { name: 'Ngày', exact: true }).click();
  await expect(workspace.locator('.cw-calendar.cw-ngày')).toBeVisible();
  await workspace.getByRole('button', { name: 'Tháng', exact: true }).click();

  await workspace.getByRole('button', { name: 'Tạo hoạt động' }).click();
  const modal = page.getByTestId('calendar-event-modal');
  await modal.getByLabel('Tên hoạt động').fill('Thao giảng chuyên đề lớp 12A1');
  await modal.getByLabel('Loại hoạt động').selectOption('Thao giảng');
  const targetDate = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toISOString().slice(0, 10);
  });
  await modal.getByLabel('Ngày tổ chức').fill(targetDate);
  await modal.getByLabel('Giờ bắt đầu').fill('13:30');
  await modal.getByLabel('Giờ kết thúc').fill('15:00');
  await modal.getByLabel('Địa điểm').fill('Lớp 12A1');
  await modal.getByText('Toàn tổ', { exact: true }).click();
  await modal.getByLabel('Nhắc trước').selectOption('60');
  await modal.getByLabel('Nội dung hoạt động').fill('Thao giảng minh họa kỹ thuật tổ chức hoạt động đọc hiểu.');
  await modal.getByLabel('Tài liệu đính kèm').setInputFiles({
    name: 'ke-hoach-thao-giang.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('calendar-demo'),
  });
  await modal.getByRole('button', { name: 'Tạo hoạt động' }).click();

  await workspace.getByLabel('Tìm hoạt động').fill('Thao giảng chuyên đề');
  const eventChip = workspace.getByRole('button', { name: /Thao giảng chuyên đề lớp 12A1/ }).first();
  await expect(eventChip).toBeVisible();
  await eventChip.click();

  const detail = page.getByTestId('calendar-event-detail');
  await expect(detail.getByText('Lớp 12A1')).toBeVisible();
  await expect(detail.getByText('ke-hoach-thao-giang.pdf')).toBeVisible();
  await expect(detail.getByText('13:30 – 15:00')).toBeVisible();
  await detail.getByRole('button', { name: 'Chỉnh sửa' }).click();

  const editModal = page.getByTestId('calendar-event-modal');
  await editModal.getByLabel('Tên hoạt động').fill('Thao giảng chuyên đề lớp 12A1 – hoàn chỉnh');
  await editModal.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await workspace.getByLabel('Tìm hoạt động').fill('hoàn chỉnh');
  await expect(workspace.getByRole('button', { name: /Thao giảng chuyên đề lớp 12A1 – hoàn chỉnh/ }).first()).toBeVisible();

  await page.reload();
  await page.getByTestId('tab-calendar').click();
  const restored = page.locator('.task-workspace-bridge');
  await restored.getByLabel('Tìm hoạt động').fill('hoàn chỉnh');
  await expect(restored.getByRole('button', { name: /Thao giảng chuyên đề lớp 12A1 – hoàn chỉnh/ }).first()).toBeVisible();
});
