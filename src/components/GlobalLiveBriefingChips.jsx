import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { launchRoute } from '../utils/motion.js';
import {
  listWorkHubNotifications,
  subscribeWorkHubNotifications,
} from '../utils/workHubDelivery.js';
import { WORK_SCHEDULE_ITEM_TYPE } from '../utils/workScheduleImport.js';

const LOCATION_CACHE_KEY = 'bes-live-briefing-location-v1';
const INTERNET_CACHE_KEY = 'bes-live-briefing-internet-v1';
const SCHEDULE_CACHE_KEY = 'bes-system-work-schedule-cache-v1';
const INTERNET_REFRESH_MS = 10 * 60 * 1000;
const BRIAN_REFRESH_MS = 2 * 60 * 1000;
const OPEN_STATUSES = new Set(['assigned', 'in_progress', 'pending', 'changes_requested', 'review']);
const CLOSED_STATUSES = new Set(['completed', 'done', 'approved', 'archived', 'closed', 'cancelled', 'submitted']);
const SUBMISSION_PATTERN = /(bài nộp|đã nộp|nộp bài|nộp sản phẩm|submission|submitted|minh chứng|sản phẩm mới)/i;
const LESSON_PATTERN = /(tiết|lớp\s*(?:10|11|12)|tiếng anh|english|giảng dạy|lịch dạy|lesson|class)/i;

function readJson(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional cache */ }
}

