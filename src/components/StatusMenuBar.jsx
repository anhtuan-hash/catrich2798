import { useCallback, useEffect, useMemo, useState } from 'react';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './StatusMenuBar.css';
import './StatusMenuBarUnified.css';

const MAX_HEADLINES = 8;
const WEATHER_CACHE_KEY = 'bes-briefing-weather-v1';
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const WEATHER_CACHE_MAX_AGE = 30 * 60 * 1000;

function feedCategory(language) {
  return language === 'en' ? 'top' : 'all';
}

function feedCacheKey(language) {
  const channel = language === 'en' ? 'en' : 'vi';
  return `bes-news-feed:${channel}:${feedCategory(channel)}`;
}

function readCachedHeadlines(language) {
  try {
    const raw = window.sessionStorage.getItem(feedCacheKey(language));
    const parsed = raw ? JSON.parse(raw) : null;
    const items = parsed?.data?.items;
    return Array.isArray(items) ? items.slice(0, MAX_HEADLINES) : [];
  } catch {
    return [];
  }
}

function readCachedWeather() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
    if (!parsed?.savedAt || Date.now() - Number(parsed.savedAt) > WEATHER_CACHE_MAX_AGE) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedWeather(value) {
  try {
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Weather remains available for the current session when storage is blocked.
  }
}

function compactTime(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function fallbackCoordinates(language) {
  return {
    latitude: 10.8231,
    longitude: 106.6297,
    precise: false,
    locationLabel: language === 'en' ? 'Ho Chi Minh City' : 'TP.HCM',
  };
}

function currentDevicePosition(language) {
  const fallback = fallbackCoordinates(language);
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(fallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        precise: true,
        locationLabel: language === 'en' ? 'Current location' : 'Vị trí hiện tại',
      }),
      () => resolve(fallback),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

async function resolveWeatherCoordinates(language, requestPrecise) {
  const fallback = fallbackCoordinates(language);
  if (typeof navigator === 'undefined' || !navigator.geolocation) return fallback;
  if (requestPrecise) return currentDevicePosition(language);

  try {
    if (!navigator.permissions?.query) return fallback;
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state === 'granted') return currentDevicePosition(language);
  } catch {
    // Safari and some browsers do not expose geolocation through Permissions API.
  }

  return fallback;
}

