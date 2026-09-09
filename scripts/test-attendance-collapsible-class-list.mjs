import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.css', import.meta.url), 'utf8');

assert.match(source, /ATTENDANCE_CLASS_LIST_COLLAPSE_KEY/, 'Quick attendance must define a persistent class-list collapse preference key.');
assert.match(source, /localStorage\.getItem\(ATTENDANCE_CLASS_LIST_COLLAPSE_KEY\)/, 'Initial collapse state must restore the saved preference.');
assert.match(source, /matchMedia\(['"]\(max-width:\s*820px\)['"]\)/, 'Small screens must default to the expanded attendance workspace with the class list collapsed.');
assert.match(source, /localStorage\.setItem\(ATTENDANCE_CLASS_LIST_COLLAPSE_KEY/, 'Collapse state must be remembered after the user changes it.');
assert.match(source, /classListCollapsed/, 'Quick attendance must keep explicit collapse state.');
assert.match(source, /attendance-quick-layout[^\n]*is-class-list-collapsed/, 'The quick-attendance grid must expose a collapsed layout state.');
assert.match(source, /aria-label="Ẩn danh sách lớp"/, 'The visible class list must provide a clear collapse control.');
assert.match(source, /aria-label="Mở danh sách lớp"/, 'The expanded roll-call workspace must provide a clear restore control.');
assert.match(source, />Danh sách lớp</, 'The restore control should remain understandable without relying on an icon alone.');
assert.match(css, /\.attendance-quick-layout\.is-class-list-collapsed\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,\s*1fr\)/i, 'Collapsed mode must give the roll-call workspace the full available width.');
assert.match(css, /\.attendance-class-list-toggle/i, 'Collapse and restore controls must have dedicated styling.');
assert.match(css, /\.attendance-class-list-restore/i, 'The collapsed workspace must visibly expose the restore control.');

console.log('Collapsible quick-attendance class list contract OK');
