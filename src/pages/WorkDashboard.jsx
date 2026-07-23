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
import './WorkDashboardPremium.css';

const COPY = {
  vi: {
    pageTitle: 'Bảng điều hành', hello: 'Xin chào', teacher: 'Giáo viên', leader: 'Tổ trưởng',
    lead: 'Theo dõi công việc, lịch dạy, học liệu và lớp chủ nhiệm trong một không gian rõ ràng.',
    today: 'Việc hôm nay', soon: 'Sắp đến hạn', upcoming: 'Lịch 14 ngày', overdue: 'Quá hạn', completion: 'Hoàn thành',
    tasks: 'Công việc cần xử lý', schedule: 'Lịch sắp tới', approvals: 'Nội dung chờ duyệt',
    professional: 'Hoạt động chuyên môn', homeroom: 'Chủ nhiệm', resources: 'Học liệu gần đây', continue: 'Tiếp tục công việc',
    workHub: 'Trung tâm công việc', resourceHub: 'Kho học liệu', viewAll: 'Xem tất cả', refresh: 'Làm mới', refreshing: 'Đang đồng bộ…',
    all: 'Tất cả', pending: 'Chờ duyệt', emptyTasks: 'Không có công việc cần xử lý.', emptySchedule: 'Chưa có lịch trong 14 ngày tới.',
    emptyApprovals: 'Không có nội dung chờ duyệt.', emptyProfessional: 'Chưa có hoạt động chuyên môn.', emptyResources: 'Chưa có học liệu gần đây.',
    emptyContinue: 'Chưa có bản nháp hoặc ứng dụng gần đây.', emptyHomeroom: 'Chưa có dữ liệu chủ nhiệm.',
    students: 'Học sinh', absent: 'Vắng hôm nay', reminders: 'Nhắc việc', alerts: 'Cảnh báo',
    partial: 'Một số nguồn dữ liệu chưa phản hồi. Dashboard vẫn hiển thị phần dữ liệu đã tải được.', retry: 'Thử lại',
    openTasks: 'việc đang mở', dashboardLabel: 'BRIAN WORKSPACE', roleLabel: 'Không gian theo vai trò',
  },
  en: {
    pageTitle: 'Work Dashboard', hello: 'Hello', teacher: 'Teacher', leader: 'Team leader',
    lead: 'Track work, schedules, resources and homeroom activity in one clear workspace.',
    today: 'Due today', soon: 'Due soon', upcoming: '14-day schedule', overdue: 'Overdue', completion: 'Completion',
    tasks: 'Work requiring attention', schedule: 'Upcoming schedule', approvals: 'Pending approvals',
    professional: 'Professional work', homeroom: 'Homeroom', resources: 'Recent resources', continue: 'Continue working',
    workHub: 'Work Hub', resourceHub: 'Resource Library', viewAll: 'View all', refresh: 'Refresh', refreshing: 'Syncing…',
    all: 'All', pending: 'Pending', emptyTasks: 'No work requires attention.', emptySchedule: 'No schedule in the next 14 days.',
    emptyApprovals: 'Nothing is waiting for approval.', emptyProfessional: 'No professional activity yet.', emptyResources: 'No recent resources.',
    emptyContinue: 'No recent drafts or apps.', emptyHomeroom: 'No homeroom data.',
    students: 'Students', absent: 'Absent today', reminders: 'Reminders', alerts: 'Alerts',
    partial: 'Some data sources did not respond. Available data is still shown.', retry: 'Retry',
    openTasks: 'open tasks', dashboardLabel: 'BRIAN WORKSPACE', roleLabel: 'Role-aware workspace',
  },
};

const ICON_PATHS = {
  tasks: <><path d="M24 22h52v56H24z"/><path d="M35 38h30M35 51h24M35 64h18"/><path d="m63 65 6 6 13-17"/></>,
  calendar: <><rect x="19" y="25" width="62" height="56" rx="8"/><path d="M31 16v18M69 16v18M19 42h62M33 55h8M48 55h8M63 55h8M33 68h8M48 68h8"/></>,
  approval: <><path d="M50 14 78 25v21c0 20-11 33-28 40-17-7-28-20-28-40V25l28-11Z"/><path d="m36 50 9 9 20-22"/></>,
  team: <><circle cx="38" cy="38" r="12"/><circle cx="67" cy="42" r="9"/><path d="M17 82c2-18 11-27 24-27s22 9 24 27M59 62c13 0 21 7 23 20"/></>,
  homeroom: <><path d="m15 46 35-27 35 27"/><path d="M24 42v40h52V42M42 82V58h16v24"/></>,
  resources: <><path d="M15 29h31l10 10h29v40H15V29Z"/><path d="M15 43h70M29 57h42M29 68h27"/></>,
  continue: <><path d="M22 31h44a16 16 0 0 1 0 32H34"/><path d="m45 48-14 15 14 15"/></>,
  arrow: <><path d="M24 50h50"/><path d="m59 34 16 16-16 16"/></>,
  refresh: <><path d="M75 34A29 29 0 1 0 78 63"/><path d="M75 19v17H58"/></>,
};

