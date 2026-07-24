export const WORK_SCHEDULE_ITEM_TYPE = 'schedule';
export const WORK_SCHEDULE_SOURCE = 'work-schedule-import-v1168';

const HEADER_ALIASES = {
  date: [
    'ngay', 'ngay thang', 'thu ngay', 'ngay lam viec', 'date', 'work date',
  ],
  dateTime: [
    'thoi gian', 'ngay gio', 'date time', 'datetime', 'when',
  ],
  start: [
    'bat dau', 'gio bat dau', 'tu', 'start', 'start time', 'from',
  ],
  end: [
    'ket thuc', 'gio ket thuc', 'den', 'end', 'end time', 'to',
  ],
  time: [
    'khung gio', 'gio', 'ca', 'buoi', 'time', 'time range',
  ],
  title: [
    'noi dung cong viec', 'noi dung', 'cong viec', 'hoat dong', 'nhiem vu',
    'chuong trinh', 'su kien', 'tieu de', 'title', 'task', 'activity', 'event',
  ],
  description: [
    'mo ta', 'yeu cau', 'noi dung chi tiet', 'chi tiet', 'description', 'details', 'requirement',
  ],
  location: [
    'dia diem', 'noi thuc hien', 'phong', 'location', 'place', 'room',
  ],
  owner: [
    'nguoi phu trach', 'phu trach', 'chu tri', 'thuc hien', 'owner', 'person in charge', 'responsible',
  ],
  attendees: [
    'thanh phan', 'doi tuong', 'nguoi tham gia', 'participants', 'attendees', 'audience',
  ],
  note: [
    'ghi chu', 'luu y', 'note', 'notes', 'remark', 'remarks',
  ],
  priority: [
    'muc do', 'uu tien', 'priority', 'importance',
  ],
  visibility: [
    'pham vi', 'hien thi', 'visibility', 'scope',
  ],
};

const REQUIRED_KEYS = ['date', 'title'];
const HEADER_SCAN_LIMIT = 25;

export function normalizeScheduleText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cellText(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '').trim();
}

function aliasMatches(header, alias) {
  if (!header || !alias) return false;
  if (header === alias) return true;
  if (header.length >= 6 && header.includes(alias)) return true;
  if (alias.length >= 6 && alias.includes(header)) return true;
  return false;
}

function classifyHeader(value) {
  const header = normalizeScheduleText(value);
  if (!header) return null;

  const orderedKeys = [
    'title', 'description', 'location', 'owner', 'attendees', 'note', 'priority',
    'visibility', 'start', 'end', 'time', 'date', 'dateTime',
  ];
  for (const key of orderedKeys) {
    if (HEADER_ALIASES[key].some((alias) => aliasMatches(header, alias))) return key;
  }
  return null;
}

function rowHeaderMap(row = []) {
  const map = {};
  const duplicates = new Set();
  row.forEach((cell, index) => {
    const key = classifyHeader(cell);
    if (!key) return;
    if (map[key] === undefined) map[key] = index;
    else duplicates.add(key);
  });

  if (map.date === undefined && map.dateTime !== undefined) map.date = map.dateTime;
  const recognized = Object.keys(map).filter((key) => key !== 'dateTime');
  const required = REQUIRED_KEYS.filter((key) => map[key] !== undefined).length;
  const score = recognized.length * 2 + required * 5 - duplicates.size;
  return { map, score, recognized, duplicates: [...duplicates] };
}

export function detectScheduleTable(grid = []) {
  let best = { headerIndex: -1, map: {}, score: -1, recognized: [], duplicates: [] };
  const max = Math.min(grid.length, HEADER_SCAN_LIMIT);
  for (let index = 0; index < max; index += 1) {
    const candidate = rowHeaderMap(grid[index]);
    if (candidate.score > best.score) best = { headerIndex: index, ...candidate };
  }

  const hasTitle = best.map.title !== undefined;
  const hasDate = best.map.date !== undefined || best.map.dateTime !== undefined;
  if (!hasTitle || !hasDate || best.recognized.length < 2) {
    return {
      ok: false,
      message: 'Không nhận diện được hàng tiêu đề. File cần có ít nhất cột Ngày và Nội dung công việc.',
      ...best,
    };
  }
  return { ok: true, ...best };
}

