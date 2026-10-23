import React from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react';

/** Visual-only reuse of Dashboard's existing Open-Meteo result. No API calls. */
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

export default function FocusWeather({ weather, description, language = 'vi' }) {
  const vi = language !== 'en';
  const temperature = Number.isFinite(weather?.temperature) ? `${Math.round(weather.temperature)}°` : '—°';
  const WeatherIcon = weatherGlyph(weather?.code);
  const condition = weather?.code != null ? description
    : weather?.loading ? (vi ? 'Đang cập nhật thời tiết' : 'Updating weather')
      : (vi ? 'Chưa có dữ liệu thời tiết' : 'Weather unavailable');

  return (
    <div className="bfc-weather" aria-label={vi ? 'Thời tiết TP. Hồ Chí Minh' : 'Ho Chi Minh City weather'}>
      <span className="bfc-weather__icon"><WeatherIcon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
      <span className="bfc-weather__details">
        <span className="bfc-weather__city">{vi ? 'TP. Hồ Chí Minh' : 'Ho Chi Minh City'}</span>
        <span className="bfc-weather__condition">{condition}</span>
      </span>
      <span className="bfc-weather__temp">{temperature}</span>
    </div>
  );
}
