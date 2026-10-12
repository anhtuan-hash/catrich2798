import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Bell, CalendarDays, CheckCircle2,
  ClipboardList, Clock3, FileText, FolderOpen, LayoutDashboard,
  Search, ShieldCheck, Users, Zap,
} from 'lucide-react';
import { dashboardDueLabel, getDashboardDueState, openDashboardTarget } from '../utils/dashboardAggregator.js';

/**
 * Dashboard 2.0: a read-only, permission-aware surface over the existing
 * dashboard aggregator. It does not write to work-hub, attendance or grades.
 */
const TEXT = {
  vi: {
    heading: 'Trung tâm điều hành', subtitle: 'Việc cần làm, lịch và những nội dung quan trọng trong một nơi.',
    today: 'Lịch hôm nay', overdue: 'Quá hạn', dueSoon: 'Sắp đến hạn',
    approvals: 'Chờ duyệt', notices: 'Thông báo', priority: 'Cần bạn chú ý',
    queueSub: 'Những công việc đang chờ xử lý, xếp theo mức độ khẩn cấp.',
    all: 'Tất cả', late: 'Quá hạn', todayFilter: 'Hôm nay', soon: '3 ngày tới',
    empty: 'Không có công việc nào thuộc nhóm này.', noWork: 'Bạn đã xử lý xong các công việc trong nhóm này.',
    continue: 'Tiếp tục công việc', continueSub: 'Quay lại ứng dụng và bản nháp gần đây.',
    resources: 'Học liệu gần đây', classroom: 'Lớp chủ nhiệm',
    students: 'học sinh', absent: 'Vắng / đi trễ hôm nay', alerts: 'Cần theo dõi',
    viewClass: 'Mở chủ nhiệm', viewAll: 'Mở trung tâm công việc',
    overview: 'Tổng quan', loading: 'Đang đồng bộ', updated: 'Cập nhật',
    source: 'Nguồn', retry: 'Tải lại', tasks: 'công việc',
    search: 'Tìm công việc...', more: 'Xem thêm', less: 'Thu gọn',
  },
  en: {
    heading: 'Your command center', subtitle: 'Your schedule, priorities and work in one place.',
    today: 'Today’s events', overdue: 'Overdue', dueSoon: 'Due soon',
    approvals: 'Awaiting approval', notices: 'Notifications', priority: 'Needs attention',
    queueSub: 'Outstanding tasks, ordered by urgency.',
    all: 'All', late: 'Overdue', todayFilter: 'Today', soon: 'Next 3 days',
    empty: 'No tasks in this group.', noWork: 'You are all caught up in this group.',
    continue: 'Continue working', continueSub: 'Return to recent tools and drafts.',
    resources: 'Recent resources', classroom: 'Homeroom',
    students: 'students', absent: 'Absent / late today', alerts: 'Alerts',
    viewClass: 'Open homeroom', viewAll: 'Open work center',
    overview: 'Overview', loading: 'Syncing', updated: 'Updated',
    source: 'Source', retry: 'Refresh', tasks: 'tasks',
    search: 'Search tasks...', more: 'Show more', less: 'Show fewer',
  },
};

const FILTERS = ['all', 'overdue', 'today', 'soon'];
const count = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const goTo = (target) => { if (typeof window !== 'undefined') window.location.hash = target; };

function PriorityRow({ item, language, now, approval = false }) {
  const state = approval ? 'approval' : getDashboardDueState(item.date, item.done, now);
  return (
    <button className={'dcc-priority-row is-' + state} type="button" onClick={() => openDashboardTarget(item)}>
      <span className="dcc-row-icon" aria-hidden="true">
        {state === 'overdue' ? <AlertCircle size={19} /> : state === 'today' ? <Clock3 size={19} /> : <ClipboardList size={19} />}
      </span>
      <span className="dcc-row-detail">
        <strong>{item.title}</strong>
        <small>{item.sourceLabel}{item.owner ? ' · ' + item.owner : ''}</small>
      </span>
      <span className="dcc-row-due">{approval ? (language === 'vi' ? 'Chờ duyệt' : 'Pending') : dashboardDueLabel(item.date, item.done, language, now)}</span>
      <ArrowRight size={16} className="dcc-row-arrow" aria-hidden="true" />
    </button>
  );
}

