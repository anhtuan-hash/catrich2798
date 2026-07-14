(() => {
  'use strict';
  const SCHEMA = 'brian-studio-transfer/2.1';
  const EVENT = 'bes-elis-bridge-payload';
  const routeTargets = {
    'lesson-plan-ai': 'lesson',
    'worksheet-factory': 'worksheet',
    'exam-studio': 'exam',
    'textlab-activities': 'activity',
    'speaking-studio': 'speaking',
    'reading-studio': 'reading',
    'word2graph': 'wordgraph',
  };
  const received = new Set();

  const currentTarget = () => {
    const hash = String(window.location.hash || '');
    const slug = Object.keys(routeTargets).find((value) => hash.includes(`/tool/${value}`));
    return slug ? routeTargets[slug] : '';
  };

  const dispatch = (payload) => {
    if (!payload?.transferId || received.has(payload.transferId)) return;
    received.add(payload.transferId);
    try { window.sessionStorage.setItem('bes-elis-latest-transfer', JSON.stringify(payload)); } catch { /* optional */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: payload }));
  };

  const acceptPayload = (payload) => {
    if (payload?.schema !== SCHEMA || !payload.transferId || !payload.target) return false;
    const target = currentTarget();
    if (target && payload.target !== target) return false;
    dispatch(payload);
    return true;
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (window.opener && event.source !== window.opener) return;
    const message = event.data;
    if (message?.type !== 'brian-studio-transfer') return;
    const payload = message.payload;
    if (!acceptPayload(payload)) return;
    event.source?.postMessage({
      type: 'brian-studio-ack',
      transferId: payload.transferId,
      target: payload.target,
    }, event.origin);
  });

  const announceReady = () => {
    const target = currentTarget();
    if (!target) return;
    try {
      const cached = JSON.parse(window.localStorage.getItem(`brian.transfer.${target}`) || 'null');
      if (cached) acceptPayload(cached);
    } catch { /* optional */ }
    if (!window.opener) return;
    const sourceOrigin = new URLSearchParams(window.location.search).get('sourceOrigin');
    if (sourceOrigin !== window.location.origin) return;
    window.opener.postMessage({ type: 'brian-studio-ready', target }, sourceOrigin);
  };

  window.addEventListener('hashchange', announceReady);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', announceReady, { once: true });
  else announceReady();
})();
