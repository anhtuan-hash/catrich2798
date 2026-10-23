import React from 'react';
import { Sparkles } from 'lucide-react';
import FocusWeather from './FocusWeather.jsx';
import useFocusClock from './useFocusClock.js';

export default function HTCSenseClock({ language = 'vi', weather, weatherDescription }) {
  const vi = language !== 'en';
  const { hours, minutes, dateLabel } = useFocusClock(language);

  return (
    <div className="bfc-clock-card">
      <div className="bfc-clock-card__glint" aria-hidden="true"/>
      <div className="bfc-clock-card__eyebrow">
        <Sparkles size={15} strokeWidth={1.65} aria-hidden="true"/>
        <span>{vi ? 'CHẾ ĐỘ TẬP TRUNG' : 'FOCUS MODE'}</span>
      </div>
      <div className="bfc-clock-face" role="timer" aria-label={`${hours}:${minutes}`} aria-live="off">
        <div className="bfc-clock-face__digits" aria-hidden="true">
          <span className="bfc-clock-face__tile">{hours}</span>
          <span className="bfc-clock-face__colon">:</span>
          <span className="bfc-clock-face__tile">{minutes}</span>
        </div>
      </div>
      <div className="bfc-clock-date">{dateLabel}</div>
      <div className="bfc-clock-card__rule" aria-hidden="true"/>
      <FocusWeather weather={weather} description={weatherDescription} language={language}/>
      <p className="bfc-clock-card__hint">{vi ? 'Một khoảnh khắc bình yên để tập trung.' : 'A quieter moment to focus.'}</p>
    </div>
  );
}
