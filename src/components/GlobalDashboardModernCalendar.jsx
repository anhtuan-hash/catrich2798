import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { rememberWorkHubItem, WORK_HUB_DELIVERY_EVENT } from '../utils/workHubDelivery.js';
import { isAdminRole, isDepartmentLeaderRole } from '../utils/roles.js';
import './GlobalDashboardModernCalendar.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = 14;
const SCHEDULE_CACHE_KEY = 'bes-system-work-schedule-cache-v1';
const SCHEDULE_UPDATE_EVENT = 'bes-work-schedule-updated';
const DASHBOARD_REFRESH_EVENT = 'bes-work-dashboard-refresh';
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
const DONE_STATUSES = new Set(['completed', 'approved', 'archived', 'cancelled']);

const COPY = {
  vi: {
    eyebrow: 'LỊCH CÔNG VIỆC DÙNG CHUNG',
    title: 'Lịch làm việc 14 ngày',
    lead: 'Hiển thị đầy đủ công việc và hoạt động đã đồng bộ, không giới hạn số mục trong những ngày bận.',
    openFull: 'Mở lịch đầy đủ',
    refresh: 'Làm mới',
    refreshing: 'Đang tải…',
    split: 'Theo ngày',
    agenda: 'Danh sách',
    events: 'hoạt động',
    activeDays: 'ngày có lịch',
    busiest: 'ngày bận nhất',
    today: 'Hôm nay',
    emptyDay: 'Không có công việc hoặc hoạt động trong ngày này.',
    emptyRange: 'Chưa có hoạt động trong 14 ngày tới.',
    sourceSchedule: 'Lịch làm việc chung',
    sourceTask: 'Trung tâm công việc',
    allDay: 'Cả ngày',
    location: 'Địa điểm',
    owner: 'Phụ trách',
    previous: 'Ngày trước',
    next: 'Ngày sau',
    error: 'Không thể tải dữ liệu mới. Hệ thống đang hiển thị dữ liệu đã lưu trên thiết bị.',
    noDetail: 'Không có ghi chú bổ sung.',
  },
  en: {
    eyebrow: 'SHARED WORK CALENDAR',
    title: '14-day work calendar',
    lead: 'Shows every synced task and event without truncating busy days.',
    openFull: 'Open full calendar',
    refresh: 'Refresh',
    refreshing: 'Loading…',
    split: 'By day',
    agenda: 'Agenda',
    events: 'events',
    activeDays: 'scheduled days',
    busiest: 'busiest day',
    today: 'Today',
    emptyDay: 'No work or events on this day.',
    emptyRange: 'No events in the next 14 days.',
    sourceSchedule: 'Shared work calendar',
    sourceTask: 'Work Hub',
    allDay: 'All day',
    location: 'Location',
    owner: 'Owner',
    previous: 'Previous day',
    next: 'Next day',
    error: 'Fresh data could not be loaded. Saved device data is being shown.',
    noDetail: 'No additional notes.',
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

function dateFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
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
    status,
    done: DONE_STATUSES.has(status),
    schedule,
    sourceLabel: schedule ? t.sourceSchedule : t.sourceTask,
    raw: item,
  };
}

function formatTime(value, locale, allDayLabel) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return allDayLabel;
  const explicitTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (!explicitTime) return allDayLabel;
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

function DashboardCalendarEvent({ event, locale, t }) {
  const startLabel = formatTime(event.startAt, locale, t.allDay);
  const endLabel = event.endAt ? formatTime(event.endAt, locale, '') : '';
  return (
    <button type="button" className={`gdc-event is-${eventTone(event)}`} onClick={() => openEvent(event)}>
      <span className="gdc-event-time">
        <strong>{startLabel}{endLabel ? ` – ${endLabel}` : ''}</strong>
        <small>{event.sourceLabel}</small>
      </span>
      <span className="gdc-event-body">
        <span className="gdc-event-title-row">
          <strong>{event.title}</strong>
          {event.done ? <span className="gdc-status-chip">✓</span> : null}
        </span>
        <p>{event.description || t.noDetail}</p>
        <span className="gdc-event-meta">
          {event.location ? <span>{t.location}: {event.location}</span> : null}
          {event.owner ? <span>{t.owner}: {event.owner}</span> : null}
        </span>
      </span>
      <span className="gdc-event-arrow" aria-hidden="true">›</span>
    </button>
  );
}

