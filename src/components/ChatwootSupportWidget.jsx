import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initializeAuthSession, subscribeToAuthChanges } from '../utils/auth.js';
import { supabase } from '../utils/supabase.js';
import { APP_VERSION } from '../config/version.js';

const CHATWOOT_BASE_URL = String(import.meta.env.VITE_CHATWOOT_BASE_URL || '').trim().replace(/\/+$/, '');
const CHATWOOT_WEBSITE_TOKEN = String(import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN || '').trim();
const CHATWOOT_IDENTITY_ENDPOINT = String(import.meta.env.VITE_CHATWOOT_IDENTITY_ENDPOINT || '').trim();
const CHATWOOT_ENABLED = String(import.meta.env.VITE_CHATWOOT_ENABLED || 'true').trim().toLowerCase() !== 'false';
const CHATWOOT_PRELOAD = String(import.meta.env.VITE_CHATWOOT_PRELOAD || 'false').trim().toLowerCase() === 'true';
const CHATWOOT_SCRIPT_ID = 'bes-chatwoot-sdk';
const HIDDEN_ROUTES = new Set(['login', 'register', 'setup', 'homeroom-portal', 'classroom-join']);

const SUPPORT_CSS = `
#bes-chatwoot-support-root{position:relative;z-index:2147482500}
.bes-support-launcher{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(92px,calc(env(safe-area-inset-bottom) + 18px));z-index:2147482500;display:flex;align-items:center;gap:10px;min-height:52px;padding:10px 16px 10px 12px;border:1px solid rgba(25,21,21,.18);border-radius:18px;background:#fff;color:#191515;box-shadow:0 12px 35px rgba(18,43,70,.22);font:800 14px/1.15 BrianGesco,Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.01em;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease}
.bes-support-launcher:hover{transform:translateY(-2px);box-shadow:0 16px 42px rgba(18,43,70,.28)}
.bes-support-launcher:focus-visible{outline:3px solid #b7d7ff;outline-offset:3px}
.bes-support-launcher:disabled{cursor:wait;opacity:.78;transform:none}
.bes-support-launcher__icon{width:34px;height:34px;display:grid;place-items:center;border-radius:12px;background:#315fc4;color:#fff;flex:0 0 auto}
.bes-support-launcher__icon svg{width:21px;height:21px;display:block}
.bes-support-launcher__copy{display:grid;gap:2px;text-align:left}
.bes-support-launcher__title{font-size:14px;font-weight:900}
.bes-support-launcher__status{font-size:10px;font-weight:750;letter-spacing:.04em;color:#667085;text-transform:uppercase}
.bes-support-launcher[data-state="error"] .bes-support-launcher__icon{background:#a43b57}
html[data-theme="dark"] .bes-support-launcher{background:#1f2329;color:#f7f9fc;border-color:rgba(255,255,255,.16);box-shadow:0 14px 40px rgba(0,0,0,.44)}
html[data-theme="dark"] .bes-support-launcher__status{color:#b8c0cc}
@media (max-width:720px){.bes-support-launcher{right:max(12px,env(safe-area-inset-right));bottom:max(78px,calc(env(safe-area-inset-bottom) + 12px));min-height:48px;padding:8px 11px;border-radius:16px}.bes-support-launcher__icon{width:32px;height:32px}.bes-support-launcher__status{display:none}}
@media (prefers-reduced-motion:reduce){.bes-support-launcher{transition:none}.bes-support-launcher:hover{transform:none}}
`;

let sdkPromise = null;
let sdkConfigKey = '';
let identifiedUserId = '';

function getRoute() {
  return String(window.location.hash || '')
    .replace(/^#\/?/, '')
    .split(/[?&]/)[0]
    .trim() || 'home';
}

function getLanguage() {
  const language = document.documentElement.dataset.language || document.documentElement.lang || localStorage.getItem('bet-language') || 'vi';
  return String(language).toLowerCase().startsWith('en') ? 'en' : 'vi';
}

function getTheme() {
  return document.documentElement.dataset.theme || localStorage.getItem('bet-theme') || 'light';
}

function getUiSnapshot() {
  return { route: getRoute(), language: getLanguage(), theme: getTheme() };
}

function applyWidgetSettings(language) {
  window.chatwootSettings = {
    ...(window.chatwootSettings || {}),
    hideMessageBubble: true,
    showUnreadMessagesDialog: false,
    position: 'right',
    locale: language,
    useBrowserLanguage: false,
    type: 'standard',
    darkMode: 'auto',
    showPopoutButton: true,
    enableFileUpload: true,
    enableEmojiPicker: true,
    enableEndConversation: true,
    welcomeTitle: language === 'vi' ? 'Brian hỗ trợ bạn' : 'Brian Support',
    welcomeDescription: language === 'vi' ? 'Gửi câu hỏi hoặc báo lỗi cho quản trị viên.' : 'Send a question or report an issue to the administrator.',
  };
}

function waitForChatwootReady(timeoutMs = 15000) {
  if (window.$chatwoot) return Promise.resolve(window.$chatwoot);
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      window.removeEventListener('chatwoot:ready', onReady);
      window.removeEventListener('chatwoot:error', onError);
      window.clearTimeout(timer);
    };
    const onReady = () => {
      cleanup();
      resolve(window.$chatwoot);
    };
    const onError = () => {
      cleanup();
      reject(new Error('Chatwoot SDK reported an error.'));
    };
    window.addEventListener('chatwoot:ready', onReady, { once: true });
    window.addEventListener('chatwoot:error', onError, { once: true });
    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Chatwoot SDK timed out.'));
    }, timeoutMs);
  });
}

