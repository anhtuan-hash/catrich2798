/* Brian English · Option 2 shell — single live news ticker */
const OPTION_TWO_SHELL_ID = 'brian-option-two-global-shell';
const NEWS_CACHE_KEY = 'brian-option2-single-news-cache-v1';
const ROUTES = {"home": "#/home", "apps": "#/apps", "homeroom": "#/utils/homeroomStore.js", "department": "#/utils/departmentStore.js", "news": "#/tool/news-reader", "games": "#/www.baamboozle.com/games", "more": "#/apps"};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const routeTo = (route) => {
  if (!route) return;
  if (/^https?:\/\//i.test(route)) {
    window.location.assign(route);
    return;
  }
  if (route.startsWith('#')) {
    window.location.hash = route.slice(1);
    return;
  }
  window.location.assign(route);
};

const formatClock = () => new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date());

const formatPublished = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
};

const findLegacyNotificationBar = () => {
  const keys = ['trung tâm thông báo', 'việc hôm nay', 'tài khoản chờ duyệt', 'mở bảng thông báo'];
  const nodes = [...document.querySelectorAll('body *')]
    .filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.closest(`#${OPTION_TWO_SHELL_ID}`)) return false;
      const text = (node.innerText || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (!text || text.length > 900) return false;
      return keys.every((key) => text.includes(key));
    })
    .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);

  const candidate = nodes[0];
  if (!candidate) return false;
  candidate.classList.add('brian-retired-notification-control-bar');
  candidate.setAttribute('aria-hidden', 'true');
  return true;
};

const suppressLegacyNotificationBar = () => {
  findLegacyNotificationBar();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    findLegacyNotificationBar();
    if (attempts >= 20) window.clearInterval(timer);
  }, 400);
};

const navItems = [
  ['home', '⌂', 'Trang chủ', ROUTES.home],
  ['apps', '▦', 'Ứng dụng', ROUTES.apps],
  ['homeroom', '♙', 'Chủ nhiệm', ROUTES.homeroom],
  ['department', '◇', 'Tổ chuyên môn', ROUTES.department],
  ['textlab', '▣', 'TextLab', '#/tool/textlab-template-library'],
  ['news', '▤', 'Đọc báo', ROUTES.news],
  ['games', '⌘', 'Trò chơi', ROUTES.games],
  ['more', '+', 'Thêm', ROUTES.more],
];

const makeNav = () => navItems.map(([key, icon, label, route]) => `
  <button type="button" class="brian-o2-nav-button" data-nav-key="${key}" data-route="${escapeHtml(route)}">
    <span aria-hidden="true">${icon}</span><b>${label}</b>
  </button>`).join('');

const renderTickerItems = (items) => {
  const safeItems = Array.isArray(items) && items.length ? items : [{
    title: 'Đang cập nhật tin vắn mới nhất…', url: ROUTES.news, publishedAt: '', source: 'Brian English',
  }];
  const group = safeItems.map((item) => `
    <a class="brian-o2-news-item" href="${escapeHtml(item.url || ROUTES.news)}" target="_blank" rel="noopener noreferrer">
      <span class="brian-o2-news-source">${escapeHtml(item.source || 'Tin mới')}</span>
      <span class="brian-o2-news-title">${escapeHtml(item.title)}</span>
      ${item.publishedAt ? `<time>${escapeHtml(formatPublished(item.publishedAt))}</time>` : ''}
    </a><span class="brian-o2-news-separator" aria-hidden="true">◆</span>`).join('');
  return `<div class="brian-o2-news-group">${group}</div><div class="brian-o2-news-group" aria-hidden="true">${group}</div>`;
};

const loadNews = async (shell, force = false) => {
  const track = shell.querySelector('[data-news-track]');
  const updated = shell.querySelector('[data-news-updated]');
  const refresh = shell.querySelector('[data-news-refresh]');
  refresh?.classList.add('is-loading');

  try {
    const response = await fetch(`/api/news-brief?limit=14${force ? `&t=${Date.now()}` : ''}`, {
      cache: 'no-store', headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items.filter((item) => item?.title) : [];
    if (!items.length) throw new Error('Không có dữ liệu tin');
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
    track.innerHTML = renderTickerItems(items);
    const chars = items.reduce((sum, item) => sum + String(item.title || '').length, 0);
    const mobileFactor = window.innerWidth < 760 ? 0.28 : 0.20;
    track.style.setProperty('--brian-news-duration', `${Math.max(42, Math.round(chars * mobileFactor))}s`);
    updated.textContent = `Cập nhật ${formatClock()}`;
  } catch (error) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || 'null'); } catch { cached = null; }
    if (cached?.items?.length) {
      track.innerHTML = renderTickerItems(cached.items);
      updated.textContent = 'Tin đã lưu gần nhất';
    } else {
      track.innerHTML = renderTickerItems([]);
      updated.textContent = 'Chưa thể cập nhật';
    }
  } finally {
    refresh?.classList.remove('is-loading');
  }
};

