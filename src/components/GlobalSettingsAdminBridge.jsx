import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalSettingsAppearanceBridge.css';

const AdminPage = lazy(() => import('../pages/AdminPage.jsx'));

const ADMIN_HOST_ID = 'settings-admin-merge-host';
const ADMIN_NAV_SLOT_ID = 'settings-admin-merge-nav';
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
  document.querySelector(selector)?.scrollIntoView({ block: 'start' });
}

export default function GlobalSettingsAdminBridge(props) {
  const admin = isAdminUser(props.currentUser);
  const vi = props.language === 'vi';
  const [portalTargets, setPortalTargets] = useState({ adminHost: null, adminNav: null });

  const adminItems = useMemo(() => [
    { id: 'overview', label: vi ? 'Quản trị hệ thống' : 'System administration', target: `#${ADMIN_HOST_ID}` },
    { id: 'requests', label: vi ? 'Yêu cầu truy cập' : 'Access requests', target: '.permission-request-admin-panel' },
    { id: 'accounts', label: vi ? 'Tài khoản & phân quyền' : 'Accounts & permissions', target: '.permission-admin-grid' },
    { id: 'security', label: vi ? 'Đồng bộ & bảo mật' : 'Sync & security', target: '.admin-sync-panel' },
  ], [vi]);

  useEffect(() => {
    const hiddenButtons = [];
    let timer = 0;
    let attempts = 0;
    let adminHost = null;
    let adminNavSlot = null;
    let cancelled = false;

    const hideAdminButton = () => {
      hideStandaloneAdminNavigation().forEach((button) => {
        if (!hiddenButtons.includes(button)) hiddenButtons.push(button);
      });
    };

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
      if (admin) hideAdminButton();

      if (props.route !== 'settings' || !admin) {
        setPortalTargets({ adminHost: null, adminNav: null });
        return true;
      }

      const settingsMain = document.querySelector('.settings-google-main');
      const settingsNav = document.querySelector('.settings-google-sidebar nav');
      if (!settingsMain || !settingsNav) return false;

      const footer = settingsMain.querySelector('.settings-google-footer');

      adminHost = document.getElementById(ADMIN_HOST_ID);
      if (!adminHost) {
        adminHost = document.createElement('section');
        adminHost.id = ADMIN_HOST_ID;
        adminHost.className = 'settings-admin-merge-host';
        adminHost.setAttribute('aria-label', vi ? 'Quản trị hệ thống' : 'System administration');
        settingsMain.insertBefore(adminHost, footer || null);
      }

      adminNavSlot = document.getElementById(ADMIN_NAV_SLOT_ID);
      if (!adminNavSlot) {
        adminNavSlot = document.createElement('div');
        adminNavSlot.id = ADMIN_NAV_SLOT_ID;
        adminNavSlot.className = 'settings-admin-merge-nav';
        settingsNav.appendChild(adminNavSlot);
      }

      setPortalTargets({ adminHost, adminNav: adminNavSlot });

      if (window.location.hash.includes('section=admin')) {
        adminHost.scrollIntoView({ block: 'start' });
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
      setPortalTargets({ adminHost: null, adminNav: null });
      adminNavSlot?.remove();
      adminHost?.remove();
      restoreStandaloneAdminNavigation(hiddenButtons);
    };
  }, [props.route, props.language, admin, vi]);

  if (props.route !== 'settings' || !admin || !portalTargets.adminHost || !portalTargets.adminNav) return null;

  return (
    <>
      {createPortal(
        <>
          <div className="settings-admin-merge-label">{vi ? 'QUẢN TRỊ' : 'ADMIN'}</div>
          {adminItems.map((item) => (
            <button key={item.id} type="button" className="settings-admin-merge-nav-button" onClick={() => scrollToSelector(item.target)}>
              <span aria-hidden="true">{item.id === 'overview' ? '⚙' : item.id === 'requests' ? '◎' : item.id === 'accounts' ? '👤' : '◔'}</span>
              <div><strong>{item.label}</strong></div>
            </button>
          ))}
        </>,
        portalTargets.adminNav,
      )}

      {createPortal(
        <>
          <div className="settings-admin-merge-heading">
            <span className="settings-admin-merge-heading-icon" aria-hidden="true">⚙</span>
            <div>
              <h2>{vi ? 'Quản trị hệ thống' : 'System administration'}</h2>
              <p>{vi
                ? 'Duyệt yêu cầu, quản lý tài khoản, phân quyền và đồng bộ hệ thống trong cùng một trung tâm cài đặt.'
                : 'Review requests, manage accounts, permissions and system synchronization from one settings center.'}</p>
            </div>
          </div>
          <Suspense fallback={<div className="settings-admin-merge-loading">{vi ? 'Đang tải công cụ quản trị…' : 'Loading administration tools…'}</div>}>
            <AdminPage language={props.language} currentUser={props.currentUser} />
          </Suspense>
        </>,
        portalTargets.adminHost,
      )}
    </>
  );
}
