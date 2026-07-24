import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import SettingsAppearanceEngine from './SettingsAppearanceEngine.jsx';
import './GlobalSettingsAppearanceBridge.css';

const SLOT_CLASS = 'settings-engine-portal-slot';
const HIDDEN_ATTR = 'data-settings-engine-duplicate';

function normalizedText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function hideDuplicateSystemRows() {
  const systemCard = document.querySelector('#settings-system');
  if (!systemCard) return [];
  const hidden = [];
  systemCard.querySelectorAll('.settings-m3-row').forEach((row) => {
    const text = normalizedText(row);
    if (text.includes('chế độ hiệu năng') || text.includes('performance mode') || text.startsWith('chuyển cảnh') || text.startsWith('motion')) {
      row.setAttribute(HIDDEN_ATTR, 'true');
      row.hidden = true;
      hidden.push(row);
    }
  });
  return hidden;
}

export default function GlobalSettingsAppearanceBridge(props) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (props.route !== 'settings') {
      setTarget(null);
      return undefined;
    }

    let observer;
    let card;
    let slot;
    let hiddenRows = [];

    const mount = () => {
      card = document.querySelector('#settings-appearance');
      if (!card) return false;

      slot = card.querySelector(`.${SLOT_CLASS}`);
      if (!slot) {
        slot = document.createElement('div');
        slot.className = SLOT_CLASS;
        const header = card.querySelector('.settings-m3-card-head');
        header?.insertAdjacentElement('afterend', slot);
        if (!slot.isConnected) card.prepend(slot);
      }

      card.classList.add('has-integrated-appearance-engine');
      card.querySelectorAll(':scope > .bes-quick-appearance').forEach((panel) => panel.setAttribute('aria-hidden', 'true'));
      hiddenRows = hideDuplicateSystemRows();
      setTarget(slot);
      return true;
    };

    if (!mount()) {
      observer = new MutationObserver(() => {
        if (mount()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const cleanupObserver = new MutationObserver(() => {
      document.querySelectorAll('#settings-appearance > .bes-quick-appearance').forEach((panel) => panel.setAttribute('aria-hidden', 'true'));
      hideDuplicateSystemRows();
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      cleanupObserver.disconnect();
      card?.classList.remove('has-integrated-appearance-engine');
      hiddenRows.forEach((row) => { row.hidden = false; row.removeAttribute(HIDDEN_ATTR); });
      slot?.remove();
      setTarget(null);
    };
  }, [props.route]);

  if (!target) return null;
  return createPortal(
    <SettingsAppearanceEngine
      language={props.language}
      setTheme={props.setTheme}
      setAccent={(value) => {
        try { localStorage.setItem('bes-accent-color', value); } catch { /* optional */ }
        document.documentElement.dataset.accent = value;
      }}
      setDensity={(value) => {
        try { localStorage.setItem('bes-display-density', value); } catch { /* optional */ }
        document.documentElement.dataset.density = value;
      }}
      setMotionMode={props.setMotionMode}
      setPerformanceMode={props.setPerformanceMode}
      setThemeIntensity={props.setThemeIntensity}
      setTileBorder={props.setTileBorder}
      setFontScale={props.setFontScale}
    />,
    target,
  );
}
