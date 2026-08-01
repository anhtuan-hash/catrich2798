export const HOMEROOM_NAV_PALETTE_IDLE_MS = 5000;
export const HOMEROOM_NAV_SCROLL_DOWN_THRESHOLD = 52;
export const HOMEROOM_NAV_SCROLL_UP_THRESHOLD = 24;
export const HOMEROOM_NAV_SCROLL_MIN_Y = 140;

const STORAGE_PREFIX = 'bes-homeroom-navigation-palette-v1';
const DEFAULT_PREFERENCE = Object.freeze({
  pinned: false,
  collapsed: false,
  corner: 'bottom-right',
});

function resolveStorage(storage) {
  if (storage) return storage;
  if (typeof window !== 'undefined') return window.localStorage;
  return null;
}

function userIdentity(user = {}) {
  return String(user.id || user.authId || user.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .slice(0, 120) || 'guest';
}

export function homeroomNavigationPaletteKey(user) {
  return `${STORAGE_PREFIX}:${userIdentity(user)}`;
}

export function normalizeHomeroomNavigationPreference(raw = {}) {
  const pinned = raw?.pinned === true;
  return {
    pinned,
    collapsed: pinned ? false : raw?.collapsed === true,
    corner: 'bottom-right',
  };
}

export function readHomeroomNavigationPreference(user, storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return { ...DEFAULT_PREFERENCE };
    const raw = target.getItem(homeroomNavigationPaletteKey(user));
    return raw ? normalizeHomeroomNavigationPreference(JSON.parse(raw)) : { ...DEFAULT_PREFERENCE };
  } catch {
    return { ...DEFAULT_PREFERENCE };
  }
}

export function writeHomeroomNavigationPreference(user, preference, storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(
      homeroomNavigationPaletteKey(user),
      JSON.stringify(normalizeHomeroomNavigationPreference(preference)),
    );
    return true;
  } catch {
    return false;
  }
}

export function createHomeroomNavigationScrollTracker(scrollY = 0) {
  return {
    lastY: Math.max(0, Number(scrollY) || 0),
    downDistance: 0,
    upDistance: 0,
  };
}

export function updateHomeroomNavigationScrollTracker(previous, scrollY) {
  const currentY = Math.max(0, Number(scrollY) || 0);
  const tracker = previous || createHomeroomNavigationScrollTracker(currentY);
  const delta = currentY - tracker.lastY;
  let downDistance = tracker.downDistance;
  let upDistance = tracker.upDistance;
  let intent = '';

  if (delta >= 2) {
    downDistance += delta;
    upDistance = 0;
  } else if (delta <= -2) {
    upDistance += Math.abs(delta);
    downDistance = 0;
  }

  if (currentY >= HOMEROOM_NAV_SCROLL_MIN_Y && downDistance >= HOMEROOM_NAV_SCROLL_DOWN_THRESHOLD) {
    intent = 'collapse';
    downDistance = 0;
  } else if (upDistance >= HOMEROOM_NAV_SCROLL_UP_THRESHOLD) {
    intent = 'expand';
    upDistance = 0;
  }

  return {
    tracker: { lastY: currentY, downDistance, upDistance },
    intent,
  };
}
