import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    title: 'Bảng điều hành',
    eyebrow: 'BRIAN ENGLISH · WORK DASHBOARD',
    subtitle: 'Lịch làm việc, việc cần xử lý, hoạt động chuyên môn và tình hình tổ trong một màn hình.',
    reload: 'Làm mới',
    refreshing: 'Đang đồng bộ…',
    today: 'Việc hôm nay',
    dueSoon: 'Sắp đến hạn',
    overdue: 'Quá hạn',
    pending: 'Chờ duyệt',
    upcoming: 'Lịch 14 ngày',
    timeline: 'Hôm nay và 14 ngày tới',
    attention: 'Việc cần xử lý',
    professional: 'Hoạt động chuyên môn',
    department: 'Tình hình tổ chuyên môn',
    approvals: 'Phê duyệt nhanh',
    continue: 'Tiếp tục công việc',
    homeroom: 'Chủ nhiệm của tôi',
    resources: 'Học liệu gần đây',
    viewAll: 'Xem tất cả',
    emptyTimeline: 'Chưa có lịch hoặc deadline trong 14 ngày tới.',
    emptyAttention: 'Không có việc khẩn cần xử lý.',
    emptyProfessional: 'Chưa có hoạt động chuyên môn.',
    emptyApproval: 'Không có nội dung chờ duyệt.',
    emptyContinue: 'Chưa có ứng dụng hoặc bản nháp gần đây.',
    emptyResource: 'Chưa có học liệu gần đây.',
    open: 'Mở',
    source: 'Nguồn dữ liệu',
    cloud: 'Cloud',
    local: 'Cục bộ',
    empty: 'Chưa có dữ liệu',
    synced: 'Đã đồng bộ',
    generated: 'Cập nhật',
    progress: 'Tiến độ',
    openTasks: 'Việc đang mở',
    activities: 'Hoạt động chuyên môn',
    risk: 'Mức rủi ro',
    good: 'Ổn định',
    watch: 'Cần theo dõi',
    high: 'Cần xử lý',
    students: 'Học sinh',
    absent: 'Vắng hôm nay',
    reminders: 'Nhắc việc',
    alerts: 'Cảnh báo',
    noHomeroom: 'Chưa có dữ liệu lớp chủ nhiệm.',
    roleLeader: 'Chế độ TTCM',
    roleTeacher: 'Công việc của tôi',
  },
  en: {
    title: 'Work Dashboard',
    eyebrow: 'BRIAN ENGLISH · WORK DASHBOARD',
    subtitle: 'Schedules, action items, professional activities and department health in one place.',
    reload: 'Refresh',
    refreshing: 'Syncing…',
    today: 'Due today',
    dueSoon: 'Due soon',
    overdue: 'Overdue',
    pending: 'Pending review',
    upcoming: '14-day schedule',
    timeline: 'Today and the next 14 days',
    attention: 'Action required',
    professional: 'Professional activities',
    department: 'Department health',
    approvals: 'Quick approvals',
    continue: 'Continue working',
    homeroom: 'My homeroom',
    resources: 'Recent resources',
    viewAll: 'View all',
    emptyTimeline: 'No schedules or deadlines in the next 14 days.',
    emptyAttention: 'No urgent actions.',
    emptyProfessional: 'No professional activities yet.',
    emptyApproval: 'Nothing is waiting for review.',
    emptyContinue: 'No recent apps or drafts.',
    emptyResource: 'No recent resources.',
    open: 'Open',
    source: 'Data sources',
    cloud: 'Cloud',
    local: 'Local',
    empty: 'No data',
    synced: 'Synced',
    generated: 'Updated',
    progress: 'Progress',
    openTasks: 'Open work',
    activities: 'Professional activities',
    risk: 'Risk',
    good: 'Stable',
    watch: 'Watch',
    high: 'Action needed',
    students: 'Students',
    absent: 'Absent today',
    reminders: 'Reminders',
    alerts: 'Alerts',
    noHomeroom: 'No homeroom data.',
    roleLeader: 'Department leader view',
    roleTeacher: 'My work',
  },
};

function initials(value) {
  return String(value || 'DB').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'DB';
}

