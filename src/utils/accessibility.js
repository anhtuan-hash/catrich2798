const STORAGE_KEY = 'bes-accessibility-v1095';
export const ACCESSIBILITY_EVENT = 'bes-accessibility-updated';

export const DEFAULT_ACCESSIBILITY_PREFERENCES = Object.freeze({
  contrast: 'standard',
  motion: 'system',
  targetSize: 'standard',
  readableFont: false,
  underlineLinks: false,
  focusHighlight: true,
  announcements: true,
});

function normalize(input = {}) {
  const contrast = ['standard', 'high'].includes(input.contrast) ? input.contrast : 'standard';
  const motion = ['system', 'reduce'].includes(input.motion) ? input.motion : 'system';
  const targetSize = ['standard', 'large'].includes(input.targetSize) ? input.targetSize : 'standard';
  return {
    contrast,
    motion,
    targetSize,
    readableFont: Boolean(input.readableFont),
    underlineLinks: Boolean(input.underlineLinks),
    focusHighlight: input.focusHighlight !== false,
    announcements: input.announcements !== false,
  };
}

export function readAccessibilityPreferences() {
  if (typeof window === 'undefined') return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return normalize({ ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...(parsed || {}) });
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }
}

export function applyAccessibilityPreferences(preferences = readAccessibilityPreferences()) {
  if (typeof document === 'undefined') return normalize(preferences);
  const next = normalize(preferences);
  const root = document.documentElement;
  root.dataset.a11yContrast = next.contrast;
  root.dataset.a11yMotion = next.motion;
  root.dataset.a11yTargets = next.targetSize;
  root.dataset.a11yReadableFont = next.readableFont ? 'true' : 'false';
  root.dataset.a11yUnderlineLinks = next.underlineLinks ? 'true' : 'false';
  root.dataset.a11yFocus = next.focusHighlight ? 'true' : 'false';
  root.dataset.a11yAnnouncements = next.announcements ? 'true' : 'false';
  return next;
}

export function saveAccessibilityPreferences(preferences) {
  const next = normalize({ ...readAccessibilityPreferences(), ...(preferences || {}) });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* optional */ }
    applyAccessibilityPreferences(next);
    try { window.dispatchEvent(new CustomEvent(ACCESSIBILITY_EVENT, { detail: next })); } catch { /* optional */ }
  }
  return next;
}

export function resetAccessibilityPreferences() {
  return saveAccessibilityPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES);
}

export function subscribeAccessibilityPreferences(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener?.(event.detail || readAccessibilityPreferences());
  window.addEventListener(ACCESSIBILITY_EVENT, handler);
  listener?.(readAccessibilityPreferences());
  return () => window.removeEventListener(ACCESSIBILITY_EVENT, handler);
}

export function announceAccessibility(message, priority = 'polite') {
  if (typeof window === 'undefined' || !message) return;
  const preferences = readAccessibilityPreferences();
  if (!preferences.announcements) return;
  window.dispatchEvent(new CustomEvent('bes-a11y-announce', { detail: { message: String(message), priority } }));
}

export function installAccessibilityBootstrap() {
  applyAccessibilityPreferences();
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) applyAccessibilityPreferences();
  });
}
