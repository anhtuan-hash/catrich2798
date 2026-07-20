import fs from 'node:fs';
import {
  addLearningRecord,
  addParentContact,
  addScheduleItem,
  addStudent,
  makeDefaultHomeroomWorkspace,
  saveLocalHomeroomWorkspace,
} from '../src/utils/homeroomStore.js';
import { studentMetrics } from '../src/utils/homeroomOfflineTools.js';
import { buildPortalPayload } from '../src/utils/homeroomPhase2.js';

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const expectThrow = (fn) => { try { fn(); return false; } catch { return true; } };

let workspace = makeDefaultHomeroomWorkspace({ id: 'audit-user', email: 'audit@example.com' });
workspace = addStudent(workspace, { code: 'A01', fullName: 'Nguyễn Minh Anh', birthDate: '2009-08-15' });
workspace = addStudent(workspace, { code: 'A02', fullName: 'Nguyễn Minh Anh', birthDate: '2009-09-20' });
add('Hai học sinh trùng họ tên nhưng khác mã vẫn là hai hồ sơ', workspace.students.length === 2);
const originalPin = workspace.students.find((item) => item.code === 'A01')?.portalPin;
workspace = addStudent(workspace, { code: 'A01', fullName: 'Nguyễn Minh Anh', parentPhone: '0901000001' });
const updatedA01 = workspace.students.find((item) => item.code === 'A01');
add('Cùng mã học sinh sẽ cập nhật đúng hồ sơ', workspace.students.length === 2 && updatedA01?.parentPhone === '0901000001');
add('Cập nhật từ file không xóa dữ liệu cũ hoặc đổi PIN', updatedA01?.birthDate === '2009-08-15' && updatedA01?.portalPin === originalPin);

workspace = addScheduleItem(workspace, { id: 'event-1', title: 'Họp lớp', date: '2026-08-01', startTime: '08:00' });
workspace = addScheduleItem(workspace, { id: 'event-1', title: 'Họp phụ huynh', date: '2026-08-02', startTime: '09:00' });
add('Sửa lịch theo ID không tạo bản ghi trùng', workspace.schedule.length === 1 && workspace.schedule[0].title === 'Họp phụ huynh');

workspace = addParentContact(workspace, { id: 'contact-1', studentId: workspace.students[0].id, subject: 'Trao đổi đầu năm', message: 'Nội dung ban đầu' });
workspace = addParentContact(workspace, { id: 'contact-1', studentId: workspace.students[0].id, subject: 'Trao đổi đầu năm', message: 'Nội dung đã sửa' });
add('Sửa liên hệ phụ huynh không tạo bản ghi trùng', workspace.parentContacts.length === 1 && workspace.parentContacts[0].message === 'Nội dung đã sửa');

const studentId = workspace.students[0].id;
add('Chặn điểm lớn hơn thang điểm', expectThrow(() => addLearningRecord(workspace, { studentId, subject: 'Tiếng Anh', score: 11, maxScore: 10 })));
add('Chặn điểm âm', expectThrow(() => addLearningRecord(workspace, { studentId, subject: 'Tiếng Anh', score: -1, maxScore: 10 })));
add('Chặn thang điểm bằng 0', expectThrow(() => addLearningRecord(workspace, { studentId, subject: 'Tiếng Anh', score: 0, maxScore: 0 })));
add('Chặn điểm không phải số', expectThrow(() => addLearningRecord(workspace, { studentId, subject: 'Tiếng Anh', score: 'abc', maxScore: 10 })));
workspace = addLearningRecord(workspace, { id: 'score-en', studentId, subject: 'Tiếng Anh', period: 'HKI', assessment: 'Bài 1', score: 8, maxScore: 10, recordedAt: '2026-08-01' });
workspace = addLearningRecord(workspace, { id: 'score-math', studentId, subject: 'Toán', period: 'HKI', assessment: 'Bài 1', score: 4, maxScore: 10, recordedAt: '2026-08-01' });
add('Phân tích theo môn chỉ dùng điểm của môn được chọn', studentMetrics(workspace, studentId, { subject: 'Tiếng Anh' }).average === 8);
add('Phân tích tất cả môn vẫn tính toàn bộ dữ liệu', studentMetrics(workspace, studentId).average === 6);

workspace.announcements = [
  { id: 'past', title: 'Đã đến giờ', message: 'Hiển thị', audience: 'all', status: 'scheduled', scheduledAt: '2020-01-01T00:00:00.000Z' },
  { id: 'future', title: 'Chưa đến giờ', message: 'Ẩn', audience: 'all', status: 'scheduled', scheduledAt: '2099-01-01T00:00:00.000Z' },
];
const payload = await buildPortalPayload(workspace);
const portalNotices = payload.parentViews.A01?.announcements || [];
add('Thông báo đến hạn xuất hiện trên cổng', portalNotices.some((item) => item.id === 'past'));
add('Thông báo tương lai không bị lộ sớm', !portalNotices.some((item) => item.id === 'future'));

const storage = new Map();
globalThis.localStorage = {
  get length() { return storage.size; }, key(index) { return [...storage.keys()][index] ?? null; },
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); },
};
const fixedTimestamp = '2025-01-01T00:00:00.000Z';
const cached = saveLocalHomeroomWorkspace({ ...workspace, updatedAt: fixedTimestamp }, { id: 'audit-user' }, { touchUpdatedAt: false });
add('Lưu bản cache cloud không làm mới timestamp', cached.updatedAt === fixedTimestamp);

const core = fs.readFileSync('src/components/homeroom/HomeroomCoreTabs.jsx', 'utf8');
const roster = fs.readFileSync('src/components/StudentRosterImportPanel.jsx', 'utf8');
add('Sổ điểm thường xuyên đã trở lại tab Học tập', core.includes('<RegularAssessmentGradebook'));
add('Bộ chọn file không quảng cáo định dạng .xls cũ', !core.includes('accept=".xlsx,.xls') && !roster.includes('accept=".xlsx,.xls'));
add('Giao diện báo lỗi điểm thay vì làm sập tab', core.includes("setFormError(error?.message || 'Không thể lưu điểm.')"));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? '✓' : '✗'} ${item.name}`));
if (failed.length) { console.error(`\n❌ Homeroom integrity audit FAILED (${checks.length - failed.length}/${checks.length})`); process.exit(1); }
console.log(`\n✅ Homeroom integrity audit PASS (${checks.length}/${checks.length})`);
