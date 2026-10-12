import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, Bell, CalendarDays, CheckCircle2,
  ClipboardList, Clock3, FileText, FolderOpen, LayoutDashboard,
  Search, ShieldCheck, Users, Zap, Database, Info, SlidersHorizontal,
} from 'lucide-react';
import { dashboardDueLabel, getDashboardDueState, openDashboardTarget } from '../utils/dashboardAggregator.js';
import DashboardLayoutEditor from './DashboardLayoutEditor.jsx';
import { normalizeDashboardLayout, setDashboardSectionVisible } from '../utils/dashboardLayoutPreferences.js';

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
    scopeAll: 'Toàn tổ', scopeMine: 'Việc của tôi',
    latest: 'Dữ liệu lúc', loadingNote: 'Đang làm mới', local: 'Nguồn đang hiển thị',
    limited: 'Nguồn công việc có giới hạn số bản ghi. Số liệu có thể chưa đầy đủ.',
    counterTip: 'Chỉ tính nhiệm vụ chưa hoàn thành; không tính sự kiện lịch đã diễn ra.',
    displayed: 'hiển thị', customize: 'Tùy chỉnh', doneCustomize: 'Xong',
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
    scopeAll: 'Department', scopeMine: 'My tasks',
    latest: 'Data from', loadingNote: 'Refreshing', local: 'Current source',
    limited: 'The work source is capped. Some totals may be incomplete.',
    counterTip: 'Counts unfinished tasks only, not past calendar events.',
    displayed: 'shown', customize: 'Customize', doneCustomize: 'Done',
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

