const SHELL_ID = 'brian-option-two-shell';
const RETIRED_CLASS = 'ot2-retired-shell';

const NAV_ITEMS = [
  { label: 'Trang chủ', fallback: '#/', icon: 'home' },
  { label: 'Ứng dụng', fallback: '#/apps', icon: 'apps' },
  { label: 'TextLab', fallback: '#/tool/textlab-template-library', icon: 'textlab' },
  { label: 'Đọc báo', fallback: '#/tool/news-reader', icon: 'news' },
  { label: 'Trò chơi', fallback: '#/games', icon: 'games' },
  { label: 'Thêm', fallback: '#/apps', icon: 'more' },
];

const NEWS_ITEMS = [
  { category: 'Thời sự', title: 'Điểm tin nổi bật trong ngày', target: 'Đọc báo' },
  { category: 'Giáo dục', title: 'Bản tin giáo dục và trường học', target: 'Đọc báo' },
  { category: 'Thế giới', title: 'Tin quốc tế đáng chú ý', target: 'Đọc báo' },
];

function icon(name) {
  const paths = {
    home: '<path d="M3 11.5 12 4l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5z"/>',
    apps: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    textlab: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 12h5M10 16h5"/>',
    news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h6M7 12h10M7 16h10M16 8h1"/>',
    games: '<path d="M8 8h8a5 5 0 0 1 4.5 7.2l-1.2 2.4a2 2 0 0 1-3.2.5L14 16h-4l-2.1 2.1a2 2 0 0 1-3.2-.5l-1.2-2.4A5 5 0 0 1 8 8z"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/>',
    more: '<path d="M5 12h14M12 5v14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    volume: '<path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    sync: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 2M18 15a7 7 0 0 1-12 2l-2-2"/>',
    chatbot: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    logout: '<path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/>',
    brief: '<path d="M4 6h16v13H4z"/><path d="M8 6V4h8v2M4 11h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.apps}</svg>`;
}

function normalizedText(node) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findLegacyControl(label) {
  const target = label.toLowerCase();
  const candidates = [...document.querySelectorAll('#root a, #root button, #root [role="button"]')];
  return candidates.find((node) => {
    if (node.closest(`#${SHELL_ID}`)) return false;
    const text = normalizedText(node);
    return text === target || text.startsWith(`${target} `) || text.includes(target);
  });
}

function navigate(label, fallback) {
  const legacy = findLegacyControl(label);
  if (legacy) {
    legacy.click();
    return;
  }
  if (fallback.startsWith('#')) window.location.hash = fallback.slice(1);
  else window.location.assign(fallback);
}

function activeNavLabel() {
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('textlab')) return 'TextLab';
  if (hash.includes('news') || hash.includes('reader') || hash.includes('doc-bao')) return 'Đọc báo';
  if (hash.includes('game') || hash.includes('tro-choi')) return 'Trò chơi';
  if (hash.includes('apps') || hash.includes('ung-dung')) return 'Ứng dụng';
  return 'Trang chủ';
}

function updateActiveNav(shell) {
  const active = activeNavLabel();
  shell.querySelectorAll('[data-ot2-nav]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.ot2Nav === active);
    button.setAttribute('aria-current', button.dataset.ot2Nav === active ? 'page' : 'false');
  });
}

function findRetiredShells() {
  const candidates = [...document.querySelectorAll('#root header, #root nav, #root section, #root > div > div, #root > div > section')];
  candidates.forEach((node) => {
    if (node.closest(`#${SHELL_ID}`)) return;
    const text = normalizedText(node);
    const rect = node.getBoundingClientRect();
    const isUtility = text.includes('trung tâm thông báo') && (text.includes('âm báo') || text.includes('đồng bộ live') || text.includes('mở bảng thông báo'));
    const isNavigation = text.includes('brian english') && text.includes('trang chủ') && text.includes('ứng dụng') && (text.includes('đọc báo') || text.includes('trò chơi'));
    if ((isUtility || isNavigation) && rect.height > 20 && rect.height < 260) {
      node.classList.add(RETIRED_CLASS);
      node.setAttribute('data-ot2-retired', isUtility ? 'utility' : 'navigation');
    }
  });
}

function lightOnly() {
  const root = document.documentElement;
  root.dataset.theme = 'light';
  root.classList.remove('dark', 'dark-mode', 'theme-dark');
  root.classList.add('light', 'theme-light', 'ot2-light-only');
  root.style.colorScheme = 'light';
  document.body?.classList.remove('dark', 'dark-mode', 'theme-dark');
  document.body?.classList.add('ot2-light-only');
  ['theme', 'appearance', 'color-theme', 'brian-theme'].forEach((key) => {
    try { localStorage.setItem(key, 'light'); } catch { /* optional */ }
  });
}

