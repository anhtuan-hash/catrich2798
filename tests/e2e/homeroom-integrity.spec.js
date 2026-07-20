import { test, expect } from '@playwright/test';

const demoUser = { id: 'offline-demo-admin', authId: 'offline-demo-admin', role: 'admin', name: 'Demo Teacher Admin', email: 'demo.admin@brianenglish.local', approved: true, permissions: { mode: 'all', allowed: [] }, provider: 'offline-demo', demo: true };
const workspace = {
  id: 'default', status: 'active', semester: 'Học kỳ I',
  classProfile: { className: '12.1', schoolYear: '2026-2027', grade: '12', adviserName: 'Demo Teacher Admin', adviserEmail: demoUser.email },
  students: [
    { id: 's1', code: 'A01', fullName: 'Nguyễn Minh Anh', portalPin: '123456', active: true, supportLevel: 'normal' },
    { id: 's2', code: 'A02', fullName: 'Nguyễn Minh Anh', portalPin: '654321', active: true, supportLevel: 'normal' },
  ],
  schedule: [{ id: 'event-1', title: 'Họp lớp', date: '2026-08-01', startTime: '08:00', endTime: '', location: 'Phòng 12.1', category: 'Sinh hoạt lớp', audience: 'Toàn lớp', status: 'Sắp tới', createdAt: '2026-07-20T00:00:00.000Z' }],
  learningRecords: [
    { id: 'en', studentId: 's1', subject: 'Tiếng Anh', period: 'Học kỳ I', assessment: 'Bài 1', score: 8, maxScore: 10, recordedAt: '2026-07-20' },
    { id: 'math', studentId: 's1', subject: 'Toán', period: 'Học kỳ I', assessment: 'Bài 1', score: 4, maxScore: 10, recordedAt: '2026-07-20' },
  ],
  gradeSettings: { warningThreshold: 6.5, highRiskThreshold: 5, lockedPeriods: [] },
  attendance: {}, attendanceSessions: {}, attendanceLocks: {}, correctionRequests: [], meetings: [], parentContacts: [], records: [], alerts: [], subjectFeedback: [], teams: [], competitionEvents: [], announcements: [], incidents: [], supportPlans: [], messageTemplates: [], scheduledMessages: [], reminders: [], attachments: [], auditLogs: [], backups: [], conductRecords: [], conductCustomRules: [], conductWeekSummaries: [], portalConfig: {}, settings: {}, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-20T00:00:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ user, data }) => {
    localStorage.setItem('bes-offline-demo-user-v943', JSON.stringify(user));
    localStorage.setItem('bes-homeroom-workspace-v1:offline-demo-admin:default', JSON.stringify(data));
    localStorage.setItem('bes-homeroom-workspace-index-v3:offline-demo-admin', JSON.stringify([{ id: 'default', className: '12.1', schoolYear: '2026-2027', status: 'active', studentCount: 2, updatedAt: data.updatedAt }]));
    localStorage.setItem('bes-homeroom-current-workspace-v3:offline-demo-admin', 'default');
  }, { user: demoUser, data: workspace });
});

test('homeroom integrity workflow', async ({ page }) => {
  await page.goto('/#/homeroom');
  await expect(page.getByRole('heading', { name: 'Giáo viên chủ nhiệm' })).toBeVisible();
  await page.getByRole('button', { name: /Học sinh/ }).click();
  await expect(page.getByText('Nguyễn Minh Anh', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: /Học tập/ }).click();
  await expect(page.getByRole('heading', { name: 'Điểm kiểm tra thường xuyên · 4 đợt' })).toBeVisible();
  const analytics = page.locator('.hr-panel').filter({ has: page.getByRole('heading', { name: 'Tình hình học tập theo học sinh' }) });
  await analytics.locator('select').selectOption({ label: 'Tiếng Anh' });
  await expect(page.locator('.hr-stat').first().locator('strong')).toHaveText('8.0');
  const directForm = page.locator('.hr-panel').filter({ has: page.getByRole('heading', { name: 'Kết quả học tập' }) });
  await directForm.getByLabel('Học sinh').selectOption('s1');
  await directForm.getByLabel('Điểm').fill('11');
  await directForm.getByRole('button', { name: 'Lưu điểm' }).click();
  await expect(directForm.locator('.hr-error')).toContainText('0–10');
  await page.getByRole('button', { name: /Lịch công việc/ }).click();
  await expect(page.locator('.hr-schedule-list article')).toHaveCount(1);
  await page.locator('.hr-schedule-list article').getByRole('button', { name: 'Sửa' }).click();
  const scheduleForm = page.locator('.hr-panel').filter({ has: page.getByRole('heading', { name: 'Chỉnh sửa công việc' }) });
  await scheduleForm.getByLabel('Nội dung công việc').fill('Họp phụ huynh');
  await scheduleForm.getByLabel('Ngày').fill('2026-08-02');
  await scheduleForm.getByRole('button', { name: 'Cập nhật' }).click();
  await expect(page.locator('.hr-schedule-list article')).toHaveCount(1);
  await expect(page.locator('.hr-schedule-list article').getByRole('heading')).toHaveText('Họp phụ huynh');
});
