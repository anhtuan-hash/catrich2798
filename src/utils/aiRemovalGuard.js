const AI_REMOVED_ROUTES = new Set(['ai-workspace', 'ai-governance', 'prompt-studio', 'ai-tool']);
const CHATBOT_STORAGE_PREFIXES = ['brian-ai-chatbot', 'bes-chatbot'];
const REMOVE_SELECTORS = [
  '.ai-messenger-v10831', '.universal-ai-assist', '.ai-copilot-panel',
  '.shared-chatbot-drawer', '.bes-chatbot-root', '.bes-chatbot-fab',
  '.bes-chatbot-launcher', '.chatbot-root', '.chatbot-fab',
  '.chatbot-launcher', '.floating-chatbot', '.floating-chatbot-button',
  '.ai-chatbot-fab', '.ai-chatbot-launcher',
  '[data-chatbot-root]', '[data-chatbot-launcher]', '[data-ai-chatbot-launcher]',
];
const CHATBOT_ACTION_PATTERNS = [
  /chat\s*bot/i,
];

function cleanChatbotStorage() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || '';
      if (CHATBOT_STORAGE_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage is optional.
  }
}

function removeLegacyChatbot(root = document) {
  REMOVE_SELECTORS.forEach((selector) => root.querySelectorAll?.(selector).forEach((node) => node.remove()));
  root.querySelectorAll?.('button, a, [role="button"]').forEach((node) => {
    const text = `${node.textContent || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`
      .replace(/\s+/g, ' ')
      .trim();
    if (text && CHATBOT_ACTION_PATTERNS.some((pattern) => pattern.test(text))) node.remove();
  });
}

function redirectRemovedRoute() {
  const route = String(location.hash || '').replace(/^#\/?/, '').split(/[?&]/)[0];
  if (AI_REMOVED_ROUTES.has(route)) location.hash = '#/home';
}

function cleanupAtRouteBoundary() {
  redirectRemovedRoute();
  window.requestAnimationFrame(() => removeLegacyChatbot());
}

export function installAiRemovalGuard() {
  if (typeof window === 'undefined' || window.__BRIAN_AI_REMOVED__) return;
  window.__BRIAN_AI_REMOVED__ = true;
  document.documentElement.dataset.aiChatbot = 'removed';
  cleanChatbotStorage();
  cleanupAtRouteBoundary();

  // Performance-safe: the old guard watched the entire document and rescanned
  // every newly-added subtree. Route-boundary cleanup is enough because the AI
  // routes and launcher are retired from the product.
  window.addEventListener('hashchange', cleanupAtRouteBoundary);
  window.addEventListener('bes-chatbot-drawer-open', (event) => event.stopImmediatePropagation(), true);
}
