import React, { useEffect, useState } from 'react';
import { initializeAuthSession, subscribeToAuthChanges } from '../../utils/auth.js';
import { isAdminRole } from '../../utils/roles.js';
import HeroThemeStudio from './HeroThemeStudio.jsx';

export default function HeroThemeStudioBridge({ language = 'vi' }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let alive = true;
    initializeAuthSession({ force: true }).then((user) => {
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

  if (!isAdminRole(currentUser?.role)) return null;
  return <HeroThemeStudio currentUser={currentUser} language={language} />;
}
