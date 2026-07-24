import React from 'react';
import QuickDictionaryBubble from './QuickDictionaryBubble.jsx';

export default function UnifiedUtilityRail({ currentUser, language = 'vi', currentRoute = 'home' }) {
  if (!currentUser) return null;

  const musicLabel = language === 'vi' ? 'Mở nhạc nền' : 'Open background music';

  return (
    <>
      <QuickDictionaryBubble language={language} />
      <aside
        className="bes-utility-rail bes-utility-rail--music-only"
        aria-label={language === 'vi' ? 'Công cụ âm nhạc' : 'Music utility'}
        data-route={currentRoute}
      >
        <button
          type="button"
          className="is-music"
          onClick={() => window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'expand' } }))}
          title={musicLabel}
          aria-label={musicLabel}
        >
          <span aria-hidden="true">♫</span>
        </button>
      </aside>
    </>
  );
}
