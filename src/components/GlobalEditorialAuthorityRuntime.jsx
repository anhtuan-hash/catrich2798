import { useEffect } from 'react';
import editorialCss from '../styles/GlobalEditorialAuthority2026.css?inline';
import navigationCss from '../styles/GlobalNavigationFinal2026.css?inline';
import stage5AppCss from '../styles/BrianStage5Migration.css?inline';
import stage5WorkflowCss from '../styles/BrianStage5WorkflowMigration.css?inline';
import stage6PolishCss from '../styles/BrianStage6Polish.css?inline';
import homeSparkleCss from './GlobalHomeSparkleButton.css?inline';
import { installLegacyInternalLoadingCleanup } from '../utils/legacyInternalLoadingCleanup.js';

const STYLE_ID = 'bes-global-editorial-authority-2026';
const RUNNER_WIDTH = 18;
const RUNNER_HEIGHT = 3;
const RUNNER_DURATION = 2800;
const SOFT_SURFACE = 'linear-gradient(180deg, #fcfdff 0%, #f1f3f6 100%)';
const SOFT_ACTIVE_SURFACE = 'linear-gradient(180deg, #f2f4f7 0%, #e6eaf0 100%)';
const SOFT_GLOW = 'rgba(100,116,139,.22)';
const NAV_MOTION_TARGETS = [
  {
    key: 'home',
    selector: ".app-shell[data-route] .brian-nav__primary > button:not([class*='brian-nav__']):first-of-type",
    glow: SOFT_GLOW,
    surface: SOFT_SURFACE,
    home: true,
  },
  {
    key: 'apps',
    selector: ".app-shell[data-route] .brian-nav__primary > button:not([class*='brian-nav__']):nth-of-type(2)",
    glow: SOFT_GLOW,
    surface: SOFT_SURFACE,
  },
  {
    key: 'dashboard',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__dashboard-tab',
    glow: SOFT_GLOW,
    surface: SOFT_SURFACE,
  },
  {
    key: 'homeroom',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__homeroom-tab',
    glow: SOFT_GLOW,
    surface: SOFT_SURFACE,
  },
  {
    key: 'gradebook',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__gradebook-tab',
    glow: SOFT_GLOW,
    surface: SOFT_SURFACE,
  },
  {
    key: 'reports',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__reports-tab.brian-nav__reports-send',
    glow: SOFT_GLOW,
    surface: SOFT_SURFACE,
    preserveOverflow: true,
    runnerInset: 3,
  },
  {
    key: 'ttcm',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__ttcm-tab',
    glow: SOFT_GLOW,
    surface: SOFT_SURFACE,
  },
];
const finalEditorialCss = `${editorialCss}\n\n${navigationCss}\n\n${stage5AppCss}\n\n${stage5WorkflowCss}\n\n${stage6PolishCss}\n\n${homeSparkleCss}`;

function ensureFinalStyleNode() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.dataset.besEditorialAuthority = '2026';
    style.textContent = finalEditorialCss;
  } else if (style.textContent !== finalEditorialCss) {
    style.textContent = finalEditorialCss;
  }

  if (style.parentNode !== document.head || document.head.lastElementChild !== style) {
    document.head.appendChild(style);
  }
  return style;
}

function buildRunnerFrames(width, height, inset = 1.5) {
  const radius = Math.max(2, (height - (inset * 2)) / 2);
  const centerY = height / 2;
  const leftCenterX = inset + radius;
  const rightCenterX = width - inset - radius;
  const straight = Math.max(1, rightCenterX - leftCenterX);
  const arc = Math.PI * radius;
  const perimeter = (straight * 2) + (arc * 2);
  const frames = [];
  const steps = 96;

  for (let index = 0; index <= steps; index += 1) {
    let distance = (index / steps) * perimeter;
    let x = leftCenterX;
    let y = inset;
    let angle = 0;

    if (distance <= straight) {
      x = leftCenterX + distance;
      y = inset;
      angle = 0;
    } else {
      distance -= straight;
      if (distance <= arc) {
        const theta = (-Math.PI / 2) + (distance / radius);
        x = rightCenterX + (radius * Math.cos(theta));
        y = centerY + (radius * Math.sin(theta));
        angle = theta + (Math.PI / 2);
      } else {
        distance -= arc;
        if (distance <= straight) {
          x = rightCenterX - distance;
          y = height - inset;
          angle = Math.PI;
        } else {
          distance -= straight;
          const theta = (Math.PI / 2) + (distance / radius);
          x = leftCenterX + (radius * Math.cos(theta));
          y = centerY + (radius * Math.sin(theta));
          angle = theta + (Math.PI / 2);
        }
      }
    }

    frames.push({
      transform: `translate3d(${x - (RUNNER_WIDTH / 2)}px, ${y - (RUNNER_HEIGHT / 2)}px, 0) rotate(${angle}rad)`,
    });
  }

  return frames;
}

