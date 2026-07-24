import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QuickDictionaryBubble from './QuickDictionaryBubble.jsx';
import './QuickDictionaryNavigationPopover.css';

export default function UnifiedUtilityRail({ currentUser, language = 'vi', currentRoute = 'home' }) {
  const [navigationActions, setNavigationActions] = useState(null);
  const [musicState, setMusicState] = useState({ expanded: false, playing: false });

  useEffect(() => {
    if (!currentUser || typeof document === 'undefined') {
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

  if (!currentUser || !navigationActions) return null;

  const musicLabel = language === 'vi' ? 'Nhạc nền' : 'Background music';

  const closeAccountAndNotifications = () => {
    document.querySelector('.brian-nav__bell.is-open')?.click();
    document.querySelector('.brian-nav__account.is-open')?.click();
  };

  const prepareDictionaryPanel = (event) => {
    if (!event.target.closest('.bes-dictionary-launcher')) return;
    closeAccountAndNotifications();
    window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'collapse' } }));
  };

  const toggleMusicPanel = () => {
    closeAccountAndNotifications();
    document.querySelector('.bes-dictionary-root.is-open .bes-dictionary-launcher')?.click();
    window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'toggle-panel' } }));
  };

  return createPortal(
    <>
      <div
        className="brian-nav__popover-wrap brian-nav__dictionary-wrap"
        style={{ order: -2 }}
        onPointerDownCapture={prepareDictionaryPanel}
      >
        <QuickDictionaryBubble key={currentRoute} language={language} />
      </div>

      {currentRoute !== 'dashboard' ? (
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
        </div>
      ) : null}
    </>,
    navigationActions,
  );
}
