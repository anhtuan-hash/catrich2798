const SHELL_ID = 'brian-option-five-canonical-shell';
const RETIRED_CLASS = 'brian-of5-retired';
const NEWS_CACHE_KEY = 'brian-option-five-news-v1';
const NEWS_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
const NEWS_REFRESH_INTERVAL = 10 * 60 * 1000;

const NEWS_CONFIG = [
  { category: 'Thời sự', rss: 'https://vnexpress.net/rss/thoi-su.rss' },
  { category: 'Giáo dục', rss: 'https://vnexpress.net/rss/giao-duc.rss' },
  { category: 'Thế giới', rss: 'https://vnexpress.net/rss/the-gioi.rss' },
];

const NAV_ITEMS = [
  { label: 'Trang chủ', aliases: ['Trang chủ'], fallback: '#/home', icon: 'home', tone: 'green' },
  { label: 'Ứng dụng', aliases: ['Ứng dụng'], fallback: '#/apps', icon: 'apps', tone: 'sage' },
  { label: 'Chủ nhiệm', aliases: ['Chủ nhiệm', 'Công tác chủ nhiệm'], fallback: '#/homeroom', icon: 'homeroom', tone: 'amber' },
  { label: 'Tổ chuyên môn', aliases: ['Tổ chuyên môn', 'Chuyên môn'], fallback: '#/department', icon: 'department', tone: 'violet' },
  { label: 'Nhân sự', aliases: ['Nhân sự'], fallback: '/nhan-su/index.html', icon: 'people', tone: 'blue' },
  { label: 'Luyện thi THPT', aliases: ['Luyện thi THPT'], fallback: '#/tool/thpt-exam-prep', icon: 'book', tone: 'orange' },
  { label: 'Đọc báo', aliases: ['Đọc báo', 'Newsroom'], fallback: '#/tool/news-reader', icon: 'news', tone: 'mint' },
  { label: 'Trò chơi', aliases: ['Trò chơi', 'Game Hub'], fallback: '#/games', icon: 'game', tone: 'rose' },
];

let newsRefreshTimer = null;
let retiredObserver = null;

function icon(name) {
  const paths = {
    home: '<path d="M3.5 11.2 12 4l8.5 7.2v8.3a1.5 1.5 0 0 1-1.5 1.5h-4.7v-6.2H9.7V21H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
    apps: '<rect x="3.8" y="3.8" width="6.2" height="6.2" rx="1.5"/><rect x="14" y="3.8" width="6.2" height="6.2" rx="1.5"/><rect x="3.8" y="14" width="6.2" height="6.2" rx="1.5"/><rect x="14" y="14" width="6.2" height="6.2" rx="1.5"/>',
    homeroom: '<circle cx="9" cy="8" r="3.4"/><circle cx="17" cy="9.2" r="2.6"/><path d="M3.6 20a5.4 5.4 0 0 1 10.8 0M14.2 15.2A4.5 4.5 0 0 1 20.4 20"/>',
    department: '<path d="m3 8.5 9-4.7 9 4.7-9 4.7z"/><path d="M6.5 10.5v5.2c2.8 2.1 8.2 2.1 11 0v-5.2M20.5 9v6"/>',
    people: '<circle cx="12" cy="7.5" r="3.6"/><path d="M5.2 21a6.8 6.8 0 0 1 13.6 0"/>',
    book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/>',
    news: '<path d="M4 3.5h16v17H4z"/><path d="M7 7h5M7 11h10M7 15h10M15 7h2"/>',
    game: '<path d="M8 8h8a5 5 0 0 1 4.5 7.2l-1.2 2.4a2 2 0 0 1-3.2.5L14 16h-4l-2.1 2.1a2 2 0 0 1-3.2-.5l-1.2-2.4A5 5 0 0 1 8 8z"/><path d="M8 11v4M6 13h4M16.5 11.8h.01M18.2 14.2h.01"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.8"/><path d="m20 20-4.6-4.6"/>',
    user: '<circle cx="12" cy="8" r="3.7"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 6.8-3 7.2-3 9h18c0-1.8-3-2.2-3-9"/><path d="M10 21h4"/>',
    sync: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 2M18 15a7 7 0 0 1-12 2l-2-2"/>',
    brief: '<rect x="3.5" y="6" width="17" height="14" rx="2"/><path d="M8 6V4h8v2M3.5 11h17"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m7 9 5 5 5-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logout: '<path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.apps}</svg>`;
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isInsideNewShell(node) {
  return Boolean(node?.closest?.(`#${SHELL_ID}`));
}

