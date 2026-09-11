import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalAttendanceReportingBootstrap.js', import.meta.url), 'utf8');
const legacyHistorySource = await readFile(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const legacyReportSource = await readFile(new URL('../src/components/attendance/AttendanceMonthlyReport.jsx', import.meta.url), 'utf8');

for (const value of ["['all','Tất cả']", "['remedial','Phụ đạo']", "['enrichment','Bồi dưỡng']", "['supplemental','Học bổ sung']"]) {
  assert.ok(source.includes(value), `missing activity filter ${value}`);
}
assert.ok(source.includes('BÁO CÁO HỌC BỔ SUNG KIẾN THỨC'), 'missing exact supplemental PDF title');
assert.match(source, /loadSupplementalHistory/);
assert.match(source, /loadSupplementalStudentReport/);
assert.match(source, /loadAttendanceActivities/);
assert.match(source, /buổi hủy không vào mẫu số/i, 'report must explain cancelled-session denominator rule');
assert.match(source, /không tự cộng vào tổng cũ/i, 'combined mode must not silently alter legacy totals');
assert.match(source, /window\.print\(\)/, 'supplemental report needs print/PDF path');

assert.match(source, /syncLegacyHistoryFilter/, 'activity filter must actively synchronize the existing History class-type filter');
assert.match(source, /enrichment[\s\S]{0,120}gifted|gifted[\s\S]{0,120}enrichment/, 'Bồi dưỡng activity filter must map to the legacy gifted class_type');
assert.match(legacyHistorySource, /<option value="remedial">Phụ đạo<\/option>/, 'legacy History remedial option must remain available');
assert.match(legacyHistorySource, /<option value="gifted">Bồi dưỡng HSG<\/option>/, 'legacy History gifted option must remain available');

assert.match(legacyReportSource, /bes-attendance-activity-filter-change/, 'legacy monthly report must listen to the unified activity filter');
assert.match(legacyReportSource, /activityTypeFilter/, 'legacy monthly report must keep an explicit activity-type filter state');
assert.match(legacyReportSource, /activityTypeFilter\s*===\s*'remedial'/, 'monthly report must support remedial filtering');
assert.match(legacyReportSource, /activityTypeFilter\s*===\s*'enrichment'/, 'monthly report must support enrichment filtering');
assert.match(legacyReportSource, /class_type\s*===\s*'gifted'/, 'monthly report must map enrichment to production gifted rows');

console.log('supplemental learning reporting contract: ok');
