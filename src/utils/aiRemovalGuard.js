const AI_REMOVED_ROUTES = new Set(['ai-workspace', 'ai-governance', 'prompt-studio', 'ai-tool']);
const AI_STORAGE_PREFIXES = ['bes-ai-', 'brian-ai', 'openrouter', 'ai-provider'];
const REMOVE_SELECTORS = [
  '.ai-messenger-v10831', '.global-ai-indicator', '.universal-ai-assist',
  '.ai-copilot-panel', '.ai-smart-model-selector', '.api-notice',
  '[data-ai-feature]', '[data-provider="openrouter"]',
  '.settings-v47-provider-card', '.settings-v47-security-card',
  '.settings-v65-provider-badges', '.settings-v47-ai-chip',
  '.settings-v47-provider-node', '.shared-chatbot-drawer',
];
const ACTION_PATTERNS = [
  /\bopenrouter\b/i, /\bai provider\b/i, /\bapi key\b/i,
  /\bbrian ai\b/i, /\bai copilot\b/i, /\bai assistant\b/i,
  /trợ lý ai/i, /quản trị ai/i, /không gian ai/i, /kết nối ai/i,
  /dùng ai/i, /tạo bằng ai/i, /phân tích bằng ai/i, /ai đọc/i,
  /ai hỗ trợ/i, /ai sẵn sàng/i, /ask ai/i, /open ai/i,
];

function cleanStorage() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || '';
      if (AI_STORAGE_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage is optional.
  }
}

function removeVisibleAiControls(root = document) {
  REMOVE_SELECTORS.forEach((selector) => root.querySelectorAll?.(selector).forEach((node) => node.remove()));
  root.querySelectorAll?.('button, a, [role="button"], label').forEach((node) => {
    const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
    if (text && ACTION_PATTERNS.some((pattern) => pattern.test(text))) node.remove();
  });
}

function redirectRemovedRoute() {
  const route = String(location.hash || '').replace(/^#\/?/, '').split(/[?&]/)[0];
  if (AI_REMOVED_ROUTES.has(route)) location.hash = '#/home';
}

export function installAiRemovalGuard() {
  if (typeof window === 'undefined' || window.__BRIAN_AI_REMOVED__) return;
  window.__BRIAN_AI_REMOVED__ = true;
  document.documentElement.dataset.ai = 'removed';
  cleanStorage();
  redirectRemovedRoute();
  removeVisibleAiControls();
  window.addEventListener('hashchange', redirectRemovedRoute);
  const observer = new MutationObserver(() => removeVisibleAiControls());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('bes-ai-open', (event) => event.stopImmediatePropagation(), true);
  window.addEventListener('bes-chatbot-drawer-open', (event) => event.stopImmediatePropagation(), true);
}
