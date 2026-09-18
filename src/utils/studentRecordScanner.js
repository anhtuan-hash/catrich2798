
const FIELD_DEFS = Object.freeze([
  ['fullName', ['họ và tên', 'ho va ten', 'họ tên', 'ho ten', 'tên học sinh', 'ten hoc sinh']],
  ['gender', ['giới tính', 'gioi tinh']],
  ['birthDate', ['ngày sinh', 'ngay sinh', 'ngày tháng năm sinh', 'ngay thang nam sinh']],
  ['birthPlace', ['nơi sinh', 'noi sinh']],
  ['hometown', ['quê quán', 'que quan']],
  ['birthRegistrationPlace', ['nơi khai sinh', 'noi khai sinh', 'đăng ký khai sinh', 'dang ky khai sinh']],
  ['currentAddress', ['chỗ ở hiện nay', 'cho o hien nay', 'địa chỉ hiện nay', 'dia chi hien nay']],
  ['permanentAddress', ['nơi thường trú', 'noi thuong tru', 'thường trú', 'thuong tru']],
  ['citizenId', ['cccd', 'định danh cá nhân', 'dinh danh ca nhan', 'số định danh', 'so dinh danh']],
  ['phone', ['số điện thoại', 'so dien thoai', 'điện thoại', 'dien thoai']],
  ['fatherName', ['họ tên cha', 'ho ten cha', 'cha:', 'bố:', 'bo:']],
  ['fatherPhone', ['điện thoại cha', 'dien thoai cha', 'sđt cha', 'sdt cha']],
  ['motherName', ['họ tên mẹ', 'ho ten me', 'mẹ:', 'me:']],
  ['motherPhone', ['điện thoại mẹ', 'dien thoai me', 'sđt mẹ', 'sdt me']],
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

function normalizeDate(value) {
  const raw = text(value);
  const match = raw.match(/(\d{1,2})[\/.\-\s]+(\d{1,2})[\/.\-\s]+(\d{4})/);
  if (!match) return raw;
  return [String(match[1]).padStart(2, '0'), String(match[2]).padStart(2, '0'), match[3]].join('/');
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
  if (/vnedu|vn edu|vn\.edu/.test(folded)) return 'vnedu';
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
    const value = lineValue(lines, aliases);
    if (value) fields[key] = key === 'birthDate' ? normalizeDate(value) : value;
  });

  if (!fields.birthDate) {
    const v = regexValue(raw, [
      /(?:ngày sinh|ngày tháng năm sinh|sinh ngày)\s*[:\-]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/i,
      /(?:ngày sinh|sinh ngày)\s*[:\-]?\s*(\d{1,2}\s+\d{1,2}\s+\d{4})/i,
    ]);
    if (v) fields.birthDate = normalizeDate(v);
  }
  if (!fields.citizenId) {
    const v = regexValue(raw, [
      /(?:cccd|định danh cá nhân|số định danh)\s*[:\-]?\s*([0-9]{9,14})/i,
      /\b([0-9]{12})\b/,
    ]);
    if (v) fields.citizenId = v;
  }
  if (!fields.phone) {
    const v = regexValue(raw, [/\b(0[2-9][0-9 .-]{7,12})\b/]);
    if (v) fields.phone = v.replace(/[ .-]/g, '');
  }
  if (!fields.gender) {
    const folded = foldVietnamese(raw);
    if (/\bgioi tinh\s*[:\-]?\s*nam\b/.test(folded)) fields.gender = 'Nam';
    else if (/\bgioi tinh\s*[:\-]?\s*nu\b/.test(folded)) fields.gender = 'Nữ';
  }

  return { sourceType: classifyStudentRecordText(raw), fields, rawText: raw, extractedCount: Object.keys(fields).length };
}

let tesseractPromise = null;
function loadTesseract() {
  if (globalThis.Tesseract?.recognize) return Promise.resolve(globalThis.Tesseract);
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

export async function recognizeStudentRecordImage(file, { onProgress } = {}) {
  if (!file) throw new Error('Chưa chọn ảnh cần nhận diện.');
  if (!String(file.type || '').startsWith('image/')) throw new Error('Tính năng nhận diện hiện hỗ trợ ảnh JPG, PNG, HEIC/WebP do trình duyệt đọc được.');
  try {
    onProgress?.({ status: 'browser-ocr', progress: 0.08 });
    const nativeText = await browserTextDetector(file);
    if (nativeText && nativeText.trim().length > 24) {
      onProgress?.({ status: 'done', progress: 1 });
      return { engine: 'TextDetector', text: nativeText, ...parseStudentRecordText(nativeText) };
    }
  } catch {}
  onProgress?.({ status: 'loading-engine', progress: 0.12 });
  const Tesseract = await loadTesseract();
  if (!Tesseract?.recognize) throw new Error('Bộ OCR chưa sẵn sàng.');
  const result = await Tesseract.recognize(file, 'vie+eng', {
    logger: (message) => {
      const progress = Number(message?.progress || 0);
      onProgress?.({ status: message?.status || 'ocr', progress: Math.max(0.14, progress) });
    },
  });
  const recognized = String(result?.data?.text || '');
  onProgress?.({ status: 'done', progress: 1 });
  return { engine: 'Tesseract.js', confidence: Number(result?.data?.confidence || 0), text: recognized, ...parseStudentRecordText(recognized) };
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
