import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import { hasAnyAttendanceAccess, hasRouteAccess } from '../../utils/permissions.js';
import { isAdminRole } from '../../utils/roles.js';
import { isAppHiddenForUser } from '../../utils/appVisibility.js';
import { visibilityIdForRoute } from '../../data/appVisibilityRegistry.js';
import { buildMobileNavigationModel, runMobileNavigationItem } from './mobileNavigation.js';
import MobileTopBar from './MobileTopBar.jsx';
import MobileBottomNavigation from './MobileBottomNavigation.jsx';
import MobileMoreSheet from './MobileMoreSheet.jsx';
import MobileAccountMenu from './MobileAccountMenu.jsx';
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

const ORIGINAL_BRIDGE_CLASSES = [
  ['dashboard', 'brian-nav__dashboard-tab'],
  ['homeroom', 'brian-nav__homeroom-tab'],
  ['gradebook', 'brian-nav__gradebook-tab'],
  ['reports', 'brian-nav__reports-tab'],
  ['ttcm', 'brian-nav__ttcm-tab'],
  ['attendance', 'brian-nav__attendance-tab'],
];

function originalBridgeKey(button, index = 0) {
  const explicit = String(button?.dataset?.navKey || '').trim();
  if (explicit) return explicit;
  const match = ORIGINAL_BRIDGE_CLASSES.find(([, className]) => button?.classList?.contains(className));
  return match?.[0] || `bridge-${index}`;
}