function ensureChatwootSdk(language) {
  if (!CHATWOOT_ENABLED || !CHATWOOT_BASE_URL || !CHATWOOT_WEBSITE_TOKEN) {
    return Promise.reject(new Error('Chatwoot is not configured.'));
  }

  const configKey = `${CHATWOOT_BASE_URL}|${CHATWOOT_WEBSITE_TOKEN}`;
  if (sdkPromise && sdkConfigKey === configKey) return sdkPromise;

  sdkConfigKey = configKey;
  applyWidgetSettings(language);
  sdkPromise = new Promise((resolve, reject) => {
    const start = async () => {
      try {
        if (!window.chatwootSDK?.run) throw new Error('Chatwoot SDK loader is unavailable.');
        const ready = waitForChatwootReady();
        window.chatwootSDK.run({ websiteToken: CHATWOOT_WEBSITE_TOKEN, baseUrl: CHATWOOT_BASE_URL });
        const sdk = await ready;
        sdk?.toggleBubbleVisibility?.('hide');
        resolve(sdk);
      } catch (error) {
        sdkPromise = null;
        reject(error);
      }
    };

    const existing = document.getElementById(CHATWOOT_SCRIPT_ID);
    if (existing) {
      if (window.chatwootSDK?.run) start();
      else {
        existing.addEventListener('load', start, { once: true });
        existing.addEventListener('error', () => {
          sdkPromise = null;
          reject(new Error('Could not load Chatwoot SDK.'));
        }, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = CHATWOOT_SCRIPT_ID;
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', start, { once: true });
    script.addEventListener('error', () => {
      sdkPromise = null;
      reject(new Error('Could not load Chatwoot SDK.'));
    }, { once: true });
    document.head.appendChild(script);
  });

  return sdkPromise;
}

async function fetchIdentifierHash(user) {
  if (!CHATWOOT_IDENTITY_ENDPOINT || !user?.id || user?.demo) return '';
  try {
    const sessionResult = await supabase?.auth?.getSession?.();
    const accessToken = sessionResult?.data?.session?.access_token || '';
    if (!accessToken) return '';
    const response = await fetch(CHATWOOT_IDENTITY_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ identifier: String(user.id) }),
    });
    if (!response.ok) return '';
    const payload = await response.json();
    return String(payload?.identifier_hash || payload?.identifierHash || '').trim();
  } catch (error) {
    console.warn('[ChatwootSupport] identity validation unavailable', error);
    return '';
  }
}

async function identifyChatwootUser(user, ui) {
  if (!user?.id || !window.$chatwoot) return;
  const nextUserId = String(user.id);
  if (identifiedUserId && identifiedUserId !== nextUserId) {
    window.$chatwoot.reset?.();
  }
  const identifierHash = await fetchIdentifierHash(user);
  const profile = {
    name: user.name || user.email || 'Brian user',
    email: user.email || undefined,
    avatar_url: user.avatarUrl || undefined,
    company_name: user.school || undefined,
    identifier_hash: identifierHash || undefined,
  };
  Object.keys(profile).forEach((key) => profile[key] === undefined && delete profile[key]);
  window.$chatwoot.setUser(nextUserId, profile);
  identifiedUserId = nextUserId;
  try {
    window.$chatwoot.setLocale(ui.language);
    window.$chatwoot.toggleBubbleVisibility?.('hide');
    window.$chatwoot.setCustomAttributes?.({
      brian_role: String(user.role || 'teacher'),
      brian_school: String(user.school || ''),
      brian_version: String(APP_VERSION || ''),
      current_route: String(ui.route || 'home'),
      interface_language: String(ui.language || 'vi'),
    });
  } catch (error) {
    console.warn('[ChatwootSupport] optional user context could not be applied', error);
  }
}

