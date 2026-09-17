import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const jsx = fs.readFileSync(path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/components/attendance/AttendanceHistoryV2.css'), 'utf8');

assert.match(
  jsx,
  /const\s+SESSION_COLUMNS\s*=\s*['"][^'"]*checked_by_name[^'"]*['"];/,
  'History session projection must include checked_by_name.',
);

assert.match(
  jsx,
  /selectedSession\.checked_by_name\s*\|\|\s*selectedSession\.checked_by\s*\|\|\s*['"]Không ghi nhận['"]/,
  'Audit actor must prefer the human-readable checked_by_name snapshot.',
);

assert.match(
  jsx,
  /className=\{\`ahv3__late-section\s+\$\{!selectedLateRecords\.length\s*\?\s*['"]is-empty['"]\s*:\s*['"]['"]\}\`\.trim\(\)\}/,
  'Tardy card must always render and expose an explicit empty state.',
);

assert.match(
  jsx,
  /Danh sách học sinh đi trễ[\s\S]*?Không có học sinh đi trễ\./,
  'The empty tardy card must show its complete human-readable message.',
);

assert.match(
  jsx,
  /className=\{\`ahv3__absent-section\s+\$\{!selectedAbsentRecords\.length\s*\?\s*['"]is-empty['"]\s*:\s*['"]['"]\}\`\.trim\(\)\}/,
  'Empty absence state must be explicit in the markup.',
);

assert.match(
  jsx,
  /Tất cả học sinh đều có mặt\.[\s\S]*?Lớp duy trì sĩ số đầy đủ trong buổi học này\./,
  'The empty absence card must keep the approved full success copy.',
);

assert.match(
  css,
  /\.ahv3__shell\s+\.ahv3__detail\s*>\s*\.ahv3__late-section\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*2;[\s\S]*?grid-row:\s*7;/,
  'Tardy card must occupy the left column in the paired attendance-state row.',
);

assert.match(
  css,
  /\.ahv3__shell\s+\.ahv3__detail\s*>\s*\.ahv3__absent-section\s*\{[\s\S]*?grid-column:\s*2\s*\/\s*3;[\s\S]*?grid-row:\s*7;/,
  'Absence card must occupy the right column in the paired attendance-state row.',
);

assert.match(
  css,
  /\.ahv3__shell\s+\.ahv3__detail:not\(:has\(>\s*\.ahv3__proof\)\)\s*>\s*\.ahv3__absent-section\s*\{[\s\S]*?grid-column:\s*2\s*\/\s*3;[\s\S]*?grid-row:\s*7;/,
  'The final no-proof override must defeat the legacy full-width absence fallback.',
);

assert.match(
  css,
  /\.ahv3__shell\s+\.ahv3__detail\s*>\s*\.ahv3__proof\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;[\s\S]*?grid-row:\s*8;/,
  'Optional proof must move below both attendance-state cards instead of competing with them.',
);

assert.match(
  css,
  /\.ahv3__shell\s+\.ahv3__late-section\.is-empty,[\s\S]*?\.ahv3__shell\s+\.ahv3__absent-section\.is-empty\s*\{[\s\S]*?min-height:\s*118px\s*!important;[\s\S]*?overflow:\s*visible\s*!important;/,
  'Both empty cards must keep a stable readable height and never clip their content.',
);

assert.match(
  css,
  /\.ahv3__shell\s+\.ahv3__empty-attendance\s*\{[\s\S]*?display:\s*flex;[\s\S]*?min-height:\s*62px;[\s\S]*?align-items:\s*center;/,
  'Empty attendance content must have a centered readable presentation.',
);

assert.match(
  css,
  /\.ahv3__shell\s+\.attendance-late-list\s*\{[\s\S]*?display:\s*block\s*!important;[\s\S]*?position:\s*static\s*!important;[\s\S]*?max-height:\s*\d+px;[\s\S]*?overflow-y:\s*auto;/,
  'Tardy list must explicitly own its layout and bounded scrolling.',
);

assert.match(
  css,
  /@media\s*\(max-width:\s*900px\)[\s\S]*?\.ahv3__shell\s+\.ahv3__detail\s*>\s*\.ahv3__late-section,[\s\S]*?\.ahv3__shell\s+\.ahv3__detail\s*>\s*\.ahv3__absent-section[\s\S]*?grid-column:\s*1\s*\/\s*-1;/,
  'Both cards must stack full-width on narrow screens.',
);

console.log('Attendance history display fixes contract OK');
