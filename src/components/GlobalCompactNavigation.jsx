import React, { useEffect, useMemo, useRef, useState } from 'react';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import {
  markAllWorkHubNotificationsRead,
  markWorkHubNotificationRead,
  rememberWorkHubItem,
} from '../utils/workHubDelivery.js';
import './GlobalCompactNavigation.css';

const copy = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', admin: 'Quản trị', search: 'Tìm ứng dụng, tài liệu…',
    theme: 'Đổi chế độ sáng tối', notifications: 'Thông báo', noNotifications: 'Chưa có thông báo mới.',
    noMatches: 'Không tìm thấy thông báo phù hợp.', markAll: 'Đánh dấu tất cả đã đọc', account: 'Tài khoản', guest: 'Khách',
    profile: 'Hồ sơ & cài đặt', manageApps: 'Quản lý ứng dụng', hiddenApps: 'Ứng dụng đã ẩn', display: 'Cỡ chữ',
    language: 'Ngôn ngữ', logout: 'Đăng xuất', chatbot: 'Chatbot', login: 'Đăng nhập', unread: 'chưa đọc',
    newCount: 'mới', all: 'Tất cả', unreadOnly: 'Chưa đọc', work: 'Công việc', system: 'Hệ thống',
    findNotifications: 'Tìm thông báo', importantOnly: 'Chỉ hiện thông báo quan trọng', settings: 'Cài đặt thông báo',
    viewAll: 'Xem tất cả', collapse: 'Thu gọn', sound: 'Âm thanh thông báo', workNotices: 'Thông báo công việc',
    systemNotices: 'Thông báo hệ thống', clearRead: 'Dọn thông báo đã đọc', back: 'Quay lại', open: 'Mở thông báo',
    star: 'Đánh dấu quan trọng', unstar: 'Bỏ đánh dấu quan trọng', archive: 'Lưu trữ', more: 'Tùy chọn khác',
    markUnread: 'Đánh dấu chưa đọc', markRead: 'Đánh dấu đã đọc', dismiss: 'Ẩn thông báo', newChip: 'Mới',
    urgentChip: 'Khẩn', replyChip: 'Cần phản hồi', reminderChip: 'Nhắc lịch', approvedChip: 'Đã duyệt',
  },
  en: {
    home: 'Home', apps: 'Apps', admin: 'Admin', search: 'Find apps and resources…',
    theme: 'Toggle color mode', notifications: 'Notifications', noNotifications: 'No new notifications.',
    noMatches: 'No matching notifications.', markAll: 'Mark all as read', account: 'Account', guest: 'Guest',
    profile: 'Profile & settings', manageApps: 'Manage apps', hiddenApps: 'Hidden apps', display: 'Text size',
    language: 'Language', logout: 'Log out', chatbot: 'Chatbot', login: 'Sign in', unread: 'unread',
    newCount: 'new', all: 'All', unreadOnly: 'Unread', work: 'Work', system: 'System',
    findNotifications: 'Search notifications', importantOnly: 'Show important notifications only', settings: 'Notification settings',
    viewAll: 'View all', collapse: 'Collapse', sound: 'Notification sound', workNotices: 'Work notifications',
    systemNotices: 'System notifications', clearRead: 'Clear read notifications', back: 'Back', open: 'Open notification',
    star: 'Mark important', unstar: 'Remove important mark', archive: 'Archive', more: 'More options',
    markUnread: 'Mark unread', markRead: 'Mark read', dismiss: 'Dismiss notification', newChip: 'New',
    urgentChip: 'Urgent', replyChip: 'Needs reply', reminderChip: 'Reminder', approvedChip: 'Approved',
  },
};

const FONT_SIZES = [100, 110, 120, 130];
const NOTIFICATION_EVENTS = ['bes-global-notification', 'bes:notification'];
const DEFAULT_NOTIFICATION_PREFERENCES = { sound: true, work: true, system: true };

function go(target, label, sourceEl) {
  launchRoute({
    target: target.startsWith('#/') ? target : `#/${target}`,
    label: String(label || 'GO').slice(0, 2).toUpperCase(),
    color: '#2f6b4f',
    sourceEl,
  });
}

function shortName(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (text.includes('@')) return text.split('@')[0];
  const parts = text.split(/\s+/);
  return parts[parts.length - 1] || fallback;
}

function initial(value) {
  return String(value || 'A').trim().slice(0, 1).toUpperCase() || 'A';
}

function storageKey(currentUser) {
  return `bes-global-notifications:${currentUser?.id || currentUser?.email || 'guest'}`;
}

