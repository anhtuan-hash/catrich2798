// Tiện ích mở cuộc trò chuyện Zalo từ số điện thoại phụ huynh.
// Không dùng API, không tự gửi tin: giáo viên tự dán và bấm gửi.
// Lưu ý: liên kết zalo.me/<số> chỉ mở đúng cuộc trò chuyện, KHÔNG điền sẵn nội dung,
// nên nội dung được sao chép vào clipboard trước khi mở Zalo.

/** Chuẩn hóa số điện thoại Việt Nam về dạng quốc tế không có dấu +, ví dụ 0912345678 -> 84912345678. */
export function normalizeVnPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('84')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  // Số di động Việt Nam sau mã quốc gia có 9 chữ số (đầu 3,5,7,8,9).
  if (!/^[35789]\d{8}$/.test(digits)) return '';
  return `84${digits}`;
}

/** Trả về liên kết mở Zalo, hoặc chuỗi rỗng nếu số điện thoại không hợp lệ. */
export function buildZaloUrl(phone) {
  const normalized = normalizeVnPhone(phone);
  return normalized ? `https://zalo.me/${normalized}` : '';
}

/**
 * Sao chép nội dung rồi mở Zalo trong tab mới.
 * Trả về { ok, copied, reason } để giao diện báo lại cho giáo viên.
 */
export async function openZaloChat({ phone, message }) {
  const url = buildZaloUrl(phone);
  if (!url) return { ok: false, copied: false, reason: 'invalid-phone' };
  let copied = false;
  try {
    if (message && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      copied = true;
    }
  } catch {
    copied = false;
  }
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
  return { ok: true, copied, reason: '' };
}

const pad2 = (value) => String(value).padStart(2, '0');

/** Ngày theo GIỜ ĐỊA PHƯƠNG (YYYY-MM-DD). Không dùng toISOString vì đó là giờ UTC, lệch 7 tiếng ở Việt Nam. */
export function localDateIso(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Giá trị cho ô datetime-local (YYYY-MM-DDTHH:mm) theo giờ địa phương. */
export function localDateTimeInput(date = new Date()) {
  return `${localDateIso(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * Điền tin mẫu cho từng học sinh. Hỗ trợ {tên học sinh} và {phụ huynh}
 * (không phân biệt hoa thường). Thiếu tên phụ huynh thì dùng "Quý phụ huynh".
 */
export function fillMessageTemplate(template, student) {
  const studentName = String(student?.fullName ?? '').trim();
  const parentName = String(student?.parentName ?? '').trim() || 'Quý phụ huynh';
  return String(template ?? '')
    .replace(/\{\s*(?:tên học sinh|ten hoc sinh|học sinh|hoc sinh)\s*\}/gi, studentName)
    .replace(/\{\s*(?:phụ huynh|phu huynh)\s*\}/gi, parentName);
}

/** Lịch nhắc đến hạn: chưa gửi và thời điểm gửi nhỏ hơn hoặc bằng cuối ngày `today` (YYYY-MM-DD, giờ địa phương). */
export function selectDueMessages(scheduledMessages, today) {
  const endOfDay = `${today}T23:59`;
  return (Array.isArray(scheduledMessages) ? scheduledMessages : [])
    .filter((item) => item && item.status === 'scheduled' && String(item.sendAt || '') <= endOfDay)
    .sort((a, b) => String(a.sendAt).localeCompare(String(b.sendAt)));
}
