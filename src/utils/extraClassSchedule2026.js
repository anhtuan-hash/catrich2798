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

const gifted = (subject, grade, weekdays) => ({ class_type: 'gifted', subject, grade, weekdays });
const remedial = (subject, grade, weekdays) => ({ class_type: 'remedial', subject, grade, weekdays });

// Fixed gifted-class schedule supplied by the school for school year 2026–2027.
// Weekdays use JavaScript numbering: Monday=1 … Friday=5.
export const GIFTED_SCHEDULE_2026_2027 = Object.freeze([
  gifted('vat_li', 10, [4]),
  gifted('sinh', 10, [2]),
  gifted('van', 10, [3]),
  gifted('anh', 10, [1, 2]),
  gifted('anh', 11, [3, 5]),
  gifted('hoa', 10, [5]),
  gifted('van', 11, [1, 5]),
  gifted('toan', 11, [1, 2]),
  gifted('vat_li', 11, [4, 5]),
  gifted('hoa', 11, [1, 5]),
  gifted('lich_su', 11, [2, 4]),
  gifted('toan', 10, [2]),
  gifted('sinh', 12, [2, 4]),
  gifted('hoa', 12, [2, 4]),
  gifted('vat_li', 12, [4, 5]),
  gifted('van', 12, [2, 4]),
  gifted('toan', 12, [1, 4]),
  gifted('casio', 12, [2, 5]),
  gifted('anh', 12, [1, 2]),
  gifted('lich_su', 12, [2, 4]),
  gifted('lich_su', 10, [4]),
  gifted('dia_li', 11, [3]),
  gifted('dia_li', 12, [1, 5]),
]);

// Fixed remedial-class schedule supplied with the attendance request.
export const REMEDIAL_SCHEDULE_2026_2027 = Object.freeze([
  remedial('toan', 10, [1, 5]),
  remedial('toan', 11, [1, 4]),
  remedial('anh', 10, [2, 4]),
]);

const ALL_SCHEDULES = [...GIFTED_SCHEDULE_2026_2027, ...REMEDIAL_SCHEDULE_2026_2027];

export function scheduleForExtraClass(classRow = {}) {
  const classType = canonicalClassType(classRow.class_type);
  const subject = canonicalSubject(classRow.subject || classRow.class_name);
  const grade = gradeLevelOf(classRow);
  return ALL_SCHEDULES.find((entry) => (
    entry.class_type === classType
    && entry.subject === subject
    && entry.grade === grade
  )) || null;
}

export function isExtraClassScheduledOnDate(classRow, dateValue) {
  const schedule = scheduleForExtraClass(classRow);
  const weekday = weekdayOf(dateValue);
  // Unknown/imported classes and malformed dates remain usable rather than being hidden or disabled.
  if (!schedule || weekday === null) return true;
  return schedule.weekdays.includes(weekday);
}
