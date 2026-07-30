import { isSupabaseConfigured, supabase } from './supabase.js';

const GUARD_KEY = Symbol.for('bes.brian-team-egress-guard.v3');
const FALLBACK_INTERVAL = 15 * 60 * 1000;
const guardedIntervals = new Map();
const guardedCallbacks = new Set();

function canRefresh() {
  return document.visibilityState !== 'hidden' && navigator.onLine;
}

function safelyRun(callback, args = []) {
  if (!canRefresh()) return;
  try {
    const result = callback(...args);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch { /* the owning bridge keeps its existing error handling */ }
}

function runRealtimeRefresh() {
  guardedCallbacks.forEach((entry) => safelyRun(entry.callback, entry.args));
}

if (typeof window !== 'undefined' && !window[GUARD_KEY]) {
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);

  window.setInterval = (callback, delay, ...args) => {
    const requested = Number(delay || 0);
    let source = '';
    try { source = Function.prototype.toString.call(callback); } catch { /* native callback */ }

    const isLeaderReverseSync = source.includes('syncReverse') && (requested === 3_200 || requested === 60_000);
    const isTeacherFallback = source.includes('loadTeacherItems') && requested === 120_000;
    const isProgressPanelFallback = source.includes('loadRemote') && requested === 5_000;
    const shouldGuard = isLeaderReverseSync || isTeacherFallback || isProgressPanelFallback;
    if (!shouldGuard) return nativeSetInterval(callback, delay, ...args);

    const entry = { callback, args };
    guardedCallbacks.add(entry);
    const guardedCallback = () => safelyRun(callback, args);
    const intervalId = nativeSetInterval(guardedCallback, FALLBACK_INTERVAL);
    guardedIntervals.set(intervalId, entry);
    return intervalId;
  };

  window.clearInterval = (intervalId) => {
    const entry = guardedIntervals.get(intervalId);
    if (entry) {
      guardedCallbacks.delete(entry);
      guardedIntervals.delete(intervalId);
    }
    return nativeClearInterval(intervalId);
  };

  let realtimeChannel = null;
  if (isSupabaseConfigured && supabase) {
    realtimeChannel = supabase
      .channel('bes-brian-team-egress-guard-v3')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'work_hub_items',
      }, runRealtimeRefresh)
      .subscribe();
  }

  const onOnline = () => runRealtimeRefresh();
  window.addEventListener('online', onOnline);

  window[GUARD_KEY] = Object.freeze({
    fallbackInterval: FALLBACK_INTERVAL,
    mode: realtimeChannel ? 'realtime-with-fallback' : 'fallback-only',
    refresh: runRealtimeRefresh,
  });
}