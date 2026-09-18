
const FIELD_DEFS = Object.freeze([
  ['fullName', ['họ và tên', 'ho va ten', 'họ tên học sinh', 'tên học sinh']],
  ['gender', ['giới tính', 'gioi tinh']],
  ['birthDate', ['ngày sinh', 'ngay sinh', 'ngày tháng năm sinh', 'sinh ngày']],
  ['birthPlace', ['nơi sinh', 'noi sinh']],
  ['hometown', ['quê quán', 'que quan']],
  ['birthRegistrationPlace', ['nơi khai sinh', 'noi khai sinh', 'đăng ký khai sinh']],
  ['currentAddress', ['chỗ ở hiện nay', 'chỗ ở hn', 'cho o hn', 'địa chỉ hiện nay']],
  ['permanentAddress', ['nơi thường trú', 'noi thuong tru', 'thường trú']],
  ['citizenId', ['số căn cước', 'so can cuoc', 'cccd', 'định danh cá nhân', 'số định danh']],
  ['phone', ['điện thoại hs', 'dien thoai hs', 'đ.thoại hs', 'sđt học sinh', 'đ.thoại sll', 'điện thoại sll']],
  ['fatherName', ['tên cha', 'ten cha', 'họ tên cha', 'ho ten cha']],
  ['fatherPhone', ['đ.thoại cha', 'điện thoại cha', 'dien thoai cha', 'sđt cha']],
  ['motherName', ['tên mẹ', 'ten me', 'họ tên mẹ', 'ho ten me']],
  ['motherPhone', ['đ.thoại mẹ', 'điện thoại mẹ', 'dien thoai me', 'sđt mẹ']],
]);

const STOP_LABELS = Object.freeze([
  'mã học sinh','mã moet','số đăng bộ','ngày vào trường','khu dân cư','n.trú, b.trú','n.trú, btrú',
  'dân tộc','tôn giáo','quốc tịch','diện chính sách','khuyết tật','diện ưu tiên','diện ưu đãi',
  'tên gọi khác','năm sinh','nghề nghiệp','đơn vị ctác','đơn vị công tác','căn cước cha','căn cước mẹ',
  'căn cước nđđ','người đỡ đầu','mã vemis','ảnh h.sinh','ảnh h.sinh:','ghi chú','email sll','dt trên giấy ks'
]);

function text(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

export function foldVietnamese(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function compactToken(value) {
  return foldVietnamese(value).replace(/[^a-z0-9]/g, '');
}

function normalizeDate(value) {
  const raw = text(value);
  const match = raw.match(/(\d{1,2})[\/.\-\s]+(\d{1,2})[\/.\-\s]+(\d{4})/);
  if (!match) return raw;
  return [String(match[1]).padStart(2, '0'), String(match[2]).padStart(2, '0'), match[3]].join('/');
}

function numericText(value) {
  return text(value)
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[^\d]/g, '');
}

function normalizePhone(value) {
  const digits = numericText(value);
  if (!digits || digits.length < 9 || digits.length > 11 || !digits.startsWith('0')) return '';
  return digits;
}

function normalizeCitizenId(value) {
  const digits = numericText(value);
  if (digits.length === 9 || digits.length === 12) return digits;
  if (digits.length >= 10 && digits.length <= 14) return digits;
  return '';
}

function cleanFieldValue(key, value) {
  let clean = text(value).replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, '');
  if (!clean || /^[-—.]+$/.test(clean)) return '';
  if (key === 'birthDate') return normalizeDate(clean);
  if (key === 'phone' || key === 'fatherPhone' || key === 'motherPhone') return normalizePhone(clean);
  if (key === 'citizenId') return normalizeCitizenId(clean);
  if (key === 'gender') {
    const folded = foldVietnamese(clean);
    if (/\bnam\b/.test(folded)) return 'Nam';
    if (/\bnu\b/.test(folded)) return 'Nữ';
  }
  return clean;
}

function labelPattern(label) {
  const escaped = foldVietnamese(label).replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
  return new RegExp('^' + escaped + '\\s*[:\\-]?\\s*(.*)$', 'i');
}

