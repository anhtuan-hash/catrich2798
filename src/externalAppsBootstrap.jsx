import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ExternalAppsIntegration from './components/ExternalAppsIntegration.jsx';
import { initializeAuthSession, subscribeToAuthChanges } from './utils/auth.js';

function ExternalAppsBootstrap() {
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('bet-language') || 'vi'; } catch { return 'vi'; }
  });

  useEffect(() => {
    let active = true;
    initializeAuthSession().then((user) => { if (active) setCurrentUser(user); }).catch(() => {});
    const unsubscribe = subscribeToAuthChanges((user) => { if (active) setCurrentUser(user); });
    const onStorage = (event) => { if (event.key === 'bet-language') setLanguage(event.newValue || 'vi'); };
    window.addEventListener('storage', onStorage);
    const observer = new MutationObserver(() => setLanguage(document.documentElement.lang === 'en' ? 'en' : 'vi'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-language'] });
    return () => { active = false; unsubscribe?.(); window.removeEventListener('storage', onStorage); observer.disconnect(); };
  }, []);

  return <ExternalAppsIntegration currentUser={currentUser} language={language} />;
}

const host = document.createElement('div');
host.id = 'bes-external-apps-root';
document.body.appendChild(host);
createRoot(host).render(<ExternalAppsBootstrap />);
