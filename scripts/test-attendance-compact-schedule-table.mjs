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

// Final visual polish: readable teachers, non-redundant room badges, clearer action affordance and independent list scrolling.
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
assert.match(css, /\.attendance-content:has\(\.attendance-daily-overview-host\)\s*\{[^}]*padding:\s*(?:10|11|12|13|14)px;/s, 'Daily schedule should reclaim vertical space by tightening content padding only for this view.');

console.log('Direct React compact attendance schedule contract OK');
