import { useEffect } from 'react';
import {
  createParticleBurst,
  createRipple,
  disposeMotionCore,
  getMotionCoreSettings,
  installMotionCoreApi,
  runSemanticMotion,
} from '../motion/englishHubMotionCore.js';
import '../motion/EnglishHubMotionCore.css';
import '../motion/EnglishHubInteractiveHover.css';
import './GlobalInteractiveHoverFinal.css';
import './GlobalNavigationHoverRepair.css';

const CARD_SELECTOR = [
  '.flat-app-window-card',
  '.dashboard-luxury-card',
  '.settings-m3-card',
  '[data-motion-card="true"]',
].join(',');

const DIALOG_SELECTOR = [
  'dialog[open]',
  '[role="dialog"]',
  '.global-command-palette',
  '.bes-version-panel',
  '.motion-lab-panel',
  '[data-motion-dialog="true"]',
].join(',');

const TOAST_SELECTOR = [
  '.bes-draft-recovery',
  '.google-snackbar',
  '.settings-m3-snackbar',
  '.bes-system-snackbar',
  '[data-motion-toast="true"]',
].join(',');

const NOTIFICATION_SELECTOR = [
  '.brian-notification-count',
  '.brian-notification-badge',
  '[data-notification-count]',
].join(',');

const HOVER_INTERACTIVE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'summary',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  '[role="option"]:not([aria-disabled="true"])',
  '[role="switch"]:not([aria-disabled="true"])',
  '[role="checkbox"]:not([aria-disabled="true"])',
  '[role="radio"]:not([aria-disabled="true"])',
  '[data-interactive="true"]',
  '[data-clickable="true"]',
].join(',');

const TEXT_LINK_CONTAINER_SELECTOR = 'p, li, blockquote, figcaption, dd, dt, .prose, .markdown, .rich-text';
const TEXT_FIELD_TYPES = new Set([
  '', 'text', 'search', 'email', 'password', 'url', 'tel', 'number',
  'date', 'datetime-local', 'month', 'time', 'week',
]);

function closestInteractive(target) {
  if (!(target instanceof Element)) return null;
  return target.closest('button:not([disabled]), [role="button"]:not([aria-disabled="true"]), a[href]');
}

function isIgnored(element) {
  return Boolean(element?.closest?.('[data-motion-ignore="true"], .motion-lab-panel iframe'));
}

function isHoverIgnored(element) {
  return Boolean(element?.closest?.(
    '[data-hover-ignore="true"], [data-motion-ignore="true"], [aria-disabled="true"], [inert], .is-disabled, .disabled, .motion-lab-panel iframe',
  ));
}

function hoverKind(element) {
  if (element instanceof HTMLAnchorElement) {
    return element.closest(TEXT_LINK_CONTAINER_SELECTOR) ? 'text-link' : 'control';
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement || element.isContentEditable) {
    return 'field';
  }

  if (element instanceof HTMLInputElement) {
    return TEXT_FIELD_TYPES.has(String(element.type || '').toLowerCase()) ? 'field' : 'control';
  }

  return 'control';
}

function markHoverInteractive(element) {
  if (!(element instanceof HTMLElement) || isHoverIgnored(element)) return null;
  element.dataset.ehInteractive = 'true';
  element.dataset.ehInteractiveKind = hoverKind(element);
  return element;
}

function resolveHoverInteractive(target) {
  if (!(target instanceof Element)) return null;
  const shell = target.closest('.app-shell[data-route]');
  if (!shell) return null;

  const explicit = target.closest(HOVER_INTERACTIVE_SELECTOR);
  if (explicit && shell.contains(explicit) && !isHoverIgnored(explicit)) return explicit;

  /* React often delegates click handlers, so custom cards may have no onclick
     attribute. Their cursor is the reliable visual contract. Choose the
     outermost contiguous pointer surface so text inside a card stays still. */
  let node = target;
  let candidate = null;
  while (node instanceof HTMLElement && shell.contains(node)) {
    if (isHoverIgnored(node)) return null;
    const cursor = window.getComputedStyle(node).cursor;
    if (cursor === 'pointer') {
      candidate = node;
    } else if (candidate) {
      break;
    }
    if (node === shell) break;
    node = node.parentElement;
  }
  return candidate;
}

function scanCards(root) {
  const settings = getMotionCoreSettings();
  if (settings.cards === false) return;
  const cards = [];
  if (root instanceof Element && root.matches(CARD_SELECTOR)) cards.push(root);
  root?.querySelectorAll?.(CARD_SELECTOR).forEach((card) => cards.push(card));
  cards.forEach((card, index) => {
    if (card.dataset.ehMotionCard === 'true') return;
    card.dataset.ehMotionCard = 'true';
    runSemanticMotion(card, 'cardEnter', { delay: Math.min(index * 28, 180) });
  });
}

function scanDialogs(root) {
  const settings = getMotionCoreSettings();
  if (settings.dialogs === false) return;
  const dialogs = [];
  if (root instanceof Element && root.matches(DIALOG_SELECTOR)) dialogs.push(root);
  root?.querySelectorAll?.(DIALOG_SELECTOR).forEach((dialog) => dialogs.push(dialog));
  dialogs.forEach((dialog) => {
    if (dialog.dataset.ehMotionDialog === 'true') return;
    dialog.dataset.ehMotionDialog = 'true';
    runSemanticMotion(dialog, 'dialog');
  });
}

