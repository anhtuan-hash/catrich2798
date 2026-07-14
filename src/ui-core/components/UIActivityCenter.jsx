import React, { useEffect, useMemo, useState } from 'react';
import {
  listWorkHubNotifications,
  markAllWorkHubNotificationsRead,
  markWorkHubNotificationRead,
  rememberWorkHubItem,
  subscribeWorkHubNotifications,
  WORK_HUB_DELIVERY_EVENT,
} from '../../utils/workHubDelivery.js';
import {
  clearCompletedSyncItems,
  listSyncQueue,
  removeSyncItem,
  SYNC_QUEUE_EVENT,
} from '../../utils/syncQueue.js';
import { AUTOSAVE_EVENT } from '../../utils/autosave.js';
import { listVersions } from '../../utils/versionHistory.js';
import { AUTOMATION_UPDATED } from '../../utils/automationEngine.js';
import { launchRoute } from '../../utils/motion.js';
import { loadWorkspaceMemory, WORKSPACE_MEMORY_EVENT } from '../runtime/workspaceMemory.js';
import {
  ACTIVITY_CENTER_EVENT,
  ACTIVITY_CENTER_OPEN_EVENT,
  clearActivityState,
  loadActivityState,
  markActivityRead,
  markAllActivitiesRead,
  recordActivity,
} from '../runtime/activityCenter.js';
import { UIOverlayClose, UIOverlayHeader, UIOverlayPortal, UIOverlaySurface } from './UIOverlays.jsx';

const TABS = ['overview', 'notifications', 'work', 'sync', 'history', 'ai'];

function routeKey(route, selectedTool) {
  return route === 'tool' && selectedTool?.slug ? `tool/${selectedTool.slug}` : route;
}

function toTarget(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('#/')) return text;
  return `#/${text.replace(/^\//, '')}`;
}

