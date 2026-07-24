import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function UnifiedUtilityRail({ currentUser, language = 'vi', currentRoute = 'home' }) {
  const [navigationActions, setNavigationActions] = useState(null);
  const [musicState, setMusicState] = useState({ expanded: false, playing: false });

  useEffect(() => {
    if (!currentUser || currentRoute === 'dashboard' || typeof document === 'undefined') {
      setNavigationActions(null);
      return;
    }

    setNavigationActions(document.querySelector('.brian-nav__actions'));
  }, [currentUser, currentRoute]);

  useEffect(() => {
    const syncMusicState = (event) => {
      setMusicState({
        expanded: Boolean(event.detail?.expanded),
        playing: Boolean(event.detail?.playing),
      });
    };

    window.addEventListener('bes-global-music-panel-state', syncMusicState);
    return () => window.removeEventListener('bes-global-music-panel-state', syncMusicState);
  }, []);

  if (!currentUser || currentRoute === 'dashboard' || !navigationActions) return null;

  const musicLabel = language === 'vi' ? 'Nhạc nền' : 'Background music';

  const toggleMusicPanel = () => {
    document.querySelector('.brian-nav__bell.is-open')?.click();
    document.querySelector('.brian-nav__account.is-open')?.click();
    window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'toggle-panel' } }));
  };

  return createPortal(
    <div className="brian-nav__popover-wrap brian-nav__music-wrap" style={{ order: -1 }}>
      <button
        type="button"
        className={`brian-nav__icon brian-nav__music ${musicState.expanded ? 'is-open' : ''} ${musicState.playing ? 'is-playing' : ''}`}
        onClick={toggleMusicPanel}
        title={musicLabel}
        aria-label={musicLabel}
        aria-expanded={musicState.expanded}
        aria-controls="brian-nav-music-popover"
      >
        <span aria-hidden="true">{musicState.playing ? '♪' : '♫'}</span>
      </button>
      <div id="brian-nav-music-popover-root" className="brian-nav__music-popover-host" />
    </div>,
    navigationActions,
  );
}
