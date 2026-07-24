const SOURCE_URL = 'https://cm.pek.edu.vn/vi/thoikhoabieu/?id=3';
const CACHE_TTL = 30 * 60 * 1000;
const PRIORITY_TEACHERS = [
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
  teacherName: ['giao vien', 'giáo viên', 'gv', 'teacher', 'ten giao vien', 'họ tên'],
  className: ['lop', 'lớp', 'class', 'ten lop'],
  subject: ['mon', 'môn', 'subject', 'mon hoc'],
  weekday: ['thu', 'thứ', 'ngay', 'ngày', 'day'],
  period: ['tiet', 'tiết', 'period', 'ca hoc', 'buoi'],
  room: ['phong', 'phòng', 'room'],
  note: ['ghi chu', 'ghi chú', 'note'],
};

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function cleanCell(html = '') {
  return decodeEntities(
    String(html)
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
  )
    .split('\n')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function teacherCanonical(value = '') {
  const needle = normalize(value);
  return PRIORITY_TEACHERS.find((name) => needle.includes(normalize(name))) || String(value).trim();
}

function findTeacher(value = '') {
  const normalized = normalize(value);
  return PRIORITY_TEACHERS.find((name) => normalized.includes(normalize(name))) || '';
}

function findClass(value = '') {
  const source = String(value).replace(/\s+/g, ' ');
  const patterns = [
    /(?:lớp|lop|class)\s*[:\-]?\s*((?:6|7|8|9|10|11|12)(?:[A-Za-z]\d{0,2}|[./-]\d{1,2}|\d{1,2})?)/i,
    /\b((?:6|7|8|9|10|11|12)[A-Za-z]\d{1,2})\b/,
    /\b((?:6|7|8|9|10|11|12)[./-]\d{1,2})\b/,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1].replace('-', '.').replace('/', '.').toUpperCase();
  }
  return '';
}

function findRoom(value = '') {
  const match = String(value).match(/(?:phòng|phong|room)\s*[:\-]?\s*([A-Za-z0-9._-]+)/i);
  return match ? match[1].toUpperCase() : '';
}

function parseWeekday(value = '') {
  const key = normalize(value).replace(/[,:].*$/, '').trim();
  for (const [alias, day] of DAY_ALIASES.entries()) {
    if (key === normalize(alias) || key.includes(normalize(alias))) return day;
  }
  const date = String(value).match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (date) {
    const year = date[3] ? Number(date[3].length === 2 ? `20${date[3]}` : date[3]) : new Date().getFullYear();
    const jsDay = new Date(year, Number(date[2]) - 1, Number(date[1])).getDay();
    return jsDay === 0 ? 8 : jsDay + 1;
  }
  return null;
}

function parsePeriod(value = '') {
  const text = normalize(value);
  const range = text.match(/(?:tiet|period)?\s*(\d{1,2})\s*(?:-|–|—|den|to)\s*(\d{1,2})/i);
  if (range) return { periodStart: Number(range[1]), periodEnd: Number(range[2]) };
  const single = text.match(/(?:tiet|period)?\s*(\d{1,2})/i);
  if (single) return { periodStart: Number(single[1]), periodEnd: Number(single[1]) };
  return { periodStart: null, periodEnd: null };
}

function inferSubject(value = '', excluded = []) {
  const excludedNormalized = excluded.map(normalize).filter(Boolean);
  const lines = String(value).split(/\n|\s{2,}|\s*[;|]\s*/).map((line) => line.trim()).filter(Boolean);
  const candidate = lines.find((line) => {
    const key = normalize(line);
    if (key.length < 2) return false;
    if (excludedNormalized.some((item) => item && (key === item || key.includes(item)))) return false;
    if (/^(tiet|thu|ngay|phong|lop|gv|giao vien|room|class)\b/.test(key)) return false;
    if (/^\d{1,2}([:.-]\d{1,2})?$/.test(key)) return false;
    return true;
  });
  return candidate || '';
}

