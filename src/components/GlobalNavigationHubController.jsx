import { useEffect } from 'react';

const LABEL_KEYS = [
  [/^(ứng dụng|apps)$/i, 'apps'],
  [/^(trang chủ|home)$/i, 'home'],
  [/^dashboard$/i, 'dashboard'],
  [/^(chủ nhiệm|homeroom)$/i, 'homeroom'],
  [/^(báo cáo|reports)$/i, 'reports'],
  [/^ttcm$/i, 'ttcm'],
  [/^(trò chơi|games)$/i, 'games'],
  [/^(quản trị|admin)$/i, 'admin'],
];

const NAV_ORDER = {
  home: 10,
  apps: 20,
  dashboard: 30,
  homeroom: 40,
  reports: 50,
  ttcm: 60,
  games: 70,
  admin: 80,
};

const HUB_TYPOGRAPHY = {
  brand: { fontSize: '19px', lineHeight: '1.1' },
  navItem: { fontSize: '15px', lineHeight: '1' },
  account: { fontSize: '15px', lineHeight: '1.2' },
  aiLabel: { fontSize: '13px', lineHeight: '1' },
};

function setImportant(element, property, value) {
  if (!element || !value) return;
  element.style.setProperty(property, value, 'important');
}

function keyForButton(button) {
  if (!button) return '';
  if (button.classList.contains('brian-nav__dashboard-tab')) return 'dashboard';
  if (button.classList.contains('brian-nav__homeroom-tab')) return 'homeroom';
  if (button.classList.contains('brian-nav__reports-tab')) return 'reports';
  if (button.classList.contains('brian-nav__ttcm-tab')) return 'ttcm';
  if (button.classList.contains('brian-nav__games-tab')) return 'games';

  const text = String(button.textContent || '').replace(/\s+/g, ' ').trim();
  const matched = LABEL_KEYS.find(([pattern]) => pattern.test(text));
  return matched?.[1] || '';
}

function lockHubTypography(nav, primary) {
  if (!nav || !primary) return;

  // Keep the shared hub visually identical on every route. Some historical
  // Home styles load lazily and used to shrink the header typography after the
  // global CSS had already rendered. Inline !important is the final authority
  // for size only; font-family remains controlled by the Admin font setting.
  nav.dataset.hubTypography = 'locked';
  setImportant(nav, '-webkit-text-size-adjust', '100%');
  setImportant(nav, 'text-size-adjust', '100%');

  const brandLabel = nav.querySelector('.brian-nav__brand span');
  setImportant(brandLabel, 'font-size', HUB_TYPOGRAPHY.brand.fontSize);
  setImportant(brandLabel, 'line-height', HUB_TYPOGRAPHY.brand.lineHeight);

  primary.querySelectorAll(':scope > button, :scope > a').forEach((item) => {
    setImportant(item, 'font-size', HUB_TYPOGRAPHY.navItem.fontSize);
    setImportant(item, 'line-height', HUB_TYPOGRAPHY.navItem.lineHeight);
  });

  nav.querySelectorAll('.brian-nav__account strong').forEach((label) => {
    setImportant(label, 'font-size', HUB_TYPOGRAPHY.account.fontSize);
    setImportant(label, 'line-height', HUB_TYPOGRAPHY.account.lineHeight);
  });

  nav.querySelectorAll('.brian-nav__ai-button > span').forEach((label) => {
    setImportant(label, 'font-size', HUB_TYPOGRAPHY.aiLabel.fontSize);
    setImportant(label, 'line-height', HUB_TYPOGRAPHY.aiLabel.lineHeight);
  });
}

function decorate(primary) {
  const nav = primary?.closest?.('.brian-nav');
  if (!nav || !primary) return;

  if (nav.dataset.hubVersion !== '4') nav.dataset.hubVersion = '4';
  primary.querySelectorAll(':scope > button, :scope > a').forEach((button) => {
    const key = keyForButton(button);
    if (!key) return;
    if (button.dataset.navKey !== key) button.dataset.navKey = key;

    // Runtime authority beats historical route/theme CSS. This guarantees one
    // semantic order even when lazy-loaded route styles arrive after the hub.
    const order = NAV_ORDER[key];
    if (Number.isFinite(order)) button.style.setProperty('order', String(order), 'important');
  });

  lockHubTypography(nav, primary);
}

export default function GlobalNavigationHubController() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;
    let retryFrame = 0;
    let observer = null;
    let primary = null;
    let destroyed = false;
    let attempts = 0;

    const cancelFrame = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const scheduleDecorate = () => {
      if (frame || destroyed || !primary) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!destroyed && primary?.isConnected) decorate(primary);
      });
    };

    const attach = () => {
      if (destroyed) return;
      const nextPrimary = document.querySelector('.brian-nav__primary');
      if (!nextPrimary) {
        attempts += 1;
        if (attempts < 90) retryFrame = window.requestAnimationFrame(attach);
        return;
      }

      if (primary === nextPrimary && observer) {
        scheduleDecorate();
        return;
      }

      observer?.disconnect();
      primary = nextPrimary;
      decorate(primary);

      // Watch the whole shared nav rather than only the primary rail. Account,
      // AI and portal-injected tabs can be remounted independently on route
      // changes, so every fresh node receives the same typography contract.
      const nav = primary.closest('.brian-nav');
      observer = new MutationObserver(scheduleDecorate);
      observer.observe(nav || primary, { childList: true, subtree: true });
    };

    const onHashChange = () => {
      if (!primary?.isConnected) {
        attempts = 0;
        attach();
      } else {
        scheduleDecorate();
      }
    };

    attach();
    window.addEventListener('hashchange', onHashChange);

    return () => {
      destroyed = true;
      cancelFrame();
      if (retryFrame) window.cancelAnimationFrame(retryFrame);
      observer?.disconnect();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  return null;
}
