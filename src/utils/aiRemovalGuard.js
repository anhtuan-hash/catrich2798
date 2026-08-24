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
const REMOVE_SELECTOR = REMOVE_SELECTORS.join(',');
const CHATBOT_ACTION_PATTERNS = [/chat\s*bot/i];

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

function removeKnownChatbotNodes(root = document) {
  if (root instanceof Element && root.matches?.(REMOVE_SELECTOR)) {
    root.remove();
    return;
  }
  root.querySelectorAll?.(REMOVE_SELECTOR).forEach((node) => node.remove());
}

function removeLegacyChatbotActionsOnce(root = document) {
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

export function installAiRemovalGuard() {
  if (typeof window === 'undefined' || window.__BRIAN_AI_REMOVED__) return;
  window.__BRIAN_AI_REMOVED__ = true;
  document.documentElement.dataset.aiChatbot = 'removed';
  cleanChatbotStorage();
  redirectRemovedRoute();

  // Expensive text matching is only needed once for legacy markup already in
  // the document. Future mutations are checked against precise selectors only.
  removeKnownChatbotNodes();
  removeLegacyChatbotActionsOnce();

  window.addEventListener('hashchange', redirectRemovedRoute);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) removeKnownChatbotNodes(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('bes-chatbot-drawer-open', (event) => event.stopImmediatePropagation(), true);
}
