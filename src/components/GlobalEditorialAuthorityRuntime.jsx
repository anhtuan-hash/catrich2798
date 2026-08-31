import { useEffect } from 'react';
import editorialCss from '../styles/GlobalEditorialAuthority2026.css?inline';
import navigationCss from '../styles/GlobalNavigationFinal2026.css?inline';
import stage5AppCss from '../styles/BrianStage5Migration.css?inline';
import stage5WorkflowCss from '../styles/BrianStage5WorkflowMigration.css?inline';
import stage6PolishCss from '../styles/BrianStage6Polish.css?inline';
import homeSparkleCss from './GlobalHomeSparkleButton.css?inline';

const STYLE_ID = 'bes-global-editorial-authority-2026';
const HOME_BUTTON_SELECTOR = ".app-shell[data-route] .brian-nav__primary > button:not([class*='brian-nav__']):first-of-type";
const HOME_RUNNER_CLASS = 'brian-home-border-runner';
const HOME_RUNNER_WIDTH = 18;
const HOME_RUNNER_HEIGHT = 3;
const HOME_RUNNER_DURATION = 1550;
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

function buildHomeRunnerFrames(width, height) {
  const inset = 1.5;
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
      transform: `translate3d(${x - (HOME_RUNNER_WIDTH / 2)}px, ${y - (HOME_RUNNER_HEIGHT / 2)}px, 0) rotate(${angle}rad)`,
    });
  }

  return frames;
}

export default function GlobalEditorialAuthorityRuntime() {
  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let homeButton = null;
    let homeRunner = null;
    let homeRunnerAnimation = null;
    let homeResizeObserver = null;
    let releaseHomeEvents = () => {};

    const stopHomeRunner = () => {
      homeRunnerAnimation?.cancel();
      homeRunnerAnimation = null;
    };

    const startHomeRunner = () => {
      if (!homeButton || !homeRunner || !homeButton.isConnected || !homeRunner.isConnected) return;
      stopHomeRunner();
      const width = homeButton.offsetWidth || 118;
      const height = homeButton.offsetHeight || 40;
      const frames = buildHomeRunnerFrames(width, height);
      homeRunnerAnimation = homeRunner.animate(frames, {
        duration: HOME_RUNNER_DURATION,
        iterations: Infinity,
        easing: 'linear',
      });
    };

    const releaseHomeMotion = () => {
      releaseHomeEvents();
      releaseHomeEvents = () => {};
      homeResizeObserver?.disconnect();
      homeResizeObserver = null;
      stopHomeRunner();
      if (homeButton?.isConnected) {
        homeButton.style.removeProperty('transform');
        homeButton.style.removeProperty('transition');
      }
      homeRunner?.remove();
      homeRunner = null;
      homeButton = null;
    };

    const bindHomeMotion = () => {
      if (disposed) return;
      const nextButton = document.querySelector(HOME_BUTTON_SELECTOR);
      if (!nextButton) return;
      if (nextButton === homeButton && homeRunner?.isConnected) return;

      releaseHomeMotion();
      homeButton = nextButton;
      homeRunner = document.createElement('span');
      homeRunner.className = HOME_RUNNER_CLASS;
      homeRunner.setAttribute('aria-hidden', 'true');
      homeButton.appendChild(homeRunner);

      const setScale = (value) => {
        if (!homeButton?.isConnected) return;
        homeButton.style.setProperty(
          'transition',
          'transform 240ms cubic-bezier(.2,.82,.2,1), background .24s ease, border-color .24s ease, box-shadow .24s ease',
          'important',
        );
        homeButton.style.setProperty('transform', `scale(${value})`, 'important');
      };

      const onEnter = () => setScale(1.10);
      const onLeave = () => setScale(1);
      const onDown = () => setScale(.97);
      const onUp = () => setScale(homeButton?.matches(':hover') ? 1.10 : 1);

      homeButton.addEventListener('pointerenter', onEnter);
      homeButton.addEventListener('pointerleave', onLeave);
      homeButton.addEventListener('focus', onEnter);
      homeButton.addEventListener('blur', onLeave);
      homeButton.addEventListener('pointerdown', onDown);
      homeButton.addEventListener('pointerup', onUp);
      homeButton.addEventListener('pointercancel', onLeave);

      releaseHomeEvents = () => {
        if (!homeButton) return;
        homeButton.removeEventListener('pointerenter', onEnter);
        homeButton.removeEventListener('pointerleave', onLeave);
        homeButton.removeEventListener('focus', onEnter);
        homeButton.removeEventListener('blur', onLeave);
        homeButton.removeEventListener('pointerdown', onDown);
        homeButton.removeEventListener('pointerup', onUp);
        homeButton.removeEventListener('pointercancel', onLeave);
      };

      if (typeof ResizeObserver !== 'undefined') {
        homeResizeObserver = new ResizeObserver(() => startHomeRunner());
        homeResizeObserver.observe(homeButton);
      }

      startHomeRunner();
    };

    const promote = () => {
      if (disposed) return;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        if (!disposed) {
          ensureFinalStyleNode();
          bindHomeMotion();
        }
      });
    };

    const style = ensureFinalStyleNode();
    document.documentElement.dataset.besEditorialSystem = '2026';
    bindHomeMotion();

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

    const rootObserver = new MutationObserver(() => {
      if (!homeButton?.isConnected || !homeRunner?.isConnected) bindHomeMotion();
    });
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
      releaseHomeMotion();
      window.removeEventListener('hashchange', promote);
      window.removeEventListener('bes-route-change', promote);
      window.removeEventListener('bes-editorial-refresh', promote);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