function lineValue(lines, aliases) {
  for (let i = 0; i < lines.length; i += 1) {
    const folded = foldVietnamese(lines[i]);
    for (const alias of aliases) {
      const pattern = labelPattern(alias);
      const match = folded.match(pattern);
      if (!match) continue;
      const original = text(lines[i]);
      const colon = original.indexOf(':');
      const dash = original.indexOf('-');
      const splitAt = colon >= 0 ? colon : dash >= 0 ? dash : -1;
      let value = splitAt >= 0 ? text(original.slice(splitAt + 1)) : '';
      if (!value && lines[i + 1]) value = text(lines[i + 1]);
      return value;
    }
  }
  return '';
}

function regexValue(raw, patterns) {
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return text(match[1]);
  }
  return '';
}

export function classifyStudentRecordText(rawText = '') {
  const folded = foldVietnamese(rawText);
  if (/vnedu|vn edu|vn\.edu|danh sach hoc sinh/.test(folded)) return 'vnedu';
  if (/truong\.hcm\.edu\.vn|co so du lieu|csdl|moet|quan li ho so hoc sinh/.test(folded)) return 'moet';
  if (/giay khai sinh|khai sinh/.test(folded)) return 'birth_certificate';
  if (/hoc ba/.test(folded)) return 'transcript';
  if (/trung tuyen.*lop 10|giay chung nhan trung tuyen/.test(folded)) return 'grade10_admission';
  if (/tot nghiep thcs|hoan thanh chuong trinh giao duc thcs|hoan thanh bac tieu hoc/.test(folded)) return 'completion_certificate';
  return 'unknown';
}

export function parseStudentRecordText(rawText = '') {
  const raw = String(rawText || '').replace(/\r/g, '\n');
  const lines = raw.split(/\n+/).map(text).filter(Boolean);
  const fields = {};

  FIELD_DEFS.forEach(([key, aliases]) => {
    const value = cleanFieldValue(key, lineValue(lines, aliases));
    if (value) fields[key] = value;
  });

  if (!fields.birthDate) {
    const v = regexValue(raw, [
      /(?:ngày sinh|ngày tháng năm sinh|sinh ngày)\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/i,
      /(?:ngày sinh|sinh ngày)\s*[:\-]?\s*(\d{1,2}\s+\d{1,2}\s+\d{4})/i,
    ]);
    const clean = cleanFieldValue('birthDate', v);
    if (clean) fields.birthDate = clean;
  }

  if (!fields.citizenId) {
    const v = regexValue(raw, [
      /(?:số căn cước|cccd|định danh cá nhân|số định danh)\s*[:\-]?\s*([0-9OIl| .-]{9,18})/i,
      /\b([0-9]{12})\b/,
    ]);
    const clean = cleanFieldValue('citizenId', v);
    if (clean) fields.citizenId = clean;
  }

  // Never infer a phone from an arbitrary number. A 12-digit CCCD was previously
  // mistaken for "Số điện thoại" on vnEdu screenshots.
  if (!fields.gender) {
    const folded = foldVietnamese(raw);
    if (/\bgioi tinh\s*[:\-]?\s*nam\b/.test(folded)) fields.gender = 'Nam';
    else if (/\bgioi tinh\s*[:\-]?\s*nu\b/.test(folded)) fields.gender = 'Nữ';
  }

  return { sourceType: classifyStudentRecordText(raw), fields, rawText: raw, extractedCount: Object.keys(fields).length };
}

function levenshtein(a, b) {
  const left = compactToken(a);
  const right = compactToken(b);
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  const prev = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = prev[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + cost);
      diagonal = old;
    }
  }
  return prev[right.length];
}

function tokenMatches(actual, expected) {
  const a = compactToken(actual);
  const e = compactToken(expected);
  if (!a || !e) return false;
  if (a === e) return true;
  if (a.length >= 4 && e.length >= 4 && (a.includes(e) || e.includes(a))) return true;
  if (Math.abs(a.length - e.length) > 1) return false;
  return Math.max(a.length, e.length) >= 4 && levenshtein(a, e) <= 1;
}

