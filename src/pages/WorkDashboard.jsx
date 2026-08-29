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
import '../styles/teacher-dashboard-hero-interactive-2026.css';
import DashboardNewsHub from '../components/DashboardNewsHub.jsx';

const COPY = {
  vi: {
    pageTitle: 'Dashboard', hello: 'Xin chào', teacher: 'Giáo viên', leader: 'Tổ trưởng',
    eyebrow: 'Tổng quan hôm nay', lead: 'Theo dõi lịch làm việc và cập nhật thông tin quan trọng trong Dashboard gọn gàng, dễ dàng.',
    calendar: 'Lịch làm việc tuần này', calendarSummary: '7 ngày gần nhất · Không hiển thị tiết dạy',
    openCalendar: 'Mở lịch đầy đủ', refresh: 'Làm mới', refreshing: 'Đang đồng bộ…',
    upcomingEvents: 'Sự kiện sắp tới', activeDays: 'Ngày có lịch',
    nextEvent: 'Sự kiện gần nhất', noUpcoming: 'Chưa có sự kiện sắp tới', selectedDay: 'Công việc trong ngày',
    events: 'sự kiện', noEvents: 'Trống lịch', today: 'Hôm nay', allDay: 'Cả ngày', source: 'Nguồn',
    quickActions: 'Thao tác nhanh',
    emptyCalendar: 'Không có công việc hoặc sự kiện trong ngày này.',
    partial: 'Một số nguồn dữ liệu chưa phản hồi. Dashboard vẫn hiển thị phần dữ liệu đã tải được.', retry: 'Thử lại',
    createWork: 'Mở công việc', uploadResource: 'Tải học liệu', textLab: 'Tạo hoạt động', methodsHub: 'Phương pháp giảng dạy', games: 'Mở trò chơi',
    openHomeroom: 'Mở chủ nhiệm', chooseDate: 'Chọn ngày', nearest: 'Xem sự kiện gần nhất',
    currentTime: 'Giờ hiện tại', weather: 'Thời tiết', dateToday: 'Hôm nay', weatherLoading: 'Đang cập nhật',
  },
  en: {
    pageTitle: 'Dashboard', hello: 'Hello', teacher: 'Teacher', leader: 'Team leader',
    eyebrow: 'Today overview', lead: 'Keep your work calendar and important updates together in a clean, easy Dashboard.',
    calendar: 'This week', calendarSummary: 'Next 7 days · Teaching periods are hidden',
    openCalendar: 'Open full calendar', refresh: 'Refresh', refreshing: 'Syncing…',
    upcomingEvents: 'Upcoming events', activeDays: 'Scheduled days',
    nextEvent: 'Next event', noUpcoming: 'No upcoming events', selectedDay: 'Work for this day',
    events: 'events', noEvents: 'No schedule', today: 'Today', allDay: 'All day', source: 'Source',
    quickActions: 'Quick actions',
    emptyCalendar: 'No work or events on this day.',
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
  return <svg className="gd-hero-illustration" viewBox="0 0 650 430" aria-hidden="true">
    <defs>
      <linearGradient id="gdHeroBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a9cf8" /><stop offset="1" stopColor="#1769d8" /></linearGradient>
      <linearGradient id="gdHeroPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#eef5ff" /></linearGradient>
      <linearGradient id="gdHeroDesk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f8ead7" /><stop offset="1" stopColor="#efe0cb" /></linearGradient>
    </defs>
    <ellipse cx="376" cy="394" rx="244" ry="27" fill="#c9d9ec" opacity=".42" />
    <path d="M147 338c21-43 66-69 113-62 25-55 86-85 143-64 51-50 139-45 184 12 45 57 24 143-39 175H188c-43-14-61-39-41-61Z" fill="#e5f0ff" />
    <g transform="translate(287 63)">
      <rect x="0" y="32" width="245" height="235" rx="23" fill="url(#gdHeroPaper)" stroke="#b8d2f2" strokeWidth="3" />
      <rect x="0" y="32" width="245" height="58" rx="23" fill="url(#gdHeroBlue)" />
      <rect x="0" y="72" width="245" height="18" fill="url(#gdHeroBlue)" />
      {[25, 72, 119, 166].map((x) => <line key={`ring-${x}`} x1={x} y1="5" x2={x} y2="48" stroke="#214d83" strokeWidth="7" strokeLinecap="round" />)}
      {[26, 64, 102, 140, 178, 216].map((x) => [114,151,188,225].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="25" height="22" rx="8" fill="#e8f1ff" />))}
      <path d="M108 157l9 9 19-21" fill="none" stroke="#2ea75f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M174 195l9 9 19-21" fill="none" stroke="#2ea75f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="217" cy="55" r="6" fill="#d7e8ff" />
    </g>
    <g transform="translate(194 309)">
      <rect width="142" height="92" rx="14" fill="#2a73dc" transform="rotate(-10 71 46)" />
      <text x="71" y="47" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="800" transform="rotate(-10 71 46)">GIÁO ÁN</text>
      <text x="71" y="70" textAnchor="middle" fill="#dbeaff" fontSize="13" transform="rotate(-10 71 46)">Tuần 1</text>
    </g>
    <g transform="translate(436 313)">
      <rect x="0" y="20" width="92" height="77" rx="16" fill="#fff" stroke="#d1e1f2" strokeWidth="2" />
      <path d="M91 39h17a19 19 0 0 1 0 38H91" fill="none" stroke="#fff" strokeWidth="14" />
      <path d="M91 39h17a19 19 0 0 1 0 38H91" fill="none" stroke="#d1e1f2" strokeWidth="2" />
      <text x="46" y="67" textAnchor="middle" fill="#1967d2" fontSize="23" fontWeight="900">EH</text>
    </g>
    <g transform="translate(528 273)">
      <rect x="0" y="82" width="102" height="18" rx="9" fill="#80b4f1" />
      <rect x="8" y="65" width="94" height="18" rx="9" fill="#4b8be0" />
      <rect x="17" y="49" width="87" height="17" rx="8" fill="#2f72cf" />
      <rect x="48" y="0" width="44" height="55" rx="11" fill="#29578c" />
      <path d="M58 7c-15-31-28 2-15 24 9-20 18-16 15-24Zm17 3c9-32 31-11 20 19-11-17-20-10-20-19Zm-5 9c-1-30-25-22-24 6 10-13 18-9 24-6Z" fill="#37a75f" />
    </g>
    <g transform="translate(120 235)">
      <rect x="0" y="0" width="57" height="92" rx="15" fill="#f2f7ff" stroke="#bcd5f5" strokeWidth="2" />
      <path d="M16 18h25M16 37h25M16 56h17" stroke="#4c8fe9" strokeWidth="6" strokeLinecap="round" />
      <circle cx="45" cy="73" r="7" fill="#f6a800" />
    </g>
    <g transform="translate(148 332)">
      <ellipse cx="42" cy="64" rx="42" ry="10" fill="#cbd9e9" opacity=".55" />
      <rect x="18" y="12" width="48" height="58" rx="12" fill="#e8f4ff" />
      <rect x="27" y="-18" width="6" height="41" rx="3" fill="#1e6bd6" transform="rotate(-7 30 2)" />
      <rect x="39" y="-22" width="6" height="45" rx="3" fill="#f5b229" />
      <rect x="51" y="-14" width="6" height="38" rx="3" fill="#376fb8" transform="rotate(8 54 4)" />
    </g>
    <g fill="#74a9ed"><circle cx="225" cy="89" r="4" /><circle cx="243" cy="89" r="4" /><circle cx="261" cy="89" r="4" /><circle cx="225" cy="107" r="4" /><circle cx="243" cy="107" r="4" /><circle cx="261" cy="107" r="4" /></g>
    <path d="M184 74l7 16 16 7-16 7-7 16-7-16-16-7 16-7 7-16Z" fill="#fff" opacity=".95" />
  </svg>;
}

