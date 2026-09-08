import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (relativePath) => {
  const url = new URL(`../${relativePath}`, import.meta.url);
  return fs.existsSync(url) ? fs.readFileSync(url, 'utf8') : '';
};

const dashboardCss = read('src/styles/dashboard-iphone-readable.css');
const attendanceCss = read('src/components/attendance/AttendanceIphoneReadable.css');
const navCss = read('src/components/GlobalIphoneNavigationReadable.css');
const locksCss = read('src/components/GlobalIphoneReadabilityCascadeLocks.css');
const styleBridge = read('src/components/GlobalEnglishHubBrand.jsx');
const globalNavShell = read('src/components/GlobalFlatNavigation.jsx');
const combined = `${dashboardCss}\n${attendanceCss}\n${navCss}\n${locksCss}`;

assert.ok(dashboardCss, 'Dashboard iPhone readability stylesheet must exist');
assert.ok(attendanceCss, 'Attendance iPhone readability stylesheet must exist');
assert.ok(navCss, 'Global iPhone navigation readability stylesheet must exist');
assert.ok(locksCss, 'Critical iPhone cascade locks must exist');

assert.match(styleBridge, /GlobalIphoneNavigationReadable\.css/, 'Stable brand bridge must load the iPhone navigation layer');
assert.match(styleBridge, /dashboard-iphone-readable\.css/, 'Stable brand bridge must load the route-scoped Dashboard phone layer');
assert.match(styleBridge, /AttendanceIphoneReadable\.css/, 'Stable brand bridge must load the Attendance phone layer');
assert.match(styleBridge, /GlobalIphoneReadabilityCascadeLocks\.css/, 'Stable brand bridge must load critical cascade locks');
assert.doesNotMatch(globalNavShell, /GlobalIphone(?:NavigationReadable|ReadabilityCascadeLocks)\.css|dashboard-iphone-readable\.css|AttendanceIphoneReadable\.css/, 'Phone styling must not alter the guarded global navigation shell');

for (const [name, css] of [['dashboard', dashboardCss], ['attendance', attendanceCss], ['navigation', navCss], ['locks', locksCss]]) {
  assert.match(css, /@media\s*\(max-width:\s*(?:500|510|520|530|540)px\)/i, `${name} rules must be phone-scoped`);
}

assert.doesNotMatch(combined, /\bzoom\s*:/i, 'Mobile reflow must not use CSS zoom');
assert.doesNotMatch(combined, /transform\s*:\s*scale\s*\(/i, 'Mobile reflow must not scale the application');
assert.match(combined, /env\(safe-area-inset-(?:left|right|bottom)\)/i, 'Mobile rules must account for iPhone safe areas');

assert.match(navCss, /\.brian-nav__primary[\s\S]*?overflow-x\s*:\s*auto/i, 'Phone navigation must scroll internally instead of squeezing tabs');
assert.match(navCss, /\.brian-nav__primary\s*>\s*:is\([^}]+\)[\s\S]*?min-height\s*:\s*(?:44|45|46|47|48)px/i, 'Phone navigation destinations need >=44px touch targets');
assert.match(navCss, /font-size\s*:\s*(?:13|13\.5|14)px/i, 'Phone navigation labels must be readable');
assert.match(locksCss, /first-of-type[\s\S]*?min-height\s*:\s*44px/i, 'Home navigation target must remain >=44px against legacy density rules');

assert.match(dashboardCss, /\.editorial-hero-stage\s*\{[^}]*min-height\s*:\s*(?:1[5-8][0-9])px/i, 'Dashboard hero artwork stage should be about 150-189px tall on phone');
assert.match(dashboardCss, /\.editorial-hero-hello\s*\{[^}]*font-size\s*:\s*(?:2[5-9]|30)px/i, 'Dashboard greeting must be 25-30px on phone');
assert.match(dashboardCss, /\.editorial-hero\s+h1\s*\{[^}]*font-size\s*:\s*(?:4[2-8])px/i, 'Dashboard role/title must be 42-48px on phone');
assert.match(dashboardCss, /\.editorial-primary-action\s*\{[^}]*min-height\s*:\s*(?:46|47|48)px[^}]*font-size\s*:\s*(?:15|15\.5|16)px/i, 'Dashboard primary action needs a 46-48px target and >=15px label');
assert.match(dashboardCss, /\.gd-event-time\s+strong[\s\S]{0,260}?font-size\s*:\s*(?:14|14\.5|15)px/i, 'Dashboard agenda times must be >=14px');
assert.match(dashboardCss, /\.gd-event-copy\s+strong[\s\S]{0,260}?font-size\s*:\s*(?:15|15\.5|16)px/i, 'Dashboard agenda titles must be 15-16px');
assert.match(dashboardCss, /\.gd-event-copy\s+p[\s\S]{0,320}?display\s*:\s*-webkit-box/i, 'Dashboard event notes should be visible with controlled line clamping');

assert.match(attendanceCss, /\.attendance-title\s+strong\s*\{[^}]*font-size\s*:\s*(?:24|25|26|27|28)px/i, 'Attendance title must be 24-28px on phone');
assert.match(attendanceCss, /\.attendance-tabs\s+button\s*\{[^}]*min-height\s*:\s*(?:44|45|46|47|48)px[^}]*font-size\s*:\s*(?:14|14\.5|15)px/i, 'Attendance tabs need readable labels and >=44px touch targets');
assert.match(attendanceCss, /\.att-m3-subject-hub\s+button\s*\{[^}]*min-height\s*:\s*(?:44|45|46)px[^}]*font-size\s*:\s*(?:13|13\.5|14|14\.5|15)px/i, 'Attendance subject chips need phone-sized touch targets');
assert.match(attendanceCss, /\.attendance-session-controls\s+:is\(input,\s*select\)[\s\S]*?min-height\s*:\s*(?:46|47|48)px[\s\S]*?font-size\s*:\s*16px/i, 'Attendance inputs/selects need 46-48px height and 16px type to avoid iOS auto-zoom');
assert.match(attendanceCss, /\.att-m3-roster-entry\s*>\s*label\s*\{[^}]*min-height\s*:\s*(?:64|65|66|67|68|69|70|71|72)px/i, 'Attendance roster rows must be finger-friendly');
assert.match(attendanceCss, /\.attendance-roster\s*\{[^}]*overflow-x\s*:\s*auto/i, 'Attendance roster overflow must be isolated inside the roster');
assert.match(attendanceCss, /\.attendance-confirm-bar\s*\{[^}]*env\(safe-area-inset-bottom\)/i, 'Attendance confirmation area must clear the iPhone home indicator');
assert.match(locksCss, /\.att-m3-roster-entry\s*>\s*label[\s\S]*?min-height\s*:\s*68px/i, 'Roster touch height must be locked against later legacy rules');

console.log('iPhone Dashboard + Attendance mobile readability contract OK');