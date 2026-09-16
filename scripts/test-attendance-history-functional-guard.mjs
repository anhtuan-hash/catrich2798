import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const postConfirmSource = fs.readFileSync(new URL('../src/attendancePostConfirmEditBootstrap.js', import.meta.url), 'utf8');

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

assert.match(source, /ahv3__report-button/, 'Monthly report action must remain');
assert.match(source, /ahv3__delete-button/, 'Single-session delete action must remain');
assert.match(source, /ahv3__late-section/, 'Tardy student details must remain');
assert.match(source, /ahv3__absent-section/, 'Absent student details must remain');
assert.match(source, /className="ahv3__audit-actor-panel"/, 'Operator audit panel must remain React-owned');
assert.match(source, /data-bes-keep-search="true"/, 'History search exemption must remain');
assert.doesNotMatch(source, /className="[^"]*attendance-history-/, 'History must remain isolated from legacy attendance-history-* class selectors');
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

assert.match(source, /evaluatePostConfirmEditAccess/, 'History must evaluate the existing post-confirm edit window');
assert.match(source, /formatPostConfirmRemaining/, 'History must show a live remaining-time label');
assert.match(source, /openSelectedHistoryForAdjustment/, 'History detail must route into the existing edit flow');
assert.match(source, /ahv3__adjust-button/, 'History detail must expose a dedicated attendance-adjust action');
assert.match(source, /Điều chỉnh điểm danh · Còn/, 'Normal history edit access must show the remaining edit window');
assert.match(source, /bes-attendance-post-confirm-edit-request/, 'History must request the existing post-confirm editor rather than duplicate it');
assert.match(source, /bes-supplemental-open-rollcall/, 'Supplemental history adjustments must reuse the supplemental roll-call opener');
assert.match(source, /setSelectedClassId\(session\.class_id\)[\s\S]*?setAttendanceDate\(session\.attendance_date\)[\s\S]*?setView\('quick'\)/, 'Extra-class history adjustments must reopen the matching class/date in Quick attendance');
assert.match(postConfirmSource, /bes-attendance-post-confirm-edit-request/, 'Post-confirm editor must listen for History edit requests');
assert.match(postConfirmSource, /addEventListener\([^\n]*bes-attendance-post-confirm-edit-request|addEventListener\(POST_CONFIRM_EDIT_REQUEST_EVENT/, 'Post-confirm editor must register the History request listener');
assert.match(postConfirmSource, /pendingOpenRequest/, 'Post-confirm editor must keep a pending History request until Quick view mounts');
assert.match(postConfirmSource, /localAccess\(\)[\s\S]*?openEditor\(\)/, 'History request must still pass the existing server-backed access check before opening the editor');

console.log('Attendance history functional guard OK');
