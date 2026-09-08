function fold(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonicalClassType(value) {
  const normalized = fold(value);
  if (normalized === 'gifted' || normalized.includes('boi duong') || normalized.includes('hsg')) return 'gifted';
  if (normalized === 'remedial' || normalized.includes('phu dao')) return 'remedial';
  return normalized;
}

function canonicalSubject(value) {
  const normalized = fold(value);
  if (!normalized) return '';
  if (normalized.includes('casio')) return 'casio';
  if (normalized.includes('dia li') || normalized.includes('dia ly')) return 'dia_li';
  if (normalized.includes('vat li') || normalized.includes('vat ly')) return 'vat_li';
  if (normalized.includes('lich su')) return 'lich_su';
  if (normalized === 'su' || normalized.includes('mon su')) return 'lich_su';
  if (normalized.includes('tieng anh') || normalized === 'anh' || normalized.includes('mon anh')) return 'anh';
  if (normalized.includes('hoa')) return 'hoa';
  if (normalized.includes('sinh')) return 'sinh';
  if (normalized.includes('ngu van') || normalized === 'van' || normalized.includes('mon van')) return 'van';
  if (normalized.includes('toan')) return 'toan';
  return normalized.replace(/\s+/g, '_');
}

function gradeLevelOf(classRow) {
  const direct = Number(classRow?.grade_level);
  if ([10, 11, 12].includes(direct)) return direct;
  const match = `${classRow?.subject || ''} ${classRow?.class_name || ''}`.match(/(?:^|\D)(10|11|12)(?:\D|$)/);
  return match ? Number(match[1]) : null;
}

function weekdayOf(dateValue) {
  const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getUTCDay();
}

function persistedWeekdaysOf(classRow) {
  const raw = classRow?.weekdays;

  // Runtime/editing code may hold an in-memory JS weekday array (Sun=0 ... Sat=6).
  if (Array.isArray(raw)) {
    const normalized = [...new Set(raw
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6))]
      .sort((a, b) => a - b);
    return normalized.length ? normalized : null;
  }

  // Production DB keeps the established school notation as text:
  // 2=Thứ 2/Monday ... 7=Thứ 7/Saturday, CN=Sunday.
  const tokens = String(raw || '')
    .split(',')
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (!tokens.length) return null;

  const values = [];
  tokens.forEach((token) => {
    const normalized = fold(token);
    if (normalized === 'cn' || normalized === 'chu nhat' || normalized === 'chunhat') {
      values.push(0);
      return;
    }
    const schoolDay = Number(token);
    if (Number.isInteger(schoolDay) && schoolDay >= 2 && schoolDay <= 7) values.push(schoolDay - 1);
  });

  const normalized = [...new Set(values)].sort((a, b) => a - b);
  return normalized.length ? normalized : null;
}

const gifted = (subject, grade, room, weekdays) => ({ class_type: 'gifted', subject, grade, room, weekdays });
const remedial = (subject, grade, room, weekdays) => ({ class_type: 'remedial', subject, grade, room, weekdays });

// Fixed gifted-class schedule supplied by the school for school year 2026–2027.
// Weekdays use JavaScript numbering: Sunday=0, Monday=1 ... Saturday=6.
export const GIFTED_SCHEDULE_2026_2027 = Object.freeze([
  gifted('vat_li', 10, 'A104', [4]),
  gifted('sinh', 10, 'A106', [2]),
  gifted('van', 10, 'A201', [3]),
  gifted('anh', 10, 'A201', [1, 2]),
  gifted('anh', 11, 'A202', [3, 5]),
  gifted('hoa', 10, 'A204', [5]),
  gifted('van', 11, 'B201', [1, 5]),
  gifted('toan', 11, 'B203', [1, 2]),
  gifted('vat_li', 11, 'B205', [4, 5]),
  gifted('hoa', 11, 'B206', [1, 5]),
  gifted('lich_su', 11, 'A302', [2, 4]),
  gifted('toan', 10, 'A303', [2]),
  gifted('sinh', 12, 'A304', [2, 4]),
  gifted('hoa', 12, 'A305', [2, 4]),
  gifted('vat_li', 12, 'A306', [4, 5]),
  gifted('van', 12, 'A401', [2, 4]),
  gifted('toan', 12, 'A402', [1, 4]),
  gifted('casio', 12, 'A402', [2, 5]),
  gifted('anh', 12, 'A404', [1, 2]),
  gifted('lich_su', 12, 'A405', [2, 4]),
  gifted('lich_su', 10, 'A405', [4]),
  gifted('dia_li', 11, 'A406', [3]),
  gifted('dia_li', 12, 'A406', [1, 5]),
]);

// Fixed remedial-class schedule supplied with the attendance request.
export const REMEDIAL_SCHEDULE_2026_2027 = Object.freeze([
  remedial('toan', 10, 'A103', [1, 5]),
  remedial('toan', 11, 'A301', [1, 4]),
  remedial('anh', 10, 'A103', [2, 4]),
]);

const ALL_SCHEDULES = [...GIFTED_SCHEDULE_2026_2027, ...REMEDIAL_SCHEDULE_2026_2027];

export function scheduleForExtraClass(classRow = {}) {
  const row = classRow && typeof classRow === 'object' ? classRow : {};
  const classType = canonicalClassType(row.class_type);
  const subject = canonicalSubject(row.subject || row.class_name);
  const grade = gradeLevelOf(row);
  return ALL_SCHEDULES.find((entry) => (
    entry.class_type === classType
    && entry.subject === subject
    && entry.grade === grade
  )) || null;
}

export function weekdaysForExtraClass(classRow = {}) {
  const persisted = persistedWeekdaysOf(classRow);
  if (persisted) return persisted;
  return [...(scheduleForExtraClass(classRow)?.weekdays || [])];
}

export function roomForExtraClass(classRow = {}) {
  const explicitRoom = String(classRow?.room || '').trim();
  if (explicitRoom) return explicitRoom;
  return String(scheduleForExtraClass(classRow)?.room || '').trim();
}

export function isExtraClassScheduledOnDate(classRow, dateValue) {
  const weekday = weekdayOf(dateValue);
  if (weekday === null) return true;

  const persistedWeekdays = persistedWeekdaysOf(classRow);
  if (persistedWeekdays) return persistedWeekdays.includes(weekday);

  const schedule = scheduleForExtraClass(classRow);
  // Unknown/imported classes remain usable rather than being hidden or disabled.
  if (!schedule) return true;
  return schedule.weekdays.includes(weekday);
}