const updateActiveNavigation = (shell) => {
  const hash = window.location.hash.toLowerCase();
  shell.querySelectorAll('.brian-o2-nav-button').forEach((button) => {
    const key = button.dataset.navKey;
    const active =
      (key === 'home' && (hash.includes('/home') || hash === '' || hash === '#/')) ||
      (key === 'apps' && hash.includes('/apps')) ||
      (key === 'homeroom' && /homeroom|chu-nhiem|chunhiem/.test(hash)) ||
      (key === 'department' && /department|to-chuyen-mon|tochuyenmon/.test(hash)) ||
      (key === 'textlab' && hash.includes('textlab-template-library')) ||
      (key === 'news' && /news|doc-bao|newsroom/.test(hash)) ||
      (key === 'games' && /game|tro-choi/.test(hash));
    button.classList.toggle('is-active', Boolean(active));
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
};

export function installOptionTwoGlobalShell() {
  const mount = () => {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
    document.body.classList.add('brian-option-two-shell-active');
    document.getElementById(OPTION_TWO_SHELL_ID)?.remove();

    const shell = document.createElement('header');
    shell.id = OPTION_TWO_SHELL_ID;
    shell.className = 'brian-option-two-shell';
    shell.innerHTML = `
      <section class="brian-o2-newsbar" aria-label="Tin vắn thời sự">
        <div class="brian-o2-news-label"><i></i><strong>TIN VẮN THỜI SỰ</strong><time data-clock>${formatClock()}</time></div>
        <div class="brian-o2-news-viewport">
          <div class="brian-o2-news-track" data-news-track>${renderTickerItems([])}</div>
        </div>
        <div class="brian-o2-news-actions">
          <span data-news-updated>Đang cập nhật</span>
          <button type="button" data-news-refresh aria-label="Cập nhật tin">↻</button>
          <button type="button" data-open-news>Xem bản tin ›</button>
        </div>
      </section>

      <section class="brian-o2-utilitybar">
        <button type="button" class="brian-o2-brand" data-route="${escapeHtml(ROUTES.home)}">
          <span>B</span><span><strong>Brian English</strong><small>Teaching Workspace</small></span>
        </button>
        <div class="brian-o2-utility-status">
          <div><span class="is-green">▣</span><b>0 việc hôm nay</b><small>Trung tâm thông báo</small></div>
          <div><span>♙</span><b>0 tài khoản</b><small>Đang hoạt động</small></div>
          <div><span>↻</span><b>Đồng bộ live</b><small>Đang bật</small><i></i></div>
        </div>
        <div class="brian-o2-utility-actions">
          <button type="button" aria-label="Âm thanh">◖</button>
          <button type="button" aria-label="Thông báo">♧<sup>0</sup></button>
          <button type="button" class="is-accent">A+ 100%</button>
          <button type="button">VI</button>
        </div>
      </section>

      <nav class="brian-o2-navigation" aria-label="Điều hướng chính">
        <div class="brian-o2-nav-list">${makeNav()}</div>
        <div class="brian-o2-nav-tools">
          <button type="button" class="brian-o2-search">⌕ <span>Tìm nhanh</span><kbd>⌘K</kbd></button>
          <button type="button" class="brian-o2-chatbot">▣ <span>Chatbot</span></button>
          <button type="button" class="brian-o2-profile"><i>T</i><span><b>Anh Tuấn</b><small>Giáo viên</small></span></button>
          <button type="button" class="brian-o2-logout" aria-label="Thoát">⇥</button>
        </div>
      </nav>`;

    const root = document.getElementById('root');
    if (root) root.before(shell); else document.body.prepend(shell);

    shell.addEventListener('click', (event) => {
      const routeTarget = event.target.closest('[data-route]');
      if (routeTarget) routeTo(routeTarget.dataset.route);
      if (event.target.closest('[data-open-news]')) routeTo(ROUTES.news);
      if (event.target.closest('[data-news-refresh]')) loadNews(shell, true);
      if (event.target.closest('.brian-o2-search')) window.dispatchEvent(new CustomEvent('bes-command-palette-open'));
    });


    if (!window.__brianCommandKBridgeInstalled) {
      window.__brianCommandKBridgeInstalled = true;
      document.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 'k') {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.dispatchEvent(new CustomEvent('bes-command-palette-open'));
        }
      }, true);
    }

    updateActiveNavigation(shell);
    loadNews(shell);
    suppressLegacyNotificationBar();

    window.addEventListener('hashchange', () => updateActiveNavigation(shell), { passive: true });
    window.setInterval(() => {
      const clock = shell.querySelector('[data-clock]');
      if (clock) clock.textContent = formatClock();
    }, 30000);
    window.setInterval(() => loadNews(shell), 10 * 60 * 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}

export const initOptionTwoGlobalShell = installOptionTwoGlobalShell;
export const initializeOptionTwoGlobalShell = installOptionTwoGlobalShell;
export const mountOptionTwoGlobalShell = installOptionTwoGlobalShell;
export const startOptionTwoGlobalShell = installOptionTwoGlobalShell;
export const installOptionTwoShell = installOptionTwoGlobalShell;
export default installOptionTwoGlobalShell;
