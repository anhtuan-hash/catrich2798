import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function UnifiedUtilityRail({ currentUser, language = 'vi', currentRoute = 'home' }) {
  const [navigationActions, setNavigationActions] = useState(null);

  useEffect(() => {
    if (!currentUser || currentRoute === 'dashboard' || typeof document === 'undefined') {
      setNavigationActions(null);
      return;
    }

    setNavigationActions(document.querySelector('.brian-nav__actions'));
  }, [currentUser, currentRoute]);

  if (!currentUser || currentRoute === 'dashboard' || !navigationActions) return null;

  const musicLabel = language === 'vi' ? 'Mở nhạc nền' : 'Open background music';

  return createPortal(
    <button
      type="button"
      className="brian-nav__icon brian-nav__music"
      style={{ order: -1 }}
      onClick={() => window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'expand' } }))}
      title={musicLabel}
      aria-label={musicLabel}
    >
      <span aria-hidden="true">♫</span>
    </button>,
    navigationActions,
  );
}
