// Global text-size scaling has been retired.
// The application now always uses the browser/design-system native 100% text size.
// Keep this tiny compatibility module because older runtime imports still reference it.
export const FONT_SCALE_OPTIONS = Object.freeze([100]);

export function normalizeFontScale() {
  return 100;
}
