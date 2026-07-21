(() => {
  'use strict';

  const SHELL_ID = 'brian-option5-final-shell';
  const HIDDEN_CLASS = 'brian-option5-final-hide-legacy';
  const STYLE_ID = 'brian-option5-final-runtime-style';
  const NEWS_REFRESH_MS = 4000;

  const NAV_ITEMS = [
    { label: 'Trang chủ', icon: 'home', tone: 'green', aliases: ['Trang chủ'], fallback: '#/home' },
    { label: 'Ứng dụng', icon: 'apps', tone: 'sage', aliases: ['Ứng dụng'], fallback: '#/apps' },
    { label: 'Chủ nhiệm', icon: 'people', tone: 'amber', aliases: ['Chủ nhiệm', 'Công tác chủ nhiệm'], fallback: '#/homeroom' },
    { label: 'Tổ chuyên môn', icon: 'school', tone: 'violet', aliases: ['Tổ chuyên môn', 'Chuyên môn'], fallback: '#/department' },
    { label: 'Nhân sự', icon: 'user', tone: 'blue', aliases: ['Nhân sự'], fallback: '/nhan-su/index.html' },
    { label: 'Luyện thi THPT', icon: 'book', tone: 'orange', aliases: ['Luyện thi THPT'], fallback: '#/tool/thpt-exam-prep' },
    { label: 'Đọc báo', icon: 'news', tone: 'mint', aliases: ['Đọc báo', 'Newsroom'], fallback: '#/tool/news-reader' },
    { label: 'Trò chơi', icon: 'game', tone: 'rose', aliases: ['Trò chơi', 'Game Hub'], fallback: '#/games' }
  ];

  const ICONS = {
    home: '<path d="M3.5 11.2 12 4l8.5 7.2v8.3A1.5 1.5 0 0 1 19 21h-4.7v-6.2H9.7V21H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
    apps: '<rect x="3.8" y="3.8" width="6.2" height="6.2" rx="1.5"/><rect x="14" y="3.8" width="6.2" height="6.2" rx="1.5"/><rect x="3.8" y="14" width="6.2" height="6.2" rx="1.5"/><rect x="14" y="14" width="6.2" height="6.2" rx="1.5"/>',
    people: '<circle cx="9" cy="8" r="3.4"/><circle cx="17" cy="9.2" r="2.6"/><path d="M3.6 20a5.4 5.4 0 0 1 10.8 0M14.2 15.2A4.5 4.5 0 0 1 20.4 20"/>',
    school: '<path d="m3 8.5 9-4.7 9 4.7-9 4.7z"/><path d="M6.5 10.5v5.2c2.8 2.1 8.2 2.1 11 0v-5.2M20.5 9v6"/>',
    user: '<circle cx="12" cy="7.5" r="3.6"/><path d="M5.2 21a6.8 6.8 0 0 1 13.6 0"/>',
    book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/>',
    news: '<path d="M4 3.5h16v17H4z"/><path d="M7 7h5M7 11h10M7 15h10M15 7h2"/>',
    game: '<path d="M8 8h8a5 5 0 0 1 4.5 7.2l-1.2 2.4a2 2 0 0 1-3.2.5L14 16h-4l-2.1 2.1a2 2 0 0 1-3.2-.5l-1.2-2.4A5 5 0 0 1 8 8z"/><path d="M8 11v4M6 13h4M16.5 11.8h.01M18.2 14.2h.01"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.8"/><path d="m20 20-4.6-4.6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 6.8-3 7.2-3 9h18c0-1.8-3-2.2-3-9"/><path d="M10 21h4"/>',
    sync: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 2M18 15a7 7 0 0 1-12 2l-2-2"/>',
    brief: '<rect x="3.5" y="6" width="17" height="14" rx="2"/><path d="M8 6V4h8v2M3.5 11h17"/>',
    down: '<path d="m7 9 5 5 5-5"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logout: '<path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/>'
  };

  let legacyNews = null;
  let observer = null;
  let tickerTimer = null;
  let legacyScanQueued = false;

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function svg(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.apps}</svg>`;
  }

  function insideShell(node) {
    return Boolean(node && node.closest && node.closest(`#${SHELL_ID}`));
  }

  function visibleRect(node) {
    try {
      const rect = node.getBoundingClientRect();
      return {
        rect,
        valid:
          rect.width >= Math.max(500, window.innerWidth * 0.52) &&
          rect.height >= 34 &&
          rect.height <= 240 &&
          rect.top >= -30 &&
          rect.top <= 560
      };
    } catch {
      return { rect: null, valid: false };
    }
  }

  function classify(node) {
    if (!node || insideShell(node)) return null;
    const { rect, valid } = visibleRect(node);
    if (!valid) return null;

    const text = normalize(node.textContent);
    const isNews =
      text.includes('tin vắn thời sự') &&
      (text.includes('xem bản tin') || text.includes('cập nhật'));

    const isMenu =
      text.includes('việc hôm nay') &&
      text.includes('tài khoản') &&
      text.includes('đồng bộ live');

    const requiredNav = [
      'trang chủ',
      'ứng dụng',
      'chủ nhiệm',
      'tổ chuyên môn'
    ];
    const navHits = requiredNav.filter((label) => text.includes(label)).length;
    const isNav =
      navHits >= 3 &&
      (
        text.includes('luyện thi thpt') ||
        text.includes('đọc báo') ||
        text.includes('trò chơi')
      );

    if (isNews) return { type: 'news', area: rect.width * rect.height };
    if (isMenu) return { type: 'menu', area: rect.width * rect.height };
    if (isNav) return { type: 'nav', area: rect.width * rect.height };
    return null;
  }

  function findBestLegacyRows() {
    const selectors = [
      'body > header',
      'body > nav',
      'body > section',
      'body > div',
      '#root > header',
      '#root > nav',
      '#root > section',
      '#root > div',
      '#root [role="navigation"]',
      '#root div'
    ].join(',');

    const best = { news: null, menu: null, nav: null };
    document.querySelectorAll(selectors).forEach((node) => {
      const result = classify(node);
      if (!result) return;
      if (!best[result.type] || result.area < best[result.type].area) {
        best[result.type] = { node, area: result.area };
      }
    });
    return best;
  }

  function hideLegacyRows() {
    legacyScanQueued = false;
    const best = findBestLegacyRows();

    ['news', 'menu', 'nav'].forEach((type) => {
      const entry = best[type];
      if (!entry) return;
      entry.node.classList.add(HIDDEN_CLASS);
      entry.node.setAttribute('data-brian-option5-hidden', type);
      if (type === 'news') legacyNews = entry.node;
    });

    document.querySelectorAll([
      '#brian-option-two-shell',
      '#brian-option-two-global-shell',
      '#brian-option-five-shell',
      '#brian-option-five-canonical-shell',
      '.brian-option-two-shell',
      '.brian-option-two-global-shell',
      '.option-two-global-shell',
      '[data-nav-key="textlab"]'
    ].join(',')).forEach((node) => {
      if (!insideShell(node)) node.classList.add(HIDDEN_CLASS);
    });

    updateTickerFromLegacy();
  }

  function queueLegacyScan() {
    if (legacyScanQueued) return;
    legacyScanQueued = true;
    requestAnimationFrame(hideLegacyRows);
  }

  function findLegacyControl(labels) {
    const wanted = (Array.isArray(labels) ? labels : [labels]).map(normalize);
    const controls = document.querySelectorAll(
      'a, button, [role="button"], [tabindex]'
    );

    for (const node of controls) {
      if (insideShell(node)) continue;
      const text = normalize(node.textContent);
      if (!text) continue;
      if (
        wanted.some(
          (label) =>
            text === label ||
            text.startsWith(`${label} `) ||
            text.includes(label)
        )
      ) return node;
    }
    return null;
  }

  function go(item) {
    const proxy = findLegacyControl(item.aliases || [item.label]);
    if (proxy) {
      proxy.click();
      return;
    }

    if (item.fallback.startsWith('#')) {
      location.hash = item.fallback.slice(1);
    } else {
      location.assign(item.fallback);
    }
  }

  function activeLabel() {
    const current = normalize(`${location.pathname} ${location.hash}`);
    if (current.includes('nhan-su') || current.includes('personnel')) return 'Nhân sự';
    if (current.includes('homeroom') || current.includes('chu-nhiem')) return 'Chủ nhiệm';
    if (current.includes('department') || current.includes('to-chuyen-mon')) return 'Tổ chuyên môn';
    if (current.includes('thpt')) return 'Luyện thi THPT';
    if (current.includes('news') || current.includes('reader') || current.includes('doc-bao')) return 'Đọc báo';
    if (current.includes('game') || current.includes('tro-choi')) return 'Trò chơi';
    if (current.includes('apps') || current.includes('ung-dung')) return 'Ứng dụng';
    return 'Trang chủ';
  }

  function updateActive() {
    const shell = document.getElementById(SHELL_ID);
    if (!shell) return;
    const active = activeLabel();
    shell.querySelectorAll('[data-final-nav]').forEach((button) => {
      const selected = button.dataset.finalNav === active;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
  }

  function extractNewsItems() {
    const sources = [];

    if (legacyNews && legacyNews.isConnected) {
      legacyNews.querySelectorAll('a').forEach((link) => {
        const text = String(link.textContent || '').replace(/\s+/g, ' ').trim();
        const lower = normalize(text);
        if (
          text.length >= 18 &&
          !lower.includes('xem bản tin') &&
          !lower.includes('cập nhật')
        ) {
          sources.push({
            text,
            href: link.href || '#'
          });
        }
      });
    }

    const unique = [];
    const seen = new Set();
    sources.forEach((item) => {
      const key = normalize(item.text);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    if (!unique.length && legacyNews) {
      const text = String(legacyNews.textContent || '')
        .replace(/\s+/g, ' ')
        .replace(/tin vắn thời sự/ig, '')
        .replace(/xem bản tin/ig, '')
        .replace(/cập nhật\s*\d{1,2}:\d{2}/ig, '')
        .trim();
      if (text.length > 25) unique.push({ text, href: '#' });
    }

    return unique.slice(0, 12);
  }

  function updateTickerFromLegacy() {
    const runner = document.querySelector(`#${SHELL_ID} [data-final-ticker]`);
    if (!runner) return;

    const items = extractNewsItems();
    const safe = items.length
      ? items
      : [{
          text: 'Tin mới đang được cập nhật. Nhấn làm mới để lấy nội dung mới nhất.',
          href: '#'
        }];

    const markup = safe.map((item, index) => `
      <a class="final-ticker-item" href="${item.href}" ${item.href !== '#' ? 'target="_blank" rel="noopener noreferrer"' : ''}>
        <span class="final-ticker-source">${index % 3 === 0 ? 'THỜI SỰ' : index % 3 === 1 ? 'GIÁO DỤC' : 'THẾ GIỚI'}</span>
        <span>${item.text}</span>
        <i></i>
      </a>
    `).join('');

    runner.innerHTML = `<div class="final-ticker-group">${markup}</div><div class="final-ticker-group" aria-hidden="true">${markup}</div>`;
    runner.classList.toggle('is-static', safe.length < 2);
  }

  function openCommandPalette() {
    const proxy = findLegacyControl(['Tìm nhanh', 'Command K', '⌘K']);
    if (proxy) {
      proxy.click();
      return;
    }

    const methods = [
      window.openCommandPalette,
      window.__openCommandPalette,
      window.brianOpenCommandPalette
    ];

    for (const method of methods) {
      if (typeof method === 'function') {
        method();
        return;
      }
    }

    [
      'bes-command-palette-open',
      'brian:command-palette-open',
      'open-command-palette'
    ].forEach((name) => window.dispatchEvent(new CustomEvent(name)));
  }

  function navMarkup() {
    return NAV_ITEMS.map((item) => `
      <button type="button" class="final-nav-card tone-${item.tone}" data-final-nav="${item.label}">
        <span>${svg(item.icon)}</span>
        <strong>${item.label}</strong>
      </button>
    `).join('');
  }

  function shellMarkup() {
    return `
      <div class="final-news-row">
        <div class="final-news-label">
          <i></i>
          <strong>Tin vắn thời sự</strong>
          <time data-final-clock></time>
        </div>
        <div class="final-ticker-window">
          <div class="final-ticker-runner" data-final-ticker>
            <div class="final-ticker-group">
              <span class="final-ticker-placeholder">Đang đồng bộ tin mới…</span>
            </div>
          </div>
        </div>
        <div class="final-news-tools">
          <span data-final-news-time>Đang cập nhật</span>
          <button type="button" data-final-refresh aria-label="Làm mới">${svg('sync')}</button>
          <button type="button" data-final-news>Xem bản tin ${svg('chevron')}</button>
        </div>
      </div>

      <div class="final-menu-row">
        <div class="final-statuses">
          <button type="button" class="final-status status-green" data-final-proxy="Trung tâm thông báo">
            ${svg('brief')}
            <span><strong>0 việc hôm nay</strong><small>Trung tâm thông báo</small></span>
          </button>
          <button type="button" class="final-status status-blue" data-final-proxy="tài khoản">
            ${svg('user')}
            <span><strong>0 tài khoản</strong><small>Đang hoạt động</small></span>
          </button>
          <span class="final-status status-mint">
            ${svg('sync')}
            <span><strong>Đồng bộ live</strong><small>Đang bật</small></span>
            <i class="final-switch"></i>
          </span>
        </div>
        <div class="final-tools">
          <button type="button" data-final-proxy="Mở bảng thông báo" aria-label="Thông báo">${svg('bell')}<b>0</b></button>
          <button type="button" data-final-scale>A+ <strong>100%</strong></button>
          <button type="button" data-final-language>VI</button>
        </div>
      </div>

      <nav class="final-navigation" aria-label="Điều hướng chính">
        <button type="button" class="final-brand" data-final-brand>
          <span class="final-brand-mark">B</span>
          <strong>Brian English</strong>
        </button>

        <div class="final-nav-scroll">
          ${navMarkup()}
          <button type="button" class="final-nav-card tone-cream" data-final-more>
            <span>${svg('more')}</span><strong>Thêm</strong>
          </button>
        </div>

        <div class="final-nav-actions">
          <button type="button" class="final-search" data-final-search>
            ${svg('search')}<span>Tìm nhanh</span><kbd>⌘K</kbd>
          </button>
          <button type="button" class="final-profile" data-final-profile>
            <span class="final-avatar">T</span>${svg('down')}
          </button>
        </div>

        <div class="final-popover final-more-popover" data-final-more-popover hidden>
          <button type="button" data-final-menu-target="Cài đặt">${svg('settings')} Cài đặt</button>
          <button type="button" data-final-menu-target="Quản trị">${svg('user')} Quản trị hệ thống</button>
          <button type="button" data-final-menu-target="Trợ giúp">${svg('book')} Trợ giúp</button>
        </div>

        <div class="final-popover final-profile-popover" data-final-profile-popover hidden>
          <div class="final-profile-summary"><span class="final-avatar">T</span><span><strong>Anh Tuấn</strong><small>Giáo viên</small></span></div>
          <button type="button" data-final-menu-target="Hồ sơ">${svg('user')} Hồ sơ cá nhân</button>
          <button type="button" data-final-menu-target="Cài đặt">${svg('settings')} Cài đặt</button>
          <button type="button" data-final-menu-target="Thoát">${svg('logout')} Đăng xuất</button>
        </div>
      </nav>
    `;
  }

  function togglePopover(target) {
    document.querySelectorAll(`#${SHELL_ID} .final-popover`).forEach((popover) => {
      if (popover === target) popover.hidden = !popover.hidden;
      else popover.hidden = true;
    });
  }

  function bindShell(shell) {
    shell.querySelectorAll('[data-final-nav]').forEach((button) => {
      button.addEventListener('click', () => {
        const item = NAV_ITEMS.find((entry) => entry.label === button.dataset.finalNav);
        if (item) go(item);
      });
    });

    shell.querySelector('[data-final-brand]').addEventListener('click', () => go(NAV_ITEMS[0]));
    shell.querySelector('[data-final-search]').addEventListener('click', openCommandPalette);

    shell.querySelector('[data-final-news]').addEventListener('click', () => {
      const proxy = findLegacyControl(['Xem bản tin', 'Đọc báo']);
      if (proxy) proxy.click();
      else location.hash = '/tool/news-reader';
    });

    shell.querySelector('[data-final-refresh]').addEventListener('click', () => {
      const proxy = findLegacyControl(['Cập nhật', 'Làm mới']);
      if (proxy) proxy.click();
      setTimeout(updateTickerFromLegacy, 700);
    });

    shell.querySelector('[data-final-scale]').addEventListener('click', () => {
      const proxy = findLegacyControl(['A+ 100%', '100%']);
      if (proxy) proxy.click();
    });

    shell.querySelector('[data-final-language]').addEventListener('click', () => {
      const proxy = findLegacyControl('VI');
      if (proxy) proxy.click();
    });

    shell.querySelectorAll('[data-final-proxy]').forEach((button) => {
      button.addEventListener('click', () => {
        const proxy = findLegacyControl(button.dataset.finalProxy);
        if (proxy) proxy.click();
      });
    });

    shell.querySelector('[data-final-more]').addEventListener('click', (event) => {
      event.stopPropagation();
      togglePopover(shell.querySelector('[data-final-more-popover]'));
    });

    shell.querySelector('[data-final-profile]').addEventListener('click', (event) => {
      event.stopPropagation();
      togglePopover(shell.querySelector('[data-final-profile-popover]'));
    });

    shell.querySelectorAll('[data-final-menu-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const proxy = findLegacyControl(button.dataset.finalMenuTarget);
        if (proxy) proxy.click();
        togglePopover(null);
      });
    });

    document.addEventListener('click', (event) => {
      if (!shell.contains(event.target)) togglePopover(null);
    });

    window.addEventListener('hashchange', updateActive);
    updateActive();

    const clock = shell.querySelector('[data-final-clock]');
    const updateClock = () => {
      clock.textContent = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      const newsTime = shell.querySelector('[data-final-news-time]');
      newsTime.textContent = `Cập nhật ${clock.textContent}`;
    };
    updateClock();
    setInterval(updateClock, 30000);
  }

  function installStylesheetFallback() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HIDDEN_CLASS}{
        display:none!important;
        visibility:hidden!important;
        height:0!important;
        min-height:0!important;
        max-height:0!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        overflow:hidden!important;
        pointer-events:none!important
      }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    installStylesheetFallback();

    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
    document.documentElement.classList.remove('dark', 'dark-mode', 'theme-dark');

    let shell = document.getElementById(SHELL_ID);
    if (!shell) {
      shell = document.createElement('div');
      shell.id = SHELL_ID;
      shell.className = 'brian-option5-final-shell';
      shell.innerHTML = shellMarkup();

      const root = document.getElementById('root');
      if (root && root.parentNode) root.parentNode.insertBefore(shell, root);
      else document.body.prepend(shell);

      bindShell(shell);
    }

    hideLegacyRows();

    if (!observer) {
      observer = new MutationObserver(queueLegacyScan);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    clearInterval(tickerTimer);
    tickerTimer = setInterval(() => {
      hideLegacyRows();
      updateTickerFromLegacy();
    }, NEWS_REFRESH_MS);
  }

  function ensureMounted() {
    if (!document.getElementById(SHELL_ID)) mount();
    else hideLegacyRows();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  window.addEventListener('load', ensureMounted);
  setInterval(ensureMounted, 1500);

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'k') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openCommandPalette();
    }
    if (event.key === 'Escape') togglePopover(null);
  }, true);
})();