export default function DashboardCommandCenter({ snapshot, todayEventCount, language = 'vi', now = new Date(), loading = false, onRefresh }) {
  const t = TEXT[language] || TEXT.vi;
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(8);
  const [showNotifications, setShowNotifications] = useState(false);
  const queueRef = useRef(null);
  const stats = snapshot?.stats || {};
  const attention = snapshot?.attention || [];
  const isLeader = Boolean(snapshot?.leader);
  const cards = [
    { id: 'today', label: t.today, value: count(todayEventCount ?? stats.todayEvents), tone: 'blue', Icon: CalendarDays, action: 'calendar' },
    { id: 'overdue', label: t.overdue, value: count(stats.overdue), tone: 'coral', Icon: AlertCircle, action: 'overdue' },
    { id: 'dueSoon', label: t.dueSoon, value: count(stats.dueSoon), tone: 'violet', Icon: Clock3, action: 'soon' },
    isLeader
      ? { id: 'approvals', label: t.approvals, value: count(stats.pendingApproval), tone: 'green', Icon: ShieldCheck, action: 'approvals' }
      : { id: 'notices', label: t.notices, value: count(stats.notifications), tone: 'green', Icon: Bell, action: 'notices' },
  ];
  const approvalItems = snapshot?.approvals || [];
  const filtered = useMemo(() => (filter === 'approvals' ? approvalItems : attention).filter((item) => {
    const belongs = filter === 'all' || filter === 'approvals' || getDashboardDueState(item.date, item.done, now) === filter;
    const found = !search.trim() || [item.title, item.description, item.owner, item.sourceLabel]
      .some((value) => String(value || '').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
    return belongs && found;
  }), [attention, approvalItems, filter, now, search]);
  const visible = filtered.slice(0, visibleLimit);
  const continueItems = (snapshot?.continueItems || []).filter((item) =>
    item.target && !['#/dashboard', '#/home'].includes(item.target)
  ).slice(0, 5);
  const resources = (snapshot?.recentResources || []).slice(0, 3);
  const homeroom = snapshot?.homeroom;
  const jumpToQueue = (next) => {
    setFilter(next);
    setVisibleLimit(8);
    window.requestAnimationFrame(() => queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const activate = (action) => {
    if (action === 'calendar') {
      document.querySelector('#dashboard-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'approvals') {
      jumpToQueue('approvals');
    } else if (action === 'notices') {
      setShowNotifications((current) => !current);
    } else {
      jumpToQueue(action);
    }
  };
  return (
    <section className="dcc-root" aria-label={t.heading}>
      <div className="dcc-section-heading">
        <div className="dcc-heading-label"><span className="dcc-heading-mark"><LayoutDashboard size={18}/></span>
          <div><h2>{t.heading}</h2><p>{t.subtitle}</p></div>
        </div>
        <button type="button" className="dcc-refresh" onClick={() => onRefresh?.()} disabled={loading}>
          <Zap size={15} aria-hidden="true"/>{loading ? t.loading : t.retry}
        </button>
      </div>
      <div className="dcc-stats">
        {cards.map(({ id, label, value, tone, Icon, action }) => (
          <button className={'dcc-stat dcc-stat--' + tone} type="button" key={id} onClick={() => activate(action)}>
            <span className="dcc-stat-top">
              <span className="dcc-stat-icon"><Icon size={22} strokeWidth={2.2}/></span>
              <ArrowRight className="dcc-stat-arrow" size={18} aria-hidden="true" />
            </span>
            <span className="dcc-stat-number">{value.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
            <span className="dcc-stat-label">{label}</span>
          </button>
        ))}
      </div>
      {showNotifications ? <div className="dcc-notification-panel" role="region" aria-label={t.notices}>
        <div className="dcc-notification-title"><Bell size={18}/><strong>{t.notices} ({count(stats.notifications)})</strong><button type="button" onClick={() => setShowNotifications(false)}>{language === 'vi' ? 'Đóng' : 'Close'}</button></div>
        {(snapshot?.notifications || []).length ? (snapshot.notifications || []).slice(0, 8).map((item) =>
          <button type="button" className="dcc-notification-item" key={item.id} onClick={() => {
            setShowNotifications(false);
            window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'feed' } }));
          }}>
            <span><strong>{item.title || t.notices}</strong><small>{item.body || ''}</small></span><ArrowRight size={15}/>
          </button>
        ) : <div className="dcc-sidebar-empty">{language === 'vi' ? 'Chưa có thông báo chưa đọc.' : 'No unread notifications.'}</div>}
      </div> : null}
      <div className="dcc-workspace">
        <article className="dcc-panel dcc-priority" ref={queueRef}>
          <header className="dcc-panel-header">
            <span className="dcc-panel-icon dcc-panel-icon--orange"><ClipboardList size={21}/></span>
            <div><h3>{t.priority}</h3><p>{t.queueSub}</p></div>
            <span className="dcc-count">{count(stats.openTasks ?? attention.length)} {t.tasks}</span>
          </header>
          <div className="dcc-filters" role="group" aria-label={t.priority}>
            {(isLeader ? [...FILTERS, 'approvals'] : FILTERS).map((key) => (
              <button key={key} type="button" className={filter === key ? 'is-active' : ''} aria-pressed={filter === key} onClick={() => { setFilter(key); setVisibleLimit(8); }}>
                {key === 'all' ? t.all : key === 'overdue' ? t.late : key === 'today' ? t.todayFilter : key === 'approvals' ? t.approvals : t.soon}
              </button>
            ))}
          </div>
          <label className="dcc-task-search"><Search size={16} aria-hidden="true" /><input role="searchbox" type="text" tabIndex={0} value={search} onChange={(event) => { setSearch(event.target.value); setVisibleLimit(8); }} placeholder={t.search} aria-label={t.search} /></label>
          <div className="dcc-priority-list">
            {visible.length ? visible.map((item) => <PriorityRow item={item} key={item.id} language={language} now={now} approval={filter === 'approvals'} />) : (
              <div className="dcc-empty"><CheckCircle2 size={25}/><span>{(filter === 'approvals' ? approvalItems : attention).length ? t.empty : t.noWork}</span></div>
            )}
          </div>
          {filtered.length > 8 ? <div className="dcc-show-more">
            <span>{Math.min(visibleLimit, filtered.length)} / {filtered.length}</span>
            <button type="button" onClick={() => setVisibleLimit((limit) => limit >= filtered.length ? 8 : Math.min(filtered.length, limit + 8))}>{visibleLimit >= filtered.length ? t.less : t.more}</button>
          </div> : null}
          <button className="dcc-panel-link" type="button" onClick={() => window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'feed' } }))}>
            {t.viewAll} <ArrowRight size={16}/>
          </button>
        </article>
        <div className="dcc-sidebar">
          <article className="dcc-panel dcc-continue">
            <header className="dcc-panel-header">
              <span className="dcc-panel-icon dcc-panel-icon--blue"><Zap size={21}/></span>
              <div><h3>{t.continue}</h3><p>{t.continueSub}</p></div>
            </header>
            {continueItems.length ? <div className="dcc-recent-list">
              {continueItems.map((item) => <button type="button" key={item.id || item.target} onClick={() => goTo(item.target)}>
                <span className="dcc-recent-glyph" style={{ '--dcc-accent': item.accent || '#2c75e4' }}><FileText size={17}/></span>
                <span>{item.title}</span><ArrowRight size={15}/>
              </button>)}
            </div> : <div className="dcc-sidebar-empty"><FolderOpen size={19}/>{language === 'vi' ? 'Các ứng dụng đã sử dụng sẽ xuất hiện tại đây.' : 'Recently used apps will appear here.'}</div>}
          </article>
          {homeroom ? <article className="dcc-homeroom">
            <div className="dcc-class-title"><span><Users size={22}/></span><div><small>{t.classroom}</small><strong>{homeroom.className}</strong></div></div>
            <div className="dcc-class-stats">
              <span><b>{count(homeroom.studentCount)}</b><small>{t.students}</small></span>
              <span><b>{count(homeroom.absentToday)}</b><small>{t.absent}</small></span>
              <span><b>{count(homeroom.alerts)}</b><small>{t.alerts}</small></span>
            </div>
            <button type="button" onClick={() => goTo('#/homeroom')}>{t.viewClass}<ArrowRight size={16}/></button>
          </article> : resources.length ? <article className="dcc-panel dcc-resources">
            <header className="dcc-panel-header">
              <span className="dcc-panel-icon dcc-panel-icon--violet"><FolderOpen size={20}/></span>
              <div><h3>{t.resources}</h3></div>
            </header>
            {resources.map((item) => <button type="button" key={item.id} onClick={() => goTo('#/resource-library')}>
              <FileText size={17}/><span>{item.title}</span><ArrowRight size={15}/>
            </button>)}
          </article> : null}
        </div>
      </div>
    </section>
  );
}
