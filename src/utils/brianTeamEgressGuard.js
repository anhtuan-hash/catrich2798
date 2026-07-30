const GUARD_KEY = Symbol.for('bes.brian-team-egress-guard.v2');
const FALLBACK_INTERVAL = 15 * 60 * 1000;

if (typeof window !== 'undefined' && !window[GUARD_KEY]) {
  const nativeSetInterval = window.setInterval.bind(window);

  window.setInterval = (callback, delay, ...args) => {
    const requested = Number(delay || 0);
    let source = '';
    try { source = Function.prototype.toString.call(callback); } catch { /* native callback */ }

    const isLeaderReverseSync = source.includes('syncReverse') && (requested === 3_200 || requested === 60_000);
    const isTeacherFallback = source.includes('loadTeacherItems') && requested === 120_000;
    if (!isLeaderReverseSync && !isTeacherFallback) return nativeSetInterval(callback, delay, ...args);

    const guardedCallback = (...callbackArgs) => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) return;
      return callback(...callbackArgs);
    };
    return nativeSetInterval(guardedCallback, FALLBACK_INTERVAL, ...args);
  };

  window[GUARD_KEY] = Object.freeze({ fallbackInterval: FALLBACK_INTERVAL });
}
