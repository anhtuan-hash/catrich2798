import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeTable } from '../services/runtime/core.js';
import {
  DASHBOARD_SOURCE_EVENTS,
  dashboardDueLabel,
  formatDashboardDate,
  getDashboardDueState,
  loadDashboardSnapshot,
  openDashboardTarget,
} from '../utils/dashboardAggregator.js';
import '../styles/work-dashboard-v1167.css';

const COPY = {
  vi: {
    pageTitle: 'Bảng điều hành',
    heroTitle: 'Xin chào',
    heroLead: 'Chào mừng bạn đến với Bảng điều hành Brian English',
    heroSub: 'Cùng nhau tạo nên những giờ học hiệu quả và truyền cảm hứng!',
    teacher: 'Giáo viên',
    leader: 'TTCM',
    today: 'Việc hôm nay',
    dueSoon: 'Sắp đến hạn',
    upcoming: 'Lịch 14 ngày',
    overdue: 'Công việc quá hạn',
    completion: 'Tỷ lệ hoàn thành',
    tasks: 'Công việc hôm nay',
    schedule: 'Lịch 14 ngày',
    approvals: 'Phê duyệt',
    department: 'Tổ chuyên môn',
    homeroom: 'Chủ nhiệm',
    continue: 'Tiếp tục công việc / Bản nháp gần đây',
    resources: 'Học liệu gần đây',
    all: 'Tất cả',
    urgent: 'Quá hạn',
    soon: 'Sắp hạn',
    pending: 'Chờ duyệt',
    viewAll: 'Xem tất cả',
    viewProfile: 'Xem hồ sơ',
    refresh: 'Làm mới',
    refreshing: 'Đang đồng bộ…',
    emptyTasks: 'Không có công việc cần xử lý.',
    emptySchedule: 'Chưa có lịch trong 14 ngày tới.',
    emptyApproval: 'Không có nội dung chờ duyệt.',
    emptyDepartment: 'Chưa có hoạt động chuyên môn.',
    emptyHomeroom: 'Chưa có dữ liệu chủ nhiệm.',
    emptyContinue: 'Chưa có bản nháp hoặc ứng dụng gần đây.',
    emptyResources: 'Chưa có học liệu gần đây.',
    students: 'Học sinh',
    absent: 'Vắng hôm nay',
    reminders: 'Nhắc việc',
    alerts: 'Cảnh báo',
    scheduleCount: 'lịch',
    taskCount: 'việc',
    activeFilter: 'Đang lọc',
    clear: 'Bỏ lọc',
    source: 'Nguồn dữ liệu',
    cloud: 'Cloud',
    local: 'Cục bộ',
    empty: 'Chưa có dữ liệu',
  },
  en: {
    pageTitle: 'Work Dashboard',
    heroTitle: 'Hello',
    heroLead: 'Welcome to the Brian English dashboard',
    heroSub: 'Create effective and inspiring learning experiences together.',
    teacher: 'Teacher',
    leader: 'Department leader',
    today: 'Due today',
    dueSoon: 'Due soon',
    upcoming: '14-day schedule',
    overdue: 'Overdue work',
    completion: 'Completion rate',
    tasks: 'Today’s work',
    schedule: '14-day schedule',
    approvals: 'Approvals',
    department: 'Department',
    homeroom: 'Homeroom',
    continue: 'Continue working / Recent drafts',
    resources: 'Recent resources',
    all: 'All',
    urgent: 'Overdue',
    soon: 'Due soon',
    pending: 'Pending',
    viewAll: 'View all',
    viewProfile: 'View profile',
    refresh: 'Refresh',
    refreshing: 'Syncing…',
    emptyTasks: 'No work needs attention.',
    emptySchedule: 'No schedule in the next 14 days.',
    emptyApproval: 'Nothing is waiting for approval.',
    emptyDepartment: 'No professional activity yet.',
    emptyHomeroom: 'No homeroom data.',
    emptyContinue: 'No recent drafts or apps.',
    emptyResources: 'No recent resources.',
    students: 'Students',
    absent: 'Absent today',
    reminders: 'Reminders',
    alerts: 'Alerts',
    scheduleCount: 'events',
    taskCount: 'tasks',
    activeFilter: 'Filtered',
    clear: 'Clear',
    source: 'Data sources',
    cloud: 'Cloud',
    local: 'Local',
    empty: 'No data',
  },
};

const METRIC_ICONS = { today: '✓', soon: '⌛', upcoming: '▣', overdue: '!', completion: '↗' };
const METRIC_TONES = { today: 'blue', soon: 'green', upcoming: 'violet', overdue: 'orange', completion: 'cyan' };

