const HEADER_ALIASES = Object.freeze({
  date: ['ngay', 'ngày', 'date', 'thoi diem', 'thời điểm', 'thu', 'thứ'],
  startTime: ['gio bat dau', 'giờ bắt đầu', 'bat dau', 'bắt đầu', 'start', 'start time', 'tu', 'từ'],
  endTime: ['gio ket thuc', 'giờ kết thúc', 'ket thuc', 'kết thúc', 'end', 'end time', 'den', 'đến'],
  time: ['gio', 'giờ', 'thoi gian', 'thời gian', 'time', 'khung gio', 'khung giờ'],
  title: ['noi dung', 'nội dung', 'cong viec', 'công việc', 'hoat dong', 'hoạt động', 'nhiem vu', 'nhiệm vụ', 'title', 'event', 'task'],
  owner: ['nguoi phu trach', 'người phụ trách', 'phu trach', 'phụ trách', 'thanh phan', 'thành phần', 'nguoi thuc hien', 'người thực hiện', 'owner', 'assignee', 'participants'],
  location: ['dia diem', 'địa điểm', 'phong', 'phòng', 'link hop', 'link họp', 'location', 'room', 'place', 'link'],
  type: ['loai', 'loại', 'nhom viec', 'nhóm việc', 'category', 'type'],
  status: ['trang thai', 'trạng thái', 'status', 'tien do', 'tiến độ'],
  note: ['ghi chu', 'ghi chú', 'chuan bi', 'chuẩn bị', 'minh chung', 'minh chứng', 'san pham', 'sản phẩm', 'yeu cau', 'yêu cầu', 'note', 'description'],
});

const WEEKDAYS = [
  { index: 0, patterns: [/\bthu\s*(?:2|hai)\b/i, /\bt2\b/i, /\bmonday\b/i] },
  { index: 1, patterns: [/\bthu\s*(?:3|ba)\b/i, /\bt3\b/i, /\btuesday\b/i] },
  { index: 2, patterns: [/\bthu\s*(?:4|tu)\b/i, /\bt4\b/i, /\bwednesday\b/i] },
  { index: 3, patterns: [/\bthu\s*(?:5|nam)\b/i, /\bt5\b/i, /\bthursday\b/i] },
  { index: 4, patterns: [/\bthu\s*(?:6|sau)\b/i, /\bt6\b/i, /\bfriday\b/i] },
  { index: 5, patterns: [/\bthu\s*(?:7|bay)\b/i, /\bt7\b/i, /\bsaturday\b/i] },
  { index: 6, patterns: [/\bchu\s*nhat\b/i, /\bcn\b/i, /\bsunday\b/i] },
];

const NON_EVENT_HEADINGS = [
  'ke hoach', 'kế hoạch', 'lich lam viec', 'lịch làm việc', 'noi dung', 'nội dung',
  'thoi gian', 'thời gian', 'nguoi phu trach', 'người phụ trách', 'ghi chu', 'ghi chú',
  'tuan', 'tuần', 'thang', 'tháng', 'nam hoc', 'năm học',
];

