(() => {
  const selectors = [
    '.bes-chatbot-root', '.bes-chatbot-fab', '.bes-chatbot-launcher',
    '.chatbot-root', '.chatbot-fab', '.chatbot-launcher',
    '.floating-chatbot', '.floating-chatbot-button',
    '.ai-chatbot-fab', '.ai-chatbot-launcher',
    '.brian-ai-workspace', '.brian-ai-workspace-layer',
    '.brian-nav__ai-wrap', '.brian-nav__ai-button',
    '[data-chatbot-root]', '[data-chatbot-launcher]', '[data-ai-chatbot-launcher]',
  ].join(',');
  const purge = (root = document) => root.querySelectorAll?.(selectors).forEach((node) => node.remove());
  const start = () => {
    purge();
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches?.(selectors)) node.remove();
      else purge(node);
    })));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
