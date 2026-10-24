import { useEffect, useMemo, useState } from 'react';

// Timer deadlines are absolute, so background tabs and laptop sleep do not
// distort elapsed time. Persistent storage is scoped to each signed-in user.
export const FOCUS_TIMER_PRESETS = Object.freeze({
  pomodoro: 25, short: 5, recovery: 10, long: 15, deep: 50, custom: 30,
});
const MAX_MS = 180 * 60_000;

export function remainingFocusMs(timer, now = Date.now()) {
  const original = Math.max(0, Math.min(MAX_MS, Number(timer?.remainingMs) || 0));
  return timer?.running
    ? Math.max(0, Math.min(MAX_MS, Number(timer?.deadline) - now || 0))
    : original;
}
export function formatFocusDuration(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' + String(seconds % 60).padStart(2, '0');
}
export function focusTimerStoreKey(userId) {
  return 'bfc-timer-v4:' + String(userId || 'guest');
}
export function recoverFocusTimer(userId) {
  const defaults = { mode: 'pomodoro', minutes: 25, remainingMs: 25*60_000, running: false, deadline: 0 };
  if (!userId || typeof localStorage === 'undefined') return defaults;
  try {
    const raw = JSON.parse(localStorage.getItem(focusTimerStoreKey(userId)) || 'null');
    if (!raw || !Number.isFinite(raw.remainingMs) || raw.remainingMs < 0 || raw.remainingMs > MAX_MS) return defaults;
    const mode = Object.hasOwn(FOCUS_TIMER_PRESETS, raw.mode) ? raw.mode : 'pomodoro';
    const minutes = Math.max(1, Math.min(180, Number(raw.minutes) || FOCUS_TIMER_PRESETS[mode]));
    const current = { mode, minutes, remainingMs: raw.remainingMs, running: !!raw.running, deadline: Number(raw.deadline) || 0 };
    if (current.running && current.deadline <= Date.now()) {
      return { ...current, running: false, remainingMs: 0, deadline: 0 };
    }
    return current;
  } catch { return defaults; }
}

export default function useFocusTimer(userId, onComplete) {
  const [timer, setTimer] = useState(() => recoverFocusTimer(userId));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setTimer(recoverFocusTimer(userId));
  }, [userId]);
  useEffect(() => {
    if (!userId || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(focusTimerStoreKey(userId), JSON.stringify(timer)); } catch { /* storage optional */ }
  }, [timer, userId]);
  useEffect(() => {
    if (!timer.running) return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [timer.running]);
  useEffect(() => {
    if (!timer.running || timer.deadline > now) return;
    setTimer(value => {
      if (!value.running || value.deadline > Date.now()) return value;
      return { ...value, running: false, remainingMs: 0, deadline: 0 };
    });
    onComplete?.();
  }, [now, timer.deadline, timer.running, onComplete]);
  const remainingMs = useMemo(() => remainingFocusMs(timer, now), [timer, now]);
  const setPreset = (mode, requestedMinutes) => {
    const minutes = Math.min(180, Math.max(1, Math.round(Number(requestedMinutes) || FOCUS_TIMER_PRESETS[mode] || 25)));
    setTimer({ mode, minutes, remainingMs: minutes * 60_000, running: false, deadline: 0 });
  };
  const start = () => {
    setNow(Date.now());
    setTimer(value => ({ ...value, remainingMs: value.remainingMs || value.minutes*60_000, running: true,
      deadline: Date.now() + (value.remainingMs || value.minutes*60_000) }));
  };
  const pause = () => setTimer(value => ({ ...value, running: false, remainingMs: remainingFocusMs(value), deadline: 0 }));
  const reset = () => setTimer(value => ({ ...value, running: false, remainingMs: value.minutes*60_000, deadline: 0 }));
  return { timer, remainingMs, formatted: formatFocusDuration(remainingMs), setPreset, start, pause, reset };
}
