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
import '../styles/teacher-dashboard-google-v1.css';
import '../styles/teacher-dashboard-deduplicated.css';

const COPY = {
  vi: {
    pageTitle: 'Dashboard', hello: 'Xin chào', teacher: 'Giáo viên', leader: 'Tổ trưởng',
    lead: 'Theo dõi lịch làm việc, học liệu, phản hồi và lớp chủ nhiệm trong một giao diện gọn, rõ và không lặp dữ liệu.',
    upcomingEvents: 'Sự kiện trong 14 ngày', activeDays: 'Ngày có lịch', resourcesMetric: 'Học liệu gần đây',
    approvalsLeader: 'Phê duyệt và phản hồi', approvalsTeacher: 'Trạng thái đã gửi', resources: 'Học liệu gần đây',
    continue: 'Tiếp tục công việc', homeroom: 'Lớp chủ nhiệm', quickActions: 'Thao tác nhanh',
    workHub: 'Trung tâm công việc', resourceHub: 'Kho học liệu', viewAll: 'Xem tất cả', refresh: 'Làm mới', refreshing: 'Đang đồng bộ…',
    emptyCalendar: 'Không có công việc hoặc sự kiện trong ngày này.', emptyApprovals: 'Không có nội dung chờ xử lý.',
    emptyResources: 'Chưa có học liệu gần đây.', emptyContinue: 'Chưa có bản nháp hoặc ứng dụng gần đây.',
    students: 'Học sinh', absent: 'Vắng hôm nay', reminders: 'Nhắc việc', alerts: 'Cảnh báo',
    partial: 'Một số nguồn dữ liệu chưa phản hồi. Dashboard vẫn hiển thị phần dữ liệu đã tải được.', retry: 'Thử lại',
    createWork: 'Mở công việc', uploadResource: 'Tải học liệu', textLab: 'Tạo hoạt động', methodsHub: 'Phương pháp giảng dạy', games: 'Mở trò chơi',
    openCalendar: 'Xem lịch', openHomeroom: 'Mở chủ nhiệm',
    calendar: 'Lịch làm việc 14 ngày', calendarSummary: 'Công việc và sự kiện, không hiển thị tiết dạy',
    events: 'sự kiện', noEvents: 'Không có lịch', today: 'Hôm nay', selectedDay: 'Ngày đang chọn', openFullCalendar: 'Mở lịch đầy đủ',
    busiestDay: 'Ngày nhiều lịch nhất', nextEvent: 'Sự kiện gần nhất', noUpcoming: 'Chưa có sự kiện sắp tới',
    submissionUpdates: 'Cập nhật hồ sơ', eventSource: 'Nguồn', eventTime: 'Thời gian',
  },
  en: {
    pageTitle: 'Dashboard', hello: 'Hello', teacher: 'Teacher', leader: 'Team leader',
    lead: 'Track the work calendar, resources, feedback and homeroom information in a clean dashboard without duplicated data.',
    upcomingEvents: 'Events in 14 days', activeDays: 'Scheduled days', resourcesMetric: 'Recent resources',
    approvalsLeader: 'Approvals and feedback', approvalsTeacher: 'Submission status', resources: 'Recent resources',
    continue: 'Continue working', homeroom: 'Homeroom', quickActions: 'Quick actions',
    workHub: 'Work Hub', resourceHub: 'Resource Library', viewAll: 'View all', refresh: 'Refresh', refreshing: 'Syncing…',
    emptyCalendar: 'No work or events on this day.', emptyApprovals: 'Nothing needs attention.',
    emptyResources: 'No recent resources.', emptyContinue: 'No recent drafts or apps.',
    students: 'Students', absent: 'Absent today', reminders: 'Reminders', alerts: 'Alerts',
    partial: 'Some data sources did not respond. Available data is still shown.', retry: 'Retry',
    createWork: 'Open work', uploadResource: 'Upload resource', textLab: 'Create activity', methodsHub: 'Teaching methods', games: 'Open games',
    openCalendar: 'View calendar', openHomeroom: 'Open homeroom',
    calendar: '14-day work calendar', calendarSummary: 'Work and events; teaching periods are not shown',
    events: 'events', noEvents: 'No schedule', today: 'Today', selectedDay: 'Selected day', openFullCalendar: 'Open full calendar',
    busiestDay: 'Busiest day', nextEvent: 'Next event', noUpcoming: 'No upcoming events',
    submissionUpdates: 'Submission updates', eventSource: 'Source', eventTime: 'Time',
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

function eventTimeLabel(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return language === 'vi' ? 'Cả ngày' : 'All day';
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (!hasTime) return language === 'vi' ? 'Cả ngày' : 'All day';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function Empty({ children }) {
  return <div className="tdb-empty"><span aria-hidden="true">◇</span><p>{children}</p></div>;
}

function Card({ title, subtitle, icon, action, actionLabel, children, className = '', id }) {
  return (
    <article className={`tdb-card ${className}`} id={id}>
      <header className="tdb-card-head">
        <div className="tdb-card-title"><span aria-hidden="true">{icon}</span><div><h2>{title}</h2>{subtitle ? <small>{subtitle}</small> : null}</div></div>
        <div className="tdb-card-head-actions">
          {actionLabel ? <button type="button" className="tdb-card-link" onClick={action}>{actionLabel}</button> : null}
          {!actionLabel && action ? <button type="button" className="tdb-icon-button" onClick={action} aria-label={title}>›</button> : null}
        </div>
      </header>
      <div className="tdb-card-body">{children}</div>
    </article>
  );
}

function MiniRow({ item, language }) {
  return (
    <button type="button" className="tdb-row" onClick={() => openDashboardTarget(item)}>
      <span className="tdb-row-icon" aria-hidden="true">{initials(item.sourceLabel || 'EH')}</span>
      <span className="tdb-row-copy"><strong>{item.title}</strong><small>{item.owner || item.body || item.sourceLabel}{item.date ? ` · ${formatDashboardDate(item.date, language)}` : ''}</small></span>
      <span className="tdb-row-meta"><em className="tdb-badge">{statusLabel(item.status, language)}</em></span>
    </button>
  );
}

function Tile({ item, language }) {
  return (
    <button type="button" className="tdb-mini-tile" onClick={() => { window.location.hash = item.target || (item.route ? `#/${item.route}` : '#/apps'); }}>
      <span style={item.accent ? { background: `${item.accent}18`, color: item.accent } : undefined}>{item.icon || initials(item.sourceLabel)}</span>
      <div><strong>{item.title}</strong><small>{item.kind === 'draft' ? (language === 'vi' ? 'Bản nháp' : 'Draft') : item.owner || item.sourceLabel || (language === 'vi' ? 'Ứng dụng' : 'App')}</small></div>
    </button>
  );
}

function CalendarEvent({ item, language, t }) {
  const state = getDashboardDueState(item.date, item.done);
  return (
    <button type="button" className={`tdb-modern-event is-${state}`} onClick={() => openDashboardTarget(item)}>
      <span className="tdb-modern-event-time"><strong>{eventTimeLabel(item.date, language)}</strong><small>{dashboardDueLabel(item.date, item.done, language)}</small></span>
      <span className="tdb-modern-event-marker" aria-hidden="true"><i /></span>
      <span className="tdb-modern-event-copy">
        <strong>{item.title}</strong>
        {item.description ? <p>{item.description}</p> : null}
        <small><b>{t.eventSource}:</b> {item.owner || item.sourceLabel}</small>
      </span>
      <span className="tdb-modern-event-arrow" aria-hidden="true">›</span>
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
  const initialLoading = loading && !snapshot.generatedAt;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const todayKey = dateKey(new Date());
  const todayLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const selectedWeekday = selectedCalendarDay ? new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(selectedCalendarDay.date) : '';
  const selectedDate = selectedCalendarDay ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(selectedCalendarDay.date) : '';

  const quickActions = [
    ['✓', t.createWork, '#/work-hub'],
    ['▣', t.uploadResource, '#/resource-library'],
    ['✦', t.textLab, '#/tool/textlab-activities'],
    ['TM', t.methodsHub, '#/tool/teaching-methods-hub'],
    ['◇', t.games, '#/games'],
    ['▦', t.openCalendar, '#dashboard-calendar'],
    ...(snapshot.homeroom ? [['◆', t.openHomeroom, '#/homeroom']] : []),
  ];

  const topMetrics = [
    ['is-blue', '▦', timeline.length, t.upcomingEvents, 'calendar'],
    ['is-green', '●', activeDays, t.activeDays, 'calendar'],
    ['is-amber', '▤', snapshot.recentResources?.length || 0, t.resourcesMetric, 'resources'],
    ['is-purple', '▣', snapshot.leader ? (snapshot.stats?.pendingApproval || 0) : feedbackItems.length, snapshot.leader ? t.approvalsLeader : t.submissionUpdates, 'approvals'],
  ];

  return (
    <section className={`tdb-page${initialLoading ? ' is-loading' : ''}`} aria-label={t.pageTitle} aria-busy={loading}>
      <header className="tdb-hero">
        <div>
          <span className="tdb-eyebrow">ENGLISH HUB · DASHBOARD</span>
          <h1>{t.hello}, {name}!</h1>
          <p>{t.lead}</p>
          <div className="tdb-hero-actions">
            <button type="button" className="tdb-button primary" onClick={() => { document.querySelector('#dashboard-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>▦ {t.calendar}</button>
            <button type="button" className="tdb-button" onClick={() => { window.location.hash = '#/resource-library'; }}>▣ {t.resourceHub}</button>
          </div>
        </div>
        <aside className="tdb-profile">
          <div className="tdb-profile-main"><span className="tdb-avatar">{initials(name)}</span><div><strong>{name}</strong><span>{role}</span><small>English Hub</small></div></div>
          <div className="tdb-profile-date"><span>{todayLabel}</span><strong>{snapshot.generatedAt ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(snapshot.generatedAt)) : '—'}</strong></div>
          <button type="button" className="tdb-button" onClick={() => refresh()} disabled={loading}>↻ {loading ? t.refreshing : t.refresh}</button>
        </aside>
      </header>

      {error ? <div className="tdb-alert"><span aria-hidden="true">!</span><div><strong>{t.partial}</strong><small>{error}</small></div><button type="button" className="tdb-card-link" onClick={() => refresh()}>{t.retry}</button></div> : null}

      <section className="tdb-metrics" aria-label="Dashboard metrics">
        {topMetrics.map(([tone, icon, value, label, target]) => (
          <button key={label} type="button" className={`tdb-metric ${tone}`} onClick={() => document.querySelector(`#dashboard-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <span className="tdb-metric-icon" aria-hidden="true">{icon}</span>
            <span className="tdb-metric-copy"><strong>{value}</strong><span>{label}</span><small>{t.viewAll}</small></span>
          </button>
        ))}
      </section>

      <article className="tdb-modern-calendar" id="dashboard-calendar">
        <header className="tdb-modern-calendar-head">
          <div className="tdb-modern-calendar-title">
            <span className="tdb-modern-calendar-icon" aria-hidden="true">▦</span>
            <div><span className="tdb-modern-calendar-kicker">14-DAY WORKSPACE</span><h2>{t.calendar}</h2><p>{t.calendarSummary}</p></div>
          </div>
          <button type="button" className="tdb-modern-calendar-open" onClick={() => { window.location.hash = '#/work-hub'; }}>{t.openFullCalendar}<span aria-hidden="true">↗</span></button>
        </header>

        <div className="tdb-calendar-insights">
          <div><span>{t.upcomingEvents}</span><strong>{timeline.length}</strong><small>{activeDays} {t.activeDays.toLowerCase()}</small></div>
          <div><span>{t.busiestDay}</span><strong>{busiestDay?.events?.length || 0}</strong><small>{busiestDay ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(busiestDay.date) : '—'}</small></div>
          <div className="is-wide"><span>{t.nextEvent}</span><strong>{nextEvent?.title || t.noUpcoming}</strong><small>{nextEvent ? `${formatDashboardDate(nextEvent.date, language)} · ${nextEvent.owner || nextEvent.sourceLabel}` : t.calendarSummary}</small></div>
        </div>

        <div className="tdb-calendar-rail" aria-label={t.calendar}>
          {calendarDays.map((day) => {
            const selected = selectedDay === day.key;
            const today = todayKey === day.key;
            return (
              <button type="button" key={day.key} className={`tdb-calendar-day-card${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}${day.events.length ? ' has-events' : ''}`} onClick={() => setSelectedDay(day.key)}>
                <span className="tdb-calendar-day-weekday">{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date)}</span>
                <strong>{day.date.getDate()}</strong>
                <span className="tdb-calendar-day-month">{new Intl.DateTimeFormat(locale, { month: 'short' }).format(day.date)}</span>
                <span className="tdb-calendar-day-count">{day.events.length ? `${day.events.length} ${t.events}` : t.noEvents}</span>
                <span className="tdb-calendar-day-dots" aria-hidden="true">{day.events.slice(0, 3).map((item) => <i key={item.id} />)}</span>
                {today ? <em>{t.today}</em> : null}
              </button>
            );
          })}
        </div>

        <div className="tdb-calendar-detail">
          <aside className="tdb-calendar-selected-date">
            <span>{t.selectedDay}</span>
            <strong>{selectedCalendarDay?.date?.getDate() || '—'}</strong>
            <h3>{selectedWeekday}</h3>
            <p>{selectedDate}</p>
            <div><b>{selectedEvents.length}</b><span>{t.events}</span></div>
          </aside>
          <section className="tdb-calendar-agenda" aria-live="polite">
            <header><div><span>{selectedWeekday}</span><h3>{selectedDate}</h3></div><em>{selectedEvents.length} {t.events}</em></header>
            <div className="tdb-calendar-agenda-list">
              {initialLoading ? <Empty>{t.refreshing}</Empty> : selectedEvents.length ? selectedEvents.map((item) => <CalendarEvent key={item.id} item={item} language={language} t={t} />) : <Empty>{t.emptyCalendar}</Empty>}
            </div>
          </section>
        </div>
      </article>

      <section className="tdb-grid-equal">
        <Card id="dashboard-approvals" title={snapshot.leader ? t.approvalsLeader : t.approvalsTeacher} icon="▣" action={() => { window.location.hash = snapshot.leader ? '#/resource-library' : '#/work-hub'; }} actionLabel={t.viewAll}>
          <div className="tdb-scroll is-short">{feedbackItems.length ? feedbackItems.map((item) => <MiniRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyApprovals}</Empty>}</div>
        </Card>
        <Card id="dashboard-resources" title={t.resources} icon="▤" action={() => { window.location.hash = '#/resource-library'; }} actionLabel={t.viewAll}>
          <div className="tdb-resource-grid">{snapshot.recentResources?.length ? snapshot.recentResources.map((item) => <Tile key={item.id} item={{ ...item, target: '#/resource-library', icon: 'RL' }} language={language} />) : <Empty>{t.emptyResources}</Empty>}</div>
        </Card>
      </section>

      <section className={snapshot.homeroom ? 'tdb-grid-equal' : ''}>
        <Card title={t.continue} icon="↔" action={() => { window.location.hash = '#/apps'; }} actionLabel={t.viewAll}>
          <div className="tdb-continue-grid">{snapshot.continueItems?.length ? snapshot.continueItems.map((item) => <Tile key={`${item.id}:${item.target}`} item={item} language={language} />) : <Empty>{t.emptyContinue}</Empty>}</div>
        </Card>
        {snapshot.homeroom ? <Card title={t.homeroom} icon="◆" action={() => { window.location.hash = '#/homeroom'; }} actionLabel={t.viewAll}>
          <div className="tdb-homeroom-grid">
            {[[t.students, snapshot.homeroom.studentCount], [t.absent, snapshot.homeroom.absentToday], [t.reminders, snapshot.homeroom.reminders], [t.alerts, snapshot.homeroom.alerts]].map(([label, value]) => <button type="button" key={label} className="tdb-homeroom-stat" onClick={() => { window.location.hash = '#/homeroom'; }}><strong>{value}</strong><span>{label}</span></button>)}
          </div>
        </Card> : null}
      </section>

      <Card title={t.quickActions} icon="＋">
        <div className="tdb-quick-actions">
          {quickActions.map(([icon, label, target]) => <button type="button" key={label} className="tdb-quick-action" onClick={() => {
            if (target === '#dashboard-calendar') document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.location.hash = target;
          }}><span aria-hidden="true">{icon}</span><strong>{label}</strong></button>)}
        </div>
      </Card>
    </section>
  );
}
