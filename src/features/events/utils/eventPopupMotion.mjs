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
  { id: 'gentle', vi: 'Êm', en: 'Gentle', enterMs: 920, exitMs: 640 },
  { id: 'balanced', vi: 'Cân bằng', en: 'Balanced', enterMs: 640, exitMs: 430 },
  { id: 'quick', vi: 'Nhanh', en: 'Quick', enterMs: 370, exitMs: 260 },
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

/**
 * Native Web Animations controller shared by the real event modal and its
 * Admin previews. Unlike CSS class toggles, every click starts a new timeline,
 * with observable progress, finished/cancel behavior and a single source of
 * truth for timing.
 */
const NO_TRANSFORM = 'translate3d(0,0,0) scale(1) rotateX(0deg)';
const enterKeyframes = {
  rise: [{ opacity: 0, transform: 'translate3d(0,58px,0) scale(.92)' }, { opacity: 1, transform: NO_TRANSFORM }],
  scale: [{ opacity: 0, transform: 'scale(.72)' }, { opacity: 1, transform: NO_TRANSFORM }],
  slide: [{ opacity: 0, transform: 'translate3d(150px,0,0)' }, { opacity: 1, transform: NO_TRANSFORM }],
  flip: [{ opacity: 0, transform: 'perspective(1100px) rotateX(-38deg) scale(.88)' }, { opacity: 1, transform: NO_TRANSFORM }],
  fade: [{ opacity: 0 }, { opacity: 1 }],
};
const exitKeyframes = {
  shrink: [{ opacity: 1, transform: NO_TRANSFORM }, { opacity: 0, transform: 'translate3d(0,32px,0) scale(.78)' }],
  fade: [{ opacity: 1 }, { opacity: 0 }],
  slide: [{ opacity: 1, transform: NO_TRANSFORM }, { opacity: 0, transform: 'translate3d(130px,0,0)' }],
  flip: [{ opacity: 1, transform: NO_TRANSFORM }, { opacity: 0, transform: 'perspective(1100px) rotateX(36deg) scale(.87)' }],
};

export function eventPopupMotionFrames(config, phase = 'enter') {
  const motion = normalizeEventPopupMotion(config);
  const which = phase === 'exit' ? motion.exit : motion.enter;
  return (phase === 'exit' ? exitKeyframes : enterKeyframes)[which]?.map(frame => ({ ...frame })) || [];
}

export function prefersReducedEventMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * @returns {{finished: Promise<void>, cancel: Function, duration: number, animation?: Animation}}
 * Resolves on completion or cancellation; never traps callers waiting on
 * an animation cancelled by a fast second click or a route unmount.
 */
export function playEventPopupMotion(element, config, phase = 'enter') {
  const reduced = prefersReducedEventMotion();
  const duration = eventPopupMotionDuration(config, phase, reduced);
  const frames = eventPopupMotionFrames(config, phase);
  if (!element || duration <= 0 || !frames.length || typeof element.animate !== 'function') {
    return { finished: Promise.resolve(), cancel: () => {}, duration: 0 };
  }
  const animation = element.animate(frames, {
    duration,
    easing: phase === 'exit' ? 'cubic-bezier(.42,0,.9,.45)' : 'cubic-bezier(.18,.82,.24,1)',
    fill: 'forwards',
  });
  const finished = animation.finished.then(() => {}, () => {});
  return { animation, finished, cancel: () => animation.cancel(), duration };
}
