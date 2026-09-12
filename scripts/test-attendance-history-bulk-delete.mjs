import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const historyCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceHistoryV2.css', import.meta.url), 'utf8');

assert.match(attendance, /historySelectionMode/, 'History must expose an explicit multi-select mode');
assert.match(attendance, /selectedHistorySessionIds/, 'History must track selected attendance session ids');
assert.match(attendance, /Chọn nhiều/, 'History must expose a multi-select action');
assert.match(attendance, /Chọn tất cả kết quả/, 'History must support selecting all currently filtered sessions');
assert.match(attendance, /Xóa \$\{selectedHistorySessionIds\.length\} buổi/, 'Bulk delete action must show the selected count');
assert.match(attendance, /deleteSelectedHistorySessions/, 'History must implement a bulk session deletion handler');
assert.match(attendance, /async function deleteAttendanceHistoryAtSource\(session\)/, 'Bulk delete must centralize source-aware destructive history routing');
assert.match(attendance, /isSupplementalHistorySession\(session\)[\s\S]*deleteSupplementalAttendanceHistory\(client, session\.supplemental_session_id\)/, 'Supplemental history must use its dedicated reset RPC through the source-aware helper');
assert.match(attendance, /return client\.rpc\('bes_delete_extra_attendance_session', \{ p_session_id: session\.id \}\)/, 'Phụ đạo/Bồi dưỡng history must continue using the existing approved deletion RPC');
assert.match(attendance, /for \(const session of targets\)[\s\S]*?deleteAttendanceHistoryAtSource\(session\)/, 'Bulk delete must route every selected session through the source-aware deletion helper');
assert.match(attendance, /const targets = combinedHistorySessions\.filter/, 'Bulk delete must include supplemental and regular history rows');
assert.match(attendance, /Không thể xóa \$\{failed\.length\} buổi/, 'Partial failures must be surfaced instead of silently ignored');
assert.match(attendance, /ahv3__select-box/, 'History V3 cards must render a dedicated selection affordance');
assert.match(attendance, /is-bulk-selected/, 'Selected history rows must have a visible selected state');
assert.match(historyCss, /\.ahv3__shell \.ahv3__bulk-toolbar\s*\{/, 'Bulk History V3 controls must have a dedicated toolbar surface');
assert.match(historyCss, /\.ahv3__shell \.ahv3__select-box\s*\{/, 'Bulk History V3 selection checkbox must be styled');
assert.match(historyCss, /\.ahv3__shell \.ahv3__items[^\n{]*>\s*button\.is-bulk-selected[\s\S]*?border-color/, 'Selected History V3 rows must receive a strong visual treatment');
assert.doesNotMatch(attendance, /className="[^"]*attendance-history-/, 'Bulk-delete UI must not reintroduce legacy attendance-history-* classes');

console.log('Attendance history bulk-delete contract OK');
