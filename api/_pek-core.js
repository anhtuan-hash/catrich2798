export const PRIORITY_TEACHERS = [
  'Nguyễn Anh Tuấn',
  'Nguyễn Đặng Minh Hoa',
  'Phạm Thị Ngọc Châm',
  'Ngô Thị Mỹ Diệp',
  'Đào Ngọc Nhã',
  'Nguyễn Thị Mỹ Duyên',
];

const DAY_ALIASES = new Map([
  ['thu 2', 2], ['thứ 2', 2], ['t2', 2], ['monday', 2],
  ['thu 3', 3], ['thứ 3', 3], ['t3', 3], ['tuesday', 3],
  ['thu 4', 4], ['thứ 4', 4], ['t4', 4], ['wednesday', 4],
  ['thu 5', 5], ['thứ 5', 5], ['t5', 5], ['thursday', 5],
  ['thu 6', 6], ['thứ 6', 6], ['t6', 6], ['friday', 6],
  ['thu 7', 7], ['thứ 7', 7], ['t7', 7], ['saturday', 7],
  ['chu nhat', 8], ['chủ nhật', 8], ['cn', 8], ['sunday', 8],
]);

const HEADER_KEYS = {
  teacherName: ['giao vien', 'giáo viên', 'gv', 'teacher', 'ten giao vien', 'tên giáo viên', 'ho ten', 'họ tên'],
  className: ['lop', 'lớp', 'class', 'ten lop', 'tên lớp'],
  subject: ['mon', 'môn', 'subject', 'mon hoc', 'môn học'],
  weekday: ['thu', 'thứ', 'ngay', 'ngày', 'day', 'weekday'],
  period: ['tiet', 'tiết', 'period', 'ca hoc', 'ca học', 'buoi', 'buổi'],
  room: ['phong', 'phòng', 'room'],
  note: ['ghi chu', 'ghi chú', 'note'],
};

export function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

export function cleanCell(html = '') {
  return decodeEntities(String(html)
    .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(p|div|li|tr|h\d|td|th)>/gi, '\n')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .split('\n').map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n').trim();
}

export function unique(values) { return [...new Set(values.filter(Boolean))]; }

function teacherCanonical(value = '') {
  const needle = normalize(value);
  return PRIORITY_TEACHERS.find((name) => needle === normalize(name) || needle.includes(normalize(name)) || normalize(name).includes(needle)) || String(value).trim();
}

export function findTeacher(value = '') {
  const normalized = normalize(value);
  return PRIORITY_TEACHERS.find((name) => normalized.includes(normalize(name))) || '';
}

export function findClass(value = '') {
  const source = String(value).replace(/\s+/g, ' ');
  const patterns = [
    /(?:lớp|lop|class)\s*[:\-]?\s*((?:6|7|8|9|10|11|12)(?:[A-Za-z]\d{0,2}|[./-]\d{1,2}|\d{1,2})?)/i,
    /\b((?:6|7|8|9|10|11|12)[A-Za-z]\d{1,2})\b/i,
    /\b((?:6|7|8|9|10|11|12)[./-]\d{1,2})\b/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1].replace('-', '.').replace('/', '.').toUpperCase();
  }
  return '';
}

function findRoom(value = '') {
  const match = String(value).match(/(?:phòng|phong|room|p\.)\s*[:\-]?\s*([A-Za-z0-9._-]+)/i);
  return match ? match[1].toUpperCase() : '';
}

export function parseWeekday(value = '') {
  const key = normalize(value).replace(/[,:].*$/, '').trim();
  for (const [alias, day] of DAY_ALIASES.entries()) if (key === normalize(alias) || key.includes(normalize(alias))) return day;
  const date = String(value).match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (!date) return null;
  const year = date[3] ? Number(date[3].length === 2 ? `20${date[3]}` : date[3]) : new Date().getFullYear();
  const jsDay = new Date(year, Number(date[2]) - 1, Number(date[1])).getDay();
  return jsDay === 0 ? 8 : jsDay + 1;
}

export function parsePeriod(value = '') {
  const text = normalize(value);
  const range = text.match(/(?:tiet|period|ca)?\s*(\d{1,2})\s*(?:-|–|—|den|to)\s*(\d{1,2})/i);
  if (range) return { periodStart: Number(range[1]), periodEnd: Number(range[2]) };
  const single = text.match(/(?:tiet|period|ca)?\s*(\d{1,2})/i);
  return single ? { periodStart: Number(single[1]), periodEnd: Number(single[1]) } : { periodStart: null, periodEnd: null };
}

function inferSubject(value = '', excluded = []) {
  const ignored = excluded.map(normalize).filter(Boolean);
  return String(value).split(/\n|\s{2,}|\s*[;|]\s*/).map((line) => line.trim()).filter(Boolean).find((line) => {
    const key = normalize(line);
    return key.length >= 2 && !ignored.some((item) => key === item || key.includes(item))
      && !/^(tiet|thu|ngay|phong|lop|gv|giao vien|room|class|period|ca)\b/.test(key)
      && !/^\d{1,2}([:.-]\d{1,2})?$/.test(key);
  }) || '';
}

