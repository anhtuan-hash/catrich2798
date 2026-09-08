import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync('index.html', 'utf8');
const sourceCss = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.css', 'utf8');
const editorCss = fs.readFileSync('src/components/attendance/AttendanceClassEditor.css', 'utf8');

assert.doesNotMatch(index, /attendance-manage-scrollbar-fix\.css/, 'No late Manage patch stylesheet may be loaded');
assert.match(sourceCss, /\.attendance-member-manager\s*\{[^}]*overflow-y:\s*auto;/s, 'Right pane must own its single scrollbar');
assert.match(sourceCss, /\.attendance-member-table\s*\{[^}]*overflow:\s*visible;/s, 'Student list must participate in the right-pane flow');
assert.match(editorCss, /\.attendance-class-info-card\s*\{[^}]*border-radius:\s*0;[^}]*background:\s*transparent;/s, 'Class information must not be a detached card');

console.log('PASS: class-management continuity and scrolling are source-owned.');