function initials(value) {
  return String(value || 'BE').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'BE';
}

function dayDistance(value) {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function formatTime(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatDay(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '—', day: '' };
  return {
    date: new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }).format(date),
    day: new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' }).format(date),
  };
}

function EmptyState({ icon = '◇', children }) {
  return <div className="wd5-empty"><span>{icon}</span><p>{children}</p></div>;
}

function ScrollCard({ className = '', icon, title, action, actionLabel, children, footer, tone = 'blue' }) {
  return (
    <article className={`wd5-card tone-${tone} ${className}`}>
      <header className="wd5-card-head">
        <div><span className="wd5-card-icon" aria-hidden="true">{icon}</span><h2>{title}</h2></div>
        {action ? <button type="button" onClick={action}>{actionLabel} <span>›</span></button> : null}
      </header>
      <div className="wd5-card-body">{children}</div>
      {footer ? <footer className="wd5-card-foot">{footer}</footer> : null}
    </article>
  );
}

function MetricCard({ kind, value, label, note, selected, onClick }) {
  return (
    <button type="button" className={`wd5-metric tone-${METRIC_TONES[kind]}${selected ? ' is-selected' : ''}`} onClick={onClick}>
      <span className="wd5-metric-icon" aria-hidden="true">{METRIC_ICONS[kind]}</span>
      <span className="wd5-metric-copy"><small>{label}</small><strong>{value}</strong><em>{note}</em></span>
    </button>
  );
}

function TaskRow({ item, language }) {
  const state = getDashboardDueState(item.date, item.done);
  const tone = state === 'overdue' ? 'danger' : state === 'today' ? 'warning' : state === 'soon' ? 'soon' : 'normal';
  return (
    <button type="button" className={`wd5-task-row tone-${tone}`} onClick={() => openDashboardTarget(item)}>
      <span className="wd5-check" aria-hidden="true">{item.done ? '✓' : ''}</span>
      <time>{formatTime(item.date, language)}</time>
      <span className="wd5-task-main"><strong>{item.title}</strong><small>{item.owner || item.sourceLabel}</small></span>
      <span className="wd5-task-source">{item.sourceLabel}</span>
      <span className={`wd5-badge tone-${tone}`}>{dashboardDueLabel(item.date, item.done, language)}</span>
      <b aria-hidden="true">›</b>
    </button>
  );
}

function ScheduleRow({ item, language }) {
  const day = formatDay(item.date, language);
  return (
    <button type="button" className="wd5-schedule-row" onClick={() => openDashboardTarget(item)}>
      <span className="wd5-schedule-date"><strong>{day.date}</strong><small>{day.day}</small></span>
      <time>{formatTime(item.date, language)}</time>
      <span className="wd5-schedule-title"><strong>{item.title}</strong><small>{item.owner || item.description || item.sourceLabel}</small></span>
      <span className={`wd5-source-chip tone-${item.tone || 'default'}`}>{item.sourceLabel}</span>
    </button>
  );
}

function MiniListRow({ item, language, badge }) {
  return (
    <button type="button" className="wd5-mini-row" onClick={() => openDashboardTarget(item)}>
      <span className="wd5-mini-dot">{initials(item.sourceLabel)}</span>
      <span><strong>{item.title}</strong><small>{item.owner || item.sourceLabel}{item.date ? ` · ${formatDashboardDate(item.date, language)}` : ''}</small></span>
      {badge ? <em>{badge}</em> : null}
      <b>›</b>
    </button>
  );
}

function DraftCard({ item, language }) {
  const kind = item.kind === 'draft' ? (language === 'vi' ? 'Bản nháp' : 'Draft') : (language === 'vi' ? 'Ứng dụng' : 'App');
  return (
    <button type="button" className="wd5-draft-card" onClick={() => { window.location.hash = item.target; }}>
      <span className="wd5-file-icon" style={{ '--file-accent': item.accent || '#3977d5' }}>{item.icon || 'W'}</span>
      <span><strong>{item.title}</strong><small>{kind}{item.updatedAt ? ` · ${new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(item.updatedAt))}` : ''}</small><em>{kind}</em></span>
    </button>
  );
}

function ResourceCard({ item, language }) {
  const ext = String(item.raw?.fileName || item.title || '').split('.').pop().slice(0, 4).toUpperCase();
  return (
    <button type="button" className="wd5-draft-card" onClick={() => openDashboardTarget(item)}>
      <span className="wd5-file-icon resource">{ext || 'RL'}</span>
      <span><strong>{item.title}</strong><small>{item.status || item.sourceLabel} · {formatDashboardDate(item.date, language)}</small><em>{item.status || 'Học liệu'}</em></span>
    </button>
  );
}

