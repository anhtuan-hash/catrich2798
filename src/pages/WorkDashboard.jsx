import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DASHBOARD_SOURCE_EVENTS,
  createEmptyDashboardSnapshot,
  dashboardDueLabel,
  getDashboardDueState,
  loadDashboardSnapshot,
  openDashboardTarget,
} from '../utils/dashboardAggregator.js';
import '../styles/teacher-dashboard-google-authentic.css';
import '../styles/teacher-dashboard-calendar-split.css';
import '../styles/teacher-dashboard-compact-layout.css';
import '../styles/teacher-dashboard-google-colorful.css';
import '../styles/teacher-dashboard-editorial-hero.css';
import DashboardNewsHub from '../components/DashboardNewsHub.jsx';

const COPY = {
  vi: {
    pageTitle: 'Dashboard', hello: 'Xin chào', teacher: 'Giáo viên', leader: 'Tổ trưởng',
    eyebrow: 'Tổng quan hôm nay', lead: 'Theo dõi lịch làm việc và cập nhật thông tin quan trọng trong Dashboard gọn gàng, dễ dàng.',
    calendar: 'Lịch hôm nay', calendarSummary: 'Công việc và sự kiện trong ngày hôm nay',
    openCalendar: 'Mở lịch đầy đủ', refresh: 'Làm mới', refreshing: 'Đang đồng bộ…',
    upcomingEvents: 'Sự kiện sắp tới', activeDays: 'Ngày có lịch',
    nextEvent: 'Sự kiện gần nhất', noUpcoming: 'Chưa có sự kiện sắp tới', selectedDay: 'Công việc hôm nay',
    events: 'sự kiện', noEvents: 'Trống lịch', today: 'Hôm nay', allDay: 'Cả ngày', source: 'Nguồn',
    quickActions: 'Thao tác nhanh',
    emptyCalendar: 'Hôm nay không có công việc hoặc sự kiện.',
    partial: 'Một số nguồn dữ liệu chưa phản hồi. Dashboard vẫn hiển thị phần dữ liệu đã tải được.', retry: 'Thử lại',
    createWork: 'Mở công việc', uploadResource: 'Tải học liệu', textLab: 'Tạo hoạt động', methodsHub: 'Phương pháp giảng dạy', games: 'Mở trò chơi',
    openHomeroom: 'Mở chủ nhiệm', chooseDate: 'Chọn ngày', nearest: 'Xem sự kiện gần nhất',
    currentTime: 'Giờ hiện tại', weather: 'Thời tiết', dateToday: 'Hôm nay', weatherLoading: 'Đang cập nhật',
  },
  en: {
    pageTitle: 'Dashboard', hello: 'Hello', teacher: 'Teacher', leader: 'Team leader',
    eyebrow: 'Today overview', lead: 'Keep your work calendar and important updates together in a clean, easy Dashboard.',
    calendar: 'Today’s schedule', calendarSummary: 'Work and events scheduled for today',
    openCalendar: 'Open full calendar', refresh: 'Refresh', refreshing: 'Syncing…',
    upcomingEvents: 'Upcoming events', activeDays: 'Scheduled days',
    nextEvent: 'Next event', noUpcoming: 'No upcoming events', selectedDay: 'Today’s work',
    events: 'events', noEvents: 'No schedule', today: 'Today', allDay: 'All day', source: 'Source',
    quickActions: 'Quick actions',
    emptyCalendar: 'No work or events scheduled for today.',
    partial: 'Some data sources did not respond. Available data is still shown.', retry: 'Retry',
    createWork: 'Open work', uploadResource: 'Upload resource', textLab: 'Create activity', methodsHub: 'Teaching methods', games: 'Open games',
    openHomeroom: 'Open homeroom', chooseDate: 'Choose a date', nearest: 'View nearest event',
    currentTime: 'Current time', weather: 'Weather', dateToday: 'Today', weatherLoading: 'Updating',
  },
};

