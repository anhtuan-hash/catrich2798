import { useEffect, useLayoutEffect } from 'react';
import './GlobalNativeTextScaleReset.css';

const APPEARANCE_KEY = 'bes-appearance-v2';
const RETIRED_KEYS = [
  'bes-font-scale',
  'bes-text-scale',
  'bet-font-scale',
  'bet-text-scale',
  'burs-font-scale',
  'bes-display-density',
];

const RETIRED_APPEARANCE_FIELDS = [
  'textScale',
  'projector',
  'density',
  'contentWidth',
  'touchTargets',
  'radius',
  'border',
];

const RETIRED_ROOT_VARIABLES = [
  '--bes-text-scale',
  '--bes-ds-scale',
  '--bes-font-scale',
  '--bes-ui-gap',
  '--bes-card-padding',
  '--bes-control-height',
  '--bes-content-max',
  '--bes-card-radius',
  '--bes-border-width',
];

const RETIRED_ROOT_ATTRIBUTES = [
  'data-font-scale',
  'data-font-scale-requested',
  'data-typography-mode',
  'data-burs',
  'data-bes-density',
  'data-bes-touch-targets',
  'data-bes-projector',
];

function clearLegacyStorage() {
  try {
    RETIRED_KEYS.forEach((key) => window.localStorage.removeItem(key));

    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return;
    const current = JSON.parse(raw);
    if (!current || typeof current !== 'object' || Array.isArray(current)) return;

    const next = { ...current };
    RETIRED_APPEARANCE_FIELDS.forEach((field) => delete next[field]);
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {
    /* local storage is optional */
  }
}

function removeRuntimeScaleMarkers() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  /* Restore native/component sizing instead of replacing it with another
     global numeric baseline. */
  root.style.removeProperty('font-size');
  RETIRED_ROOT_VARIABLES.forEach((property) => root.style.removeProperty(property));
  RETIRED_ROOT_ATTRIBUTES.forEach((attribute) => root.removeAttribute(attribute));

  document.querySelectorAll('.metro-clean-system[data-burs], .app-shell[data-burs]').forEach((node) => {
    node.removeAttribute('data-burs');
  });
}

function cleanupLegacyDisplayState() {
  clearLegacyStorage();
  removeRuntimeScaleMarkers();
}

export default function GlobalNativeTextScaleReset() {
  /* Remove stale inline sizing before the mounted shell is painted. */
  useLayoutEffect(() => {
    cleanupLegacyDisplayState();
  });

  useEffect(() => {
    let cleaning = false;
    const cleanup = () => {
      if (cleaning) return;
      cleaning = true;
      cleanupLegacyDisplayState();
      cleaning = false;
    };

    cleanup();

    /* Appearance Engine V2 can still re-apply its historical layout tokens on
       route changes, resize/performance changes or cloud sync. Observe only the
       root element (not the document subtree), so this guard is extremely cheap
       and cannot recreate the old whole-page MutationObserver performance cost. */
    const root = document.documentElement;
    const observer = new MutationObserver(() => cleanup());
    observer.observe(root, {
      attributes: true,
      attributeFilter: [
        'style',
        'data-font-scale',
        'data-font-scale-requested',
        'data-typography-mode',
        'data-burs',
        'data-bes-density',
        'data-bes-touch-targets',
        'data-bes-projector',
      ],
    });

    const events = [
      'bes:font-scale-changed',
      'bes:appearance-changed',
      'bes:appearance-ready',
      'bes:appearance-cloud-load',
      'hashchange',
      'popstate',
      'resize',
      'storage',
    ];
    events.forEach((eventName) => window.addEventListener(eventName, cleanup, { passive: true }));

    /* Catch late initialization without keeping a permanent polling loop. */
    const timers = [0, 50, 200, 800].map((delay) => window.setTimeout(cleanup, delay));

    return () => {
      observer.disconnect();
      events.forEach((eventName) => window.removeEventListener(eventName, cleanup));
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