function SourcePill({ label, value, t }) {
  const tone = value === 'cloud' || value === 'cloud-or-local' ? 'cloud' : value === 'empty' ? 'empty' : 'local';
  return <span className={`wd5-source-pill tone-${tone}`}><i /><b>{label}</b><small>{tone === 'cloud' ? t.cloud : tone === 'local' ? t.local : t.empty}</small></span>;
}

export default function WorkDashboard({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [scheduleRange, setScheduleRange] = useState(14);
  const [bottomMode, setBottomMode] = useState('continue');
  const carouselRef = useRef(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      setSnapshot(await loadDashboardSnapshot(currentUser));
    } catch (loadError) {
      setError(loadError?.message || String(loadError));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onRefresh = () => refresh({ quiet: true });
    DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.addEventListener(eventName, onRefresh));
    window.addEventListener('storage', onRefresh);
    const interval = window.setInterval(onRefresh, 60000);
    const subscriptions = [
      ['work_hub_items', 'dashboard-work'],
      ['work_hub_notifications', 'dashboard-notifications'],
      ['department_workspace_snapshots', 'dashboard-department'],
      ['department_submissions', 'dashboard-submissions'],
      ['department_submission_requests', 'dashboard-requests'],
      ['resource_items', 'dashboard-resources'],
      ['bes_homeroom_workspaces', 'dashboard-homeroom'],
    ].map(([table, key]) => {
      try { return subscribeTable({ key: `${key}-${currentUser?.id || 'guest'}`, table, onChange: onRefresh }); }
      catch { return () => {}; }
    });
    return () => {
      DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.removeEventListener(eventName, onRefresh));
      window.removeEventListener('storage', onRefresh);
      window.clearInterval(interval);
      subscriptions.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [currentUser?.id, refresh]);

  const tasks = useMemo(() => {
    const source = snapshot?.attention || [];
    if (taskFilter === 'pending') return snapshot?.approvals || [];
    if (taskFilter === 'all') return source;
    return source.filter((item) => getDashboardDueState(item.date, item.done) === taskFilter);
  }, [snapshot, taskFilter]);

  const schedule = useMemo(() => (snapshot?.timeline || []).filter((item) => {
    const distance = dayDistance(item.date);
    return distance !== null && distance >= 0 && distance <= scheduleRange;
  }), [snapshot?.timeline, scheduleRange]);

  const userName = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || (language === 'vi' ? 'Thầy/Cô' : 'Teacher');
  const displayName = userName.replace(/^nguyễn\s+anh\s+tuấn$/i, 'Tuấn Nguyễn Anh');
  const roleLabel = snapshot?.leader ? t.leader : t.teacher;
  const completion = snapshot?.departmentHealth?.progress || 0;
  const metricNote = language === 'vi' ? 'Bấm để lọc nhanh' : 'Click to filter';
  const bottomItems = bottomMode === 'resources' ? (snapshot?.recentResources || []) : (snapshot?.continueItems || []);

  const scrollCarousel = (direction) => {
    carouselRef.current?.scrollBy({ left: direction * Math.max(320, carouselRef.current.clientWidth * 0.72), behavior: 'smooth' });
  };

  if (loading && !snapshot) {
    return <div className="wd5-loading"><span>BE</span><strong>{t.refreshing}</strong></div>;
  }

  return (
    <section className="wd5-page" aria-label={t.pageTitle}>
      <header className="wd5-hero">
        <div className="wd5-hero-copy">
          <span className="wd5-brand-chip">BRIAN ENGLISH · COMMAND CENTER</span>
          <h1>{t.heroTitle}, {displayName}! <span aria-hidden="true">👋</span></h1>
          <p><strong>{t.heroLead}</strong><br />{t.heroSub}</p>
          <div className="wd5-hero-actions">
            <button type="button" onClick={() => { window.location.hash = '#/work-hub'; }}>✓ {t.tasks}</button>
            <button type="button" onClick={() => { window.location.hash = '#/department'; }}>▣ {t.department}</button>
          </div>
        </div>

        <div className="wd5-hero-illustration" aria-hidden="true">
          <span className="wd5-paper-plane">➤</span>
          <span className="wd5-dotted-path" />
          <div className="wd5-books"><i /><i /><i /></div>
          <div className="wd5-mug"><span>Brian<br />ENGLISH</span></div>
          <div className="wd5-tablet"><i className="bar a" /><i className="bar b" /><i className="bar c" /><b /></div>
          <div className="wd5-plant"><i /><i /><i /></div>
          <span className="wd5-shape one" /><span className="wd5-shape two" /><span className="wd5-shape three" />
        </div>

        <aside className="wd5-profile-card">
          <div className="wd5-current-date">▣ {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</div>
          <div className="wd5-profile-main">
            <span className="wd5-avatar">{initials(displayName)}<i /></span>
            <div><strong>{displayName}</strong><em>{roleLabel}</em><small>Brian English</small><button type="button" onClick={() => { window.location.hash = '#/settings'; }}>{t.viewProfile} →</button></div>
          </div>
          <button type="button" className="wd5-refresh" onClick={() => refresh()} disabled={loading}>↻ {loading ? t.refreshing : t.refresh}</button>
        </aside>
      </header>

      {error ? <div className="wd5-error">⚠ {error}</div> : null}

      <section className="wd5-metrics" aria-label="Dashboard metrics">
        <MetricCard kind="today" value={snapshot?.stats?.today || 0} label={t.today} note={metricNote} selected={taskFilter === 'today'} onClick={() => setTaskFilter(taskFilter === 'today' ? 'all' : 'today')} />
        <MetricCard kind="soon" value={snapshot?.stats?.dueSoon || 0} label={t.dueSoon} note={metricNote} selected={taskFilter === 'soon'} onClick={() => setTaskFilter(taskFilter === 'soon' ? 'all' : 'soon')} />
        <MetricCard kind="upcoming" value={snapshot?.stats?.upcoming || 0} label={t.upcoming} note={`${schedule.length} ${t.scheduleCount}`} selected={scheduleRange === 7} onClick={() => setScheduleRange(scheduleRange === 7 ? 14 : 7)} />
        <MetricCard kind="overdue" value={snapshot?.stats?.overdue || 0} label={t.overdue} note={metricNote} selected={taskFilter === 'overdue'} onClick={() => setTaskFilter(taskFilter === 'overdue' ? 'all' : 'overdue')} />
        <MetricCard kind="completion" value={`${completion}%`} label={t.completion} note={`${snapshot?.departmentHealth?.open || 0} ${t.taskCount}`} selected={false} onClick={() => document.querySelector('.wd5-department-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
      </section>

      <section className="wd5-main-grid">
        <ScrollCard className="wd5-task-card" icon="✓" title={t.tasks} tone="blue" action={() => { window.location.hash = '#/work-hub'; }} actionLabel={t.viewAll}
          footer={<div className="wd5-card-footer-row"><span>{tasks.length} {t.taskCount}</span>{taskFilter !== 'all' ? <button type="button" onClick={() => setTaskFilter('all')}>× {t.clear}</button> : null}</div>}>
          <div className="wd5-filter-bar sticky">
            {['all', 'today', 'soon', 'overdue', 'pending'].map((key) => <button type="button" key={key} className={taskFilter === key ? 'active' : ''} onClick={() => setTaskFilter(key)}>{key === 'all' ? t.all : key === 'today' ? t.today : key === 'soon' ? t.soon : key === 'overdue' ? t.urgent : t.pending}</button>)}
          </div>
          <div className="wd5-scroll-list">{tasks.length ? tasks.map((item) => <TaskRow key={item.id} item={item} language={language} />) : <EmptyState icon="✓">{t.emptyTasks}</EmptyState>}</div>
        </ScrollCard>

        <ScrollCard className="wd5-schedule-card" icon="▣" title={t.schedule} tone="blue" action={() => { window.location.hash = '#/department'; }} actionLabel={t.viewAll}
          footer={<div className="wd5-card-footer-row"><span>{schedule.length} {t.scheduleCount}</span><button type="button" onClick={() => setScheduleRange(scheduleRange === 14 ? 7 : 14)}>{scheduleRange === 14 ? '7 ngày' : '14 ngày'} ↕</button></div>}>
          <div className="wd5-filter-bar sticky"><button type="button" className={scheduleRange === 0 ? 'active' : ''} onClick={() => setScheduleRange(0)}>Hôm nay</button><button type="button" className={scheduleRange === 7 ? 'active' : ''} onClick={() => setScheduleRange(7)}>7 ngày</button><button type="button" className={scheduleRange === 14 ? 'active' : ''} onClick={() => setScheduleRange(14)}>14 ngày</button></div>
          <div className="wd5-scroll-list">{schedule.length ? schedule.map((item) => <ScheduleRow key={item.id} item={item} language={language} />) : <EmptyState icon="▣">{t.emptySchedule}</EmptyState>}</div>
        </ScrollCard>
      </section>

      <section className="wd5-triple-grid">
        <ScrollCard className="wd5-approval-card" icon="✓" title={t.approvals} tone="violet" action={() => openDashboardTarget({ route: 'department', departmentTab: 'submissions' })} actionLabel={t.viewAll}
          footer={<div className="wd5-card-footer-row"><span>{snapshot?.approvals?.length || 0} {t.pending.toLowerCase()}</span><button type="button" onClick={() => setTaskFilter('pending')}>{t.viewAll} →</button></div>}>
          <div className="wd5-feature-art approval" aria-hidden="true"><span>✓</span><i /><i /><i /></div>
          <div className="wd5-scroll-list mini">{(snapshot?.approvals || []).length ? snapshot.approvals.map((item) => <MiniListRow key={item.id} item={item} language={language} badge={item.status || 'Chờ duyệt'} />) : <EmptyState icon="✓">{t.emptyApproval}</EmptyState>}</div>
        </ScrollCard>

        <ScrollCard className="wd5-department-card" icon="●" title={t.department} tone="green" action={() => { window.location.hash = '#/department'; }} actionLabel={t.viewAll}
          footer={<div className="wd5-card-footer-row"><span>{snapshot?.professional?.length || 0} hoạt động</span><button type="button" onClick={() => { window.location.hash = '#/department'; }}>{completion}% →</button></div>}>
          <div className="wd5-feature-art department" aria-hidden="true"><span>●</span><i /><i /><i /></div>
          <div className="wd5-scroll-list mini">{(snapshot?.professional || []).length ? snapshot.professional.map((item) => <MiniListRow key={item.id} item={item} language={language} badge={item.status || 'Mới'} />) : <EmptyState icon="●">{t.emptyDepartment}</EmptyState>}</div>
        </ScrollCard>

        <ScrollCard className="wd5-homeroom-card" icon="◆" title={t.homeroom} tone="orange" action={() => { window.location.hash = '#/homeroom'; }} actionLabel={t.viewAll}
          footer={<div className="wd5-card-footer-row"><span>{snapshot?.homeroom?.className || '—'}</span><button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}>{t.viewAll} →</button></div>}>
          <div className="wd5-feature-art homeroom" aria-hidden="true"><span>◆</span><i /><i /><i /></div>
          {snapshot?.homeroom ? <div className="wd5-homeroom-list">
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.students}</span><strong>{snapshot.homeroom.studentCount}</strong><b>›</b></button>
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.absent}</span><strong>{snapshot.homeroom.absentToday}</strong><b>›</b></button>
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.reminders}</span><strong>{snapshot.homeroom.reminders}</strong><b>›</b></button>
            <button type="button" onClick={() => { window.location.hash = '#/homeroom'; }}><span>{t.alerts}</span><strong>{snapshot.homeroom.alerts}</strong><b>›</b></button>
          </div> : <EmptyState icon="◆">{t.emptyHomeroom}</EmptyState>}
        </ScrollCard>
      </section>

      <ScrollCard className="wd5-carousel-card" icon="↔" title={bottomMode === 'continue' ? t.continue : t.resources} tone="blue" action={() => { window.location.hash = bottomMode === 'continue' ? '#/apps' : '#/resource-library'; }} actionLabel={t.viewAll}
        footer={<div className="wd5-source-strip"><strong>{t.source}</strong><SourcePill label="Work Hub" value={snapshot?.sources?.workHub || 'empty'} t={t} /><SourcePill label="Tổ chuyên môn" value={snapshot?.sources?.department || 'empty'} t={t} /><SourcePill label="Kho học liệu" value={snapshot?.sources?.resources || 'empty'} t={t} /><SourcePill label="Chủ nhiệm" value={snapshot?.sources?.homeroom || 'empty'} t={t} /></div>}>
        <div className="wd5-carousel-toolbar"><div><button type="button" className={bottomMode === 'continue' ? 'active' : ''} onClick={() => setBottomMode('continue')}>{t.continue}</button><button type="button" className={bottomMode === 'resources' ? 'active' : ''} onClick={() => setBottomMode('resources')}>{t.resources}</button></div><span><button type="button" onClick={() => scrollCarousel(-1)}>‹</button><button type="button" onClick={() => scrollCarousel(1)}>›</button></span></div>
        <div className="wd5-carousel" ref={carouselRef}>{bottomItems.length ? bottomItems.map((item) => bottomMode === 'resources' ? <ResourceCard key={item.id} item={item} language={language} /> : <DraftCard key={`${item.id}:${item.target}`} item={item} language={language} />) : <EmptyState icon="↔">{bottomMode === 'resources' ? t.emptyResources : t.emptyContinue}</EmptyState>}</div>
      </ScrollCard>
    </section>
  );
}
