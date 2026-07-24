(() => {
  'use strict';

  const engine = window.__BES_THEME__;
  if (!engine) return;

  const STORAGE_KEY = engine.storageKey;
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  let menu = null;
  let button = null;
  let observer = null;
  let menuOpen = false;
  let lastFocused = null;

  const labels = {
    vi: {
      title: 'Giao diện',
      subtitle: 'Áp dụng cho toàn bộ English Hub',
      light: 'Sáng',
      lightNote: 'Nền sáng, độ tương phản rõ',
      dark: 'Tối',
      darkNote: 'Dịu mắt trong môi trường thiếu sáng',
      system: 'Theo hệ thống',
      systemNote: 'Tự đổi theo thiết bị',
      footer: 'Lựa chọn được lưu trên thiết bị và đồng bộ giữa các tab.',
      button: 'Chọn chế độ sáng hoặc tối',
    },
    en: {
      title: 'Appearance',
      subtitle: 'Applied across English Hub',
      light: 'Light',
      lightNote: 'Bright surface with clear contrast',
      dark: 'Dark',
      darkNote: 'Comfortable in low light',
      system: 'Use system setting',
      systemNote: 'Follows this device automatically',
      footer: 'Your choice is saved on this device and synced across tabs.',
      button: 'Choose light or dark appearance',
    },
  };

  const locale = () => document.documentElement.lang?.toLowerCase().startsWith('en') ? 'en' : 'vi';
  const text = () => labels[locale()];
  const current = () => window.__BES_THEME_STATE__ || { mode: engine.read(), resolved: engine.resolve(engine.read()) };

  const iconFor = (mode, resolved) => {
    if (mode === 'system') return resolved === 'dark' ? '◐' : '◑';
    return resolved === 'dark' ? '☾' : '☀';
  };

  const findThemeButton = () => {
    const actions = document.querySelector('.brian-nav__actions');
    if (!actions) return null;
    return actions.querySelector('.brian-nav__theme-button')
      || actions.querySelector(':scope > .brian-nav__icon:first-child')
      || actions.querySelector('button[aria-label*="tối" i],button[aria-label*="theme" i],button[title*="tối" i],button[title*="theme" i]');
  };

  const updateButton = () => {
    if (!button?.isConnected) return;
    const state = current();
    const copy = text();
    button.classList.add('brian-nav__theme-button');
    button.dataset.themeMode = state.mode;
    button.dataset.resolvedTheme = state.resolved;
    button.setAttribute('aria-label', copy.button);
    button.setAttribute('title', `${copy.title}: ${copy[state.mode]}`);
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', String(menuOpen));
    button.innerHTML = `<span aria-hidden="true">${iconFor(state.mode, state.resolved)}</span>`;
  };

  const removeMenu = ({ restoreFocus = false } = {}) => {
    menuOpen = false;
    menu?.remove();
    menu = null;
    updateButton();
    if (restoreFocus) lastFocused?.focus?.({ preventScroll: true });
  };

  const setTheme = (mode, source = 'menu') => {
    document.documentElement.dataset.themeTransition = 'on';
    const state = engine.apply(mode, { source });
    window.setTimeout(() => delete document.documentElement.dataset.themeTransition, 260);
    updateButton();
    menu?.querySelectorAll('[data-theme-choice]').forEach((option) => {
      const selected = option.dataset.themeChoice === state.mode;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-checked', String(selected));
      const mark = option.querySelector('em');
      if (mark) mark.textContent = selected ? '✓' : '';
    });
  };

  const positionMenu = () => {
    if (!menu || !button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 20);
    const left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.right - width));
    const below = rect.bottom + 10;
    const menuHeight = Math.min(menu.offsetHeight || 340, window.innerHeight - 20);
    const top = below + menuHeight <= window.innerHeight - 10
      ? below
      : Math.max(10, rect.top - menuHeight - 10);
    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  const openMenu = () => {
    if (menuOpen) {
      removeMenu({ restoreFocus: true });
      return;
    }

    lastFocused = button;
    const state = current();
    const copy = text();
    menuOpen = true;
    menu = document.createElement('section');
    menu.className = 'brian-theme-menu brian-theme-menu--v4';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', copy.title);
    menu.innerHTML = `
      <header class="brian-theme-menu__header">
        <strong>${copy.title}</strong>
        <small>${copy.subtitle}</small>
      </header>
      <div class="brian-theme-menu__options" role="radiogroup">
        ${[
          ['light', '☀', copy.light, copy.lightNote],
          ['dark', '☾', copy.dark, copy.darkNote],
          ['system', '◐', copy.system, copy.systemNote],
        ].map(([mode, icon, title, note]) => `
          <button type="button" class="brian-theme-menu__option ${state.mode === mode ? 'is-selected' : ''}" data-theme-choice="${mode}" role="menuitemradio" aria-checked="${state.mode === mode}">
            <i aria-hidden="true">${icon}</i>
            <span><b>${title}</b><small>${note}</small></span>
            <em aria-hidden="true">${state.mode === mode ? '✓' : ''}</em>
          </button>
        `).join('')}
      </div>
      <footer class="brian-theme-menu__footer">${copy.footer}</footer>
    `;

    document.body.appendChild(menu);
    menu.querySelectorAll('[data-theme-choice]').forEach((option) => {
      option.addEventListener('click', () => {
        setTheme(option.dataset.themeChoice);
        removeMenu({ restoreFocus: true });
      });
    });
    positionMenu();
    updateButton();
    menu.querySelector('.is-selected')?.focus?.({ preventScroll: true });
  };

  const bindButton = () => {
    const candidate = findThemeButton();
    if (!candidate || candidate === button) return;
    button = candidate;
    updateButton();
  };

  const interceptThemeClick = (event) => {
    const target = event.target?.closest?.('.brian-nav__theme-button');
    if (!target || target !== button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openMenu();
  };

  document.addEventListener('click', interceptThemeClick, true);
  document.addEventListener('pointerdown', (event) => {
    if (!menuOpen || menu?.contains(event.target) || button?.contains(event.target)) return;
    removeMenu();
  }, true);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault();
      removeMenu({ restoreFocus: true });
    }
  });
  window.addEventListener('resize', positionMenu, { passive: true });
  window.addEventListener('scroll', positionMenu, { passive: true, capture: true });
  window.addEventListener('hashchange', () => removeMenu());

  window.addEventListener('storage', (event) => {
    if (![STORAGE_KEY, 'bes-theme-mode-v3', 'bet-theme', 'bes-appearance-v2'].includes(event.key)) return;
    const mode = engine.read();
    engine.apply(mode, { source: 'storage', silent: false });
    updateButton();
  });

  const onSystemChange = () => {
    const state = current();
    if (state.mode !== 'system') return;
    engine.apply('system', { source: 'system' });
    updateButton();
  };
  media?.addEventListener?.('change', onSystemChange);
  media?.addListener?.(onSystemChange);

  window.addEventListener('bes:set-theme', (event) => {
    const mode = engine.normalize(event.detail?.mode);
    if (mode) setTheme(mode, 'event');
  });
  window.addEventListener('bes:theme-change', updateButton);

  bindButton();
  observer = new MutationObserver(bindButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