function findLegacyControl(labels) {
  const wanted = (Array.isArray(labels) ? labels : [labels]).map(normalize);
  const nodes = [...document.querySelectorAll('#root a, #root button, #root [role="button"]')];
  return nodes.find((node) => {
    if (isInsideNewShell(node)) return false;
    const text = normalize(node.textContent);
    return wanted.some((label) => text === label || text.startsWith(`${label} `) || text.includes(label));
  });
}

function navigate(itemOrLabel, fallback) {
  const item = typeof itemOrLabel === 'object'
    ? itemOrLabel
    : { label: itemOrLabel, aliases: [itemOrLabel], fallback };
  const legacy = findLegacyControl(item.aliases || [item.label]);
  if (legacy) {
    legacy.click();
    return;
  }
  const target = item.fallback || fallback || '#/home';
  if (target.startsWith('#')) {
    window.location.hash = target.slice(1);
  } else {
    window.location.assign(target);
  }
}

function activeLabel() {
  const hash = normalize(window.location.hash);
  const path = normalize(window.location.pathname);
  if (path.includes('nhan-su') || hash.includes('personnel') || hash.includes('nhan-su')) return 'Nhân sự';
  if (hash.includes('homeroom') || hash.includes('chu-nhiem')) return 'Chủ nhiệm';
  if (hash.includes('department') || hash.includes('to-chuyen-mon') || hash.includes('professional')) return 'Tổ chuyên môn';
  if (hash.includes('thpt')) return 'Luyện thi THPT';
  if (hash.includes('news') || hash.includes('reader') || hash.includes('doc-bao')) return 'Đọc báo';
  if (hash.includes('game') || hash.includes('tro-choi')) return 'Trò chơi';
  if (hash.includes('apps') || hash.includes('ung-dung')) return 'Ứng dụng';
  return 'Trang chủ';
}

function updateActiveNavigation(shell) {
  const active = activeLabel();
  shell.querySelectorAll('[data-of5-nav]').forEach((button) => {
    const selected = button.dataset.of5Nav === active;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-current', selected ? 'page' : 'false');
  });
}

function lightOnly() {
  const html = document.documentElement;
  html.dataset.theme = 'light';
  html.classList.remove('dark', 'dark-mode', 'theme-dark');
  html.classList.add('light', 'theme-light', 'of5-light-only');
  html.style.colorScheme = 'light';
  document.body?.classList.remove('dark', 'dark-mode', 'theme-dark');
  document.body?.classList.add('of5-light-only');
  ['theme', 'appearance', 'color-theme', 'brian-theme'].forEach((key) => {
    try { localStorage.setItem(key, 'light'); } catch { /* optional */ }
  });
}

function retireLegacyShells() {
  const labels = [
    'trang chủ', 'ứng dụng', 'chủ nhiệm', 'tổ chuyên môn',
    'nhân sự', 'đọc báo', 'trò chơi', 'textlab'
  ];

  document.querySelectorAll([
    '#brian-option-two-shell',
    '#brian-option-two-global-shell',
    '#brian-option-five-shell',
    '.brian-option-two-shell',
    '.brian-option-two-global-shell',
    '.option-two-global-shell',
    '[data-brian-option-two-shell]',
    '[data-brian-legacy-navigation]'
  ].join(',')).forEach((node) => {
    if (!isInsideNewShell(node)) node.classList.add(RETIRED_CLASS);
  });

  const candidates = [...document.querySelectorAll([
    'body > header', 'body > nav', 'body > section', 'body > div',
    '#root header', '#root nav', '#root [role="navigation"]',
    '#root > div > header', '#root > div > nav',
    '#root > div > section', '#root > div > div'
  ].join(','))];

  candidates.forEach((node) => {
    if (node.id === SHELL_ID || isInsideNewShell(node) || node.classList.contains(RETIRED_CLASS)) return;
    const rect = node.getBoundingClientRect();
    if (rect.height < 28 || rect.height > 300 || rect.width < 300) return;
    const text = normalize(node.textContent);
    const navHits = labels.reduce((count, label) => count + (text.includes(label) ? 1 : 0), 0);
    const looksLikeNews = text.includes('tin vắn thời sự') && (text.includes('xem bản tin') || text.includes('cập nhật'));
    const looksLikeUtility = text.includes('việc hôm nay') && text.includes('đồng bộ live');
    const looksLikeNavigation = navHits >= 3 && text.includes('trang chủ') && text.includes('ứng dụng');
    if (looksLikeNews || looksLikeUtility || looksLikeNavigation) {
      node.classList.add(RETIRED_CLASS);
      node.dataset.brianOf5Retired = looksLikeNews ? 'news' : looksLikeUtility ? 'menu' : 'navigation';
    }
  });
}

