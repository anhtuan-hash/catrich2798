/*
 * English Hub Motion Core — production-safe catalog distilled from
 * Anime.js Effects Lab V3. The full 100-effect laboratory lives at
 * /motion-lab.html; this catalog only exposes effects suitable for the
 * production interface.
 */

export const MOTION_CORE_VERSION = '1.0.0';

export const PRODUCTION_EFFECTS = Object.freeze({
  fadeIn: Object.freeze({
    sourceId: 'fade-in',
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    options: { duration: 240, easing: 'cubic-bezier(.2,0,0,1)' },
  }),
  fadeSlide: Object.freeze({
    sourceId: 'fade-slide-combo',
    keyframes: [
      { transform: 'translateY(22px) scale(.985)', opacity: 0 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    options: { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' },
  }),
  slideUp: Object.freeze({
    sourceId: 'slide-up',
    keyframes: [
      { transform: 'translateY(18px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    options: { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' },
  }),
  zoomIn: Object.freeze({
    sourceId: 'zoom-in',
    keyframes: [
      { transform: 'scale(.92)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    options: { duration: 260, easing: 'cubic-bezier(.2,0,0,1)' },
  }),
  modalOpen: Object.freeze({
    sourceId: 'modal',
    keyframes: [
      { transform: 'translateY(14px) scale(.94)', opacity: 0 },
      { transform: 'translateY(-2px) scale(1.012)', opacity: 1, offset: .74 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    options: { duration: 380, easing: 'cubic-bezier(.2,.9,.2,1)' },
  }),
  toastIn: Object.freeze({
    sourceId: 'toast',
    keyframes: [
      { transform: 'translateY(18px) scale(.97)', opacity: 0 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    options: { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' },
  }),
  press: Object.freeze({
    sourceId: 'press-down',
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(.97)', offset: .42 },
      { transform: 'scale(1)' },
    ],
    options: { duration: 180, easing: 'cubic-bezier(.2,0,0,1)' },
  }),
  pulse: Object.freeze({
    sourceId: 'pulse',
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.045)' },
      { transform: 'scale(1)' },
    ],
    options: { duration: 440, easing: 'cubic-bezier(.2,0,0,1)' },
  }),
  springPop: Object.freeze({
    sourceId: 'spring-pop',
    keyframes: [
      { transform: 'translateY(16px) scale(.82)', opacity: 0 },
      { transform: 'translateY(-4px) scale(1.055)', opacity: 1, offset: .72 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    options: { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' },
  }),
  shakeX: Object.freeze({
    sourceId: 'shake-x',
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(0)' },
    ],
    options: { duration: 420, easing: 'cubic-bezier(.2,0,0,1)' },
  }),
  bell: Object.freeze({
    sourceId: 'bell',
    keyframes: [
      { transform: 'rotate(0)' },
      { transform: 'rotate(18deg)' },
      { transform: 'rotate(-15deg)' },
      { transform: 'rotate(10deg)' },
      { transform: 'rotate(-5deg)' },
      { transform: 'rotate(0)' },
    ],
    options: { duration: 620, easing: 'ease-in-out' },
  }),
  focusPulse: Object.freeze({
    sourceId: 'focus-pulse',
    keyframes: [
      { outlineColor: 'rgba(11,87,208,0)', outlineOffset: '2px' },
      { outlineColor: 'rgba(11,87,208,.72)', outlineOffset: '5px', offset: .35 },
      { outlineColor: 'rgba(11,87,208,0)', outlineOffset: '11px' },
    ],
    options: { duration: 900, easing: 'ease-out' },
  }),
  glowPulse: Object.freeze({
    sourceId: 'glow-pulse',
    keyframes: [
      { boxShadow: '0 0 0 0 rgba(11,87,208,.34)' },
      { boxShadow: '0 0 0 14px rgba(11,87,208,0)' },
      { boxShadow: '0 0 0 0 rgba(11,87,208,0)' },
    ],
    options: { duration: 800, easing: 'ease-out' },
  }),
  counterPop: Object.freeze({
    sourceId: 'counter-progress',
    keyframes: [
      { transform: 'translateY(8px) scale(.94)', opacity: .25 },
      { transform: 'translateY(0) scale(1.035)', opacity: 1, offset: .75 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    options: { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' },
  }),
  tabIndicator: Object.freeze({
    sourceId: 'tab-indicator',
    keyframes: [
      { transform: 'scaleX(.64)', opacity: .35 },
      { transform: 'scaleX(1.08)', opacity: 1, offset: .72 },
      { transform: 'scaleX(1)', opacity: 1 },
    ],
    options: { duration: 330, easing: 'cubic-bezier(.16,1,.3,1)' },
  }),
  accordionOpen: Object.freeze({
    sourceId: 'accordion',
    keyframes: [
      { transform: 'translateY(-8px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    options: { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' },
  }),
  blurReveal: Object.freeze({
    sourceId: 'blur-reveal',
    keyframes: [
      { filter: 'blur(8px)', transform: 'scale(.985)', opacity: 0 },
      { filter: 'blur(0)', transform: 'scale(1)', opacity: 1 },
    ],
    options: { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' },
  }),
  hoverLift: Object.freeze({
    sourceId: 'hover-lift',
    keyframes: [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-5px) scale(1.008)' },
    ],
    options: { duration: 220, easing: 'cubic-bezier(.2,0,0,1)' },
  }),
  skeletonSweep: Object.freeze({
    sourceId: 'skeleton',
    keyframes: [
      { backgroundPosition: '220% 0' },
      { backgroundPosition: '-120% 0' },
    ],
    options: { duration: 1200, easing: 'linear' },
  }),
  loaderBounce: Object.freeze({
    sourceId: 'loader-dots',
    keyframes: [
      { transform: 'translateY(0) scale(.84)', opacity: .45 },
      { transform: 'translateY(-10px) scale(1.08)', opacity: 1 },
      { transform: 'translateY(0) scale(.84)', opacity: .45 },
    ],
    options: { duration: 620, easing: 'ease-in-out', iterations: 2 },
  }),
  sceneWipe: Object.freeze({
    sourceId: 'scene-wipe',
    keyframes: [
      { transform: 'translateX(-105%)' },
      { transform: 'translateX(0)', offset: .42 },
      { transform: 'translateX(0)', offset: .58 },
      { transform: 'translateX(105%)' },
    ],
    options: { duration: 900, easing: 'cubic-bezier(.83,0,.17,1)' },
  }),
});

export const SEMANTIC_EFFECTS = Object.freeze({
  enter: Object.freeze({ lite: 'fadeIn', full: 'fadeSlide' }),
  cardEnter: Object.freeze({ lite: 'fadeIn', full: 'slideUp' }),
  dialog: Object.freeze({ lite: 'fadeIn', full: 'modalOpen' }),
  toast: Object.freeze({ lite: 'fadeIn', full: 'toastIn' }),
  press: Object.freeze({ lite: 'press', full: 'press' }),
  notify: Object.freeze({ lite: 'pulse', full: 'bell' }),
  error: Object.freeze({ lite: 'pulse', full: 'shakeX' }),
  success: Object.freeze({ lite: 'pulse', full: 'springPop' }),
  focus: Object.freeze({ lite: 'pulse', full: 'focusPulse' }),
  data: Object.freeze({ lite: 'fadeIn', full: 'counterPop' }),
  tab: Object.freeze({ lite: 'fadeIn', full: 'tabIndicator' }),
  accordion: Object.freeze({ lite: 'fadeIn', full: 'accordionOpen' }),
});

export const MOTION_FEATURE_DEFAULTS = Object.freeze({
  enabled: true,
  buttons: true,
  cards: true,
  dialogs: true,
  notifications: true,
  celebrations: true,
  data: true,
});

export const PRODUCTION_EFFECT_COUNT = Object.keys(PRODUCTION_EFFECTS).length;