function excelSerialToDate(serial) {
  const numeric = Number(serial);
  if (!Number.isFinite(numeric)) return null;
  const wholeDays = Math.floor(numeric);
  const fraction = numeric - wholeDays;
  const utc = Date.UTC(1899, 11, 30) + wholeDays * 86400000 + Math.round(fraction * 86400000);
  const value = new Date(utc);
  return Number.isNaN(value.getTime()) ? null : value;
}

function safeDate(year, month, day) {
  const value = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) return null;
  return value;
}

export function parseScheduleDate(value, fallbackYear = new Date().getFullYear()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === 'number') {
    const serialDate = excelSerialToDate(value);
    if (serialDate) return new Date(serialDate.getUTCFullYear(), serialDate.getUTCMonth(), serialDate.getUTCDate());
  }

  const text = cellText(value);
  if (!text) return null;
  const normalized = text.replace(/[–—]/g, '-').trim();

  let match = normalized.match(/\b(20\d{2}|19\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/);
  if (match) return safeDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = normalized.match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/);
  if (match) {
    const rawYear = match[3] ? Number(match[3]) : fallbackYear;
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return safeDate(year, Number(match[2]), Number(match[1]));
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return null;
}

export function parseScheduleTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { hours: value.getHours(), minutes: value.getMinutes() };
  }
  if (typeof value === 'number' && value >= 0 && value < 1.5) {
    const minutes = Math.round((value % 1) * 1440);
    return { hours: Math.floor(minutes / 60) % 24, minutes: minutes % 60 };
  }

  const text = cellText(value).toLowerCase();
  if (!text) return null;
  const match = text.match(/(?:^|\D)([01]?\d|2[0-3])\s*(?:[:h\.])\s*([0-5]?\d)?/)
    || text.match(/(?:^|\D)([01]?\d|2[0-3])\s*(?:gio|hour)/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2] || 0) };
}

function parseTimeRange(value) {
  const text = cellText(value).replace(/[–—]/g, '-');
  if (!text) return { start: null, end: null };
  const parts = text.split(/\s*(?:-|→|den|đến|to)\s*/i).filter(Boolean);
  return {
    start: parseScheduleTime(parts[0] || text),
    end: parseScheduleTime(parts[1] || ''),
  };
}

function withTime(date, time, fallbackHours = 8, fallbackMinutes = 0) {
  if (!date) return null;
  const result = new Date(date);
  result.setHours(time?.hours ?? fallbackHours, time?.minutes ?? fallbackMinutes, 0, 0);
  return result;
}

function normalizePriority(value) {
  const normalized = normalizeScheduleText(value);
  if (['khan', 'khẩn', 'urgent', 'rat cao'].some((token) => normalized.includes(normalizeScheduleText(token)))) return 'urgent';
  if (['cao', 'high', 'quan trong'].some((token) => normalized.includes(normalizeScheduleText(token)))) return 'high';
  if (['thap', 'low'].some((token) => normalized.includes(normalizeScheduleText(token)))) return 'low';
  return 'normal';
}

function normalizeVisibility(value) {
  const normalized = normalizeScheduleText(value);
  if (normalized.includes('rieng') || normalized.includes('private')) return 'private';
  if (normalized.includes('lien quan') || normalized.includes('restricted')) return 'restricted';
  return 'department';
}

function getCell(row, map, key) {
  const index = map[key];
  return index === undefined ? '' : row[index];
}

function buildDescription(parts) {
  return parts.map((part) => cellText(part)).filter(Boolean).join('\n');
}

export function scheduleFingerprint(event) {
  const start = event.startAt ? new Date(event.startAt) : null;
  const stamp = start && !Number.isNaN(start.getTime())
    ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}T${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
    : '';
  return [
    stamp,
    normalizeScheduleText(event.title),
    normalizeScheduleText(event.location),
  ].join('|');
}