function cleanTitle(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function validUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function fetchWithTimeout(url, timeout = 9000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  return fetch(url, { cache: 'no-store', signal: controller.signal })
    .finally(() => window.clearTimeout(timer));
}

function parseRssXml(xmlText, config) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('RSS không hợp lệ');
  return [...doc.querySelectorAll('item')].slice(0, 8).map((item) => ({
    category: config.category,
    title: cleanTitle(item.querySelector('title')?.textContent),
    url: validUrl(item.querySelector('link')?.textContent),
    publishedAt: item.querySelector('pubDate')?.textContent || '',
  })).filter((item) => item.title && item.url);
}

function parseRssJson(payload, config) {
  if (!payload || payload.status !== 'ok' || !Array.isArray(payload.items)) return [];
  return payload.items.slice(0, 8).map((item) => ({
    category: config.category,
    title: cleanTitle(item.title),
    url: validUrl(item.link || item.guid),
    publishedAt: item.pubDate || '',
  })).filter((item) => item.title && item.url);
}

async function loadFeed(config) {
  const sources = [
    async () => {
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(config.rss)}`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error(`RSS JSON ${response.status}`);
      return parseRssJson(await response.json(), config);
    },
    async () => {
      const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(config.rss)}`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error(`Proxy ${response.status}`);
      return parseRssXml(await response.text(), config);
    },
    async () => {
      const response = await fetchWithTimeout(config.rss);
      if (!response.ok) throw new Error(`RSS ${response.status}`);
      return parseRssXml(await response.text(), config);
    },
  ];

  let error = null;
  for (const source of sources) {
    try {
      const items = await source();
      if (items.length) return items;
    } catch (nextError) {
      error = nextError;
    }
  }
  throw error || new Error('Không có dữ liệu');
}

function readNewsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || 'null');
    if (!cached || !Array.isArray(cached.items) || !cached.savedAt) return [];
    if (Date.now() - cached.savedAt > NEWS_CACHE_MAX_AGE) return [];
    return cached.items;
  } catch {
    return [];
  }
}

function saveNewsCache(items) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
  } catch {
    // Optional cache.
  }
}

function relativeTime(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return 'Tin mới';
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return 'Vừa đăng';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(time));
}

function newsItemMarkup(item) {
  const category = String(item.category || 'Tin mới');
  const title = String(item.title || '');
  const time = relativeTime(item.publishedAt);
  const url = String(item.url || '#');
  return `
    <a class="of5-ticker-item" href="${url}" target="_blank" rel="noopener noreferrer">
      <span class="of5-ticker-category">${category}</span>
      <span class="of5-ticker-title">${title}</span>
      <span class="of5-ticker-time">${time}</span>
      <i aria-hidden="true"></i>
    </a>`;
}

function renderTicker(shell, items) {
  const runner = shell.querySelector('[data-of5-news-runner]');
  if (!runner) return;
  const safeItems = items.length ? items.slice(0, 15) : [{
    category: 'Brian English',
    title: 'Không thể cập nhật tin mới. Nhấn nút làm mới để thử lại.',
    url: '#',
    publishedAt: '',
  }];
  const group = `<div class="of5-ticker-group">${safeItems.map(newsItemMarkup).join('')}</div>`;
  runner.innerHTML = group + group;
  runner.classList.toggle('is-static', safeItems.length < 2);
}

function updateNewsStatus(shell, text, loading = false) {
  const node = shell.querySelector('[data-of5-news-status]');
  const refresh = shell.querySelector('[data-of5-refresh]');
  if (node) node.textContent = text;
  if (refresh) {
    refresh.disabled = loading;
    refresh.classList.toggle('is-loading', loading);
  }
}

