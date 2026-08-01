export const FONT_SCALE_OPTIONS = Object.freeze([90, 100, 110, 120, 130, 135]);

export function normalizeFontScale(value, fallback = 100) {
  const fallbackValue = Number(fallback);
  const safeFallback = FONT_SCALE_OPTIONS.includes(fallbackValue) ? fallbackValue : 100;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return safeFallback;

  return FONT_SCALE_OPTIONS.reduce((closest, option) => (
    Math.abs(option - numeric) < Math.abs(closest - numeric) ? option : closest
  ), safeFallback);
}