function styleRunner(runner, glow) {
  const set = (name, value) => runner.style.setProperty(name, value, 'important');
  set('position', 'absolute');
  set('z-index', '12');
  set('top', '0');
  set('left', '0');
  set('width', `${RUNNER_WIDTH}px`);
  set('min-width', `${RUNNER_WIDTH}px`);
  set('height', `${RUNNER_HEIGHT}px`);
  set('min-height', `${RUNNER_HEIGHT}px`);
  set('margin', '0');
  set('padding', '0');
  set('border', '0');
  set('border-radius', '999px');
  set('background', 'linear-gradient(90deg, rgba(148,163,184,.08), rgba(71,85,105,.58) 34%, #fff 54%, rgba(148,163,184,.10))');
  set('box-shadow', `0 0 3px rgba(255,255,255,1), 0 0 7px rgba(71,85,105,.34), 0 0 13px ${glow}`);
  set('opacity', '1');
  set('pointer-events', 'none');
  set('transform-origin', 'center center');
  set('will-change', 'transform');
}

function styleColoredSurface(button, config) {
  if (!config.surface) return;
  const set = (name, value) => button.style.setProperty(name, value, 'important');
  const active = button.classList.contains('is-active');
  const surface = active ? SOFT_ACTIVE_SURFACE : config.surface;
  set('background', surface);
  set('background-image', surface);
  set('color', active ? '#334155' : '#475569');
  set('border-color', active ? 'rgba(100,116,139,.34)' : 'rgba(148,163,184,.28)');
  set(
    'box-shadow',
    `inset 0 1px rgba(255,255,255,.98), inset 0 -1px 1px rgba(148,163,184,.12), 0 5px 14px rgba(51,65,85,.10), 0 0 10px ${config.glow}`,
  );
  set('text-shadow', 'none');
}