export function parseTsvWords(tsv = '') {
  const rows = String(tsv || '').split(/\r?\n/);
  const words = [];
  for (let index = 1; index < rows.length; index += 1) {
    const columns = rows[index].split('\t');
    if (columns.length < 12 || Number(columns[0]) !== 5) continue;
    const value = text(columns.slice(11).join('\t'));
    if (!value) continue;
    const left = Number(columns[6]) || 0;
    const top = Number(columns[7]) || 0;
    const width = Number(columns[8]) || 0;
    const height = Number(columns[9]) || 0;
    words.push({
      text: value,
      conf: Number(columns[10]) || 0,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      lineKey: [columns[1], columns[2], columns[3], columns[4]].join(':'),
    });
  }
  return words;
}

function groupByLine(words) {
  const groups = new Map();
  words.forEach((word) => {
    if (!groups.has(word.lineKey)) groups.set(word.lineKey, []);
    groups.get(word.lineKey).push(word);
  });
  return [...groups.values()].map((line) => line.sort((a, b) => a.left - b.left));
}

function aliasesWithKey() {
  const mapped = FIELD_DEFS.flatMap(([key, aliases]) => aliases.map((alias) => ({ key, alias, stopOnly: false })));
  const stops = STOP_LABELS.map((alias) => ({ key: '', alias, stopOnly: true }));
  return [...mapped, ...stops];
}

function findAliasAnchors(words) {
  const lines = groupByLine(words);
  const anchors = [];
  for (const line of lines) {
    for (const spec of aliasesWithKey()) {
      const expected = foldVietnamese(spec.alias).split(/\s+/).map(compactToken).filter(Boolean);
      if (!expected.length) continue;
      for (let start = 0; start < line.length; start += 1) {
        const slice = line.slice(start, start + expected.length);
        if (slice.length !== expected.length) continue;
        if (!slice.every((word, i) => tokenMatches(word.text, expected[i]))) continue;
        const confidence = slice.reduce((sum, word) => sum + Math.max(0, word.conf), 0) / slice.length;
        const top = Math.min(...slice.map((word) => word.top));
        const bottom = Math.max(...slice.map((word) => word.bottom));
        anchors.push({
          key: spec.key,
          alias: spec.alias,
          stopOnly: spec.stopOnly,
          left: slice[0].left,
          right: slice[slice.length - 1].right,
          top,
          bottom,
          height: Math.max(1, bottom - top),
          confidence,
          lineKey: slice[0].lineKey,
          wordIndexes: slice,
        });
      }
    }
  }
  return anchors;
}

function rowAligned(anchor, other) {
  const centerA = (anchor.top + anchor.bottom) / 2;
  const centerB = (other.top + other.bottom) / 2;
  return Math.abs(centerA - centerB) <= Math.max(16, anchor.height * 0.9, other.height * 0.9);
}

function valueAfterAnchor(anchor, words, allAnchors, key) {
  const nextStop = allAnchors
    .filter((candidate) => candidate !== anchor && candidate.left > anchor.right && rowAligned(anchor, candidate))
    .sort((a, b) => a.left - b.left)[0];

  const rightLimit = nextStop ? nextStop.left - 4 : Infinity;
  const centerY = (anchor.top + anchor.bottom) / 2;
  const tolerance = Math.max(18, anchor.height * 1.2);

  let candidates = words.filter((word) => {
    const wordCenter = (word.top + word.bottom) / 2;
    return word.left > anchor.right + 2
      && word.left < rightLimit
      && Math.abs(wordCenter - centerY) <= tolerance
      && word.conf >= 20;
  });

  const labelWordSet = new Set(allAnchors.flatMap((item) => item.wordIndexes || []));
  candidates = candidates.filter((word) => !labelWordSet.has(word)).sort((a, b) => a.left - b.left);

  if (!candidates.length) {
    const belowTop = anchor.bottom + 1;
    const belowBottom = anchor.bottom + Math.max(42, anchor.height * 2.8);
    candidates = words.filter((word) => (
      word.top >= belowTop
      && word.top <= belowBottom
      && word.left >= anchor.left
      && word.left < rightLimit
      && word.conf >= 25
      && !labelWordSet.has(word)
    )).sort((a, b) => a.top - b.top || a.left - b.left);
  }

  const joined = candidates.map((word) => word.text).join(' ');
  return cleanFieldValue(key, joined);
}

