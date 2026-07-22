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
import '../styles/work-dashboard-v1167.css';
import '../styles/work-dashboard-luxury-v1167.css';

const COPY = {
  vi: {
    pageTitle: 'Bảng điều hành', hello: 'Xin chào', teacher: 'Giáo viên', leader: 'Tổ trưởng',
    lead: 'Theo dõi công việc, lịch dạy, học liệu và lớp chủ nhiệm trong một nơi.',
    today: 'Việc hôm nay', soon: 'Sắp đến hạn', upcoming: 'Lịch 14 ngày', overdue: 'Quá hạn', completion: 'Hoàn thành',
    tasks: 'Công việc cần xử lý', schedule: 'Lịch sắp tới', approvals: 'Nội dung chờ duyệt',
    professional: 'Hoạt động chuyên môn', homeroom: 'Chủ nhiệm', resources: 'Học liệu gần đây', continue: 'Tiếp tục công việc',
    workHub: 'Trung tâm công việc', resourceHub: 'Kho học liệu', viewAll: 'Xem tất cả', refresh: 'Làm mới', refreshing: 'Đang đồng bộ…',
    all: 'Tất cả', pending: 'Chờ duyệt', emptyTasks: 'Không có công việc cần xử lý.', emptySchedule: 'Chưa có lịch trong 14 ngày tới.',
    emptyApprovals: 'Không có nội dung chờ duyệt.', emptyProfessional: 'Chưa có hoạt động chuyên môn.', emptyResources: 'Chưa có học liệu gần đây.',
    emptyContinue: 'Chưa có bản nháp hoặc ứng dụng gần đây.', emptyHomeroom: 'Chưa có dữ liệu chủ nhiệm.',
    students: 'Học sinh', absent: 'Vắng hôm nay', reminders: 'Nhắc việc', alerts: 'Cảnh báo',
    partial: 'Một số nguồn dữ liệu chưa phản hồi. Dashboard vẫn hiển thị phần dữ liệu đã tải được.', retry: 'Thử lại',
  },
  en: {
    pageTitle: 'Work Dashboard', hello: 'Hello', teacher: 'Teacher', leader: 'Team leader',
    lead: 'Track work, schedules, resources and homeroom activity in one place.',
    today: 'Due today', soon: 'Due soon', upcoming: '14-day schedule', overdue: 'Overdue', completion: 'Completion',
    tasks: 'Work requiring attention', schedule: 'Upcoming schedule', approvals: 'Pending approvals',
    professional: 'Professional work', homeroom: 'Homeroom', resources: 'Recent resources', continue: 'Continue working',
    workHub: 'Work Hub', resourceHub: 'Resource Library', viewAll: 'View all', refresh: 'Refresh', refreshing: 'Syncing…',
    all: 'All', pending: 'Pending', emptyTasks: 'No work requires attention.', emptySchedule: 'No schedule in the next 14 days.',
    emptyApprovals: 'Nothing is waiting for approval.', emptyProfessional: 'No professional activity yet.', emptyResources: 'No recent resources.',
    emptyContinue: 'No recent drafts or apps.', emptyHomeroom: 'No homeroom data.',
    students: 'Students', absent: 'Absent today', reminders: 'Reminders', alerts: 'Alerts',
    partial: 'Some data sources did not respond. Available data is still shown.', retry: 'Retry',
  },
};

function initials(value) {
  return String(value || 'BE').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'BE';
}

function Empty({ children }) {
  return <div className="wd5-empty"><span>◇</span><p>{children}</p></div>;
}

function Card({ title, icon, action, children, className = '' }) {
  return (
    <article className={`wd5-card ${className}`}>
      <header className="wd5-card-head">
        <div><span className="wd5-card-icon" aria-hidden="true">{icon}</span><h2>{title}</h2></div>
        {action ? <button type="button" onClick={action}>›</button> : null}
      </header>
      <div className="wd5-card-body">{children}</div>
    </article>
  );
}

function WorkRow({ item, language }) {
  const state = getDashboardDueState(item.date, item.done);
  return (
    <button type="button" className={`wd5-task-row tone-${state}`} onClick={() => openDashboardTarget(item)}>
      <span className="wd5-check" aria-hidden="true">{item.done ? '✓' : ''}</span>
      <span className="wd5-task-main"><strong>{item.title}</strong><small>{item.owner || item.sourceLabel}</small></span>
      <span className="wd5-task-source">{item.sourceLabel}</span>
      <span className={`wd5-badge tone-${state}`}>{dashboardDueLabel(item.date, item.done, language)}</span>
      <b aria-hidden="true">›</b>
    </button>
  );
}

function MiniRow({ item, language }) {
  return (
    <button type="button" className="wd5-mini-row" onClick={() => openDashboardTarget(item)}>
      <span className="wd5-mini-dot">{initials(item.sourceLabel)}</span>
      <span><strong>{item.title}</strong><small>{item.owner || item.sourceLabel}{item.date ? ` · ${formatDashboardDate(item.date, language)}` : ''}</small></span>
      <em>{item.status || 'Mới'}</em><b>›</b>
    </button>
  );
}