function contextFromLabel(label = '') { return { label, teacherName: findTeacher(label), className: findClass(label) }; }

export function buildEntry(raw, context = {}) {
  const combined = [raw.teacherName, raw.className, raw.subject, raw.room, raw.note, raw.rawText, context.label].filter(Boolean).join('\n');
  const teacherName = teacherCanonical(raw.teacherName || findTeacher(combined) || context.teacherName || '');
  const className = (raw.className || findClass(combined) || context.className || '').trim();
  const weekday = Number(raw.weekday) || parseWeekday(raw.day || raw.weekdayText || context.day || '');
  const periodInfo = raw.periodStart ? { periodStart: Number(raw.periodStart), periodEnd: Number(raw.periodEnd || raw.periodStart) } : parsePeriod(raw.period || raw.periodText || context.period || '');
  const room = raw.room || findRoom(combined);
  const subject = (raw.subject || inferSubject(raw.rawText || combined, [teacherName, className, room])).trim();
  if (!weekday || !periodInfo.periodStart || (!teacherName && !className) || periodInfo.periodStart < 1 || periodInfo.periodStart > 20) return null;
  return {
    id: [weekday, periodInfo.periodStart, periodInfo.periodEnd, teacherName, className, subject, room].map(normalize).join('|'),
    teacherName, className, subject: subject || 'Chưa xác định môn', weekday,
    periodStart: periodInfo.periodStart, periodEnd: periodInfo.periodEnd, room,
    note: raw.note || '', sourceLabel: context.label || raw.sourceLabel || '',
  };
}

function headerIndex(headers, aliases) {
  return headers.findIndex((header) => aliases.some((alias) => normalize(header) === normalize(alias) || normalize(header).includes(normalize(alias))));
}

function parseGenericRows(rows, label) {
  let detected = null;
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 25); rowIndex += 1) {
    const indexes = Object.fromEntries(Object.entries(HEADER_KEYS).map(([key, aliases]) => [key, headerIndex(rows[rowIndex], aliases)]));
    const useful = ['teacherName', 'className', 'subject', 'weekday', 'period'].filter((key) => indexes[key] >= 0).length;
    if (indexes.weekday >= 0 && indexes.period >= 0 && useful >= 3) { detected = { rowIndex, indexes }; break; }
  }
  if (!detected) return [];
  const { rowIndex, indexes } = detected;
  const context = contextFromLabel(label);
  return rows.slice(rowIndex + 1).map((row) => buildEntry({
    teacherName: indexes.teacherName >= 0 ? row[indexes.teacherName] : '',
    className: indexes.className >= 0 ? row[indexes.className] : '',
    subject: indexes.subject >= 0 ? row[indexes.subject] : '',
    day: row[indexes.weekday], period: row[indexes.period],
    room: indexes.room >= 0 ? row[indexes.room] : '',
    note: indexes.note >= 0 ? row[indexes.note] : '', rawText: row.join('\n'),
  }, context)).filter(Boolean);
}

function parseHorizontalMatrix(rows, label) {
  const headerRowIndex = rows.findIndex((row) => row.filter((cell) => parseWeekday(cell)).length >= 2);
  if (headerRowIndex < 0) return [];
  const dayColumns = rows[headerRowIndex].map((cell, index) => ({ index, weekday: parseWeekday(cell) })).filter((item) => item.weekday);
  const periodColumn = Math.max(0, Math.min(...dayColumns.map((item) => item.index)) - 1);
  const context = contextFromLabel([label, ...rows.slice(Math.max(0, headerRowIndex - 4), headerRowIndex).flat()].join('\n'));
  const entries = [];
  let lastPeriod = null;
  rows.slice(headerRowIndex + 1).forEach((row) => {
    const candidate = row[periodColumn] || row.find((cell, index) => !dayColumns.some((day) => day.index === index) && parsePeriod(cell).periodStart) || '';
    const parsed = parsePeriod(candidate);
    if (parsed.periodStart) lastPeriod = parsed;
    const period = parsed.periodStart ? parsed : lastPeriod;
    if (!period?.periodStart) return;
    dayColumns.forEach(({ index, weekday }) => {
      const rawText = row[index] || '';
      if (!rawText || /^(x|-|—|trống|nghỉ|off)$/i.test(rawText.trim())) return;
      const entry = buildEntry({ rawText, weekday, ...period }, context);
      if (entry) entries.push(entry);
    });
  });
  return entries;
}

