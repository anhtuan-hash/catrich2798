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
import {
  markAllWorkHubNotificationsRead,
  markWorkHubNotificationRead,
  rememberWorkHubItem,
} from '../utils/workHubDelivery.js';
import '../styles/teacher-dashboard-google-v1.css';
import '../styles/teacher-dashboard-deduplicated.css';

const COPY = {
  vi: {
    pageTitle: 'Dashboard', hello: 'Xin chào', teacher: 'Giáo viên', leader: 'Tổ trưởng',
    lead: 'Một bảng tổng quan gọn hơn: công việc và lịch được hợp nhất, phần còn lại dành cho thông báo, học liệu, phản hồi và lớp chủ nhiệm.',
    openWork: 'Công việc đang mở', unread: 'Thông báo chưa đọc', pending: 'Chờ xử lý', submissionUpdates: 'Cập nhật hồ sơ',
    resourcesMetric: 'Học liệu gần đây', notifications: 'Trung tâm thông báo',
    approvalsLeader: 'Phê duyệt và phản hồi', approvalsTeacher: 'Trạng thái đã gửi', resources: 'Học liệu gần đây',
    continue: 'Tiếp tục công việc', homeroom: 'Lớp chủ nhiệm', quickActions: 'Thao tác nhanh',
    workHub: 'Trung tâm công việc', resourceHub: 'Kho học liệu', viewAll: 'Xem tất cả', refresh: 'Làm mới', refreshing: 'Đang đồng bộ…',
    all: 'Tất cả', today: 'Hôm nay', soon: 'Sắp đến hạn', overdue: 'Quá hạn',
    emptyTasks: 'Không có công việc cần xử lý.', emptyNotifications: 'Chưa có thông báo mới.',
    emptyCalendar: 'Không có lịch làm việc trong ngày này.', emptyApprovals: 'Không có nội dung chờ xử lý.',
    emptyResources: 'Chưa có học liệu gần đây.', emptyContinue: 'Chưa có bản nháp hoặc ứng dụng gần đây.', markAll: 'Đánh dấu tất cả đã đọc',
    students: 'Học sinh', absent: 'Vắng hôm nay', reminders: 'Nhắc việc', alerts: 'Cảnh báo',
    partial: 'Một số nguồn dữ liệu chưa phản hồi. Dashboard vẫn hiển thị phần dữ liệu đã tải được.', retry: 'Thử lại',
    createWork: 'Mở công việc', uploadResource: 'Tải học liệu', textLab: 'Tạo hoạt động', methodsHub: 'Phương pháp giảng dạy', games: 'Mở trò chơi',
    openCalendar: 'Xem lịch', openHomeroom: 'Mở chủ nhiệm', dueSummary: 'Ưu tiên theo thời hạn',
    calendarSummary: 'Công việc và sự kiện trong 14 ngày, không hiển thị tiết dạy', notificationSummary: 'Cập nhật mới cần chú ý',
    workOverview: 'Công việc và lịch làm việc',
    workOverviewSummary: 'Dữ liệu từ Trung tâm công việc chỉ xuất hiện trong một khối, có thể chuyển giữa danh sách ưu tiên và lịch 14 ngày.',
    priorityView: 'Danh sách ưu tiên', calendarView: 'Lịch 14 ngày', progress: 'Tiến độ', completed: 'Đã hoàn thành',
    openItems: 'Đang mở', overdueItems: 'Quá hạn', dueSoonItems: 'Sắp đến hạn', notificationSource: 'Thông báo',
  },
  en: {
    pageTitle: 'Dashboard', hello: 'Hello', teacher: 'Teacher', leader: 'Team leader',
    lead: 'A cleaner overview: work and calendar data are consolidated, leaving room for notifications, resources, feedback and homeroom information.',
    openWork: 'Open work', unread: 'Unread notifications', pending: 'Needs attention', submissionUpdates: 'Submission updates',
    resourcesMetric: 'Recent resources', notifications: 'Notification center',
    approvalsLeader: 'Approvals and feedback', approvalsTeacher: 'Submission status', resources: 'Recent resources',
    continue: 'Continue working', homeroom: 'Homeroom', quickActions: 'Quick actions',
    workHub: 'Work Hub', resourceHub: 'Resource Library', viewAll: 'View all', refresh: 'Refresh', refreshing: 'Syncing…',
    all: 'All', today: 'Today', soon: 'Due soon', overdue: 'Overdue',
    emptyTasks: 'No work requires attention.', emptyNotifications: 'No new notifications.',
    emptyCalendar: 'No work events on this day.', emptyApprovals: 'Nothing needs attention.',
    emptyResources: 'No recent resources.', emptyContinue: 'No recent drafts or apps.', markAll: 'Mark all read',
    students: 'Students', absent: 'Absent today', reminders: 'Reminders', alerts: 'Alerts',
    partial: 'Some data sources did not respond. Available data is still shown.', retry: 'Retry',
    createWork: 'Open work', uploadResource: 'Upload resource', textLab: 'Create activity', methodsHub: 'Teaching methods', games: 'Open games',
    openCalendar: 'View calendar', openHomeroom: 'Open homeroom', dueSummary: 'Prioritized by deadline',
    calendarSummary: 'Work and events across 14 days; teaching periods are not shown', notificationSummary: 'Updates requiring attention',
    workOverview: 'Work and calendar',
    workOverviewSummary: 'Work Hub data appears in one consolidated block. Switch between the priority list and the 14-day calendar.',
    priorityView: 'Priority list', calendarView: '14-day calendar', progress: 'Progress', completed: 'Completed',
    openItems: 'Open', overdueItems: 'Overdue', dueSoonItems: 'Due soon', notificationSource: 'Notification',
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

function WorkRow({ item, language }) {
  const state = getDashboardDueState(item.date, item.done);
  return (
    <button type="button" className="tdb-row" onClick={() => openDashboardTarget(item)}>
      <span className="tdb-row-icon" aria-hidden="true">{item.done ? '✓' : initials(item.sourceLabel)}</span>
      <span className="tdb-row-copy"><strong>{item.title}</strong><small>{item.owner || item.sourceLabel}</small></span>
      <span className="tdb-row-meta"><em className={`tdb-badge is-${state}`}>{dashboardDueLabel(item.date, item.done, language)}</em></span>
    </button>
  );
}

function MiniRow({ item, language, onOpen }) {
  return (
    <button type="button" className="tdb-row" onClick={() => onOpen ? onOpen(item) : openDashboardTarget(item)}>
      <span className="tdb-row-icon" aria-hidden="true">{initials(item.sourceLabel || item.notification_type || 'EH')}</span>
      <span className="tdb-row-copy"><strong>{item.title}</strong><small>{item.owner || item.body || item.sourceLabel}{item.date ? ` · ${formatDashboardDate(item.date, language)}` : ''}</small></span>
      <span className="tdb-row-meta"><em className={`tdb-badge ${item.read_at ? '' : 'is-unread'}`}>{statusLabel(item.status || item.notification_type, language)}</em></span>
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

export default function WorkDashboard({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [snapshot, setSnapshot] = useState(() => createEmptyDashboardSnapshot(currentUser));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [workView, setWorkView] = useState('priority');
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

  const tasks = useMemo(() => {
    const items = snapshot.attention || [];
    if (filter === 'pending') return snapshot.approvals || [];
    if (filter === 'all') return items;
    return items.filter((item) => getDashboardDueState(item.date, item.done) === filter);
  }, [snapshot, filter]);

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

  const feedbackItems = useMemo(() => {
    if (snapshot.approvals?.length) return snapshot.approvals;
    return (snapshot.professional || []).filter((item) => ['submitted', 'approved', 'changes_requested', 'revision', 'rejected'].includes(String(item.status || '').toLowerCase())).slice(0, 8);
  }, [snapshot.approvals, snapshot.professional]);

  const name = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || t.teacher;
  const role = snapshot.leader ? t.leader : t.teacher;
  const initialLoading = loading && !snapshot.generatedAt;
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const todayLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const selectedDayLabel = selectedCalendarDay ? new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: '2-digit' }).format(selectedCalendarDay.date) : '';

  const openNotification = async (item) => {
    if (item?.id !== undefined) await markWorkHubNotificationRead(item.id).catch(() => {});
    if (item?.item_id) rememberWorkHubItem(item.item_id);
    window.location.hash = '#/work-hub';
  };

  const markAllNotifications = async () => {
    if (currentUser?.id) await markAllWorkHubNotificationsRead(currentUser.id).catch(() => {});
    refresh({ quiet: true });
  };

  const openWorkOverview = (nextView = 'priority', nextFilter = 'all') => {
    setWorkView(nextView);
    setFilter(nextFilter);
    window.requestAnimationFrame(() => document.querySelector('#dashboard-work-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const quickActions = [
    ['✓', t.createWork, '#/work-hub'],
    ['▣', t.uploadResource, '#/resource-library'],
    ['✦', t.textLab, '#/tool/textlab-activities'],
    ['TM', t.methodsHub, '#/tool/teaching-methods-hub'],
    ['◇', t.games, '#/games'],
    ['▦', t.openCalendar, '#dashboard-work-overview', 'calendar'],
    ...(snapshot.homeroom ? [['◆', t.openHomeroom, '#/homeroom']] : []),
  ];

  const topMetrics = [
    ['is-blue', '✓', snapshot.workflowHealth?.open || 0, t.openWork, 'work'],
    ['is-purple', '♢', snapshot.stats?.notifications || 0, t.unread, 'notifications'],
    ['is-green', '▣', snapshot.leader ? (snapshot.stats?.pendingApproval || 0) : feedbackItems.length, snapshot.leader ? t.pending : t.submissionUpdates, 'approvals'],
    ['is-amber', '▤', snapshot.recentResources?.length || 0, t.resourcesMetric, 'resources'],
  ];

  return (
    <section className={`tdb-page${initialLoading ? ' is-loading' : ''}`} aria-label={t.pageTitle} aria-busy={loading}>
      <header className="tdb-hero">
        <div>
          <span className="tdb-eyebrow">ENGLISH HUB · DASHBOARD</span>
          <h1>{t.hello}, {name}!</h1>
          <p>{t.lead}</p>
          <div className="tdb-hero-actions">
            <button type="button" className="tdb-button primary" onClick={() => { window.location.hash = '#/work-hub'; }}>✓ {t.workHub}</button>
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
          <button key={label} type="button" className={`tdb-metric ${tone}`} onClick={() => {
            if (target === 'work') openWorkOverview('priority', 'all');
            else document.querySelector(`#dashboard-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>
            <span className="tdb-metric-icon" aria-hidden="true">{icon}</span>
            <span className="tdb-metric-copy"><strong>{value}</strong><span>{label}</span><small>{t.viewAll}</small></span>
          </button>
        ))}
      </section>

      <Card id="dashboard-work-overview" className="tdb-work-overview-card" title={t.workOverview} subtitle={t.workOverviewSummary} icon="▦" action={() => { window.location.hash = '#/work-hub'; }} actionLabel={t.viewAll}>
        <div className="tdb-work-summary" aria-label={t.workOverview}>
          <button type="button" className="tdb-work-stat is-progress" onClick={() => openWorkOverview('priority', 'all')}><span>{t.progress}</span><strong>{snapshot.workflowHealth?.progress || 0}%</strong><small>{snapshot.workflowHealth?.completed || 0}/{snapshot.workflowHealth?.total || 0} {t.completed.toLowerCase()}</small></button>
          <button type="button" className="tdb-work-stat" onClick={() => openWorkOverview('priority', 'all')}><span>{t.openItems}</span><strong>{snapshot.workflowHealth?.open || 0}</strong><small>{t.dueSummary}</small></button>
          <button type="button" className="tdb-work-stat is-overdue" onClick={() => openWorkOverview('priority', 'overdue')}><span>{t.overdueItems}</span><strong>{snapshot.workflowHealth?.overdue || 0}</strong><small>{t.overdue}</small></button>
          <button type="button" className="tdb-work-stat is-soon" onClick={() => openWorkOverview('priority', 'soon')}><span>{t.dueSoonItems}</span><strong>{snapshot.stats?.dueSoon || 0}</strong><small>{t.soon}</small></button>
        </div>

        <div className="tdb-work-toolbar">
          <div className="tdb-work-tabs" role="tablist" aria-label={t.workOverview}>
            <button type="button" role="tab" aria-selected={workView === 'priority'} className={workView === 'priority' ? 'is-active' : ''} onClick={() => setWorkView('priority')}>✓ {t.priorityView}</button>
            <button type="button" role="tab" aria-selected={workView === 'calendar'} className={workView === 'calendar' ? 'is-active' : ''} onClick={() => setWorkView('calendar')}>▦ {t.calendarView}</button>
          </div>
          <small>{workView === 'priority' ? t.dueSummary : t.calendarSummary}</small>
        </div>

        {workView === 'priority' ? (
          <div className="tdb-work-view-panel" role="tabpanel">
            <div className="tdb-filter-row">
              {['all', 'today', 'soon', 'overdue', 'pending'].map((key) => <button type="button" key={key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>{key === 'all' ? t.all : key === 'today' ? t.today : key === 'soon' ? t.soon : key === 'overdue' ? t.overdue : t.pending}</button>)}
            </div>
            <div className="tdb-scroll tdb-work-list">{initialLoading ? <Empty>{t.refreshing}</Empty> : tasks.length ? tasks.slice(0, 12).map((item) => <WorkRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyTasks}</Empty>}</div>
          </div>
        ) : (
          <div className="tdb-work-view-panel" role="tabpanel">
            <div className="tdb-calendar-days">
              {calendarDays.map((day) => (
                <button type="button" key={day.key} className={`tdb-day${day.events.length ? ' has-events' : ''}${selectedDay === day.key ? ' is-selected' : ''}`} onClick={() => setSelectedDay(day.key)}>
                  <span>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date)}</span>
                  <strong>{day.date.getDate()}</strong><i aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="tdb-selected-day-head"><strong>{selectedDayLabel}</strong><span>{selectedEvents.length} {language === 'vi' ? 'mục' : 'items'}</span></div>
            <div className="tdb-calendar-events tdb-work-calendar-events">{selectedEvents.length ? selectedEvents.map((item) => <WorkRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyCalendar}</Empty>}</div>
          </div>
        )}
      </Card>

      <section className="tdb-grid-main">
        <Card id="dashboard-notifications" title={t.notifications} subtitle={t.notificationSummary} icon="♢" action={markAllNotifications} actionLabel={snapshot.notifications?.length ? t.markAll : undefined}>
          <div className="tdb-scroll">{snapshot.notifications?.length ? snapshot.notifications.slice(0, 10).map((item) => <MiniRow key={item.id} item={{ ...item, sourceLabel: t.notificationSource, status: item.notification_type }} language={language} onOpen={openNotification} />) : <Empty>{t.emptyNotifications}</Empty>}</div>
        </Card>
        <Card title={t.continue} icon="↔" action={() => { window.location.hash = '#/apps'; }} actionLabel={t.viewAll}>
          <div className="tdb-continue-grid">{snapshot.continueItems?.length ? snapshot.continueItems.map((item) => <Tile key={`${item.id}:${item.target}`} item={item} language={language} />) : <Empty>{t.emptyContinue}</Empty>}</div>
        </Card>
      </section>

      <section className="tdb-grid-equal">
        <Card id="dashboard-approvals" title={snapshot.leader ? t.approvalsLeader : t.approvalsTeacher} icon="▣" action={() => { window.location.hash = snapshot.leader ? '#/resource-library' : '#/work-hub'; }} actionLabel={t.viewAll}>
          <div className="tdb-scroll is-short">{feedbackItems.length ? feedbackItems.map((item) => <MiniRow key={item.id} item={item} language={language} />) : <Empty>{t.emptyApprovals}</Empty>}</div>
        </Card>
        <Card id="dashboard-resources" title={t.resources} icon="▤" action={() => { window.location.hash = '#/resource-library'; }} actionLabel={t.viewAll}>
          <div className="tdb-resource-grid">{snapshot.recentResources?.length ? snapshot.recentResources.map((item) => <Tile key={item.id} item={{ ...item, target: '#/resource-library', icon: 'RL' }} language={language} />) : <Empty>{t.emptyResources}</Empty>}</div>
        </Card>
      </section>

      {snapshot.homeroom ? <Card title={t.homeroom} icon="◆" action={() => { window.location.hash = '#/homeroom'; }} actionLabel={t.viewAll}>
        <div className="tdb-homeroom-grid">
          {[[t.students, snapshot.homeroom.studentCount], [t.absent, snapshot.homeroom.absentToday], [t.reminders, snapshot.homeroom.reminders], [t.alerts, snapshot.homeroom.alerts]].map(([label, value]) => <button type="button" key={label} className="tdb-homeroom-stat" onClick={() => { window.location.hash = '#/homeroom'; }}><strong>{value}</strong><span>{label}</span></button>)}
        </div>
      </Card> : null}

      <Card title={t.quickActions} icon="＋">
        <div className="tdb-quick-actions">
          {quickActions.map(([icon, label, target, nextView]) => <button type="button" key={label} className="tdb-quick-action" onClick={() => {
            if (target === '#dashboard-work-overview') openWorkOverview(nextView || 'priority', 'all');
            else window.location.hash = target;
          }}><span aria-hidden="true">{icon}</span><strong>{label}</strong></button>)}
        </div>
      </Card>
    </section>
  );
}
