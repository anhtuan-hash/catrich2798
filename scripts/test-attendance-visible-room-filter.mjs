import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  ATTENDANCE_ROOM_ROUTE,
  attendanceFloorForRoom,
  sortAttendanceRoomLabels,
  sortAttendanceRowsByRoomRoute,
} from '../src/utils/attendanceDailyRoomFilter.js';

const runtime = fs.readFileSync(new URL('../src/attendanceDailyStatusOverview.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/attendance/AttendanceDailyOverview.css', import.meta.url), 'utf8');

assert.match(runtime, /attendance-calendar-room-chips/, 'Daily attendance must render the room list as an always-visible chip group.');
assert.match(runtime, /data-room-filter/, 'Each visible room chip must carry its room-filter value.');
assert.match(runtime, /Tất cả phòng/, 'The visible room list must include a clear-all chip.');
assert.match(runtime, /sortAttendanceRoomLabels/, 'Visible room chips must keep using the room-route sorter.');
assert.match(runtime, /sortAttendanceRowsByRoomRoute/, 'Daily class rows must be sorted by the same physical room route.');
assert.match(runtime, /attendanceFloorForRoom/, 'Daily attendance must derive floor identity from each room.');
assert.match(runtime, /attendance-daily-floor-group/, 'All-room view must insert floor group separators.');
assert.match(runtime, /data-floor=/, 'Room chips and/or rows must expose their floor for consistent coloring.');
assert.match(runtime, /matchesAttendanceRoomFilter/, 'Visible room chips must keep filtering the displayed rows.');
assert.doesNotMatch(runtime, /<select aria-label="Lọc theo phòng học"/, 'Room choices must not be hidden inside a dropdown.');
assert.match(css, /\.attendance-calendar-room-chips/i, 'Visible room chips must have dedicated responsive styling.');
assert.match(css, /\.attendance-calendar-room-chip\.is-active/i, 'The selected room chip must have a clear active state.');
assert.match(css, /data-floor="1"/i, 'Floor 1 must have a dedicated color treatment.');
assert.match(css, /data-floor="2"/i, 'Floor 2 must have a dedicated color treatment.');
assert.match(css, /data-floor="3"/i, 'Floor 3 must have a dedicated color treatment.');
assert.match(css, /data-floor="4"/i, 'Floor 4 must have a dedicated color treatment.');
assert.match(css, /\.attendance-daily-floor-group/i, 'Floor separators must have dedicated styling.');

// Compact daily layout: one toolbar, one summary strip, then the routed class list.
assert.match(runtime, /attendance-daily-compact-toolbar/, 'Daily controls must be consolidated into one compact toolbar.');
assert.doesNotMatch(runtime, /<span>Phòng học<\/span>/, 'The redundant visible “Phòng học” label must be removed from the compact toolbar.');
assert.match(runtime, /aria-label="Ngày điểm danh"/, 'The compact date field must retain an accessible label without a separate visible heading.');
assert.match(runtime, /attendance-daily-overview__summary is-compact/, 'Daily metrics must render as one compact summary strip.');
assert.doesNotMatch(runtime, /đi theo thứ tự phòng/, 'Floor separators must not repeat the instructional copy on every floor.');
assert.match(
  css,
  /data-attendance-daily-mode="daily"\][^}]*>\s*\.attendance-calendar-toolbar\s*\{[^}]*display\s*:\s*none\s*!important/i,
  'The original month-title toolbar must disappear in daily mode to reclaim vertical space.',
);
assert.match(css, /\.attendance-daily-compact-toolbar\s*\{[^}]*min-height\s*:\s*4[0-9]px/i, 'Compact daily controls should fit in roughly one 40px row.');
assert.match(css, /\.attendance-daily-overview__summary\.is-compact\s*\{[^}]*min-height\s*:\s*3[0-9]px/i, 'Summary metrics must collapse into a short horizontal strip.');
assert.match(css, /\.attendance-daily-floor-group\s*\{[^}]*min-height\s*:\s*3[0-2]px/i, 'Floor separators must be compact.');
assert.match(css, /\.attendance-daily-class-row\s*\{[^}]*min-height\s*:\s*5[2-9]px/i, 'Daily class rows must be dense enough to show substantially more classes per viewport.');

assert.deepEqual(
  ATTENDANCE_ROOM_ROUTE,
  [
    'A103', 'A104', 'A106',
    'A201', 'A202', 'A204', 'A206', 'B201', 'B203', 'B205', 'B206',
    'A301', 'A302', 'A303', 'A304', 'A305', 'A306',
    'A401', 'A402', 'A404', 'A405', 'A406',
  ],
  'The route must match the school-approved attendance room order exactly.',
);

assert.equal(attendanceFloorForRoom('A103'), 1);
assert.equal(attendanceFloorForRoom('A206'), 2);
assert.equal(attendanceFloorForRoom('A.406'), 4);
assert.equal(attendanceFloorForRoom('B205'), 2);
assert.equal(attendanceFloorForRoom(''), null);

assert.deepEqual(
  sortAttendanceRoomLabels(['A405', 'A206', 'B205', 'A302', 'A104', 'A204', 'A202', 'A103']),
  ['A103', 'A104', 'A202', 'A204', 'A206', 'B205', 'A302', 'A405'],
  'A206 must remain inside the floor-2 route instead of falling behind known floor-4 rooms.',
);
assert.deepEqual(
  sortAttendanceRoomLabels(['B205', 'A405', 'A302', 'A104', 'A306', 'A401', 'A202', 'A103', 'A406']),
  ['A103', 'A104', 'A202', 'B205', 'A302', 'A306', 'A401', 'A405', 'A406'],
  'Known school rooms must follow the physical floor-by-floor attendance route instead of lexical interleaving.',
);
assert.deepEqual(
  sortAttendanceRoomLabels(['B.203', 'A.406', 'A201', 'B.201', 'A202', ' A201 ', '', 'a202']),
  ['A201', 'A202', 'B.201', 'B.203', 'A.406'],
  'Punctuation variants must map onto the same school-room route while preserving display labels.',
);
assert.deepEqual(
  sortAttendanceRoomLabels(['C-10', 'C2', 'B 12', 'B3', 'A_9']),
  ['A_9', 'B3', 'B 12', 'C2', 'C-10'],
  'Unknown rooms must still use natural alphanumeric fallback sorting.',
);

const rows = [
  { id: 'chem', room: 'A305', class_name: 'Hóa 12' },
  { id: 'history', room: 'A405', class_name: 'Lịch sử 10' },
  { id: 'a206', room: 'A206', class_name: 'Tiếng Anh 12' },
  { id: 'physics', room: 'B205', class_name: 'Vật lí 11' },
  { id: 'math', room: 'A402', class_name: 'Toán 12' },
  { id: 'bio', room: 'A304', class_name: 'Sinh học 12' },
];
assert.deepEqual(
  sortAttendanceRowsByRoomRoute(rows, (row) => row.room).map((row) => row.id),
  ['a206', 'physics', 'bio', 'chem', 'math', 'history'],
  'Class rows must route A206 with floor 2 before moving to floors 3 and 4.',
);

console.log('Compact floor-grouped daily attendance room route contract OK');
