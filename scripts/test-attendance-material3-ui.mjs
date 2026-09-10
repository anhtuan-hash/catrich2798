import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const materialCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url), 'utf8');
const polishCss = fs.readFileSync(new URL('../public/attendance-ui-polish.css', import.meta.url), 'utf8');
const historyCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceHistoryV2.css', import.meta.url), 'utf8');

assert.match(attendance, /att-m3-status-chip/, 'Attendance sessions must render Material 3 status chips');
assert.match(attendance, /att-m3-period-chip/, 'Attendance sessions must render lesson-period chips');
assert.match(attendance, /att-m3-cancel-reason/, 'Cancelled sessions must render a Material 3 cancellation reason');
assert.match(materialCss, /\.att-m3-status-chip/, 'Material 3 stylesheet must define status chips');
assert.match(materialCss, /\.att-m3-period-chip/, 'Material 3 stylesheet must define period chips');
assert.match(materialCss, /\.att-m3-cancel-reason/, 'Material 3 stylesheet must define cancellation reason styling');

assert.match(polishCss, /--att-type-title\s*:\s*20px/i, 'Attendance typography must define a 20px modal title token');
assert.match(polishCss, /--att-type-tab\s*:\s*15px/i, 'Attendance typography must define a 15px navigation tab token');
assert.match(polishCss, /--att-type-section\s*:\s*14px/i, 'Attendance typography must define a 14px section/card heading token');
assert.match(polishCss, /--att-type-body\s*:\s*13px/i, 'Attendance typography must define a 13px body/input token');
assert.match(polishCss, /--att-type-label\s*:\s*10px/i, 'Attendance typography must define a 10px field-label token');
assert.match(polishCss, /--att-type-meta\s*:\s*11px/i, 'Attendance typography must define an 11px metadata token');
assert.match(polishCss, /--att-type-chip\s*:\s*11px/i, 'Attendance typography must define an 11px chip token');
assert.match(polishCss, /\.attendance-title\s+strong\s*\{[^}]*font-size\s*:\s*var\(--att-type-title\)/i,
  'Modal title must consume the shared typography scale');
assert.match(polishCss, /\.attendance-tabs\s+button\s*\{[^}]*font-size\s*:\s*var\(--att-type-tab\)/i,
  'Attendance tabs must consume the shared typography scale');
assert.match(polishCss, /\.att-m3-class-search\s+input\s*\{[^}]*font-size\s*:\s*var\(--att-type-body\)/i,
  'Class search must use the shared body/input size');
assert.match(polishCss, /\.att-m3-subject-hub\s+button\s*\{[^}]*font-size\s*:\s*var\(--att-type-chip\)/i,
  'Subject filter chips must use the shared chip size');

assert.match(polishCss, /\.attendance-class-list[^\n{]*button:has\(\.attendance-type-dot\.is-gifted\)[\s\S]*?background/i,
  'Gifted quick-attendance class cards must receive a dedicated cool color treatment');
assert.match(polishCss, /\.attendance-class-list[^\n{]*button:has\(\.attendance-type-dot\.is-remedial\)[\s\S]*?background/i,
  'Remedial quick-attendance class cards must receive a dedicated warm color treatment');
assert.match(polishCss, /\.attendance-manage-classes[^\n{]*button:nth-of-type\(4n\+1\)[\s\S]*?border-left/i,
  'Management class rows must use a repeating colored accent palette');
assert.match(polishCss, /\.attendance-history-list[^\n{]*button:has\(\.attendance-type-dot\.is-gifted\)[\s\S]*?background/i,
  'Legacy gifted History styling may remain for older surfaces, but must not target V3');
assert.match(polishCss, /\.attendance-history-list[^\n{]*button:has\(\.attendance-type-dot\.is-remedial\)[\s\S]*?background/i,
  'Legacy remedial History styling may remain for older surfaces, but must not target V3');
assert.match(polishCss, /\.att-report-m3__teacher-grid\s*>\s*article:nth-child\(4n\+1\)[\s\S]*?background/i,
  'Teacher report cards must use a repeating pastel color system');

// History V3 intentionally uses a new namespace so legacy Material3/polish selectors cannot own final layout.
assert.match(attendance, /className="ahv3__search"[^>]*data-bes-keep-search="true"/, 'History V3 must expose a prominent search control protected from the global search-strip runtime');
assert.match(attendance, /ahv3__hero/, 'History V3 detail must render a dedicated summary hero');
assert.match(attendance, /ahv3__info-grid/, 'History V3 detail must render an information-card grid');
assert.match(attendance, /ahv3__rate-card/, 'History V3 detail must render an attendance-rate card');
assert.match(attendance, /const\s+selectedSessionAttendanceRate\s*=/,
  'History detail must calculate the attendance rate before rendering the rate card');
assert.doesNotMatch(attendance, /className="[^"]*attendance-history-/, 'History V3 must not reintroduce legacy attendance-history-* class names');
assert.doesNotMatch(historyCss, /\.attendance-history-/, 'History V3 stylesheet must remain outside legacy History selectors');
assert.match(attendance, /Giáo viên/);
assert.match(attendance, /Môn học/);
assert.match(attendance, /Ngày dạy/);
assert.match(attendance, /Thời gian/);
assert.match(attendance, /Phòng học/);
assert.match(attendance, /Tỷ lệ chuyên cần/);
assert.match(attendance, /Ghi chú buổi học/);
assert.match(attendance, /Danh sách học sinh vắng/);
assert.match(attendance, /Chốt lúc/);
assert.match(historyCss, /\.ahv3__shell \.ahv3__hero\s*\{[^}]*background\s*:/i,
  'History V3 hero must have its own visual surface');
assert.match(historyCss, /\.ahv3__shell \.ahv3__info-grid\s*\{[^}]*grid-template-columns\s*:/i,
  'History V3 metadata must be presented as a responsive card grid');
assert.match(historyCss, /\.ahv3__shell \.ahv3__stat-grid article\.ahv3__rate-card\s*\{[^}]*background\s*:/i,
  'History V3 attendance-rate card must use a distinct semantic surface');

console.log('Attendance Material 3 UI contract OK');
