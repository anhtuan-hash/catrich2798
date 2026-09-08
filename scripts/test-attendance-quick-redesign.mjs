import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../public/attendance-windows8-launch.css', import.meta.url), 'utf8');

assert.match(css, /\.attendance-rollcall\.attendance-rollcall\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*column\s*!important;[\s\S]*?overflow-y:\s*auto\s*!important;/, 'Right pane must be the single vertical scroll surface with specificity high enough to beat component CSS');
assert.match(css, /\.attendance-rollcall\s+\.attendance-roster\.attendance-roster\s*\{[\s\S]*?overflow:\s*visible\s*!important;[\s\S]*?max-height:\s*none\s*!important;/, 'Student roster must expand naturally without its own nested scroll');
assert.match(css, /\.attendance-rollcall\s+\.attendance-roster-head::before\s*\{[\s\S]*?content:\s*['\"]Danh sách học sinh['\"]/, 'Roster should have the approved section title');
assert.match(css, /\.attendance-rollcall\s+\.attendance-session-controls\.attendance-session-controls\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,minmax\(0,1fr\)\)\s*!important;/, 'Session controls should use the approved three-column card layout');
assert.match(css, /\.attendance-rollcall\s+\.attendance-summary\.attendance-summary\s*\{/, 'Top attendance summary should be restyled as the approved prominent status card');
assert.match(css, /\.attendance-rollcall\s+\.att-m3-proof-card\.att-m3-proof-card\s*\{/, 'Photo proof should be integrated as a full-width evidence card');
assert.match(css, /\.attendance-rollcall\s+\.attendance-confirm-bar\.attendance-confirm-bar\s*\{/, 'Notes and actions should be integrated as the final full-width action surface');
assert.match(css, /@media\s*\(max-width:\s*1180px\)[\s\S]*?\.attendance-rollcall\s+\.attendance-session-controls\.attendance-session-controls\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)\s*!important;/, 'Redesign should remain usable on narrower desktop/tablet widths');

console.log('Attendance quick redesign contract OK');