function buildEntry(raw, context = {}) {
  const combined = [raw.teacherName, raw.className, raw.subject, raw.room, raw.note, raw.rawText, context.label].filter(Boolean).join('\n');
  const teacherName = teacherCanonical(raw.teacherName || findTeacher(combined) || context.teacherName || '');
  const className = (raw.className || findClass(combined) || context.className || '').trim();
  const weekday = Number(raw.weekday) || parseWeekday(raw.day || raw.weekdayText || context.day || '');
  const periodInfo = raw.periodStart
    ? { periodStart: Number(raw.periodStart), periodEnd: Number(raw.periodEnd || raw.periodStart) }
    : parsePeriod(raw.period || raw.periodText || context.period || '');
  const room = raw.room || findRoom(combined);
  const subject = (raw.subject || inferSubject(raw.rawText || combined, [teacherName, className, room])).trim();
  if (!weekday || !periodInfo.periodStart || (!teacherName && !className)) return null;
  return {
    id: [weekday, periodInfo.periodStart, teacherName, className, subject, room].map(normalize).join('|'),
    teacherName,
    className,
    subject: subject || 'Chưa xác định môn',
    weekday,
    periodStart: periodInfo.periodStart,
    periodEnd: periodInfo.periodEnd,
    room,
    note: raw.note || '',
    sourceLabel: context.label || raw.sourceLabel || '',
  };
}

function parseRows(tableHtml) {
  const rows = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml))) {
    const cells = [];
    const cellRegex = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) cells.push(cleanCell(cellMatch[2]));
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}