function weatherPresentation(code, isDay, language) {
  const value = Number(code);
  const vi = language !== 'en';

  if (value === 0) return { icon: isDay ? '☀' : '☾', label: vi ? 'Trời quang' : 'Clear' };
  if ([1, 2].includes(value)) return { icon: isDay ? '⛅' : '☾', label: vi ? 'Ít mây' : 'Partly cloudy' };
  if (value === 3) return { icon: '☁', label: vi ? 'Nhiều mây' : 'Cloudy' };
  if ([45, 48].includes(value)) return { icon: '≋', label: vi ? 'Có sương' : 'Foggy' };
  if ([51, 53, 55, 56, 57].includes(value)) return { icon: '☂', label: vi ? 'Mưa phùn' : 'Drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return { icon: '☂', label: vi ? 'Có mưa' : 'Rain' };
  if ([71, 73, 75, 77, 85, 86].includes(value)) return { icon: '❄', label: vi ? 'Có tuyết' : 'Snow' };
  if ([95, 96, 99].includes(value)) return { icon: '⚡', label: vi ? 'Có dông' : 'Thunderstorm' };
  return { icon: '◌', label: vi ? 'Thời tiết' : 'Weather' };
}

function TickerItem({ sourceLine, headline }) {
  return (
    <span className="brian-briefing-bar__ticker-item">
      <span className="brian-briefing-bar__source">{sourceLine}</span>
      <span className="brian-briefing-bar__separator" aria-hidden="true">•</span>
      <strong>{headline}</strong>
      <span className="brian-briefing-bar__google-dots" aria-hidden="true"><i /><i /><i /><i /></span>
    </span>
  );
}

export default function StatusMenuBar({
  currentUser,
  language = 'vi',
  route = 'home',
}) {
  const channel = language === 'en' ? 'en' : 'vi';
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const allowed = useMemo(
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'news')),
    [currentUser],
  );
  const [items, setItems] = useState(() => (typeof window === 'undefined' ? [] : readCachedHeadlines(channel)));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState(() => (typeof window === 'undefined' ? null : readCachedWeather()));
  const [weatherStatus, setWeatherStatus] = useState(() => (weather ? 'ready' : 'loading'));

  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const timer = window.setInterval(refreshClock, 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadWeather = useCallback(async (requestPrecise = false) => {
    setWeatherStatus((current) => (current === 'ready' ? 'refreshing' : 'loading'));
    try {
      const coordinates = await resolveWeatherCoordinates(language, requestPrecise);
      const params = new URLSearchParams({
        latitude: String(coordinates.latitude),
        longitude: String(coordinates.longitude),
      });
      const response = await fetch(`/api/briefing-weather?${params.toString()}`, {
        headers: { accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.current) throw new Error(payload?.error || 'Weather unavailable');

      const next = {
        savedAt: Date.now(),
        locationLabel: coordinates.locationLabel,
        precise: coordinates.precise,
        timezone: payload.timezone || '',
        temperature: Number(payload.current.temperature),
        apparentTemperature: Number(payload.current.apparentTemperature),
        weatherCode: Number(payload.current.weatherCode),
        isDay: Boolean(payload.current.isDay),
      };
      setWeather(next);
      saveCachedWeather(next);
      setWeatherStatus('ready');
    } catch {
      setWeatherStatus((current) => (current === 'refreshing' || current === 'ready' ? 'ready' : 'error'));
    }
  }, [language]);

  useEffect(() => {
    loadWeather(false);
    const timer = window.setInterval(() => loadWeather(false), WEATHER_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadWeather]);

  useEffect(() => {
    setIndex(0);
    if (!allowed || typeof window === 'undefined') return undefined;

    const cached = readCachedHeadlines(channel);
    setItems(cached);

    const controller = new AbortController();
    const category = feedCategory(channel);

    fetch(`/api/news-feed?language=${encodeURIComponent(channel)}&category=${encodeURIComponent(category)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        const next = Array.isArray(data.items) ? data.items.slice(0, MAX_HEADLINES) : [];
        if (next.length) {
          setItems(next);
          try {
            window.sessionStorage.setItem(feedCacheKey(channel), JSON.stringify({ savedAt: Date.now(), data }));
          } catch { /* cache is optional */ }
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError' && !cached.length) setItems([]);
      });

    return () => controller.abort();
  }, [allowed, channel]);

  if (!allowed) return null;

  const item = items.length ? items[index % items.length] : null;
  const fallback = language === 'en'
    ? 'Open News to see the latest education and English-language headlines.'
    : 'Mở Đọc báo để xem các tin giáo dục và tiếng Anh mới nhất.';
  const headline = item?.title || fallback;
  const source = item?.source || 'English Hub News';
  const time = compactTime(item?.publishedAt, language);
  const sourceLine = `${source}${time ? ` · ${time}` : ''}`;
  const tickerSeconds = Math.max(17, Math.min(38, Math.ceil((headline.length + sourceLine.length) / 5.4)));
  const clockTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  const clockDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(now);
  const clockTitle = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  const weatherView = weatherPresentation(weather?.weatherCode, weather?.isDay, language);
  const weatherTemperature = Number.isFinite(weather?.temperature) ? `${Math.round(weather.temperature)}°` : '--°';
  const weatherTitle = weather
    ? `${weather.locationLabel}: ${weatherTemperature}, ${weatherView.label}. ${language === 'en' ? 'Feels like' : 'Cảm giác như'} ${Math.round(weather.apparentTemperature)}°. ${language === 'en' ? 'Select to refresh or use device location.' : 'Nhấn để làm mới hoặc dùng vị trí thiết bị.'}`
    : (language === 'en' ? 'Weather is loading. Select to use device location.' : 'Đang tải thời tiết. Nhấn để dùng vị trí thiết bị.');

  const openNews = (event) => launchRoute({
    target: '#/news',
    label: language === 'en' ? 'NEWS' : 'TIN',
    color: '#1a73e8',
    sourceEl: event.currentTarget,
  });

  const advance = () => {
    if (items.length < 2) return;
    setIndex((current) => (current + 1) % items.length);
  };

  return (
    <aside
      className={`brian-briefing-bar ${route === 'news' ? 'is-news-route' : ''} ${paused ? 'is-paused' : ''}`}
      aria-label={language === 'en' ? 'News briefing, time and weather' : 'Tin vắn, thời gian và thời tiết'}
      style={{ '--briefing-duration': `${tickerSeconds}s` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <button
        type="button"
        className="brian-briefing-bar__headline"
        onClick={openNews}
        title={`${sourceLine} — ${headline}`}
        aria-label={`${sourceLine}. ${headline}`}
      >
        <span className="brian-briefing-bar__ticker-viewport" aria-hidden="true">
          <span
            key={`${item?.id || item?.link || index}-${index}`}
            className="brian-briefing-bar__ticker-track"
            onAnimationIteration={advance}
          >
            <TickerItem sourceLine={sourceLine} headline={headline} />
          </span>
        </span>
      </button>

      <div className="brian-briefing-bar__context" aria-label={language === 'en' ? 'Current time and weather' : 'Thời gian và thời tiết hiện tại'}>
        <div className="brian-briefing-bar__clock" title={clockTitle} aria-label={clockTitle}>
          <span aria-hidden="true">◷</span>
          <strong>{clockTime}</strong>
          <small>{clockDate}</small>
        </div>
        <button
          type="button"
          className={`brian-briefing-bar__weather is-${weatherStatus}`}
          onClick={() => loadWeather(true)}
          title={weatherTitle}
          aria-label={weatherTitle}
        >
          <span aria-hidden="true">{weatherView.icon}</span>
          <strong>{weatherTemperature}</strong>
          <small>{weatherStatus === 'loading' ? (language === 'en' ? 'Loading' : 'Đang tải') : weatherView.label}</small>
        </button>
      </div>
    </aside>
  );
}
