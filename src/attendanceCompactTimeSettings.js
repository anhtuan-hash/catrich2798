import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import './styles/AttendanceCompactTimeSettings.css';
import { getRuntimeState, subscribeRuntime } from './services/runtime/core.js';
import { normalizeSystemRole, SYSTEM_ROLES } from './utils/roles.js';

const INSTALL_KEY = '__besAttendanceConfigurationTabInstalled';
const ROOT_ID = 'bes-attendance-config-bridge-root';

function isAdminRuntime(snapshot) {
  return normalizeSystemRole(
    snapshot?.role || snapshot?.profile?.role,
    SYSTEM_ROLES.GUEST,
  ) === SYSTEM_ROLES.ADMIN;
}

function sameTargets(current, next) {
  return current.shell === next.shell
    && current.tabs === next.tabs
    && current.content === next.content
    && current.panel === next.panel;
}

function AttendanceConfigurationBridge() {
  const [runtime, setRuntime] = useState(() => getRuntimeState());
  const [targets, setTargets] = useState({
    shell: null,
    tabs: null,
    content: null,
    panel: null,
  });
  const [active, setActive] = useState(false);
  const panelSlotRef = useRef(null);
  const admin = isAdminRuntime(runtime);

  useEffect(() => subscribeRuntime((next) => setRuntime(next)), []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let frame = 0;
    let stopped = false;

    const scan = () => {
      frame = 0;
      if (stopped) return;
      const shell = document.querySelector('.attendance-shell');
      const next = {
        shell,
        tabs: shell?.querySelector('.attendance-tabs') || null,
        content: shell?.querySelector('.attendance-content') || null,
        panel: shell?.querySelector('.bes-attendance-time-settings') || document.querySelector('.bes-attendance-time-settings'),
      };
      document.querySelectorAll('.bes-attendance-time-trigger').forEach((node) => node.remove());
      setTargets((current) => (sameTargets(current, next) ? current : next));
    };

    const queueScan = () => {
      if (stopped || frame) return;
      frame = window.requestAnimationFrame(scan);
    };

    scan();
    const observer = new MutationObserver(queueScan);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('bes-runtime-core-updated', queueScan);

    return () => {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('bes-runtime-core-updated', queueScan);
    };
  }, []);

  useEffect(() => {
    if (!admin || !targets.shell) setActive(false);
  }, [admin, targets.shell]);

  useEffect(() => {
    const shell = targets.shell;
    if (!shell) return undefined;
    shell.classList.toggle('bes-attendance-config-active', Boolean(admin && active));
    return () => shell.classList.remove('bes-attendance-config-active');
  }, [targets.shell, admin, active]);

  useEffect(() => {
    const tabs = targets.tabs;
    if (!tabs) return undefined;
    const handleNativeTabClick = (event) => {
      const button = event.target?.closest?.('button');
      if (!button || !tabs.contains(button) || button.classList.contains('bes-attendance-config-tab')) return;
      setActive(false);
    };
    tabs.addEventListener('click', handleNativeTabClick, true);
    return () => tabs.removeEventListener('click', handleNativeTabClick, true);
  }, [targets.tabs]);

  useEffect(() => {
    const host = panelSlotRef.current;
    const panel = targets.panel || document.querySelector('.bes-attendance-time-settings');
    if (!admin || !host || !panel || panel.parentElement === host) return;
    panel.hidden = false;
    host.appendChild(panel);
  }, [admin, targets.panel, targets.content]);

  if (!admin || !targets.shell || !targets.tabs || !targets.content) return null;

  const tab = React.createElement(
    'button',
    {
      type: 'button',
      className: `bes-attendance-config-tab${active ? ' is-active' : ''}`,
      'aria-selected': active ? 'true' : 'false',
      onClick: () => setActive(true),
    },
    React.createElement('span', { className: 'bes-attendance-config-tab-icon', 'aria-hidden': 'true' }, '⚙'),
    'Cấu hình',
  );

  const configurationView = React.createElement(
    'section',
    {
      className: 'bes-attendance-config-react-host',
      'data-bes-attendance-time-settings-host': 'true',
      'aria-label': 'Cấu hình điểm danh',
    },
    React.createElement(
      'header',
      { className: 'bes-attendance-config-heading' },
      React.createElement('div', { className: 'bes-attendance-config-heading-icon', 'aria-hidden': 'true' }, '⚙'),
      React.createElement(
        'div',
        null,
        React.createElement('small', null, 'CẤU HÌNH ĐIỂM DANH'),
        React.createElement('h2', null, 'Quy định thời gian điểm danh'),
        React.createElement('p', null, 'Thiết lập khung giờ giáo viên được phân công có thể thao tác điểm danh. Admin và người có quyền Báo cáo vẫn giữ quyền thao tác ngoài khung giờ.'),
      ),
    ),
    React.createElement(
      'div',
      { className: 'bes-attendance-config-panel-slot', ref: panelSlotRef },
      targets.panel ? null : React.createElement('div', { className: 'bes-attendance-config-loading' }, 'Đang tải cấu hình giờ điểm danh…'),
    ),
  );

  return React.createElement(
    React.Fragment,
    null,
    createPortal(tab, targets.tabs),
    createPortal(configurationView, targets.content),
  );
}

export function installAttendanceCompactTimeSettings() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  const start = () => {
    if (!document.body) return;
    let rootHost = document.getElementById(ROOT_ID);
    if (!rootHost) {
      rootHost = document.createElement('div');
      rootHost.id = ROOT_ID;
      rootHost.className = 'bes-attendance-config-bridge-root';
      rootHost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(rootHost);
    }
    createRoot(rootHost).render(React.createElement(AttendanceConfigurationBridge));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

installAttendanceCompactTimeSettings();
