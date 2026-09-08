import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const polishCss = fs.readFileSync(new URL('../public/attendance-ui-polish.css', import.meta.url), 'utf8');

assert.match(attendance, /historySelectionMode/, 'History must expose an explicit multi-select mode');
assert.match(attendance, /selectedHistorySessionIds/, 'History must track selected attendance session ids');
assert.match(attendance, /Chọn nhiều/, 'History must expose a multi-select action');
assert.match(attendance, /Chọn tất cả kết quả/, 'History must support selecting all currently filtered sessions');
assert.match(attendance, /Xóa \$\{selectedHistorySessionIds\.length\} buổi/, 'Bulk delete action must show the selected count');
assert.match(attendance, /deleteSelectedHistorySessions/, 'History must implement a bulk session deletion handler');
assert.match(attendance, /for \(const session of targets\)[\s\S]*?bes_delete_extra_attendance_session/, 'Bulk delete must reuse the existing approved attendance-session deletion RPC for every selected session');
assert.match(attendance, /Không thể xóa \$\{failed\.length\} buổi/, 'Partial failures must be surfaced instead of silently ignored');
assert.match(attendance, /attendance-history-select-box/, 'History cards must render a dedicated selection affordance');
assert.match(attendance, /is-bulk-selected/, 'Selected history rows must have a visible selected state');
assert.match(polishCss, /\.attendance-history-bulk-toolbar\s*\{/, 'Bulk history controls must have a dedicated toolbar surface');
assert.match(polishCss, /\.attendance-history-select-box\s*\{/, 'Bulk history selection checkbox must be styled');
assert.match(polishCss, /\.attendance-history-items[^\n{]*>\s*button\.is-bulk-selected[\s\S]*?border-color/, 'Selected history rows must receive a strong visual treatment');

console.log('Attendance history bulk-delete contract OK');