function SupportIcon() {
  return React.createElement(
    'svg',
    { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
    React.createElement('path', {
      d: 'M4 13v-2a8 8 0 0 1 16 0v2M5.5 18H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1v6h-.5Zm13 0H18v-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-.5ZM18 18c0 1.657-1.79 3-4 3h-1',
      stroke: 'currentColor',
      strokeWidth: '1.8',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}

export default function ChatwootSupportWidget() {
  const [user, setUser] = useState(null);
  const [ui, setUi] = useState(getUiSnapshot);
  const [state, setState] = useState('idle');
  const mountedRef = useRef(true);
  const configured = CHATWOOT_ENABLED && Boolean(CHATWOOT_BASE_URL && CHATWOOT_WEBSITE_TOKEN);
  const visible = configured && Boolean(user?.id) && !HIDDEN_ROUTES.has(ui.route);

  useEffect(() => {
    mountedRef.current = true;
    let alive = true;
    initializeAuthSession().then((nextUser) => alive && setUser(nextUser)).catch((error) => {
      console.warn('[ChatwootSupport] auth initialization failed', error);
    });
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      if (alive) setUser(nextUser || null);
    });
    return () => {
      alive = false;
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const refresh = () => setUi(getUiSnapshot());
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'data-language', 'data-theme'],
    });
    window.addEventListener('hashchange', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!configured) return;
    if (!user?.id) {
      identifiedUserId = '';
      if (window.$chatwoot) {
        try {
          window.$chatwoot.toggle('close');
          window.$chatwoot.reset();
          window.$chatwoot.toggleBubbleVisibility?.('hide');
        } catch (error) {
          console.warn('[ChatwootSupport] session reset failed', error);
        }
      }
      setState('idle');
      return;
    }

    let cancelled = false;
    if (window.$chatwoot) {
      identifyChatwootUser(user, ui)
        .then(() => { if (!cancelled && mountedRef.current) setState('ready'); })
        .catch((error) => {
          console.warn('[ChatwootSupport] user synchronization failed', error);
          if (!cancelled && mountedRef.current) setState('error');
        });
    } else if (CHATWOOT_PRELOAD) {
      setState('loading');
      ensureChatwootSdk(ui.language)
        .then(async () => {
          if (cancelled) return;
          await identifyChatwootUser(user, ui);
          if (!cancelled && mountedRef.current) setState('ready');
        })
        .catch((error) => {
          console.warn('[ChatwootSupport] SDK initialization failed', error);
          if (!cancelled && mountedRef.current) setState('error');
        });
    } else {
      setState('idle');
    }
    return () => { cancelled = true; };
  }, [configured, user?.id, user?.email, user?.name, user?.role, user?.school, user?.avatarUrl, ui.language]);

  useEffect(() => {
    if (state !== 'ready' || !user?.id || !window.$chatwoot) return;
    try {
      window.$chatwoot.setLocale(ui.language);
      window.$chatwoot.setCustomAttributes?.({
        current_route: String(ui.route || 'home'),
        interface_language: String(ui.language || 'vi'),
      });
    } catch (error) {
      console.warn('[ChatwootSupport] context update failed', error);
    }
  }, [state, user?.id, ui.route, ui.language, ui.theme]);

  const openSupport = useCallback(async () => {
    try {
      setState('loading');
      const sdk = await ensureChatwootSdk(ui.language);
      await identifyChatwootUser(user, ui);
      sdk?.toggleBubbleVisibility?.('hide');
      sdk?.toggle?.('open');
      if (mountedRef.current) setState('ready');
    } catch (error) {
      console.warn('[ChatwootSupport] open failed', error);
      if (mountedRef.current) setState('error');
    }
  }, [user, ui]);

  useEffect(() => {
    window.BESChatwootSupport = {
      configured,
      open: openSupport,
      close: () => window.$chatwoot?.toggle?.('close'),
      reset: () => window.$chatwoot?.reset?.(),
      status: () => ({ configured, state, userId: user?.id || '', route: ui.route }),
    };
    return () => {
      if (window.BESChatwootSupport?.open === openSupport) delete window.BESChatwootSupport;
    };
  }, [configured, openSupport, state, user?.id, ui.route]);

  const copy = useMemo(() => {
    const vi = ui.language === 'vi';
    if (state === 'loading') return { title: vi ? 'Đang kết nối…' : 'Connecting…', status: vi ? 'Hỗ trợ' : 'Support' };
    if (state === 'error') return { title: vi ? 'Thử lại hỗ trợ' : 'Retry support', status: vi ? 'Mất kết nối' : 'Connection error' };
    return { title: vi ? 'Hỗ trợ kỹ thuật' : 'Technical support', status: vi ? 'Nhắn với quản trị viên' : 'Message the administrator' };
  }, [state, ui.language]);

  if (!visible) return null;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('style', { id: 'bes-chatwoot-support-styles' }, SUPPORT_CSS),
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'bes-support-launcher',
        'data-state': state,
        'aria-label': copy.title,
        title: copy.title,
        onClick: openSupport,
        disabled: state === 'loading',
      },
      React.createElement('span', { className: 'bes-support-launcher__icon' }, React.createElement(SupportIcon)),
      React.createElement(
        'span',
        { className: 'bes-support-launcher__copy' },
        React.createElement('span', { className: 'bes-support-launcher__title' }, copy.title),
        React.createElement('span', { className: 'bes-support-launcher__status', 'aria-live': 'polite' }, copy.status),
      ),
    ),
  );
}
