import fs from 'node:fs';
import assert from 'node:assert/strict';

const overrideUrl = new URL('../public/attendance-modal-compact-scroll.css', import.meta.url);
const indexUrl = new URL('../index.html', import.meta.url);

assert.ok(fs.existsSync(overrideUrl), 'Compact attendance modal override stylesheet must exist');
const css = fs.readFileSync(overrideUrl, 'utf8');
const index = fs.readFileSync(indexUrl, 'utf8');

assert.match(index, /attendance-modal-compact-scroll\.css\?v=1/, 'Compact attendance modal stylesheet must load after existing attendance styles');
assert.match(css, /\.attendance-shell\s*\{[\s\S]*?width:\s*min\(1360px,\s*calc\(100vw\s*-\s*96px\)\)/, 'Attendance modal should use the compact desktop width');
assert.match(css, /\.attendance-shell\s*\{[\s\S]*?height:\s*min\(840px,\s*calc\(100vh\s*-\s*92px\)\)/, 'Attendance modal should use the compact desktop height');
assert.match(css, /\.attendance-content\s*\{[\s\S]*?overflow-y:\s*auto/, 'Attendance content should provide the primary vertical scrollbar');
assert.match(css, /\.attendance-content\s*\{[\s\S]*?scrollbar-gutter:\s*stable/, 'Attendance content scrollbar should remain stable');
assert.match(css, /\.attendance-manage-layout\s*\{[\s\S]*?height:\s*auto[\s\S]*?overflow:\s*visible/, 'Manage view should flow into the main modal scrollbar');
assert.match(css, /\.attendance-management-grid\s*\{[\s\S]*?overflow:\s*visible/, 'Management grid must not trap its own vertical scrollbar');
assert.match(css, /\.attendance-member-manager\s*\{[\s\S]*?overflow:\s*visible/, 'Member manager must participate in the main scroll flow');
assert.match(css, /\.attendance-member-table\s*\{[\s\S]*?overflow:\s*visible/, 'Student rows should scroll with the whole manage view');
assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.attendance-shell\s*\{[\s\S]*?width:\s*calc\(100vw\s*-\s*20px\)/, 'Small screens should keep a near-full-width modal');

console.log('Attendance compact modal + unified scroll contract OK');
