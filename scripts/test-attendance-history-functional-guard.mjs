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
assert.match(source, /selectedLateRecords\.length \? <small>\{selectedLateRecords\.length\} đi trễ · vẫn tính có mặt<\/small>/, 'Summary must keep late students included in present semantics');

console.log('Attendance history functional guard OK');