function shellMarkup() {
  const nav = NAV_ITEMS.map((item) => `
    <button class="ot2-nav-button" type="button" data-ot2-nav="${item.label}" data-label="${item.label}" data-fallback="${item.fallback}">
      <span class="ot2-nav-icon">${icon(item.icon)}</span><span>${item.label}</span>
    </button>`).join('');

  const news = NEWS_ITEMS.map((item) => `
    <button class="ot2-news-item" type="button" data-news-target="${item.target}">
      <span class="ot2-news-category">${item.category}</span>
      <span class="ot2-news-title">${item.title}</span>
      <span class="ot2-news-arrow">${icon('chevron')}</span>
    </button>`).join('');

  return `
    <div class="ot2-newsbar">
      <div class="ot2-news-label"><span class="ot2-live-dot"></span><strong>Tin vắn thời sự</strong><span class="ot2-time" data-ot2-clock></span></div>
      <div class="ot2-news-track">${news}</div>
      <button class="ot2-all-news" type="button" data-news-target="Đọc báo">Xem bản tin ${icon('chevron')}</button>
    </div>

    <div class="ot2-utilitybar">
      <button class="ot2-brand" type="button" data-ot2-brand>
        <span class="ot2-brand-mark">B</span>
        <span class="ot2-brand-copy"><strong>Brian English</strong><small>Teaching Workspace</small></span>
      </button>

      <div class="ot2-status-cluster">
        <button class="ot2-status-card is-success" type="button" data-control="Trung tâm thông báo">${icon('brief')}<span><strong>0 việc hôm nay</strong><small>Trung tâm thông báo</small></span></button>
        <button class="ot2-status-card" type="button" data-control="tài khoản">${icon('user')}<span><strong>0 tài khoản</strong><small>Đang hoạt động</small></span></button>
        <span class="ot2-sync-badge">${icon('sync')}<span><strong>Đồng bộ live</strong><small>Đang bật</small></span><i></i></span>
      </div>

      <div class="ot2-quick-tools">
        <button type="button" class="ot2-tool-button" data-control="Âm báo" aria-label="Âm báo">${icon('volume')}</button>
        <button type="button" class="ot2-tool-button" data-control="Mở bảng thông báo" aria-label="Thông báo">${icon('bell')}<span class="ot2-badge">0</span></button>
        <button type="button" class="ot2-scale-button">A+ <strong>100%</strong></button>
        <button type="button" class="ot2-language-button">VI</button>
      </div>
    </div>

    <div class="ot2-navbar">
      <div class="ot2-nav-tabs">${nav}</div>
      <div class="ot2-nav-actions">
        <button type="button" class="ot2-command" data-control="Tìm nhanh">${icon('search')}<span>Tìm nhanh</span><kbd>⌘K</kbd></button>
        <button type="button" class="ot2-chat" data-control="Chatbot">${icon('chatbot')}<span>Chatbot</span></button>
        <button type="button" class="ot2-user" data-control="Anh"><span class="ot2-user-avatar">T</span><span><strong>Anh Tuấn</strong><small>Giáo viên</small></span></button>
        <button type="button" class="ot2-logout" data-control="Thoát" aria-label="Thoát">${icon('logout')}</button>
      </div>
    </div>`;
}

function bindShell(shell) {
  shell.querySelectorAll('[data-ot2-nav]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.label, button.dataset.fallback));
  });
  shell.querySelector('[data-ot2-brand]')?.addEventListener('click', () => navigate('Trang chủ', '#/'));
  shell.querySelectorAll('[data-news-target]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.newsTarget, '#/tool/news-reader'));
  });
  shell.querySelectorAll('[data-control]').forEach((button) => {
    button.addEventListener('click', () => {
      const legacy = findLegacyControl(button.dataset.control);
      if (legacy) legacy.click();
    });
  });
  shell.querySelector('.ot2-scale-button')?.addEventListener('click', () => {
    const legacy = findLegacyControl('100%') || findLegacyControl('A+');
    if (legacy) legacy.click();
  });
  shell.querySelector('.ot2-language-button')?.addEventListener('click', () => {
    const legacy = findLegacyControl('VI');
    if (legacy) legacy.click();
  });

  const clock = shell.querySelector('[data-ot2-clock]');
  const tick = () => {
    if (!clock) return;
    clock.textContent = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  };
  tick();
  window.setInterval(tick, 30000);

  window.addEventListener('hashchange', () => updateActiveNav(shell));
  updateActiveNav(shell);
}

export function installOptionTwoShell() {
  const mount = () => {
    lightOnly();
    if (!document.getElementById(SHELL_ID)) {
      const shell = document.createElement('header');
      shell.id = SHELL_ID;
      shell.className = 'ot2-shell';
      shell.setAttribute('aria-label', 'Brian English Option 2 navigation');
      shell.innerHTML = shellMarkup();
      document.body.insertBefore(shell, document.body.firstChild);
      bindShell(shell);
    }

    findRetiredShells();
    const observer = new MutationObserver(() => {
      lightOnly();
      findRetiredShells();
    });
    const root = document.getElementById('root');
    if (root) observer.observe(root, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}
