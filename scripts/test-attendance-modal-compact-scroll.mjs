import fs from 'node:fs';
import assert from 'node:assert/strict';

const launchCss = fs.readFileSync(new URL('../public/attendance-windows8-launch.css', import.meta.url), 'utf8');
const sourceCss = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.css', import.meta.url), 'utf8');
const historyCss = fs.readFileSync(new URL('../public/attendance-history-mockup-v4.css', import.meta.url), 'utf8');

// History and Học bổ sung are the approved large-footprint reference. The shared
// Attendance shell used by Lịch điểm danh / Quản lý lớp / Báo cáo must match History
// instead of falling back to the older compact 1360x840 frame.
assert.match(historyCss, /\.attendance-shell\.ah-history-mockup\s*\{[\s\S]*?width:\s*min\(1460px,\s*calc\(100vw\s*-\s*54px\)\)/, 'History keeps the approved 1460px desktop reference width');
assert.match(historyCss, /\.attendance-shell\.ah-history-mockup\s*\{[\s\S]*?height:\s*min\(910px,\s*calc\(100vh\s*-\s*54px\)\)/, 'History keeps the approved 910px desktop reference height');
assert.match(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?width:\s*min\(1460px,\s*calc\(100vw\s*-\s*54px\)\)/, 'Shared Attendance modal should match History desktop width');
assert.match(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?height:\s*min\(910px,\s*calc\(100vh\s*-\s*54px\)\)/, 'Shared Attendance modal should match History desktop height');
assert.doesNotMatch(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?width:\s*min\(1360px,\s*calc\(100vw\s*-\s*96px\)\)/, 'Legacy compact desktop width must not shrink the three standard Attendance tabs');
assert.doesNotMatch(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?height:\s*min\(840px,\s*calc\(100vh\s*-\s*92px\)\)/, 'Legacy compact desktop height must not shrink the three standard Attendance tabs');
assert.match(launchCss, /\.attendance-content\s*\{[\s\S]*?overflow-y:\s*auto/, 'Attendance content keeps its general modal scroll behavior');
assert.match(launchCss, /\.attendance-content\s*\{[\s\S]*?scrollbar-gutter:\s*stable/, 'Attendance content scrollbar should remain stable');

// Quản lý lớp remains bounded inside the larger modal. Its right pane owns one
// continuous scrollbar from the class header through the student rows.
assert.match(sourceCss, /\.attendance-manage-layout\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow:\s*hidden;/, 'Manage view should consume the remaining modal height');
assert.match(sourceCss, /\.attendance-management-grid\s*\{[\s\S]*?flex:\s*1\s+1\s+0;[\s\S]*?overflow:\s*hidden;/, 'Management grid must stay bounded inside the modal');
assert.match(sourceCss, /\.attendance-member-manager\s*\{[^}]*overflow-y:\s*auto;/s, 'Member manager must own the single right-pane scrollbar');
assert.match(sourceCss, /\.attendance-member-table\s*\{[^}]*overflow:\s*visible;/s, 'Student rows must participate in the member-manager scroll flow');
assert.doesNotMatch(sourceCss, /\.attendance-member-table\s*\{[^}]*overflow:\s*auto;/s, 'Student table must not create a nested scrollbar');
assert.match(launchCss, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.attendance-shell\s*\{[\s\S]*?width:\s*calc\(100vw\s*-\s*20px\)/, 'Small screens should keep a near-full-width modal');

console.log('Attendance modal matches History large footprint + source-owned single Manage scroll contract OK');
