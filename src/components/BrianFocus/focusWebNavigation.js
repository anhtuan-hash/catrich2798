/** Advance within the Focus website playlist without altering any iframe container identity. */
export function nextFocusWebIndex(index, total) {
  const size = Math.max(0, Math.trunc(Number(total) || 0));
  if (size === 0) return 0;
  const at = Number.isInteger(index) ? index : 0;
  return ((at + 1) % size + size) % size;
}
