// Shared TP.HCM weather source for Dashboard and Brian Focus.
// One in-flight Open-Meteo request per city, cached for ten minutes.
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=10.7769&longitude=106.7009&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m,is_day&hourly=temperature_2m,precipitation_probability,weather_code&forecast_days=2&timezone=Asia%2FHo_Chi_Minh';
const FRESH_MS = 10 * 60 * 1000;
let snapshot = { temperature: null, code: null, feelsLike: null, humidity: null, windSpeed: null, isDay: null, updatedAt: 0, loading: false, error: false, nextHours: [] };
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
      const optional = (value) => Number.isFinite(value) ? Math.round(value) : null;
      // Hourly forecast is supplied by the SAME real Open-Meteo response.
      // Never generate placeholder temperatures or precipitation probabilities.
      const hourly = payload?.hourly;
      const currentHour = String(payload?.current?.time || '').slice(0,13);
      const nextHours = Array.isArray(hourly?.time) ? hourly.time
        .map((time,i) => ({
          time, temperature: optional(hourly.temperature_2m?.[i]),
          probability: optional(hourly.precipitation_probability?.[i]),
          code: optional(hourly.weather_code?.[i]),
        }))
        .filter(item => String(item.time).slice(0,13) >= currentHour && Number.isFinite(item.temperature))
        .slice(0,6) : [];
      snapshot = {
        temperature: Math.round(temperature), code,
        feelsLike: optional(payload?.current?.apparent_temperature),
        humidity: optional(payload?.current?.relative_humidity_2m),
        windSpeed: optional(payload?.current?.wind_speed_10m),
        isDay: payload?.current?.is_day === 1,
        nextHours, updatedAt: Date.now(), loading: false, error: false,
      };
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