async function refreshNews(shell, force = false) {
  if (!shell || shell.dataset.newsLoading === 'true') return;
  shell.dataset.newsLoading = 'true';
  updateNewsStatus(shell, 'Đang cập nhật', true);

  const cached = readNewsCache();
  if (cached.length && !force) renderTicker(shell, cached);

  const results = await Promise.allSettled(NEWS_CONFIG.map(loadFeed));
  const items = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const unique = [];
  const seen = new Set();

  items
    .sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0))
    .forEach((item) => {
      const key = normalize(item.title);
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

  if (unique.length) {
    renderTicker(shell, unique);
    saveNewsCache(unique);
    updateNewsStatus(shell, `Cập nhật ${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`);
  } else if (cached.length) {
    renderTicker(shell, cached);
    updateNewsStatus(shell, 'Đang dùng tin đã lưu');
  } else {
    renderTicker(shell, []);
    updateNewsStatus(shell, 'Chưa thể cập nhật');
  }

  shell.dataset.newsLoading = 'false';
}

function navMarkup() {
  return NAV_ITEMS.map((item) => `
    <button type="button" class="of5-nav-card tone-${item.tone}" data-of5-nav="${item.label}">
      <span class="of5-nav-icon">${icon(item.icon)}</span>
      <span class="of5-nav-label">${item.label}</span>
    </button>`).join('');
}

function shellMarkup() {
  return `
    <div class="of5-news">
      <div class="of5-news-label">
        <span class="of5-live-dot"></span>
        <strong>Tin vắn thời sự</strong>
        <span data-of5-clock></span>
      </div>
      <div class="of5-ticker-viewport" aria-live="polite">
        <div class="of5-ticker-runner" data-of5-news-runner>
          <div class="of5-ticker-group">
            <span class="of5-ticker-loading">Đang tải những tin mới nhất…</span>
          </div>
        </div>
      </div>
      <div class="of5-news-actions">
        <span data-of5-news-status>Đang khởi tạo</span>
        <button type="button" class="of5-icon-button" data-of5-refresh aria-label="Cập nhật tin">${icon('sync')}</button>
        <button type="button" class="of5-news-button" data-of5-open-news>Xem bản tin ${icon('chevron')}</button>
      </div>
    </div>

    <div class="of5-menu">
      <div class="of5-menu-status">
        <button type="button" class="of5-menu-chip chip-green" data-control="Trung tâm thông báo">
          ${icon('brief')}<span><strong>0 việc hôm nay</strong><small>Trung tâm thông báo</small></span>
        </button>
        <button type="button" class="of5-menu-chip chip-blue" data-control="tài khoản">
          ${icon('user')}<span><strong>0 tài khoản</strong><small>Đang hoạt động</small></span>
        </button>
        <span class="of5-menu-chip chip-mint">
          ${icon('sync')}<span><strong>Đồng bộ live</strong><small>Đang bật</small></span><i class="of5-switch"></i>
        </span>
      </div>
      <div class="of5-menu-tools">
        <button type="button" class="of5-small-tool" data-control="Mở bảng thông báo" aria-label="Thông báo">${icon('bell')}<b>0</b></button>
        <button type="button" class="of5-small-tool of5-scale">A+ <strong>100%</strong></button>
        <button type="button" class="of5-small-tool of5-language">VI</button>
      </div>
    </div>

    <nav class="of5-navigation" aria-label="Điều hướng chính">
      <button type="button" class="of5-brand" data-of5-brand aria-label="Về Trang chủ">
        <span class="of5-brand-mark"><span>B</span></span>
        <span>Brian English</span>
      </button>

      <div class="of5-nav-scroll">${navMarkup()}
        <button type="button" class="of5-nav-card tone-cream" data-of5-more>
          <span class="of5-nav-icon">${icon('more')}</span>
          <span class="of5-nav-label">Thêm</span>
        </button>
      </div>

      <div class="of5-navigation-actions">
        <button type="button" class="of5-search" data-of5-search>${icon('search')}<span>Tìm nhanh</span><kbd>⌘K</kbd></button>
        <button type="button" class="of5-profile" data-of5-profile>
          <span class="of5-avatar">T</span>
          <span class="of5-profile-name">Anh Tuấn</span>
          ${icon('down')}
        </button>
      </div>

      <div class="of5-popover of5-more-popover" data-of5-more-popover hidden>
        <button type="button" data-popover-target="Cài đặt">${icon('settings')}<span>Cài đặt</span></button>
        <button type="button" data-popover-target="Quản trị">${icon('people')}<span>Quản trị hệ thống</span></button>
        <button type="button" data-popover-target="Trợ giúp">${icon('book')}<span>Trợ giúp</span></button>
      </div>

      <div class="of5-popover of5-profile-popover" data-of5-profile-popover hidden>
        <div class="of5-profile-summary"><span class="of5-avatar">T</span><span><strong>Anh Tuấn</strong><small>Giáo viên</small></span></div>
        <button type="button" data-popover-target="Hồ sơ">${icon('user')}<span>Hồ sơ cá nhân</span></button>
        <button type="button" data-popover-target="Cài đặt">${icon('settings')}<span>Cài đặt</span></button>
        <button type="button" data-popover-target="Thoát">${icon('logout')}<span>Đăng xuất</span></button>
      </div>
    </nav>`;
}

function togglePopover(shell, target) {
  const popovers = [
    shell.querySelector('[data-of5-more-popover]'),
    shell.querySelector('[data-of5-profile-popover]'),
  ].filter(Boolean);

  popovers.forEach((popover) => {
    if (popover === target) popover.hidden = !popover.hidden;
    else popover.hidden = true;
  });
}

function openCommandPalette() {
  const legacyButton = findLegacyControl(['Tìm nhanh', 'Mở tìm kiếm', 'Command K', '⌘K']);
  if (legacyButton) { legacyButton.click(); return; }
  const globalOpeners = [window.openCommandPalette, window.__openCommandPalette, window.brianOpenCommandPalette];
  for (const opener of globalOpeners) {
    if (typeof opener === 'function') { opener(); return; }
  }
  ['bes-command-palette-open', 'brian:command-palette-open', 'open-command-palette']
    .forEach((name) => window.dispatchEvent(new CustomEvent(name)));
}

function bindShell(shell) {
  shell.querySelectorAll('[data-of5-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = NAV_ITEMS.find((entry) => entry.label === button.dataset.of5Nav);
      if (item) navigate(item);
    });
  });

  shell.querySelector('[data-of5-brand]')?.addEventListener('click', () => navigate(NAV_ITEMS[0]));
  shell.querySelector('[data-of5-open-news]')?.addEventListener('click', () => navigate('Đọc báo', '#/tool/news-reader'));
  shell.querySelector('[data-of5-refresh]')?.addEventListener('click', () => refreshNews(shell, true));
  shell.querySelector('[data-of5-search]')?.addEventListener('click', openCommandPalette);

  shell.querySelector('[data-of5-more]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePopover(shell, shell.querySelector('[data-of5-more-popover]'));
  });

  shell.querySelector('[data-of5-profile]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePopover(shell, shell.querySelector('[data-of5-profile-popover]'));
  });

  shell.querySelectorAll('[data-popover-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const label = button.dataset.popoverTarget;
      navigate(label, label === 'Thoát' ? '#/logout' : '#/apps');
      togglePopover(shell, null);
    });
  });

  shell.querySelectorAll('[data-control]').forEach((button) => {
    button.addEventListener('click', () => {
      const legacy = findLegacyControl(button.dataset.control);
      if (legacy) legacy.click();
    });
  });

  shell.querySelector('.of5-scale')?.addEventListener('click', () => {
    const legacy = findLegacyControl(['100%', 'A+']);
    if (legacy) legacy.click();
  });

  shell.querySelector('.of5-language')?.addEventListener('click', () => {
    const legacy = findLegacyControl('VI');
    if (legacy) legacy.click();
  });

  document.addEventListener('click', (event) => {
    if (!shell.contains(event.target)) {
      shell.querySelectorAll('.of5-popover').forEach((popover) => { popover.hidden = true; });
    }
  });

  const clock = shell.querySelector('[data-of5-clock]');
  const updateClock = () => {
    if (clock) {
      clock.textContent = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());
    }
  };
  updateClock();
  window.setInterval(updateClock, 30000);

  if (!window.__brianOptionFiveCommandKInstalled) {
    window.__brianOptionFiveCommandKInstalled = true;
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'k') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openCommandPalette();
      }
      if (event.key === 'Escape') {
        shell.querySelectorAll('.of5-popover').forEach((popover) => { popover.hidden = true; });
      }
    }, true);
  }

  window.addEventListener('hashchange', () => updateActiveNavigation(shell));
  updateActiveNavigation(shell);
}

