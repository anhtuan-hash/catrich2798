const STYLE_ID = 'bes-macos-motion-compat-style';
const SELECTOR = 'button,[role="button"],a.app-card,a.app-tile,.app-card,.app-tile,.tool-card,.game-card,.recent-app-card';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html[data-macos-motion="on"][data-macos-micro="on"] .bes-macos-preserve-transform:hover {
      transform: var(--bes-macos-original-transform) !important;
      translate: 0 calc(-3px * var(--macos-motion-intensity));
      scale: calc(1 + .012 * var(--macos-motion-intensity));
    }
    html[data-macos-motion="on"][data-macos-micro="on"] .bes-macos-preserve-transform:active {
      transform: var(--bes-macos-original-transform) !important;
      translate: 0 0;
      scale: calc(1 - .025 * var(--macos-motion-intensity));
    }
  `;
  document.head.appendChild(style);
}

function protect(element) {
  if (!(element instanceof Element) || element.classList.contains('bes-macos-preserve-transform')) return;
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === 'none') return;
  element.style.setProperty('--bes-macos-original-transform', transform);
  element.classList.add('bes-macos-preserve-transform');
}

function scan(root = document) {
  if (root instanceof Element && root.matches(SELECTOR)) protect(root);
  root.querySelectorAll?.(SELECTOR).forEach(protect);
}

function boot() {
  installStyle();
  scan();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node instanceof Element) scan(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
