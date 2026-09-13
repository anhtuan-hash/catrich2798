import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { hasAnyAttendanceAccess, hasRouteAccess } from '../../utils/permissions.js';
import { isAdminRole } from '../../utils/roles.js';
import { isAppHiddenForUser } from '../../utils/appVisibility.js';
import { visibilityIdForRoute } from '../../data/appVisibilityRegistry.js';
import { buildMobileNavigationModel, runMobileNavigationItem } from './mobileNavigation.js';
import MobileTopBar from './MobileTopBar.jsx';
import MobileBottomNavigation from './MobileBottomNavigation.jsx';
import MobileMoreSheet from './MobileMoreSheet.jsx';
import '../../styles/mobile/mobile-tokens.css';
import '../../styles/mobile/mobile-shell.css';

const ROUTE_TITLES = {
  home: ['Trang chủ', 'Home'], apps: ['Ứng dụng', 'Apps'], news: ['Đọc báo', 'Newsroom'], games: ['Trò chơi', 'Games'], tools: ['Công cụ', 'Tools'],
  homeroom: ['Giáo viên chủ nhiệm', 'Homeroom'], resources: ['Tài nguyên', 'Resources'], library: ['Thư viện', 'Library'],
  'resource-library': ['Kho học liệu', 'Resource Library'], 'knowledge-hub': ['Kho học liệu thông minh', 'Smart Knowledge'],
  dashboard: ['Bảng điều hành', 'Dashboard'], 'work-hub': ['Trung tâm công việc', 'Work Hub'], 'assessment-core': ['Ngân hàng câu hỏi', 'Assessment Core'],
  'platform-readiness': ['Sẵn sàng nền tảng', 'Platform Readiness'], 'automation-center': ['Tự động hóa', 'Automation Center'],
  'cloud-operations': ['Vận hành nền', 'Cloud Operations'], 'collaboration-hub': ['Cộng tác', 'Collaboration Hub'],
  'data-governance': ['Quản trị dữ liệu', 'Data Governance'], 'production-hardening': ['Sẵn sàng Production', 'Production Hardening'],
  practice: ['Bài tập', 'Practice'], qa: ['Trạng thái hệ thống', 'System Health'], trash: ['Thùng rác', 'Trash'],
  contact: ['Liên hệ', 'Contact'], settings: ['Cài đặt', 'Settings'], admin: ['Quản trị', 'Admin'], login: ['Đăng nhập', 'Sign in'], register: ['Đăng ký', 'Register'],
};

function notificationStorageKey(currentUser) {
  return `bes-global-notifications:${currentUser?.id || currentUser?.email || 'guest'}`;
}

function readStoredNotifications(currentUser) {
  if (typeof window === 'undefined') return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(notificationStorageKey(currentUser)) || '[]');
    return (Array.isArray(rows) ? rows : [])
      .filter((item) => !item?.dismissed && !item?.archived)
      .sort((a, b) => new Date(b?.createdAt || b?.created_at || 0).getTime() - new Date(a?.createdAt || a?.created_at || 0).getTime())
      .slice(0, 30);
  } catch {
    return [];
  }
}

