const RECOVERY_STYLE_ID = 'brian-notification-recovery-style';
const RECOVERY_NODE_ATTR = 'data-brian-notification-recovery';
const REQUEST_HINTS = [
  'notification', 'notifications', 'notification-center', 'notification_center',
  'announcement', 'announcements', 'inbox', 'youtube-notification', 'youtube_notifications',
];

let notificationWindowUntil = 0;
let originalFetch = null;
let observer = null;
let scanTimer = null;

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function activateNotificationWindow(duration = 30000) {
  notificationWindowUntil = Math.max(notificationWindowUntil, Date.now() + duration);
}

function requestUrl(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input?.url || '';
}

function isNotificationRequest(input) {
  if (Date.now() > notificationWindowUntil) return false;
  const url = normalize(requestUrl(input));
  return REQUEST_HINTS.some((hint) => url.includes(hint));
}

function fallbackPayload(url) {
  const lowered = normalize(url);
  if (lowered.includes('/rest/v1/') || lowered.includes('supabase')) return [];
  if (lowered.includes('firebase') || lowered.endsWith('.json')) return {};
  return { data: [], items: [], notifications: [], total: 0, unread: 0 };
}

function fallbackResponse(url, reason = 'timeout') {
  const payload = fallbackPayload(url);
  return new Response(JSON.stringify(payload), {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Range': '*/0',
      'X-Brian-Notification-Recovery': reason,
    },
  });
}

function installFetchRecovery() {
  if (originalFetch || typeof window.fetch !== 'function') return;
  originalFetch = window.fetch.bind(window);

  window.fetch = async function brianNotificationFetch(input, init) {
    if (!isNotificationRequest(input)) return originalFetch(input, init);

    const url = requestUrl(input);
    const controller = new AbortController();
    const inheritedSignal = init?.signal;
    const timeout = window.setTimeout(() => controller.abort('notification-timeout'), 10000);

    if (inheritedSignal) {
      if (inheritedSignal.aborted) controller.abort(inheritedSignal.reason);
      else inheritedSignal.addEventListener('abort', () => controller.abort(inheritedSignal.reason), { once: true });
    }

    try {
      const response = await originalFetch(input, { ...init, signal: controller.signal });
      if (response.status >= 500) return fallbackResponse(url, `http-${response.status}`);
      return response;
    } catch (error) {
      console.warn('[Brian notifications] Request recovered:', url, error);
      return fallbackResponse(url, error?.name === 'AbortError' ? 'timeout' : 'network-error');
    } finally {
      window.clearTimeout(timeout);
    }
  };
}

function isNotificationButton(node) {
  if (!(node instanceof Element)) return false;
  const text = normalize(`${node.textContent || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`);
  return text.includes('thong bao') || text.includes('notification');
}

function findPanel() {
  const candidates = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"], aside, section, div')];
  return candidates
    .filter((node) => {
      const text = normalize(node.textContent);
      return text.includes('thong bao') && (
        text.includes('tat ca') || text.includes('can xu ly') || text.includes('he thong') || text.includes('youtube')
      );
    })
    .sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width)
    .find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 320 && rect.height > 240 && rect.right > window.innerWidth * 0.55;
    }) || null;
}

function findLoadingNode(panel) {
  return [...panel.querySelectorAll('p,span,div,strong')].find((node) => {
    const text = normalize(node.textContent);
    return text === 'dang tai thong bao...' || text === 'dang tai thong bao' || text.includes('dang tai thong bao');
  }) || null;
}

function readPanelCount(panel) {
  const header = [...panel.querySelectorAll('h1,h2,h3,strong,b,span')]
    .find((node) => normalize(node.textContent).startsWith('thong bao'));
  const nearby = normalize(header?.parentElement?.textContent || panel.textContent);
  const match = nearby.match(/thong bao\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function findLegacyOpenButton(panel) {
  return [...document.querySelectorAll('button,[role="button"]')].find((node) => {
    if (panel.contains(node)) return false;
    const text = normalize(`${node.textContent || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`);
    return text.includes('mo bang thong bao') || text === 'thong bao' || text.includes('notification');
  }) || null;
}

function findCloseButton(panel) {
  return [...panel.querySelectorAll('button,[role="button"]')].find((node) => {
    const label = normalize(`${node.textContent || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`);
    return label === 'x' || label.includes('dong') || label.includes('close');
  }) || null;
}

function dispatchRefreshEvents() {
  activateNotificationWindow();
  [
    'brian:notifications:refresh',
    'brian:notification-center:refresh',
    'notifications:refresh',
    'notification:refresh',
  ].forEach((name) => window.dispatchEvent(new CustomEvent(name, { detail: { source: 'recovery' } })));
}

function retryPanel(panel) {
  panel.querySelector(`[${RECOVERY_NODE_ATTR}]`)?.remove();
  dispatchRefreshEvents();

  const close = findCloseButton(panel);
  const opener = findLegacyOpenButton(panel);
  if (close && opener) {
    close.click();
    window.setTimeout(() => {
      activateNotificationWindow();
      opener.click();
    }, 250);
  } else {
    window.setTimeout(scanPanels, 1200);
  }
}

function makeRecoveryCard(panel) {
  if (panel.querySelector(`[${RECOVERY_NODE_ATTR}]`)) return;
  const count = readPanelCount(panel);
  const empty = count === 0;

  const card = document.createElement('section');
  card.setAttribute(RECOVERY_NODE_ATTR, 'true');
  card.className = 'brian-notification-recovery-card';
  card.innerHTML = `
    <div class="brian-notification-recovery-icon">${empty ? '✓' : '!'}</div>
    <h3>${empty ? 'Chưa có thông báo mới' : 'Chưa tải được thông báo'}</h3>
    <p>${empty
      ? 'Hệ thống đã kiểm tra nhưng hiện chưa có nội dung cần hiển thị.'
      : 'Kết nối lấy thông báo phản hồi quá lâu. Bạn có thể thử tải lại mà không cần làm mới toàn bộ trang.'}</p>
    <button type="button">↻ Tải lại dữ liệu</button>
    <small>Nếu dữ liệu vẫn chưa xuất hiện, hãy kiểm tra cấu hình Supabase/Firebase và quyền truy cập của tài khoản.</small>
  `;
  card.querySelector('button')?.addEventListener('click', () => retryPanel(panel));

  const body = findLoadingNode(panel)?.parentElement || panel;
  body.style.position = body.style.position || 'relative';
  body.appendChild(card);
}

function watchPanel(panel) {
  if (panel.dataset.brianNotificationWatched === 'true') return;
  panel.dataset.brianNotificationWatched = 'true';
  activateNotificationWindow();
  dispatchRefreshEvents();

  window.setTimeout(() => {
    if (!panel.isConnected) return;
    if (findLoadingNode(panel)) makeRecoveryCard(panel);
  }, 9000);
}

function scanPanels() {
  const panel = findPanel();
  if (panel) watchPanel(panel);
}

function installClickActivation() {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button,[role="button"],a') : null;
    if (target && isNotificationButton(target)) {
      activateNotificationWindow();
      window.setTimeout(scanPanels, 100);
      window.setTimeout(scanPanels, 800);
    }
  }, true);
}

function installObserver() {
  if (observer) return;
  observer = new MutationObserver(() => {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scanPanels, 120);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export function installNotificationCenterRecovery() {
  installFetchRecovery();
  installClickActivation();

  const mount = () => {
    installObserver();
    scanPanels();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}