function DashboardIcon({ name }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {ICON_PATHS[name] || ICON_PATHS.tasks}
      </g>
    </svg>
  );
}

function initials(value) {
  return String(value || 'BE').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'BE';
}

function EmptyState({ children }) {
  return <div className="bpd-empty"><span>◇</span><p>{children}</p></div>;
}

function Panel({ title, icon, action, children, className = '' }) {
  return (
    <article className={`bpd-panel ${className}`}>
      <header className="bpd-panel-head">
        <div><span className="bpd-panel-icon"><DashboardIcon name={icon} /></span><h2>{title}</h2></div>
        {action ? <button type="button" onClick={action} aria-label={title}><DashboardIcon name="arrow" /></button> : null}
      </header>
      <div className="bpd-panel-body">{children}</div>
    </article>
  );
}

function TaskRow({ item, language }) {
  const state = getDashboardDueState(item.date, item.done);
  return (
    <button type="button" className={`bpd-task-row tone-${state}`} onClick={() => openDashboardTarget(item)}>
      <span className="bpd-task-check" aria-hidden="true">{item.done ? '✓' : ''}</span>
      <span className="bpd-task-copy"><strong>{item.title}</strong><small>{item.owner || item.sourceLabel}</small></span>
      <span className="bpd-source">{item.sourceLabel}</span>
      <span className={`bpd-status tone-${state}`}>{dashboardDueLabel(item.date, item.done, language)}</span>
      <span className="bpd-row-arrow"><DashboardIcon name="arrow" /></span>
    </button>
  );
}

function CompactRow({ item, language }) {
  return (
    <button type="button" className="bpd-compact-row" onClick={() => openDashboardTarget(item)}>
      <span className="bpd-source-avatar">{initials(item.sourceLabel)}</span>
      <span className="bpd-compact-copy"><strong>{item.title}</strong><small>{item.owner || item.sourceLabel}{item.date ? ` · ${formatDashboardDate(item.date, language)}` : ''}</small></span>
      <em>{item.status || (language === 'vi' ? 'Mới' : 'New')}</em>
      <span className="bpd-row-arrow"><DashboardIcon name="arrow" /></span>
    </button>
  );
}

function RecentCard({ item, language }) {
  return (
    <button type="button" className="bpd-recent-card" onClick={() => { window.location.hash = item.target; }}>
      <span className="bpd-recent-icon" style={{ '--recent-accent': item.accent || '#4d84d9' }}>{item.icon || 'GO'}</span>
      <span><strong>{item.title}</strong><small>{item.kind === 'draft' ? (language === 'vi' ? 'Bản nháp' : 'Draft') : (language === 'vi' ? 'Ứng dụng' : 'App')}</small></span>
      <DashboardIcon name="arrow" />
    </button>
  );
}

function Metric({ kind, value, label, note, onClick }) {
  return (
    <button type="button" className={`bpd-metric tone-${kind}`} onClick={onClick}>
      <span className="bpd-metric-mark" />
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{note}</em>
    </button>
  );
}

