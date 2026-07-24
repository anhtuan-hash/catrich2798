const SOURCE_URL = 'https://cm.pek.edu.vn/vi/thoikhoabieu/?id=3';
const SOURCE_ORIGIN = 'https://cm.pek.edu.vn';
const TARGET_TEACHERS = [
  'Nguyễn Anh Tuấn',
  'Nguyễn Đặng Minh Hoa',
  'Phạm Thị Ngọc Châm',
  'Ngô Thị Mỹ Diệp',
  'Đào Ngọc Nhã',
  'Nguyễn Thị Mỹ Duyên',
];

let memoryCache = null;
const CACHE_MS = 30 * 60 * 1000;

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanText(value = '') {
  return decodeEntities(String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\r]+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function key(value = '') {
  return cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}

function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' });
}

function normalizeTeacher(value = '') {
  const sourceKey = key(value);
  return TARGET_TEACHERS.find((name) => {
    const targetKey = key(name);
    return sourceKey === targetKey || sourceKey.includes(targetKey) || targetKey.includes(sourceKey);
  }) || cleanText(value);
}

function normalizeDay(value) {
  const raw = key(value);
  const number = Number(String(value).match(/\d+/)?.[0]);
  if (/thu 2|thứ 2|monday|^t2$/.test(raw) || number === 2) return 2;
  if (/thu 3|thứ 3|tuesday|^t3$/.test(raw) || number === 3) return 3;
  if (/thu 4|thứ 4|wednesday|^t4$/.test(raw) || number === 4) return 4;
  if (/thu 5|thứ 5|thursday|^t5$/.test(raw) || number === 5) return 5;
  if (/thu 6|thứ 6|friday|^t6$/.test(raw) || number === 6) return 6;
  if (/thu 7|thứ 7|saturday|^t7$/.test(raw) || number === 7) return 7;
  if (/chu nhat|chủ nhật|sunday|^cn$/.test(raw) || number === 8) return 8;
  return null;
}

function parsePeriod(value) {
  const matches = String(value || '').match(/\d+/g)?.map(Number).filter(Number.isFinite) || [];
  if (!matches.length) return { start: null, end: null };
  return { start: matches[0], end: matches[1] || matches[0] };
}

function looksLikeClass(value = '') {
  const text = cleanText(value);
  return /^(?:[6-9]|1[0-2])(?:[.\/-]?[A-Z0-9]{1,4})$/i.test(text) || /^(?:[6-9]|1[0-2])\s*[A-Z]\d{0,2}$/i.test(text);
}