function scanToasts(root) {
  const settings = getMotionCoreSettings();
  if (settings.notifications === false) return;
  const toasts = [];
  if (root instanceof Element && root.matches(TOAST_SELECTOR)) toasts.push(root);
  root?.querySelectorAll?.(TOAST_SELECTOR).forEach((toast) => toasts.push(toast));
  toasts.forEach((toast) => {
    if (toast.dataset.ehMotionToast === 'true') return;
    toast.dataset.ehMotionToast = 'true';
    runSemanticMotion(toast, 'toast');
    if (toast.dataset.motionCelebrate === 'true' && settings.celebrations !== false && toast.dataset.ehMotionCelebrated !== 'true') {
      toast.dataset.ehMotionCelebrated = 'true';
      createParticleBurst(toast, { count: 14 });
    }
  });
}

function scanNotificationCounts(root) {
  const settings = getMotionCoreSettings();
  if (settings.notifications === false) return;
  const badges = [];
  if (root instanceof Element && root.matches(NOTIFICATION_SELECTOR)) badges.push(root);
  root?.querySelectorAll?.(NOTIFICATION_SELECTOR).forEach((badge) => badges.push(badge));
  badges.forEach((badge) => {
    const next = Number(String(badge.textContent || badge.dataset.notificationCount || '').replace(/\D/g, '') || 0);
    const previous = Number(badge.dataset.ehMotionCount || 0);
    badge.dataset.ehMotionCount = String(next);
    if (previous > 0 && next > previous) runSemanticMotion(badge, 'notify');
  });
}

function scan(root) {
  scanCards(root);
  scanDialogs(root);
  scanToasts(root);
  scanNotificationCounts(root);
}

function resolveEventTarget(detail, fallbackSelector = '') {
  if (detail?.target instanceof Element) return detail.target;
  if (detail?.selector) {
    try {
      const selected = document.querySelector(detail.selector);
      if (selected) return selected;
    } catch {
      // Ignore invalid external selectors.
    }
  }
  return fallbackSelector ? document.querySelector(fallbackSelector) : null;
}

export default function GlobalMotionCoreBridge({ route }) {
  useEffect(() => {
    installMotionCoreApi();
    scan(document.body);

    const onPointerDown = (event) => {
      const interactive = closestInteractive(event.target);
      if (!interactive || isIgnored(interactive)) return;
      createRipple(interactive, event.clientX, event.clientY);
    };

    const onPointerOver = (event) => {
      const interactive = resolveHoverInteractive(event.target);
      if (interactive) markHoverInteractive(interactive);
    };

    const onFocusIn = (event) => {
      const interactive = resolveHoverInteractive(event.target);
      if (interactive) markHoverInteractive(interactive);
    };

    const onClick = (event) => {
      const explicit = event.target instanceof Element
        ? event.target.closest('[data-motion-effect], [data-motion-semantic]')
        : null;
      if (explicit && !isIgnored(explicit)) {
        if (explicit.dataset.motionSemantic) {
          runSemanticMotion(explicit, explicit.dataset.motionSemantic);
        } else if (explicit.dataset.motionEffect) {
          window.EnglishHubMotion?.run?.(explicit, explicit.dataset.motionEffect);
        }
      }

      const tab = event.target instanceof Element
        ? event.target.closest('[role="tab"], .flat-nav-link, .brian-nav__link')
        : null;
      if (tab && !isIgnored(tab)) runSemanticMotion(tab, 'tab');
    };

    const onSuccess = (event) => {
      const target = resolveEventTarget(event.detail, 'main');
      if (target) createParticleBurst(target, event.detail || {});
    };

    const onError = (event) => {
      const target = resolveEventTarget(event.detail) || document.activeElement;
      if (target instanceof Element) runSemanticMotion(target, 'error');
    };

    const onNotify = (event) => {
      const target = resolveEventTarget(event.detail, '.brian-nav__notification-button');
      if (target instanceof Element) runSemanticMotion(target, 'notify');
    };

    const onFocus = (event) => {
      const target = resolveEventTarget(event.detail);
      if (target instanceof Element) runSemanticMotion(target, 'focus');
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          scanNotificationCounts(mutation.target.parentElement);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
        if (mutation.target instanceof Element) scanNotificationCounts(mutation.target);
      });
    });

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('bes-motion-success', onSuccess);
    window.addEventListener('bes-motion-error', onError);
    window.addEventListener('bes-motion-notify', onNotify);
    window.addEventListener('bes-motion-focus', onFocus);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('bes-motion-success', onSuccess);
      window.removeEventListener('bes-motion-error', onError);
      window.removeEventListener('bes-motion-notify', onNotify);
      window.removeEventListener('bes-motion-focus', onFocus);
      disposeMotionCore();
    };
  }, []);

  useEffect(() => {
    const main = document.querySelector('main.wp8-page-stage');
    if (main) scan(main);
  }, [route]);

  return null;
}
