import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/to-chuyen-mon/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('complete meetings workspace supports minutes, tasks, editing and persistence', async ({ page }) => {
  await page.getByTestId('tab-meetings').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Cuộc họp và biên bản' })).toBeVisible();

  await workspace.getByRole('button', { name: 'Tạo cuộc họp' }).click();
  const modal = page.getByTestId('meeting-editor-modal');
  await modal.getByLabel('Tên cuộc họp').fill('Sinh hoạt chuyên đề kiểm tra đánh giá');
  await modal.getByLabel('Loại cuộc họp').selectOption('Sinh hoạt chuyên đề');
  await modal.getByLabel('Địa điểm cuộc họp').fill('Phòng Hội đồng');
  await modal.getByLabel('Chương trình họp').fill('Thống nhất ma trận kiểm tra\nPhân công biên soạn đề\nChốt thời hạn nộp');
  await modal.getByLabel('Kết luận cuộc họp').fill('Hoàn thiện ma trận và đề minh họa trong tuần.');
  await modal.getByRole('button', { name: 'Tạo cuộc họp' }).click();

  await workspace.getByLabel('Tìm cuộc họp').fill('kiểm tra đánh giá');
  const meeting = workspace.getByTestId(/meeting-/).filter({ hasText: 'Sinh hoạt chuyên đề kiểm tra đánh giá' });
  await expect(meeting).toBeVisible();
  await meeting.locator('.mw-main').click();

  const detail = page.getByTestId('meeting-detail-panel');
  await expect(detail.getByText('Phòng Hội đồng')).toBeVisible();
  const firstAgenda = detail.locator('.mw-agenda input[type="checkbox"]').first();
  await firstAgenda.check();
  await expect(firstAgenda).toBeChecked();

  await detail.getByLabel('Nội dung biên bản').fill('Tổ đã thảo luận ma trận, cấu trúc đề và phân công giáo viên phụ trách từng phần.');
  await detail.getByRole('button', { name: 'Lưu biên bản' }).click();
  await expect(detail.locator('.mw-status')).toHaveText('Đã lưu biên bản');

  await detail.getByLabel('Tên nhiệm vụ sau họp').fill('Hoàn thiện ma trận kiểm tra chung');
  await detail.getByRole('button', { name: 'Tạo nhiệm vụ' }).click();
  await expect(detail.getByText('Hoàn thiện ma trận kiểm tra chung')).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const tasks = JSON.parse(localStorage.getItem('department-v2-tasks') || '[]');
    return tasks.some((task) => task.title === 'Hoàn thiện ma trận kiểm tra chung');
  })).toBe(true);

  await detail.getByLabel('Phản hồi cuộc họp').fill('Cần bổ sung minh chứng họp vào kho hồ sơ.');
  await detail.getByRole('button', { name: 'Gửi phản hồi' }).click();
  await expect(detail.getByText('Cần bổ sung minh chứng họp vào kho hồ sơ.')).toBeVisible();

  await detail.getByRole('button', { name: 'Chỉnh sửa' }).click();
  const editModal = page.getByTestId('meeting-editor-modal');
  await editModal.getByLabel('Tên cuộc họp').fill('Sinh hoạt chuyên đề kiểm tra đánh giá – hoàn chỉnh');
  await editModal.getByRole('button', { name: 'Lưu thay đổi' }).click();

  await workspace.getByLabel('Tìm cuộc họp').fill('hoàn chỉnh');
  await expect(workspace.getByText('Sinh hoạt chuyên đề kiểm tra đánh giá – hoàn chỉnh')).toBeVisible();

  await page.reload();
  await page.getByTestId('tab-meetings').click();
  const restored = page.locator('.task-workspace-bridge');
  await restored.getByLabel('Tìm cuộc họp').fill('hoàn chỉnh');
  await expect(restored.getByText('Sinh hoạt chuyên đề kiểm tra đánh giá – hoàn chỉnh')).toBeVisible();

  await page.getByTestId('tab-tasks').click();
  const tasksWorkspace = page.locator('.task-workspace-bridge');
  await tasksWorkspace.getByLabel('Tìm nhiệm vụ').fill('ma trận kiểm tra chung');
  await expect(tasksWorkspace.getByText('Hoàn thiện ma trận kiểm tra chung')).toBeVisible();
});
