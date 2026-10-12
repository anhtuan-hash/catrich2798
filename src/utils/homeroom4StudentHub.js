// Homeroom 4.0 — pure, account/workspace-neutral Student Hub selectors.
// Consumers pass only the already-authorized workspace. No new storage or RPC.
const words = (v) => String(v ?? '').trim();
const fold = (v) => words(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ');
const roster = (workspace) => Array.isArray(workspace?.students) ? workspace.students : [];
export const STUDENT_HUB_FILTERS = Object.freeze(['active', 'attention', 'priority', 'inactive', 'all']);

export function getStudentHubCounts(workspace) {
  const students = roster(workspace);
  const active = students.filter((student) => student.active !== false);
  return {
    active: active.length,
    archived: students.length - active.length,
    attention: active.filter((student) => student.supportLevel === 'attention' || student.supportLevel === 'priority').length,
    priority: active.filter((student) => student.supportLevel === 'priority').length,
    total: students.length,
  };
}
export function filterStudentHub(workspace, { query = '', status = 'active', order = 'name' } = {}) {
  const needle = fold(query);
  const selected = STUDENT_HUB_FILTERS.includes(status) ? status : 'active';
  const results = roster(workspace).filter((student) => {
    const isActive = student.active !== false;
    if (selected === 'active' && !isActive) return false;
    if (selected === 'inactive' && isActive) return false;
    if (selected === 'attention' && (!isActive || !['attention', 'priority'].includes(student.supportLevel))) return false;
    if (selected === 'priority' && (!isActive || student.supportLevel !== 'priority')) return false;
    if (!needle) return true;
    return fold([student.fullName, student.code, student.parentName, student.parentPhone, student.phone].join(' ')).includes(needle);
  });
  return results.sort((a,b) => (
    order === 'code'
      ? words(a.code).localeCompare(words(b.code), 'vi', { numeric:true }) || words(a.fullName).localeCompare(words(b.fullName),'vi')
      : words(a.fullName).localeCompare(words(b.fullName),'vi') || words(a.code).localeCompare(words(b.code),'vi',{numeric:true})
  ));
}
// Manual add/edit may never silently overwrite a different student.
// The pre-existing explicit import preview retains its intentional upsert path.
export function findStudentHubDuplicate(workspace, draft, editingId = '') {
  const code = fold(draft?.code);
  const name = fold(draft?.fullName);
  for(const existing of roster(workspace)) {
    if (String(existing.id) === String(editingId)) continue;
    if (code && code === fold(existing.code)) return { type: 'code', student: existing };
    if (name && name === fold(existing.fullName)) return { type: 'name', student: existing };
  }
  return null;
}
export function studentHubSummary(workspace, studentId) {
  const student = roster(workspace).find((value) => String(value.id) === String(studentId));
  if (!student) return null;
  const attendance = workspace?.attendance || {};
  const records = [];
  for (const [key, rows] of Object.entries(attendance)) {
    const item = rows?.[student.id];
    if (item?.status) records.push({ day: String(key).split('::')[0], status: item.status });
  }
  const sorted = records.sort((a,b) => b.day.localeCompare(a.day));
  const conduct = Array.isArray(workspace?.conductRecords) ? workspace.conductRecords : [];
  const studentConduct = conduct.filter((item) => String(item?.studentId) === String(student.id));
  const paper = workspace?.studentRecords?.[student.id] || null;
  return {
    student,
    attendanceSessions: sorted.length,
    latestAttendance: sorted[0] || null,
    attendanceUnexcused: records.filter((item) => item.status === 'unexcused').length,
    attendanceLate: records.filter((item) => item.status === 'late').length,
    conductRecords: studentConduct.filter((item) => item?.status !== 'cancelled').length,
    pendingConduct: studentConduct.filter((item) => item?.status === 'pending').length,
    paperRecordExists: Boolean(paper),
    paperVerified: Boolean(paper?.verifiedAt),
  };
}
