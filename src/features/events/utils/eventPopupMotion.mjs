// Admin-published event announcement motion stored inside the existing
// Supabase-protected global-motion JSON config. This file is pure and testable.
export const EVENT_POPUP_DEFAULT = Object.freeze({ enter: 'rise', exit: 'shrink', speed: 'balanced' });

export const EVENT_ENTER_CHOICES = Object.freeze([
  { id: 'rise', vi: 'Nổi lên nhẹ', en: 'Soft rise', descriptionVi: 'Nâng nhẹ từ phía dưới, rõ ràng và thanh lịch.' },
  { id: 'scale', vi: 'Phóng nhẹ', en: 'Gentle zoom', descriptionVi: 'Phóng từ tâm, tinh tế như Focus.' },
  { id: 'slide', vi: 'Trượt ngang', en: 'Side glide', descriptionVi: 'Trượt nhẹ từ bên phải.' },
  { id: 'flip', vi: 'Lật kính', en: 'Glass flip', descriptionVi: 'Lật 3D ngắn, gợi cảm giác trang sự kiện.' },
  { id: 'fade', vi: 'Mờ dần', en: 'Fade in', descriptionVi: 'Chỉ chuyển opacity, nhẹ nhất.' },
  { id: 'none', vi: 'Không hiệu ứng', en: 'Instant', descriptionVi: 'Hiển thị ngay.' },
]);
export const EVENT_EXIT_CHOICES = Object.freeze([
  { id: 'shrink', vi: 'Thu nhỏ và tan', en: 'Shrink away' },
  { id: 'fade', vi: 'Mờ dần', en: 'Fade away' },
  { id: 'slide', vi: 'Trượt ra', en: 'Slide away' },
  { id: 'flip', vi: 'Khép kính', en: 'Glass fold' },
  { id: 'none', vi: 'Không hiệu ứng', en: 'Instant' },
]);
export const EVENT_SPEED_CHOICES = Object.freeze([
  { id: 'gentle', vi: 'Êm', en: 'Gentle', enterMs: 540, exitMs: 380 },
  { id: 'balanced', vi: 'Cân bằng', en: 'Balanced', enterMs: 400, exitMs: 290 },
  { id: 'quick', vi: 'Nhanh', en: 'Quick', enterMs: 260, exitMs: 190 },
]);

const choice = (items, requested, fallback) =>
  items.some(item => item.id === requested) ? requested : fallback;

export function normalizeEventPopupMotion(value = {}) {
  const safe = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    enter: choice(EVENT_ENTER_CHOICES, safe.enter, EVENT_POPUP_DEFAULT.enter),
    exit: choice(EVENT_EXIT_CHOICES, safe.exit, EVENT_POPUP_DEFAULT.exit),
    speed: choice(EVENT_SPEED_CHOICES, safe.speed, EVENT_POPUP_DEFAULT.speed),
  };
}
export function eventPopupMotionDuration(value = {}, phase = 'enter', reduced = false) {
  const motion = normalizeEventPopupMotion(value);
  if (reduced || (phase === 'exit' ? motion.exit : motion.enter) === 'none') return 0;
  const speed = EVENT_SPEED_CHOICES.find(item => item.id === motion.speed) || EVENT_SPEED_CHOICES[1];
  return phase === 'exit' ? speed.exitMs : speed.enterMs;
}
