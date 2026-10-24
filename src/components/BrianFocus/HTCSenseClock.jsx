import React, { useEffect, useState } from 'react';
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

function FocusSeconds() {
  const [second, setSecond] = useState(() => new Date().getSeconds());
  useEffect(() => {
    let timeout;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      setSecond(new Date().getSeconds());
      timeout = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 20);
    };
    tick();
    const handleVisibility = () => { if (!document.hidden) { window.clearTimeout(timeout); tick(); } };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { stopped = true; window.clearTimeout(timeout); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);
  return <span className="bfc-clock-seconds" aria-label={'Seconds ' + second}>{String(second).padStart(2, '0')}</span>;
}

export default function HTCSenseClock({ language = 'vi', weather, onRefreshWeather, mode = 'sense' }) {
  const vi = language !== 'en';
  const { hours, minutes, dateLabel } = useFocusClock(language);

  if (mode === 'minimal') return (
    <section className="bfc-clock-card bfc-clock-card--minimal" aria-label={vi ? 'Đồng hồ tập trung' : 'Focus clock'}>
      <div className="bfc-clock-minimal__time" role="timer" aria-label={hours + ':' + minutes} aria-live="off">
        <span>{hours}</span><span className="bfc-clock-minimal__colon">:</span><span>{minutes}</span>
      </div>
      <div className="bfc-clock-minimal__date">{dateLabel}</div>
      <FocusWeather compact weather={weather} language={language} onRefresh={onRefreshWeather}/>
    </section>
  );

  return (
    <div className="bfc-clock-card bfc-clock-card--sense">
      <div className="bfc-clock-card__glint" aria-hidden="true"/>
      <div className="bfc-clock-card__breath" aria-hidden="true"><i/><i/><i/></div>
      <div className="bfc-clock-card__overline" aria-hidden="true">
        <span className="bfc-clock-card__live-dot" />
        {vi ? 'KHÔNG GIAN SỐNG' : 'LIVE AMBIENCE'} <span className="bfc-clock-card__overline-separator">/</span> BRIAN SENSE
      </div>
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
      <div className="bfc-clock-date-row">
        <div className="bfc-clock-date">{dateLabel}</div>
        <FocusSeconds />
      </div>
      <div className="bfc-clock-card__rule" aria-hidden="true"/>
      <FocusWeather compact weather={weather} language={language} onRefresh={onRefreshWeather}/>
      <p className="bfc-clock-card__hint">{vi ? 'Một khoảnh khắc bình yên để tập trung.' : 'A quieter moment to focus.'}</p>
      <div className="bfc-clock-card__accent" aria-hidden="true"/>
      <div className="bfc-clock-card__breathing-guide" aria-hidden="true">
        <span className="bfc-clock-card__breathing-dot" />
        {vi ? 'HÍT THỞ CHẬM · GIỮ NHỊP TẬP TRUNG' : 'BREATHE SLOWLY · STAY IN FLOW'}
      </div>
    </div>
  );
}