function mountShell() {
  lightOnly();

  document.querySelectorAll([
    '#brian-option-two-shell',
    '#brian-option-two-global-shell',
    '#brian-option-five-shell',
    '#brian-option-five-canonical-shell',
    '.brian-option-two-shell',
    '.brian-option-two-global-shell',
    '.option-two-global-shell'
  ].join(',')).forEach((node) => node.remove());

  const shell = document.createElement('div');
  shell.id = SHELL_ID;
  shell.className = 'brian-option-five-shell';
  shell.innerHTML = shellMarkup();

  const root = document.getElementById('root');
  if (root?.parentNode) root.parentNode.insertBefore(shell, root);
  else document.body.prepend(shell);

  bindShell(shell);
  retireLegacyShells();
  refreshNews(shell, false);

  window.clearInterval(newsRefreshTimer);
  newsRefreshTimer = window.setInterval(() => refreshNews(shell, false), NEWS_REFRESH_INTERVAL);

  retiredObserver?.disconnect();
  retiredObserver = new MutationObserver(() => retireLegacyShells());
  retiredObserver.observe(document.getElementById('root') || document.body, {
    childList: true,
    subtree: true,
  });
}

export function installBrianOptionFiveCanonicalShell() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountShell, { once: true });
  } else {
    mountShell();
  }
}
