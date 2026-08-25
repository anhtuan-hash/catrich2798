// Global text-size scaling has been retired.
// This compatibility module remains only for older lazy imports.
// It never writes to document styles or changes typography.
export const FONT_SCALE_OPTIONS = Object.freeze([100]);

export function normalizeFontScale() {
  return 100;
}
