/*
 * Homeroom 4.0 tasks-first dashboard domain model.
 * Pure, local-first and transparent: never invent percentages, school-day
 * obligations, attendance sessions, confirmed conduct or cross-app grades.
 */
export const PAPER_DOCUMENT_FIELDS = Object.freeze([
  'completionCertificate', 'birthCertificate', 'grade10Admission', 'transcript',
]);
const txt = (v) => String(v ?? '').trim();
const itemList = (v) => Array.isArray(v) ? v : [];
const isActive = (student) => student && student.active !== false;
function isoOffset(dateIso, delta) {
  const [year, month, day] = txt(dateIso).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return Number.isFinite(dt.getTime()) ? dt.toISOString().slice(0, 10) : '';
}
function expectedDocs(grade) {
  return String(grade) === '11' || String(grade) === '12'
    ? PAPER_DOCUMENT_FIELDS
    : PAPER_DOCUMENT_FIELDS.filter((key) => key !== 'grade10Admission');
}
function validAttendanceRows(attendance, key) {
  const rows = attendance?.[key];
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return [];
  return Object.values(rows).filter((row) => row && typeof row === 'object' && txt(row.status));
}
function isPaperComplete(record, required) {
  const checklist = record?.checklist;
  return !!checklist && required.every((key) => checklist[key] === 'complete');
}
export function buildHomeroomDashboard(workspace = {}, dateIso = '') {
  const date = txt(dateIso).slice(0, 10);
  const students = itemList(workspace.students).filter(isActive);
  const attendance = workspace.attendance && typeof workspace.attendance === 'object'
    ? workspace.attendance : {};
  const sessionKeys = Object.keys(attendance).filter((key) => /^\d{4}-\d{2}-\d{2}::/.test(key));
  const todayKeys = sessionKeys.filter((key) => key.split('::')[0] === date);
  const todayRows = todayKeys.flatMap((key) => validAttendanceRows(attendance, key));
  const hasTodayData = todayRows.length > 0;
  const todayPresent = hasTodayData ? todayRows.filter((item) => item.status === 'present').length : null;
  const todayAbsent = hasTodayData ? todayRows.filter((item) =>
    ['excused', 'unexcused', 'absent_one_period', 'absent_two_periods'].includes(item.status)
  ).length : null;
  const grade = txt(workspace.classProfile?.grade);
  const required = expectedDocs(grade);
  const records = workspace.studentRecords && typeof workspace.studentRecords === 'object'
    ? workspace.studentRecords : {};
  const completePaperCount = students.filter((student) => isPaperComplete(records[student.id], required)).length;
  const missingPaperCount = students.length - completePaperCount;
  const conduct = itemList(workspace.conductRecords);
  const pendingConductCount = conduct.filter((item) => item?.status === 'pending').length;
  const confirmedConductCount = conduct.filter((item) => item?.status === 'confirmed').length;
  const pendingCorrectionCount = itemList(workspace.correctionRequests)
    .filter((item) => item?.status === 'pending').length;
  const lockedWeeksCount = itemList(workspace.conductWeekSummaries)
    .filter((item) => item?.status === 'locked').length;

  const days = Array.from({ length: 7 }, (_, index) => isoOffset(date, index - 6));
  const chart = days.map((day) => ({
    date: day,
    count: sessionKeys.filter((key) => key.split('::')[0] === day).length,
  }));
  const maxSessions = Math.max(0, ...chart.map((entry) => entry.count));

  const tasks = [];
  if (!txt(workspace.classProfile?.className)) {
    tasks.push({ id: 'setup', label: 'Hoàn thiện thông tin lớp', detail: 'Thiếu tên lớp', tab: 'classes', tone: 'violet' });
  }
  if (pendingCorrectionCount > 0) {
    tasks.push({ id: 'corrections', label: 'Yêu cầu chỉnh sửa điểm danh', detail: `${pendingCorrectionCount} yêu cầu đang chờ xử lý`, tab: 'attendance', tone: 'coral' });
  }
  if (pendingConductCount > 0) {
    tasks.push({ id: 'conduct', label: 'Xác nhận ghi nhận rèn luyện', detail: `${pendingConductCount} ghi nhận đang chờ xác nhận`, tab: 'conduct', tone: 'coral' });
  }
  if (missingPaperCount > 0) {
    tasks.push({ id: 'paper', label: 'Rà soát hồ sơ giấy', detail: `${missingPaperCount} học sinh chưa đủ chứng từ theo checklist`, tab: 'studentRecords', tone: 'violet' });
  }
  if (students.length === 0) {
    tasks.push({ id: 'roster', label: 'Khởi tạo danh sách lớp', detail: 'Chưa có học sinh đang học trong sổ', tab: 'students', tone: 'blue' });
  }
  return {
    studentCount: students.length,
    todaySessionCount: todayKeys.length,
    todayPresent,
    todayAbsent,
    hasTodayData,
    pendingConductCount,
    confirmedConductCount,
    pendingCorrectionCount,
    completePaperCount,
    missingPaperCount,
    lockedWeeksCount,
    days: chart,
    maxSessions,
    tasks,
    latestUpdate: txt(workspace.updatedAt),
  };
}