function MobileNotificationSheet({ open, currentUser, language, onClose }) {
  const [items, setItems] = useState(() => readStoredNotifications(currentUser));

  useEffect(() => {
    if (!open) return undefined;
    const refresh = () => setItems(readStoredNotifications(currentUser));
    refresh();
    window.addEventListener('bes-global-notification', refresh);
    window.addEventListener('bes:notification', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bes-global-notification', refresh);
      window.removeEventListener('bes:notification', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [open, currentUser?.id, currentUser?.email]);

  if (!open) return null;
  const vi = language !== 'en';

  return (
    <div className="bes-mobile-sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className="bes-mobile-sheet bes-mobile-notifications" role="dialog" aria-modal="true" aria-label={vi ? 'Thông báo' : 'Notifications'}>
        <div className="bes-mobile-sheet__handle" aria-hidden="true" />
        <header className="bes-mobile-sheet__head">
          <div><small>BRIAN ENGLISH</small><h2>{vi ? 'Thông báo' : 'Notifications'}</h2></div>
          <button type="button" className="bes-mobile-icon-button" onClick={onClose} aria-label={vi ? 'Đóng thông báo' : 'Close notifications'}><X size={22} /></button>
        </header>
        <div className="bes-mobile-notifications__list">
          {items.length ? items.map((item) => (
            <article key={item.id || `${item.title}-${item.createdAt}`} className={item.read ? '' : 'is-unread'}>
              <span className="bes-mobile-notifications__icon" aria-hidden="true"><Bell size={18} /></span>
              <div><strong>{item.title || 'Brian English'}</strong><p>{item.message || item.body || ''}</p></div>
            </article>
          )) : <div className="bes-mobile-empty-state">{vi ? 'Chưa có thông báo mới.' : 'No new notifications.'}</div>}
        </div>
      </section>
    </div>
  );
}

export default function MobileAppShell({
  route = 'home', selectedTool = null, language = 'vi', currentUser, onLogout, appVisibility,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => readStoredNotifications(currentUser));
  const snapshot = appVisibility?.snapshot || {};

  const canAccessRoute = useCallback((targetRoute) => {
    if (!hasRouteAccess(currentUser, targetRoute)) return false;
    const id = visibilityIdForRoute(targetRoute);
    return !isAppHiddenForUser(snapshot, currentUser, id);
  }, [currentUser, snapshot]);

  const canAccessAttendance = Boolean(currentUser?.id && (isAdminRole(currentUser?.role) || hasAnyAttendanceAccess(currentUser)));
  const navigation = useMemo(() => buildMobileNavigationModel({
    authenticated: Boolean(currentUser),
    currentRoute: route,
    language,
    canAccessRoute,
    canAccessAttendance,
  }), [currentUser, route, language, canAccessRoute, canAccessAttendance]);

  const titlePair = ROUTE_TITLES[route] || [selectedTool?.titleVi || selectedTool?.title || 'Brian English', selectedTool?.title || selectedTool?.titleVi || 'Brian English'];
  const title = language === 'en' ? titlePair[1] : titlePair[0];
  const hasUnread = notifications.some((item) => !item?.read);

  useEffect(() => {
    const refresh = () => setNotifications(readStoredNotifications(currentUser));
    refresh();
    window.addEventListener('bes-global-notification', refresh);
    window.addEventListener('bes:notification', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bes-global-notification', refresh);
      window.removeEventListener('bes:notification', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const openAttendance = () => {
      let attempts = 0;
      const clickBridge = () => {
        attempts += 1;
        const button = document.querySelector('.bes-mobile-bridge-host .brian-nav__attendance-tab, .brian-nav__attendance-tab');
        if (button) {
          if (button.getAttribute('aria-expanded') !== 'true') button.click();
          return;
        }
        if (attempts < 12) window.setTimeout(clickBridge, 50);
      };
      clickBridge();
    };
    const openNotifications = () => setNotificationsOpen(true);
    window.addEventListener('bes-attendance-open', openAttendance);
    window.addEventListener('bes-mobile-notifications-open', openNotifications);
    return () => {
      window.removeEventListener('bes-attendance-open', openAttendance);
      window.removeEventListener('bes-mobile-notifications-open', openNotifications);
    };
  }, []);

  const selectItem = (item) => {
    setMoreOpen(false);
    if (item?.id === 'notifications') setNotificationsOpen(true);
    else runMobileNavigationItem(item);
  };

  const accountItem = currentUser
    ? { id: 'account', label: language === 'en' ? 'Account' : 'Tài khoản', route: 'settings', action: 'route' }
    : { id: 'login', label: language === 'en' ? 'Sign in' : 'Đăng nhập', route: 'login', action: 'route' };

  return (
    <>
      <div className="bes-mobile-shell" data-bes-mobile-shell="true" data-route={route}>
        <MobileTopBar
          title={title}
          onMenu={() => setMoreOpen(true)}
          onSearch={() => runMobileNavigationItem({ action: 'search' })}
          onNotifications={() => setNotificationsOpen(true)}
          onAccount={() => selectItem(accountItem)}
          currentUser={currentUser}
          hasUnread={hasUnread}
        />
        <MobileBottomNavigation items={navigation.bottomItems} onSelect={selectItem} />
        <div className="brian-nav__primary bes-mobile-bridge-host" aria-hidden="true" />
      </div>

      <MobileMoreSheet
        open={moreOpen}
        groups={navigation.moreGroups}
        onClose={() => setMoreOpen(false)}
        onSelect={selectItem}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <MobileNotificationSheet open={notificationsOpen} currentUser={currentUser} language={language} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}
