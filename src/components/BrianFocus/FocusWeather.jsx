import React from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, RefreshCw } from 'lucide-react';

function weatherGlyph(code) {
  if (code === 0) return Sun;
  if ([1, 2].includes(code)) return CloudSun;
  if (code === 3) return Cloud;
  if ([45, 48].includes(code)) return CloudFog;
  if ([51, 53, 55, 56, 57].includes(code)) return CloudDrizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return Snowflake;
  if ([95, 96, 99].includes(code)) return CloudLightning;
  return CloudSun;
}

export function focusWeatherDescription(code, language = 'vi') {
  const vi = language !== 'en';
  if (code === 0) return vi ? 'Trời quang' : 'Clear sky';
  if ([1, 2].includes(code)) return vi ? 'Ít mây' : 'Partly cloudy';
  if (code === 3) return vi ? 'Nhiều mây' : 'Cloudy';
  if ([45, 48].includes(code)) return vi ? 'Có sương mù' : 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return vi ? 'Mưa phùn' : 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return vi ? 'Có mưa' : 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return vi ? 'Có tuyết' : 'Snow';
  if ([95, 96, 99].includes(code)) return vi ? 'Dông' : 'Thunderstorm';
  return vi ? 'Thời tiết hiện tại' : 'Current weather';
}

export default function FocusWeather({ weather, language = 'vi', onRefresh }) {
  const vi = language !== 'en';
  const hasValue = Number.isFinite(weather?.temperature) && Number.isFinite(weather?.code);
  const WeatherIcon = weatherGlyph(weather?.code);
  const label = weather?.loading ? (vi ? 'Đang làm mới' : 'Updating')
    : weather?.error ? (hasValue ? (vi ? 'Dữ liệu lần trước' : 'Last known data') : (vi ? 'Không có kết nối thời tiết' : 'Weather unavailable'))
      : hasValue ? focusWeatherDescription(weather?.code, language)
        : (vi ? 'Đang tải thời tiết' : 'Loading weather');
  const time = weather?.updatedAt
    ? new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-GB', { hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone:'Asia/Ho_Chi_Minh' }).format(new Date(weather.updatedAt))
    : '';
  return (
    <div className="bfc-weather" aria-label={vi ? 'Thời tiết trực tiếp tại TP. Hồ Chí Minh' : 'Live weather in Ho Chi Minh City'}>
      <span className="bfc-weather__icon"><WeatherIcon size={24} strokeWidth={1.6} aria-hidden="true"/></span>
      <span className="bfc-weather__details">
        <span className="bfc-weather__title">
          <span className="bfc-weather__city">{vi ? 'TP. Hồ Chí Minh' : 'Ho Chi Minh City'}</span>
          <span className={`bfc-weather__live${weather?.error || !hasValue ? ' is-stale' : ''}`}>
            {weather?.error || !hasValue ? (vi ? 'GIÁN ĐOẠN' : 'OFFLINE') : 'LIVE'}
          </span>
        </span>
        <span className="bfc-weather__condition">{label}{time ? ` · ${time}` : ''}</span>
      </span>
      <span className="bfc-weather__temp">{hasValue ? `${weather.temperature}°C` : '—'}</span>
      <button type="button" onClick={onRefresh} disabled={Boolean(weather?.loading)}
        className="bfc-weather__refresh" title={vi ? 'Cập nhật thời tiết' : 'Refresh weather'}
        aria-label={vi ? 'Cập nhật thời tiết' : 'Refresh weather'}>
        <RefreshCw size={15} className={weather?.loading ? 'is-spinning' : ''} aria-hidden="true" />
      </button>
    </div>
  );
}
