import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { rememberWorkHubItem, WORK_HUB_DELIVERY_EVENT } from '../utils/workHubDelivery.js';
import { isAdminRole, isDepartmentLeaderRole } from '../utils/roles.js';
import './GlobalDashboardGoogleCalendar7Day.css';

const RANGE_DAYS = 7;
const SCHEDULE_CACHE_KEY = 'bes-system-work-schedule-cache-v1';
const SCHEDULE_UPDATE_EVENT = 'bes-work-schedule-updated';
const DASHBOARD_REFRESH_EVENT = 'bes-work-dashboard-refresh';
const DONE_STATUSES = new Set(['completed', 'approved', 'archived', 'cancelled']);
const WORK_COLUMNS = [
  'id',
  'title',
  'description',
  'item_type',
  'status',
  'priority',
  'owner_id',
  'created_by',
  'assignee_ids',
  'due_at',
  'source_module',
  'metadata',
  'created_at',
  'updated_at',
].join(',');

const COPY = {
  vi: {
    eyebrow: 'LỊCH CÔNG VIỆC',
    title: '7 ngày tiếp theo',
    lead: 'Một lịch duy nhất, tập trung vào những việc sắp diễn ra trong tuần.',
    day: 'Ngày',
    week: '7 ngày',
    refresh: 'Làm mới',
    refreshing: 'Đang tải…',
    openFull: 'Mở lịch',
    today: 'Hôm nay',
    events: 'hoạt động',
    activeDays: 'ngày có lịch',
    emptyDay: 'Không có công việc hoặc hoạt động trong ngày này.',
    emptyWeek: 'Chưa có hoạt động trong 7 ngày tiếp theo.',
    sourceSchedule: 'Lịch làm việc chung',
    sourceTask: 'Trung tâm công việc',
    allDay: 'Cả ngày',
    location: 'Địa điểm',
    owner: 'Phụ trách',
    previous: 'Ngày trước',
    next: 'Ngày sau',
    error: 'Không thể tải dữ liệu mới. Đang dùng dữ liệu đã lưu trên thiết bị.',
  },
  en: {
    eyebrow: 'WORK CALENDAR',
    title: 'Next 7 days',
    lead: 'One focused calendar for everything coming up this week.',
    day: 'Day',
    week: '7 days',
    refresh: 'Refresh',
    refreshing: 'Loading…',
    openFull: 'Open calendar',
    today: 'Today',
    events: 'events',
    activeDays: 'scheduled days',
    emptyDay: 'No work or events on this day.',
    emptyWeek: 'No events in the next 7 days.',
    sourceSchedule: 'Shared work calendar',
    sourceTask: 'Work Hub',
    allDay: 'All day',
    location: 'Location',
    owner: 'Owner',
    previous: 'Previous day',
    next: 'Next day',
    error: 'Fresh data could not be loaded. Saved device data is being shown.',
  },
};

function startOfLocalDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addLocalDays(value, amount) {
  const date = startOfLocalDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function safeLocalJson(key, fallback = []) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function localWorkKey(user) {
  return `bes-work-hub-v1093-local:${user?.id || user?.email || 'guest'}`;
}

function readLocalItems(user) {
  const scheduleItems = safeLocalJson(SCHEDULE_CACHE_KEY, []);
  const workItems = safeLocalJson(localWorkKey(user), []);
  const map = new Map();
  [...(Array.isArray(workItems) ? workItems : []), ...(Array.isArray(scheduleItems) ? scheduleItems : [])]
    .filter((item) => item && (item.id || item.localId))
    .forEach((item) => map.set(String(item.id || item.localId), item));
  return [...map.values()];
}

function isTeachingPeriod(item) {
  const haystack = `${item?.title || ''} ${item?.description || ''} ${item?.source_module || ''} ${item?.metadata?.schedule_note || ''}`;
  return /tiết\s*dạy|teaching\s*period|lesson\s*period|thời\s*khóa\s*biểu|timetable/i.test(haystack);
}

function isHiddenSystemItem(item) {
  return item?.source_module === 'english-hub-ai-websites' || item?.metadata?.hidden_from_work_hub === true;
}

function isScheduleItem(item) {
  return item?.metadata?.schedule_event === true || item?.item_type === 'schedule';
}

function isMine(item, user, leader) {
  if (leader) return true;
  const userId = String(user?.id || '');
  if (!userId) return false;
  const assignees = Array.isArray(item?.assignee_ids) ? item.assignee_ids.map(String) : [];
  return assignees.includes(userId)
    || String(item?.created_by || '') === userId
    || String(item?.owner_id || '') === userId;
}

function eventStart(item) {
  return item?.metadata?.schedule_start_at || item?.due_at || item?.date || item?.deadline || '';
}

function normalizeItem(item, t) {
  const schedule = isScheduleItem(item);
  const startAt = eventStart(item);
  const status = String(item?.status || 'assigned').toLowerCase();
  return {
    id: String(item?.id || item?.localId || `${startAt}:${item?.title || ''}`),
    title: String(item?.title || (schedule ? t.sourceSchedule : t.sourceTask)).trim(),
    description: String(item?.description || item?.metadata?.schedule_note || '').trim(),
    startAt,
    endAt: item?.metadata?.schedule_end_at || '',
    location: String(item?.metadata?.schedule_location || '').trim(),
    owner: String(item?.metadata?.schedule_owner_text || item?.owner_name || item?.created_by_email || '').trim(),
    priority: String(item?.priority || 'normal').toLowerCase(),
    done: DONE_STATUSES.has(status),
    schedule,
    sourceLabel: schedule ? t.sourceSchedule : t.sourceTask,
  };
}

function formatTime(value, locale, allDayLabel) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return allDayLabel;
  if (date.getHours() === 0 && date.getMinutes() === 0) return allDayLabel;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

function eventTone(event) {
  if (event.done) return 'done';
  if (event.priority === 'urgent') return 'urgent';
  if (event.priority === 'high') return 'high';
  return event.schedule ? 'schedule' : 'task';
}

function openEvent(event) {
  if (!event?.id) return;
  rememberWorkHubItem(event.id);
  window.location.hash = event.schedule
    ? `#/work-hub?view=schedule&event=${encodeURIComponent(event.id)}`
    : '#/work-hub';
}

function CalendarIcon({ date }) {
  return (
    <span className="ggc-calendar-icon" aria-hidden="true">
      <span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase()}</span>
      <strong>{date.getDate()}</strong>
    </span>
  );
}

function EventCard({ event, locale, t }) {
  const startLabel = formatTime(event.startAt, locale, t.allDay);
  const endLabel = event.endAt ? formatTime(event.endAt, locale, '') : '';
  return (
    <button type="button" className={`ggc-event is-${eventTone(event)}`} onClick={() => openEvent(event)}>
      <span className="ggc-event-time">
        <strong>{startLabel}</strong>
        {endLabel ? <small>{endLabel}</small> : null}
      </span>
      <span className="ggc-event-accent" aria-hidden="true" />
      <span className="ggc-event-content">
        <span className="ggc-event-title-row">
          <strong>{event.title}</strong>
          <span className="ggc-source-chip">{event.sourceLabel}</span>
        </span>
        {event.description ? <p>{event.description}</p> : null}
        {event.location || event.owner ? <span className="ggc-event-meta">
          {event.location ? <span>⌖ {event.location}</span> : null}
          {event.owner ? <span>◎ {event.owner}</span> : null}
        </span> : null}
      </span>
      <span className="ggc-event-arrow" aria-hidden="true">›</span>
    </button>
  );
}

