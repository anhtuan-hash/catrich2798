import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ExternalAppsIntegration from './components/ExternalAppsIntegration.jsx';
import { initializeAuthSession, subscribeToAuthChanges } from './utils/auth.js';
import { installNeutralSurfaceGuard } from './utils/neutralSurfaceGuard.js';

installNeutralSurfaceGuard();

function Bootstrap() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('bet-language') || 'vi');

  useEffect(() => {
    let active = true;
    initializeAuthSession().then((nextUser) => active && setUser(nextUser)).catch(() => {});
    const unsubscribe = subscribeToAuthChanges((nextUser) => active && setUser(nextUser));
    const observer = new MutationObserver(() => setLanguage(document.documentElement.lang === 'en' ? 'en' : 'vi'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-language'] });
    return () => {
      active = false;
      unsubscribe?.();
      observer.disconnect();
    };
  }, []);

  return <ExternalAppsIntegration currentUser={user} language={language} />;
}

const host = document.createElement('div');
host.id = 'bes-external-apps-root';
document.body.appendChild(host);
createRoot(host).render(<Bootstrap />);