const ICON_PATHS = {
  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11Z',
  refresh: 'M17.65 6.35A7.95 7.95 0 0 0 12 4c-4.09 0-7.19 3.72-6.39 7.69l-2.08.67C2.35 7.08 6.38 2 12 2c2.76 0 5.26 1.12 7.07 2.93L22 2v8h-8l3.65-3.65ZM6.35 17.65A7.95 7.95 0 0 0 12 20c4.09 0 7.19-3.72 6.39-7.69l2.08-.67C21.65 16.92 17.62 22 12 22a9.95 9.95 0 0 1-7.07-2.93L2 22v-8h8l-3.65 3.65Z',
  event: 'M16 13h-3v3h-2v-3H8v-2h3V8h2v3h3v2ZM19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11Z',
  folder: 'M10 4H2c-1.1 0-1.99.9-1.99 2L0 18c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-10l-2-2Z',
  task: 'M22 5.18 10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83L20.59 3.77 22 5.18ZM19 19H5V5h9V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-8h-2v8Z',
  school: 'M12 3 1 9l4 2.18v6L12 21l7-3.82v-6L21 10v7h2V9L12 3Zm0 2.18L18.74 9 12 12.82 5.26 9 12 5.18ZM7 12.27l5 2.73 5-2.73v3.73l-5 2.73-5-2.73v-3.73Z',
  apps: 'M4 8h4V4H4v4Zm6 12h4v-4h-4v4Zm-6 0h4v-4H4v4Zm0-6h4v-4H4v4Zm6 0h4v-4h-4v4Zm6-10v4h4V4h-4Zm-6 4h4V4h-4v4Zm6 6h4v-4h-4v4Zm0 6h4v-4h-4v4Z',
  arrow: 'm9.29 6.71 4.59 4.59-4.59 4.59L10.7 17.3l6-6-6-6-1.41 1.41Z',
  warning: 'M1 21h22L12 2 1 21Zm12-3h-2v2h2v-2Zm0-2h-2v-4h2v4Z',
  people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z',
  game: 'M15 7.5V6a3 3 0 0 0-6 0v1.5A5.5 5.5 0 0 0 3.5 13v5.5A2.5 2.5 0 0 0 6 21c.69 0 1.35-.29 1.82-.8L10 17.8h4l2.18 2.4A2.5 2.5 0 0 0 20.5 18.5V13A5.5 5.5 0 0 0 15 7.5ZM11 6a1 1 0 0 1 2 0v1h-2V6Zm-3 9H6v-2H4v-2h2V9h2v2h2v2H8v2Zm7.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  magic: 'M12 2l1.4 3.1L16.5 6.5l-3.1 1.4L12 11l-1.4-3.1L7.5 6.5l3.1-1.4L12 2Zm-7 9 1.05 2.45L8.5 14.5l-2.45 1.05L5 18l-1.05-2.45L1.5 14.5l2.45-1.05L5 11Zm10.3 1.3 6.4 6.4-2 2-6.4-6.4 2-2Z',
  clock: 'M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 11h-5V6h2v5h3v2Z',
};

function Icon({ name, size = 20 }) {
  return <svg className="gd-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={ICON_PATHS[name] || ICON_PATHS.apps} /></svg>;
}
function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isTeachingPeriod(item) {
  const haystack = `${item?.title || ''} ${item?.description || ''} ${item?.sourceLabel || ''}`;
  return /tiết\s*dạy|teaching\s*period|lesson\s*period|thời\s*khóa\s*biểu|timetable/i.test(haystack);
}
function eventTimeLabel(value, t, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || (date.getHours() === 0 && date.getMinutes() === 0)) return t.allDay;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}
function weatherText(code, language) {
  const vi = language === 'vi';
  if (code === 0) return vi ? 'Trời quang' : 'Clear sky';
  if ([1, 2].includes(code)) return vi ? 'Ít mây' : 'Partly cloudy';
  if (code === 3) return vi ? 'Nhiều mây' : 'Cloudy';
  if ([45, 48].includes(code)) return vi ? 'Có sương' : 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return vi ? 'Mưa phùn' : 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return vi ? 'Có mưa' : 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return vi ? 'Có tuyết' : 'Snow';
  if ([95, 96, 99].includes(code)) return vi ? 'Có giông' : 'Thunderstorm';
  return vi ? 'Thời tiết hiện tại' : 'Current weather';
}
function openTtcm(view = 'feed') { window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } })); }
function Empty({ children }) { return <div className="gd-empty"><span><Icon name="calendar" size={24} /></span><p>{children}</p></div>; }
function Surface({ title, subtitle, icon, action, actionLabel, children, id, className = '' }) {
  return <article className={`gd-surface ${className}`} id={id}><header className="gd-surface-header"><div className="gd-surface-heading"><span className="gd-heading-icon"><Icon name={icon} size={20} /></span><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></div>{action ? <button type="button" className="gd-text-button" onClick={action}>{actionLabel}<Icon name="arrow" size={18} /></button> : null}</header><div className="gd-surface-body">{children}</div></article>;
}
function CalendarEvent({ item, language, locale, t }) {
  const state = getDashboardDueState(item.date, item.done);
  return <button type="button" className={`gd-event is-${state}`} onClick={() => openDashboardTarget(item)}><span className="gd-event-time"><strong>{eventTimeLabel(item.date, t, locale)}</strong><small>{dashboardDueLabel(item.date, item.done, language)}</small></span><span className="gd-event-color" aria-hidden="true" /><span className="gd-event-copy"><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}<small>{t.source}: {item.owner || item.sourceLabel}</small></span><Icon name="arrow" size={20} /></button>;
}