function originalBridgeLabel(button) {
  if (!button) return '';
  const clone = button.cloneNode(true);
  clone.querySelectorAll('svg, b, [aria-hidden="true"], .brian-nav__reports-countdown').forEach((node) => node.remove());
  return String(clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function readOriginalBridgeItems(host) {
  if (!host) return [];
  return Array.from(host.children)
    .filter((node) => node?.tagName === 'BUTTON')
    .map((button, index) => ({
      id: `original:${originalBridgeKey(button, index)}`,
      bridgeKey: originalBridgeKey(button, index),
      action: 'original-bridge',
      label: originalBridgeLabel(button),
      active: button.classList.contains('is-active') || button.getAttribute('aria-current') === 'page' || button.getAttribute('aria-expanded') === 'true',
    }))
    .filter((item) => item.label);
}

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
  const sheet = (
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

  return typeof document !== 'undefined' && document.body
    ? createPortal(sheet, document.body)
    : sheet;
}

export default function MobileAppShell({
  route = 'home', selectedTool = null, language = 'vi', currentUser, onLogout, appVisibility,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => readStoredNotifications(currentUser));
  const [originalBridgeItems, setOriginalBridgeItems] = useState([]);
  const snapshot = appVisibility?.snapshot || {};
  const isAdminNavigation = isAdminRole(currentUser?.role);

  const canAccessRoute = useCallback((targetRoute) => {
    if (!hasRouteAccess(currentUser, targetRoute)) return false;
    const id = visibilityIdForRoute(targetRoute);
    return !isAppHiddenForUser(snapshot, currentUser, id);
  }, [currentUser, snapshot]);

  const canAccessAttendance = Boolean(currentUser?.id && (isAdminNavigation || hasAnyAttendanceAccess(currentUser)));
  const canShowOriginalApps = Boolean(currentUser && (isAdminNavigation || hasRouteAccess(currentUser, 'apps')));
  const navigation = useMemo(() => buildMobileNavigationModel({
    authenticated: Boolean(currentUser),
    currentRoute: route,
    language,
    canAccessRoute,
    canAccessAttendance,
    isAdminNavigation,
    canShowOriginalApps,
  }), [currentUser, route, language, canAccessRoute, canAccessAttendance, isAdminNavigation, canShowOriginalApps]);

  const drawerItems = useMemo(
    () => [...navigation.drawerBaseItems, ...originalBridgeItems],
    [navigation.drawerBaseItems, originalBridgeItems],
  );

  const titlePair = ROUTE_TITLES[route] || [selectedTool?.titleVi || selectedTool?.title || 'Brian English', selectedTool?.title || selectedTool?.titleVi || 'Brian English'];
  const title = language === 'en' ? titlePair[1] : titlePair[0];
  const hasUnread = notifications.some((item) => !item?.read);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;

    const syncViewport = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const visualHeight = viewport?.height || window.innerHeight;
        const visualTop = viewport?.offsetTop || 0;
        const bottomOcclusion = Math.max(0, window.innerHeight - visualHeight - visualTop);
        root.style.setProperty('--bes-mobile-browser-bottom-inset', `${Math.round(bottomOcclusion)}px`);
        root.style.setProperty('--bes-mobile-visual-height', `${Math.round(visualHeight)}px`);
      });
    };

    syncViewport();
    viewport?.addEventListener?.('resize', syncViewport);
    viewport?.addEventListener?.('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);

    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener?.('resize', syncViewport);
      viewport?.removeEventListener?.('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      root.style.removeProperty('--bes-mobile-browser-bottom-inset');
      root.style.removeProperty('--bes-mobile-visual-height');
    };
  }, []);

  useEffect(() => {
    setAccountOpen(false);
  }, [route, currentUser?.id]);

  useEffect(() => {
    const host = document.querySelector('.bes-mobile-bridge-host');
    if (!host) return undefined;
    const sync = () => setOriginalBridgeItems(readOriginalBridgeItems(host));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-current', 'aria-expanded'] });
    return () => observer.disconnect();
  }, []);

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
    setAccountOpen(false);
    if (item?.id === 'notifications') {
      setNotificationsOpen(true);
      return;
    }
    if (item?.action === 'original-bridge') {
      const host = document.querySelector('.bes-mobile-bridge-host');
      const source = Array.from(host?.children || []).find((button, index) => originalBridgeKey(button, index) === item.bridgeKey);
      source?.click?.();
      return;
    }
    runMobileNavigationItem(item);
  };

  const accountItem = currentUser
    ? { id: 'account', label: language === 'en' ? 'Account' : 'Tài khoản', route: 'settings', action: 'route' }
    : { id: 'login', label: language === 'en' ? 'Sign in' : 'Đăng nhập', route: 'login', action: 'route' };

  const openAccountMenu = () => {
    if (!currentUser) {
      selectItem(accountItem);
      return;
    }
    setMoreOpen(false);
    setNotificationsOpen(false);
    setAccountOpen((open) => !open);
  };

  const openAccountRoute = () => {
    setAccountOpen(false);
    runMobileNavigationItem({ id: 'account', action: 'route', route: 'settings' });
  };

  const openSettingsRoute = () => {
    setAccountOpen(false);
    runMobileNavigationItem({ id: 'settings', action: 'route', route: 'settings' });
  };

  const openAccountNotifications = () => {
    setAccountOpen(false);
    setNotificationsOpen(true);
  };

  const openHelpRoute = () => {
    setAccountOpen(false);
    runMobileNavigationItem({ id: 'help', action: 'route', route: 'contact' });
  };

  const logoutFromAccountMenu = () => {
    setAccountOpen(false);
    onLogout?.();
  };

  return (
    <>
      <div className="bes-mobile-shell" data-bes-mobile-shell="true" data-route={route}>
        <MobileTopBar
          title={title}
          onMenu={() => { setAccountOpen(false); setMoreOpen(true); }}
          onSearch={() => runMobileNavigationItem({ action: 'search' })}
          onNotifications={() => { setAccountOpen(false); setNotificationsOpen(true); }}
          onAccount={openAccountMenu}
          accountOpen={accountOpen}
          currentUser={currentUser}
          hasUnread={hasUnread}
        />
        <MobileBottomNavigation items={navigation.bottomItems} onSelect={selectItem} />
        <div className="brian-nav__primary bes-mobile-bridge-host" hidden aria-hidden="true" />
      </div>

      <MobileMoreSheet
        open={moreOpen}
        items={drawerItems}
        onClose={() => setMoreOpen(false)}
        onSelect={selectItem}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <MobileAccountMenu
        open={accountOpen}
        currentUser={currentUser}
        onClose={() => setAccountOpen(false)}
        onProfile={openAccountRoute}
        onSettings={openSettingsRoute}
        onNotifications={openAccountNotifications}
        onHelp={openHelpRoute}
        onLogout={logoutFromAccountMenu}
      />
      <MobileNotificationSheet open={notificationsOpen} currentUser={currentUser} language={language} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}
