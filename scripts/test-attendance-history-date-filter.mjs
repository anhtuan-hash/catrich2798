import assert from 'node:assert/strict';
import fs from 'node:fs';

let filterAndSortAttendanceHistory;
try {
  ({ filterAndSortAttendanceHistory } = await import('../src/utils/attendanceHistoryFilters.js'));
} catch {
  assert.fail('History date filter utility must exist before this feature can pass');
}

const sessions = [
  { id: 'a', class_type: 'gifted', class_name: 'Bồi dưỡng Sinh học 12', subject: 'Sinh học', teacher_name: 'Nguyễn Thị Minh Phương', attendance_date: '2026-09-08', checked_at: '2026-09-08T18:20:00+07:00' },
  { id: 'b', class_type: 'remedial', class_name: 'Phụ đạo Anh 12', subject: 'Tiếng Anh', teacher_name: 'Trần Văn B', attendance_date: '2026-09-10', checked_at: '2026-09-10T17:30:00+07:00' },
  { id: 'c', class_type: 'gifted', class_name: 'Bồi dưỡng Toán 12', subject: 'Toán', teacher_name: 'Lê Thị C', attendance_date: '2026-09-09', checked_at: '2026-09-09T18:15:00+07:00' },
  { id: 'd', class_type: 'gifted', class_name: 'Bồi dưỡng Hóa học 12', subject: 'Hóa học', teacher_name: 'Phạm Văn D', attendance_date: '2026-09-08', checked_at: '2026-09-08T18:30:00+07:00' },
];

const allDescending = filterAndSortAttendanceHistory(sessions, {
  query: '',
  type: 'all',
  dateFrom: '',
  dateTo: '',
  sort: 'desc',
});
assert.deepEqual(allDescending.map((row) => row.id), ['b', 'c', 'd', 'a'], 'Default history ordering must be newest attendance date first, then newest checked_at within the same date');

const rangedAscending = filterAndSortAttendanceHistory(sessions, {
  query: '',
  type: 'all',
  dateFrom: '2026-09-08',
  dateTo: '2026-09-09',
  sort: 'asc',
});
assert.deepEqual(rangedAscending.map((row) => row.id), ['a', 'd', 'c'], 'Date range must include both endpoints and honor oldest-first ordering');

const combined = filterAndSortAttendanceHistory(sessions, {
  query: 'toan',
  type: 'gifted',
  dateFrom: '2026-09-09',
  dateTo: '2026-09-10',
  sort: 'desc',
});
assert.deepEqual(combined.map((row) => row.id), ['c'], 'Search, class type and date range must compose together');

const invalidRange = filterAndSortAttendanceHistory(sessions, {
  query: '',
  type: 'all',
  dateFrom: '2026-09-10',
  dateTo: '2026-09-08',
  sort: 'desc',
});
assert.deepEqual(invalidRange.map((row) => row.id), [], 'An inverted date range must not silently return misleading sessions');

const component = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
for (const stateName of ['historySort', 'historyDateFrom', 'historyDateTo']) {
  assert.match(component, new RegExp(`\\[${stateName},\\s*set${stateName[0].toUpperCase()}${stateName.slice(1)}\\]`), `History must own ${stateName} state`);
}
for (const copy of ['Sắp xếp theo ngày', 'Từ ngày', 'Đến ngày', 'Xóa bộ lọc']) {
  assert.match(component, new RegExp(copy), `History filter UI must display ${copy}`);
}
assert.match(component, /type="date"/, 'History must use native date inputs for date range selection');
assert.match(component, /filterAndSortAttendanceHistory\(/, 'History list must use the tested filter/sort utility');

console.log('Attendance History date filter contract OK');
