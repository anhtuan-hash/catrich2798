function normalizeRoomLabel(value) {
  return String(value || '').trim();
}

function roomKey(value) {
  return normalizeRoomLabel(value).toLocaleLowerCase('vi');
}

function roomSortKey(value) {
  return normalizeRoomLabel(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/gi, '');
}

function canonicalRoomCode(value) {
  return roomSortKey(value).toUpperCase();
}

export const ATTENDANCE_ROOM_ROUTE = Object.freeze([
  'A103', 'A104', 'A106',
  'A201', 'A202', 'A204', 'A206', 'B201', 'B203', 'B205', 'B206',
  'A301', 'A302', 'A303', 'A304', 'A305', 'A306',
  'A401', 'A402', 'A404', 'A405', 'A406',
]);

const ATTENDANCE_ROOM_ROUTE_INDEX = new Map(
  ATTENDANCE_ROOM_ROUTE.map((room, index) => [canonicalRoomCode(room), index]),
);

export function attendanceFloorForRoom(value) {
  const code = canonicalRoomCode(value);
  const match = code.match(/^[A-Z]?(\d{3})$/);
  if (!match) return null;
  const floor = Number(match[1][0]);
  return Number.isInteger(floor) && floor > 0 ? floor : null;
}

function compareAttendanceRooms(left, right) {
  const leftCode = canonicalRoomCode(left);
  const rightCode = canonicalRoomCode(right);
  const leftRouteIndex = ATTENDANCE_ROOM_ROUTE_INDEX.get(leftCode);
  const rightRouteIndex = ATTENDANCE_ROOM_ROUTE_INDEX.get(rightCode);
  const leftKnown = leftRouteIndex !== undefined;
  const rightKnown = rightRouteIndex !== undefined;

  if (leftKnown && rightKnown && leftRouteIndex !== rightRouteIndex) {
    return leftRouteIndex - rightRouteIndex;
  }
  if (leftKnown !== rightKnown) return leftKnown ? -1 : 1;

  const primary = roomSortKey(left).localeCompare(roomSortKey(right), 'vi', {
    numeric: true,
    sensitivity: 'base',
  });
  if (primary !== 0) return primary;
  return normalizeRoomLabel(left).localeCompare(normalizeRoomLabel(right), 'vi', {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortAttendanceRoomLabels(values = []) {
  const unique = new Map();
  values.forEach((value) => {
    const label = normalizeRoomLabel(value);
    if (!label) return;
    const key = roomKey(label);
    if (!unique.has(key)) unique.set(key, label);
  });
  return [...unique.values()].sort(compareAttendanceRooms);
}

export function sortAttendanceRowsByRoomRoute(rows = [], getRoom = (row) => row?.room) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const roomComparison = compareAttendanceRooms(getRoom(left.row), getRoom(right.row));
      return roomComparison !== 0 ? roomComparison : left.index - right.index;
    })
    .map(({ row }) => row);
}

export function matchesAttendanceRoomFilter(room, selectedRoom = 'all') {
  if (!selectedRoom || selectedRoom === 'all') return true;
  return roomKey(room) === roomKey(selectedRoom);
}
