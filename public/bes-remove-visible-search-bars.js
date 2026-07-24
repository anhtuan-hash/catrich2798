(() => {
  'use strict';

  const KEEP_SELECTOR = '.global-command-palette, .global-command-palette-layer, [data-bes-keep-search="true"]';
  const SEARCH_TEXT = /(search|find|lookup|query|tìm|tìm|tra\s*cứu|tra\s*cuu|lọc|lọc|filter)/i;
  const WRAPPER_TEXT = /(search|find|lookup|query|filter|tìm|tra-cuu|tra_cuu|loc)/i;
  const HARD_TARGETS = [
    '.brian-nav__search',
    '.brian-notification-center__search-row',
    '.brian-notification-center__search',
  ];

  const isKept = (node) => Boolean(node?.closest?.(KEEP_SELECTOR));

  const descriptor = (node) => [
    node?.getAttribute?.('type'),
    node?.getAttribute?.('role'),
    node?.getAttribute?.('placeholder'),
    node?.getAttribute?.('aria-label'),
    node?.getAttribute?.('name'),
    node?.id,
    node?.className,
  ].filter(Boolean).join(' ');

  const isSearchInput = (node) => {
    if (!(node instanceof HTMLInputElement) || isKept(node)) return false;
    const type = String(node.type || '').toLowerCase();
    if (type === 'search' || node.getAttribute('role') === 'searchbox') return true;
    return ['text', 'email', 'url', 'tel', ''].includes(type) && SEARCH_TEXT.test(descriptor(node));
  };

  const isSafeContainer = (node) => {
    if (!(node instanceof HTMLElement) || isKept(node)) return false;
    if (node === document.body || node === document.documentElement || node.id === 'root') return false;
    const fields = node.querySelectorAll('input, textarea, select');
    return fields.length <= 3;
  };

  const searchContainer = (input) => {
    let current = input;
    for (let depth = 0; depth < 5 && current?.parentElement; depth += 1) {
      current = current.parentElement;
      if (!isSafeContainer(current)) continue;
      const identity = `${current.className || ''} ${current.id || ''} ${current.getAttribute('role') || ''}`;
      if (current.matches('form, label, [role="search"]') || WRAPPER_TEXT.test(identity)) return current;
      if (current.children.length > 6) break;
    }
    return input;
  };

  const removeBar = (node) => {
    if (!(node instanceof HTMLElement) || isKept(node)) return;
    node.dataset.besSearchBarRemoved = 'true';
    node.setAttribute('aria-hidden', 'true');
    node.querySelectorAll('input, button, textarea, select').forEach((control) => {
      if (isKept(control)) return;
      control.tabIndex = -1;
    });
  };

  const sweep = (root = document) => {
    if (!(root instanceof Document || root instanceof DocumentFragment || root instanceof Element)) return;

    HARD_TARGETS.forEach((selector) => {
      if (root instanceof Element && root.matches(selector)) removeBar(root);
      root.querySelectorAll?.(selector).forEach(removeBar);
    });

    const inputs = [];
    if (root instanceof HTMLInputElement) inputs.push(root);
    root.querySelectorAll?.('input').forEach((input) => inputs.push(input));
    inputs.filter(isSearchInput).forEach((input) => removeBar(searchContainer(input)));

    const searchRoles = [];
    if (root instanceof Element && root.matches('[role="search"]')) searchRoles.push(root);
    root.querySelectorAll?.('[role="search"]').forEach((node) => searchRoles.push(node));
    searchRoles.forEach((node) => {
      if (!isKept(node) && node.querySelector('input')) removeBar(node);
    });
  };

  const start = () => {
    sweep(document);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) sweep(node);
      }));
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__besSearchBarRemovalObserver = observer;
    window.addEventListener('hashchange', () => window.setTimeout(() => sweep(document), 0));
    window.addEventListener('bes-command-palette-open', () => window.setTimeout(() => sweep(document), 0));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
