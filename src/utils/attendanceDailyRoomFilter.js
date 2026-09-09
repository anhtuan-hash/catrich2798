function normalizeRoomLabel(value) {
  return String(value || '').trim();
}

function roomKey(value) {
  return normalizeRoomLabel(value).toLocaleLowerCase('vi');
}

export function sortAttendanceRoomLabels(values = []) {
  const unique = new Map();
  values.forEach((value) => {
    const label = normalizeRoomLabel(value);
    if (!label) return;
    const key = roomKey(label);
    if (!unique.has(key)) unique.set(key, label);
  });
  return [...unique.values()].sort((left, right) => left.localeCompare(right, 'vi', {
    numeric: true,
    sensitivity: 'base',
  }));
}

export function matchesAttendanceRoomFilter(room, selectedRoom = 'all') {
  if (!selectedRoom || selectedRoom === 'all') return true;
  return roomKey(room) === roomKey(selectedRoom);
}
