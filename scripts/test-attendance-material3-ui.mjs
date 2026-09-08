import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const permissionRegistry = fs.readFileSync(new URL('../src/utils/permissions.js', import.meta.url), 'utf8');
const attendanceUiContract = `${attendance}\n${permissionRegistry}`;
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const reportCssUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.css', import.meta.url);
const polishUrl = new URL('../public/attendance-ui-polish.css', import.meta.url);
const launchCssUrl = new URL('../public/attendance-windows8-launch.css', import.meta.url);
const indexHtmlUrl = new URL('../index.html', import.meta.url);
const css = fs.existsSync(cssUrl) ? fs.readFileSync(cssUrl, 'utf8') : '';
const reportCss = fs.existsSync(reportCssUrl) ? fs.readFileSync(reportCssUrl, 'utf8') : '';
const polishCss = fs.existsSync(polishUrl) ? fs.readFileSync(polishUrl, 'utf8') : '';
const launchCss = fs.existsSync(launchCssUrl) ? fs.readFileSync(launchCssUrl, 'utf8') : '';
const indexHtml = fs.readFileSync(indexHtmlUrl, 'utf8');

assert.doesNotMatch(attendance, /Mỗi lớp chỉ chốt một lần mỗi ngày · giờ xác nhận lưu theo máy chủ/);
assert.match(attendanceUiContract, /Báo cáo/);
assert.match(attendance, /1,5 tiết/);
assert.match(attendance, /Hủy buổi học/);
assert.match(attendance, /Đã điểm danh/);
assert.match(attendance, /Đã hủy/);
assert.match(attendance, /0 tiết/);
assert.ok(css, 'Attendance Material 3 stylesheet must exist');
assert.match(css, /--att-m3-primary/);
assert.match(css, /--att-m3-success/);
assert.match(css, /--att-m3-warning/);
assert.match(css, /--att-m3-purple/);
assert.match(css, /--att-m3-cyan/);
assert.ok(reportCss, 'Attendance monthly report stylesheet must exist');
assert.match(reportCss, /\.att-report-m3\s*\{[^}]*min-height\s*:\s*0[^}]*overflow-y\s*:\s*auto/i,
  'Monthly report must own a vertical scroll viewport so long reports are not clipped by attendance-content overflow:hidden');
assert.ok(polishCss, 'Attendance workspace polish stylesheet must exist');
assert.ok(launchCss, 'Windows 8 attendance launch stylesheet must exist');
assert.match(indexHtml, /attendance-windows8-launch\.css\?v=1/i,
  'Application shell must load the Windows 8 attendance launch stylesheet');

assert.match(
  launchCss,
  /@keyframes\s+attendance-win8-layer-in/i,
  'Attendance backdrop must define a dedicated Windows 8 style launch animation',
);
assert.match(
  launchCss,
  /@keyframes\s+attendance-win8-shell-in/i,
  'Attendance shell must define a dedicated Windows 8 style app launch animation',
);
assert.match(
  launchCss,
  /\.attendance-layer\s*\{[^}]*animation-name\s*:\s*attendance-win8-layer-in/i,
  'Attendance backdrop must play the Windows 8 launch animation when opened',
);
assert.match(
  launchCss,
  /\.attendance-shell\s*\{[^}]*animation-name\s*:\s*attendance-win8-shell-in/i,
  'Attendance shell must play the Windows 8 app launch animation when opened',
);
assert.match(
  launchCss,
  /attendance-win8-shell-in[\s\S]*?scale\(\.78\)[\s\S]*?scale\(1\.016\)[\s\S]*?scale\(1\)/i,
  'Windows 8 launch must visibly expand the app from a compact tile-like state into the full workspace',
);
assert.match(
  launchCss,
  /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)[\s\S]*?\.attendance-layer[\s\S]*?animation\s*:\s*none/i,
  'Attendance launch motion must be disabled when the user prefers reduced motion',
);

assert.match(
  polishCss,
  /\.attendance-shell\s+\.attendance-calendar-layout\s*\{[^}]*gap\s*:\s*(?:8|9|10|11|12|13|14|15|16)px/i,
  'Calendar layout must use visible spacing between toolbar, weekday strip, and day-card grid',
);
assert.match(
  polishCss,
  /\.attendance-shell\s+\.attendance-calendar-grid\s*\{[^}]*gap\s*:\s*(?:6|7|8|9|10|11|12)px/i,
  'Calendar grid must separate day cards with a visible gap',
);
assert.match(
  polishCss,
  /\.attendance-shell\s+\.attendance-calendar-grid\s*\{[^}]*border\s*:\s*0(?:\s*!important)?/i,
  'Calendar grid must not use a fused outer border around touching cells',
);
assert.match(
  polishCss,
  /\.attendance-shell\s+\.attendance-calendar-day\s*\{[^}]*border-radius\s*:\s*(?:12|13|14|15|16|17|18)px/i,
  'Calendar days must render as independent rounded cards',
);
assert.match(
  polishCss,
  /\.attendance-shell\s+\.attendance-management-grid\s*\{[^}]*gap\s*:\s*(?:8|9|10|11|12|13|14|15|16)px/i,
  'Class management panels must be separated by a visible gap',
);
assert.match(
  polishCss,
  /\.attendance-shell\s+\.attendance-history-layout\s*\{[^}]*gap\s*:\s*(?:8|9|10|11|12|13|14|15|16)px/i,
  'History list and detail panels must be separated by a visible gap',
);

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
  'Gifted history rows must receive a dedicated cool color treatment');
assert.match(polishCss, /\.attendance-history-list[^\n{]*button:has\(\.attendance-type-dot\.is-remedial\)[\s\S]*?background/i,
  'Remedial history rows must receive a dedicated warm color treatment');
assert.match(polishCss, /\.att-report-m3__teacher-grid\s*>\s*article:nth-child\(4n\+1\)[\s\S]*?background/i,
  'Teacher report cards must use a repeating pastel color system');

assert.match(attendance, /attendance-history-search/, 'History list must expose a prominent search control');
assert.match(attendance, /attendance-history-hero/, 'History detail must render a dedicated summary hero');
assert.match(attendance, /attendance-history-info-grid/, 'History detail must render an information-card grid');
assert.match(attendance, /attendance-history-rate-card/, 'History detail must render an attendance-rate card');
assert.match(attendance, /const\s+selectedSessionAttendanceRate\s*=/,
  'History detail must calculate the attendance rate before rendering the rate card');
assert.match(attendance, /Giáo viên/);
assert.match(attendance, /Môn học/);
assert.match(attendance, /Ngày dạy/);
assert.match(attendance, /Thời gian/);
assert.match(attendance, /Phòng học/);
assert.match(attendance, /Tỷ lệ chuyên cần/);
assert.match(attendance, /Ghi chú buổi học/);
assert.match(attendance, /Danh sách học sinh vắng/);
assert.match(attendance, /Chốt lúc/);
assert.match(polishCss, /\.attendance-history-hero\s*\{[^}]*background\s*:/i,
  'History hero must have its own visual surface');
assert.match(polishCss, /\.attendance-history-info-grid\s*\{[^}]*grid-template-columns\s*:/i,
  'History metadata must be presented as a responsive card grid');
assert.match(polishCss, /\.attendance-history-rate-card\s*\{[^}]*background\s*:/i,
  'Attendance-rate card must use a distinct semantic surface');
assert.match(polishCss, /\.attendance-history-all-present\s*\{[^}]*background\s*:/i,
  'All-present state must be rendered as a dedicated success surface');

console.log('Attendance Material 3 UI contract OK');
