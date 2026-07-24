const AI_REMOVED_ROUTES = new Set(['ai-workspace', 'ai-governance', 'prompt-studio', 'ai-tool']);
const AI_STORAGE_PREFIXES = ['bes-ai-hide-active-name-', 'brian-ai-chatbot', 'bes-chatbot'];
const REMOVE_SELECTORS = [
  '.ai-messenger-v10831', '.global-ai-indicator', '.universal-ai-assist',
  '.ai-copilot-panel', '.ai-smart-model-selector', '.api-notice',
  '.settings-v47-provider-card', '.settings-v47-security-card',
  '.settings-v65-provider-badges', '.settings-v47-ai-chip',
  '.settings-v47-provider-node', '.shared-chatbot-drawer',
  '.bes-chatbot-root', '.bes-chatbot-fab', '.bes-chatbot-launcher',
  '.chatbot-root', '.chatbot-fab', '.chatbot-launcher',
  '.floating-chatbot', '.floating-chatbot-button',
  '.ai-chatbot-fab', '.ai-chatbot-launcher',
  '.brian-ai-workspace', '.brian-ai-workspace-layer',
  '.brian-nav__ai-wrap', '.brian-nav__ai-button',
  '[data-chatbot-root]', '[data-chatbot-launcher]',
  '[data-ai-chatbot-launcher]',
].join(',');
const ACTION_PATTERNS = [
  /\bbrian ai\b/i, /\bai copilot\b/i, /\bai assistant\b/i,
  /trợ lý ai/i, /không gian ai/i, /chat\s*bot/i,
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

function removeLegacyAiNodes(root = document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll(REMOVE_SELECTORS).forEach((node) => node.remove());
  root.querySelectorAll('button, a, [role="button"]').forEach((node) => {
    const text = `${node.textContent || ''} ${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`
      .replace(/\s+/g, ' ')
      .trim();
    if (text && ACTION_PATTERNS.some((pattern) => pattern.test(text))) node.remove();
  });
  document.documentElement.classList.remove('bes-ai-workspace-open');
}

function redirectRemovedRoute() {
  const route = String(location.hash || '').replace(/^#\/?/, '').split(/[?&]/)[0];
  if (AI_REMOVED_ROUTES.has(route)) location.hash = '#/home';
}

export function installAiRemovalGuard() {
  if (typeof window === 'undefined' || window.__BRIAN_AI_REMOVED__) return;
  window.__BRIAN_AI_REMOVED__ = true;
  document.documentElement.dataset.aiChatbot = 'removed';
  cleanStorage();
  redirectRemovedRoute();
  removeLegacyAiNodes();
  window.addEventListener('hashchange', redirectRemovedRoute);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches?.(REMOVE_SELECTORS)) node.remove();
        else removeLegacyAiNodes(node);
      }
    }));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('bes-ai-open', (event) => event.stopImmediatePropagation(), true);
  window.addEventListener('bes-chatbot-drawer-open', (event) => event.stopImmediatePropagation(), true);
}
