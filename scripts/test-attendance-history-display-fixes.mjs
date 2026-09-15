import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const jsx = fs.readFileSync(path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/components/attendance/AttendanceHistoryV2.css'), 'utf8');

assert.match(jsx,/const\s+SESSION_COLUMNS\s*=\s*['"][^'"]*checked_by_name[^'"]*['"];/,'History session projection must include checked_by_name.');
assert.match(jsx,/selectedSession\.checked_by_name\s*\|\|\s*selectedSession\.checked_by\s*\|\|\s*['"]Không ghi nhận['"]/, 'Audit actor must prefer the human-readable checked_by_name snapshot.');
assert.match(jsx,/className=\{`ahv3__absent-section\s+\$\{!selectedAbsentRecords\.length\s*\?\s*['"]is-empty['"]\s*:\s*['"]['"]\}`\.trim\(\)\}/,'Empty absence state must be explicit in the markup.');
assert.match(css,/\.ahv3__shell\s+\.ahv3__absent-section\.is-empty\s*\{[\s\S]*?min-height:\s*0\s*!important;[\s\S]*?height:\s*auto\s*!important;/,'Empty absence card must collapse to its content instead of keeping the roster minimum height.');
assert.match(css,/\.ahv3__shell\s+\.attendance-late-list\s*\{[\s\S]*?display:\s*block\s*!important;[\s\S]*?position:\s*static\s*!important;[\s\S]*?max-height:\s*\d+px;[\s\S]*?overflow-y:\s*auto;/,'Tardy list must explicitly own its layout and bounded scrolling.');
assert.match(css,/\.ahv3__shell\s+\.ahv3__late-section\s*\{[\s\S]*?display:\s*block\s*!important;[\s\S]*?height:\s*auto\s*!important;[\s\S]*?overflow:\s*visible\s*!important;/,'Tardy section must not clip its student rows.');

// Regression from the 11/09 production screenshot: the two-column CSS Grid lets
// late-list overflow paint underneath the footer. The final cascade must make
// the detail pane a true vertical normal flow so sibling cards cannot overlap.
const finalCascade = css.slice(css.lastIndexOf('/* Attendance history display bug fixes'));
assert.match(finalCascade,/\.ahv3__shell\s+\.ahv3__detail\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*column;/,'Final History cascade must use vertical flex flow to prevent tardy/footer overlap.');
assert.doesNotMatch(finalCascade,/\.ahv3__shell\s+\.ahv3__detail\s*\{[\s\S]*?display:\s*grid/,'Final History cascade must not reintroduce grid placement for detail cards.');

console.log('Attendance history display fixes contract OK');
