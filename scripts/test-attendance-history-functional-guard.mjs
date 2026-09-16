import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const wrapperSource = fs.readFileSync(new URL('../src/components/GlobalAttendanceReadOnlyNavigationTab.jsx', import.meta.url), 'utf8');
const bridgeUrl = new URL('../src/components/AttendanceHistoryPostConfirmAdjustBridge.jsx', import.meta.url);
const bridgeSource = fs.existsSync(bridgeUrl) ? fs.readFileSync(bridgeUrl, 'utf8') : '';

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

assert.match(wrapperSource, /AttendanceHistoryPostConfirmAdjustBridge/, 'Global Attendance entry must mount the History adjustment bridge');
assert.match(bridgeSource, /attendancePostConfirmEditBootstrap\.js/, 'History adjustment must reuse the existing post-confirm editor bootstrap');
assert.match(bridgeSource, /evaluatePostConfirmEditAccess/, 'History adjustment must reuse the shared 30-minute access calculation');
assert.match(bridgeSource, /formatPostConfirmRemaining/, 'History adjustment must show a live remaining-time label');
assert.match(bridgeSource, /bes_get_extra_attendance_edit_access/, 'Extra-class History adjustment must use server-backed edit access');
assert.match(bridgeSource, /getSupplementalAttendanceEditSnapshot/, 'Supplemental History adjustment must use the server-backed edit snapshot');
assert.match(bridgeSource, /ahv3__adjust-button/, 'History detail must expose a dedicated attendance-adjust action');
assert.match(bridgeSource, /Điều chỉnh điểm danh · Còn/, 'Normal History edit access must show the remaining edit window');
assert.match(bridgeSource, /bes-supplemental-open-rollcall/, 'Supplemental History adjustments must reuse the supplemental roll-call opener');
assert.match(bridgeSource, /\.attendance-tabs/, 'Extra-class History adjustments must route through the existing Quick attendance view');
assert.match(bridgeSource, /\.bes-post-confirm-edit-card/, 'History adjustment must wait for the existing post-confirm editor card');
assert.match(bridgeSource, /button\[data-action="open"\]/, 'History adjustment must open the existing editor instead of duplicating edit UI');
assert.match(bridgeSource, /\.ahv3__mobile-sheet-actions/, 'History adjustment must remain available in the mobile detail sheet');

console.log('Attendance history functional guard OK');
