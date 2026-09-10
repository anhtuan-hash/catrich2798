import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildAttendanceReport } from '../src/utils/attendanceReport.js';

const auditHelperUrl = new URL('../src/utils/attendanceAuditActors.js', import.meta.url);
const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const reportComponentUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.jsx', import.meta.url);
const reportUrl = new URL('../src/utils/attendanceReport.js', import.meta.url);
const exportUrl = new URL('../src/utils/attendanceReportExport.js', import.meta.url);
const indexUrl = new URL('../index.html', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260909_attendance_audit_actor_snapshots.sql', import.meta.url);

const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const reportComponent = fs.readFileSync(reportComponentUrl, 'utf8');
const reportSource = fs.readFileSync(reportUrl, 'utf8');
const exportSource = fs.readFileSync(exportUrl, 'utf8');
const indexSource = fs.readFileSync(indexUrl, 'utf8');
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.ok(fs.existsSync(auditHelperUrl), 'Attendance audit actor helper must exist');
if (fs.existsSync(auditHelperUrl)) {
  const { groupAttendanceChangesBySession } = await import(auditHelperUrl.href);
  const grouped = groupAttendanceChangesBySession([
    {
      id: 1,
      session_id: 'session-1',
      record_id: 'record-1',
      student_full_name: 'Nguyễn Minh Anh',
      change_kind: 'record',
      changed_by: 'teacher-b',
      changed_by_name: 'Trần Thị B',
      changed_at: '2026-09-09T10:02:00.000Z',
      old_status: 'absent',
      new_status: 'present',
    },
    {
      id: 2,
      session_id: 'session-1',
      record_id: 'record-2',
      student_full_name: 'Lê Gia Hân',
      change_kind: 'record',
      changed_by: 'teacher-b',
      changed_by_name: 'Trần Thị B',
      changed_at: '2026-09-09T10:02:00.000Z',
      old_status: 'present',
      new_status: 'absent',
    },
    {
      id: 3,
      session_id: 'session-1',
      record_id: null,
      student_full_name: '',
      change_kind: 'session_note',
      changed_by: 'teacher-c',
      changed_by_name: 'Nguyễn Văn C',
      changed_at: '2026-09-09T10:08:00.000Z',
      session_note_before: '',
      session_note_after: 'Đã bổ sung ghi chú.',
    },
  ]);
  const audit = grouped.get('session-1');
  assert.ok(audit, 'Changes must be grouped by session');
  assert.equal(audit.change_count, 2, 'One save with multiple changed students must count as one adjustment event');
  assert.equal(audit.events.length, 2, 'Two distinct save timestamps/actors must create two audit events');
  assert.equal(audit.events[0].items.length, 2, 'Rows from one save must remain together');
  assert.equal(audit.latest_changed_by_name, 'Nguyễn Văn C');
  assert.equal(audit.latest_changed_at, '2026-09-09T10:08:00.000Z');
}

const report = buildAttendanceReport({
  sessions: [{
    id: 'session-1',
    class_id: 'class-1',
    class_type: 'gifted',
    class_name: 'Bồi dưỡng Anh 12',
    subject: 'Tiếng Anh',
    teacher_name: 'Giáo viên dạy',
    checked_by_name: 'Người điểm danh',
    attendance_date: '2026-09-09',
    checked_at: '2026-09-09T09:52:00.000Z',
    session_status: 'completed',
    lesson_periods: 2,
    total_students: 2,
    present_count: 1,
    absent_count: 1,
  }],
  records: [],
  classes: [],
  changes: [{
    id: 10,
    session_id: 'session-1',
    record_id: null,
    change_kind: 'session_note',
    changed_by: 'editor-1',
    changed_by_name: 'Người điều chỉnh',
    changed_at: '2026-09-09T10:08:00.000Z',
    session_note_before: '',
    session_note_after: 'Đã sửa',
  }],
  mode: 'day',
  date: '2026-09-09',
});
assert.equal(report.sessionRows[0]?.checked_by_name, 'Người điểm danh', 'Report rows must preserve the original attendance actor snapshot');
assert.equal(report.sessionRows[0]?.latest_changed_by_name, 'Người điều chỉnh', 'Report rows must expose the latest adjustment actor');
assert.equal(report.sessionRows[0]?.change_count, 1, 'Report rows must expose adjustment-event count');
assert.equal(report.sessionRows[0]?.change_history?.length, 1, 'Report rows must expose grouped adjustment history');

assert.match(reportSource, /changes\s*=\s*\[\]/, 'Attendance report aggregation must accept audit changes');
assert.match(reportComponent, /bes_extra_attendance_record_changes/, 'Report UI must load persisted adjustment audit rows');
assert.match(reportComponent, /checked_by_name/, 'Report UI must load the original attendance actor snapshot');

// History owns its audit slot directly in React. The former standalone
// MutationObserver bootstrap must stay retired so it cannot reorder or resize V3 after render.
assert.doesNotMatch(indexSource, /attendanceAuditActorsBootstrap\.js/, 'Attendance History must not boot the legacy MutationObserver audit runtime');
assert.match(attendance, /className="ahv3__audit-actor-panel"/, 'Attendance History must render a React-owned audit actor panel');
assert.match(attendance, /selectedSession\.checked_by\s*\|\|\s*'Không ghi nhận'/, 'React History audit panel must show the persisted check-in actor');
assert.match(attendance, /formatDateTime\(selectedSession\.checked_at\)/, 'React History audit panel must show the persisted check-in timestamp');
assert.doesNotMatch(attendance, /attendance-audit-actor-panel/, 'React History must not depend on MutationObserver-era audit class names');

for (const copy of ['Người điểm danh', 'Người điều chỉnh gần nhất']) {
  assert.match(exportSource, new RegExp(copy), `PDF/Excel export must include ${copy}`);
}

assert.ok(migration, 'Attendance actor snapshot migration must exist');
assert.match(migration, /add column if not exists\s+checked_by_name\s+text/i, 'Sessions must store an immutable attendance-actor name snapshot');
assert.match(migration, /from\s+public\.profiles/i, 'Existing sessions must backfill attendance actor names from profiles');
assert.match(migration, /bes_confirm_extra_class_attendance/i, 'Confirm RPC must be replaced to snapshot the attendance actor');
assert.match(migration, /checked_by_name/i, 'Confirm RPC must write checked_by_name');
assert.match(migration, /checked_by\s*,\s*checked_by_name/i, 'Session insert must preserve actor UUID and name snapshot separately');

console.log('Attendance audit actor contract OK');
