import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import GlobalSubtitleAdminPanel from './admin/GlobalSubtitleAdminPanel.jsx';
import { installGlobalSubtitleSystem } from '../utils/globalSubtitleSystem.js';
import '../styles/GlobalSubtitleSystem.css';

const HOST_ID = 'admin-global-subtitle-host';

function isAdminUser(user) {
  return ['admin', 'administrator'].includes(String(user?.role || '').trim().toLowerCase());
}

export default function GlobalSubtitleSettingsBridge(props) {
  const [host, setHost] = useState(null);
  const admin = isAdminUser(props.currentUser);

  useEffect(() => {
    installGlobalSubtitleSystem();
  }, []);

  useEffect(() => {
    let timer = 0;
    let attempts = 0;
    let cancelled = false;
    let createdHost = null;

    const mount = () => {
      if (cancelled) return true;
      if (!admin || !['settings', 'admin'].includes(String(props.route || ''))) {
        setHost(null);
        return true;
      }

      const fontPanel = [...document.querySelectorAll('.admin-global-font')]
        .find((node) => node.offsetParent !== null) || document.querySelector('.admin-global-font');
      const motionPanel = [...document.querySelectorAll('.admin-global-motion')]
        .find((node) => node.offsetParent !== null) || document.querySelector('.admin-global-motion');
      const anchor = fontPanel || motionPanel;
      if (!anchor?.parentElement) return false;

      createdHost = document.getElementById(HOST_ID);
      if (!createdHost) {
        createdHost = document.createElement('div');
        createdHost.id = HOST_ID;
        createdHost.className = 'admin-global-subtitle-host';
        createdHost.setAttribute('data-bes-subtitle-keep', 'true');
        createdHost.setAttribute('aria-label', props.language === 'en' ? 'Global subtitle visibility' : 'Hiển thị tiêu đề phụ toàn hệ thống');
        anchor.insertAdjacentElement('afterend', createdHost);
      }
      setHost(createdHost);
      return true;
    };

    const tryMount = () => {
      if (mount()) return;
      attempts += 1;
      if (attempts < 45) timer = window.setTimeout(tryMount, 80);
    };

    tryMount();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setHost(null);
      createdHost?.remove();
    };
  }, [admin, props.route, props.language]);

  if (!admin || !host) return null;

  return createPortal(
    <GlobalSubtitleAdminPanel currentUser={props.currentUser} language={props.language} />,
    host,
  );
}