function extractTables(html) {
  const tables = [];
  for (const tableMatch of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = [];
    for (const rowMatch of tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [];
      for (const cellMatch of rowMatch[1].matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
        cells.push({ text: cleanText(cellMatch[3]), attrs: cellMatch[2] || '', header: cellMatch[1].toLowerCase() === 'th' });
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

const FIELD_ALIASES = {
  teacher: ['giao vien', 'giáo viên', 'gv', 'teacher', 'ho ten', 'họ tên'],
  className: ['lop', 'lớp', 'class'],
  subject: ['mon', 'môn', 'subject'],
  day: ['thu', 'thứ', 'ngay', 'ngày', 'day'],
  period: ['tiet', 'tiết', 'period', 'ca'],
  room: ['phong', 'phòng', 'room'],
};

function detectHeader(row) {
  const result = {};
  row.forEach((cell, index) => {
    const cellKey = key(cell.text);
    Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
      if (aliases.some((alias) => cellKey === key(alias) || cellKey.includes(key(alias)))) result[field] = index;
    });
  });
  return result;
}

function buildEntry(raw, method) {
  const teacher = normalizeTeacher(raw.teacher || '');
  const className = cleanText(raw.className || raw.class || '');
  const subject = cleanText(raw.subject || raw.mon || '');
  const weekday = normalizeDay(raw.day || raw.weekday || raw.thu || '');
  const period = parsePeriod(raw.period || raw.tiet || raw.lesson || '');
  const room = cleanText(raw.room || raw.phong || '');
  if (!weekday || !period.start || (!teacher && !className)) return null;
  const fingerprint = [key(teacher), key(className), key(subject), weekday, period.start, period.end, key(room)].join('|');
  return {
    id: fingerprint,
    teacher,
    className,
    subject,
    weekday,
    periodStart: period.start,
    periodEnd: period.end,
    room,
    method,
  };
}

function parseFlatTables(tables) {
  const entries = [];
  tables.forEach((rows, tableIndex) => {
    let header = null;
    let headerIndex = -1;
    rows.slice(0, 5).some((row, index) => {
      const candidate = detectHeader(row);
      if (Object.keys(candidate).length >= 3 && (candidate.day !== undefined || candidate.period !== undefined)) {
        header = candidate; headerIndex = index; return true;
      }
      return false;
    });
    if (!header) return;
    rows.slice(headerIndex + 1).forEach((row) => {
      const get = (field) => header[field] === undefined ? '' : row[header[field]]?.text || '';
      const entry = buildEntry({ teacher: get('teacher'), className: get('className'), subject: get('subject'), day: get('day'), period: get('period'), room: get('room') }, `html-table-${tableIndex + 1}`);
      if (entry) entries.push(entry);
    });
  });
  return entries;
}

function parseMatrixTables(tables) {
  const entries = [];
  tables.forEach((rows, tableIndex) => {
    if (rows.length < 2) return;
    const weekdayColumns = [];
    rows[0].forEach((cell, index) => { const day = normalizeDay(cell.text); if (day) weekdayColumns.push({ index, day }); });
    if (weekdayColumns.length < 3) return;
    rows.slice(1).forEach((row) => {
      const period = parsePeriod(row[0]?.text || '');
      if (!period.start) return;
      weekdayColumns.forEach(({ index, day }) => {
        const text = row[index]?.text || '';
        if (!text || /trong|nghi|nghỉ/i.test(text)) return;
        const lines = text.split(/\n|\s{2,}|\|/).map(cleanText).filter(Boolean);
        const teacher = TARGET_TEACHERS.find((name) => key(text).includes(key(name))) || '';
        const className = lines.find(looksLikeClass) || (text.match(/(?:^|\s)((?:[6-9]|1[0-2])[.\/-]?[A-Z0-9]{1,4})(?:\s|$)/i)?.[1] || '');
        const subject = lines.find((line) => line !== teacher && line !== className && !/phòng|phong|tiết|tiet/i.test(line)) || '';
        const room = text.match(/(?:phòng|phong|p\.)\s*[:.-]?\s*([A-Z0-9.-]+)/i)?.[1] || '';
        const entry = buildEntry({ teacher, className, subject, day, period: period.start, room }, `matrix-table-${tableIndex + 1}`);
        if (entry) entries.push(entry);
      });
    });
  });
  return entries;
}

function findCandidateUrls(html, baseUrl) {
  const found = new Set();
  for (const match of html.matchAll(/(?:src|href|action)=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.origin !== SOURCE_ORIGIN) continue;
      if (/thoikhoabieu|timetable|schedule|ajax|api/i.test(url.href)) found.add(url.href);
    } catch {}
  }
  for (const match of html.matchAll(/["']([^"']*(?:thoikhoabieu|timetable|schedule|ajax)[^"']*)["']/gi)) {
    try { const url = new URL(match[1], baseUrl); if (url.origin === SOURCE_ORIGIN) found.add(url.href); } catch {}
  }
  found.delete(baseUrl);
  return [...found].slice(0, 8);
}

function walkJson(value, output, path = 'json') {
  if (Array.isArray(value)) return value.forEach((item, index) => walkJson(item, output, `${path}.${index}`));
  if (!value || typeof value !== 'object') return;
  const normalized = {};
  Object.entries(value).forEach(([name, val]) => { normalized[key(name).replace(/ /g, '')] = val; });
  const pick = (...names) => names.map((name) => normalized[key(name).replace(/ /g, '')]).find((item) => item !== undefined && item !== null);
  const entry = buildEntry({
    teacher: pick('teacher', 'giaovien', 'tengiaovien', 'hoten', 'gv'),
    className: pick('class', 'classname', 'lop', 'tenlop'),
    subject: pick('subject', 'mon', 'tenmon'),
    day: pick('day', 'weekday', 'thu', 'ngay'),
    period: pick('period', 'tiet', 'sotiet', 'lesson'),
    room: pick('room', 'phong', 'phonghoc'),
  }, path);
  if (entry) output.push(entry);
  Object.values(value).forEach((item) => { if (item && typeof item === 'object') walkJson(item, output, path); });
}

async function fetchSource(url, diagnostics) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; BrianEnglishTimetable/1.0)',
        accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'vi-VN,vi;q=0.9,en;q=0.7',
        referer: SOURCE_URL,
      },
    });
    const text = await response.text();
    diagnostics.attempts.push({ url, status: response.status, type: response.headers.get('content-type') || '', bytes: text.length });
    if (!response.ok) throw new Error(`PEK trả về HTTP ${response.status}`);
    return { text, type: response.headers.get('content-type') || '', finalUrl: response.url || url };
  } finally { clearTimeout(timeout); }
}

