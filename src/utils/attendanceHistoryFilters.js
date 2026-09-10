function fold(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function dateKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function timeKey(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function filterAndSortAttendanceHistory(sessions, {
  query = '',
  type = 'all',
  dateFrom = '',
  dateTo = '',
  sort = 'desc',
  getTeacher,
} = {}) {
  const source = Array.isArray(sessions) ? sessions : [];
  const from = dateKey(dateFrom);
  const to = dateKey(dateTo);
  const normalizedQuery = fold(query);

  if (from && to && from > to) return [];

  const filtered = source.filter((session) => {
    if (type !== 'all' && session?.class_type !== type) return false;

    const attendanceDate = dateKey(session?.attendance_date);
    if (from && (!attendanceDate || attendanceDate < from)) return false;
    if (to && (!attendanceDate || attendanceDate > to)) return false;

    if (!normalizedQuery) return true;
    const teacher = typeof getTeacher === 'function' ? getTeacher(session) : session?.teacher_name;
    const haystack = fold(`${session?.class_name || ''} ${teacher || ''} ${session?.subject || ''} ${attendanceDate}`);
    return haystack.includes(normalizedQuery);
  });

  const direction = sort === 'asc' ? 1 : -1;
  return filtered
    .map((session, index) => ({ session, index }))
    .sort((left, right) => {
      const leftDate = dateKey(left.session?.attendance_date);
      const rightDate = dateKey(right.session?.attendance_date);
      if (leftDate !== rightDate) {
        if (!leftDate) return 1;
        if (!rightDate) return -1;
        return leftDate.localeCompare(rightDate) * direction;
      }

      const leftTime = timeKey(left.session?.checked_at);
      const rightTime = timeKey(right.session?.checked_at);
      if (leftTime !== rightTime) return (leftTime - rightTime) * direction;
      return left.index - right.index;
    })
    .map(({ session }) => session);
}
