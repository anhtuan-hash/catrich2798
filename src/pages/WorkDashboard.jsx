import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DASHBOARD_SOURCE_EVENTS,
  createEmptyDashboardSnapshot,
  dashboardDueLabel,
  formatDashboardDate,
  getDashboardDueState,
  loadDashboardSnapshot,
  openDashboardTarget,
} from '../utils/dashboardAggregator.js';
import '../styles/teacher-dashboard-google-workspace.css';

const COPY = {
  vi: {
    pageTitle: 'Dashboard', hello: 'Xin chào', teacher: 'Giáo viên', leader: 'Tổ trưởng',
    product: 'English Hub', workspace: 'Không gian làm việc', overview: 'Tổng quan hôm nay',
    lead: 'Lịch làm việc, học liệu, phản hồi và lớp chủ nhiệm được trình bày trong một giao diện Google Workspace thống nhất.',
    calendar: 'Lịch làm việc 14 ngày', calendarSummary: 'Công việc và sự kiện, không hiển thị tiết dạy',
    openCalendar: 'Mở lịch đầy đủ', refresh: 'Làm mới', refreshing: 'Đang đồng bộ…',
    upcomingEvents: 'Sự kiện trong 14 ngày', activeDays: 'Ngày có lịch', resourcesMetric: 'Học liệu gần đây',
    reviewMetric: 'Nội dung cần chú ý', busiestDay: 'Ngày nhiều lịch nhất', nextEvent: 'Sự kiện gần nhất',
    noUpcoming: 'Chưa có sự kiện sắp tới', selectedDay: 'Ngày đang chọn', events: 'sự kiện', noEvents: 'Không có lịch', today: 'Hôm nay',
    approvalsLeader: 'Phê duyệt và phản hồi', approvalsTeacher: 'Trạng thái đã gửi', resources: 'Học liệu gần đây',
    continue: 'Tiếp tục công việc', homeroom: 'Lớp chủ nhiệm', quickActions: 'Thao tác nhanh', viewAll: 'Xem tất cả',
    emptyCalendar: 'Không có công việc hoặc sự kiện trong ngày này.', emptyApprovals: 'Không có nội dung chờ xử lý.',
    emptyResources: 'Chưa có học liệu gần đây.', emptyContinue: 'Chưa có bản nháp hoặc ứng dụng gần đây.',
    students: 'Học sinh', absent: 'Vắng hôm nay', reminders: 'Nhắc việc', alerts: 'Cảnh báo',
    partial: 'Một số nguồn dữ liệu chưa phản hồi. Dashboard vẫn hiển thị phần dữ liệu đã tải được.', retry: 'Thử lại',
    createWork: 'Mở công việc', uploadResource: 'Tải học liệu', textLab: 'Tạo hoạt động', methodsHub: 'Phương pháp giảng dạy', games: 'Mở trò chơi',
    openHomeroom: 'Mở chủ nhiệm', source: 'Nguồn', allDay: 'Cả ngày', draft: 'Bản nháp', app: 'Ứng dụng',
  },
  en: {
    pageTitle: 'Dashboard', hello: 'Hello', teacher: 'Teacher', leader: 'Team leader',
    product: 'English Hub', workspace: 'Workspace', overview: 'Today overview',
    lead: 'Work calendar, resources, feedback and homeroom information in one unified Google Workspace interface.',
    calendar: '14-day work calendar', calendarSummary: 'Work and events; teaching periods are not shown',
    openCalendar: 'Open full calendar', refresh: 'Refresh', refreshing: 'Syncing…',
    upcomingEvents: 'Events in 14 days', activeDays: 'Scheduled days', resourcesMetric: 'Recent resources',
    reviewMetric: 'Items needing attention', busiestDay: 'Busiest day', nextEvent: 'Next event',
    noUpcoming: 'No upcoming events', selectedDay: 'Selected day', events: 'events', noEvents: 'No schedule', today: 'Today',
    approvalsLeader: 'Approvals and feedback', approvalsTeacher: 'Submission status', resources: 'Recent resources',
    continue: 'Continue working', homeroom: 'Homeroom', quickActions: 'Quick actions', viewAll: 'View all',
    emptyCalendar: 'No work or events on this day.', emptyApprovals: 'Nothing needs attention.',
    emptyResources: 'No recent resources.', emptyContinue: 'No recent drafts or apps.',
    students: 'Students', absent: 'Absent today', reminders: 'Reminders', alerts: 'Alerts',
    partial: 'Some data sources did not respond. Available data is still shown.', retry: 'Retry',
    createWork: 'Open work', uploadResource: 'Upload resource', textLab: 'Create activity', methodsHub: 'Teaching methods', games: 'Open games',
    openHomeroom: 'Open homeroom', source: 'Source', allDay: 'All day', draft: 'Draft', app: 'App',
  },
};