function contextBefore(html, index) {
  const prefix = html.slice(Math.max(0, index - 1600), index);
  const headings = [...prefix.matchAll(/<(h[1-6]|caption|strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  return cleanCell(headings.at(-1)?.[2] || '');
}

function headerIndex(headers, aliases) {
  return headers.findIndex((header) => aliases.some((alias) => normalize(header) === normalize(alias) || normalize(header).includes(normalize(alias))));
}

function parseGenericRows(rows, label) {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const indexes = Object.fromEntries(Object.entries(HEADER_KEYS).map(([key, aliases]) => [key, headerIndex(headers, aliases)]));
  const useful = ['teacherName', 'className', 'weekday', 'period'].filter((key) => indexes[key] >= 0).length;
  if (useful < 2 || indexes.weekday < 0 || indexes.period < 0) return [];
  return rows.slice(1).map((row) => buildEntry({
    teacherName: indexes.teacherName >= 0 ? row[indexes.teacherName] : '',
    className: indexes.className >= 0 ? row[indexes.className] : '',
    subject: indexes.subject >= 0 ? row[indexes.subject] : '',
    day: row[indexes.weekday],
    period: row[indexes.period],
    room: indexes.room >= 0 ? row[indexes.room] : '',
    note: indexes.note >= 0 ? row[indexes.note] : '',
    rawText: row.join('\n'),
  }, { label, teacherName: findTeacher(label), className: findClass(label) })).filter(Boolean);
}

function parseMatrixRows(rows, label) {
  const headerRowIndex = rows.findIndex((row) => row.filter((cell) => parseWeekday(cell)).length >= 2);
  if (headerRowIndex < 0) return [];
  const headers = rows[headerRowIndex];
  const dayColumns = headers.map((cell, index) => ({ index, weekday: parseWeekday(cell) })).filter((item) => item.weekday);
  const context = { label, teacherName: findTeacher(label), className: findClass(label) };
  const entries = [];
  rows.slice(headerRowIndex + 1).forEach((row) => {
    const periodCell = row.find((cell, index) => !dayColumns.some((day) => day.index === index) && parsePeriod(cell).periodStart) || row[0] || '';
    const period = parsePeriod(periodCell);
    if (!period.periodStart) return;
    dayColumns.forEach(({ index, weekday }) => {
      const rawText = row[index] || '';
      if (!rawText || /^(x|-|—|trống|nghỉ)$/i.test(rawText.trim())) return;
      const entry = buildEntry({ rawText, weekday, ...period }, context);
      if (entry) entries.push(entry);
    });
  });
  return entries;
}

function parseHtmlTables(html, sourceLabel = '') {
  const entries = [];
  const tables = [];
  const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let match;
  while ((match = tableRegex.exec(html))) {
    const rows = parseRows(match[0]);
    const label = contextBefore(html, match.index) || sourceLabel;
    const generic = parseGenericRows(rows, label);
    const matrix = generic.length ? [] : parseMatrixRows(rows, label);
    entries.push(...generic, ...matrix);
    tables.push({ label, rows: rows.length, columns: Math.max(0, ...rows.map((row) => row.length)), parsed: generic.length + matrix.length });
  }
  return { entries, tables };
}

function mapObjectRecord(object, context = {}) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return null;
  const normalizedKeys = Object.fromEntries(Object.keys(object).map((key) => [normalize(key), key]));
  const pick = (aliases) => {
    const key = aliases.map(normalize).find((alias) => normalizedKeys[alias] || Object.keys(normalizedKeys).find((candidate) => candidate.includes(alias)));
    return key ? object[normalizedKeys[key] || normalizedKeys[Object.keys(normalizedKeys).find((candidate) => candidate.includes(key))]] : '';
  };
  return buildEntry({
    teacherName: pick(HEADER_KEYS.teacherName),
    className: pick(HEADER_KEYS.className),
    subject: pick(HEADER_KEYS.subject),
    day: pick(HEADER_KEYS.weekday),
    period: pick(HEADER_KEYS.period),
    room: pick(HEADER_KEYS.room),
    note: pick(HEADER_KEYS.note),
    rawText: Object.values(object).filter((value) => ['string', 'number'].includes(typeof value)).join('\n'),
  }, context);
}

function parseJsonPayload(payload, label = '') {
  const entries = [];
  const visit = (value, depth = 0) => {
    if (depth > 8 || value == null) return;
    if (Array.isArray(value)) return value.forEach((item) => visit(item, depth + 1));
    if (typeof value !== 'object') return;
    const mapped = mapObjectRecord(value, { label });
    if (mapped) entries.push(mapped);
    Object.values(value).forEach((item) => visit(item, depth + 1));
  };
  visit(payload);
  return entries;
}

function parseCsv(text, label = '') {
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line) => {
    const cells = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(value.trim()); value = ''; }
      else value += char;
    }
    cells.push(value.trim());
    return cells;
  });
  return parseGenericRows(rows, label);
}

function resolveUrl(raw, baseUrl) {
  try {
    const url = new URL(decodeEntities(raw), baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch { return null; }
}

function discoverUrls(html, baseUrl) {
  const candidates = [];
  const attributeRegex = /(?:src|href|data-src|data-url|url)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attributeRegex.exec(html))) candidates.push(resolveUrl(match[1], baseUrl));
  const stringRegex = /["']([^"']*(?:thoikhoabieu|tkb|timetable|ajax|api|\.json|\.csv|\.xls[x]?|docs\.google)[^"']*)["']/gi;
  while ((match = stringRegex.exec(html))) candidates.push(resolveUrl(match[1], baseUrl));
  const baseHost = new URL(baseUrl).hostname;
  return unique(candidates).filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname === baseHost || /(^|\.)google\.com$|(^|\.)googleusercontent\.com$/.test(parsed.hostname);
    } catch { return false; }
  }).slice(0, 12);
}

async function fetchText(url, timeoutMs = 14000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; BrianEnglishTimetable/1.0; +https://esl-pek.vercel.app)',
        accept: 'text/html,application/json,text/csv;q=0.9,*/*;q=0.5',
        'accept-language': 'vi-VN,vi;q=0.9,en;q=0.7',
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, url: response.url || url, contentType: response.headers.get('content-type') || '', text };
  } finally { clearTimeout(timeout); }
}

