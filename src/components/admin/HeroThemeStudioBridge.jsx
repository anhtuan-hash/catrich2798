import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { initializeAuthSession, subscribeToAuthChanges } from '../../utils/auth.js';
import { isAdminRole } from '../../utils/roles.js';
import HeroThemeStudio from './HeroThemeStudio.jsx';

export default function HeroThemeStudioBridge({ language = 'vi' }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [host, setHost] = useState(() => document.getElementById('bes-main-content'));

  useEffect(() => {
    let alive = true;
    initializeAuthSession().then((user) => {
      if (alive) setCurrentUser(user || null);
    }).catch(() => {
      if (alive) setCurrentUser(null);
    });
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (alive) setCurrentUser(user || null);
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const existing = document.getElementById('bes-main-content');
    if (existing) {
      setHost(existing);
      return undefined;
    }
    const observer = new MutationObserver(() => {
      const next = document.getElementById('bes-main-content');
      if (!next) return;
      setHost(next);
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!host || !isAdminRole(currentUser?.role)) return null;
  return createPortal(<HeroThemeStudio currentUser={currentUser} language={language} />, host);
}
