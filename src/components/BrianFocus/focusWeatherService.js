// Shared TP.HCM weather source for Dashboard and Brian Focus.
// One in-flight Open-Meteo request per city, cached for ten minutes.
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=10.7769&longitude=106.7009&current=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh';
const FRESH_MS = 10 * 60 * 1000;
let snapshot = { temperature: null, code: null, updatedAt: 0, loading: false, error: false };
let pending = null;
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn(snapshot));

export const readSharedFocusWeather = () => snapshot;
export const subscribeSharedFocusWeather = fn => {
  listeners.add(fn);
  fn(snapshot);
  return () => listeners.delete(fn);
};
export const isFocusWeatherStale = (at = Date.now()) => !snapshot.updatedAt || at - snapshot.updatedAt >= FRESH_MS;

export async function refreshSharedFocusWeather({ force = false } = {}) {
  if (pending) return pending;
  if (!force && !isFocusWeatherStale()) return snapshot;
  snapshot = { ...snapshot, loading: true, error: false };
  emit();
  pending = (async () => {
    try {
      const response = await fetch(URL);
      if (!response.ok) throw new Error('Open-Meteo unavailable');
      const payload = await response.json();
      const temperature = payload?.current?.temperature_2m;
      const code = payload?.current?.weather_code;
      if (!Number.isFinite(temperature) || !Number.isFinite(code)) throw new Error('Invalid weather response');
      snapshot = { temperature: Math.round(temperature), code, updatedAt: Date.now(), loading: false, error: false };
    } catch {
      // Keep last known weather but indicate an error; no fabricated readings.
      snapshot = { ...snapshot, loading: false, error: true };
    } finally {
      pending = null;
      emit();
    }
    return snapshot;
  })();
  return pending;
}
