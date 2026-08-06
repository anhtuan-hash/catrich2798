const RUNTIME_KEY = '__besGlobalHubNavigationRuntimeV2';
const SHELL_SELECTOR = '.app-shell[data-route]';
const SCROLL_THRESHOLD = 12;

const CHROME_STYLE = {
  position: 'sticky',
  'inset-block-start': '0',
  top: '0',
  right: '0',
  left: '0',
  width: '100%',
  'min-width': '0',
  'max-width': 'none',
  'box-sizing': 'border-box',
  margin: '0',
  overflow: 'visible',
  'z-index': '1300',
  transform: 'none',
  translate: 'none',
  'will-change': 'auto',
};

const NAVIGATION_STYLE = {
  position: 'relative',
  inset: 'auto',
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto',
  width: '100%',
  'min-width': '0',
  'max-width': 'none',
  'box-sizing': 'border-box',
  margin: '0',
  overflow: 'visible',
  'z-index': '2',
  transform: 'none',
  translate: 'none',
  'will-change': 'auto',
};

const BRIEFING_STYLE = {
  position: 'relative',
  inset: 'auto',
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto',
  'box-sizing': 'border-box',
  'z-index': '1',
  transform: 'none',
  translate: 'none',
  'will-change': 'auto',
};

function applyImportantStyles(element, styles) {
  if (!element) return;
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value, 'important');
  });
}

function removeStyles(element, styles) {
  if (!element) return;
  Object.keys(styles).forEach((property) => element.style.removeProperty(property));
}

