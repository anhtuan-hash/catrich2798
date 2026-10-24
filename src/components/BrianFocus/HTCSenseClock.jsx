import React from 'react';
import { Sparkles } from 'lucide-react';
import FocusWeather from './FocusWeather.jsx';
import useFocusClock from './useFocusClock.js';

/**
 * Each keyed digit tile remounts only when its value changes.
 * The top shutter briefly turns on its own hinge; the bottom stays readable.
 */
function SenseFlipTile({ value, unit }) {
  return (
    <span key={value} className="bfc-clock-face__tile bfc-clock-face__tile--flip" data-unit={unit}>
      <span className="bfc-clock-face__number">{value}</span>
      <span className="bfc-clock-face__shutter" aria-hidden="true">{value}</span>
      <span className="bfc-clock-face__hinge bfc-clock-face__hinge--left" aria-hidden="true"/>
      <span className="bfc-clock-face__hinge bfc-clock-face__hinge--right" aria-hidden="true"/>
    </span>
  );
}

export default function HTCSenseClock({ language = 'vi', weather, onRefreshWeather }) {
  const vi = language !== 'en';
  const { hours, minutes, dateLabel } = useFocusClock(language);

  return (
    <div className="bfc-clock-card">
      <div className="bfc-clock-card__glint" aria-hidden="true"/>
      <div className="bfc-clock-card__eyebrow">
        <Sparkles size={16} strokeWidth={1.65} aria-hidden="true"/>
        <span>{vi ? 'CHẾ ĐỘ TẬP TRUNG' : 'FOCUS MODE'}</span>
      </div>
      <div className="bfc-clock-card__microcopy" aria-hidden="true">BRIAN / AMBIENT SPACE</div>
      <div className="bfc-clock-face" role="timer" aria-label={`${hours}:${minutes}`} aria-live="off">
        <div className="bfc-clock-face__digits" aria-hidden="true">
          <SenseFlipTile key={hours} value={hours} unit="hours"/>
          <span className="bfc-clock-face__colon">:</span>
          <SenseFlipTile key={minutes} value={minutes} unit="minutes"/>
        </div>
      </div>
      <div className="bfc-clock-date">{dateLabel}</div>
      <div className="bfc-clock-card__rule" aria-hidden="true"/>
      <FocusWeather weather={weather} language={language} onRefresh={onRefreshWeather}/>
      <p className="bfc-clock-card__hint">{vi ? 'Một khoảnh khắc bình yên để tập trung.' : 'A quieter moment to focus.'}</p>
      <div className="bfc-clock-card__accent" aria-hidden="true"/>
    </div>
  );
}
