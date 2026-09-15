import { useEffect } from 'react';
import editorialCss from '../styles/GlobalEditorialAuthority2026.css?inline';
import navigationCss from '../styles/GlobalNavigationFinal2026.css?inline';
import stage5AppCss from '../styles/BrianStage5Migration.css?inline';
import stage5WorkflowCss from '../styles/BrianStage5WorkflowMigration.css?inline';
import stage6PolishCss from '../styles/BrianStage6Polish.css?inline';
import homeSparkleCss from './GlobalHomeSparkleButton.css?inline';
import { installLegacyInternalLoadingCleanup } from '../utils/legacyInternalLoadingCleanup.js';

const STYLE_ID = 'bes-global-editorial-authority-2026';
const RUNNER_WIDTH = 12;
const RUNNER_HEIGHT = 1.5;
const RUNNER_DURATION = 2800;
const PRIMARY_NAV_LABEL_KEYS = new Map([
  ['Trang chủ', 'home'],
  ['Home', 'home'],
  ['Ứng dụng', 'apps'],
  ['Apps', 'apps'],
]);
const NAV_MOTION_TARGETS = [
  {
    key: 'home',
    selector: ".app-shell[data-route] .brian-nav__primary > [data-nav-key='home']",
    glow: 'rgba(80,136,224,.18)',
    surface: '#e8f1ff',
    hoverSurface: '#dceaff',
    activeSurface: '#d2e3ff',
    ink: '#285ea8',
    activeInk: '#285ea8',
    border: '#c9dcff',
    activeBorder: '#8fb8f6',
    home: true,
  },
  {
    key: 'apps',
    selector: ".app-shell[data-route] .brian-nav__primary > [data-nav-key='apps']",
    glow: 'rgba(55,171,126,.18)',
    surface: '#dff8ec',
    hoverSurface: '#d2f3e3',
    activeSurface: '#c5edd9',
    ink: '#1f6a52',
    activeInk: '#1f6a52',
    border: '#bcebd6',
    activeBorder: '#82cfad',
  },
  {
    key: 'dashboard',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__dashboard-tab',
    glow: 'rgba(132,96,210,.18)',
    surface: '#eee5ff',
    hoverSurface: '#e5d8ff',
    activeSurface: '#dbcaff',
    ink: '#6248a3',
    activeInk: '#6248a3',
    border: '#d8c7ff',
    activeBorder: '#ad95ea',
  },
  {
    key: 'homeroom',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__homeroom-tab',
    glow: 'rgba(201,96,151,.18)',
    surface: '#ffe8f4',
    hoverSurface: '#ffdeef',
    activeSurface: '#ffd2e9',
    ink: '#8b4a6c',
    activeInk: '#8b4a6c',
    border: '#f6c7df',
    activeBorder: '#df9fc1',
  },
  {
    key: 'gradebook',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__gradebook-tab',
    glow: 'rgba(202,122,88,.18)',
    surface: '#ffede5',
    hoverSurface: '#ffe2d6',
    activeSurface: '#ffd7c7',
    ink: '#8a5946',
    activeInk: '#8a5946',
    border: '#f5d1c1',
    activeBorder: '#dfa992',
  },
  {
    key: 'reports',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__reports-tab.brian-nav__reports-send',
    glow: 'rgba(210,166,48,.18)',
    surface: '#fff5d8',
    hoverSurface: '#ffefc5',
    activeSurface: '#ffe8ae',
    ink: '#806522',
    activeInk: '#806522',
    border: '#f1dfa5',
    activeBorder: '#d6bc6b',
    preserveOverflow: true,
    runnerInset: 2,
  },
  {
    key: 'ttcm',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__ttcm-tab',
    glow: 'rgba(112,91,198,.18)',
    surface: '#efeaff',
    hoverSurface: '#e6deff',
    activeSurface: '#dcd1ff',
    ink: '#584b90',
    activeInk: '#584b90',
    border: '#dad0ff',
    activeBorder: '#ae9be8',
  },
  {
    key: 'attendance',
    selector: '.app-shell[data-route] .brian-nav__primary > .brian-nav__attendance-tab',
    glow: 'rgba(54,157,190,.18)',
    surface: '#dff8ff',
    hoverSurface: '#d1f2fb',
    activeSurface: '#c2ebf7',
    ink: '#24708a',
    activeInk: '#24708a',
    border: '#b8e7f4',
    activeBorder: '#7fc7da',
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

function tagPrimaryNavigationButtons() {
  document.querySelectorAll('.app-shell[data-route] .brian-nav__primary > button').forEach((button) => {
    if (button.dataset.navKey) return;
    const key = PRIMARY_NAV_LABEL_KEYS.get(String(button.textContent || '').trim());
    if (key) button.dataset.navKey = key;
  });
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
  set('background', 'linear-gradient(90deg, rgba(148,163,184,0), rgba(100,116,139,.28) 34%, rgba(255,255,255,.96) 52%, rgba(148,163,184,0))');
  set('box-shadow', `0 0 2px rgba(255,255,255,.86), 0 0 4px rgba(71,85,105,.16), 0 0 7px ${glow}`);
  set('opacity', '.82');
  set('pointer-events', 'none');
  set('transform-origin', 'center center');
  set('will-change', 'transform');
}

function styleColoredSurface(button, config, hovered = false) {
  if (!config.surface) return;
  const set = (name, value) => button.style.setProperty(name, value, 'important');
  const active = button.classList.contains('is-active');
  const surface = active ? config.activeSurface : hovered ? config.hoverSurface : config.surface;
  set('background', surface);
  set('background-image', `linear-gradient(180deg, rgba(255,255,255,.82) 0%, ${surface} 100%)`);
  set('color', active ? config.activeInk : config.ink);
  set('border-color', active ? config.activeBorder : config.border);
  set(
    'box-shadow',
    `inset 0 1px rgba(255,255,255,.92), inset 0 -1px rgba(31,46,68,.04), 0 3px 9px rgba(51,65,85,.07), 0 0 0 1px ${config.glow}`,
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

      const onEnter = () => {
        styleColoredSurface(button, config, true);
        setScale(1.10);
      };
      const onLeave = () => {
        styleColoredSurface(button, config, false);
        setScale(1);
      };
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
      tagPrimaryNavigationButtons();
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
