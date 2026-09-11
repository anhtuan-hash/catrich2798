import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const component = read('src/components/GlobalAttendanceNavigationTab.jsx');
const access = read('src/supplementalAccess.js');

assert.match(component, /canManageSupplementalLearning/, 'Native Attendance History must gate supplemental data with the dedicated supplemental manager rule.');
assert.match(component, /bes_list_supplemental_history/, 'Native Attendance History must load supplemental history from the authoritative RPC.');
assert.match(component, /class_type:\s*['"]supplemental['"]/, 'Supplemental history rows must be normalized into the native history session model.');
assert.match(component, /attendance_source:\s*['"]supplemental['"]/, 'Native history rows must retain their supplemental source identity.');
assert.match(component, /<option value="supplemental">Học bổ sung<\/option>/, 'Native Loại lớp filter must expose Học bổ sung for authorized managers.');
assert.match(component, /supplementalHistorySessions/, 'Native history must merge supplemental rows into the same filtered history list.');
assert.match(component, /loadSupplementalSessionRecords/, 'Selecting a supplemental row must render its participants in the native detail panel.');
assert.match(component, /isSupplementalHistorySession/, 'Source-aware history behavior must prevent extra-class mutations from being used on supplemental rows.');
assert.match(access, /SUPPLEMENTAL_MANAGER_PROFILE_ID/, 'Supplemental history visibility must keep the approved manager identity contract.');

console.log('Attendance History supplemental integration contract OK');
