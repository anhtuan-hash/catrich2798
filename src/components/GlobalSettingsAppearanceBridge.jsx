import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalSettingsAppearanceBridge.css';

const AdminPage = lazy(() => import('../pages/AdminPage.jsx'));

const HOST_ID = 'settings-admin-merge-host';
const NAV_SLOT_ID = 'settings-admin-merge-nav';
const HIDDEN_NAV_ATTR = 'data-admin-merged-hidden';

function isAdminUser(user) {
  return String(user?.role || '').trim().toLowerCase() === 'admin';
}

function normalizeText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function hideStandaloneAdminNavigation() {
  const hidden = [];
  document.querySelectorAll('.brian-nav__primary button').forEach((button) => {
    const text = normalizeText(button);
    if (text === 'quản trị' || text === 'admin') {
      button.setAttribute(HIDDEN_NAV_ATTR, 'true');
      button.hidden = true;
      hidden.push(button);
    }
  });
  return hidden;
}

function restoreStandaloneAdminNavigation(nodes) {
  nodes.forEach((button) => {
    if (!button?.isConnected) return;
    button.hidden = false;
    button.removeAttribute(HIDDEN_NAV_ATTR);
  });
}

function scrollToSelector(selector) {
  const target = selector === `#${HOST_ID}`
    ? document.getElementById(HOST_ID)
    : document.querySelector(selector);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function GlobalSettingsAppearanceBridge(props) {
  const admin = isAdminUser(props.currentUser);
  const [portalTargets, setPortalTargets] = useState({ host: null, nav: null });

  const adminItems = useMemo(() => [
    { id: 'overview', label: props.language === 'vi' ? 'Quản trị hệ thống' : 'System administration', target: `#${HOST_ID}` },
    { id: 'requests', label: props.language === 'vi' ? 'Yêu cầu truy cập' : 'Access requests', target: '#admin-v41-requests' },
    { id: 'permissions', label: props.language === 'vi' ? 'Phân quyền' : 'Permissions', target: '#admin-v41-permissions' },
    { id: 'accounts', label: props.language === 'vi' ? 'Tài khoản hệ thống' : 'System accounts', target: '#admin-v41-accounts' },
    { id: 'security', label: props.language === 'vi' ? 'Nhật ký & bảo mật' : 'Logs & security', target: '#admin-v41-security' },
  ], [props.language]);

  useEffect(() => {
    const hiddenButtons = [];
    let timer = 0;
    let attempts = 0;
    let host = null;
    let navSlot = null;
    let cancelled = false;

    const hideAdminButton = () => {
      hideStandaloneAdminNavigation().forEach((button) => {
        if (!hiddenButtons.includes(button)) hiddenButtons.push(button);
      });
    };

    // The standalone Admin route remains a compatibility alias only. Admins are
    // sent to the unified System Settings center instead of a second console.
    if (props.route === 'admin' && admin) {
      hideAdminButton();
      timer = window.setTimeout(() => {
        if (!cancelled) window.location.hash = '#/settings?section=admin';
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        restoreStandaloneAdminNavigation(hiddenButtons);
      };
    }

    const mount = () => {
      if (cancelled) return true;
      hideAdminButton();

      if (props.route !== 'settings' || !admin) {
        setPortalTargets({ host: null, nav: null });
        return true;
      }

      const settingsMain = document.querySelector('.settings-google-main');
      const settingsNav = document.querySelector('.settings-google-sidebar nav');
      if (!settingsMain || !settingsNav) return false;

      host = document.getElementById(HOST_ID);
      if (!host) {
        host = document.createElement('section');
        host.id = HOST_ID;
        host.className = 'settings-admin-merge-host';
        host.setAttribute('aria-label', props.language === 'vi' ? 'Quản trị hệ thống' : 'System administration');
        const footer = settingsMain.querySelector('.settings-google-footer');
        settingsMain.insertBefore(host, footer || null);
      }

      navSlot = document.getElementById(NAV_SLOT_ID);
      if (!navSlot) {
        navSlot = document.createElement('div');
        navSlot.id = NAV_SLOT_ID;
        navSlot.className = 'settings-admin-merge-nav';
        settingsNav.appendChild(navSlot);
      }

      setPortalTargets({ host, nav: navSlot });

      if (window.location.hash.includes('section=admin')) {
        window.requestAnimationFrame(() => host?.scrollIntoView({ behavior: 'auto', block: 'start' }));
      }
      return true;
    };

    const tryMount = () => {
      if (mount()) return;
      attempts += 1;
      if (attempts < 32) timer = window.setTimeout(tryMount, 75);
    };

    tryMount();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setPortalTargets({ host: null, nav: null });
      navSlot?.remove();
      host?.remove();
      restoreStandaloneAdminNavigation(hiddenButtons);
    };
  }, [props.route, props.language, admin]);

  if (!admin || props.route !== 'settings' || !portalTargets.host || !portalTargets.nav) return null;

  return (
    <>
      {createPortal(
        <>
          <div className="settings-admin-merge-label">{props.language === 'vi' ? 'QUẢN TRỊ' : 'ADMIN'}</div>
          {adminItems.map((item) => (
            <button key={item.id} type="button" className="settings-admin-merge-nav-button" onClick={() => scrollToSelector(item.target)}>
              <span aria-hidden="true">{item.id === 'overview' ? '⚙' : item.id === 'requests' ? '◎' : item.id === 'permissions' ? '◈' : item.id === 'accounts' ? '👤' : '◔'}</span>
              <div><strong>{item.label}</strong></div>
            </button>
          ))}
        </>,
        portalTargets.nav,
      )}

      {createPortal(
        <>
          <div className="settings-admin-merge-heading">
            <span>{props.language === 'vi' ? 'ADMIN CENTER' : 'ADMIN CENTER'}</span>
            <div>
              <h2>{props.language === 'vi' ? 'Quản trị hệ thống' : 'System administration'}</h2>
              <p>{props.language === 'vi'
                ? 'Duyệt yêu cầu, phân quyền và quản lý tài khoản ngay trong Cài đặt hệ thống.'
                : 'Review requests, manage permissions and maintain system accounts inside System Settings.'}</p>
            </div>
          </div>
          <Suspense fallback={<div className="settings-admin-merge-loading">{props.language === 'vi' ? 'Đang tải công cụ quản trị…' : 'Loading administration tools…'}</div>}>
            <AdminPage language={props.language} currentUser={props.currentUser} />
          </Suspense>
        </>,
        portalTargets.host,
      )}
    </>
  );
}
