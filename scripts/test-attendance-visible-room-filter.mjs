import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sortAttendanceRoomLabels } from '../src/utils/attendanceDailyRoomFilter.js';

const runtime = fs.readFileSync(new URL('../src/attendanceDailyStatusOverview.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/attendance/AttendanceDailyOverview.css', import.meta.url), 'utf8');

assert.match(runtime, /attendance-calendar-room-chips/, 'Daily attendance must render the room list as an always-visible chip group.');
assert.match(runtime, /data-room-filter/, 'Each visible room chip must carry its room-filter value.');
assert.match(runtime, /Tất cả phòng/, 'The visible room list must include a clear-all chip.');
assert.match(runtime, /sortAttendanceRoomLabels/, 'Visible room chips must keep using the A→Z room sorter.');
assert.match(runtime, /matchesAttendanceRoomFilter/, 'Visible room chips must keep filtering the displayed rows.');
assert.doesNotMatch(runtime, /<select aria-label="Lọc theo phòng học"/, 'Room choices must not be hidden inside a dropdown.');
assert.match(css, /\.attendance-calendar-room-chips/i, 'Visible room chips must have dedicated responsive styling.');
assert.match(css, /\.attendance-calendar-room-chip\.is-active/i, 'The selected room chip must have a clear active state.');

assert.deepEqual(
  sortAttendanceRoomLabels(['B.203', 'A.406', 'A201', 'B.101', 'A202', ' A201 ', '', 'a202']),
  ['A201', 'A202', 'A.406', 'B.101', 'B.203'],
  'Room order must ignore punctuation when sorting, while preserving the original display label.',
);
assert.deepEqual(
  sortAttendanceRoomLabels(['C-10', 'C2', 'B 12', 'B3', 'A_9']),
  ['A_9', 'B3', 'B 12', 'C2', 'C-10'],
  'Room order must use natural alphanumeric A-Z sorting after ignoring separators.',
);

console.log('Visible A-Z daily attendance room filter contract OK');
