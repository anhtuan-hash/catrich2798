/**
 * Keyboard-first score parsing for classroom gradebook entry.
 * Never use this for imported records, plus-counts, or stored score migration.
 * Unpunctuated 2/3-digit shortcuts are interpreted only in editable inputs.
 *
 * Examples:
 *  96 -> 9.6
 *  818 -> 8.2  (8.18 rounded to one decimal place)
 *  100 -> 10
 *  8.25 -> 8.25 (explicit decimals preserve two digits)
 */
export function scoreEntryDraftIsAllowed(input) {
  return /^\d{0,3}(?:[.,]\d{0,2})?$/.test(String(input ?? '').trim());
}

export function normalizeTeacherScoreInput(input) {
  const value = String(input ?? '').trim().replace(',', '.');
  if (!value) return '';
  if (!scoreEntryDraftIsAllowed(value) || value === '.') return null;

  const explicitDecimal = value.includes('.');
  let numeric;
  if (value === '100') {
    numeric = 10;
  } else if (explicitDecimal || value.length === 1 || value === '10') {
    numeric = Number(value);
  } else if (value.length === 2) {
    numeric = Number(value) / 10;
  } else if (value.length === 3) {
    numeric = Number(value) / 100;
  } else {
    return null;
  }
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10) return null;

  const decimals = explicitDecimal ? 2 : 1;
  const power = 10 ** decimals;
  const rounded = Math.round((numeric + Number.EPSILON) * power) / power;
  return String(rounded);
}
