import { useEffect, useState } from 'react';

const STORAGE_PREFIX = 'bfc-atelier-v5:';
const DEFAULTS = Object.freeze({ clockMode: 'sense', autoHide: true });
export function normalizeFocusAppearance(value) {
  return {
    clockMode: value?.clockMode === 'minimal' ? 'minimal' : 'sense',
    autoHide: value?.autoHide !== false,
  };
}
export function readFocusAppearance(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + (userId || 'guest'));
    return raw ? normalizeFocusAppearance(JSON.parse(raw)) : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}
export default function useFocusAppearance(userId) {
  const [preferences, setPreferences] = useState(() => readFocusAppearance(userId));
  useEffect(() => { setPreferences(readFocusAppearance(userId)); }, [userId]);
  const updateAppearance = patch => setPreferences(prev => {
    const next = normalizeFocusAppearance({ ...prev, ...patch });
    try { localStorage.setItem(STORAGE_PREFIX + (userId || 'guest'), JSON.stringify(next)); }
    catch { /* Persist when storage is available; keep in-session selection. */ }
    return next;
  });
  return { appearance: preferences, setAppearance: updateAppearance };
}