function initials(value) {
  return String(value || 'EH').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'EH';
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isTeachingPeriod(item) {
  return /tiết\s*dạy|teaching\s*period|lesson\s*period/i.test(`${item?.title || ''} ${item?.description || ''}`);
}

function statusLabel(value, language) {
  const status = String(value || '').toLowerCase();
  if (language === 'vi') {
    if (status === 'approved' || status === 'completed') return 'Đã duyệt';
    if (status === 'submitted' || status === 'pending') return 'Đang chờ';
    if (status === 'changes_requested' || status === 'revision') return 'Cần sửa';
    if (status === 'rejected') return 'Từ chối';
    return value || 'Mới';
  }
  if (status === 'approved' || status === 'completed') return 'Approved';
  if (status === 'submitted' || status === 'pending') return 'Waiting';
  if (status === 'changes_requested' || status === 'revision') return 'Needs changes';
  if (status === 'rejected') return 'Rejected';
  return value || 'New';
}

function eventTimeLabel(value, t, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t.allDay;
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (!hasTime) return t.allDay;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

function Empty({ children }) {
  return <div className="gwd-empty"><span aria-hidden="true">○</span><p>{children}</p></div>;
}

function Surface({ title, subtitle, icon, action, actionLabel, children, id, className = '' }) {
  return (
    <article className={`gwd-surface ${className}`} id={id}>
      <header className="gwd-surface-header">
        <div className="gwd-surface-title">
          <span className="gwd-surface-icon" aria-hidden="true">{icon}</span>
          <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
        </div>
        {action ? <button type="button" className="gwd-link-button" onClick={action}>{actionLabel}</button> : null}
      </header>
      <div className="gwd-surface-body">{children}</div>
    </article>
  );
}

function MiniRow({ item, language }) {
  return (
    <button type="button" className="gwd-row" onClick={() => openDashboardTarget(item)}>
      <span className="gwd-row-icon" aria-hidden="true">{initials(item.sourceLabel || 'EH')}</span>
      <span className="gwd-row-copy"><strong>{item.title}</strong><small>{item.owner || item.body || item.sourceLabel}{item.date ? ` · ${formatDashboardDate(item.date, language)}` : ''}</small></span>
      <em className="gwd-chip">{statusLabel(item.status, language)}</em>
    </button>
  );
}

function Tile({ item, language, t }) {
  return (
    <button type="button" className="gwd-tile" onClick={() => { window.location.hash = item.target || (item.route ? `#/${item.route}` : '#/apps'); }}>
      <span className="gwd-tile-icon" style={item.accent ? { background: `${item.accent}18`, color: item.accent } : undefined}>{item.icon || initials(item.sourceLabel)}</span>
      <span className="gwd-tile-copy"><strong>{item.title}</strong><small>{item.kind === 'draft' ? t.draft : item.owner || item.sourceLabel || t.app}</small></span>
    </button>
  );
}

function CalendarEvent({ item, language, locale, t }) {
  const state = getDashboardDueState(item.date, item.done);
  return (
    <button type="button" className={`gwd-event is-${state}`} onClick={() => openDashboardTarget(item)}>
      <span className="gwd-event-time"><strong>{eventTimeLabel(item.date, t, locale)}</strong><small>{dashboardDueLabel(item.date, item.done, language)}</small></span>
      <span className="gwd-event-line" aria-hidden="true" />
      <span className="gwd-event-copy"><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}<small>{t.source}: {item.owner || item.sourceLabel}</small></span>
      <span className="gwd-event-arrow" aria-hidden="true">›</span>
    </button>
  );
}

export default function WorkDashboard({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [snapshot, setSnapshot] = useState(() => createEmptyDashboardSnapshot(currentUser));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const next = await loadDashboardSnapshot(currentUser);
      setSnapshot(next);
      if (next.sourceErrors?.length) setError(next.sourceErrors.map((item) => `${item.source}: ${item.message}`).join(' · '));
    } catch (reason) {
      setError(reason?.message || String(reason));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const update = () => refresh({ quiet: true });
    DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.addEventListener(eventName, update));
    window.addEventListener('storage', update);
    const timer = window.setInterval(update, 60000);
    return () => {
      DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.removeEventListener(eventName, update));
      window.removeEventListener('storage', update);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const timeline = useMemo(() => (snapshot.timeline || []).filter((item) => !isTeachingPeriod(item)), [snapshot.timeline]);
  const calendarDays = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const key = dateKey(date);
    return { date, key, events: timeline.filter((item) => dateKey(item.date) === key) };
  }), [timeline]);
  const selectedCalendarDay = useMemo(() => calendarDays.find((day) => day.key === selectedDay) || calendarDays[0], [calendarDays, selectedDay]);
  const selectedEvents = selectedCalendarDay?.events || [];
  const activeDays = calendarDays.filter((day) => day.events.length > 0).length;
  const busiestDay = calendarDays.reduce((best, day) => day.events.length > (best?.events?.length || 0) ? day : best, calendarDays[0]);
  const nextEvent = timeline[0] || null;

  const feedbackItems = useMemo(() => {
    if (snapshot.approvals?.length) return snapshot.approvals;
    return (snapshot.professional || []).filter((item) => ['submitted', 'approved', 'changes_requested', 'revision', 'rejected'].includes(String(item.status || '').toLowerCase())).slice(0, 8);
  }, [snapshot.approvals, snapshot.professional]);

  const name = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || t.teacher;
  const role = snapshot.leader ? t.leader : t.teacher;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const todayKey = dateKey(new Date());
  const todayLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const selectedWeekday = selectedCalendarDay ? new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selectedCalendarDay.date) : '';
  const selectedDate = selectedCalendarDay ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(selectedCalendarDay.date) : '';
  const reviewCount = snapshot.leader ? (snapshot.stats?.pendingApproval || 0) : feedbackItems.length;
  const initialLoading = loading && !snapshot.generatedAt;

  const quickActions = [
    ['✓', t.createWork, '#/work-hub'],
    ['▣', t.uploadResource, '#/resource-library'],
    ['✦', t.textLab, '#/tool/textlab-activities'],
    ['TM', t.methodsHub, '#/tool/teaching-methods-hub'],
    ['◇', t.games, '#/games'],
    ...(snapshot.homeroom ? [['◆', t.openHomeroom, '#/homeroom']] : []),
  ];

  return (
    <section className={`gwd-page${initialLoading ? ' is-loading' : ''}`} aria-label={t.pageTitle} aria-busy={loading}>
      <header className="gwd-appbar">
        <div className="gwd-brand"><span className="gwd-brand-mark" aria-hidden="true">E</span><div className="gwd-brand-copy"><strong>{t.product}</strong><span>{t.workspace}</span></div></div>
        <div className="gwd-user"><div className="gwd-user-copy"><strong>{name}</strong><span>{role}</span></div><span className="gwd-avatar">{initials(name)}</span></div>
      </header>

      <main className="gwd-main">
        <section className="gwd-welcome">
          <div className="gwd-welcome-copy"><span>{t.overview}</span><h1>{t.hello}, {name}</h1><p>{t.lead}</p></div>
          <div className="gwd-actions">
            <button type="button" className="gwd-button primary" onClick={() => document.querySelector('#dashboard-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>▦ {t.calendar}</button>
            <button type="button" className="gwd-button outlined" onClick={() => refresh()} disabled={loading}>↻ {loading ? t.refreshing : t.refresh}</button>
          </div>
        </section>

        {error ? <div className="gwd-alert"><span aria-hidden="true">!</span><div><strong>{t.partial}</strong><small>{error}</small></div><button type="button" className="gwd-link-button" onClick={() => refresh()}>{t.retry}</button></div> : null}

        <section className="gwd-summary" aria-label={t.overview}>
          <button type="button" className="gwd-summary-item is-blue" onClick={() => document.querySelector('#dashboard-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>{t.upcomingEvents}</span><strong>{timeline.length}</strong><small>{activeDays} {t.activeDays.toLowerCase()}</small></button>
          <button type="button" className="gwd-summary-item is-green" onClick={() => document.querySelector('#dashboard-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>{t.busiestDay}</span><strong>{busiestDay?.events?.length || 0}</strong><small>{busiestDay ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(busiestDay.date) : '—'}</small></button>
          <button type="button" className="gwd-summary-item is-amber" onClick={() => document.querySelector('#dashboard-resources')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>{t.resourcesMetric}</span><strong>{snapshot.recentResources?.length || 0}</strong><small>{t.resources}</small></button>
          <button type="button" className="gwd-summary-item is-purple" onClick={() => document.querySelector('#dashboard-approvals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>{t.reviewMetric}</span><strong>{reviewCount}</strong><small>{snapshot.leader ? t.approvalsLeader : t.approvalsTeacher}</small></button>
        </section>

        <article className="gwd-surface gwd-calendar" id="dashboard-calendar">
          <header className="gwd-surface-header">
            <div className="gwd-surface-title"><span className="gwd-surface-icon" aria-hidden="true">▦</span><div><h2>{t.calendar}</h2><p>{t.calendarSummary}</p></div></div>
            <button type="button" className="gwd-link-button" onClick={() => { window.location.hash = '#/work-hub'; }}>{t.openCalendar}</button>
          </header>
          <div className="gwd-calendar-toolbar">
            <div className="gwd-calendar-toolbar-info"><strong>{selectedWeekday}</strong><span>{selectedDate}</span></div>
            <span className="gwd-chip">{nextEvent ? `${t.nextEvent}: ${nextEvent.title}` : t.noUpcoming}</span>
          </div>
          <div className="gwd-date-rail" aria-label={t.calendar}>
            {calendarDays.map((day) => {
              const selected = selectedDay === day.key;
              const today = todayKey === day.key;
              return (
                <button type="button" key={day.key} className={`gwd-day${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}${day.events.length ? ' has-events' : ''}`} onClick={() => setSelectedDay(day.key)}>
                  <span className="gwd-day-weekday">{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date)}</span>
                  <strong className="gwd-day-number">{day.date.getDate()}</strong>
                  <span className="gwd-day-month">{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day.date)}</span>
                  <span className="gwd-day-count">{today ? t.today : day.events.length ? `${day.events.length} ${t.events}` : t.noEvents}</span>
                </button>
              );
            })}
          </div>
          <div className="gwd-calendar-content">
            <aside className="gwd-selected-date"><span>{t.selectedDay}</span><strong>{selectedCalendarDay?.date?.getDate() || '—'}</strong><h3>{selectedWeekday}</h3><p>{selectedDate}</p><div><b>{selectedEvents.length}</b><span>{t.events}</span></div></aside>
            <section className="gwd-agenda" aria-live="polite">
              <header className="gwd-agenda-header"><h3>{selectedWeekday}</h3><span>{selectedEvents.length} {t.events}</span></header>
              <div className="gwd-agenda-list">{initialLoading ? <Empty>{t.refreshing}</Empty> : selectedEvents.length ? selectedEvents.map((item) => <CalendarEvent key={item.id} item={item} language={language} locale={locale} t={t} />) : <Empty>{t.emptyCalendar}</Empty>}</div>
            </section>
          </div>
        </article>

        <section className="gwd-grid">
          <Surface id="dashboard-approvals" title={snapshot.leader ? t.approvalsLeader : t.approvalsTeacher} icon="▣" action={() => { window.location.hash = snapshot.leader ? '#/resource-library' : '#/work-hub'; }} actionLabel={t.viewAll}>
            <div className="gwd-list">{feedbackItems.length ? feedbackItems.map((item) => <MiniRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyApprovals}</Empty>}</div>
          </Surface>
          <Surface id="dashboard-resources" title={t.resources} icon="▤" action={() => { window.location.hash = '#/resource-library'; }} actionLabel={t.viewAll}>
            <div className="gwd-tile-grid">{snapshot.recentResources?.length ? snapshot.recentResources.map((item) => <Tile key={item.id} item={{ ...item, target: '#/resource-library', icon: 'RL' }} language={language} t={t} />) : <Empty>{t.emptyResources}</Empty>}</div>
          </Surface>
        </section>

        <section className="gwd-grid">
          <Surface title={t.continue} icon="↔" action={() => { window.location.hash = '#/apps'; }} actionLabel={t.viewAll}>
            <div className="gwd-tile-grid">{snapshot.continueItems?.length ? snapshot.continueItems.map((item) => <Tile key={`${item.id}:${item.target}`} item={item} language={language} t={t} />) : <Empty>{t.emptyContinue}</Empty>}</div>
          </Surface>
          {snapshot.homeroom ? <Surface title={t.homeroom} icon="◆" action={() => { window.location.hash = '#/homeroom'; }} actionLabel={t.viewAll}>
            <div className="gwd-homeroom">{[[t.students, snapshot.homeroom.studentCount], [t.absent, snapshot.homeroom.absentToday], [t.reminders, snapshot.homeroom.reminders], [t.alerts, snapshot.homeroom.alerts]].map(([label, value]) => <button type="button" key={label} onClick={() => { window.location.hash = '#/homeroom'; }}><strong>{value}</strong><span>{label}</span></button>)}</div>
          </Surface> : <Surface title={t.quickActions} icon="＋"><div className="gwd-quick-actions">{quickActions.map(([icon, label, target]) => <button type="button" key={label} className="gwd-quick-action" onClick={() => { window.location.hash = target; }}><span aria-hidden="true">{icon}</span>{label}</button>)}</div></Surface>}
        </section>

        {snapshot.homeroom ? <Surface title={t.quickActions} icon="＋"><div className="gwd-quick-actions">{quickActions.map(([icon, label, target]) => <button type="button" key={label} className="gwd-quick-action" onClick={() => { window.location.hash = target; }}><span aria-hidden="true">{icon}</span>{label}</button>)}</div></Surface> : null}
      </main>
    </section>
  );
}