export default function GlobalDashboardGoogleCalendar7Day({ currentUser, language = 'vi', route = '' }) {
  const t = COPY[language] || COPY.vi;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isAdminRole(currentUser?.role) || isDepartmentLeaderRole(currentUser?.role);
  const originalRef = useRef(null);
  const mountRef = useRef(null);
  const lastLoadRef = useRef(0);
  const [mountNode, setMountNode] = useState(null);
  const [items, setItems] = useState(() => readLocalItems(currentUser));
  const [selectedKey, setSelectedKey] = useState(() => localDayKey(new Date()));
  const [mode, setMode] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route !== 'dashboard' || typeof document === 'undefined') {
      setMountNode(null);
      return undefined;
    }

    const restoreOriginal = () => {
      const saved = originalRef.current;
      if (!saved?.node) return;
      saved.node.hidden = saved.hidden;
      if (saved.display) saved.node.style.setProperty('display', saved.display, saved.priority || '');
      else saved.node.style.removeProperty('display');
      if (saved.ariaHidden === null) saved.node.removeAttribute('aria-hidden');
      else saved.node.setAttribute('aria-hidden', saved.ariaHidden);
      saved.node.classList.remove('ggc-original-calendar-hidden');
      originalRef.current = null;
    };

    const attach = () => {
      const host = document.querySelector('#dashboard-calendar');
      if (!host?.parentElement) return;
      if (originalRef.current?.node && originalRef.current.node !== host) restoreOriginal();

      if (!originalRef.current) {
        originalRef.current = {
          node: host,
          hidden: host.hidden,
          display: host.style.getPropertyValue('display'),
          priority: host.style.getPropertyPriority('display'),
          ariaHidden: host.getAttribute('aria-hidden'),
        };
      }

      let node = host.parentElement.querySelector(':scope > [data-google-dashboard-calendar-7day="true"]');
      if (!node) {
        node = document.createElement('div');
        node.dataset.googleDashboardCalendar7day = 'true';
        node.className = 'ggc-dashboard-mount';
        host.parentElement.insertBefore(node, host);
      }

      host.hidden = true;
      host.classList.add('ggc-original-calendar-hidden');
      host.style.setProperty('display', 'none', 'important');
      host.setAttribute('aria-hidden', 'true');
      mountRef.current = node;
      setMountNode((current) => (current === node ? current : node));
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      restoreOriginal();
      mountRef.current?.remove();
      mountRef.current = null;
    };
  }, [route]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!currentUser) return;
    const localItems = readLocalItems(currentUser);
    if (!quiet) setLoading(true);
    setError('');

    if (!client || !runtime.ready || !runtime.session) {
      setItems(localItems);
      if (!quiet) setLoading(false);
      return;
    }

    const rangeStart = startOfLocalDay(new Date());
    const rangeEnd = addLocalDays(rangeStart, RANGE_DAYS);
    try {
      const { data, error: loadError } = await client
        .from('work_hub_items')
        .select(WORK_COLUMNS)
        .gte('due_at', rangeStart.toISOString())
        .lt('due_at', rangeEnd.toISOString())
        .order('due_at', { ascending: true })
        .limit(500);
      if (loadError) throw loadError;
      const map = new Map();
      [...localItems, ...(data || [])]
        .filter((item) => item && (item.id || item.localId))
        .forEach((item) => map.set(String(item.id || item.localId), item));
      setItems([...map.values()]);
      lastLoadRef.current = Date.now();
    } catch (reason) {
      setItems(localItems);
      setError(reason?.message || t.error);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [client, currentUser?.id, currentUser?.email, currentUser?.role, runtime.ready, runtime.session, t.error]);

  useEffect(() => {
    if (route !== 'dashboard') return undefined;
    load();
    let timer = 0;
    const queueLoad = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => load({ quiet: true }), 180);
    };
    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      if (lastLoadRef.current && Date.now() - lastLoadRef.current < 30 * 60 * 1000) return;
      queueLoad();
    };
    window.addEventListener(SCHEDULE_UPDATE_EVENT, queueLoad);
    window.addEventListener(WORK_HUB_DELIVERY_EVENT, queueLoad);
    window.addEventListener(DASHBOARD_REFRESH_EVENT, queueLoad);
    window.addEventListener('storage', queueLoad);
    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SCHEDULE_UPDATE_EVENT, queueLoad);
      window.removeEventListener(WORK_HUB_DELIVERY_EVENT, queueLoad);
      window.removeEventListener(DASHBOARD_REFRESH_EVENT, queueLoad);
      window.removeEventListener('storage', queueLoad);
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [load, route]);

  const rangeStart = useMemo(() => startOfLocalDay(new Date()), []);
  const rangeEnd = useMemo(() => addLocalDays(rangeStart, RANGE_DAYS), [rangeStart]);
  const events = useMemo(() => {
    const map = new Map();
    items
      .filter((item) => !isHiddenSystemItem(item) && !isTeachingPeriod(item) && isMine(item, currentUser, leader))
      .map((item) => normalizeItem(item, t))
      .filter((event) => {
        const time = new Date(event.startAt).getTime();
        return Number.isFinite(time) && time >= rangeStart.getTime() && time < rangeEnd.getTime();
      })
      .forEach((event) => map.set(event.id, event));
    return [...map.values()].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
  }, [items, currentUser?.id, currentUser?.role, leader, rangeEnd, rangeStart, t]);

  const days = useMemo(() => Array.from({ length: RANGE_DAYS }, (_, index) => {
    const date = addLocalDays(rangeStart, index);
    const key = localDayKey(date);
    return { date, key, events: events.filter((event) => localDayKey(event.startAt) === key) };
  }), [events, rangeStart]);

  useEffect(() => {
    if (!days.some((day) => day.key === selectedKey)) setSelectedKey(days[0]?.key || localDayKey(new Date()));
  }, [days, selectedKey]);

  const selectedIndex = Math.max(0, days.findIndex((day) => day.key === selectedKey));
  const selectedDay = days[selectedIndex] || days[0];
  const activeDays = days.filter((day) => day.events.length).length;
  const rangeLabel = days.length
    ? `${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(days[0].date)} – ${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(days[days.length - 1].date)}`
    : '';

  if (!mountNode || route !== 'dashboard') return null;

  return createPortal(
    <section className="ggc-calendar" aria-label={t.title} aria-busy={loading}>
      <header className="ggc-topbar">
        <div className="ggc-brand">
          <CalendarIcon date={selectedDay?.date || new Date()} />
          <div>
            <span>{t.eyebrow}</span>
            <h2>{t.title}</h2>
            <p>{rangeLabel} · {events.length} {t.events}</p>
          </div>
        </div>
        <div className="ggc-actions">
          <div className="ggc-view-switch" aria-label={t.title}>
            <button type="button" className={mode === 'day' ? 'active' : ''} onClick={() => setMode('day')}>{t.day}</button>
            <button type="button" className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>{t.week}</button>
          </div>
          <button type="button" className="ggc-icon-button" onClick={() => load()} disabled={loading} aria-label={loading ? t.refreshing : t.refresh} title={loading ? t.refreshing : t.refresh}>
            <span aria-hidden="true">↻</span>
          </button>
          <button type="button" className="ggc-open-button" onClick={() => { window.location.hash = '#/work-hub?view=schedule'; }}>{t.openFull}</button>
        </div>
      </header>

      <div className="ggc-week-strip" role="tablist" aria-label={t.week}>
        {days.map((day) => {
          const selected = day.key === selectedDay?.key;
          const today = day.key === localDayKey(new Date());
          return <button type="button" role="tab" aria-selected={selected} key={day.key} className={`${selected ? 'is-selected' : ''}${today ? ' is-today' : ''}${day.events.length ? ' has-events' : ''}`} onClick={() => { setSelectedKey(day.key); setMode('day'); }}>
            <span>{today ? t.today : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date)}</span>
            <strong>{day.date.getDate()}</strong>
            <small>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day.date)}</small>
            <em>{day.events.length}</em>
          </button>;
        })}
      </div>

      <div className="ggc-info-row">
        <span><b>{events.length}</b> {t.events}</span>
        <span><b>{activeDays}</b> {t.activeDays}</span>
        <span>{t.lead}</span>
      </div>

      {error ? <div className="ggc-alert" role="status"><span>{t.error}</span><button type="button" onClick={() => setError('')}>×</button></div> : null}

      {mode === 'day' ? <div className="ggc-day-layout">
        <aside className="ggc-day-summary">
          <span>{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selectedDay?.date || new Date())}</span>
          <strong>{selectedDay?.date.getDate() || '—'}</strong>
          <h3>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedDay?.date || new Date())}</h3>
          <p>{selectedDay?.events.length || 0} {t.events}</p>
          <div className="ggc-day-navigation">
            <button type="button" aria-label={t.previous} disabled={selectedIndex <= 0} onClick={() => setSelectedKey(days[selectedIndex - 1]?.key || selectedKey)}>‹</button>
            <button type="button" aria-label={t.next} disabled={selectedIndex >= days.length - 1} onClick={() => setSelectedKey(days[selectedIndex + 1]?.key || selectedKey)}>›</button>
          </div>
        </aside>
        <main className="ggc-agenda-panel" aria-live="polite">
          <header><h3>{new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'long' }).format(selectedDay?.date || new Date())}</h3><span>{selectedDay?.events.length || 0} {t.events}</span></header>
          <div className="ggc-event-list">
            {selectedDay?.events.length ? selectedDay.events.map((event) => <EventCard key={event.id} event={event} locale={locale} t={t} />) : <div className="ggc-empty"><span aria-hidden="true">▦</span><strong>{t.emptyDay}</strong></div>}
          </div>
        </main>
      </div> : <div className="ggc-week-agenda">
        {days.some((day) => day.events.length) ? days.map((day) => <section key={day.key} className="ggc-week-day">
          <header>
            <div><strong>{day.date.getDate()}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day.date)}</span></div>
            <span><b>{day.key === localDayKey(new Date()) ? t.today : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(day.date)}</b><small>{day.events.length} {t.events}</small></span>
          </header>
          <div>{day.events.length ? day.events.map((event) => <EventCard key={event.id} event={event} locale={locale} t={t} />) : <p className="ggc-week-empty">{t.emptyDay}</p>}</div>
        </section>) : <div className="ggc-empty is-week"><span aria-hidden="true">▦</span><strong>{t.emptyWeek}</strong></div>}
      </div>}
    </section>,
    mountNode,
  );
}
