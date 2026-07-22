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
  const taskWorkspace = page.locator('.task-workspace-bridge');
  await expect(taskWorkspace).toBeVisible();
  await expect(taskWorkspace.getByRole('heading', { name: 'Giao việc và theo dõi' })).toBeVisible();

  await page.getByTestId('tab-plans').click();
  await expect(page.getByRole('heading', { name: 'Kế hoạch và tiến độ' })).toBeVisible();
});

test('MacBook viewport uses genuinely readable typography and redistributed layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();

  const heroBox = await page.locator('.hero-card').boundingBox();
  const taskPanelBox = await page.locator('.task-panel').boundingBox();
  const heroTitleSize = await page.locator('.hero-copy h1').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const taskTitleSize = await page.locator('.task-copy strong').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const kpiLabelSize = await page.locator('.kpi-card p').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const notificationTitleSize = await page.locator('.notification-list strong').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const sectionTitleSize = await page.locator('.task-panel .section-head h2').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  const headerHeight = await page.locator('.app-header').evaluate((element) => element.getBoundingClientRect().height);
  const summaryColumns = await page.locator('.summary-row').evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);

  expect(heroBox.height).toBeGreaterThanOrEqual(360);
  expect(taskPanelBox.width).toBeGreaterThan(950);
  expect(heroTitleSize).toBeGreaterThanOrEqual(42);
  expect(taskTitleSize).toBeGreaterThanOrEqual(15);
  expect(kpiLabelSize).toBeGreaterThanOrEqual(16);
  expect(notificationTitleSize).toBeGreaterThanOrEqual(14);
  expect(sectionTitleSize).toBeGreaterThanOrEqual(21);
  expect(headerHeight).toBeGreaterThanOrEqual(92);
  expect(summaryColumns).toBe(3);
});

test('global notification drawer opens and closes from both controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();

  const drawer = page.getByTestId('global-notification-drawer');
  await expect(drawer).toHaveCount(0);

  await page.getByRole('button', { name: 'Mở thông báo' }).click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('3 thông báo chưa đọc')).toBeVisible();
  await drawer.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
  await expect(drawer.getByText('0 thông báo chưa đọc')).toBeVisible();

  await drawer.getByRole('button', { name: 'Đóng bảng thông báo' }).click();
  await expect(drawer).toHaveCount(0);

  await page.getByRole('button', { name: 'Mở thông báo' }).click();
  await expect(drawer).toBeVisible();
  await page.locator('.global-notification-scrim').click();
  await expect(drawer).toHaveCount(0);
});

test('creates and persists a task, filters and updates status', async ({ page }) => {
  await page.getByTestId('tab-tasks').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace).toBeVisible();
  await workspace.getByRole('button', { name: 'Tạo nhiệm vụ' }).click();

  const modal = page.getByTestId('task-editor-modal');
  await modal.getByLabel('Tên nhiệm vụ').fill('Kiểm tra chức năng nhiệm vụ');
  await modal.getByLabel('Mô tả chi tiết').fill('Kiểm tra lưu dữ liệu và cập nhật trạng thái.');
  await modal.getByRole('button', { name: 'Tạo nhiệm vụ' }).click();
  await expect(workspace.getByText('Kiểm tra chức năng nhiệm vụ')).toBeVisible();

  await page.reload();
  await page.getByTestId('tab-tasks').click();
  const restoredWorkspace = page.locator('.task-workspace-bridge');
  await expect(restoredWorkspace.getByText('Kiểm tra chức năng nhiệm vụ')).toBeVisible();
  const createdTask = restoredWorkspace.getByTestId(/task-/).filter({ hasText: 'Kiểm tra chức năng nhiệm vụ' });
  await createdTask.getByRole('button', { name: /Tùy chọn Kiểm tra chức năng nhiệm vụ/ }).click();
  await createdTask.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
  await expect(createdTask.locator('.tw-status')).toHaveText('Hoàn thành');
});