function preferencesKey(currentUser) {
  return `bes-notification-center-preferences:${currentUser?.id || currentUser?.email || 'guest'}`;
}

function readNotifications(key) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 100) : [];
  } catch {
    return [];
  }
}

function writeNotifications(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value.slice(0, 100)));
  } catch {
    // Notifications remain available for the current session.
  }
}

function readPreferences(key) {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(window.localStorage.getItem(key) || '{}') };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

function writePreferences(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional preference */ }
}

function notificationCategory(detail = {}) {
  const explicit = String(detail.category || '').toLowerCase();
  if (explicit === 'work' || explicit === 'system') return explicit;
  const source = `${detail.source || ''} ${detail.target || ''} ${detail.href || ''}`.toLowerCase();
  return source.includes('work-hub') || source.includes('professional') || source.includes('department') ? 'work' : 'system';
}

function normalizeNotification(detail = {}) {
  return {
    id: String(detail.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(detail.title || detail.subject || 'Brian English'),
    message: String(detail.message || detail.body || detail.description || ''),
    target: String(detail.target || detail.href || ''),
    createdAt: detail.createdAt || detail.created_at || new Date().toISOString(),
    read: Boolean(detail.read),
    starred: Boolean(detail.starred),
    archived: Boolean(detail.archived),
    dismissed: Boolean(detail.dismissed),
    category: notificationCategory(detail),
    source: String(detail.source || ''),
    itemId: String(detail.itemId || detail.item_id || ''),
    notificationId: detail.notificationId ?? detail.notification_id ?? null,
    priority: String(detail.priority || '').toLowerCase(),
    status: String(detail.status || '').toLowerCase(),
    chip: String(detail.chip || ''),
  };
}

function timeLabel(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startToday - startDate) / 86400000);
  if (dayDiff === 0) {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  if (dayDiff === 1) return language === 'vi' ? 'Hôm qua' : 'Yesterday';
  if (dayDiff > 1 && dayDiff < 7) return language === 'vi' ? `${dayDiff} ngày trước` : `${dayDiff} days ago`;
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit' }).format(date);
}

function notificationVisual(item) {
  const text = `${item.title} ${item.message}`.toLowerCase();
  if (text.includes('lịch') || text.includes('họp') || text.includes('calendar') || text.includes('meeting')) return { type: 'calendar', tone: 'purple' };
  if (text.includes('phê duyệt') || text.includes('thư viện') || text.includes('tài liệu') || text.includes('approved') || text.includes('library')) return { type: 'document', tone: 'green' };
  if (item.status === 'changes_requested' || text.includes('phản hồi') || text.includes('reply')) return { type: 'reply', tone: 'orange' };
  if (item.category === 'work') return { type: 'work', tone: item.priority === 'urgent' ? 'red' : 'blue' };
  return { type: 'system', tone: 'slate' };
}

function notificationChip(item, t) {
  if (item.chip) return { label: item.chip, tone: 'blue' };
  if (item.priority === 'urgent') return { label: t.urgentChip, tone: 'red' };
  if (item.status === 'changes_requested') return { label: t.replyChip, tone: 'orange' };
  const text = `${item.title} ${item.message}`.toLowerCase();
  if (text.includes('lịch') || text.includes('họp') || text.includes('calendar') || text.includes('meeting')) return { label: t.reminderChip, tone: 'purple' };
  if (text.includes('phê duyệt') || text.includes('approved')) return { label: t.approvedChip, tone: 'green' };
  if (!item.read) return { label: t.newChip, tone: 'blue' };
  return null;
}

function playNotificationTone() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
    oscillator.addEventListener('ended', () => context.close().catch(() => {}));
  } catch {
    // Browsers may block audio until the user interacts with the page.
  }
}

function NotificationGlyph({ type }) {
  if (type === 'calendar') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v3M17 2v3M4.5 8.5h15M5 4.5h14a1 1 0 0 1 1 1V20H4V5.5a1 1 0 0 1 1-1Z" /></svg>;
  }
  if (type === 'document') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h5M10 13l2 2 4-4" /></svg>;
  }
  if (type === 'reply') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10M7 12h7M7 16h4M4 4h16v15H9l-5 3z" /></svg>;
  }
  if (type === 'work') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6V4h6v2M4 7h16v12H4zM4 11h16M10 11v2h4v-2" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5zM10 20h4" /></svg>;
}

function FilterIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16l-6 7v5l-4 2v-7z" /></svg>;
}