export default function GlobalEditorialAuthorityRuntime() {
  useEffect(() => {
    let disposed = false;
    let raf = 0;
    const bindings = new Map();
    const releaseLegacyInternalLoadingCleanup = installLegacyInternalLoadingCleanup();

    const releaseBinding = (key) => {
      const binding = bindings.get(key);
      if (!binding) return;
      binding.release();
      bindings.delete(key);
    };

    const bindMotionTarget = (config) => {
      if (disposed) return;
      const nextButton = document.querySelector(config.selector);
      const current = bindings.get(config.key);

      if (!nextButton) {
        if (current) releaseBinding(config.key);
        return;
      }
      if (current?.button === nextButton && current.runner?.isConnected) {
        styleColoredSurface(nextButton, config);
        return;
      }
      if (current) releaseBinding(config.key);

      const button = nextButton;
      button.style.setProperty('position', 'relative', 'important');
      if (!config.preserveOverflow) {
        button.style.setProperty('overflow', 'visible', 'important');
      }
      button.style.setProperty('isolation', 'isolate', 'important');
      button.style.setProperty('transform-origin', 'center center', 'important');
      button.style.setProperty('will-change', 'transform', 'important');
      styleColoredSurface(button, config);

      const runner = document.createElement('span');
      runner.className = config.home
        ? 'brian-home-border-runner brian-nav-border-runner'
        : 'brian-nav-border-runner';
      runner.dataset.navRunner = config.key;
      runner.setAttribute('aria-hidden', 'true');
      styleRunner(runner, config.glow);
      button.appendChild(runner);

      let animation = null;
      let resizeObserver = null;

      const stopRunner = () => {
        animation?.cancel();
        animation = null;
      };

      const startRunner = () => {
        if (!button.isConnected || !runner.isConnected) return;
        stopRunner();
        const width = button.offsetWidth || 108;
        const height = button.offsetHeight || 40;
        animation = runner.animate(buildRunnerFrames(width, height, config.runnerInset || 1.5), {
          duration: RUNNER_DURATION,
          iterations: Infinity,
          easing: 'linear',
        });
      };

      const setScale = (value) => {
        if (!button.isConnected) return;
        button.style.setProperty(
          'transition',
          'transform 240ms cubic-bezier(.2,.82,.2,1), background .24s ease, border-color .24s ease, box-shadow .24s ease',
          'important',
        );
        button.style.setProperty('transform', `scale(${value})`, 'important');
      };

      const onEnter = () => setScale(1.10);
      const onLeave = () => setScale(1);
      const onDown = () => setScale(.97);
      const onUp = () => setScale(button.matches(':hover') ? 1.10 : 1);

      button.addEventListener('pointerenter', onEnter);
      button.addEventListener('pointerleave', onLeave);
      button.addEventListener('focus', onEnter);
      button.addEventListener('blur', onLeave);
      button.addEventListener('pointerdown', onDown);
      button.addEventListener('pointerup', onUp);
      button.addEventListener('pointercancel', onLeave);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => startRunner());
        resizeObserver.observe(button);
      }

      const release = () => {
        button.removeEventListener('pointerenter', onEnter);
        button.removeEventListener('pointerleave', onLeave);
        button.removeEventListener('focus', onEnter);
        button.removeEventListener('blur', onLeave);
        button.removeEventListener('pointerdown', onDown);
        button.removeEventListener('pointerup', onUp);
        button.removeEventListener('pointercancel', onLeave);
        resizeObserver?.disconnect();
        stopRunner();
        runner.remove();
        if (button.isConnected) {
          button.style.removeProperty('transform');
          button.style.removeProperty('transition');
          button.style.removeProperty('position');
          if (!config.preserveOverflow) {
            button.style.removeProperty('overflow');
          }
          button.style.removeProperty('isolation');
          button.style.removeProperty('transform-origin');
          button.style.removeProperty('will-change');
          if (config.surface) {
            button.style.removeProperty('background');
            button.style.removeProperty('background-image');
            button.style.removeProperty('color');
            button.style.removeProperty('border-color');
            button.style.removeProperty('box-shadow');
            button.style.removeProperty('text-shadow');
          }
        }
      };

      bindings.set(config.key, { button, runner, release });
      startRunner();
    };

    const bindAllMotionTargets = () => {
      NAV_MOTION_TARGETS.forEach(bindMotionTarget);
    };

    const promote = () => {
      if (disposed) return;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        if (!disposed) {
          ensureFinalStyleNode();
          bindAllMotionTargets();
        }
      });
    };

    const style = ensureFinalStyleNode();
    document.documentElement.dataset.besEditorialSystem = '2026';
    bindAllMotionTargets();

    // Lazy routes can inject CSS after the shell mounts. The observer is the
    // single source of truth for re-promoting Brian's final visual authority;
    // no timed promotion burst is needed.
    const observer = new MutationObserver((mutations) => {
      const hasNewStylesheet = mutations.some((mutation) => [...mutation.addedNodes].some((node) => {
        if (!(node instanceof HTMLElement) || node === style) return false;
        if (node.tagName === 'STYLE') return true;
        return node.tagName === 'LINK' && String(node.getAttribute('rel') || '').toLowerCase() === 'stylesheet';
      }));
      if (hasNewStylesheet) promote();
    });

    const rootObserver = new MutationObserver(() => bindAllMotionTargets());
    const root = document.getElementById('root');
    if (root) rootObserver.observe(root, { childList: true, subtree: true });

    observer.observe(document.head, { childList: true });
    window.addEventListener('hashchange', promote);
    window.addEventListener('bes-route-change', promote);
    window.addEventListener('bes-editorial-refresh', promote);

    return () => {
      disposed = true;
      observer.disconnect();
      rootObserver.disconnect();
      releaseLegacyInternalLoadingCleanup();
      [...bindings.keys()].forEach(releaseBinding);
      window.removeEventListener('hashchange', promote);
      window.removeEventListener('bes-route-change', promote);
      window.removeEventListener('bes-editorial-refresh', promote);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
