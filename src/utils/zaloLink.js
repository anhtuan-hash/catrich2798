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

/** Lịch nhắc đến hạn: chưa gửi và thời điểm gửi nhỏ hơn hoặc bằng cuối ngày `today` (YYYY-MM-DD). */
export function selectDueMessages(scheduledMessages, today) {
  const endOfDay = `${today}T23:59`;
  return (Array.isArray(scheduledMessages) ? scheduledMessages : [])
    .filter((item) => item && item.status === 'scheduled' && String(item.sendAt || '') <= endOfDay)
    .sort((a, b) => String(a.sendAt).localeCompare(String(b.sendAt)));
}
