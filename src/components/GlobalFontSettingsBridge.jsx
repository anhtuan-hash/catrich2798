import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import RegionalFontAdminPanel from './admin/RegionalFontAdminPanel.jsx';
import { installRegionalFontSystem } from '../utils/globalRegionalFontSystem.js';
import '../styles/GlobalRegionalFontSystem.css';

const HOST_ID = 'admin-regional-font-host';

function isAdminUser(user) {
  return ['admin', 'administrator'].includes(String(user?.role || '').trim().toLowerCase());
}

export default function GlobalFontSettingsBridge(props) {
  const [host, setHost] = useState(null);
  const admin = isAdminUser(props.currentUser);

  useEffect(() => {
    installRegionalFontSystem();
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
      if (!fontPanel) return false;

      createdHost = fontPanel.querySelector(`#${HOST_ID}`);
      if (!createdHost) {
        createdHost = document.createElement('div');
        createdHost.id = HOST_ID;
        createdHost.className = 'admin-regional-font-host';
        createdHost.setAttribute('aria-label', props.language === 'en' ? 'Regional typography' : 'Typography theo khu vực');
        fontPanel.appendChild(createdHost);
      }
      setHost(createdHost);
      return true;
    };

    const tryMount = () => {
      if (mount()) return;
      attempts += 1;
      if (attempts < 40) timer = window.setTimeout(tryMount, 75);
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
    <RegionalFontAdminPanel currentUser={props.currentUser} language={props.language} />,
    host,
  );
}