function bestSpatialValue(key, words, anchors) {
  const fieldAnchors = anchors
    .filter((anchor) => anchor.key === key && !anchor.stopOnly)
    .sort((a, b) => b.confidence - a.confidence || a.top - b.top || a.left - b.left);
  for (const anchor of fieldAnchors) {
    const value = valueAfterAnchor(anchor, words, anchors, key);
    if (value) return { value, confidence: anchor.confidence };
  }
  return null;
}

function recoverKnownStudentName(words, studentHint) {
  const expectedName = text(studentHint?.fullName);
  if (!expectedName) return '';
  const expected = foldVietnamese(expectedName).split(/\s+/).map(compactToken).filter(Boolean);
  const lines = groupByLine(words);
  for (const line of lines) {
    for (let start = 0; start <= line.length - expected.length; start += 1) {
      const slice = line.slice(start, start + expected.length);
      const matched = slice.filter((word, index) => tokenMatches(word.text, expected[index])).length;
      if (matched / expected.length >= 0.75) return expectedName;
    }
  }
  return '';
}

export function parseStudentRecordTsv(tsv = '', sourceHint = 'auto', studentHint = null) {
  const words = parseTsvWords(tsv);
  const anchors = findAliasAnchors(words);
  const fields = {};
  const fieldConfidence = {};

  FIELD_DEFS.forEach(([key]) => {
    const hit = bestSpatialValue(key, words, anchors);
    if (hit?.value) {
      fields[key] = hit.value;
      fieldConfidence[key] = Math.round(hit.confidence);
    }
  });

  if (!fields.fullName) {
    const recovered = recoverKnownStudentName(words, studentHint);
    if (recovered) {
      fields.fullName = recovered;
      fieldConfidence.fullName = 70;
    }
  }

  return {
    sourceType: sourceHint === 'vnedu' || sourceHint === 'moet' ? sourceHint : 'unknown',
    fields,
    fieldConfidence,
    extractedCount: Object.keys(fields).length,
  };
}

let tesseractPromise = null;
let workerPromise = null;
let activeProgress = null;