async function getSourceDocument() {
  const attempts = [SOURCE_URL, `https://r.jina.ai/https://cm.pek.edu.vn/vi/thoikhoabieu/?id=3`];
  const errors = [];
  for (const url of attempts) {
    try {
      const result = await fetchText(url);
      if (result.ok && result.text.length > 100) return { ...result, requestedUrl: url, errors };
      errors.push(`${url}: HTTP ${result.status}`);
    } catch (error) { errors.push(`${url}: ${error.message}`); }
  }
  throw new Error(errors.join(' | ') || 'Không thể tải nguồn PEK.');
}

function parseDocument(document, label) {
  const contentType = normalize(document.contentType);
  if (contentType.includes('json') || /^[\s\n]*[\[{]/.test(document.text)) {
    try { return { entries: parseJsonPayload(JSON.parse(document.text), label), tables: [], kind: 'json' }; }
    catch { /* continue as HTML/text */ }
  }
  if (contentType.includes('csv') || /\.csv(?:\?|$)/i.test(document.url)) return { entries: parseCsv(document.text, label), tables: [], kind: 'csv' };
  const parsed = parseHtmlTables(document.text, label);
  return { ...parsed, kind: 'html' };
}

async function scrapeTimetable() {
  const primary = await getSourceDocument();
  const documents = [{ ...primary, label: 'Trang thời khóa biểu PEK' }];
  const candidates = discoverUrls(primary.text, primary.url || SOURCE_URL);
  for (const url of candidates) {
    if (documents.some((item) => item.url === url)) continue;
    try {
      const result = await fetchText(url, 10000);
      if (result.ok && result.text.length > 20) documents.push({ ...result, label: new URL(url).pathname.split('/').filter(Boolean).at(-1) || url });
    } catch { /* diagnostics below are sufficient */ }
  }

  const allEntries = [];
  const diagnostics = [];
  documents.forEach((document) => {
    const parsed = parseDocument(document, document.label);
    allEntries.push(...parsed.entries);
    diagnostics.push({ url: document.url, kind: parsed.kind, bytes: document.text.length, tables: parsed.tables, parsedEntries: parsed.entries.length });
  });

  const deduped = [...new Map(allEntries.map((entry) => [entry.id, entry])).values()];
  const teachers = PRIORITY_TEACHERS.map((name) => ({
    name,
    lessonCount: deduped.filter((entry) => normalize(entry.teacherName) === normalize(name)).length,
  }));
  const classes = unique(deduped.map((entry) => entry.className)).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  return {
    ok: deduped.length > 0,
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    parserVersion: 'pek-timetable-v1',
    teachers,
    classes,
    entries: deduped,
    diagnostics,
    discoveredUrls: candidates,
    warning: deduped.length ? '' : 'Đã kết nối được website PEK nhưng chưa nhận diện được dữ liệu thời khóa biểu. Hãy mở chế độ chẩn đoán để kiểm tra cấu trúc nguồn.',
    sourceErrors: primary.errors || [],
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const refresh = String(req.query?.refresh || '') === '1';
  const debug = String(req.query?.debug || '') === '1';
  const cache = globalThis.__pekTimetableCache;
  if (!refresh && cache?.data && Date.now() - cache.time < CACHE_TTL) {
    const payload = { ...cache.data, cached: true };
    if (!debug) delete payload.diagnostics;
    return res.status(200).json(payload);
  }

  try {
    const data = await scrapeTimetable();
    globalThis.__pekTimetableCache = { time: Date.now(), data };
    const payload = { ...data, cached: false };
    if (!debug) delete payload.diagnostics;
    return res.status(data.ok ? 200 : 206).json(payload);
  } catch (error) {
    if (cache?.data) return res.status(200).json({ ...cache.data, cached: true, stale: true, warning: `Không thể làm mới dữ liệu: ${error.message}` });
    return res.status(502).json({ ok: false, sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString(), teachers: PRIORITY_TEACHERS.map((name) => ({ name, lessonCount: 0 })), classes: [], entries: [], message: error.message });
  }
}
