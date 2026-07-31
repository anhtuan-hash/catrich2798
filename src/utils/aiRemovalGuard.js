const LEGACY_AI_ROUTES = new Set(['ai-workspace', 'ai-governance', 'ai-tool']);
const OBSOLETE_STORAGE_PREFIXES = ['brian-ai-chatbot', 'bes-chatbot', 'bes-kira-chat'];

function cleanObsoleteChatStorage() {
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || '';
      if (OBSOLETE_STORAGE_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Browser storage is optional.
  }
}

function redirectLegacyRoute() {
  const route = String(location.hash || '').replace(/^#\/?/, '').split(/[?&]/)[0];
  if (LEGACY_AI_ROUTES.has(route)) location.hash = '#/home';
}

export function installAiRemovalGuard() {
  if (typeof window === 'undefined' || window.__BRIAN_AI_RUNTIME_GUARD__) return;
  window.__BRIAN_AI_RUNTIME_GUARD__ = true;
  document.documentElement.dataset.aiChatbot = 'openrouter';
  document.documentElement.dataset.aiProvider = 'openrouter';
  cleanObsoleteChatStorage();
  redirectLegacyRoute();
  window.addEventListener('hashchange', redirectLegacyRoute);
  window.dispatchEvent(new CustomEvent('bes-ai-runtime-ready', {
    detail: {
      provider: 'openrouter',
      gateway: '/api/ai',
      browserKeyStorage: false,
    },
  }));
}
