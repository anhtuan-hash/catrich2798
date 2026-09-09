import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/attendanceDailyStatusOverview.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/attendance/AttendanceDailyOverview.css', import.meta.url), 'utf8');

assert.match(source, /attendance-daily-table-header/, 'Daily attendance must render a compact table header');
for (const label of ['LỚP', 'GIÁO VIÊN', 'PHÒNG', 'THỜI GIAN', 'TRẠNG THÁI']) {
  assert.ok(source.includes(label), `Daily attendance table header must include ${label}`);
}
assert.match(source, /overview\.innerHTML\s*=\s*`\$\{metrics\}\$\{tableHeader\}<div class="attendance-daily-overview__list">/, 'Table header must sit between metrics and the scrollable list');
assert.doesNotMatch(source, /:\s*'Có lịch nhưng chưa chốt'/, 'Missing sessions must not repeat redundant status copy under time');
assert.match(source, /dailyRoomFilter\s*===\s*'all'\s*&&\s*floor\s*&&\s*floor\s*!==\s*previousFloor/, 'Floor separators must only render in all-room mode');

assert.match(css, /\.attendance-daily-compact-toolbar\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/s, 'Room/date toolbar must stay visible while scrolling');
assert.match(css, /\.attendance-daily-table-header\s*\{[^}]*grid-template-columns:/s, 'Table header must align to the row grid');
assert.match(css, /\.attendance-daily-class-row\s*\{[^}]*min-height:\s*(?:54|55|56|57|58)px;/s, 'Desktop rows must stay compact at 54–58px');
assert.match(css, /\.attendance-daily-class-row__meta\.is-room\s*\{[^}]*display:\s*inline-flex;/s, 'Room badge must be compact and inline');
assert.match(css, /\.attendance-daily-floor-group\s*\{[^}]*position:\s*sticky;/s, 'Floor separators must stay visible inside the scrolling class list');
assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.attendance-daily-table-header\s*\{[^}]*display:\s*none;/s, 'Desktop column header must collapse cleanly on mobile');

console.log('Attendance compact schedule table contract OK');
