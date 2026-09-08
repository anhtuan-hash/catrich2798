import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../public/attendance-windows8-launch.css', import.meta.url), 'utf8');

assert.match(css, /\.attendance-rollcall\s*\{[\s\S]*?overflow-y:\s*auto\s*!important/, 'Quick attendance right pane should own the single vertical scrollbar');
assert.match(css, /\.attendance-rollcall\s*\{[\s\S]*?grid-template-rows:\s*auto\s+auto\s+auto\s+auto\s+auto\s*!important/, 'Quick attendance sections should use natural-height rows instead of a compressed minmax roster row');
assert.match(css, /\.attendance-rollcall\s*\{[\s\S]*?scrollbar-gutter:\s*stable/, 'Quick attendance scrollbar should remain stable');
assert.match(css, /\.attendance-roster\s*\{[\s\S]*?overflow:\s*visible\s*!important/, 'Student roster must not keep its own nested scrollbar');
assert.match(css, /\.attendance-roster\s*\{[\s\S]*?min-height:\s*auto\s*!important/, 'Student roster should expand to its natural height');

console.log('Attendance quick unified scroll contract OK');
