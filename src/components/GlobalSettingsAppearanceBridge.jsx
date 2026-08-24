import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalSettingsAppearanceBridge.css';

const AdminPage = lazy(() => import('../pages/AdminPage.jsx'));
const SettingsAppearanceEngine = lazy(() => import('./SettingsAppearanceEngine.jsx'));

const ADMIN_HOST_ID = 'settings-admin-merge-host';
const ADMIN_NAV_SLOT_ID = 'settings-admin-merge-nav';
const APPEARANCE_HOST_ID = 'settings-appearance-merge-host';
const APPEARANCE_NAV_SLOT_ID = 'settings-appearance-merge-nav';
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
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeLegacyQuickAppearancePanels() {
  document
    .querySelectorAll('.bes-quick-appearance:not([data-bes-react-appearance-sentinel="true"])')
    .forEach((panel) => panel.remove());
}

export default function GlobalSettingsAppearanceBridge(props) {
  const admin = isAdminUser(props.currentUser);
  const vi = props.language === 'vi';
  const [portalTargets, setPortalTargets] = useState({
    appearanceHost: null,
    appearanceNav: null,
    adminHost: null,
    adminNav: null,
  });

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
    let appearanceHost = null;
    let appearanceNavSlot = null;
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

      if (props.route !== 'settings') {
        setPortalTargets({ appearanceHost: null, appearanceNav: null, adminHost: null, adminNav: null });
        return true;
      }

      const settingsMain = document.querySelector('.settings-google-main');
      const settingsNav = document.querySelector('.settings-google-sidebar nav');
      if (!settingsMain || !settingsNav) return false;

      const footer = settingsMain.querySelector('.settings-google-footer');

      appearanceHost = document.getElementById(APPEARANCE_HOST_ID);
      if (!appearanceHost) {
        appearanceHost = document.createElement('section');
        appearanceHost.id = APPEARANCE_HOST_ID;
        appearanceHost.className = 'settings-admin-merge-host settings-appearance-merge-host';
        appearanceHost.setAttribute('aria-label', vi ? 'Giao diện và trải nghiệm' : 'Appearance and experience');
        settingsMain.insertBefore(appearanceHost, footer || null);
      }

      appearanceNavSlot = document.getElementById(APPEARANCE_NAV_SLOT_ID);
      if (!appearanceNavSlot) {
        appearanceNavSlot = document.createElement('div');
        appearanceNavSlot.id = APPEARANCE_NAV_SLOT_ID;
        appearanceNavSlot.className = 'settings-admin-merge-nav settings-appearance-merge-nav';
        settingsNav.appendChild(appearanceNavSlot);
      }

      removeLegacyQuickAppearancePanels();

      if (admin) {
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
      }

      setPortalTargets({
        appearanceHost,
        appearanceNav: appearanceNavSlot,
        adminHost: admin ? adminHost : null,
        adminNav: admin ? adminNavSlot : null,
      });

      if (window.location.hash.includes('section=appearance')) {
        window.requestAnimationFrame(() => appearanceHost?.scrollIntoView({ behavior: 'auto', block: 'start' }));
      } else if (admin && window.location.hash.includes('section=admin')) {
        window.requestAnimationFrame(() => adminHost?.scrollIntoView({ behavior: 'auto', block: 'start' }));
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
      setPortalTargets({ appearanceHost: null, appearanceNav: null, adminHost: null, adminNav: null });
      appearanceNavSlot?.remove();
      appearanceHost?.remove();
      adminNavSlot?.remove();
      adminHost?.remove();
      restoreStandaloneAdminNavigation(hiddenButtons);
    };
  }, [props.route, props.language, admin, vi]);

  if (props.route !== 'settings' || !portalTargets.appearanceHost || !portalTargets.appearanceNav) return null;

  return (
    <>
      {createPortal(
        <>
          <div className="settings-admin-merge-label">{vi ? 'TRẢI NGHIỆM' : 'EXPERIENCE'}</div>
          <button
            type="button"
            className="settings-admin-merge-nav-button"
            onClick={() => scrollToSelector(`#${APPEARANCE_HOST_ID}`)}
          >
            <span aria-hidden="true">✦</span>
            <div><strong>{vi ? 'Màu sắc & hiệu ứng' : 'Color & effects'}</strong></div>
          </button>
        </>,
        portalTargets.appearanceNav,
      )}

      {createPortal(
        <>
          <div className="settings-admin-merge-heading settings-appearance-merge-heading">
            <span
              className="bes-quick-appearance"
              data-bes-react-appearance-sentinel="true"
              aria-hidden="true"
              style={{ display: 'none' }}
            />
            <span className="settings-admin-merge-heading-icon" aria-hidden="true">✦</span>
            <div>
              <h2>{vi ? 'Giao diện & trải nghiệm' : 'Appearance & experience'}</h2>
              <p>{vi
                ? 'Điều chỉnh màu nhấn, mật độ, kích thước chữ, chuyển động, hiệu ứng nền và Adaptive UI ngay trong Cài đặt.'
                : 'Adjust accent color, density, text size, motion, background effects and Adaptive UI directly in Settings.'}</p>
            </div>
          </div>
          <Suspense fallback={<div className="settings-admin-merge-loading">{vi ? 'Đang tải Appearance Engine…' : 'Loading Appearance Engine…'}</div>}>
            <SettingsAppearanceEngine
              language={props.language}
              setAccent={(value) => {
                try { localStorage.setItem('bes-accent-color', value); } catch { /* optional */ }
                document.documentElement.dataset.accent = value;
              }}
              setDensity={(value) => {
                try { localStorage.setItem('bes-display-density', value); } catch { /* optional */ }
                document.documentElement.dataset.density = value;
              }}
              setMotionMode={props.setMotionMode}
              setPerformanceMode={props.setPerformanceMode}
              setFontScale={props.setFontScale}
            />
          </Suspense>
        </>,
        portalTargets.appearanceHost,
      )}

      {admin && portalTargets.adminHost && portalTargets.adminNav ? (
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
      ) : null}
    </>
  );
}