function greeting(language, name) {
  const hour = new Date().getHours();
  const period = language === 'vi'
    ? (hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối')
    : (hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
  return `${period}, ${name || (language === 'vi' ? 'thầy/cô' : 'teacher')}`;
}

function EmptyState({ children }) {
  return <div className="work-dashboard-empty"><span>◇</span><p>{children}</p></div>;
}

function SourcePill({ label, value, t }) {
  const tone = value === 'cloud' ? 'cloud' : value === 'empty' ? 'empty' : 'local';
  return (
    <span className={`work-dashboard-source-pill tone-${tone}`}>
      <i />
      <b>{label}</b>
      <small>{value === 'cloud' ? t.cloud : value === 'empty' ? t.empty : t.local}</small>
    </span>
  );
}

function StatCard({ value, label, tone, onClick }) {
  return (
    <button type="button" className={`work-dashboard-stat tone-${tone}`} onClick={onClick}>
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function DueBadge({ item, language }) {
  const state = getDashboardDueState(item.date, item.done);
  return <span className={`work-dashboard-due tone-${state}`}>{dashboardDueLabel(item.date, item.done, language)}</span>;
}

function ItemRow({ item, language, compact = false }) {
  return (
    <button type="button" className={`work-dashboard-item tone-${item.tone || 'default'}${compact ? ' is-compact' : ''}`} onClick={() => openDashboardTarget(item)}>
      <span className="work-dashboard-item-mark">{initials(item.sourceLabel)}</span>
      <span className="work-dashboard-item-copy">
        <span className="work-dashboard-item-kicker">{item.sourceLabel}{item.owner ? ` · ${item.owner}` : ''}</span>
        <strong>{item.title}</strong>
        {!compact && item.description ? <small>{item.description}</small> : null}
      </span>
      <span className="work-dashboard-item-meta">
        {item.status ? <em>{item.status}</em> : null}
        <DueBadge item={item} language={language} />
      </span>
    </button>
  );
}

function SectionHeader({ title, count, action, actionLabel }) {
  return (
    <header className="work-dashboard-section-head">
      <div><h2>{title}</h2>{Number.isFinite(count) ? <span>{count}</span> : null}</div>
      {action ? <button type="button" onClick={action}>{actionLabel} →</button> : null}
    </header>
  );
}

function Timeline({ items, language, empty }) {
  if (!items.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="work-dashboard-timeline">
      {items.map((item) => (
        <button type="button" key={item.id} className={`work-dashboard-timeline-item tone-${item.tone || 'default'}`} onClick={() => openDashboardTarget(item)}>
          <time>{formatDashboardDate(item.date, language, { time: true })}</time>
          <span className="work-dashboard-timeline-line"><i /></span>
          <span className="work-dashboard-timeline-copy">
            <small>{item.sourceLabel}</small>
            <strong>{item.title}</strong>
            <em>{dashboardDueLabel(item.date, item.done, language)}</em>
          </span>
        </button>
      ))}
    </div>
  );
}

function ContinueCard({ item }) {
  return (
    <button type="button" className="work-dashboard-continue-card" onClick={() => { window.location.hash = item.target; }}>
      <span style={{ '--continue-accent': item.accent }}>{item.icon}</span>
      <div><strong>{item.title}</strong><small>{item.kind === 'draft' ? 'Bản nháp tự lưu' : 'Không gian gần đây'}</small></div>
      <b>→</b>
    </button>
  );
}

export default function WorkDashboard({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState('');

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const next = await loadDashboardSnapshot(currentUser);
      setSnapshot(next);
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
      try {
        return subscribeTable({ key: `${key}-${currentUser?.id || 'guest'}`, table, onChange: onRefresh });
      } catch {
        return () => {};
      }
    });
    return () => {
      DASHBOARD_SOURCE_EVENTS.forEach((eventName) => window.removeEventListener(eventName, onRefresh));
      window.removeEventListener('storage', onRefresh);
      window.clearInterval(interval);
      subscriptions.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [currentUser?.id, refresh]);

  const attention = useMemo(() => {
    if (!focus) return snapshot?.attention || [];
    if (focus === 'pending') return snapshot?.approvals || [];
    return (snapshot?.attention || []).filter((item) => getDashboardDueState(item.date, item.done) === focus);
  }, [focus, snapshot?.attention, snapshot?.approvals]);

  const name = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || '';
  const roleLabel = snapshot?.leader ? t.roleLeader : t.roleTeacher;

  if (loading && !snapshot) {
    return <div className="work-dashboard-loading"><span>DB</span><strong>{t.refreshing}</strong></div>;
  }

  return (
    <section className="work-dashboard-page">
      <header className="work-dashboard-hero">
        <div className="work-dashboard-hero-copy">
          <span className="work-dashboard-eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="work-dashboard-greeting">
            <span>{initials(name)}</span>
            <div><strong>{greeting(language, name)}</strong><small>{roleLabel}</small></div>
          </div>
        </div>
        <div className="work-dashboard-hero-side">
          <div className="work-dashboard-date">
            <strong>{new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</strong>
            <small>{t.generated}: {snapshot?.generatedAt ? new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(snapshot.generatedAt)) : '—'}</small>
          </div>
          <button type="button" className="work-dashboard-refresh" onClick={() => refresh()} disabled={loading}>↻ {loading ? t.refreshing : t.reload}</button>
        </div>
      </header>

      {error ? <div className="work-dashboard-error">⚠ {error}</div> : null}

      <div className="work-dashboard-stats">
        <StatCard value={snapshot?.stats.today || 0} label={t.today} tone="today" onClick={() => setFocus(focus === 'today' ? '' : 'today')} />
        <StatCard value={snapshot?.stats.dueSoon || 0} label={t.dueSoon} tone="soon" onClick={() => setFocus(focus === 'soon' ? '' : 'soon')} />
        <StatCard value={snapshot?.stats.overdue || 0} label={t.overdue} tone="overdue" onClick={() => setFocus(focus === 'overdue' ? '' : 'overdue')} />
        <StatCard value={snapshot?.stats.pendingApproval || 0} label={t.pending} tone="pending" onClick={() => setFocus(focus === 'pending' ? '' : 'pending')} />
        <StatCard value={snapshot?.stats.upcoming || 0} label={t.upcoming} tone="upcoming" onClick={() => setFocus('')} />
      </div>

      <div className="work-dashboard-grid">
        <article className="work-dashboard-panel panel-timeline">
          <SectionHeader title={t.timeline} count={snapshot?.timeline.length || 0} action={() => { window.location.hash = '#/department'; }} actionLabel={t.viewAll} />
          <Timeline items={snapshot?.timeline || []} language={language} empty={t.emptyTimeline} />
        </article>

        <article className="work-dashboard-panel panel-attention">
          <SectionHeader title={t.attention} count={attention.length} action={() => { window.location.hash = '#/work-hub'; }} actionLabel={t.viewAll} />
          <div className="work-dashboard-list">
            {attention.length ? attention.slice(0, 8).map((item) => <ItemRow key={item.id} item={item} language={language} />) : <EmptyState>{t.emptyAttention}</EmptyState>}
          </div>
        </article>

        <article className="work-dashboard-panel panel-professional">
          <SectionHeader title={t.professional} count={snapshot?.professional.length || 0} action={() => openDashboardTarget({ route: 'department', departmentTab: 'workSchedule' })} actionLabel={t.viewAll} />
          <div className="work-dashboard-professional-grid">
            {(snapshot?.professional || []).length ? snapshot.professional.slice(0, 6).map((item) => <ItemRow compact key={item.id} item={item} language={language} />) : <EmptyState>{t.emptyProfessional}</EmptyState>}
          </div>
        </article>

        <article className="work-dashboard-panel panel-department">
          <SectionHeader title={t.department} />
          <div className={`work-dashboard-health tone-${snapshot?.departmentHealth.level || 'good'}`}>
            <div className="work-dashboard-health-score">
              <strong>{snapshot?.departmentHealth.progress || 0}%</strong>
              <span>{t.progress}</span>
            </div>
            <div className="work-dashboard-health-meter"><i style={{ width: `${snapshot?.departmentHealth.progress || 0}%` }} /></div>
            <div className="work-dashboard-health-grid">
              <div><strong>{snapshot?.departmentHealth.open || 0}</strong><span>{t.openTasks}</span></div>
              <div><strong>{snapshot?.departmentHealth.overdue || 0}</strong><span>{t.overdue}</span></div>
              <div><strong>{snapshot?.departmentHealth.pending || 0}</strong><span>{t.pending}</span></div>
              <div><strong>{snapshot?.departmentHealth.activities || 0}</strong><span>{t.activities}</span></div>
            </div>
            <button type="button" onClick={() => { window.location.hash = '#/department'; }}>
              {t.risk}: {t[snapshot?.departmentHealth.level || 'good']} · {snapshot?.departmentHealth.riskScore || 0}/100 →
            </button>
          </div>
        </article>

        {snapshot?.leader ? (
          <article className="work-dashboard-panel panel-approvals">
            <SectionHeader title={t.approvals} count={snapshot?.approvals.length || 0} action={() => openDashboardTarget({ route: 'department', departmentTab: 'submissions' })} actionLabel={t.viewAll} />
            <div className="work-dashboard-list">
              {(snapshot?.approvals || []).length ? snapshot.approvals.map((item) => <ItemRow compact key={item.id} item={item} language={language} />) : <EmptyState>{t.emptyApproval}</EmptyState>}
            </div>
          </article>
        ) : null}

        <article className={`work-dashboard-panel panel-continue${snapshot?.leader ? '' : ' is-wide'}`}>
          <SectionHeader title={t.continue} />
          <div className="work-dashboard-continue-grid">
            {(snapshot?.continueItems || []).length ? snapshot.continueItems.map((item) => <ContinueCard key={`${item.id}:${item.target}`} item={item} />) : <EmptyState>{t.emptyContinue}</EmptyState>}
          </div>
        </article>

        <article className="work-dashboard-panel panel-homeroom">
          <SectionHeader title={t.homeroom} action={() => { window.location.hash = '#/homeroom'; }} actionLabel={t.open} />
          {snapshot?.homeroom ? (
            <div className="work-dashboard-homeroom">
              <div className="work-dashboard-homeroom-title"><span>HR</span><div><strong>{snapshot.homeroom.className}</strong><small>{snapshot.homeroom.upcoming.length} lịch trong 14 ngày</small></div></div>
              <div className="work-dashboard-mini-stats">
                <div><strong>{snapshot.homeroom.studentCount}</strong><span>{t.students}</span></div>
                <div><strong>{snapshot.homeroom.absentToday}</strong><span>{t.absent}</span></div>
                <div><strong>{snapshot.homeroom.reminders}</strong><span>{t.reminders}</span></div>
                <div><strong>{snapshot.homeroom.alerts}</strong><span>{t.alerts}</span></div>
              </div>
            </div>
          ) : <EmptyState>{t.noHomeroom}</EmptyState>}
        </article>

        <article className="work-dashboard-panel panel-resources">
          <SectionHeader title={t.resources} count={snapshot?.recentResources.length || 0} action={() => { window.location.hash = '#/resource-library'; }} actionLabel={t.viewAll} />
          <div className="work-dashboard-resource-list">
            {(snapshot?.recentResources || []).length ? snapshot.recentResources.slice(0, 5).map((item) => (
              <button type="button" key={item.id} onClick={() => openDashboardTarget(item)}>
                <span>RL</span><div><strong>{item.title}</strong><small>{item.status} · {formatDashboardDate(item.date, language)}</small></div><b>→</b>
              </button>
            )) : <EmptyState>{t.emptyResource}</EmptyState>}
          </div>
        </article>
      </div>

      <footer className="work-dashboard-sources">
        <div><strong>{t.source}</strong><small>{snapshot?.stats.notifications || 0} thông báo chưa đọc</small></div>
        <SourcePill label="Work Hub" value={snapshot?.sources.workHub || 'empty'} t={t} />
        <SourcePill label="Tổ chuyên môn" value={snapshot?.sources.department || 'empty'} t={t} />
        <SourcePill label="Kho học liệu" value={snapshot?.sources.resources || 'empty'} t={t} />
        <SourcePill label="Chủ nhiệm" value={snapshot?.sources.homeroom || 'empty'} t={t} />
      </footer>
    </section>
  );
}