function compact(value, max = 20) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trim()}…` : text;
}

function formatClock(value, language = 'vi') {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function dayRelation(value, language = 'vi') {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((target - start) / 86400000);
  if (diff === 0) return language === 'en' ? 'Today' : 'Hôm nay';
  if (diff === 1) return language === 'en' ? 'Tomorrow' : 'Ngày mai';
  if (diff === -1) return language === 'en' ? 'Yesterday' : 'Hôm qua';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function dueSecondary(value, language = 'vi') {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return language === 'en' ? 'No deadline' : 'Chưa có hạn';
  const delta = date.getTime() - Date.now();
  const minutes = Math.round(Math.abs(delta) / 60000);
  if (delta < 0) {
    if (minutes < 60) return language === 'en' ? `${minutes}m overdue` : `Quá hạn ${minutes} phút`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return language === 'en' ? `${hours}h overdue` : `Quá hạn ${hours} giờ`;
    const days = Math.round(hours / 24);
    return language === 'en' ? `${days}d overdue` : `Quá hạn ${days} ngày`;
  }
  if (minutes < 60) return language === 'en' ? `Due in ${minutes}m` : `Còn ${minutes} phút`;
  if (minutes < 24 * 60) return language === 'en'
    ? `Nearest ${formatClock(date, language)}`
    : `Gần nhất ${formatClock(date, language)}`;
  return `${dayRelation(date, language)} · ${formatClock(date, language)}`;
}

function weatherDescription(code, language = 'vi') {
  const value = Number(code);
  if (value === 0) return language === 'en' ? 'Clear' : 'Trời quang';
  if ([1, 2].includes(value)) return language === 'en' ? 'Partly cloudy' : 'Ít mây';
  if (value === 3) return language === 'en' ? 'Cloudy' : 'Nhiều mây';
  if ([45, 48].includes(value)) return language === 'en' ? 'Fog' : 'Có sương';
  if (value >= 51 && value <= 67) return language === 'en' ? 'Rain' : 'Có mưa';
  if (value >= 71 && value <= 77) return language === 'en' ? 'Snow' : 'Có tuyết';
  if (value >= 80 && value <= 82) return language === 'en' ? 'Showers' : 'Mưa rào';
  if (value >= 85 && value <= 86) return language === 'en' ? 'Snow showers' : 'Mưa tuyết';
  if (value >= 95) return language === 'en' ? 'Thunderstorm' : 'Dông';
  return language === 'en' ? 'Weather' : 'Thời tiết';
}

function aqiDescription(value, language = 'vi') {
  const aqi = Number(value);
  if (!Number.isFinite(aqi)) return language === 'en' ? 'Unavailable' : 'Chưa có dữ liệu';
  if (aqi <= 50) return language === 'en' ? 'Good' : 'Tốt';
  if (aqi <= 100) return language === 'en' ? 'Moderate' : 'Trung bình';
  if (aqi <= 150) return language === 'en' ? 'Sensitive groups' : 'Kém cho nhóm nhạy cảm';
  if (aqi <= 200) return language === 'en' ? 'Unhealthy' : 'Không tốt';
  if (aqi <= 300) return language === 'en' ? 'Very unhealthy' : 'Rất không tốt';
  return language === 'en' ? 'Hazardous' : 'Nguy hại';
}

function readLocationCache() {
  const cached = readJson(LOCATION_CACHE_KEY);
  if (!cached || !Number.isFinite(Number(cached.latitude)) || !Number.isFinite(Number(cached.longitude))) return null;
  if (Date.now() - Number(cached.savedAt || 0) > 7 * 86400000) return null;
  return {
    latitude: Number(cached.latitude),
    longitude: Number(cached.longitude),
    label: String(cached.label || ''),
  };
}

async function browserCoordinates() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) throw new Error('Geolocation unavailable');
  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') throw new Error('Geolocation denied');
    }
  } catch (error) {
    if (/denied/i.test(String(error?.message || error))) throw error;
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: Number(position.coords.latitude),
        longitude: Number(position.coords.longitude),
        label: '',
      }),
      reject,
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 12 * 60 * 60 * 1000 },
    );
  });
}

async function ipCoordinates() {
  const response = await fetch('https://ipwho.is/?fields=success,latitude,longitude,city,country');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) throw new Error('IP location unavailable');
  const latitude = Number(payload?.latitude);
  const longitude = Number(payload?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid IP location');
  return {
    latitude,
    longitude,
    label: [payload?.city, payload?.country].filter(Boolean).join(', '),
  };
}

async function resolveCoordinates() {
  const cached = readLocationCache();
  if (cached) return cached;
  let location = null;
  try { location = await browserCoordinates(); } catch { /* use network fallback */ }
  if (!location) location = await ipCoordinates();
  writeJson(LOCATION_CACHE_KEY, { ...location, savedAt: Date.now() });
  return location;
}

function parseInternetPayload(forecast, air, language) {
  const currentTemperature = Number(forecast?.current?.temperature_2m);
  const currentCode = Number(forecast?.current?.weather_code);
  const hourlyTimes = Array.isArray(forecast?.hourly?.time) ? forecast.hourly.time : [];
  const rainProbabilities = Array.isArray(forecast?.hourly?.precipitation_probability)
    ? forecast.hourly.precipitation_probability
    : [];
  const now = Date.now();
  const future = hourlyTimes
    .map((time, index) => ({
      time,
      timestamp: new Date(time).getTime(),
      probability: Number(rainProbabilities[index]),
    }))
    .filter((entry) => Number.isFinite(entry.timestamp) && entry.timestamp >= now - 30 * 60000)
    .slice(0, 30);
  const rain = future.find((entry) => Number.isFinite(entry.probability) && entry.probability >= 30);
  const maxProbability = future.reduce(
    (max, entry) => Number.isFinite(entry.probability) ? Math.max(max, entry.probability) : max,
    0,
  );
  const aqi = Number(air?.current?.us_aqi);

  return {
    savedAt: Date.now(),
    weatherPrimary: Number.isFinite(currentTemperature) ? `${Math.round(currentTemperature)}°C` : '—',
    weatherSecondary: Number.isFinite(currentCode)
      ? weatherDescription(currentCode, language)
      : (language === 'en' ? 'Unavailable' : 'Chưa có dữ liệu'),
    rainPrimary: rain
      ? formatClock(rain.time, language)
      : (language === 'en' ? 'No rain' : 'Không mưa'),
    rainSecondary: rain
      ? `${Math.round(rain.probability)}%`
      : (language === 'en' ? `Max ${Math.round(maxProbability)}%` : `Cao nhất ${Math.round(maxProbability)}%`),
    aqiPrimary: Number.isFinite(aqi) ? String(Math.round(aqi)) : '—',
    aqiSecondary: aqiDescription(aqi, language),
  };
}

function readScheduleCache() {
  const cached = readJson(SCHEDULE_CACHE_KEY, []);
  return Array.isArray(cached) ? cached : [];
}

function itemStart(item) {
  return item?.metadata?.schedule_start_at || item?.due_at || '';
}

function itemLocation(item) {
  return String(item?.metadata?.schedule_location || item?.metadata?.location || '').trim();
}

function itemText(item) {
  return [
    item?.title,
    item?.description,
    item?.metadata?.schedule_note,
    item?.metadata?.schedule_category,
    item?.metadata?.class_name,
  ].filter(Boolean).join(' ');
}

function isScheduleItem(item) {
  return item?.item_type === WORK_SCHEDULE_ITEM_TYPE || item?.metadata?.schedule_event === true;
}

function stringIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry || '')).filter(Boolean);
}

function belongsToUser(item, currentUser) {
  const userId = String(currentUser?.id || '');
  if (!userId) return true;
  const assignees = stringIds(item?.assignee_ids);
  const watchers = stringIds(item?.watcher_ids);
  if (assignees.includes(userId) || watchers.includes(userId)) return true;
  if (String(item?.owner_id || '') === userId || String(item?.created_by || '') === userId) return true;
  return !assignees.length && !watchers.length && !item?.owner_id;
}

function classLabel(item) {
  const text = itemText(item);
  const match = text.match(/\b(?:10|11|12)[.\-]\d+\b/i);
  if (match) return match[0].replace('-', '.');
  const metadataClass = String(item?.metadata?.class_name || item?.metadata?.class || '').trim();
  return metadataClass || compact(item?.title, 14);
}

function normalizeLocalNotification(item = {}) {
  return {
    ...item,
    key: String(item.notificationId ?? item.notification_id ?? item.id ?? ''),
    title: String(item.title || ''),
    body: String(item.body || item.message || ''),
    read: Boolean(item.read || item.read_at),
    dismissed: Boolean(item.dismissed),
    archived: Boolean(item.archived),
  };
}

function readLocalNotifications(currentUser) {
  if (typeof window === 'undefined') return [];
  const key = `bes-global-notifications:${currentUser?.id || currentUser?.email || 'guest'}`;
  const items = readJson(key, []);
  return Array.isArray(items) ? items.map(normalizeLocalNotification) : [];
}

function mergeNotifications(remote = [], local = []) {
  const map = new Map();
  [...remote, ...local].forEach((raw) => {
    const item = normalizeLocalNotification(raw);
    const key = item.key || `${item.title}:${item.created_at || item.createdAt || ''}`;
    if (!key || item.read || item.dismissed || item.archived) return;
    map.set(key, { ...(map.get(key) || {}), ...item });
  });
  return [...map.values()];
}

function BrianChipIcon({ type }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false };
  if (type === 'weather') return <svg {...common}><path d="M7.5 18.5h9a4 4 0 0 0 .35-7.98A5.5 5.5 0 0 0 6.3 9.65 4.5 4.5 0 0 0 7.5 18.5Z" /></svg>;
  if (type === 'rain') return <svg {...common}><path d="M7 15.5h10a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.8 8 3.8 3.8 0 0 0 7 15.5ZM8 18l-1 2M12 18l-1 2M16 18l-1 2" /></svg>;
  if (type === 'aqi') return <svg {...common}><path d="M4 8h8a2 2 0 1 0-2-2M4 12h14a2.5 2.5 0 1 1-2.5 2.5M4 16h7" /></svg>;
  if (type === 'lesson') return <svg {...common}><path d="M4 5h16v15H4zM7 3v4M17 3v4M4 9h16M8 13h3M8 16h5" /></svg>;
  if (type === 'schedule') return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 2.5v3M16 2.5v3M4 9h16M8 13h3M8 16h6" /></svg>;
  if (type === 'work') return <svg {...common}><path d="M9 6V4h6v2M4 7h16v13H4zM4 11h16M10 11v2h4v-2" /></svg>;
  if (type === 'submission') return <svg {...common}><path d="M7 3h7l4 4v14H7zM14 3v5h5M10 14h4M12 11v6" /></svg>;
  return <svg {...common}><path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5zM10 20h4" /></svg>;
}

function LiveChip({ tone, type, label, primary, secondary, onClick, title }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`brian-live-chip is-${tone}`}
      title={title || `${label}: ${primary} · ${secondary}`}
    >
      <span className="brian-live-chip__icon"><BrianChipIcon type={type} /></span>
      <span className="brian-live-chip__copy">
        <small>{label}</small>
        <strong>{primary}</strong>
        <em>{secondary}</em>
      </span>
    </Tag>
  );
}

export default function GlobalLiveBriefingChips({
  currentUser,
  language = 'vi',
  route = '',
}) {
  const [host, setHost] = useState(null);
  const [internet, setInternet] = useState(() => {
    const cached = readJson(INTERNET_CACHE_KEY);
    return cached && Date.now() - Number(cached.savedAt || 0) < 60 * 60 * 1000
      ? cached
      : {
        weatherPrimary: '—',
        weatherSecondary: language === 'en' ? 'Loading' : 'Đang tải',
        rainPrimary: '—',
        rainSecondary: language === 'en' ? 'Loading' : 'Đang tải',
        aqiPrimary: '—',
        aqiSecondary: language === 'en' ? 'Loading' : 'Đang tải',
      };
  });
  const [brian, setBrian] = useState({
    lessonPrimary: language === 'en' ? 'No lesson' : 'Chưa có tiết',
    lessonSecondary: language === 'en' ? 'Brian schedule' : 'Lịch Brian',
    schedulePrimary: language === 'en' ? 'No event' : 'Chưa có lịch',
    scheduleSecondary: language === 'en' ? 'Brian schedule' : 'Lịch Brian',
    workPrimary: '0',
    workSecondary: language === 'en' ? 'No due work' : 'Không có việc đến hạn',
    submissionPrimary: '0',
    submissionSecondary: language === 'en' ? 'No new items' : 'Không có bài mới',
    notificationPrimary: '0',
    notificationSecondary: language === 'en' ? 'All read' : 'Đã đọc hết',
  });

  useEffect(() => {
    if (!currentUser || typeof document === 'undefined') {
      setHost(null);
      return undefined;
    }
    let frame = 0;
    let attempts = 0;
    let cancelled = false;
    const find = () => {
      if (cancelled) return;
      const target = document.querySelector('.app-shell[data-route] .brian-briefing-bar__context');
      if (target) {
        setHost((current) => current === target ? current : target);
        return;
      }
      attempts += 1;
      if (attempts < 120) frame = window.requestAnimationFrame(find);
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [currentUser?.id, route]);

  useEffect(() => {
    const bar = host?.closest('.brian-briefing-bar');
    if (!bar) return undefined;
    bar.classList.add('has-live-briefing-chips');
    return () => bar.classList.remove('has-live-briefing-chips');
  }, [host]);

  const loadInternet = useCallback(async () => {
    try {
      const location = await resolveCoordinates();
      const query = `latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&timezone=auto`;
      const [forecastResponse, airResponse] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?${query}&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_days=2`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${query}&current=us_aqi`),
      ]);
      const [forecast, air] = await Promise.all([
        forecastResponse.json().catch(() => ({})),
        airResponse.json().catch(() => ({})),
      ]);
      if (!forecastResponse.ok) throw new Error('Weather API unavailable');
      const next = parseInternetPayload(forecast, airResponse.ok ? air : {}, language);
      setInternet(next);
      writeJson(INTERNET_CACHE_KEY, next);
    } catch {
      const cached = readJson(INTERNET_CACHE_KEY);
      if (cached) setInternet(cached);
      else setInternet({
        weatherPrimary: language === 'en' ? 'Enable' : 'Bật vị trí',
        weatherSecondary: language === 'en' ? 'For weather' : 'Để xem thời tiết',
        rainPrimary: '—',
        rainSecondary: language === 'en' ? 'No location' : 'Chưa có vị trí',
        aqiPrimary: '—',
        aqiSecondary: language === 'en' ? 'No location' : 'Chưa có vị trí',
      });
    }
  }, [language]);

  const loadBrian = useCallback(async ({ force = false } = {}) => {
    if (!currentUser?.id) return;
    const client = getRuntimeClient();
    let scheduleItems = readScheduleCache();
    let workItems = [];
    if (client) {
      const startFloor = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const [scheduleResult, workResult] = await Promise.all([
        client
          .from('work_hub_items')
          .select('id,title,description,item_type,status,priority,owner_id,created_by,assignee_ids,watcher_ids,due_at,metadata,created_at,updated_at')
          .eq('item_type', WORK_SCHEDULE_ITEM_TYPE)
          .gte('due_at', startFloor)
          .order('due_at', { ascending: true })
          .limit(120),
        client
          .from('work_hub_items')
          .select('id,title,description,item_type,status,priority,owner_id,created_by,assignee_ids,watcher_ids,due_at,metadata,created_at,updated_at')
          .order('due_at', { ascending: true })
          .limit(200),
      ]);
      if (!scheduleResult.error && Array.isArray(scheduleResult.data)) scheduleItems = scheduleResult.data;
      if (!workResult.error && Array.isArray(workResult.data)) workItems = workResult.data;
    }

    const now = Date.now();
    const schedule = scheduleItems
      .filter(isScheduleItem)
      .filter((item) => belongsToUser(item, currentUser))
      .map((item) => ({ ...item, startAt: itemStart(item) }))
      .filter((item) => {
        const value = new Date(item.startAt).getTime();
        return Number.isFinite(value) && value >= now - 30 * 60000;
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

    const nextSchedule = schedule[0] || null;
    const nextLesson = schedule.find((item) => LESSON_PATTERN.test(itemText(item))) || null;
    const openWork = workItems
      .filter((item) => !isScheduleItem(item))
      .filter((item) => belongsToUser(item, currentUser))
      .filter((item) => {
        const status = String(item?.status || '').toLowerCase();
        if (CLOSED_STATUSES.has(status)) return false;
        if (status && !OPEN_STATUSES.has(status) && status !== 'draft') return false;
        return Number.isFinite(new Date(item?.due_at || '').getTime());
      })
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    const remoteNotifications = await listWorkHubNotifications(currentUser.id, 30, { force });
    const notifications = mergeNotifications(remoteNotifications, readLocalNotifications(currentUser));
    const submissionCount = notifications.filter((item) => SUBMISSION_PATTERN.test(`${item.title} ${item.body}`)).length;
    const notificationCount = notifications.length;

    setBrian({
      lessonPrimary: nextLesson
        ? `${classLabel(nextLesson)} · ${formatClock(nextLesson.startAt, language)}`
        : (language === 'en' ? 'No lesson' : 'Chưa có tiết'),
      lessonSecondary: nextLesson
        ? (itemLocation(nextLesson) || dayRelation(nextLesson.startAt, language))
        : (language === 'en' ? 'Brian schedule' : 'Trong lịch Brian'),
      schedulePrimary: nextSchedule
        ? `${compact(nextSchedule.title, 14)} · ${formatClock(nextSchedule.startAt, language)}`
        : (language === 'en' ? 'No event' : 'Chưa có lịch'),
      scheduleSecondary: nextSchedule
        ? (itemLocation(nextSchedule) || dayRelation(nextSchedule.startAt, language))
        : (language === 'en' ? 'Brian schedule' : 'Trong lịch Brian'),
      workPrimary: openWork.length ? String(openWork.length) : '0',
      workSecondary: openWork.length
        ? dueSecondary(openWork[0].due_at, language)
        : (language === 'en' ? 'No due work' : 'Không có việc đến hạn'),
      submissionPrimary: submissionCount ? String(submissionCount) : '0',
      submissionSecondary: submissionCount
        ? (language === 'en' ? 'Unreviewed' : 'Chưa xem')
        : (language === 'en' ? 'No new items' : 'Không có bài mới'),
      notificationPrimary: notificationCount >= 30 ? '30+' : String(notificationCount),
      notificationSecondary: notificationCount
        ? (language === 'en' ? 'Unread' : 'Chưa đọc')
        : (language === 'en' ? 'All read' : 'Đã đọc hết'),
    });
  }, [currentUser?.id, currentUser?.email, language]);

  useEffect(() => {
    loadInternet();
    const timer = window.setInterval(loadInternet, INTERNET_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadInternet]);

  useEffect(() => {
    loadBrian();
    const timer = window.setInterval(() => loadBrian({ force: true }), BRIAN_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadBrian]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let refreshTimer = 0;
    const queueRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => loadBrian({ force: true }), 180);
    };
    const unsubscribeItems = subscribeTable({
      key: `live-briefing-items-${currentUser.id}`,
      table: 'work_hub_items',
      onChange: queueRefresh,
    });
    const unsubscribeNotifications = subscribeWorkHubNotifications(currentUser.id, queueRefresh);
    window.addEventListener('bes-work-schedule-updated', queueRefresh);
    window.addEventListener('bes-work-dashboard-refresh', queueRefresh);
    window.addEventListener('bes-global-notification', queueRefresh);
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribeItems?.();
      unsubscribeNotifications?.();
      window.removeEventListener('bes-work-schedule-updated', queueRefresh);
      window.removeEventListener('bes-work-dashboard-refresh', queueRefresh);
      window.removeEventListener('bes-global-notification', queueRefresh);
    };
  }, [currentUser?.id, loadBrian]);

  const openRoute = useCallback((target, label, event) => {
    launchRoute({
      target,
      label: String(label || 'GO').slice(0, 2).toUpperCase(),
      color: '#1a73e8',
      sourceEl: event?.currentTarget,
    });
  }, []);

  const chips = useMemo(() => {
    const vi = language !== 'en';
    return [
      {
        tone: 'blue', type: 'weather', label: vi ? 'Thời tiết' : 'Weather',
        primary: internet.weatherPrimary, secondary: internet.weatherSecondary,
        title: 'Open-Meteo',
      },
      {
        tone: 'green', type: 'rain', label: vi ? 'Mưa sắp tới' : 'Next rain',
        primary: internet.rainPrimary, secondary: internet.rainSecondary,
        title: 'Open-Meteo hourly forecast',
      },
      {
        tone: 'amber', type: 'aqi', label: 'AQI',
        primary: internet.aqiPrimary, secondary: internet.aqiSecondary,
        title: 'Open-Meteo Air Quality',
      },
      {
        tone: 'red', type: 'lesson', label: vi ? 'Tiết tiếp theo' : 'Next lesson',
        primary: brian.lessonPrimary, secondary: brian.lessonSecondary,
        onClick: (event) => openRoute('#/work-hub?view=schedule', vi ? 'Lịch dạy' : 'Schedule', event),
      },
      {
        tone: 'purple', type: 'schedule', label: vi ? 'Lịch gần nhất' : 'Next event',
        primary: brian.schedulePrimary, secondary: brian.scheduleSecondary,
        onClick: (event) => openRoute('#/work-hub?view=schedule', vi ? 'Lịch' : 'Schedule', event),
      },
      {
        tone: 'teal', type: 'work', label: vi ? 'Việc sắp hạn' : 'Due work',
        primary: brian.workPrimary === '0' ? (vi ? '0 việc' : '0 tasks') : `${brian.workPrimary} ${vi ? 'việc' : 'tasks'}`,
        secondary: brian.workSecondary,
        onClick: (event) => openRoute('#/work-hub', vi ? 'Công việc' : 'Work', event),
      },
      {
        tone: 'indigo', type: 'submission', label: vi ? 'Bài nộp mới' : 'New submissions',
        primary: brian.submissionPrimary === '0' ? (vi ? '0 bài' : '0 items') : `${brian.submissionPrimary} ${vi ? 'bài' : 'items'}`,
        secondary: brian.submissionSecondary,
        onClick: (event) => openRoute('#/work-hub', vi ? 'Bài nộp' : 'Submissions', event),
      },
      {
        tone: 'slate', type: 'notification', label: vi ? 'Thông báo mới' : 'Notifications',
        primary: brian.notificationPrimary, secondary: brian.notificationSecondary,
        onClick: () => document.querySelector('.brian-nav__bell')?.click(),
      },
    ];
  }, [brian, internet, language, openRoute]);

  if (!currentUser || !host) return null;

  return createPortal(
    <div className="brian-live-chip-strip" aria-label={language === 'en' ? 'Live information' : 'Thông tin trực tiếp'}>
      {chips.map((chip) => <LiveChip key={chip.type} {...chip} />)}
    </div>,
    host,
  );
}
