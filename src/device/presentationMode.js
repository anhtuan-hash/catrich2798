const PHONE_UA = /iPhone|iPod|Android.+Mobile|Windows Phone/i;
const ANDROID_UA = /Android/i;
const IPAD_UA = /iPad/i;
const DESKTOP_OS_UA = /Windows NT|Macintosh|CrOS|X11/i;

export const PRESENTATION_OVERRIDE_STORAGE_KEY = 'bes-presentation-override';
export const PRESENTATION_OVERRIDE_EVENT = 'bes-presentation-override-change';

function normalizePresentationOverride(value) {
  return value === 'mobile' || value === 'desktop' ? value : null;
}

export function readPresentationOverride(search = '', enabled = false) {
  if (!enabled) return null;
  const value = new URLSearchParams(String(search || '').replace(/^\?/, '')).get('besPresentation');
  return normalizePresentationOverride(value);
}

export function readStoredPresentationOverride(storageLike = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storageLike) return null;
  try {
    return normalizePresentationOverride(storageLike.getItem(PRESENTATION_OVERRIDE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writePresentationOverride(value, windowLike = typeof window !== 'undefined' ? window : null) {
  const normalized = normalizePresentationOverride(value);
  if (!windowLike) return normalized;

  try {
    if (normalized) windowLike.localStorage?.setItem(PRESENTATION_OVERRIDE_STORAGE_KEY, normalized);
    else windowLike.localStorage?.removeItem(PRESENTATION_OVERRIDE_STORAGE_KEY);
  } catch {
    // Presentation preference is optional when storage is unavailable.
  }

  try {
    const EventCtor = windowLike.CustomEvent;
    if (EventCtor) {
      windowLike.dispatchEvent(new EventCtor(PRESENTATION_OVERRIDE_EVENT, { detail: { value: normalized } }));
    } else if (typeof Event !== 'undefined') {
      windowLike.dispatchEvent(new Event(PRESENTATION_OVERRIDE_EVENT));
    }
  } catch {
    // Same-tab notification is best effort; storage still preserves the preference.
  }

  return normalized;
}

export function orientationFromEnvironment(env = {}) {
  const explicit = String(env.orientationType || '').toLowerCase();
  if (explicit.startsWith('portrait')) return 'portrait';
  if (explicit.startsWith('landscape')) return 'landscape';
  const width = Number(env.screenWidth || 0);
  const height = Number(env.screenHeight || 0);
  if (!width && !height) return 'landscape';
  return height >= width ? 'portrait' : 'landscape';
}

export function resolvePresentationMode(env = {}, override = null) {
  const orientation = orientationFromEnvironment(env);
  const ua = String(env.userAgent || '');
  const platform = String(env.platform || '');
  const touch = Number(env.maxTouchPoints || 0);
  const ipadDesktopUa = platform === 'MacIntel' && touch > 1;
  const ipad = IPAD_UA.test(ua) || ipadDesktopUa;
  const androidTablet = ANDROID_UA.test(ua) && !/Android.+Mobile/i.test(ua) && touch > 0;
  const phone = !ipad && !androidTablet && (env.userAgentDataMobile === true || PHONE_UA.test(ua));
  const desktopOs = DESKTOP_OS_UA.test(ua) && !ipadDesktopUa;
  const shortSide = Math.min(Number(env.screenWidth || 0), Number(env.screenHeight || 0));

  let deviceClass = 'desktop';
  if (ipad || androidTablet) deviceClass = 'tablet';
  else if (phone) deviceClass = 'phone';
  else if (!desktopOs && touch > 1 && env.coarsePointer && env.hoverNone && shortSide >= 600) deviceClass = 'tablet';

  const automatic = deviceClass === 'phone'
    ? 'mobile'
    : deviceClass === 'tablet' && orientation === 'portrait'
      ? 'mobile'
      : 'desktop';

  const presentationMode = override === 'mobile' || override === 'desktop' ? override : automatic;
  return {
    deviceClass,
    orientation,
    presentationMode,
    reason: override ? 'override' : `${deviceClass}:${orientation}`,
  };
}

export function readBrowserPresentationEnvironment(windowLike = window, navigatorLike = navigator) {
  const media = (query) => Boolean(windowLike.matchMedia?.(query)?.matches);
  return {
    userAgent: navigatorLike.userAgent || '',
    userAgentDataMobile: typeof navigatorLike.userAgentData?.mobile === 'boolean' ? navigatorLike.userAgentData.mobile : null,
    platform: navigatorLike.platform || '',
    maxTouchPoints: navigatorLike.maxTouchPoints || 0,
    coarsePointer: media('(pointer: coarse)'),
    hoverNone: media('(hover: none)'),
    screenWidth: windowLike.screen?.width || 0,
    screenHeight: windowLike.screen?.height || 0,
    orientationType: windowLike.screen?.orientation?.type || '',
  };
}