function formatTime(value, language) {
  const date = new Date(Number(value) || value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function ActivityEmpty({ language, tab }) {
  const vi = {
    notifications: 'Chưa có thông báo mới.', work: 'Chưa có cập nhật công việc.', sync: 'Không có thay đổi chờ đồng bộ.',
    history: 'Chưa có lịch sử gần đây.', ai: 'Chưa có hoạt động AI trong phiên này.', overview: 'Chưa có hoạt động mới.',
  };
  const en = {
    notifications: 'No new notifications.', work: 'No work updates.', sync: 'No pending sync changes.',
    history: 'No recent history.', ai: 'No AI activity in this session.', overview: 'No recent activity.',
  };
  return <div className="bui-activity-empty"><span aria-hidden="true">○</span><p>{(language === 'vi' ? vi : en)[tab] || ''}</p></div>;
}

export default function UIActivityCenter({ currentUser, route = 'home', selectedTool = null, language = 'vi', externalTrigger = false }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activityState, setActivityState] = useState(() => loadActivityState(currentUser));
  const [workNotifications, setWorkNotifications] = useState([]);
  const [syncItems, setSyncItems] = useState(() => listSyncQueue(currentUser));
  const [workspaceMemory, setWorkspaceMemory] = useState(() => loadWorkspaceMemory(currentUser));
  const [versions, setVersions] = useState(() => listVersions(currentUser, routeKey(route, selectedTool)));
  const [aiActive, setAiActive] = useState(false);
  const [loadingWork, setLoadingWork] = useState(false);

  const copy = language === 'vi' ? {
    trigger: 'Hoạt động', title: 'Trung tâm hoạt động', subtitle: 'Thông báo, công việc, đồng bộ, lịch sử và AI trong một nơi.',
    close: 'Đóng', overview: 'Tổng quan', notifications: 'Thông báo', work: 'Công việc', sync: 'Đồng bộ', history: 'Lịch sử', ai: 'AI',
    unread: 'chưa đọc', pending: 'đang chờ', recent: 'gần đây', running: 'đang chạy', open: 'Mở', openDetailed: 'Mở bảng thông báo chi tiết',
    markAll: 'Đánh dấu tất cả đã đọc', clear: 'Xóa lịch sử hoạt động', clearDone: 'Xóa mục đã đồng bộ', openWork: 'Mở Trung tâm công việc',
    openAi: 'Mở Brian AI', noBody: 'Không có mô tả', currentDraft: 'Lịch sử bản nháp hiện tại', workspaceHistory: 'Phiên làm việc gần đây',
  } : {
    trigger: 'Activity', title: 'Activity Center', subtitle: 'Notifications, work, sync, history and AI in one place.',
    close: 'Close', overview: 'Overview', notifications: 'Notifications', work: 'Work', sync: 'Sync', history: 'History', ai: 'AI',
    unread: 'unread', pending: 'pending', recent: 'recent', running: 'running', open: 'Open', openDetailed: 'Open detailed notification panel',
    markAll: 'Mark all as read', clear: 'Clear activity history', clearDone: 'Clear completed items', openWork: 'Open Work Hub',
    openAi: 'Open Brian AI', noBody: 'No description', currentDraft: 'Current draft history', workspaceHistory: 'Recent workspace sessions',
  };

  const refreshWork = async () => {
    if (!currentUser?.id) { setWorkNotifications([]); return; }
    setLoadingWork(true);
    try { setWorkNotifications(await listWorkHubNotifications(currentUser.id, 80)); }
    finally { setLoadingWork(false); }
  };

  useEffect(() => {
    setActivityState(loadActivityState(currentUser));
    setSyncItems(listSyncQueue(currentUser));
    setWorkspaceMemory(loadWorkspaceMemory(currentUser));
    setVersions(listVersions(currentUser, routeKey(route, selectedTool)));
    refreshWork();
  }, [currentUser?.id, currentUser?.email, route, selectedTool?.slug]);

  useEffect(() => {
    const openCenter = (event) => {
      const requested = String(event?.detail?.tab || 'overview');
      setActiveTab(TABS.includes(requested) ? requested : 'overview');
      setOpen(true);
    };
    const onActivity = (event) => setActivityState(event?.detail || loadActivityState(currentUser));
    const onStorage = (event) => {
      if (String(event?.key || '').startsWith('brian-activity-center-v12.10:')) setActivityState(loadActivityState(currentUser));
    };
    window.addEventListener(ACTIVITY_CENTER_OPEN_EVENT, openCenter);
    window.addEventListener(ACTIVITY_CENTER_EVENT, onActivity);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ACTIVITY_CENTER_OPEN_EVENT, openCenter);
      window.removeEventListener(ACTIVITY_CENTER_EVENT, onActivity);
      window.removeEventListener('storage', onStorage);
    };
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const onWork = (event) => {
      refreshWork();
      const type = String(event?.detail?.type || 'work-update');
      setActivityState(recordActivity(currentUser, {
        id: `work-${type}-${Date.now()}`,
        category: 'work', icon: 'WK', source: 'work-hub', status: type,
        title: language === 'vi' ? 'Cập nhật Trung tâm công việc' : 'Work Hub update',
        body: type.replaceAll('-', ' '), target: '#/work-hub', createdAt: Date.now(),
      }));
    };
    const onSync = (event) => {
      const next = Array.isArray(event?.detail) ? event.detail : listSyncQueue(currentUser);
      setSyncItems(next);
      const pending = next.filter((item) => item.status !== 'completed').length;
      setActivityState(recordActivity(currentUser, {
        id: 'sync-summary', category: 'sync', icon: 'SY', source: 'sync-queue',
        title: language === 'vi' ? 'Trạng thái đồng bộ' : 'Sync status',
        body: language === 'vi' ? `${pending} thay đổi đang chờ xử lý.` : `${pending} changes are pending.`,
        status: pending ? 'pending' : 'completed', tone: pending ? 'warning' : 'success', createdAt: Date.now(),
      }, { replace: true }));
    };
    const onAutosave = (event) => {
      const detail = event?.detail || {};
      setVersions(listVersions(currentUser, routeKey(route, selectedTool)));
      setActivityState(recordActivity(currentUser, {
        id: `autosave-${detail.key || routeKey(route, selectedTool)}`,
        category: 'history', icon: 'SV', source: 'autosave', status: detail.status || '',
        title: language === 'vi' ? 'Bản nháp đã được cập nhật' : 'Draft updated',
        body: detail.status === 'error'
          ? (language === 'vi' ? 'Không thể lưu bản nháp cục bộ.' : 'Local draft save failed.')
          : (language === 'vi' ? `${detail.versionCount || 0} phiên bản hiện có.` : `${detail.versionCount || 0} versions available.`),
        target: window.location.hash, tone: detail.status === 'error' ? 'danger' : 'success', createdAt: detail.savedAt || Date.now(),
      }, { replace: true }));
    };
    const onWorkspace = (event) => setWorkspaceMemory(event?.detail || loadWorkspaceMemory(currentUser));
    const onNotification = (event) => {
      const detail = event?.detail || {};
      setActivityState(recordActivity(currentUser, {
        id: String(detail.id || `notification-${Date.now()}`), category: 'notification', icon: 'NT', source: 'automation',
        title: detail.title || (language === 'vi' ? 'Thông báo hệ thống' : 'System notification'),
        body: detail.message || detail.body || '', target: toTarget(detail.route || detail.target), createdAt: Date.parse(detail.created_at || '') || Date.now(),
      }));
    };
    const onAutomation = (event) => {
      const detail = event?.detail || {};
      if (!String(detail.type || '').includes('run')) return;
      const run = detail.run || {};
      setActivityState(recordActivity(currentUser, {
        id: `automation-${run.id || Date.now()}`, category: 'system', icon: 'AU', source: 'automation',
        title: run.rule_name || (language === 'vi' ? 'Tự động hóa đã chạy' : 'Automation ran'),
        body: run.error_message || run.status || '', status: run.status || '', tone: run.status === 'failed' ? 'danger' : 'success',
        target: '#/automation-center', createdAt: Date.parse(run.created_at || '') || Date.now(),
      }));
    };
    const onAiStart = (event) => {
      setAiActive(true);
      const detail = event?.detail || {};
      setActivityState(recordActivity(currentUser, {
        id: `ai-${detail.id || 'current'}`, category: 'ai', icon: 'AI', source: detail.provider || 'brian-ai', status: 'running',
        title: detail.label || (language === 'vi' ? 'Brian AI đang xử lý' : 'Brian AI is working'),
        body: detail.provider || '', tone: 'info', createdAt: Date.now(),
      }, { replace: true }));
    };
    const onAiEnd = (event) => {
      setAiActive(false);
      const detail = event?.detail || {};
      setActivityState(recordActivity(currentUser, {
        id: `ai-${detail.id || 'current'}`, category: 'ai', icon: 'AI', source: detail.provider || 'brian-ai', status: detail.error ? 'error' : 'completed',
        title: detail.error
          ? (language === 'vi' ? 'Tác vụ AI gặp lỗi' : 'AI task failed')
          : (language === 'vi' ? 'Tác vụ AI đã hoàn tất' : 'AI task completed'),
        body: detail.error || detail.label || '', tone: detail.error ? 'danger' : 'success', createdAt: Date.now(),
      }, { replace: true }));
    };

    window.addEventListener(WORK_HUB_DELIVERY_EVENT, onWork);
    window.addEventListener(SYNC_QUEUE_EVENT, onSync);
    window.addEventListener(AUTOSAVE_EVENT, onAutosave);
    window.addEventListener(WORKSPACE_MEMORY_EVENT, onWorkspace);
    window.addEventListener('bes-global-notification', onNotification);
    window.addEventListener(AUTOMATION_UPDATED, onAutomation);
    window.addEventListener('bes-ai-operation-start', onAiStart);
    window.addEventListener('bes-ai-operation-end', onAiEnd);
    const unsubscribe = currentUser?.id ? subscribeWorkHubNotifications(currentUser.id, refreshWork) : () => {};
    return () => {
      window.removeEventListener(WORK_HUB_DELIVERY_EVENT, onWork);
      window.removeEventListener(SYNC_QUEUE_EVENT, onSync);
      window.removeEventListener(AUTOSAVE_EVENT, onAutosave);
      window.removeEventListener(WORKSPACE_MEMORY_EVENT, onWorkspace);
      window.removeEventListener('bes-global-notification', onNotification);
      window.removeEventListener(AUTOMATION_UPDATED, onAutomation);
      window.removeEventListener('bes-ai-operation-start', onAiStart);
      window.removeEventListener('bes-ai-operation-end', onAiEnd);
      unsubscribe();
    };
  }, [currentUser?.id, currentUser?.email, route, selectedTool?.slug, language]);

  const localNotifications = useMemo(() => activityState.items.filter((item) => item.category === 'notification'), [activityState.items]);
  const workActivities = useMemo(() => activityState.items.filter((item) => item.category === 'work'), [activityState.items]);
  const aiActivities = useMemo(() => activityState.items.filter((item) => item.category === 'ai'), [activityState.items]);
  const pendingSync = useMemo(() => syncItems.filter((item) => item.status !== 'completed'), [syncItems]);
  const unreadLocal = useMemo(() => activityState.items.filter((item) => !item.read).length, [activityState.items]);
  const badgeCount = workNotifications.length + pendingSync.length + unreadLocal;
  const currentVersions = versions.slice(0, 12);
  const recentWorkspace = workspaceMemory.recent?.slice(0, 18) || [];

  const openTarget = (target, label = 'GO') => {
    const resolved = toTarget(target);
    if (!resolved) return;
    setOpen(false);
    launchRoute({ target: resolved, label: String(label).slice(0, 2).toUpperCase(), color: 'var(--ui-color-primary)' });
  };

  const tabs = [
    ['overview', copy.overview, unreadLocal],
    ['notifications', copy.notifications, workNotifications.length + localNotifications.filter((item) => !item.read).length],
    ['work', copy.work, workNotifications.length],
    ['sync', copy.sync, pendingSync.length],
    ['history', copy.history, recentWorkspace.length],
    ['ai', copy.ai, aiActive ? 1 : aiActivities.length],
  ];

  const renderActivityItems = (items, emptyTab) => items.length ? (
    <div className="bui-activity-list">
      {items.map((item) => (
        <article key={item.id} className={`bui-activity-item is-${item.tone || 'info'}${item.read ? ' is-read' : ''}`}>
          <span className="bui-activity-item__icon" aria-hidden="true">{item.icon || '•'}</span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.body || copy.noBody}</p>
            <small>{formatTime(item.createdAt, language)}{item.source ? ` · ${item.source}` : ''}</small>
          </div>
          <div className="bui-activity-item__actions">
            {item.target ? <button type="button" onClick={() => openTarget(item.target, item.icon)}>{copy.open}</button> : null}
            {!item.read ? <button type="button" onClick={() => setActivityState(markActivityRead(currentUser, item.id))}>✓</button> : null}
          </div>
        </article>
      ))}
    </div>
  ) : <ActivityEmpty language={language} tab={emptyTab} />;

  return (
    <>
      {!externalTrigger ? (
        <button
          type="button"
          className={`bui-activity-trigger${badgeCount ? ' has-activity' : ''}`}
          onClick={() => { setActiveTab('overview'); setOpen(true); }}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={copy.title}
        >
          <span aria-hidden="true">◎</span>
          <b>{copy.trigger}</b>
          {badgeCount ? <em>{Math.min(99, badgeCount)}</em> : null}
        </button>
      ) : null}

      <UIOverlayPortal open={open} placement="drawer-right" onDismiss={() => setOpen(false)} className="bui-activity-layer">
        <UIOverlaySurface as="aside" variant="drawer" className="bui-activity-center" role="dialog" aria-modal="true" aria-labelledby="bui-activity-title">
          <UIOverlayHeader className="bui-activity-header">
            <div><span>BRIAN ACTIVITY CORE</span><h2 id="bui-activity-title">{copy.title}</h2><p>{copy.subtitle}</p></div>
            <UIOverlayClose onClick={() => setOpen(false)} label={copy.close} />
          </UIOverlayHeader>

          <nav className="bui-activity-tabs" aria-label={copy.title}>
            {tabs.map(([id, label, count]) => (
              <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
                <span>{label}</span>{count ? <b>{Math.min(99, count)}</b> : null}
              </button>
            ))}
          </nav>

          <div className="bui-activity-scroll">
            {activeTab === 'overview' ? (
              <>
                <section className="bui-activity-summary">
                  {tabs.slice(1).map(([id, label, count]) => (
                    <button key={id} type="button" onClick={() => setActiveTab(id)}><strong>{count}</strong><span>{label}</span></button>
                  ))}
                </section>
                <section className="bui-activity-section">
                  <header><div><small>LIVE FEED</small><h3>{language === 'vi' ? 'Hoạt động gần nhất' : 'Latest activity'}</h3></div></header>
                  {renderActivityItems(activityState.items.slice(0, 12), 'overview')}
                </section>
              </>
            ) : null}

            {activeTab === 'notifications' ? (
              <section className="bui-activity-section">
                <header>
                  <div><small>NOTIFICATIONS</small><h3>{copy.notifications}</h3></div>
                  <div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('bes-global-notice-open'))}>{copy.openDetailed}</button><button type="button" onClick={() => setActivityState(markAllActivitiesRead(currentUser, 'notification'))}>{copy.markAll}</button></div>
                </header>
                {renderActivityItems(localNotifications, 'notifications')}
              </section>
            ) : null}

            {activeTab === 'work' ? (
              <section className="bui-activity-section">
                <header><div><small>WORK HUB</small><h3>{copy.work}</h3></div><button type="button" onClick={() => openTarget('#/work-hub', 'WH')}>{copy.openWork}</button></header>
                {loadingWork ? <div className="bui-activity-loading">…</div> : workNotifications.length ? (
                  <div className="bui-activity-list">
                    {workNotifications.map((item) => (
                      <article key={item.id} className="bui-activity-item is-warning">
                        <span className="bui-activity-item__icon" aria-hidden="true">WK</span>
                        <div><strong>{item.title || copy.work}</strong><p>{item.body || copy.noBody}</p><small>{formatTime(item.created_at, language)} · {item.notification_type || 'work'}</small></div>
                        <div className="bui-activity-item__actions">
                          <button type="button" onClick={() => { rememberWorkHubItem(item.item_id); openTarget('#/work-hub', 'WH'); }}>{copy.open}</button>
                          <button type="button" onClick={async () => { await markWorkHubNotificationRead(item.id); refreshWork(); }}>✓</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : renderActivityItems(workActivities, 'work')}
                {workNotifications.length ? <footer className="bui-activity-section__footer"><button type="button" onClick={async () => { await markAllWorkHubNotificationsRead(currentUser.id); refreshWork(); }}>{copy.markAll}</button></footer> : null}
              </section>
            ) : null}

            {activeTab === 'sync' ? (
              <section className="bui-activity-section">
                <header><div><small>SYNC QUEUE</small><h3>{copy.sync}</h3></div><button type="button" onClick={() => setSyncItems(clearCompletedSyncItems(currentUser))}>{copy.clearDone}</button></header>
                {syncItems.length ? (
                  <div className="bui-activity-list">
                    {syncItems.map((item) => (
                      <article key={item.id} className={`bui-activity-item is-${item.status === 'failed' ? 'danger' : item.status === 'completed' ? 'success' : 'warning'}`}>
                        <span className="bui-activity-item__icon" aria-hidden="true">{item.status === 'completed' ? '✓' : item.status === 'failed' ? '!' : '↻'}</span>
                        <div><strong>{item.label}</strong><p>{item.type}</p><small>{formatTime(item.createdAt, language)} · {item.status}</small></div>
                        <div className="bui-activity-item__actions"><button type="button" onClick={() => setSyncItems(removeSyncItem(currentUser, item.id))}>×</button></div>
                      </article>
                    ))}
                  </div>
                ) : <ActivityEmpty language={language} tab="sync" />}
              </section>
            ) : null}

            {activeTab === 'history' ? (
              <>
                <section className="bui-activity-section">
                  <header><div><small>WORKSPACE MEMORY</small><h3>{copy.workspaceHistory}</h3></div></header>
                  {recentWorkspace.length ? (
                    <div className="bui-activity-list">
                      {recentWorkspace.map((item) => (
                        <article key={`${item.target}-${item.lastVisitedAt}`} className="bui-activity-item is-info">
                          <span className="bui-activity-item__icon" style={{ background: item.accent }} aria-hidden="true">{item.icon}</span>
                          <div><strong>{language === 'vi' ? item.titleVi : item.title}</strong><p>{item.target}</p><small>{formatTime(item.lastVisitedAt, language)}</small></div>
                          <div className="bui-activity-item__actions"><button type="button" onClick={() => openTarget(item.target, item.icon)}>{copy.open}</button></div>
                        </article>
                      ))}
                    </div>
                  ) : <ActivityEmpty language={language} tab="history" />}
                </section>
                <section className="bui-activity-section">
                  <header><div><small>VERSION HISTORY</small><h3>{copy.currentDraft}</h3></div></header>
                  {currentVersions.length ? (
                    <div className="bui-activity-version-grid">
                      {currentVersions.map((item, index) => <article key={item.id}><b>v{versions.length - index}</b><div><strong>{formatTime(item.savedAt, language)}</strong><small>{item.fieldCount} fields · {item.reason}</small></div></article>)}
                    </div>
                  ) : <ActivityEmpty language={language} tab="history" />}
                </section>
              </>
            ) : null}

            {activeTab === 'ai' ? (
              <section className="bui-activity-section">
                <header><div><small>BRIAN AI</small><h3>{copy.ai}</h3></div><button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('bes-ai-open')); }}>{copy.openAi}</button></header>
                {aiActive ? <div className="bui-ai-live"><span aria-hidden="true">AI</span><div><strong>{language === 'vi' ? 'AI đang xử lý' : 'AI is working'}</strong><small>{copy.running}</small></div></div> : null}
                {renderActivityItems(aiActivities, 'ai')}
              </section>
            ) : null}
          </div>

          <footer className="bui-activity-footer">
            <span>{activityState.items.length} {copy.recent}</span>
            <button type="button" onClick={() => setActivityState(clearActivityState(currentUser))}>{copy.clear}</button>
          </footer>
        </UIOverlaySurface>
      </UIOverlayPortal>
    </>
  );
}
