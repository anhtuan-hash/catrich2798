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

// Mobile modal-frame contract. Every Attendance modal must be centered in the
// visual viewport and must never grow wider than the padded viewport on iPhone/iPad.
const mobileBlock = launchCss.match(/@media\s*\(max-width:\s*900px\)\s*\{([\s\S]*)\}\s*$/)?.[1] || '';
assert.ok(mobileBlock, 'Attendance must expose a final <=900px mobile frame override');
assert.match(mobileBlock, /\.attendance-layer\s*\{[^}]*box-sizing:\s*border-box;/s, 'Mobile overlay uses border-box sizing so padding cannot push the dialog sideways');
assert.match(mobileBlock, /\.attendance-layer\s*\{[^}]*padding:\s*max\(10px,\s*env\(safe-area-inset-top\)\)\s+max\(10px,\s*env\(safe-area-inset-right\)\)\s+max\(10px,\s*env\(safe-area-inset-bottom\)\)\s+max\(10px,\s*env\(safe-area-inset-left\)\)/s, 'Mobile overlay respects all four safe-area insets');
assert.match(mobileBlock, /\.attendance-shell\.attendance-shell\s*\{[^}]*box-sizing:\s*border-box;[^}]*width:\s*100%;[^}]*max-width:\s*680px;/s, 'Shared mobile shell is full available width but capped for small tablets');
assert.match(mobileBlock, /\.attendance-shell\.attendance-shell\s*\{[^}]*height:\s*calc\(100dvh\s*-\s*20px\);[^}]*max-height:\s*calc\(100dvh\s*-\s*20px\);/s, 'Shared mobile shell follows the dynamic visual viewport on iOS');
assert.match(mobileBlock, /\.attendance-shell\.attendance-shell,[\s\S]*?\.attendance-shell\.ah-history-mockup\s*\{[^}]*min-width:\s*0;[^}]*overflow-x:\s*hidden;/s, 'Shared and History shells use the same no-horizontal-overflow frame contract');
assert.match(mobileBlock, /\.attendance-content\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow-x:\s*hidden;/s, 'Mobile modal content cannot widen the shell');
assert.match(mobileBlock, /\.attendance-tabs\s*\{[^}]*max-width:\s*100%;[^}]*overflow-x:\s*auto;/s, 'Mobile tab strip scrolls internally instead of shifting the dialog');
assert.match(mobileBlock, /\.attendance-title\s*\{[^}]*min-width:\s*0;[^}]*flex:\s*1\s+1\s+auto;/s, 'Mobile title is allowed to shrink beside action buttons');

console.log('Attendance modal matches History large footprint + source-owned single Manage scroll + unified mobile frame contract OK');
