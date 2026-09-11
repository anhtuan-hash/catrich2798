import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalAttendanceReportingBootstrap.js', import.meta.url), 'utf8');
const legacyHistorySource = await readFile(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');

for (const value of ["['all','Tất cả']", "['remedial','Phụ đạo']", "['enrichment','Bồi dưỡng']", "['supplemental','Học bổ sung']"]) {
  assert.ok(source.includes(value), `missing activity filter ${value}`);
}
assert.ok(source.includes('BÁO CÁO HỌC BỔ SUNG KIẾN THỨC'), 'missing exact supplemental PDF title');
assert.match(source, /loadSupplementalHistory/);
assert.match(source, /loadSupplementalStudentReport/);
assert.match(source, /loadAttendanceActivities/);
assert.match(source, /buổi hủy không vào mẫu số/i, 'report must explain cancelled-session denominator rule');
assert.match(source, /window\.print\(\)/, 'supplemental report needs print/PDF path');

assert.match(source, /syncLegacyHistoryFilter/, 'activity filter must actively synchronize the existing History class-type filter');
assert.match(source, /enrichment[\s\S]{0,160}gifted|gifted[\s\S]{0,160}enrichment/, 'Bồi dưỡng activity filter must map to the legacy gifted class_type');
assert.match(legacyHistorySource, /<option value="remedial">Phụ đạo<\/option>/, 'legacy History remedial option must remain available');
assert.match(legacyHistorySource, /<option value="gifted">Bồi dưỡng HSG<\/option>/, 'legacy History gifted option must remain available');
assert.match(source, /renderLegacyActivityReport/, 'remedial/enrichment report filters must render a real filtered report instead of leaving the native report unchanged');
assert.match(source, /filter\s*!==\s*'all'/, 'a non-all activity filter must use an exclusive filtered surface');
assert.match(source, /presentCount|present_count/, 'filtered activity reports must expose present counts');
assert.match(source, /absentCount|absent_count/, 'filtered activity reports must expose absent counts');
assert.match(source, /tardyCount|tardy_count/, 'filtered activity reports must expose tardy counts');

const bindTabs = source.match(/function bindTabs\(\)\s*\{([\s\S]*?)\n\}\n\nfunction start\(\)/)?.[1] || '';
assert.ok(bindTabs, 'must expose bindTabs implementation for the reporting bootstrap');
assert.doesNotMatch(bindTabs, /if\s*\(detected\)\s*ensureFilter\(\)/, 'MutationObserver must not unconditionally rewrite the reporting filter on every DOM mutation');
assert.match(bindTabs, /detected\s*!==\s*observerActiveTab|observerActiveTab\s*!==\s*detected/, 'observer-driven tab detection must only render when the active History/Report tab actually changes');

const refreshPanel = source.match(/async function refreshPanel\([^)]*\)\s*\{([\s\S]*?)\n\}\n\nfunction bindTabs\(\)/)?.[1] || '';
assert.ok(refreshPanel, 'must expose refreshPanel implementation');
assert.match(refreshPanel, /if\s*\(filter\s*===\s*['"]all['"]\)\s*\{[\s\S]{0,160}closePanel\(\);[\s\S]{0,120}return;/, 'Tất cả must keep the native History/Report workspace as the single primary surface instead of appending a second full panel');
assert.doesNotMatch(refreshPanel, /filter\s*===\s*['"]all['"][\s\S]{0,500}renderPanel\(/, 'Tất cả must not stack a supplemental full report below the native History/Report UI');

console.log('supplemental learning reporting contract: ok');