test('complete task workspace supports assignment, search, files, feedback and editing', async ({ page }) => {
  await page.getByTestId('tab-tasks').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Giao việc và theo dõi' })).toBeVisible();
  await expect(workspace.getByText('Tổng nhiệm vụ')).toBeVisible();

  await workspace.getByRole('button', { name: 'Tạo nhiệm vụ' }).click();
  const modal = page.getByTestId('task-editor-modal');
  await modal.getByLabel('Tên nhiệm vụ').fill('Chuẩn bị chuyên đề chuyển đổi số');
  await modal.getByLabel('Mô tả chi tiết').fill('Hoàn thiện nội dung, minh chứng và tài liệu trình chiếu.');
  await modal.getByText('Nguyễn Thị Mai', { exact: true }).click();
  await modal.getByText('Trần Minh Đức', { exact: true }).click();
  await modal.getByLabel('Mức độ ưu tiên').selectOption('Cao');
  await modal.getByLabel('Trạng thái').selectOption('Đang thực hiện');
  await modal.getByLabel('Tiến độ nhiệm vụ').evaluate((element) => {
    element.value = '35';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await modal.getByLabel('Tiêu chí hoàn thành').fill('Có kế hoạch chi tiết\nCó tài liệu trình chiếu\nCó minh chứng triển khai');
  await modal.locator('input[type=file]').setInputFiles({
    name: 'ke-hoach.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('demo'),
  });
  await modal.getByRole('button', { name: 'Tạo nhiệm vụ' }).click();

  await workspace.getByLabel('Tìm nhiệm vụ').fill('chuyển đổi số');
  const task = workspace.getByTestId(/task-/).filter({ hasText: 'Chuẩn bị chuyên đề chuyển đổi số' });
  await expect(task).toBeVisible();
  await expect(task.getByText('Cao')).toBeVisible();
  await task.locator('.tw-task-main').click();

  const detail = page.getByTestId('task-detail-panel');
  await expect(detail.getByText('Nguyễn Thị Mai, Trần Minh Đức')).toBeVisible();
  await expect(detail.getByText('ke-hoach.docx')).toBeVisible();
  await detail.getByRole('checkbox').first().check();
  await detail.getByLabel('Nội dung phản hồi').fill('Vui lòng bổ sung thời lượng cho từng hoạt động.');
  await detail.getByRole('button', { name: 'Gửi phản hồi' }).click();
  await expect(detail.getByText('Vui lòng bổ sung thời lượng cho từng hoạt động.')).toBeVisible();

  await detail.getByRole('button', { name: 'Chỉnh sửa' }).click();
  const editModal = page.getByTestId('task-editor-modal');
  await editModal.getByLabel('Tên nhiệm vụ').fill('Chuẩn bị chuyên đề chuyển đổi số – hoàn chỉnh');
  await editModal.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(workspace.getByText('Chuẩn bị chuyên đề chuyển đổi số – hoàn chỉnh')).toBeVisible();

  await workspace.getByLabel('Lọc ưu tiên').selectOption('Cao');
  await expect(workspace.getByText('Chuẩn bị chuyên đề chuyển đổi số – hoàn chỉnh')).toBeVisible();
  await page.reload();
  await page.getByTestId('tab-tasks').click();
  const reloadedWorkspace = page.locator('.task-workspace-bridge');
  await reloadedWorkspace.getByLabel('Tìm nhiệm vụ').fill('hoàn chỉnh');
  await expect(reloadedWorkspace.getByText('Chuẩn bị chuyên đề chuyển đổi số – hoàn chỉnh')).toBeVisible();
});

test('complete records workspace supports submission, review, approval and archive', async ({ page }) => {
  await page.getByTestId('tab-records').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Nộp và phê duyệt hồ sơ' })).toBeVisible();
  await expect(workspace.getByText('Chờ duyệt').first()).toBeVisible();

  await workspace.getByRole('button', { name: 'Nộp hồ sơ' }).click();
  const modal = page.getByTestId('record-editor-modal');
  await modal.getByLabel('Tên hồ sơ').fill('Kế hoạch bài dạy Unit 3 – Lớp 11A1');
  await modal.getByLabel('Người nộp').selectOption('Đỗ Thị Hương');
  await modal.getByLabel('Loại hồ sơ').selectOption('Kế hoạch bài dạy');
  await modal.getByLabel('Mô tả hồ sơ').fill('Hồ sơ cần được kiểm tra nội dung hoạt động và tiêu chí đánh giá.');
  await modal.locator('input[type=file]').setInputFiles({
    name: 'unit-3-lesson-plan.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('record-demo'),
  });
  await modal.getByRole('button', { name: 'Nộp hồ sơ' }).click();

  await workspace.getByLabel('Tìm hồ sơ').fill('Unit 3');
  const record = workspace.getByTestId(/record-/).filter({ hasText: 'Kế hoạch bài dạy Unit 3 – Lớp 11A1' });
  await expect(record).toBeVisible();
  await expect(record.getByText('Chờ duyệt')).toBeVisible();
  await record.locator('.rw-record-main').click();

  const detail = page.getByTestId('record-detail-panel');
  await expect(detail.getByText('unit-3-lesson-plan.docx')).toBeVisible();
  await detail.getByLabel('Nhận xét hồ sơ').fill('Hồ sơ đạt yêu cầu, đề nghị lưu cùng minh chứng đánh giá.');
  await detail.getByRole('button', { name: 'Gửi nhận xét' }).click();
  await expect(detail.getByText('Hồ sơ đạt yêu cầu, đề nghị lưu cùng minh chứng đánh giá.')).toBeVisible();
  await detail.getByRole('button', { name: 'Duyệt' }).click();
  await expect(detail.getByText('Đã duyệt').first()).toBeVisible();
  await detail.getByRole('button', { name: 'Lưu kho' }).click();
  await expect(detail.getByText('Đã lưu kho').first()).toBeVisible();

  await page.reload();
  await page.getByTestId('tab-records').click();
  const restoredWorkspace = page.locator('.task-workspace-bridge');
  await restoredWorkspace.getByLabel('Tìm hồ sơ').fill('Unit 3');
  const restoredRecord = restoredWorkspace.getByTestId(/record-/).filter({ hasText: 'Kế hoạch bài dạy Unit 3 – Lớp 11A1' });
  await expect(restoredRecord).toBeVisible();
  await expect(restoredRecord.getByText('Đã lưu kho')).toBeVisible();
});

test('notifications and meetings remain interactive', async ({ page }) => {
  await page.getByRole('button', { name: 'Mở thông báo' }).click();
  const drawer = page.getByTestId('global-notification-drawer');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }).click();
  await expect(drawer.getByText('0 thông báo chưa đọc')).toBeVisible();
  await drawer.getByRole('button', { name: 'Đóng bảng thông báo' }).click();
  await expect(drawer).toHaveCount(0);

  await page.getByTestId('tab-meetings').click();
  const workspace = page.locator('.task-workspace-bridge');
  await expect(workspace.getByRole('heading', { name: 'Cuộc họp và biên bản' })).toBeVisible();
  const firstMeeting = workspace.locator('[data-testid^="meeting-"]').first();
  await expect(firstMeeting).toBeVisible();
  await firstMeeting.locator('.mw-main').click();
  const detail = page.getByTestId('meeting-detail-panel');
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('heading').first()).toBeVisible();
});
