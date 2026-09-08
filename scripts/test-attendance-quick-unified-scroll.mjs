import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../public/attendance-windows8-launch.css', import.meta.url), 'utf8');

assert.match(css, /\.attendance-rollcall\.attendance-rollcall\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*column\s*!important;[\s\S]*?overflow-y:\s*auto\s*!important/, 'Quick attendance right pane should be the single vertical scroll surface');
assert.match(css, /\.attendance-rollcall\.attendance-rollcall\s*\{[\s\S]*?scrollbar-gutter:\s*stable/, 'Quick attendance scrollbar should remain stable');
assert.match(css, /\.attendance-rollcall\s+\.attendance-roster\.attendance-roster\s*\{[\s\S]*?overflow:\s*visible\s*!important/, 'Student roster must not keep its own nested scrollbar');
assert.match(css, /\.attendance-rollcall\s+\.attendance-roster\.attendance-roster\s*\{[\s\S]*?height:\s*auto\s*!important/, 'Student roster should expand to natural content height');
assert.match(css, /\.attendance-rollcall\s+\.attendance-roster\.attendance-roster\s*\{[\s\S]*?max-height:\s*none\s*!important/, 'Student roster must not be capped to a compressed height');

console.log('Attendance quick unified scroll contract OK');
