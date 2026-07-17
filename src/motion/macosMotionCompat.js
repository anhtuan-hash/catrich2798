const STYLE_ID = 'bes-macos-motion-compat-style';
const SELECTOR = 'button,[role="button"],a.app-card,a.app-tile,.app-card,.app-tile,.tool-card,.game-card,.recent-app-card';

function applyCompatVariables() {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const intensity = Math.min(1, Math.max(.25, Number.parseFloat(styles.getPropertyValue('--macos-motion-intensity')) || .78));
  root.style.setProperty('--macos-hover-lift', `${(-3 * intensity).toFixed(2)}px`);
  root.style.setProperty('--macos-hover-scale', String(1 + .012 * intensity));
  root.style.setProperty('--macos-press-scale', String(1 - .025 * intensity));
  root.style.setProperty('--macos-route-shift', `${(38 * intensity).toFixed(2)}px`);
  root.style.setProperty('--macos-route-shift-back', `${(-38 * intensity).toFixed(2)}px`);
  root.style.setProperty('--macos-route-blur', `${(3 * intensity).toFixed(2)}px`);
  root.style.setProperty('--macos-spaces-shift', `${(12 * intensity).toFixed(2)}vw`);
  root.style.setProperty('--macos-spaces-shift-back', `${(-12 * intensity).toFixed(2)}vw`);
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html[data-macos-motion="on"][data-macos-micro="on"] :is(button,[role="button"],a.app-card,a.app-tile,.app-card,.app-tile,.tool-card,.game-card,.recent-app-card):hover {
      transform: translateY(var(--macos-hover-lift)) scale(var(--macos-hover-scale));
    }
    html[data-macos-motion="on"][data-macos-micro="on"] :is(button,[role="button"],a.app-card,a.app-tile,.app-card,.app-tile,.tool-card,.game-card,.recent-app-card):active {
      transform: translateY(0) scale(var(--macos-press-scale)) !important;
    }
    html[data-macos-motion="on"][data-macos-micro="on"] .bes-macos-preserve-transform:hover {
      transform: var(--bes-macos-original-transform) !important;
      translate: 0 var(--macos-hover-lift);
      scale: var(--macos-hover-scale);
    }
    html[data-macos-motion="on"][data-macos-micro="on"] .bes-macos-preserve-transform:active {
      transform: var(--bes-macos-original-transform) !important;
      translate: 0 0;
      scale: var(--macos-press-scale);
    }
    html[data-macos-motion="on"][data-macos-glass="on"] :is(.bui-shell-chrome,.bui-command-center,.command-center,.workspace-tabs,.global-ai-indicator,.global-music-player,.notification-panel,.popover,.dropdown-menu,.bes-macos-popover-surface) {
      box-shadow: 0 18px 55px rgba(26,34,49,.16), inset 0 1px 0 rgba(255,255,255,.42) !important;
    }
    .bes-macos-mission-card {
      animation: besMacMissionCard var(--macos-duration-slow) var(--macos-spring) both !important;
      animation-delay: var(--macos-card-delay,0ms) !important;
    }
    .bes-macos-mission-grid > button {
      animation: besMacMissionOverlayCard var(--macos-duration-slow) var(--macos-spring) both;
      animation-delay: var(--mission-delay,0ms);
    }
    @keyframes besMacRoutePush {
      from { opacity:.2; transform:translate3d(var(--macos-route-shift),0,0) scale(.985); filter:blur(var(--macos-route-blur)); }
      to { opacity:1; transform:translate3d(0,0,0) scale(1); filter:blur(0); }
    }
    @keyframes besMacRoutePushBack {
      from { opacity:.2; transform:translate3d(var(--macos-route-shift-back),0,0) scale(.985); filter:blur(var(--macos-route-blur)); }
      to { opacity:1; transform:translate3d(0,0,0) scale(1); filter:blur(0); }
    }
    @keyframes besMacRouteSpaces {
      from { opacity:.1; transform:translate3d(var(--macos-spaces-shift),0,0) scale(.975); }
      70% { opacity:1; }
      to { opacity:1; transform:translate3d(0,0,0) scale(1); }
    }
    @keyframes besMacRouteSpacesBack {
      from { opacity:.1; transform:translate3d(var(--macos-spaces-shift-back),0,0) scale(.975); }
      70% { opacity:1; }
      to { opacity:1; transform:translate3d(0,0,0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

function setIfChanged(element, name, value) {
  if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
}

function protect(element) {
  if (!(element instanceof Element)) return;
  if (!element.classList.contains('bes-macos-preserve-transform')) {
    const transform = getComputedStyle(element).transform;
    if (transform && transform !== 'none') {
      setIfChanged(element, '--bes-macos-original-transform', transform);
      element.classList.add('bes-macos-preserve-transform');
    }
  }
  if (element.classList.contains('bes-macos-mission-card')) {
    const index = Number.parseInt(element.style.getPropertyValue('--macos-card-index') || '0', 10) || 0;
    setIfChanged(element, '--macos-card-delay', `${index * 18}ms`);
  }
  if (element.matches('.bes-macos-mission-grid > button')) {
    const index = Number.parseInt(element.style.getPropertyValue('--mission-index') || '0', 10) || 0;
    setIfChanged(element, '--mission-delay', `${index * 22}ms`);
  }
}

function scan(root = document) {
  if (root instanceof Element && (root.matches(SELECTOR) || root.classList.contains('bes-macos-mission-card'))) protect(root);
  root.querySelectorAll?.(`${SELECTOR},.bes-macos-mission-card,.bes-macos-mission-grid > button`).forEach(protect);
}

function boot() {
  applyCompatVariables();
  installStyle();
  scan();
  window.addEventListener('bes:macos-motion-change', () => {
    applyCompatVariables();
    window.requestAnimationFrame(() => scan());
  });
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') protect(mutation.target);
      mutation.addedNodes.forEach((node) => { if (node instanceof Element) scan(node); });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