export default function DashboardCommandCenter({ snapshot, todayEventCount, language = 'vi', now = new Date(), loading = false, onRefresh, layout: layoutInput, onChangeLayout, onFocusCalendar }) {
  const t = TEXT[language] || TEXT.vi;
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all');
  const [visibleLimit, setVisibleLimit] = useState(8);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);
  const layout = useMemo(() => normalizeDashboardLayout(layoutInput), [layoutInput]);
  const sectionVisible = (id) => !layout.hiddenSections.includes(id);
  const updateLayout = (transform) => onChangeLayout?.(transform);
  const queueRef = useRef(null);
  const stats = snapshot?.stats || {};
  const attention = snapshot?.attention || [];
  const isLeader = Boolean(snapshot?.leader);
  const scopedAttention = useMemo(() => isLeader && scope === 'mine'
    ? attention.filter((item) => item.mine) : attention, [attention, isLeader, scope]);
  const sourceName = snapshot?.sources?.workHub || 'loading';
  const lastUpdated = snapshot?.generatedAt ? new Date(snapshot.generatedAt) : null;
  const lastUpdatedLabel = lastUpdated && Number.isFinite(lastUpdated.getTime())
    ? new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(lastUpdated) : '—';
  const cards = [
    { id: 'today', label: t.today, value: count(todayEventCount ?? stats.todayEvents), tone: 'blue', Icon: CalendarDays, action: 'calendar' },
    { id: 'overdue', label: t.overdue, value: count(scope === 'mine' && isLeader ? stats.mineOverdue : stats.overdue), tone: 'coral', Icon: AlertCircle, action: 'overdue' },
    { id: 'dueSoon', label: t.dueSoon, value: count(scope === 'mine' && isLeader ? stats.mineDueSoon : stats.dueSoon), tone: 'violet', Icon: Clock3, action: 'soon' },
    isLeader
      ? { id: 'approvals', label: t.approvals, value: count(stats.pendingApproval), tone: 'green', Icon: ShieldCheck, action: 'approvals' }
      : { id: 'notices', label: t.notices, value: count(stats.notifications), tone: 'green', Icon: Bell, action: 'notices' },
  ];
  const availableIds = cards.map((card) => card.id);
  const orderedCards = layout.cardOrder.map((id) => cards.find((card) => card.id === id)).filter(Boolean);
  const visibleCards = orderedCards.filter((card) => !layout.hiddenCards.includes(card.id));
  const cardsToRender = visibleCards.length ? visibleCards : orderedCards.slice(0, 1);
  const approvalItems = snapshot?.approvals || [];
  const filtered = useMemo(() => (filter === 'approvals' ? approvalItems : scopedAttention).filter((item) => {
    const belongs = filter === 'all' || filter === 'approvals' || getDashboardDueState(item.date, item.done, now) === filter;
    const found = !search.trim() || [item.title, item.description, item.owner, item.sourceLabel]
      .some((value) => String(value || '').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
    return belongs && found;
  }), [scopedAttention, approvalItems, filter, now, search]);
  const visible = filtered.slice(0, visibleLimit);
  const continueItems = (snapshot?.continueItems || []).filter((item) =>
    item.target && !['#/dashboard', '#/home'].includes(item.target)
  ).slice(0, 5);
  const resources = (snapshot?.recentResources || []).slice(0, 3);
  const homeroom = snapshot?.homeroom;
  const jumpToQueue = (next) => {
    if (!sectionVisible('priority')) updateLayout((current) => setDashboardSectionVisible(current, 'priority', true));
    setFilter(next);
    setVisibleLimit(8);
    window.requestAnimationFrame(() => queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const activate = (action) => {
    if (action === 'calendar') {
      if (onFocusCalendar) onFocusCalendar();
      else document.querySelector('#dashboard-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'approvals') {
      jumpToQueue('approvals');
    } else if (action === 'notices') {
      setShowNotifications((current) => !current);
    } else {
      jumpToQueue(action);
    }
  };
  return (
    <section className={'dcc-root dcc-density--' + layout.density} aria-label={t.heading}>
      <div className="dcc-section-heading">
        <div className="dcc-heading-label"><span className="dcc-heading-mark"><LayoutDashboard size={18}/></span>
          <div><h2>{t.heading}</h2><p>{t.subtitle}</p></div>
        </div>
        <div className="dcc-header-actions">
          <button type="button" className={'dcc-customize-trigger' + (editingLayout ? ' is-active' : '')} aria-expanded={editingLayout} onClick={() => setEditingLayout((value) => !value)}>
            <SlidersHorizontal size={15} aria-hidden="true"/>{editingLayout ? t.doneCustomize : t.customize}
          </button>
          <button type="button" className="dcc-refresh" onClick={() => onRefresh?.()} disabled={loading}>
            <Zap size={15} aria-hidden="true"/>{loading ? t.loading : t.retry}
          </button>
        </div>
      </div>
      {editingLayout ? <DashboardLayoutEditor cards={cards} layout={layout} language={language} onChange={updateLayout}/> : null}
      <div className="dcc-sync-strip">
        <span><Database size={14} aria-hidden="true" />{loading ? t.loadingNote : t.latest} {lastUpdatedLabel}</span>
        <span className="dcc-source-chip" title={sourceName}>{t.local}: {sourceName.replaceAll('-', ' ')}</span>
      </div>
      {snapshot?.coverageLimited ? <div className="dcc-data-limited" role="status"><Info size={17} aria-hidden="true" />{t.limited}</div> : null}
      <div className="dcc-stats" data-visible-count={cardsToRender.length}>
        {cardsToRender.map(({ id, label, value, tone, Icon, action }) => (
          <button className={'dcc-stat dcc-stat--' + tone} type="button" key={id} onClick={() => activate(action)} title={id === 'overdue' ? t.counterTip : undefined}>
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
      <div className={'dcc-workspace' + (!sectionVisible('priority') ? ' dcc-workspace--sidebar-only' : '') + (!sectionVisible('continue') && !sectionVisible('homeroom') ? ' dcc-workspace--single' : '')}>
        {sectionVisible('priority') ? <article className="dcc-panel dcc-priority" ref={queueRef}>
          <header className="dcc-panel-header">
            <span className="dcc-panel-icon dcc-panel-icon--orange"><ClipboardList size={21}/></span>
            <div><h3>{t.priority}</h3><p>{t.queueSub}</p></div>
            <span className="dcc-count">{count(isLeader && scope === 'mine' ? stats.mineOpenTasks : stats.openTasks ?? scopedAttention.length)} {t.tasks}</span>
          </header>
          {isLeader ? <div className="dcc-scope-switch" role="group" aria-label={language === 'vi' ? 'Phạm vi công việc' : 'Task scope'}>
            <button type="button" aria-pressed={scope === 'all'} className={scope === 'all' ? 'is-active' : ''} onClick={() => { setScope('all'); setVisibleLimit(8); }}>{t.scopeAll}</button>
            <button type="button" aria-pressed={scope === 'mine'} className={scope === 'mine' ? 'is-active' : ''} onClick={() => { setScope('mine'); setFilter('all'); setVisibleLimit(8); }}>{t.scopeMine}</button>
          </div> : null}
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
              <div className="dcc-empty"><CheckCircle2 size={25}/><span>{(filter === 'approvals' ? approvalItems : scopedAttention).length ? t.empty : t.noWork}</span></div>
            )}
          </div>
          {filtered.length > 8 ? <div className="dcc-show-more">
            <span>{Math.min(visibleLimit, filtered.length)} / {filtered.length} {t.displayed}</span>
            <button type="button" onClick={() => setVisibleLimit((limit) => limit >= filtered.length ? 8 : Math.min(filtered.length, limit + 8))}>{visibleLimit >= filtered.length ? t.less : t.more}</button>
          </div> : null}
          <button className="dcc-panel-link" type="button" onClick={() => window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'feed' } }))}>
            {t.viewAll} <ArrowRight size={16}/>
          </button>
        </article> : null}
        {sectionVisible('continue') || sectionVisible('homeroom') ? <div className="dcc-sidebar">
          {sectionVisible('continue') ? <article className="dcc-panel dcc-continue">
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
          </article> : null}
          {sectionVisible('homeroom') && homeroom ? <article className="dcc-homeroom">
            <div className="dcc-class-title"><span><Users size={22}/></span><div><small>{t.classroom}</small><strong>{homeroom.className}</strong></div></div>
            <div className="dcc-class-stats">
              <span><b>{count(homeroom.studentCount)}</b><small>{t.students}</small></span>
              <span><b>{count(homeroom.absentToday)}</b><small>{t.absent}</small></span>
              <span><b>{count(homeroom.alerts)}</b><small>{t.alerts}</small></span>
            </div>
            <button type="button" onClick={() => goTo('#/homeroom')}>{t.viewClass}<ArrowRight size={16}/></button>
          </article> : sectionVisible('homeroom') && resources.length ? <article className="dcc-panel dcc-resources">
            <header className="dcc-panel-header">
              <span className="dcc-panel-icon dcc-panel-icon--violet"><FolderOpen size={20}/></span>
              <div><h3>{t.resources}</h3></div>
            </header>
            {resources.map((item) => <button type="button" key={item.id} onClick={() => goTo('#/resource-library')}>
              <FileText size={17}/><span>{item.title}</span><ArrowRight size={15}/>
            </button>)}
          </article> : null}
        </div> : null}
      </div>
    </section>
  );
}