export function scheduleRowsFromGrid(grid = [], options = {}) {
  const detection = detectScheduleTable(grid);
  if (!detection.ok) return { ...detection, validRows: [], invalidRows: [] };

  const fileName = options.fileName || '';
  const fallbackYear = options.fallbackYear || new Date().getFullYear();
  const validRows = [];
  const invalidRows = [];
  const seen = new Set();

  grid.slice(detection.headerIndex + 1).forEach((row, offset) => {
    const sourceRow = detection.headerIndex + offset + 2;
    if (!Array.isArray(row) || row.every((cell) => !cellText(cell))) return;

    const title = cellText(getCell(row, detection.map, 'title'));
    const rawDate = getCell(row, detection.map, 'date');
    const date = parseScheduleDate(rawDate, fallbackYear);
    const explicitStart = parseScheduleTime(getCell(row, detection.map, 'start'));
    const explicitEnd = parseScheduleTime(getCell(row, detection.map, 'end'));
    const range = parseTimeRange(getCell(row, detection.map, 'time'));
    const embeddedRange = parseTimeRange(rawDate);
    const startTime = explicitStart || range.start || embeddedRange.start;
    const endTime = explicitEnd || range.end || embeddedRange.end;
    const startDate = withTime(date, startTime, 8, 0);
    let endDate = withTime(date, endTime, startTime?.hours ?? 9, startTime?.minutes ?? 0);
    if (startDate && endDate && endDate <= startDate) endDate = new Date(startDate.getTime() + 60 * 60000);

    const location = cellText(getCell(row, detection.map, 'location'));
    const ownerText = cellText(getCell(row, detection.map, 'owner'));
    const attendees = cellText(getCell(row, detection.map, 'attendees'));
    const note = cellText(getCell(row, detection.map, 'note'));
    const description = buildDescription([
      getCell(row, detection.map, 'description'),
      note ? `Ghi chú: ${note}` : '',
    ]);

    const errors = [];
    if (!title) errors.push('Thiếu nội dung công việc');
    if (!date) errors.push('Ngày không hợp lệ');
    if (!startDate) errors.push('Không xác định được thời gian bắt đầu');

    const event = {
      title,
      description,
      startAt: startDate?.toISOString() || '',
      endAt: endDate?.toISOString() || '',
      location,
      ownerText,
      attendees,
      note,
      priority: normalizePriority(getCell(row, detection.map, 'priority')),
      visibility: normalizeVisibility(getCell(row, detection.map, 'visibility')),
      sourceRow,
      sourceFileName: fileName,
    };
    event.fingerprint = scheduleFingerprint(event);

    if (event.fingerprint && seen.has(event.fingerprint)) errors.push('Trùng dòng trong file');
    if (event.fingerprint) seen.add(event.fingerprint);

    if (errors.length) invalidRows.push({ sourceRow, title: title || '(trống)', errors, raw: row });
    else validRows.push(event);
  });

  return {
    ok: true,
    ...detection,
    validRows,
    invalidRows,
    totalRows: validRows.length + invalidRows.length,
  };
}

export function parseDelimitedText(text = '') {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const candidates = [',', ';', '\t'];
  const delimiter = candidates
    .map((candidate) => ({ candidate, count: firstLine.split(candidate).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.candidate || ',';

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

export function makeScheduleTemplateCsv() {
  const rows = [
    ['Ngày', 'Bắt đầu', 'Kết thúc', 'Nội dung công việc', 'Địa điểm', 'Người phụ trách', 'Thành phần', 'Ghi chú', 'Mức độ'],
    ['27/07/2026', '08:00', '09:30', 'Họp tổ chuyên môn đầu tuần', 'Phòng họp 2', 'TTCM', 'Toàn bộ giáo viên Tiếng Anh', 'Mang theo kế hoạch cá nhân', 'Cao'],
  ];
  return `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;
}

export function scheduleItemToEvent(item) {
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const startAt = metadata.schedule_start_at || item?.due_at || '';
  const endAt = metadata.schedule_end_at || '';
  return {
    id: item?.id || '',
    title: item?.title || 'Lịch làm việc',
    description: item?.description || '',
    startAt,
    endAt,
    location: metadata.schedule_location || '',
    ownerText: metadata.schedule_owner_text || '',
    attendees: metadata.schedule_attendees || '',
    note: metadata.schedule_note || '',
    priority: item?.priority || 'normal',
    visibility: item?.visibility || 'department',
    fingerprint: metadata.schedule_fingerprint || scheduleFingerprint({ title: item?.title, startAt, location: metadata.schedule_location }),
    sourceFileName: metadata.schedule_source_file || '',
    sourceRow: metadata.schedule_source_row || null,
    importId: metadata.schedule_import_id || '',
    createdAt: item?.created_at || '',
    updatedAt: item?.updated_at || '',
    raw: item,
  };
}

export function toLocalDateTimeInput(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatScheduleDateTime(value, locale = 'vi-VN') {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}