function stripMarks(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function keyText(value) {
  return stripMarks(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const date = new Date(`${text}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '' : text;
}

function formatIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  const date = new Date(y, m - 1, d, 12, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return '';
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addIsoDays(iso, amount) {
  const base = new Date(`${parseIsoDate(iso) || isoToday()}T12:00:00`);
  base.setDate(base.getDate() + Number(amount || 0));
  return base.toISOString().slice(0, 10);
}

function yearForPartialDate(month, day, targetWeekStart) {
  const target = new Date(`${parseIsoDate(targetWeekStart) || isoToday()}T12:00:00`);
  const candidates = [target.getFullYear() - 1, target.getFullYear(), target.getFullYear() + 1]
    .map((year) => ({ year, time: new Date(year, month - 1, day, 12).getTime() }))
    .filter((entry) => Number.isFinite(entry.time));
  candidates.sort((a, b) => Math.abs(a.time - target.getTime()) - Math.abs(b.time - target.getTime()));
  return candidates[0]?.year || target.getFullYear();
}

function excelSerialToIso(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return '';
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000).toISOString().slice(0, 10);
}

export function parseOfflineScheduleDate(value, targetWeekStart = isoToday()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return excelSerialToIso(value);

  const raw = cleanText(value);
  if (!raw) return '';
  const directIso = parseIsoDate(raw);
  if (directIso) return directIso;

  let match = raw.match(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/);
  if (match) return formatIsoDate(match[1], match[2], match[3]);

  match = raw.match(/(?:\bng[aà]y\s*)?(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/i);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = match[3] ? Number(match[3]) : yearForPartialDate(month, day, targetWeekStart);
    if (year < 100) year += 2000;
    const iso = formatIsoDate(year, month, day);
    if (iso) return iso;
  }

  match = stripMarks(raw).match(/(?:\bngay\s*)?(\d{1,2})\s*thang\s*(\d{1,2})(?:\s*nam\s*(\d{2,4}))?/i);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = match[3] ? Number(match[3]) : yearForPartialDate(month, day, targetWeekStart);
    if (year < 100) year += 2000;
    const iso = formatIsoDate(year, month, day);
    if (iso) return iso;
  }

  const normalized = keyText(raw);
  for (const weekday of WEEKDAYS) {
    if (weekday.patterns.some((pattern) => pattern.test(normalized))) return addIsoDays(targetWeekStart, weekday.index);
  }
  return '';
}

export function parseOfflineScheduleTimes(value) {
  const raw = cleanText(value);
  if (!raw) return { startTime: '', endTime: '' };
  const normalized = raw.replace(/giờ/gi, 'h').replace(/[–—]/g, '-');
  const matches = [...normalized.matchAll(/\b([01]?\d|2[0-3])(?:\s*(?::|h|\.)\s*([0-5]?\d))?\b/gi)]
    .map((match) => ({
      value: `${String(Number(match[1])).padStart(2, '0')}:${String(Number(match[2] || 0)).padStart(2, '0')}`,
      index: match.index || 0,
    }));
  if (!matches.length) return { startTime: '', endTime: '' };
  const hasTimeSignal = /:|h|giờ|\b(?:sa|chieu|toi|sang|pm|am)\b/i.test(stripMarks(raw));
  if (!hasTimeSignal && matches.length === 1) return { startTime: '', endTime: '' };
  return { startTime: matches[0]?.value || '', endTime: matches[1]?.value || '' };
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = '';
  let quote = '';
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      if (quote === char && line[index + 1] === char) {
        current += char;
        index += 1;
      } else {
        quote = quote ? '' : char;
      }
      continue;
    }
    if (!quote && char === delimiter) {
      cells.push(cleanText(current));
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(cleanText(current));
  return cells;
}

function detectDelimiter(lines) {
  const candidates = ['\t', '|', ';', ','];
  let best = null;
  for (const delimiter of candidates) {
    const counts = lines.slice(0, 12).map((line) => splitDelimitedLine(line, delimiter).length).filter((count) => count > 1);
    if (!counts.length) continue;
    const common = counts.sort((a, b) => counts.filter((value) => value === b).length - counts.filter((value) => value === a).length)[0];
    const score = counts.filter((count) => count === common).length * common;
    if (!best || score > best.score) best = { delimiter, score, columns: common };
  }
  return best?.delimiter || '';
}

function headerField(value) {
  const normalized = keyText(value);
  if (!normalized) return '';
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => {
      const normalizedAlias = keyText(alias);
      return normalized === normalizedAlias || normalized.includes(normalizedAlias);
    })) return field;
  }
  return '';
}

function mapHeaders(row) {
  const mapping = {};
  row.forEach((cell, index) => {
    const field = headerField(cell);
    if (field && mapping[field] === undefined) mapping[field] = index;
  });
  return mapping;
}

function looksLikeHeader(row) {
  const mapping = mapHeaders(row);
  return Object.keys(mapping).length >= 2 && (mapping.title !== undefined || mapping.date !== undefined || mapping.time !== undefined);
}

function cellAt(row, mapping, field) {
  const index = mapping[field];
  return index === undefined ? '' : row[index];
}

function labeledValue(text, labels) {
  const escaped = labels.map((label) => stripMarks(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const normalized = stripMarks(text);
  const regex = new RegExp(`(?:^|[|;,.\\-]\\s*)(?:${escaped})\\s*[:\\-]\\s*([^|;]+)`, 'i');
  return cleanText(normalized.match(regex)?.[1] || '');
}

function removeKnownTokens(text) {
  return cleanText(String(text || '')
    .replace(/\b20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}\b/g, ' ')
    .replace(/(?:\bng[aà]y\s*)?\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?/gi, ' ')
    .replace(/\b(?:thứ|thu)\s*(?:2|3|4|5|6|7|hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay)\b/gi, ' ')
    .replace(/\bchủ\s*nhật\b|\bchu\s*nhat\b/gi, ' ')
    .replace(/\b([01]?\d|2[0-3])\s*(?::|h|\.)\s*([0-5]?\d)?(?:\s*[-–—]\s*([01]?\d|2[0-3])\s*(?::|h|\.)\s*([0-5]?\d)?)?/gi, ' ')
    .replace(/\b(?:người phụ trách|nguoi phu trach|phụ trách|phu trach|thành phần|thanh phan|địa điểm|dia diem|phòng|phong|ghi chú|ghi chu|chuẩn bị|chuan bi)\s*[:\-][^|;]+/gi, ' ')
    .replace(/[|;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—,:.\s]+|[-–—,:.\s]+$/g, ' '));
}

function isNonEventHeading(value) {
  const normalized = keyText(value);
  return !normalized || NON_EVENT_HEADINGS.includes(normalized) || /^tuan\s+\d+/.test(normalized) || /^thang\s+\d+/.test(normalized);
}

function inferType(text) {
  const raw = keyText(text);
  if (/hop|sinh hoat to|meeting/.test(raw)) return 'Họp tổ';
  if (/du gio|thao giang|observation/.test(raw)) return 'Dự giờ';
  if (/chuyen de|workshop|seminar/.test(raw)) return 'Chuyên đề';
  if (/han nop|nop ho so|deadline|submission/.test(raw)) return 'Hạn nộp hồ sơ';
  if (/kiem tra|danh gia|ma tran|de thi|assessment|test/.test(raw)) return 'Kiểm tra đánh giá';
  if (/boi duong|tap huan|training/.test(raw)) return 'Bồi dưỡng GV';
  if (/hoc sinh|hsg|clb|ngoai khoa|student/.test(raw)) return 'Hoạt động học sinh';
  return 'Lịch làm việc';
}

function normalizeStatus(value) {
  const raw = keyText(value);
  if (/hoan thanh|done|completed/.test(raw)) return 'Hoàn thành';
  if (/dang lam|dang thuc hien|progress/.test(raw)) return 'Đang làm';
  if (/cho duyet|pending/.test(raw)) return 'Chờ duyệt';
  if (/de xuat|proposal/.test(raw)) return 'Đề xuất';
  return 'Chưa làm';
}

function parseStructuredRow(row, mapping, targetWeekStart) {
  const dateValue = cellAt(row, mapping, 'date');
  const combinedTime = cellAt(row, mapping, 'time');
  const explicitStart = cellAt(row, mapping, 'startTime');
  const explicitEnd = cellAt(row, mapping, 'endTime');
  const parsedTime = parseOfflineScheduleTimes(combinedTime || `${explicitStart || ''} ${explicitEnd || ''}`);
  const date = parseOfflineScheduleDate(dateValue, targetWeekStart);
  const title = cleanText(cellAt(row, mapping, 'title'));
  const rawLine = row.map(cleanText).filter(Boolean).join(' | ');
  if (!title || isNonEventHeading(title)) return null;
  const missingDate = !date;
  return {
    title,
    owner: cleanText(cellAt(row, mapping, 'owner')) || 'TTCM',
    date: date || targetWeekStart,
    startTime: parseOfflineScheduleTimes(explicitStart).startTime || parsedTime.startTime,
    endTime: parseOfflineScheduleTimes(explicitEnd).startTime || parsedTime.endTime,
    location: cleanText(cellAt(row, mapping, 'location')),
    type: cleanText(cellAt(row, mapping, 'type')) || inferType(`${title} ${rawLine}`),
    status: normalizeStatus(cellAt(row, mapping, 'status')),
    note: cleanText(cellAt(row, mapping, 'note')),
    confidence: missingDate ? 0.55 : 0.92,
    selected: !missingDate,
    missingDate,
  };
}

function parseFreeformLine(line, targetWeekStart) {
  const raw = cleanText(line);
  if (raw.length < 5 || isNonEventHeading(raw)) return null;

  const date = parseOfflineScheduleDate(raw, targetWeekStart);
  const times = parseOfflineScheduleTimes(raw);
  const owner = labeledValue(raw, ['người phụ trách', 'nguoi phu trach', 'phụ trách', 'phu trach', 'thành phần', 'thanh phan', 'owner']);
  const location = labeledValue(raw, ['địa điểm', 'dia diem', 'phòng', 'phong', 'location', 'link']);
  const note = labeledValue(raw, ['ghi chú', 'ghi chu', 'chuẩn bị', 'chuan bi', 'minh chứng', 'minh chung', 'note']);

  const delimiter = detectDelimiter([raw]);
  const segments = delimiter ? splitDelimitedLine(raw, delimiter).filter(Boolean) : raw.split(/\s{2,}/).map(cleanText).filter(Boolean);
  const titleCandidates = segments.filter((segment) => {
    if (parseOfflineScheduleDate(segment, targetWeekStart)) return false;
    const segmentTimes = parseOfflineScheduleTimes(segment);
    if (segmentTimes.startTime && keyText(segment).split(' ').length <= 4) return false;
    if (owner && keyText(segment).includes(keyText(owner))) return false;
    if (location && keyText(segment).includes(keyText(location))) return false;
    return !isNonEventHeading(segment);
  });
  let title = titleCandidates.sort((a, b) => b.length - a.length)[0] || removeKnownTokens(raw);
  title = removeKnownTokens(title);

  const actionSignal = /họp|hop|nộp|nop|dự giờ|du gio|chuyên đề|chuyen de|tập huấn|tap huan|kiểm tra|kiem tra|rà soát|ra soat|chuẩn bị|chuan bi|hoàn thành|hoan thanh|phân công|phan cong|thực hiện|thuc hien|tổ chức|to chuc|tham gia|deadline|meeting|workshop|training|submit/i.test(raw);
  if (!title || isNonEventHeading(title) || (!date && !times.startTime && !actionSignal)) return null;

  const missingDate = !date;
  const fieldCount = [date, times.startTime, owner, location, note].filter(Boolean).length;
  const confidence = Math.max(0.45, Math.min(0.95, 0.52 + fieldCount * 0.08 + (actionSignal ? 0.08 : 0)));
  return {
    title,
    owner: owner || 'TTCM',
    date: date || targetWeekStart,
    startTime: times.startTime,
    endTime: times.endTime,
    location,
    type: inferType(raw),
    status: 'Chưa làm',
    note,
    confidence: missingDate ? Math.min(confidence, 0.58) : confidence,
    selected: !missingDate,
    missingDate,
  };
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter((item) => {
    const fingerprint = [item.title, item.date, item.startTime, item.owner]
      .map(keyText)
      .join('|');
    if (!fingerprint || seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

function rowsToSourceText(rows) {
  return rows
    .map((row) => row.map((cell) => cleanText(cell instanceof Date ? cell.toISOString().slice(0, 10) : cell)).join(' | '))
    .join('\n');
}

export function parseOfflineScheduleRows(rows, { weekStart = isoToday(), fileName = '' } = {}) {
  const safeRows = Array.isArray(rows) ? rows.filter((row) => Array.isArray(row) && row.some((cell) => cleanText(cell))) : [];
  if (!safeRows.length) return { items: [], weekStart, summary: '', warnings: ['Tệp không có dòng dữ liệu có thể đọc.'], sourceText: '' };

  const hasHeader = looksLikeHeader(safeRows[0]);
  const mapping = hasHeader ? mapHeaders(safeRows[0]) : {};
  const contentRows = hasHeader ? safeRows.slice(1) : safeRows;
  let items = [];
  if (hasHeader) {
    items = contentRows.map((row) => parseStructuredRow(row, mapping, weekStart)).filter(Boolean);
  } else {
    items = contentRows.map((row) => parseFreeformLine(row.map(cleanText).filter(Boolean).join(' | '), weekStart)).filter(Boolean);
  }
  items = deduplicate(items);
  const missingDateCount = items.filter((item) => item.missingDate).length;
  const warnings = [];
  if (missingDateCount) warnings.push(`${missingDateCount} mục chưa có ngày rõ ràng, đã tạm đặt vào đầu tuần và bỏ chọn để bạn rà soát.`);
  if (!hasHeader) warnings.push('Tệp không có hàng tiêu đề chuẩn; hệ thống đã nhận diện theo nội dung từng dòng.');
  if (!items.length) warnings.push('Không tìm thấy dòng lịch có thể hành động. Hãy dùng các cột: Ngày, Giờ, Nội dung, Người phụ trách, Địa điểm, Ghi chú.');
  return {
    items,
    weekStart,
    summary: `${fileName ? `${fileName}: ` : ''}đã đọc ${contentRows.length} dòng và nhận diện ${items.length} mục lịch bằng bộ quy tắc ngoại tuyến.`,
    warnings,
    sourceText: rowsToSourceText(safeRows),
  };
}

export function parseOfflineScheduleText(text, { weekStart = isoToday(), fileName = '' } = {}) {
  const clean = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return { items: [], weekStart, summary: '', warnings: ['Tệp không có văn bản có thể đọc.'], sourceText: '' };
  const lines = clean.split('\n').map((line) => cleanText(line)).filter(Boolean);
  const delimiter = detectDelimiter(lines);
  if (delimiter) {
    const rows = lines.map((line) => splitDelimitedLine(line, delimiter));
    return parseOfflineScheduleRows(rows, { weekStart, fileName });
  }
  const items = deduplicate(lines.map((line) => parseFreeformLine(line, weekStart)).filter(Boolean));
  const missingDateCount = items.filter((item) => item.missingDate).length;
  const warnings = [];
  if (missingDateCount) warnings.push(`${missingDateCount} mục chưa có ngày rõ ràng, đã tạm đặt vào đầu tuần và bỏ chọn để bạn rà soát.`);
  if (!items.length) warnings.push('Không tìm thấy dòng lịch có thể hành động. Mỗi công việc nên nằm trên một dòng và có ngày hoặc thứ trong tuần.');
  return {
    items,
    weekStart,
    summary: `${fileName ? `${fileName}: ` : ''}đã đọc ${lines.length} dòng và nhận diện ${items.length} mục lịch bằng bộ quy tắc ngoại tuyến.`,
    warnings,
    sourceText: clean,
  };
}

export async function parseOfflineScheduleFile(file, { weekStart = isoToday(), readText } = {}) {
  const name = String(file?.name || '').toLowerCase();
  if (!file) throw new Error('Chưa chọn tệp lịch làm việc.');
  if (name.endsWith('.xlsx')) {
    const module = await import('read-excel-file/browser');
    const readXlsxFile = module.default || module;
    const rows = await readXlsxFile(file);
    return parseOfflineScheduleRows(rows, { weekStart, fileName: file.name });
  }
  if (name.endsWith('.xls')) throw new Error('Định dạng XLS cũ chưa được hỗ trợ. Hãy lưu lại thành XLSX hoặc CSV.');
  if (typeof readText !== 'function') throw new Error('Thiếu bộ đọc nội dung tệp.');
  const text = await readText(file);
  return parseOfflineScheduleText(text, { weekStart, fileName: file.name });
}

export function makeOfflineScheduleCsvTemplate() {
  return '\ufeffNgày,Giờ bắt đầu,Giờ kết thúc,Nội dung,Người phụ trách,Địa điểm,Loại,Ghi chú\n22/07/2026,08:00,09:30,Họp tổ rà soát kế hoạch,Nguyễn Anh Tuấn,Phòng Hội đồng,Họp tổ,Chuẩn bị báo cáo tiến độ\n';
}