export default function GlobalCompactNavigation({
  route = 'home', language = 'vi', setLanguage, theme = 'light', setTheme,
  currentUser, onLogout, fontScale = 100, setFontScale,
}) {
  const t = copy[language] || copy.vi;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const rootRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState('all');
  const [notificationQuery, setNotificationQuery] = useState('');
  const [importantOnly, setImportantOnly] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [itemMenuId, setItemMenuId] = useState('');
  const key = useMemo(() => storageKey(currentUser), [currentUser?.id, currentUser?.email]);
  const prefsKey = useMemo(() => preferencesKey(currentUser), [currentUser?.id, currentUser?.email]);
  const [notifications, setNotifications] = useState(() => readNotifications(key));
  const [notificationPreferences, setNotificationPreferences] = useState(() => readPreferences(prefsKey));

  useEffect(() => {
    setNotifications(readNotifications(key));
    setNotificationPreferences(readPreferences(prefsKey));
  }, [key, prefsKey]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setAccountOpen(false);
        setNotificationOpen(false);
        setItemMenuId('');
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        if (itemMenuId) setItemMenuId('');
        else if (settingsOpen) setSettingsOpen(false);
        else {
          setAccountOpen(false);
          setNotificationOpen(false);
        }
      }
    };
    document.addEventListener('pointerdown', closeMenus);
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('hashchange', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('hashchange', closeOnEscape);
    };
  }, [itemMenuId, settingsOpen]);

  useEffect(() => {
    const receive = (event) => {
      const incoming = normalizeNotification(event.detail || {});
      setNotifications((current) => {
        const previous = current.find((item) => item.id === incoming.id);
        const merged = {
          ...previous,
          ...incoming,
          read: Boolean(incoming.read || previous?.read),
          starred: Boolean(previous?.starred || incoming.starred),
          archived: Boolean(previous?.archived || incoming.archived),
          dismissed: Boolean(previous?.dismissed || incoming.dismissed),
        };
        const next = [merged, ...current.filter((item) => item.id !== incoming.id)]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 100);
        writeNotifications(key, next);
        if (!previous && !incoming.read && notificationPreferences.sound) playNotificationTone();
        return next;
      });
    };
    const syncStorage = (event) => {
      if (event.key === key) setNotifications(readNotifications(key));
      if (event.key === prefsKey) setNotificationPreferences(readPreferences(prefsKey));
    };
    NOTIFICATION_EVENTS.forEach((name) => window.addEventListener(name, receive));
    window.addEventListener('storage', syncStorage);
    return () => {
      NOTIFICATION_EVENTS.forEach((name) => window.removeEventListener(name, receive));
      window.removeEventListener('storage', syncStorage);
    };
  }, [key, notificationPreferences.sound, prefsKey]);

  const accountName = shortName(currentUser?.name || currentUser?.email, currentUser ? t.account : t.guest);
  const visibleNotifications = useMemo(() => notifications.filter((item) => {
    if (item.archived || item.dismissed) return false;
    if (item.category === 'work' && !notificationPreferences.work) return false;
    if (item.category === 'system' && !notificationPreferences.system) return false;
    return true;
  }), [notificationPreferences.system, notificationPreferences.work, notifications]);
  const unreadCount = visibleNotifications.filter((item) => !item.read).length;
  const canShowApps = Boolean(currentUser && (isAdmin || hasRouteAccess(currentUser, 'apps')));

  const filteredNotifications = useMemo(() => {
    const needle = notificationQuery.trim().toLowerCase();
    return visibleNotifications.filter((item) => {
      if (notificationTab === 'unread' && item.read) return false;
      if (notificationTab === 'work' && item.category !== 'work') return false;
      if (notificationTab === 'system' && item.category !== 'system') return false;
      if (importantOnly && !item.starred && !['urgent', 'high'].includes(item.priority)) return false;
      if (needle && !`${item.title} ${item.message}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [importantOnly, notificationQuery, notificationTab, visibleNotifications]);

  const displayedNotifications = showAllNotifications ? filteredNotifications : filteredNotifications.slice(0, 6);

  const persistNotifications = (next) => {
    setNotifications(next);
    writeNotifications(key, next);
  };

  const updateNotification = (id, patch) => {
    const next = notifications.map((item) => item.id === id
      ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) }
      : item);
    persistNotifications(next);
  };

  const openRoute = (target, label, event) => {
    setAccountOpen(false);
    setNotificationOpen(false);
    setItemMenuId('');
    go(target, label, event?.currentTarget);
  };

  const markAllRead = () => {
    const next = notifications.map((item) => ({ ...item, read: true }));
    persistNotifications(next);
    if (currentUser?.id) markAllWorkHubNotificationsRead(currentUser.id).catch(() => {});
  };

  const markNotification = (item, read = true) => {
    updateNotification(item.id, { read });
    if (read && item.notificationId !== null && item.notificationId !== undefined) {
      markWorkHubNotificationRead(item.notificationId).catch(() => {});
    }
  };

  const openNotification = (item, event) => {
    markNotification(item, true);
    if (item.itemId) rememberWorkHubItem(item.itemId);
    if (item.target) openRoute(item.target, item.title, event);
  };

  const togglePreference = (name) => {
    const next = { ...notificationPreferences, [name]: !notificationPreferences[name] };
    setNotificationPreferences(next);
    writePreferences(prefsKey, next);
  };

  const clearReadNotifications = () => {
    const next = notifications.map((item) => item.read ? { ...item, dismissed: true } : item);
    persistNotifications(next);
  };

  const tabs = [
    ['all', t.all], ['unread', t.unreadOnly], ['work', t.work], ['system', t.system],
  ];

  return (
    <>
      <nav ref={rootRef} className="brian-nav" aria-label={language === 'vi' ? 'Điều hướng chính' : 'Main navigation'}>
        <button type="button" className="brian-nav__brand" onClick={(event) => openRoute('#/home', 'BE', event)}>
          <img src="/brian-english-brand-mark.png" alt="" aria-hidden="true" />
          <span>Brian English</span>
        </button>

        <div className="brian-nav__primary" aria-label={language === 'vi' ? 'Khu vực chính' : 'Primary areas'}>
          <button type="button" className={route === 'home' ? 'is-active' : ''} onClick={(event) => openRoute('#/home', t.home, event)}>{t.home}</button>
          {canShowApps ? <button type="button" className={route === 'apps' ? 'is-active' : ''} onClick={(event) => openRoute('#/apps', t.apps, event)}>{t.apps}</button> : null}
          {isAdmin ? <button type="button" className={route === 'admin' ? 'is-active' : ''} onClick={(event) => openRoute('#/admin', t.admin, event)}>{t.admin}</button> : null}
        </div>

        <button
          type="button"
          className="brian-nav__search"
          onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}
          aria-label={`${t.search} · Command K`}
        >
          <span aria-hidden="true">⌕</span>
          <b>{t.search}</b>
          <kbd>⌘K</kbd>
        </button>

        <div className="brian-nav__actions">
          <button type="button" className="brian-nav__icon" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')} aria-label={t.theme} title={t.theme}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>

          {currentUser ? (
            <div className="brian-nav__popover-wrap">
              <button
                type="button"
                className={`brian-nav__icon brian-nav__bell ${notificationOpen ? 'is-open' : ''}`}
                onClick={() => {
                  setNotificationOpen((value) => !value);
                  setAccountOpen(false);
                  setSettingsOpen(false);
                  setItemMenuId('');
                }}
                aria-label={`${t.notifications}${unreadCount ? `, ${unreadCount} ${t.unread}` : ''}`}
                aria-expanded={notificationOpen}
              >
                <span aria-hidden="true">♢</span>
                {unreadCount ? <em>{unreadCount > 9 ? '9+' : unreadCount}</em> : null}
              </button>

              {notificationOpen ? (
                <section className="brian-nav__popover brian-nav__notifications brian-notification-center" aria-label={t.notifications}>
                  <header className="brian-notification-center__header">
                    <div className="brian-notification-center__title">
                      <strong>{t.notifications}</strong>
                      {unreadCount ? <span>{unreadCount} {t.newCount}</span> : null}
                    </div>
                    <div className="brian-notification-center__header-actions">
                      <button type="button" className="brian-notification-center__mark-all" onClick={markAllRead} disabled={!unreadCount}>{t.markAll}</button>
                      <button type="button" className={`brian-notification-center__settings-button ${settingsOpen ? 'is-active' : ''}`} onClick={() => setSettingsOpen((value) => !value)} aria-label={t.settings} title={t.settings}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3.5 10 2h4l.5 1.5 1.6.7 1.4-.7 2.8 2.8-.7 1.4.7 1.6L22 10v4l-1.5.5-.7 1.6.7 1.4-2.8 2.8-1.4-.7-1.6.7L14 22h-4l-.5-1.5-1.6-.7-1.4.7-2.8-2.8.7-1.4-.7-1.6L2 14v-4l1.5-.5.7-1.6-.7-1.4 2.8-2.8 1.4.7zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /></svg>
                      </button>
                    </div>
                  </header>

                  {settingsOpen ? (
                    <div className="brian-notification-settings">
                      <div className="brian-notification-settings__heading">
                        <button type="button" onClick={() => setSettingsOpen(false)} aria-label={t.back}>←</button>
                        <div><strong>{t.settings}</strong><small>{language === 'vi' ? 'Chọn những cập nhật bạn muốn nhận.' : 'Choose the updates you want to receive.'}</small></div>
                      </div>
                      <label className="brian-notification-setting-row">
                        <span><b>{t.sound}</b><small>{language === 'vi' ? 'Phát âm thanh nhẹ khi có thông báo mới.' : 'Play a subtle sound for new notifications.'}</small></span>
                        <input type="checkbox" checked={notificationPreferences.sound} onChange={() => togglePreference('sound')} />
                        <i aria-hidden="true" />
                      </label>
                      <label className="brian-notification-setting-row">
                        <span><b>{t.workNotices}</b><small>{language === 'vi' ? 'Nhiệm vụ, hạn nộp và phản hồi từ tổ trưởng.' : 'Tasks, deadlines, and leader feedback.'}</small></span>
                        <input type="checkbox" checked={notificationPreferences.work} onChange={() => togglePreference('work')} />
                        <i aria-hidden="true" />
                      </label>
                      <label className="brian-notification-setting-row">
                        <span><b>{t.systemNotices}</b><small>{language === 'vi' ? 'Cập nhật tài khoản, ứng dụng và hệ thống.' : 'Account, app, and system updates.'}</small></span>
                        <input type="checkbox" checked={notificationPreferences.system} onChange={() => togglePreference('system')} />
                        <i aria-hidden="true" />
                      </label>
                      <button type="button" className="brian-notification-settings__clear" onClick={clearReadNotifications}>{t.clearRead}</button>
                    </div>
                  ) : (
                    <>
                      <div className="brian-notification-center__tabs" role="tablist" aria-label={t.notifications}>
                        {tabs.map(([id, label]) => (
                          <button type="button" role="tab" key={id} className={notificationTab === id ? 'is-active' : ''} aria-selected={notificationTab === id} onClick={() => setNotificationTab(id)}>{label}</button>
                        ))}
                      </div>

                      <div className="brian-notification-center__search-row">
                        <label className="brian-notification-center__search">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
                          <input value={notificationQuery} onChange={(event) => setNotificationQuery(event.target.value)} placeholder={t.findNotifications} />
                          {notificationQuery ? <button type="button" onClick={() => setNotificationQuery('')} aria-label={language === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}>×</button> : null}
                        </label>
                        <button type="button" className={`brian-notification-center__filter ${importantOnly ? 'is-active' : ''}`} onClick={() => setImportantOnly((value) => !value)} aria-pressed={importantOnly} aria-label={t.importantOnly} title={t.importantOnly}><FilterIcon /></button>
                      </div>

                      <div className="brian-nav__notification-list brian-notification-center__list">
                        {displayedNotifications.length ? displayedNotifications.map((item) => {
                          const visual = notificationVisual(item);
                          const chip = notificationChip(item, t);
                          return (
                            <article key={item.id} className={`brian-notification-card ${item.read ? '' : 'is-unread'}`}>
                              {!item.read ? <span className="brian-notification-card__unread-dot" aria-hidden="true" /> : null}
                              <span className={`brian-notification-card__icon is-${visual.tone}`}><NotificationGlyph type={visual.type} /></span>
                              <button type="button" className="brian-notification-card__main" onClick={(event) => openNotification(item, event)}>
                                <span className="brian-notification-card__copy">
                                  <b>{item.title}</b>
                                  {item.message ? <small>{item.message}</small> : null}
                                </span>
                                <span className="brian-notification-card__meta">
                                  <time>{timeLabel(item.createdAt, language)}</time>
                                  {chip ? <em className={`is-${chip.tone}`}>{chip.label}</em> : null}
                                </span>
                              </button>
                              <div className="brian-notification-card__actions">
                                <button type="button" className={item.starred ? 'is-active' : ''} onClick={(event) => { event.stopPropagation(); updateNotification(item.id, { starred: !item.starred }); }} aria-label={item.starred ? t.unstar : t.star} title={item.starred ? t.unstar : t.star}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" /></svg>
                                </button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); updateNotification(item.id, { archived: true }); }} aria-label={t.archive} title={t.archive}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v4H4zM6 9h12v11H6zM10 13h4" /></svg>
                                </button>
                                <button type="button" className={itemMenuId === item.id ? 'is-active' : ''} onClick={(event) => { event.stopPropagation(); setItemMenuId((value) => value === item.id ? '' : item.id); }} aria-label={t.more} title={t.more}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
                                </button>
                                {itemMenuId === item.id ? (
                                  <div className="brian-notification-card__menu" onClick={(event) => event.stopPropagation()}>
                                    <button type="button" onClick={(event) => { setItemMenuId(''); openNotification(item, event); }}>{t.open}</button>
                                    <button type="button" onClick={() => { markNotification(item, !item.read); setItemMenuId(''); }}>{item.read ? t.markUnread : t.markRead}</button>
                                    <button type="button" onClick={() => { updateNotification(item.id, { dismissed: true }); setItemMenuId(''); }}>{t.dismiss}</button>
                                  </div>
                                ) : null}
                              </div>
                            </article>
                          );
                        }) : <p className="brian-nav__empty">{notificationQuery || notificationTab !== 'all' || importantOnly ? t.noMatches : t.noNotifications}</p>}
                      </div>

                      <footer className="brian-notification-center__footer">
                        <button type="button" className="brian-notification-center__footer-settings" onClick={() => setSettingsOpen(true)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5zM10 20h4" /></svg>
                          {t.settings}
                        </button>
                        {filteredNotifications.length > 6 ? (
                          <button type="button" className="brian-notification-center__view-all" onClick={() => setShowAllNotifications((value) => !value)}>
                            {showAllNotifications ? t.collapse : t.viewAll}<span aria-hidden="true">→</span>
                          </button>
                        ) : null}
                      </footer>
                    </>
                  )}
                </section>
              ) : null}
            </div>
          ) : null}

          {currentUser ? (
            <div className="brian-nav__popover-wrap">
              <button
                type="button"
                className={`brian-nav__account ${accountOpen ? 'is-open' : ''}`}
                onClick={() => { setAccountOpen((value) => !value); setNotificationOpen(false); }}
                aria-expanded={accountOpen}
              >
                <span>{initial(currentUser?.name || currentUser?.email)}</span>
                <strong>{accountName}</strong>
                <i aria-hidden="true">⌄</i>
              </button>
              {accountOpen ? (
                <section className="brian-nav__popover brian-nav__account-menu" aria-label={t.account}>
                  <header><span>{initial(currentUser?.name || currentUser?.email)}</span><div><strong>{currentUser?.name || accountName}</strong><small>{currentUser?.email || ''}</small></div></header>
                  <button type="button" onClick={(event) => openRoute('#/settings', t.profile, event)}><span aria-hidden="true">◎</span>{t.profile}</button>
                  <button type="button" onClick={(event) => openRoute('#/apps', t.manageApps, event)}><span aria-hidden="true">▦</span>{t.manageApps}</button>
                  {isAdmin ? <button type="button" onClick={(event) => openRoute('#/app-vault', t.hiddenApps, event)}><span aria-hidden="true">HV</span>{t.hiddenApps}</button> : null}

                  <div className="brian-nav__menu-section">
                    <small>{t.display}</small>
                    <div className="brian-nav__font-options">
                      {FONT_SIZES.map((size) => <button type="button" key={size} className={Number(fontScale) === size ? 'is-selected' : ''} onClick={() => setFontScale?.(size)}>{size}%</button>)}
                    </div>
                  </div>

                  <button type="button" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}><span aria-hidden="true">文</span>{t.language}<b>{language === 'vi' ? 'VI' : 'EN'}</b></button>
                  <div className="brian-nav__menu-divider" />
                  <button type="button" className="is-logout" onClick={onLogout}><span aria-hidden="true">↗</span>{t.logout}</button>
                </section>
              ) : null}
            </div>
          ) : (
            <button type="button" className="brian-nav__login" onClick={(event) => openRoute('#/login', t.login, event)}>{t.login}</button>
          )}
        </div>
      </nav>

      {currentUser ? (
        <button
          type="button"
          className="brian-chatbot-fab"
          onClick={() => window.dispatchEvent(new CustomEvent('bes-chatbot-drawer-open'))}
          aria-label={t.chatbot}
          title={t.chatbot}
        >
          <span aria-hidden="true">✦</span><b>{t.chatbot}</b>
        </button>
      ) : null}
    </>
  );
}
