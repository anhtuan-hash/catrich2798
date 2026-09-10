import fs from 'node:fs';
import assert from 'node:assert/strict';

const parentPath = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const directViewPath = new URL('../src/components/attendance/AttendanceDailySchedule.jsx', import.meta.url);
const runtimePath = new URL('../src/attendanceDailyStatusOverview.js', import.meta.url);
const cleanupPath = new URL('../src/attendanceLegacyMonthlyCalendarCleanup.js', import.meta.url);
const cssPath = new URL('../src/components/attendance/AttendanceDailyOverview.css', import.meta.url);

const parent = fs.readFileSync(parentPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert.equal(fs.existsSync(directViewPath), true, 'Compact daily schedule must be a real React component in the attendance tree.');
const directView = fs.existsSync(directViewPath) ? fs.readFileSync(directViewPath, 'utf8') : '';

assert.match(parent, /import\s+AttendanceDailySchedule\s+from\s+['"]\.\/attendance\/AttendanceDailySchedule\.jsx['"];/, 'Original attendance component must import the direct schedule view.');
assert.match(parent, /<AttendanceDailySchedule\b/, 'Original calendar branch must render the direct schedule view.');
assert.doesNotMatch(parent, /attendance-calendar-toolbar/, 'Legacy month toolbar must be deleted from the original React calendar branch.');
assert.doesNotMatch(parent, /attendance-calendar-weekdays/, 'Legacy weekday strip must be deleted from the original React calendar branch.');
assert.doesNotMatch(parent, /attendance-calendar-grid/, 'Legacy monthly grid must be deleted from the original React calendar branch.');
assert.doesNotMatch(parent, /\bcalendarCells\b/, 'Legacy calendarCells memo must be removed instead of hidden.');
assert.doesNotMatch(parent, /\bmonthlySessions\b/, 'Legacy monthly session state must be removed instead of left behind.');
assert.doesNotMatch(parent, /\bcalendarMonth\b/, 'Legacy month state must be removed after the direct daily rewrite.');
assert.doesNotMatch(parent, /\bloadMonthlySessions\b/, 'Legacy monthly loader must be removed after the direct daily rewrite.');

assert.equal(fs.existsSync(runtimePath), false, 'Runtime DOM-injected daily attendance view must be deleted.');
assert.equal(fs.existsSync(cleanupPath), false, 'Legacy DOM cleanup runtime must be deleted.');
assert.doesNotMatch(directView, /MutationObserver|innerHTML|querySelector|data-attendance-daily-status-root/, 'Direct schedule must be React rendering, not DOM mutation.');

assert.match(directView, /attendance-daily-table-header/, 'Direct React view must render the compact table header.');
for (const label of ['LỚP', 'GIÁO VIÊN', 'PHÒNG', 'THỜI GIAN', 'TRẠNG THÁI']) {
  assert.ok(directView.includes(label), `Direct attendance table header must include ${label}`);
}
assert.doesNotMatch(directView, /Có lịch nhưng chưa chốt/, 'Missing sessions must not repeat redundant status copy under time.');
assert.match(directView, /roomFilter\s*===\s*['"]all['"]/, 'Floor separators must be conditional on all-room mode.');

// Readability polish: full teacher hover text, compact rooms, clear attendance action and independent list scrolling.
assert.match(directView, /className="attendance-daily-class-row__teacher"\s+title=\{teacher\}/, 'Teacher cells must expose the full assignment on hover.');
assert.doesNotMatch(directView, /<b>\{room\}<\/b><small>\{floor\s*\?\s*`Lầu/, 'Room rows must not repeat floor text that already appears in floor separators.');
assert.match(directView, /attendance-daily-class-row__action/, 'Missing attendance rows must expose a dedicated action affordance.');
assert.match(directView, /Điểm danh →/, 'Missing attendance rows must reveal “Điểm danh →” as the action cue.');
assert.match(directView, /aria-label=\{status === ['"]missing['"]\s*\?\s*`Điểm danh/, 'Clickable missing rows must state their action to assistive technology.');

assert.doesNotMatch(css, /data-attendance-daily-mode|data-attendance-daily-only/, 'CSS must not hide the old React calendar behind runtime data attributes.');
assert.doesNotMatch(css, /\.attendance-calendar-toolbar\s*\{[^}]*display\s*:\s*none\s*!important/s, 'CSS must not conceal the legacy toolbar.');
assert.match(css, /\.attendance-daily-compact-toolbar\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/s, 'Room/date toolbar must stay visible while scrolling.');
assert.match(css, /\.attendance-daily-table-header\s*\{[^}]*grid-template-columns:/s, 'Table header must align to the row grid.');
assert.match(css, /\.attendance-daily-class-row\s*\{[^}]*min-height:\s*(?:54|55|56|57|58)px;/s, 'Desktop rows must stay compact at 54–58px.');
assert.match(css, /\.attendance-daily-class-row__meta\.is-room\s*\{[^}]*display:\s*inline-flex;/s, 'Room badge must be compact and inline.');
assert.match(css, /\.attendance-daily-floor-group\s*\{[^}]*position:\s*sticky;/s, 'Floor separators must stay visible inside the scrolling class list.');
assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.attendance-daily-table-header\s*\{[^}]*display:\s*none;/s, 'Desktop column header must collapse cleanly on mobile.');

assert.match(css, /\.attendance-daily-overview-host\s*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s, 'Daily host must reserve a bounded viewport for independent list scrolling.');
assert.match(css, /\.attendance-daily-overview\s*\{[^}]*grid-template-rows:\s*auto\s+auto\s+minmax\(0,\s*1fr\);[^}]*overflow:\s*hidden;/s, 'Summary and table header must remain fixed while only the class list scrolls.');
assert.match(css, /\.attendance-daily-overview__list\s*\{[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/s, 'Class list must own vertical scrolling.');
assert.match(css, /\.attendance-daily-overview__summary\.is-compact\s*\{[^}]*min-height:\s*(?:38|39|40|41|42)px;/s, 'Summary strip must be slightly taller and easier to scan.');
assert.match(css, /\.attendance-daily-class-row__teacher b\s*\{[^}]*-webkit-line-clamp:\s*2;[^}]*white-space:\s*normal;/s, 'Teacher names must wrap to at most two readable lines instead of truncating immediately.');
assert.match(css, /\.attendance-daily-class-row__action\s*\{[^}]*opacity:\s*0;/s, 'Attendance action cue must stay visually quiet until interaction.');
assert.match(css, /\.attendance-daily-class-row:is\(:hover,\s*:focus-visible\)[\s\S]*attendance-daily-class-row__action[^}]*opacity:\s*1;/s, 'Attendance action cue must appear on mouse or keyboard focus.');

// Micro-polish from production screenshot: reclaim vertical space, strengthen hierarchy and rebalance teacher width.
assert.match(css, /\.attendance-content:has\(\.attendance-daily-overview-host\)\s*\{[^}]*padding:\s*(?:8|9|10)px;/s, 'Daily content padding must be reduced further so more class rows fit in the modal.');
assert.match(css, /\.attendance-daily-compact-toolbar\s*\{[^}]*min-height:\s*(?:38|39|40|41)px;[^}]*padding:\s*(?:3|4)px\s+(?:6|7)px;/s, 'Room/date toolbar must be shorter and denser without changing its structure.');
assert.match(css, /\.attendance-daily-overview__metric b\s*\{[^}]*font-size:\s*(?:16|16\.5|17)px;/s, 'Summary numbers must be more prominent than the labels.');
assert.match(css, /\.attendance-daily-table-header\s*\{[^}]*grid-template-columns:\s*minmax\(200px,\s*1\.2\dfr\)\s+minmax\(220px,\s*1\.3\dfr\)/s, 'Desktop grid must give relatively less width to class names and more to teacher assignments.');
assert.match(css, /\.attendance-daily-class-row\s*\{[^}]*grid-template-columns:\s*minmax\(200px,\s*1\.2\dfr\)\s+minmax\(220px,\s*1\.3\dfr\)/s, 'Class rows must use the same rebalanced column grid as the table header.');
assert.match(css, /\.attendance-daily-table-header\s*\{[^}]*color:\s*#[0-5][0-9a-f]{5};[^}]*font-size:\s*10\.5px;/si, 'Column labels must use stronger contrast and slightly larger type.');
assert.match(css, /\.attendance-daily-class-row\s*\{[^}]*height:\s*58px;/s, 'Desktop class rows must have a fixed height so one-line and two-line teacher assignments keep the same rhythm.');
assert.match(css, /\.attendance-daily-class-row__teacher\s*\{[^}]*min-height:\s*30px;[^}]*max-height:\s*30px;/s, 'Teacher cells must reserve the same two-line height for consistent row alignment.');
assert.match(css, /\.attendance-daily-class-row:is\(:hover,\s*:focus-visible\)\s+\.attendance-daily-class-row__status\.is-missing\s*\{[^}]*background:/s, 'Hover/focus must visibly strengthen the missing-status action chip.');
assert.match(css, /\.attendance-daily-floor-group\s*\{[^}]*border-left-width:\s*3px;/s, 'Floor separators must gain a stronger color cue without adding more layout chrome.');
assert.match(css, /\.attendance-daily-overview__list\s*\{[^}]*padding:[^;]*12px[^;]*;/s, 'Scrollable class list must keep bottom breathing space so the last row is never glued to the viewport edge.');

// Approved visual mockup: strong floor cards, icon-led metadata, separated date card and route summary.
assert.match(directView, /function\s+AttendanceDailyIcon\s*\(/, 'Mockup match must use a focused inline SVG icon helper instead of adding an icon runtime dependency.');
assert.match(directView, /className="attendance-daily-date-card"/, 'Date picker must render as its own raised card beside the room filters.');
assert.match(directView, />Ngày điểm danh</, 'Date card must expose the visible “Ngày điểm danh” label from the mockup.');
assert.match(directView, /attendance-daily-overview__route-meta/, 'Summary strip must show the total class/floor route metadata on the right.');
assert.match(directView, /Tổng \{visibleClasses\.length\} lớp trong \{activeFloorCount\} tầng/, 'Route metadata must state total visible classes and active floors.');
assert.match(directView, /attendance-daily-floor-card/, 'Each floor must become a distinct tinted card, not only a thin separator.');
assert.match(directView, /attendance-daily-floor-card__title/, 'Floor card must have the filled “Lầu X · N lớp” title pill.');
assert.match(directView, /attendance-daily-floor-card__badge/, 'Floor card must expose the right-side “Tầng X” badge.');
assert.match(directView, /attendance-daily-class-row__leading-icon/, 'Each class row must include the blue learner/group icon tile from the mockup.');
assert.match(directView, /attendance-daily-class-row__room-icon/, 'Room badges must include a building/room icon.');
assert.match(directView, /attendance-daily-class-row__time-icon/, 'Time cells must include a clock icon.');
assert.match(directView, /attendance-daily-class-row__status-icon/, 'Status chips must include their status/action icon.');
assert.match(css, /\.attendance-daily-floor-card\s*\{[^}]*border:\s*1px solid[^}]*border-left-width:\s*8px;[^}]*box-shadow:/s, 'Floor blocks must visually pop with a thick color rail, border and elevation.');
for (const floor of ['1', '2', '3', '4']) {
  assert.match(css, new RegExp(`\\.attendance-daily-floor-card\\[data-floor="${floor}"\\]\\s*\\{[^}]*background:`,'s'), `Floor ${floor} card must have its own tinted background.`);
}
assert.match(css, /\.attendance-daily-floor-card__title\s*\{[^}]*border-radius:\s*999px;[^}]*color:\s*#fff;/s, 'Floor title must be a high-contrast filled pill.');
assert.match(css, /\.attendance-daily-class-row__leading-icon\s*\{[^}]*width:\s*38px;[^}]*height:\s*38px;[^}]*border-radius:/s, 'Class rows must use the mockup-sized raised learner icon tile.');
assert.match(css, /\.attendance-daily-class-row\s*\{[^}]*box-shadow:\s*0\s+4px\s+12px/s, 'Class rows must appear as elevated cards inside each floor block.');

console.log('Direct React compact attendance schedule contract OK');
