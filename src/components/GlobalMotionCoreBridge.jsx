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

function closestInteractive(target) {
  if (!(target instanceof Element)) return null;
  return target.closest('button:not([disabled]), [role="button"]:not([aria-disabled="true"]), a[href]');
}

function isIgnored(element) {
  return Boolean(element?.closest?.('[data-motion-ignore="true"], .motion-lab-panel iframe'));
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
    document.addEventListener('click', onClick, true);
    window.addEventListener('bes-motion-success', onSuccess);
    window.addEventListener('bes-motion-error', onError);
    window.addEventListener('bes-motion-notify', onNotify);
    window.addEventListener('bes-motion-focus', onFocus);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', onPointerDown, true);
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