function isVisible(element) {
  if (!element?.isConnected || element.hidden) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function normalizeScrollTarget(target) {
  if (!target || target === window || target === document) {
    return document.scrollingElement || document.documentElement;
  }
  return target;
}

function getDocumentScrollTop() {
  return Math.max(
    Number(window.scrollY) || 0,
    Number(window.pageYOffset) || 0,
    Number(document.scrollingElement?.scrollTop) || 0,
    Number(document.documentElement?.scrollTop) || 0,
    Number(document.body?.scrollTop) || 0,
  );
}

function getScrollTop(target) {
  const normalized = normalizeScrollTarget(target);
  if (
    normalized === document.scrollingElement
    || normalized === document.documentElement
    || normalized === document.body
  ) {
    return getDocumentScrollTop();
  }
  return Math.max(0, Number(normalized?.scrollTop) || 0);
}

function isRelatedToShell(target, shell) {
  const normalized = normalizeScrollTarget(target);
  if (!shell || !normalized) return false;
  if (
    normalized === document.scrollingElement
    || normalized === document.documentElement
    || normalized === document.body
  ) return true;
  if (!(normalized instanceof Element)) return false;
  return normalized === shell
    || shell.contains(normalized)
    || normalized.contains(shell);
}

function findActiveHub() {
  const shells = [...document.querySelectorAll(SHELL_SELECTOR)];
  const visibleShells = shells.filter(isVisible);
  const candidates = visibleShells.length ? visibleShells : shells;

  for (const shell of candidates) {
    const chrome = shell.querySelector(':scope > .bes-top-chrome')
      || shell.querySelector('.bes-top-chrome');
    const navigation = chrome?.querySelector(':scope > .brian-nav')
      || chrome?.querySelector('.brian-nav');
    if (!chrome || !navigation || !isVisible(chrome) || !isVisible(navigation)) continue;

    const briefing = chrome.querySelector(':scope > .brian-briefing-bar')
      || chrome.querySelector('.brian-briefing-bar');
    return { shell, chrome, navigation, briefing };
  }

  return null;
}

function sameHub(left, right) {
  return left?.shell === right?.shell
    && left?.chrome === right?.chrome
    && left?.navigation === right?.navigation
    && left?.briefing === right?.briefing;
}

function collectRestoredScrollPositions(shell, trackedTargets) {
  trackedTargets.clear();
  if (!shell) return;

  const candidates = new Set([
    document.scrollingElement,
    document.documentElement,
    document.body,
    shell,
  ]);

  let ancestor = shell.parentElement;
  while (ancestor) {
    candidates.add(ancestor);
    ancestor = ancestor.parentElement;
  }

  shell.querySelectorAll('*').forEach((element) => {
    if ((Number(element.scrollTop) || 0) > 0) candidates.add(element);
  });

  candidates.forEach((candidate) => {
    if (!candidate || !isRelatedToShell(candidate, shell)) return;
    const top = getScrollTop(candidate);
    if (top > 0) trackedTargets.set(candidate, top);
  });
}

export function installGlobalHubNavigationRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (window[RUNTIME_KEY]?.dispose) return window[RUNTIME_KEY].dispose;

  let activeHub = null;
  let animationFrame = 0;
  let settleTimer = 0;
  let documentObserver = null;
  let resizeObserver = null;
  const trackedTargets = new Map();
  const root = document.documentElement;

  const clearHub = () => {
    if (!activeHub) return;

    activeHub.shell.removeAttribute('data-bes-nav-pinned');
    activeHub.shell.removeAttribute('data-bes-header-scrolled');
    activeHub.shell.style.removeProperty('--bes-pinned-nav-height');
    activeHub.chrome.removeAttribute('data-bes-pinned-chrome');
    activeHub.chrome.removeAttribute('data-bes-header-scrolled');
    activeHub.navigation.removeAttribute('data-bes-pinned-navigation');
    activeHub.briefing?.removeAttribute('data-bes-scrollable-briefing');

    removeStyles(activeHub.chrome, CHROME_STYLE);
    removeStyles(activeHub.navigation, NAVIGATION_STYLE);
    removeStyles(activeHub.briefing, BRIEFING_STYLE);
    activeHub.briefing?.style.removeProperty('display');

    activeHub = null;
    trackedTargets.clear();
    resizeObserver?.disconnect();
  };

  const readMaximumScrollTop = () => {
    if (!activeHub?.shell) return 0;
    let maximum = Math.max(getDocumentScrollTop(), Number(activeHub.shell.scrollTop) || 0);

    trackedTargets.forEach((_storedTop, target) => {
      if (target instanceof Element && !target.isConnected) {
        trackedTargets.delete(target);
        return;
      }
      if (!isRelatedToShell(target, activeHub.shell)) {
        trackedTargets.delete(target);
        return;
      }
      const liveTop = getScrollTop(target);
      if (liveTop <= 0) {
        trackedTargets.delete(target);
        return;
      }
      trackedTargets.set(target, liveTop);
      maximum = Math.max(maximum, liveTop);
    });

    return maximum;
  };

  const applyGeometryContract = () => {
    if (!activeHub) return;
    applyImportantStyles(activeHub.chrome, CHROME_STYLE);
    applyImportantStyles(activeHub.navigation, NAVIGATION_STYLE);
    applyImportantStyles(activeHub.briefing, BRIEFING_STYLE);
  };

  const updateScrollState = () => {
    if (!activeHub) return;
    const scrolled = readMaximumScrollTop() > SCROLL_THRESHOLD;
    const value = scrolled ? 'true' : 'false';
    activeHub.shell.dataset.besHeaderScrolled = value;
    activeHub.chrome.dataset.besHeaderScrolled = value;

    if (activeHub.briefing) {
      if (scrolled) activeHub.briefing.style.setProperty('display', 'none', 'important');
      else activeHub.briefing.style.removeProperty('display');
    }
  };

  const bindHub = (nextHub) => {
    if (sameHub(activeHub, nextHub)) return;
    clearHub();
    if (!nextHub) {
      root.style.removeProperty('--bes-pinned-nav-height');
      return;
    }

    activeHub = nextHub;
    activeHub.shell.dataset.besNavPinned = 'true';
    activeHub.chrome.dataset.besPinnedChrome = 'true';
    activeHub.navigation.dataset.besPinnedNavigation = 'true';
    if (activeHub.briefing) activeHub.briefing.dataset.besScrollableBriefing = 'true';

    applyGeometryContract();
    collectRestoredScrollPositions(activeHub.shell, trackedTargets);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleRefresh());
      [activeHub.shell, activeHub.chrome, activeHub.navigation, activeHub.briefing]
        .filter(Boolean)
        .forEach((element) => resizeObserver.observe(element));
    }
  };

  const refresh = () => {
    const nextHub = findActiveHub();
    bindHub(nextHub);
    if (!activeHub) return;

    applyGeometryContract();
    const navigationHeight = Math.max(
      0,
      Math.ceil(activeHub.navigation.getBoundingClientRect().height),
    );
    activeHub.shell.style.setProperty('--bes-pinned-nav-height', `${navigationHeight}px`);
    root.style.setProperty('--bes-pinned-nav-height', `${navigationHeight}px`);
    root.dataset.besGlobalHubRuntime = 'ready';
    updateScrollState();
  };

  const scheduleRefresh = () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(refresh);
  };

  const scheduleSettledRefresh = () => {
    scheduleRefresh();
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(scheduleRefresh, 140);
  };

  const handleScroll = (event) => {
    if (!activeHub?.shell) {
      scheduleSettledRefresh();
      return;
    }

    const target = normalizeScrollTarget(event?.target);
    if (!isRelatedToShell(target, activeHub.shell)) return;
    const top = getScrollTop(target);
    if (top > 0) trackedTargets.set(target, top);
    else trackedTargets.delete(target);
    updateScrollState();
  };

  const installObservers = () => {
    if (typeof MutationObserver !== 'undefined' && document.body) {
      documentObserver = new MutationObserver(scheduleSettledRefresh);
      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-route', 'class', 'hidden'],
      });
    }
    scheduleSettledRefresh();
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  document.addEventListener('scroll', handleScroll, true);
  window.addEventListener('resize', scheduleSettledRefresh, { passive: true });
  window.addEventListener('orientationchange', scheduleSettledRefresh, { passive: true });
  window.addEventListener('hashchange', scheduleSettledRefresh, { passive: true });
  window.addEventListener('popstate', scheduleSettledRefresh, { passive: true });
  window.addEventListener('pageshow', scheduleSettledRefresh, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installObservers, { once: true });
  } else {
    installObservers();
  }

  const dispose = () => {
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(settleTimer);
    documentObserver?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('scroll', handleScroll, true);
    window.removeEventListener('resize', scheduleSettledRefresh);
    window.removeEventListener('orientationchange', scheduleSettledRefresh);
    window.removeEventListener('hashchange', scheduleSettledRefresh);
    window.removeEventListener('popstate', scheduleSettledRefresh);
    window.removeEventListener('pageshow', scheduleSettledRefresh);
    clearHub();
    root.style.removeProperty('--bes-pinned-nav-height');
    root.removeAttribute('data-bes-global-hub-runtime');
    delete window[RUNTIME_KEY];
  };

  window[RUNTIME_KEY] = { dispose, refresh: scheduleSettledRefresh };
  return dispose;
}