function loadTesseract() {
  if (globalThis.Tesseract?.createWorker) return Promise.resolve(globalThis.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-bes-tesseract="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(globalThis.Tesseract), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không thể tải OCR cục bộ.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.dataset.besTesseract = 'true';
    script.onload = () => resolve(globalThis.Tesseract);
    script.onerror = () => reject(new Error('Không thể tải bộ nhận diện OCR. Kiểm tra kết nối mạng và thử lại.'));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

async function getWorker(onProgress) {
  activeProgress = onProgress || null;
  if (!workerPromise) {
    workerPromise = loadTesseract().then(async (Tesseract) => {
      const worker = await Tesseract.createWorker(
        'vie+eng',
        Tesseract.OEM?.LSTM_ONLY ?? 1,
        {
          logger: (message) => {
            const progress = Number(message?.progress || 0);
            activeProgress?.({ status: message?.status || 'ocr', progress: Math.max(0.14, progress) });
          },
        },
      );
      await worker.setParameters({
        preserve_interword_spaces: '1',
        user_defined_dpi: '240',
        tessedit_pageseg_mode: Tesseract.PSM?.SPARSE_TEXT ?? '11',
      });
      return worker;
    });
  }
  return workerPromise;
}

async function prepareOcrImage(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const targetWidth = Math.min(3200, Math.max(bitmap.width, Math.round(bitmap.width * 1.45)));
    const scale = targetWidth / bitmap.width;
    if (scale <= 1.02) return file;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return file;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.filter = 'grayscale(1) contrast(1.18)';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}

async function browserTextDetector(file) {
  if (typeof globalThis.TextDetector !== 'function' || typeof createImageBitmap !== 'function') return '';
  const bitmap = await createImageBitmap(file);
  try {
    const detector = new globalThis.TextDetector();
    const results = await detector.detect(bitmap);
    return (results || []).map((item) => item.rawValue || '').filter(Boolean).join('\n');
  } finally {
    bitmap.close?.();
  }
}

export async function recognizeStudentRecordImage(file, { onProgress, sourceHint = 'auto', studentHint = null } = {}) {
  if (!file) throw new Error('Chưa chọn ảnh cần nhận diện.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('Tính năng nhận diện hiện hỗ trợ ảnh JPG, PNG, HEIC/WebP do trình duyệt đọc được.');

  let nativeText = '';
  let nativeParsed = { sourceType: 'unknown', fields: {} };
  try {
    onProgress?.({ status: 'browser-ocr', progress: 0.06 });
    nativeText = await browserTextDetector(file);
    nativeParsed = parseStudentRecordText(nativeText);
    const isWebScreenshot = sourceHint === 'vnedu'
      || sourceHint === 'moet'
      || nativeParsed.sourceType === 'vnedu'
      || nativeParsed.sourceType === 'moet';
    if (!isWebScreenshot && nativeText && nativeText.trim().length > 40) {
      onProgress?.({ status: 'done', progress: 1 });
      return { engine: 'TextDetector', text: nativeText, ...nativeParsed };
    }
  } catch {}

  onProgress?.({ status: 'preprocess', progress: 0.1 });
  const prepared = await prepareOcrImage(file);
  const worker = await getWorker(onProgress);
  const result = await worker.recognize(prepared, {}, { text: true, tsv: true });
  const recognized = String(result?.data?.text || '');
  const parsed = parseStudentRecordText(recognized);
  const resolvedSource = sourceHint === 'vnedu' || sourceHint === 'moet'
    ? sourceHint
    : classifyStudentRecordText([nativeText, recognized].join('\n'));
  const spatial = parseStudentRecordTsv(result?.data?.tsv || '', resolvedSource, studentHint);

  // Spatial extraction wins for web forms because it understands "label → value"
  // relationships and avoids mixing neighboring columns.
  const fields = {
    ...(nativeParsed.fields || {}),
    ...(parsed.fields || {}),
    ...(spatial.fields || {}),
  };

  // Guard against cross-field numeric contamination.
  if (fields.phone && fields.citizenId && fields.phone === fields.citizenId) delete fields.phone;
  if (fields.fatherPhone && fields.fatherPhone.length === 12) delete fields.fatherPhone;
  if (fields.motherPhone && fields.motherPhone.length === 12) delete fields.motherPhone;

  onProgress?.({ status: 'done', progress: 1 });
  return {
    engine: 'Tesseract.js Layout',
    confidence: Number(result?.data?.confidence || 0),
    text: recognized,
    sourceType: resolvedSource || parsed.sourceType || nativeParsed.sourceType,
    fields,
    fieldConfidence: spatial.fieldConfidence || {},
    extractedCount: Object.keys(fields).length,
    layoutUsed: Boolean(result?.data?.tsv),
  };
}

export const STUDENT_RECORD_FIELD_LABELS = Object.freeze({
  fullName: 'Họ và tên',
  gender: 'Giới tính',
  birthDate: 'Ngày sinh',
  birthPlace: 'Nơi sinh',
  hometown: 'Quê quán',
  birthRegistrationPlace: 'Nơi khai sinh',
  currentAddress: 'Chỗ ở hiện nay',
  permanentAddress: 'Nơi thường trú',
  citizenId: 'CCCD / Định danh',
  phone: 'Số điện thoại',
  fatherName: 'Họ tên cha',
  fatherPhone: 'Điện thoại cha',
  motherName: 'Họ tên mẹ',
  motherPhone: 'Điện thoại mẹ',
});