export default function GlobalDashboardModernCalendar({ currentUser, language = 'vi', route = '' }) {
  const t = COPY[language] || COPY.vi;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isAdminRole(currentUser?.role) || isDepartmentLeaderRole(currentUser?.role);
  const hostRef = useRef(null);
  const lastLoadRef = useRef(0);
  const [mountNode, setMountNode] = useState(null);
  const [items, setItems] = useState(() => readLocalItems(currentUser));
  const [selectedKey, setSelectedKey] = useState(() => localDayKey(new Date()));
  const [mode, setMode] = useState('split');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route !== 'dashboard' || typeof document === 'undefined') {
      setMountNode(null);
      return undefined;
    }

    const attach = () => {
      const host = document.querySelector('#dashboard-calendar');
      if (!host) return;
      if (hostRef.current && hostRef.current !== host) hostRef.current.classList.remove('gd-calendar-modern-host');
      hostRef.current = host;
      host.classList.add('gd-calendar-modern-host');
      let node = host.querySelector(':scope > [data-modern-dashboard-calendar-mount="true"]');
      if (!node) {
        node = document.createElement('div');
        node.dataset.modernDashboardCalendarMount = 'true';
        host.appendChild(node);
      }
      setMountNode((current) => (current === node ? current : node));
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      hostRef.current?.classList.remove('gd-calendar-modern-host');
      const node = hostRef.current?.querySelector(':scope > [data-modern-dashboard-calendar-mount="true"]');
      node?.remove();
      hostRef.current = null;
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
  const events = useMemo(() => items
    .filter((item) => !isHiddenSystemItem(item) && !isTeachingPeriod(item) && isMine(item, currentUser, leader))
    .map((item) => normalizeItem(item, t))
    .filter((event) => {
      const time = new Date(event.startAt).getTime();
      return Number.isFinite(time) && time >= rangeStart.getTime() && time < rangeEnd.getTime();
    })
    .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
  [items, currentUser?.id, currentUser?.role, leader, rangeEnd, rangeStart, t]);

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
  const busiestDay = days.reduce((best, day) => (day.events.length > (best?.events.length || 0) ? day : best), days[0] || null);
  const monthRange = days.length
    ? `${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(days[0].date)} – ${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(days[days.length - 1].date)}`
    : '';

  const agendaGroups = useMemo(() => days.filter((day) => day.events.length), [days]);

  if (!mountNode || route !== 'dashboard') return null;

  return createPortal(
    <section className="gdc-calendar" aria-label={t.title} aria-busy={loading}>
      <header className="gdc-header">
        <div className="gdc-heading">
          <span>{t.eyebrow}</span>
          <h2>{t.title}</h2>
          <p>{t.lead}</p>
        </div>
        <div className="gdc-header-actions">
          <div className="gdc-mode-toggle" aria-label={t.title}>
            <button type="button" className={mode === 'split' ? 'active' : ''} onClick={() => setMode('split')}>{t.split}</button>
            <button type="button" className={mode === 'agenda' ? 'active' : ''} onClick={() => setMode('agenda')}>{t.agenda}</button>
          </div>
          <button type="button" className="gdc-refresh" onClick={() => load()} disabled={loading}>{loading ? t.refreshing : t.refresh}</button>
          <button type="button" className="gdc-open-full" onClick={() => { window.location.hash = '#/work-hub?view=schedule'; }}>{t.openFull}<span aria-hidden="true">›</span></button>
        </div>
      </header>

      <div className="gdc-summary-bar">
        <div><strong>{events.length}</strong><span>{t.events}</span></div>
        <div><strong>{activeDays}</strong><span>{t.activeDays}</span></div>
        <div><strong>{busiestDay?.events.length || 0}</strong><span>{t.busiest}</span></div>
        <div className="gdc-range"><strong>{monthRange}</strong><span>{RANGE_DAYS} ngày</span></div>
      </div>

      {error ? <div className="gdc-alert" role="status"><span>{t.error}</span><button type="button" onClick={() => setError('')}>×</button></div> : null}

      {mode === 'split' ? <div className="gdc-layout">
        <aside className="gdc-day-rail" aria-label={t.split}>
          {days.map((day) => {
            const selected = day.key === selectedDay?.key;
            const today = day.key === localDayKey(new Date());
            const preview = day.events[0]?.title || '';
            return <button type="button" key={day.key} className={`${selected ? 'is-selected' : ''}${today ? ' is-today' : ''}${day.events.length ? ' has-events' : ''}`} onClick={() => setSelectedKey(day.key)} aria-pressed={selected}>
              <span className="gdc-day-date"><strong>{day.date.getDate()}</strong><small>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day.date)}</small></span>
              <span className="gdc-day-copy"><strong>{today ? t.today : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(day.date)}</strong><small>{preview || t.emptyDay}</small></span>
              <span className="gdc-day-count">{day.events.length}</span>
            </button>;
          })}
        </aside>

        <section className="gdc-day-panel" aria-live="polite">
          <header className="gdc-day-panel-header">
            <div className="gdc-large-date"><strong>{selectedDay?.date.getDate() || '—'}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(selectedDay?.date || new Date())}</span></div>
            <div><span>{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selectedDay?.date || new Date())}</span><h3>{new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(selectedDay?.date || new Date())}</h3><p>{selectedDay?.events.length || 0} {t.events}</p></div>
            <div className="gdc-day-nav">
              <button type="button" aria-label={t.previous} disabled={selectedIndex <= 0} onClick={() => setSelectedKey(days[selectedIndex - 1]?.key || selectedKey)}>‹</button>
              <button type="button" aria-label={t.next} disabled={selectedIndex >= days.length - 1} onClick={() => setSelectedKey(days[selectedIndex + 1]?.key || selectedKey)}>›</button>
            </div>
          </header>
          <div className="gdc-event-list">
            {selectedDay?.events.length ? selectedDay.events.map((event) => <DashboardCalendarEvent key={event.id} event={event} locale={locale} t={t} />) : <div className="gdc-empty"><span aria-hidden="true">▦</span><strong>{t.emptyDay}</strong></div>}
          </div>
        </section>
      </div> : <div className="gdc-agenda">
        {agendaGroups.length ? agendaGroups.map((day) => <section key={day.key} className="gdc-agenda-day">
          <header><div><strong>{day.date.getDate()}</strong><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day.date)}</span></div><span><b>{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(day.date)}</b><small>{new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(day.date)}</small></span><em>{day.events.length} {t.events}</em></header>
          <div>{day.events.map((event) => <DashboardCalendarEvent key={event.id} event={event} locale={locale} t={t} />)}</div>
        </section>) : <div className="gdc-empty range"><span aria-hidden="true">▦</span><strong>{t.emptyRange}</strong></div>}
      </div>}
    </section>,
    mountNode,
  );
}
