import React, { useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, RefreshCw, Moon, Droplets, Wind, ThermometerSun } from 'lucide-react';

function weatherGlyph(code, isDay = true) {
  if (isDay === false && [0, 1, 2].includes(code)) return Moon;
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

export default function FocusWeather({ weather, language = 'vi', onRefresh, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const vi = language !== 'en';
  const hasValue = Number.isFinite(weather?.temperature) && Number.isFinite(weather?.code);
  const WeatherIcon = weatherGlyph(weather?.code, weather?.isDay);
  const label = weather?.loading ? (vi ? 'Đang làm mới' : 'Updating')
    : weather?.error ? (hasValue ? (vi ? 'Dữ liệu lần trước' : 'Last known data') : (vi ? 'Không có kết nối thời tiết' : 'Weather unavailable'))
      : hasValue ? focusWeatherDescription(weather?.code, language)
        : (vi ? 'Đang tải thời tiết' : 'Loading weather');
  const time = weather?.updatedAt
    ? new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-GB', { hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone:'Asia/Ho_Chi_Minh' }).format(new Date(weather.updatedAt))
    : '';
  if (compact) return (
    <div className={'bfc-ambient-weather' + (expanded ? ' is-expanded' : '')}>
      <button type="button" className="bfc-ambient-weather__summary" aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        title={vi ? 'Xem thông tin thời tiết chi tiết' : 'Expand weather details'}>
        <WeatherIcon size={18} strokeWidth={1.7} aria-hidden="true"/>
        <strong>{hasValue ? weather.temperature + '°' : '—'}</strong>
        <span>{vi ? 'TP. Hồ Chí Minh' : 'Ho Chi Minh City'}</span>
        <i aria-hidden="true">·</i>
        <span className="bfc-ambient-weather__condition">{label}</span>
      </button>
      {expanded && <div className="bfc-ambient-weather__details">
        {time && <span>{vi ? 'Cập nhật' : 'Updated'} {time}</span>}
        {Number.isFinite(weather?.feelsLike) && <span>{vi ? 'Cảm giác' : 'Feels'} {weather.feelsLike}°</span>}
        {Number.isFinite(weather?.humidity) && <span>{vi ? 'Độ ẩm' : 'Humidity'} {weather.humidity}%</span>}
        {Number.isFinite(weather?.windSpeed) && <span>{vi ? 'Gió' : 'Wind'} {weather.windSpeed} km/h</span>}
        <button type="button" onClick={onRefresh} disabled={Boolean(weather?.loading)}
          aria-label={vi ? 'Làm mới thời tiết' : 'Refresh weather'}>
          <RefreshCw size={14} aria-hidden="true"/> {vi ? 'Làm mới' : 'Refresh'}
        </button>
      </div>}
    </div>
  );

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
      {hasValue && (
        <div className="bfc-weather__metrics">
          {Number.isFinite(weather?.feelsLike) && <span className="bfc-weather__metric" title={vi ? 'Nhiệt độ cảm nhận' : 'Feels like'}>
            <ThermometerSun size={14} aria-hidden="true"/>
            {vi ? 'Cảm giác' : 'Feels'} {weather.feelsLike}°
          </span>}
          {Number.isFinite(weather?.humidity) && <span className="bfc-weather__metric" title={vi ? 'Độ ẩm' : 'Humidity'}>
            <Droplets size={14} aria-hidden="true"/>{weather.humidity}%
          </span>}
          {Number.isFinite(weather?.windSpeed) && <span className="bfc-weather__metric" title={vi ? 'Tốc độ gió' : 'Wind speed'}>
            <Wind size={14} aria-hidden="true"/>{weather.windSpeed} km/h
          </span>}
        </div>
      )}
    </div>
  );
}