function DashboardHeroIllustration() {
  return <svg className="editorial-hero-art" viewBox="0 0 700 430" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="edCalendarBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#0f4fae" /></linearGradient>
      <linearGradient id="edBookBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3277df" /><stop offset="1" stopColor="#0b4ca7" /></linearGradient>
      <linearGradient id="edPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f7f9fc" /></linearGradient>
      <filter id="edShadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#102b4d" floodOpacity=".13" /></filter>
    </defs>
    <ellipse cx="405" cy="391" rx="244" ry="24" fill="#c9d4e3" opacity=".34" />
    <circle cx="405" cy="216" r="188" fill="#edf4ff" />
    <g fill="#85afe9" opacity=".72">{[0,1,2,3,4,5].map((row) => [0,1,2,3,4,5].map((col) => <circle key={`ed-dot-${row}-${col}`} cx={588 + col * 15} cy={80 + row * 15} r="2.25" />))}</g>
    <g filter="url(#edShadow)" transform="translate(278 46)">
      <path d="M30 51 287 65l-7 261-258-12Z" fill="#d8e0ea" opacity=".42" />
      <path d="M18 40 275 54l-7 261-258-12Z" fill="url(#edPaper)" stroke="#cad5e3" strokeWidth="2.4" />
      <path d="M18 40 275 54l-2 60-258-12Z" fill="url(#edCalendarBlue)" />
      {[48,99,150,201,252].map((x) => <g key={x}><line x1={x} y1="13" x2={x - 2} y2={69} stroke="#163d6d" strokeWidth="7" strokeLinecap="round" /><ellipse cx={x - 1} cy="43" rx="7.5" ry="4.5" fill="#eaf2fb" opacity=".9" /></g>)}
      <g stroke="#e2e7ee" strokeWidth="1.4">{[137,174,211,248,285].map((y) => <line key={`ed-h-${y}`} x1="34" y1={y} x2="250" y2={y + 11} />)}{[67,104,141,178,215].map((x) => <line key={`ed-v-${x}`} x1={x} y1="119" x2={x - 5} y2="293" />)}</g>
      <path d="M117 170l12 12 25-28" fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M175 224l12 12 25-28" fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g filter="url(#edShadow)" transform="translate(165 270) rotate(-8 90 54)">
      <rect width="180" height="108" rx="11" fill="url(#edBookBlue)" />
      <path d="M12 92h156" stroke="#77a9ed" strokeWidth="2" opacity=".75" />
      <text x="90" y="48" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800" fontFamily="Arial, sans-serif">GIÁO ÁN</text>
      <text x="90" y="73" textAnchor="middle" fill="#dceaff" fontSize="13" fontWeight="600" fontFamily="Arial, sans-serif">Tuần 1</text>
    </g>
    <g transform="translate(108 265)">
      <ellipse cx="48" cy="117" rx="45" ry="9" fill="#c9d4e3" opacity=".45" />
      <path d="M17 54h64l-7 64H24Z" fill="#f7f4ed" stroke="#d5d9df" strokeWidth="2" />
      <path d="M31 8v57" stroke="#172f4f" strokeLinecap="round" strokeWidth="7" /><path d="M45 2v63" stroke="#2563eb" strokeLinecap="round" strokeWidth="7" /><path d="M60 11v54" stroke="#eaaa34" strokeLinecap="round" strokeWidth="7" />
    </g>
    <g filter="url(#edShadow)" transform="translate(421 294)">
      <rect x="0" y="15" width="94" height="82" rx="18" fill="#fff" stroke="#d2dbe7" strokeWidth="2" />
      <path d="M93 37h20a18 18 0 0 1 0 36H93" fill="none" stroke="#d2dbe7" strokeWidth="3" />
      <text x="47" y="67" textAnchor="middle" fill="#2563eb" fontSize="24" fontWeight="900" fontFamily="Arial, sans-serif">EH</text>
    </g>
    <g transform="translate(553 273)">
      <rect x="0" y="88" width="102" height="17" rx="8.5" fill="#a8c8ef" />
      <rect x="7" y="71" width="95" height="18" rx="9" fill="#5d97df" />
      <rect x="16" y="54" width="88" height="18" rx="9" fill="#326fc4" />
      <rect x="48" y="7" width="43" height="52" rx="10" fill="#274d79" />
      <path d="M58 18c-14-31-28 1-15 24 9-19 18-16 15-24Zm17 2c10-32 31-10 20 19-11-17-20-10-20-19Zm-5 10c-1-31-25-22-24 6 10-13 18-9 24-6Z" fill="#4ba86b" />
    </g>
    <path d="M160 80l7 16 16 7-16 7-7 16-7-16-16-7 16-7 7-16Z" fill="#fff" opacity=".98" />
  </svg>;
}

export default function WorkDashboard({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [snapshot, setSnapshot] = useState(() => createEmptyDashboardSnapshot(currentUser));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState({ temperature: null, code: null, loading: true });
  const lastRefreshRef = useRef(0);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const next = await loadDashboardSnapshot(currentUser);
      setSnapshot(next);
      lastRefreshRef.current = Date.now();
      if (next.sourceErrors?.length) setError(next.sourceErrors.map((item) => `${item.source}: ${item.message}`).join(' · '));
    } catch (reason) {
      setError(reason?.message || String(reason));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  const refreshWeather = useCallback(async () => {
    setWeather((current) => ({ ...current, loading: true }));
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=10.7769&longitude=106.7009&current=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh');
      if (!response.ok) throw new Error('weather unavailable');
      const payload = await response.json();
      setWeather({
        temperature: Number.isFinite(payload?.current?.temperature_2m) ? Math.round(payload.current.temperature_2m) : null,
        code: Number.isFinite(payload?.current?.weather_code) ? payload.current.weather_code : null,
        loading: false,
      });
    } catch {
      setWeather((current) => ({ ...current, loading: false }));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { refreshWeather(); }, [refreshWeather]);
  useEffect(() => {
    let refreshTimer = 0;
    const queueUpdate = () => { window.clearTimeout(refreshTimer); refreshTimer = window.setTimeout(() => refresh({ quiet: true }), 450); };
    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      if (lastRefreshRef.current && Date.now() - lastRefreshRef.current < 10 * 60 * 1000) return;
      queueUpdate();
    };
    DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.addEventListener(eventName, queueUpdate));
    window.addEventListener('storage', queueUpdate);
    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.removeEventListener(eventName, queueUpdate));
      window.removeEventListener('storage', queueUpdate);
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
      window.clearTimeout(refreshTimer);
    };
  }, [refresh]);

  const timeline = useMemo(() => (snapshot.timeline || []).filter((item) => !isTeachingPeriod(item)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [snapshot.timeline]);
  const name = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || t.teacher;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const todayKey = dateKey(now);
  const todayDate = useMemo(() => {
    const value = new Date(now);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [todayKey]);
  const todayEvents = useMemo(() => timeline.filter((item) => dateKey(item.date) === todayKey), [timeline, todayKey]);
  const todayWeekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(todayDate);
  const todayDateLabel = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(todayDate);
  const initialLoading = loading && !snapshot.generatedAt;
  const nextEvent = timeline.find((item) => new Date(item.date).getTime() >= Date.now()) || timeline[0] || null;
  const heroTime = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(now);
  const heroDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'short' }).format(now);
  const weatherDescription = weather.code == null ? t.weatherLoading : weatherText(weather.code, language);
  const weatherTemperature = weather.temperature == null ? '—°C' : `${weather.temperature}°C`;
  const quickActions = [
    ['task', t.createWork, 'ttcm:feed'], ['folder', t.uploadResource, '#/resource-library'], ['magic', t.textLab, '#/tool/textlab-activities'],
    ['school', t.methodsHub, '#/tool/teaching-methods-hub'], ['game', t.games, '#/games'], ...(snapshot.homeroom ? [['people', t.openHomeroom, '#/homeroom']] : []),
  ];

  const scrollToCalendar = () => document.querySelector('#dashboard-calendar')?.scrollIntoView({ behavior: 'auto', block: 'start' });
  const focusNearestEvent = () => {
    if (nextEvent?.date && dateKey(nextEvent.date) !== todayKey) {
      openTtcm('schedule');
      return;
    }
    scrollToCalendar();
  };
  const focusToday = () => scrollToCalendar();

  return <section className={`gd-page${initialLoading ? ' is-loading' : ''}`} aria-label={t.pageTitle} aria-busy={loading}>
    <div className="gd-shell">
      <section className="gd-top-grid">
        <header className="editorial-hero">
          <div className="editorial-hero-copy">
            <div className="editorial-hero-meta">
              <span className="editorial-hero-eyebrow"><span aria-hidden="true" />{t.eyebrow}</span>
              <span className="editorial-hero-date">{heroDate}</span>
            </div>

            <div className="editorial-hero-heading">
              <span className="editorial-hero-hello">{t.hello},</span>
              <h1>{name}<span className="editorial-hero-wave" aria-hidden="true">👋</span></h1>
            </div>

            <p className="editorial-hero-lead">{t.lead}</p>

            <div className="editorial-hero-actions">
              <button type="button" className="editorial-primary-action" onClick={scrollToCalendar}><Icon name="calendar" size={20} /><span>{t.calendar}</span><Icon name="arrow" size={18} /></button>
              <button type="button" className="editorial-secondary-action" onClick={() => refresh()} disabled={loading}><Icon name="refresh" size={19} /><span>{loading ? t.refreshing : t.refresh}</span></button>
            </div>

            <div className="editorial-hero-links">
              <button type="button" onClick={focusNearestEvent}><Icon name="event" size={17} /><span>{t.nearest}</span><Icon name="arrow" size={15} /></button>
              <button type="button" onClick={() => openTtcm('schedule')}><Icon name="calendar" size={17} /><span>{t.openCalendar}</span><Icon name="arrow" size={15} /></button>
            </div>
          </div>

          <div className="editorial-hero-stage">
            <div className="editorial-hero-status" aria-label={language === 'vi' ? 'Thông tin nhanh' : 'Quick information'}>
              <button type="button" className="editorial-status-card editorial-status-time" onClick={() => setNow(new Date())} title={t.currentTime}>
                <span className="editorial-status-icon"><Icon name="clock" size={18} /></span>
                <span><small>{t.currentTime}</small><strong>{heroTime}</strong></span>
              </button>
              <button type="button" className="editorial-status-card editorial-status-weather" onClick={refreshWeather} title={t.weather}>
                <span className="editorial-weather-symbol" aria-hidden="true">☀</span>
                <span><small>{weather.loading ? t.weatherLoading : weatherDescription}</small><strong>TP.HCM · {weatherTemperature}</strong></span>
              </button>
            </div>
            <div className="editorial-hero-visual"><DashboardHeroIllustration /></div>
            <button type="button" className="editorial-today-chip" onClick={focusToday} title={t.dateToday}><Icon name="calendar" size={17} /><span>{t.dateToday}</span><strong>{new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(now)}</strong></button>
          </div>
        </header>
      </section>
      {error ? <div className="gd-alert"><Icon name="warning" size={22} /><div><strong>{t.partial}</strong><small>{error}</small></div><button type="button" className="gd-text-button" onClick={() => refresh()}>{t.retry}</button></div> : null}
      <article className="gd-calendar gd-calendar-today" id="dashboard-calendar">
        <header className="gd-calendar-header"><div className="gd-calendar-title"><span><Icon name="calendar" size={22} /></span><div><h2>{t.calendar}</h2><p>{t.calendarSummary}</p></div></div><button type="button" className="gd-text-button" onClick={() => openTtcm('schedule')}>{t.openCalendar}<Icon name="arrow" size={18} /></button></header>
        <div className="gd-today-layout">
          <header className="gd-today-overview">
            <div className="gd-today-date-mark"><strong>{todayDate.getDate()}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(todayDate)}</span></div>
            <div className="gd-today-heading"><span>{t.selectedDay}</span><h3>{todayWeekday}</h3><p>{todayDateLabel}</p></div>
            <span className="gd-count-chip">{todayEvents.length} {t.events}</span>
          </header>
          <div className="gd-agenda-list gd-agenda-list-today">{initialLoading ? <Empty>{t.refreshing}</Empty> : todayEvents.length ? todayEvents.map((item) => <CalendarEvent key={item.id} item={item} language={language} locale={locale} t={t} />) : <Empty>{t.emptyCalendar}</Empty>}</div>
        </div>
      </article>
      <DashboardNewsHub language={language} />
      <Surface title={t.quickActions} icon="apps" className="gd-quick-surface"><div className="gd-quick-actions">{quickActions.map(([icon, label, target]) => <button type="button" key={label} className="gd-quick-action" onClick={() => { if (String(target).startsWith('ttcm:')) openTtcm(String(target).split(':')[1] || 'feed'); else window.location.hash = target; }}><span><Icon name={icon} size={20} /></span>{label}</button>)}</div></Surface>
    </div>
  </section>;
}
