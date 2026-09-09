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

export function sortAttendanceRoomLabels(values = []) {
  const unique = new Map();
  values.forEach((value) => {
    const label = normalizeRoomLabel(value);
    if (!label) return;
    const key = roomKey(label);
    if (!unique.has(key)) unique.set(key, label);
  });
  return [...unique.values()].sort((left, right) => {
    const primary = roomSortKey(left).localeCompare(roomSortKey(right), 'vi', {
      numeric: true,
      sensitivity: 'base',
    });
    if (primary !== 0) return primary;
    return left.localeCompare(right, 'vi', { numeric: true, sensitivity: 'base' });
  });
}

export function matchesAttendanceRoomFilter(room, selectedRoom = 'all') {
  if (!selectedRoom || selectedRoom === 'all') return true;
  return roomKey(room) === roomKey(selectedRoom);
}
