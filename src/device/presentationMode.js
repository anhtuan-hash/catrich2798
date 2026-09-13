const PHONE_UA = /iPhone|iPod|Android.+Mobile|Windows Phone|Mobile/i;
const ANDROID_UA = /Android/i;
const IPAD_UA = /iPad/i;
const DESKTOP_OS_UA = /Windows NT|Macintosh|CrOS|X11/i;

export function readPresentationOverride(search = '', enabled = false) {
  if (!enabled) return null;
  const value = new URLSearchParams(String(search || '').replace(/^\?/, '')).get('besPresentation');
  return value === 'mobile' || value === 'desktop' ? value : null;
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
  const phone = env.userAgentDataMobile === true || PHONE_UA.test(ua);
  const ipad = IPAD_UA.test(ua) || ipadDesktopUa;
  const androidTablet = ANDROID_UA.test(ua) && !PHONE_UA.test(ua) && touch > 0;
  const desktopOs = DESKTOP_OS_UA.test(ua) && !ipadDesktopUa;
  const shortSide = Math.min(Number(env.screenWidth || 0), Number(env.screenHeight || 0));

  let deviceClass = 'desktop';
  if (phone) deviceClass = 'phone';
  else if (ipad || androidTablet) deviceClass = 'tablet';
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
