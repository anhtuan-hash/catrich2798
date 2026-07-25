import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalHomeBriefingExpanded.css';

function isoWeekNumber(value) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function CalendarWeekIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="3" />
      <path d="M7.5 3.5v3.25M16.5 3.5v3.25M3.75 9.25h16.5" />
      <path d="M8 13h3M8 16.5h3M14 13h2.25M14 16.5h2.25" />
    </svg>
  );
}

function DayPartIcon({ period }) {
  if (period === 'night') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M18.5 15.65A7.6 7.6 0 0 1 8.35 5.5a7.5 7.5 0 1 0 10.15 10.15Z" />
        <path d="M17.2 5.2h.01M20 8.25h.01" />
      </svg>
    );
  }

  if (period === 'afternoon') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 17.5h16M7 17.5a5 5 0 0 1 10 0" />
        <path d="M12 5v3M5.8 8.1l2.1 2.1M18.2 8.1l-2.1 2.1M3.5 13h3M17.5 13h3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2.2M12 19.05v2.2M2.75 12h2.2M19.05 12h2.2M5.45 5.45 7 7M17 17l1.55 1.55M18.55 5.45 17 7M7 17l-1.55 1.55" />
    </svg>
  );
}

function dayPartFor(date, language) {
  const hour = date.getHours();
  const weekend = [0, 6].includes(date.getDay());
  const secondary = language === 'en'
    ? (weekend ? 'Weekend' : 'Workday')
    : (weekend ? 'Cuối tuần' : 'Ngày làm việc');

  if (hour < 5 || hour >= 19) {
    return {
      period: 'night',
      primary: language === 'en' ? 'Evening' : 'Buổi tối',
      secondary,
    };
  }

  if (hour >= 12) {
    return {
      period: 'afternoon',
      primary: language === 'en' ? 'Afternoon' : 'Buổi chiều',
      secondary,
    };
  }

  return {
    period: 'morning',
    primary: language === 'en' ? 'Morning' : 'Buổi sáng',
    secondary,
  };
}

export default function GlobalHomeBriefingExtras({ route, language = 'vi' }) {
  const [target, setTarget] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setTarget(null);
    if (!route || typeof document === 'undefined') return undefined;

    let frame = 0;
    let cancelled = false;
    let attempts = 0;

    const findTarget = () => {
      if (cancelled) return;
      const node = document.querySelector('.app-shell[data-route] .brian-briefing-bar__context');
      if (node) {
        setTarget(node);
        return;
      }
      attempts += 1;
      if (attempts < 60) frame = window.requestAnimationFrame(findTarget);
    };

    findTarget();
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [route]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const week = useMemo(() => isoWeekNumber(now), [now]);
  const dayPart = useMemo(() => dayPartFor(now, language), [language, now]);

  if (!route || !target) return null;

  const weekPrimary = language === 'en' ? `Week ${week}` : `Tuần ${week}`;
  const weekSecondary = language === 'en'
    ? `Calendar ${now.getFullYear()}`
    : `Lịch ${now.getFullYear()}`;

  return createPortal(
    <>
      <div
        className="brian-briefing-chip brian-briefing-chip--extra brian-briefing-chip--week"
        title={language === 'en' ? `Calendar week ${week}` : `Tuần thứ ${week} của năm ${now.getFullYear()}`}
      >
        <span className="brian-briefing-chip__icon" aria-hidden="true"><CalendarWeekIcon /></span>
        <span className="brian-briefing-chip__body">
          <strong className="brian-briefing-chip__primary">{weekPrimary}</strong>
          <small className="brian-briefing-chip__secondary">{weekSecondary}</small>
        </span>
      </div>

      <div
        className={`brian-briefing-chip brian-briefing-chip--extra brian-briefing-chip--daypart is-${dayPart.period}`}
        title={`${dayPart.primary} · ${dayPart.secondary}`}
      >
        <span className="brian-briefing-chip__icon" aria-hidden="true"><DayPartIcon period={dayPart.period} /></span>
        <span className="brian-briefing-chip__body">
          <strong className="brian-briefing-chip__primary">{dayPart.primary}</strong>
          <small className="brian-briefing-chip__secondary">{dayPart.secondary}</small>
        </span>
      </div>
    </>,
    target,
  );
}