async function collectTimetable() {
  const diagnostics = { attempts: [], tables: 0, candidates: [] };
  const sources = [];
  const first = await fetchSource(SOURCE_URL, diagnostics);
  sources.push(first);
  const candidates = findCandidateUrls(first.text, first.finalUrl);
  diagnostics.candidates = candidates;
  const fetched = await Promise.allSettled(candidates.map((url) => fetchSource(url, diagnostics)));
  fetched.forEach((result) => { if (result.status === 'fulfilled') sources.push(result.value); });

  const entries = [];
  sources.forEach((source, index) => {
    const trimmed = source.text.trim();
    if (/json/i.test(source.type) || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { walkJson(JSON.parse(trimmed), entries, `json-source-${index + 1}`); } catch {}
    }
    const tables = extractTables(source.text);
    diagnostics.tables += tables.length;
    entries.push(...parseFlatTables(tables), ...parseMatrixTables(tables));
    for (const match of source.text.matchAll(/(?:var|let|const)\s+\w+\s*=\s*([\[{][\s\S]{20,}?)[;\n]<\/script>|application\/json[^>]*>([\s\S]*?)<\/script>/gi)) {
      const candidate = match[1] || match[2];
      try { walkJson(JSON.parse(candidate), entries, `embedded-json-${index + 1}`); } catch {}
    }
  });

  const deduped = [...new Map(entries.map((entry) => [entry.id, entry])).values()]
    .filter((entry) => entry.weekday && entry.periodStart)
    .sort((a, b) => a.weekday - b.weekday || a.periodStart - b.periodStart || naturalCompare(a.teacher, b.teacher));
  const classes = [...new Set(deduped.map((entry) => entry.className).filter(Boolean))].sort(naturalCompare);
  const teachers = TARGET_TEACHERS.map((name) => ({ name, entryCount: deduped.filter((entry) => key(entry.teacher) === key(name)).length }));
  return {
    ok: deduped.length > 0,
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    targetTeachers: TARGET_TEACHERS,
    teachers,
    classes,
    entries: deduped,
    diagnostics,
    message: deduped.length ? 'Đã đồng bộ thời khóa biểu PEK.' : 'Đã kết nối PEK nhưng chưa nhận diện được cấu trúc thời khóa biểu. Xem diagnostics để cập nhật bộ phân tích.',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=21600');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });
  const force = String(req.query?.force || '') === '1';
  if (!force && memoryCache && Date.now() - memoryCache.savedAt < CACHE_MS) return res.status(200).json({ ...memoryCache.data, cache: 'memory' });
  try {
    const data = await collectTimetable();
    memoryCache = { savedAt: Date.now(), data };
    return res.status(200).json({ ...data, cache: 'fresh' });
  } catch (error) {
    if (memoryCache?.data) return res.status(200).json({ ...memoryCache.data, cache: 'stale', warning: error?.message || String(error) });
    return res.status(200).json({ ok: false, sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString(), targetTeachers: TARGET_TEACHERS, teachers: TARGET_TEACHERS.map((name) => ({ name, entryCount: 0 })), classes: [], entries: [], diagnostics: { attempts: [], tables: 0, candidates: [] }, message: error?.message || 'Không thể kết nối nguồn PEK.' });
  }
}