export default function WorkDashboard({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [snapshot, setSnapshot] = useState(() => createEmptyDashboardSnapshot(currentUser));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

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

  const tasks = useMemo(() => {
    const items = snapshot.attention || [];
    if (filter === 'pending') return snapshot.approvals || [];
    if (filter === 'all') return items;
    return items.filter((item) => getDashboardDueState(item.date, item.done) === filter);
  }, [snapshot, filter]);

  const name = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || t.teacher;
  const role = snapshot.leader ? t.leader : t.teacher;
  const health = snapshot.workflowHealth || { progress: 0, open: 0 };
  const initialLoading = loading && !snapshot.generatedAt;
  const go = (target) => { window.location.hash = target; };

  return (
    <section className={`bpd-page${initialLoading ? ' is-loading' : ''}`} aria-label={t.pageTitle} aria-busy={loading}>
      <header className="bpd-hero">
        <div className="bpd-hero-copy">
          <span className="bpd-eyebrow">{t.dashboardLabel}</span>
          <h1>{t.hello}, <em>{name}</em>.</h1>
          <p>{t.lead}</p>
          <div className="bpd-hero-actions">
            <button type="button" className="primary" onClick={() => go('#/work-hub')}><DashboardIcon name="tasks" />{t.workHub}<b>→</b></button>
            <button type="button" onClick={() => go('#/resource-library')}><DashboardIcon name="resources" />{t.resourceHub}</button>
          </div>
        </div>

        <aside className="bpd-profile">
          <div className="bpd-profile-top">
            <span className="bpd-avatar">{initials(name)}<i /></span>
            <div><small>{t.roleLabel}</small><strong>{name}</strong><em>{role}</em></div>
          </div>
          <div className="bpd-profile-progress">
            <span><small>{t.completion}</small><strong>{health.progress || 0}%</strong></span>
            <div><i style={{ width: `${Math.max(0, Math.min(100, health.progress || 0))}%` }} /></div>
            <small>{health.open || 0} {t.openTasks}</small>
          </div>
          <button type="button" className="bpd-refresh" onClick={() => refresh()} disabled={loading}><DashboardIcon name="refresh" />{loading ? t.refreshing : t.refresh}</button>
        </aside>
      </header>

      {error ? <div className="bpd-error"><span>!</span><div><strong>{t.partial}</strong><small>{error}</small></div><button type="button" onClick={() => refresh()}>{t.retry}</button></div> : null}

      <section className="bpd-metrics" aria-label="Dashboard metrics">
        <Metric kind="today" value={snapshot.stats?.today || 0} label={t.today} note={t.viewAll} onClick={() => setFilter('today')} />
        <Metric kind="soon" value={snapshot.stats?.dueSoon || 0} label={t.soon} note={t.viewAll} onClick={() => setFilter('soon')} />
        <Metric kind="upcoming" value={snapshot.stats?.upcoming || 0} label={t.upcoming} note={t.viewAll} onClick={() => setFilter('all')} />
        <Metric kind="overdue" value={snapshot.stats?.overdue || 0} label={t.overdue} note={t.viewAll} onClick={() => setFilter('overdue')} />
        <Metric kind="completion" value={`${health.progress || 0}%`} label={t.completion} note={`${health.open || 0} ${t.openTasks}`} onClick={() => document.querySelector('.bpd-professional-panel')?.scrollIntoView({ behavior: 'smooth' })} />
      </section>

      <section className="bpd-main-grid">
        <Panel title={t.tasks} icon="tasks" action={() => go('#/work-hub')} className="bpd-tasks-panel">
          <div className="bpd-filter-bar">
            {['all', 'today', 'soon', 'overdue', 'pending'].map((key) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{key === 'all' ? t.all : key === 'today' ? t.today : key === 'soon' ? t.soon : key === 'overdue' ? t.overdue : t.pending}</button>)}
          </div>
          <div className="bpd-list">{initialLoading ? <EmptyState>{t.refreshing}</EmptyState> : tasks.length ? tasks.map((item) => <TaskRow key={item.id} item={item} language={language} />) : <EmptyState>{t.emptyTasks}</EmptyState>}</div>
        </Panel>

        <Panel title={t.schedule} icon="calendar" action={() => go('#/work-hub')} className="bpd-schedule-panel">
          <div className="bpd-list compact">{initialLoading ? <EmptyState>{t.refreshing}</EmptyState> : snapshot.timeline?.length ? snapshot.timeline.map((item) => <CompactRow key={item.id} item={item} language={language} />) : <EmptyState>{t.emptySchedule}</EmptyState>}</div>
        </Panel>
      </section>

      <section className="bpd-triple-grid">
        <Panel title={t.approvals} icon="approval" action={() => go('#/resource-library')}>
          <div className="bpd-list compact">{snapshot.approvals?.length ? snapshot.approvals.map((item) => <CompactRow key={item.id} item={item} language={language} />) : <EmptyState>{t.emptyApprovals}</EmptyState>}</div>
        </Panel>

        <Panel title={t.professional} icon="team" action={() => go('#/work-hub')} className="bpd-professional-panel">
          <div className="bpd-list compact">{snapshot.professional?.length ? snapshot.professional.map((item) => <CompactRow key={item.id} item={item} language={language} />) : <EmptyState>{t.emptyProfessional}</EmptyState>}</div>
        </Panel>

        <Panel title={t.homeroom} icon="homeroom" action={() => go('#/homeroom')}>
          {snapshot.homeroom ? <div className="bpd-homeroom-grid">
            <button type="button" onClick={() => go('#/homeroom')}><span>{t.students}</span><strong>{snapshot.homeroom.studentCount}</strong></button>
            <button type="button" onClick={() => go('#/homeroom')}><span>{t.absent}</span><strong>{snapshot.homeroom.absentToday}</strong></button>
            <button type="button" onClick={() => go('#/homeroom')}><span>{t.reminders}</span><strong>{snapshot.homeroom.reminders}</strong></button>
            <button type="button" onClick={() => go('#/homeroom')}><span>{t.alerts}</span><strong>{snapshot.homeroom.alerts}</strong></button>
          </div> : <EmptyState>{t.emptyHomeroom}</EmptyState>}
        </Panel>
      </section>

      <section className="bpd-main-grid bpd-bottom-grid">
        <Panel title={t.continue} icon="continue" action={() => go('#/apps')}>
          <div className="bpd-recent-grid">{snapshot.continueItems?.length ? snapshot.continueItems.map((item) => <RecentCard key={`${item.id}:${item.target}`} item={item} language={language} />) : <EmptyState>{t.emptyContinue}</EmptyState>}</div>
        </Panel>
        <Panel title={t.resources} icon="resources" action={() => go('#/resource-library')}>
          <div className="bpd-list compact">{snapshot.recentResources?.length ? snapshot.recentResources.map((item) => <CompactRow key={item.id} item={item} language={language} />) : <EmptyState>{t.emptyResources}</EmptyState>}</div>
        </Panel>
      </section>
    </section>
  );
}
