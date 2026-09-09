import fs from 'node:fs';
import assert from 'node:assert/strict';

const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);
const mobileUrl = new URL('../src/components/attendance/AttendanceMobileV2.css', import.meta.url);

const startup = fs.readFileSync(startupUrl, 'utf8');
assert.match(startup, /AttendanceIphoneReadable\.css/, 'Phone readability authority must be loaded by attendance startup');
assert.match(startup, /AttendanceMobileV2\.css/, 'Mobile V2 attendance layout must be loaded by attendance startup');
assert.ok(fs.existsSync(mobileUrl), 'AttendanceMobileV2.css must exist');

const css = fs.readFileSync(mobileUrl, 'utf8');
assert.match(css, /@media\s*\(max-width:\s*520px\)/, 'Mobile layout must target phone widths');
assert.match(css, /\.attendance-title strong[\s\S]*clamp\(/, 'Title must scale fluidly instead of exploding under browser zoom');
assert.match(css, /\.attendance-top-actions[\s\S]*position:\s*absolute/, 'Top actions must not steal title width on phones');
assert.match(css, /\.attendance-daily-compact-toolbar[\s\S]*grid-template-columns:\s*1fr/, 'Daily toolbar must stack safely on narrow phones');
assert.match(css, /\.attendance-daily-overview__summary\.is-compact[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, 'Attendance metrics must use a readable two-column phone grid');
assert.match(css, /\.attendance-daily-class-row[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/, 'Class cards must use a stable two-column phone layout');
assert.match(css, /\.attendance-daily-class-row__class b[\s\S]*font-size:\s*16px/, 'Class names must be readable at native browser zoom');
assert.match(css, /\.attendance-shell[\s\S]*100dvh/, 'Phone modal must use dynamic viewport height');

console.log('Attendance mobile readable layout contract OK');