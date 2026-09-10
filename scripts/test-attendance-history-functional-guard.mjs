import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');

for (const behavior of [
  'toggleHistorySelectionMode',
  'toggleHistoryBulkSelection',
  'toggleAllFilteredHistorySelection',
  'deleteSelectedHistorySessions',
  'deleteAttendanceSession(selectedSession)',
  "setView('report')",
  'loadSessionRecords(session.id)',
  'historyProofUrl',
  'selectedLateRecords',
  'selectedAbsentRecords',
]) assert.ok(source.includes(behavior), `History redesign must preserve ${behavior}`);

assert.match(source, /attendance-history-report-button/, 'Monthly report action must remain');
assert.match(source, /attendance-history-delete-button/, 'Single-session delete action must remain');
assert.match(source, /attendance-history-late-section/, 'Tardy student details must remain');
assert.match(source, /attendance-history-absent-section/, 'Absent student details must remain');
assert.match(
  source,
  /<article className="is-present">[\s\S]*?selectedSession\.present_count[\s\S]*?<span>Có mặt<\/span>[\s\S]*?Đã gồm học sinh đi trễ[\s\S]*?<\/article>/,
  'Present summary must keep tardy students included in present_count semantics',
);
assert.match(
  source,
  /<article className="is-late">[\s\S]*?selectedLateRecords\.length[\s\S]*?<span>Đi trễ<\/span>[\s\S]*?Vẫn tính có mặt[\s\S]*?<\/article>/,
  'Dedicated tardy summary must remain informational and still count as present',
);

console.log('Attendance history functional guard OK');
