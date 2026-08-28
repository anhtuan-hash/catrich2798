import { useEffect } from 'react';

const EVENT_NAME = 'bes-regional-fonts-updated';

const TEXT_TARGETS = [
  '.brian-nav__brand > span',
  '.brian-nav__primary > :is(button,a,[role="button"])',
  '.brian-nav__primary > :is(button,a,[role="button"]) > span:not(.brian-nav__reports-countdown):not(.brian-nav__ttcm-badge)',
  '.brian-nav__account-name',
  '.brian-nav__account > strong',
].join(',');

function propertySnapshot(node, property) {
  return {
    value: node.style.getPropertyValue(property),
    priority: node.style.getPropertyPriority(property),
  };
}

function restoreProperty(node, property, snapshot) {
  if (!node?.style) return;
  if (snapshot?.value) node.style.setProperty(property, snapshot.value, snapshot.priority || '');
  else node.style.removeProperty(property);
}

export default function GlobalNavigationRegionalTypographyRuntime() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const originals = new Map();
    let frame = 0;
    let applying = false;

    const remember = (node) => {
      if (!node?.style || originals.has(node)) return;
      originals.set(node, {
        family: propertySnapshot(node, 'font-family'),
        size: propertySnapshot(node, 'font-size'),
      });
    };

    const apply = () => {
      frame = 0;
      if (applying) return;
      applying = true;
      try {
        const root = document.documentElement;
        const rootStyle = window.getComputedStyle(root);
        const hasFamily = root.hasAttribute('data-font-region-navigation');
        const hasSize = root.hasAttribute('data-font-size-navigation');
        const family = rootStyle.getPropertyValue('--bes-font-navigation').trim();
        const size = rootStyle.getPropertyValue('--bes-font-size-navigation').trim();

        document.querySelectorAll(TEXT_TARGETS).forEach((node) => {
          remember(node);
          const original = originals.get(node);

          if (hasFamily && family) node.style.setProperty('font-family', family, 'important');
          else restoreProperty(node, 'font-family', original?.family);

          if (hasSize && size) node.style.setProperty('font-size', size, 'important');
          else restoreProperty(node, 'font-size', original?.size);
        });
      } finally {
        applying = false;
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();

    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.addedNodes?.length || record.removedNodes?.length)) schedule();
    });
    const host = document.querySelector('.brian-nav') || document.body;
    if (host) observer.observe(host, { childList: true, subtree: true });

    window.addEventListener(EVENT_NAME, schedule);
    window.addEventListener('focus', schedule);
    document.addEventListener('visibilitychange', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener(EVENT_NAME, schedule);
      window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', schedule);
      originals.forEach((original, node) => {
        restoreProperty(node, 'font-family', original.family);
        restoreProperty(node, 'font-size', original.size);
      });
      originals.clear();
    };
  }, []);

  return null;
}