function ContinueCard({ item, language }) {
  return (
    <button type="button" className="wd5-draft-card" onClick={() => { window.location.hash = item.target; }}>
      <span className="wd5-file-icon" style={{ '--file-accent': item.accent || '#315fc4' }}>{item.icon || 'GO'}</span>
      <span><strong>{item.title}</strong><small>{item.kind === 'draft' ? (language === 'vi' ? 'Bản nháp' : 'Draft') : (language === 'vi' ? 'Ứng dụng' : 'App')}</small></span>
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

  return (
    <section className={`wd5-page${initialLoading ? ' is-loading' : ''}`} aria-label={t.pageTitle} aria-busy={loading}>
      <header className="wd5-hero">
        <div className="wd5-hero-copy">
          <span className="wd5-brand-chip">BRIAN ENGLISH · DASHBOARD</span>
          <h1>{t.hello}, {name}!</h1>
          <p>{t.lead}</p>
          <div className="wd5-hero-actions">
            <button type="button" onClick={() => { window.location.hash = '#/work-hub'; }}>✓ {t.workHub}</button>
            <button type="button" onClick={() => { window.location.hash = '#/resource-library'; }}>▣ {t.resourceHub}</button>
          </div>
        </div>
        <aside className="wd5-profile-card">
          <div className="wd5-profile-main"><span className="wd5-avatar">{initials(name)}<i /></span><div><strong>{name}</strong><em>{role}</em><small>Brian English</small></div></div>
          <button type="button" className="wd5-refresh" onClick={() => refresh()} disabled={loading}>↻ {loading ? t.refreshing : t.refresh}</button>
        </aside>
      </header>

      {error ? <div className="wd5-error wd5-partial-error"><span>!</span><div><strong>{t.partial}</strong><small>{error}</small></div><button type="button" onClick={() => refresh()}>{t.retry}</button></div> : null}

      <section className="wd5-metrics" aria-label="Dashboard metrics">
        {[
          ['today', snapshot.stats?.today || 0, t.today],
          ['soon', snapshot.stats?.dueSoon || 0, t.soon],
          ['upcoming', snapshot.stats?.upcoming || 0, t.upcoming],
          ['overdue', snapshot.stats?.overdue || 0, t.overdue],
          ['completion', `${health.progress || 0}%`, t.completion],
        ].map(([kind, value, label]) => <button key={kind} type="button" className={`wd5-metric tone-${kind}`} onClick={() => kind === 'completion' ? document.querySelector('.wd5-professional-card')?.scrollIntoView({ behavior: 'smooth' }) : setFilter(kind === 'upcoming' ? 'all' : kind)}><span className="wd5-metric-copy"><small>{label}</small><strong>{value}</strong><em>{kind === 'completion' ? `${health.open || 0} ${t.tasks.toLowerCase()}` : t.viewAll}</em></span></button>)}
      </section>

      <section className="wd5-main-grid">
        <Card title={t.tasks} icon="✓" action={() => { window.location.hash = '#/work-hub'; }} className="wd5-task-card">
          <div className="wd5-filter-bar sticky">
            {['all', 'today', 'soon', 'overdue', 'pending'].map((key) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{key === 'all' ? t.all : key === 'today' ? t.today : key === 'soon' ? t.soon : key === 'overdue' ? t.overdue : t.pending}</button>)}
          </div>
          <div className="wd5-scroll-list">{initialLoading ? <Empty>{t.refreshing}</Empty> : tasks.length ? tasks.map((item) => <WorkRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyTasks}</Empty>}</div>
        </Card>
        <Card title={t.schedule} icon="▣" action={() => { window.location.hash = '#/work-hub'; }} className="wd5-schedule-card">
          <div className="wd5-scroll-list">{initialLoading ? <Empty>{t.refreshing}</Empty> : snapshot.timeline?.length ? snapshot.timeline.map((item) => <MiniRow key={item.id} item={item} language={language} />) : <Empty>{t.emptySchedule}</Empty>}</div>
        </Card>
      </section>

      <section className="wd5-triple-grid">
        <Card title={t.approvals} icon="✓" action={() => { window.location.hash = '#/resource-library'; }} className="wd5-approval-card">
          <div className="wd5-scroll-list mini">{snapshot.approvals?.length ? snapshot.approvals.map((item) => <MiniRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyApprovals}</Empty>}</div>
        </Card>
        <Card title={t.professional} icon="●" action={() => { window.location.hash = '#/work-hub'; }} className="wd5-professional-card">
          <div className="wd5-feature-art professional" aria-hidden="true"><span>●</span><i /><i /><i /></div>
          <div className="wd5-scroll-list mini">{snapshot.professional?.length ? snapshot.professional.map((item) => <MiniRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyProfessional}</Empty>}</div>
        </Card>
        <Card title={t.homeroom} icon="◆" action={() => { window.location.hash = '#/homeroom'; }} className="wd5-homeroom-card">
          {snapshot.homeroom ? <div className="wd5-homeroom-list">
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.students}</span><strong>{snapshot.homeroom.studentCount}</strong><b>›</b></button>
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.absent}</span><strong>{snapshot.homeroom.absentToday}</strong><b>›</b></button>
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.reminders}</span><strong>{snapshot.homeroom.reminders}</strong><b>›</b></button>
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.alerts}</span><strong>{snapshot.homeroom.alerts}</strong><b>›</b></button>
          </div> : <Empty>{t.emptyHomeroom}</Empty>}
        </Card>
      </section>

      <section className="wd5-main-grid">
        <Card title={t.continue} icon="↔" action={() => { window.location.hash = '#/apps'; }}>
          <div className="wd5-carousel">{snapshot.continueItems?.length ? snapshot.continueItems.map((item) => <ContinueCard key={`${item.id}:${item.target}`} item={item} language={language} />) : <Empty>{t.emptyContinue}</Empty>}</div>
        </Card>
        <Card title={t.resources} icon="▤" action={() => { window.location.hash = '#/resource-library'; }}>
          <div className="wd5-scroll-list mini">{snapshot.recentResources?.length ? snapshot.recentResources.map((item) => <MiniRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyResources}</Empty>}</div>
        </Card>
      </section>
    </section>
  );
}