function parseVerticalMatrix(rows, label) {
  let headerRowIndex = -1;
  let periodColumns = [];
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 25); rowIndex += 1) {
    const candidates = rows[rowIndex].map((cell, index) => ({ index, period: parsePeriod(cell).periodStart, text: normalize(cell) }))
      .filter((item) => item.period && item.period <= 20 && (/tiet|period|^\d{1,2}$/.test(item.text)));
    if (candidates.length >= 3) { headerRowIndex = rowIndex; periodColumns = candidates; break; }
  }
  if (headerRowIndex < 0) return [];
  const context = contextFromLabel([label, ...rows.slice(Math.max(0, headerRowIndex - 4), headerRowIndex).flat()].join('\n'));
  const entries = [];
  rows.slice(headerRowIndex + 1).forEach((row) => {
    const weekday = parseWeekday(row.find((cell) => parseWeekday(cell)));
    if (!weekday) return;
    periodColumns.forEach(({ index, period }) => {
      const rawText = row[index] || '';
      if (!rawText || /^(x|-|—|trống|nghỉ|off)$/i.test(rawText.trim())) return;
      const entry = buildEntry({ rawText, weekday, periodStart: period, periodEnd: period }, context);
      if (entry) entries.push(entry);
    });
  });
  return entries;
}

export function parseGridRows(rows, label = '') {
  return [...parseGenericRows(rows, label), ...parseHorizontalMatrix(rows, label), ...parseVerticalMatrix(rows, label)];
}

export function parseHtmlTables(html, sourceLabel = '') {
  const entries = [];
  const tables = [];
  const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let match;
  while ((match = tableRegex.exec(html))) {
    const rows = [];
    for (const rowMatch of match[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => cleanCell(cell[2]));
      if (cells.some(Boolean)) rows.push(cells);
    }
    const prefix = html.slice(Math.max(0, match.index - 2400), match.index);
    const headings = [...prefix.matchAll(/<(h[1-6]|caption|strong|b|label)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
    const label = cleanCell(headings.at(-1)?.[2] || '') || sourceLabel;
    const parsed = parseGridRows(rows, label);
    entries.push(...parsed);
    tables.push({ label: label.slice(0, 160), rows: rows.length, columns: Math.max(0, ...rows.map((row) => row.length)), parsed: parsed.length });
  }
  return { entries, tables };
}

export function parseMarkdownTables(text, label = '') {
  const blocks = [];
  let current = [];
  const flush = () => { if (current.length >= 2) blocks.push(current); current = []; };
  for (const line of String(text).split(/\r?\n/)) /^\s*\|.*\|\s*$/.test(line) ? current.push(line) : flush();
  flush();
  const entries = [];
  const tables = [];
  blocks.forEach((block, index) => {
    const rows = block.filter((line) => !/^\s*\|?\s*:?-{3,}/.test(line)).map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map(cleanCell));
    const parsed = parseGridRows(rows, `${label} · markdown ${index + 1}`);
    entries.push(...parsed);
    tables.push({ label: `${label} · markdown ${index + 1}`, rows: rows.length, columns: Math.max(0, ...rows.map((row) => row.length)), parsed: parsed.length });
  });
  return { entries, tables };
}

function mapObjectRecord(object, label = '') {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
  const keys = Object.fromEntries(Object.keys(object).map((key) => [normalize(key), key]));
  const pick = (aliases) => {
    const found = Object.keys(keys).find((candidate) => aliases.map(normalize).some((alias) => candidate === alias || candidate.includes(alias)));
    return found ? object[keys[found]] : '';
  };
  return buildEntry({
    teacherName: pick(HEADER_KEYS.teacherName), className: pick(HEADER_KEYS.className), subject: pick(HEADER_KEYS.subject),
    day: pick(HEADER_KEYS.weekday), period: pick(HEADER_KEYS.period), room: pick(HEADER_KEYS.room), note: pick(HEADER_KEYS.note),
    rawText: Object.values(object).filter((value) => ['string', 'number'].includes(typeof value)).join('\n'),
  }, contextFromLabel(label));
}

export function parseJsonPayload(payload, label = '') {
  const entries = [];
  const visit = (value, depth = 0) => {
    if (depth > 10 || value == null) return;
    if (Array.isArray(value)) return value.forEach((item) => visit(item, depth + 1));
    if (typeof value !== 'object') return;
    const mapped = mapObjectRecord(value, label);
    if (mapped) entries.push(mapped);
    Object.values(value).forEach((item) => visit(item, depth + 1));
  };
  visit(payload);
  return entries;
}

export function parseEmbeddedJson(text, label = '') {
  const entries = [];
  const candidates = [];
  for (const match of String(text).matchAll(/<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) candidates.push(match[1]);
  for (const match of String(text).matchAll(/(?:window\.|const\s+|let\s+|var\s+)[A-Za-z_$][\w$]*\s*=\s*([\[{][\s\S]{20,}?[\]}])\s*;/g)) candidates.push(match[1]);
  for (const candidate of candidates.slice(0, 20)) try { entries.push(...parseJsonPayload(JSON.parse(candidate), label)); } catch { /* ignore JS */ }
  return entries;
}

export function parseCsv(text, label = '') {
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  const sample = lines.slice(0, 5).join('\n');
  const delimiter = sample.split(';').length > sample.split(',').length ? ';' : ',';
  const rows = lines.map((line) => {
    const cells = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) { cells.push(value.trim()); value = ''; }
      else value += char;
    }
    cells.push(value.trim());
    return cells;
  });
  return parseGridRows(rows, label);
}