export default function WorkDashboard({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [snapshot, setSnapshot] = useState(() => createEmptyDashboardSnapshot(currentUser));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
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
  const calendarDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + index);
    const key = dateKey(date); return { date, key, events: timeline.filter((item) => dateKey(item.date) === key) };
  }), [timeline]);
  const selectedCalendarDay = useMemo(() => calendarDays.find((day) => day.key === selectedDay) || calendarDays[0], [calendarDays, selectedDay]);
  const selectedEvents = selectedCalendarDay?.events || [];
  const name = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || t.teacher;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const todayKey = dateKey(new Date());
  const selectedWeekday = selectedCalendarDay ? new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selectedCalendarDay.date) : '';
  const selectedDate = selectedCalendarDay ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(selectedCalendarDay.date) : '';
  const calendarRange = calendarDays.length ? `${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(calendarDays[0].date)} — ${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(calendarDays[calendarDays.length - 1].date)}` : '';
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
    if (nextEvent?.date) setSelectedDay(dateKey(nextEvent.date));
    scrollToCalendar();
  };
  const focusToday = () => {
    setSelectedDay(todayKey);
    scrollToCalendar();
  };

  return <section className={`gd-page${initialLoading ? ' is-loading' : ''}`} aria-label={t.pageTitle} aria-busy={loading}>
    <div className="gd-shell">
      <section className="gd-top-grid">
        <header className="gd-hero">
          <div className="gd-hero-chipbar" aria-label={language === 'vi' ? 'Tiện ích nhanh' : 'Quick utilities'}>
            <button type="button" className="gd-hero-chip" onClick={() => setNow(new Date())} title={t.currentTime}>
              <span className="gd-hero-chip-icon"><Icon name="clock" size={18} /></span><strong>{heroTime}</strong><small>{t.currentTime}</small>
            </button>
            <button type="button" className="gd-hero-chip is-weather" onClick={refreshWeather} title={t.weather}>
              <span className="gd-hero-chip-icon" aria-hidden="true">☀️</span><strong>TP.HCM · {weatherTemperature}</strong><small>{weather.loading ? t.weatherLoading : weatherDescription}</small>
            </button>
            <button type="button" className="gd-hero-chip" onClick={focusToday} title={t.dateToday}>
              <span className="gd-hero-chip-icon"><Icon name="calendar" size={18} /></span><strong>{heroDate}</strong><small>{t.dateToday}</small>
            </button>
          </div>

          <div className="gd-hero-copy">
            <span className="gd-hero-eyebrow">{t.eyebrow}</span>
            <h1><span className="gd-hero-greeting">{t.hello},</span><strong className="gd-hero-name">{name}</strong><span className="gd-hero-wave" aria-hidden="true">👋</span></h1>
            <p>{t.lead}</p>
          </div>

          <div className="gd-hero-actions">
            <button type="button" className="gd-button filled" onClick={scrollToCalendar}><Icon name="calendar" size={20} />{t.calendar}<Icon name="arrow" size={18} /></button>
            <button type="button" className="gd-button outlined" onClick={() => refresh()} disabled={loading}><Icon name="refresh" size={20} />{loading ? t.refreshing : t.refresh}</button>
          </div>

          <div className="gd-hero-secondary-actions">
            <button type="button" className="gd-hero-link" onClick={focusNearestEvent}><Icon name="event" size={18} />{t.nearest}<Icon name="arrow" size={16} /></button>
            <button type="button" className="gd-hero-link" onClick={() => openTtcm('schedule')}><Icon name="calendar" size={18} />{t.openCalendar}<Icon name="arrow" size={16} /></button>
          </div>

          <div className="gd-hero-visual">
            <div className="gd-hero-mini-note"><strong>{language === 'vi' ? 'Kế hoạch hôm nay' : 'Today plan'}</strong><span>{language === 'vi' ? 'Giảng dạy' : 'Teaching'}</span><span>{language === 'vi' ? 'Chấm bài' : 'Marking'}</span><span>{language === 'vi' ? 'Họp chuyên môn' : 'Team meeting'}</span></div>
            <DashboardHeroIllustration />
          </div>
        </header>
      </section>
      {error ? <div className="gd-alert"><Icon name="warning" size={22} /><div><strong>{t.partial}</strong><small>{error}</small></div><button type="button" className="gd-text-button" onClick={() => refresh()}>{t.retry}</button></div> : null}
      <article className="gd-calendar gd-calendar-split" id="dashboard-calendar">
        <header className="gd-calendar-header"><div className="gd-calendar-title"><span><Icon name="calendar" size={22} /></span><div><h2>{t.calendar}</h2><p>{t.calendarSummary}</p></div></div><button type="button" className="gd-text-button" onClick={() => openTtcm('schedule')}>{t.openCalendar}<Icon name="arrow" size={18} /></button></header>
        <div className="gd-calendar-layout">
          <aside className="gd-calendar-sidebar" aria-label={t.chooseDate}>
            <div className="gd-calendar-side-head"><div><span>{t.chooseDate}</span><strong>{calendarRange}</strong></div><span className="gd-count-chip">{timeline.length} {t.events}</span></div>
            <div className="gd-calendar-days-grid">{calendarDays.map((day) => {
              const selected = selectedDay === day.key; const today = todayKey === day.key;
              return <button type="button" key={day.key} className={`gd-day-card${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}${day.events.length ? ' has-events' : ''}`} onClick={() => setSelectedDay(day.key)} aria-pressed={selected}><span className="gd-day-info"><strong>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date)}</strong><small>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day.date)}</small></span><span className="gd-day-number">{day.date.getDate()}</span><span className="gd-day-event-count">{today ? t.today : day.events.length ? day.events.length : '—'}</span></button>;
            })}</div>
            <div className="gd-calendar-next-event"><span><Icon name="event" size={18} /></span><div><small>{t.nextEvent}</small><strong>{nextEvent?.title || t.noUpcoming}</strong></div></div>
          </aside>
          <section className="gd-agenda-panel" aria-live="polite"><header className="gd-agenda-panel-header"><div className="gd-agenda-date-badge"><strong>{selectedCalendarDay?.date?.getDate() || '—'}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(selectedCalendarDay?.date || new Date())}</span></div><div className="gd-agenda-heading"><span>{t.selectedDay}</span><h3>{selectedWeekday}</h3><p>{selectedDate}</p></div><span className="gd-count-chip">{selectedEvents.length} {t.events}</span></header><div className="gd-agenda-list gd-agenda-list-split">{initialLoading ? <Empty>{t.refreshing}</Empty> : selectedEvents.length ? selectedEvents.map((item) => <CalendarEvent key={item.id} item={item} language={language} locale={locale} t={t} />) : <Empty>{t.emptyCalendar}</Empty>}</div></section>
        </div>
      </article>
      <DashboardNewsHub language={language} />
      <Surface title={t.quickActions} icon="apps" className="gd-quick-surface"><div className="gd-quick-actions">{quickActions.map(([icon, label, target]) => <button type="button" key={label} className="gd-quick-action" onClick={() => { if (String(target).startsWith('ttcm:')) openTtcm(String(target).split(':')[1] || 'feed'); else window.location.hash = target; }}><span><Icon name={icon} size={20} /></span>{label}</button>)}</div></Surface>
    </div>
  </section>;
}
