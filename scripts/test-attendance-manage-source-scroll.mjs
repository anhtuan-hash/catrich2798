import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync('index.html', 'utf8');
const sourceCss = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.css', 'utf8');
const editorCss = fs.readFileSync('src/components/attendance/AttendanceClassEditor.css', 'utf8');
const polishCss = fs.readFileSync('public/attendance-ui-polish.css', 'utf8');
const launchCss = fs.readFileSync('public/attendance-windows8-launch.css', 'utf8');

assert.doesNotMatch(index, /attendance-manage-scrollbar-fix\.css/, 'Manage scroll must not depend on a public patch stylesheet');
assert.match(sourceCss, /\.attendance-member-manager\s*\{[^}]*overflow-y:\s*auto;/s, 'The original right pane must own the vertical scroll');
assert.match(sourceCss, /\.attendance-member-table\s*\{[^}]*overflow:\s*visible;/s, 'Student list must not own a nested scrollbar');
assert.doesNotMatch(sourceCss, /\.attendance-member-table\s*\{[^}]*overflow:\s*auto;/s, 'Student list must not restore nested scrolling');
assert.doesNotMatch(polishCss, /\.attendance-member-manager\s*\{[^}]*overflow:\s*hidden\s*!important;/s, 'Polish layer must not override original right-pane scrolling');
assert.doesNotMatch(launchCss, /\/\* Manage Classes used to trap scrolling[\s\S]*?\.attendance-member-table\s*\{[\s\S]*?\}\s*/m, 'Launch stylesheet must not own Manage scrolling');
assert.match(editorCss, /\.attendance-class-info-card\s*\{[^}]*border-radius:\s*0;[^}]*background:\s*transparent;/s, 'Class info must be part of the same continuous right surface in source CSS');

console.log('PASS: Manage right pane scrolling and continuity are owned by source CSS.');
