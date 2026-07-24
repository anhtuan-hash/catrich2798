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

  if (value === 0) {
    return { type: isDay ? 'clear' : 'night', tone: isDay ? 'clear' : 'night', label: vi ? 'Trời quang' : 'Clear' };
  }
  if ([1, 2].includes(value)) {
    return { type: isDay ? 'partly-cloudy' : 'night', tone: isDay ? 'cloudy' : 'night', label: vi ? 'Ít mây' : 'Partly cloudy' };
  }
  if (value === 3) return { type: 'cloudy', tone: 'cloudy', label: vi ? 'Nhiều mây' : 'Cloudy' };
  if ([45, 48].includes(value)) return { type: 'fog', tone: 'cloudy', label: vi ? 'Có sương' : 'Foggy' };
  if ([51, 53, 55, 56, 57].includes(value)) return { type: 'rain', tone: 'rain', label: vi ? 'Mưa phùn' : 'Drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return { type: 'rain', tone: 'rain', label: vi ? 'Có mưa' : 'Rain' };
  if ([71, 73, 75, 77, 85, 86].includes(value)) return { type: 'snow', tone: 'snow', label: vi ? 'Có tuyết' : 'Snow' };
  if ([95, 96, 99].includes(value)) return { type: 'storm', tone: 'storm', label: vi ? 'Có dông' : 'Thunderstorm' };
  return { type: 'unknown', tone: 'neutral', label: vi ? 'Thời tiết' : 'Weather' };
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5v5l3.25 1.9" />
    </svg>
  );
}

function WeatherIcon({ type }) {
  const common = {
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    focusable: false,
  };

  if (type === 'clear') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.75" />
        <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.45 5.45l1.4 1.4M17.15 17.15l1.4 1.4M18.55 5.45l-1.4 1.4M6.85 17.15l-1.4 1.4" />
      </svg>
    );
  }

  if (type === 'night') {
    return (
      <svg {...common}>
        <path d="M18.6 15.35A7.8 7.8 0 0 1 8.65 5.4a7.7 7.7 0 1 0 9.95 9.95Z" />
      </svg>
    );
  }

  if (type === 'partly-cloudy') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="2.8" />
        <path d="M8 3.25v1.2M3.25 8h1.2M4.65 4.65l.85.85M12.35 4.65l-.85.85" />
        <path d="M7.2 18.25h10.05a3.5 3.5 0 0 0 .35-6.98 5.05 5.05 0 0 0-9.6 1.08 3.05 3.05 0 0 0-.8 5.9Z" />
      </svg>
    );
  }

  if (type === 'fog') {
    return (
      <svg {...common}>
        <path d="M6.8 14.6h10.35a3.35 3.35 0 0 0 .35-6.68 4.75 4.75 0 0 0-9.05 1.02A2.95 2.95 0 0 0 6.8 14.6Z" />
        <path d="M5 17.3h14M7 20h10" />
      </svg>
    );
  }

  if (type === 'rain') {
    return (
      <svg {...common}>
        <path d="M6.8 14.3h10.35a3.35 3.35 0 0 0 .35-6.68 4.75 4.75 0 0 0-9.05 1.02A2.95 2.95 0 0 0 6.8 14.3Z" />
        <path d="m8.25 17.1-.8 2M12.3 17.1l-.8 2M16.35 17.1l-.8 2" />
      </svg>
    );
  }

  if (type === 'snow') {
    return (
      <svg {...common}>
        <path d="M6.8 13.8h10.35a3.35 3.35 0 0 0 .35-6.68 4.75 4.75 0 0 0-9.05 1.02A2.95 2.95 0 0 0 6.8 13.8Z" />
        <path d="M8.3 17.3v3M6.95 18.05l2.7 1.5M9.65 18.05l-2.7 1.5M15.7 17.3v3M14.35 18.05l2.7 1.5M17.05 18.05l-2.7 1.5" />
      </svg>
    );
  }

  if (type === 'storm') {
    return (
      <svg {...common}>
        <path d="M6.8 13.8h10.35a3.35 3.35 0 0 0 .35-6.68 4.75 4.75 0 0 0-9.05 1.02A2.95 2.95 0 0 0 6.8 13.8Z" />
        <path d="m12.7 15.8-2.05 3h2l-1.2 2.45 3.55-3.9h-2.2l1.35-1.55Z" />
      </svg>
    );
  }

  if (type === 'cloudy') {
    return (
      <svg {...common}>
        <path d="M6.4 17.3h10.85a3.65 3.65 0 0 0 .38-7.28 5.25 5.25 0 0 0-10 1.12A3.18 3.18 0 0 0 6.4 17.3Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.25v4.5M12 16.25h.01" />
    </svg>
  );
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
  const weatherTemperature = Number.isFinite(weather?.temperature) ? `${Math.round(weather.temperature)}°C` : '--°';
  const apparentTemperature = Number.isFinite(weather?.apparentTemperature)
    ? `${Math.round(weather.apparentTemperature)}°C`
    : null;
  const weatherTitle = weather
    ? `${weather.locationLabel}: ${weatherTemperature}, ${weatherView.label}${apparentTemperature ? `. ${language === 'en' ? 'Feels like' : 'Cảm giác như'} ${apparentTemperature}` : ''}. ${language === 'en' ? 'Select to refresh or use device location.' : 'Nhấn để làm mới hoặc dùng vị trí thiết bị.'}`
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

      <div
        className="brian-briefing-bar__context"
        aria-label={language === 'en' ? 'Current time and weather' : 'Thời gian và thời tiết hiện tại'}
      >
        <div
          className="brian-briefing-chip brian-briefing-chip--time"
          title={clockTitle}
          aria-label={clockTitle}
        >
          <span className="brian-briefing-chip__icon" aria-hidden="true"><ClockIcon /></span>
          <span className="brian-briefing-chip__body">
            <strong className="brian-briefing-chip__primary">{clockTime}</strong>
            <small className="brian-briefing-chip__secondary">{clockDate}</small>
          </span>
        </div>

        <button
          type="button"
          className={`brian-briefing-chip brian-briefing-chip--weather tone-${weatherView.tone} is-${weatherStatus}`}
          onClick={() => loadWeather(true)}
          title={weatherTitle}
          aria-label={weatherTitle}
        >
          <span className="brian-briefing-chip__icon" aria-hidden="true"><WeatherIcon type={weatherView.type} /></span>
          <span className="brian-briefing-chip__body">
            <strong className="brian-briefing-chip__primary">{weatherTemperature}</strong>
            <small className="brian-briefing-chip__secondary">
              {weatherStatus === 'loading'
                ? (language === 'en' ? 'Loading' : 'Đang tải')
                : weatherView.label}
            </small>
          </span>
        </button>
      </div>
    </aside>
  );
}
