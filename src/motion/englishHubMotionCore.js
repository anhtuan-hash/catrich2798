import {
  MOTION_CORE_VERSION,
  MOTION_FEATURE_DEFAULTS,
  PRODUCTION_EFFECTS,
  SEMANTIC_EFFECTS,
} from './motionCatalog.js';

const SETTINGS_KEY = 'bes-motion-core-v1';
const activeAnimations = new WeakMap();
const cleanupTimers = new Set();
let globalListenerCleanup = null;

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizedSettings(value = {}) {
  return {
    ...MOTION_FEATURE_DEFAULTS,
    ...value,
    semanticOverrides: value?.semanticOverrides && typeof value.semanticOverrides === 'object'
      ? { ...value.semanticOverrides }
      : {},
  };
}

export function getMotionCoreSettings() {
  if (typeof window === 'undefined') return normalizedSettings();
  const stored = safeJson(window.localStorage?.getItem(SETTINGS_KEY) || '{}', {});
  return normalizedSettings(stored);
}

export function setMotionCoreSettings(patch = {}) {
  const current = getMotionCoreSettings();
  const next = normalizedSettings({
    ...current,
    ...patch,
    semanticOverrides: patch.semanticOverrides === undefined
      ? current.semanticOverrides
      : patch.semanticOverrides,
    updatedAt: Date.now(),
  });
  try { window.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* optional */ }
  document.documentElement.dataset.motionCore = next.enabled === false ? 'off' : 'on';
  window.dispatchEvent(new CustomEvent('bes-motion-core-settings-changed', { detail: { settings: next } }));
  return next;
}

function appearanceReduceMotion() {
  try {
    const runtimeState = window.BESAppearance?.getState?.() || {};
    const storedState = safeJson(window.localStorage?.getItem('bes-appearance-v2') || '{}', {});
    const state = { ...storedState, ...runtimeState };
    return Boolean(state.reduceMotion || state.batterySaver);
  } catch {
    return false;
  }
}

export function getMotionPolicy() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { mode: 'off', performance: 'low', enabled: false, durationScale: 0, settings: normalizedSettings() };
  }

  const settings = getMotionCoreSettings();
  const root = document.documentElement;
  const mediaReduce = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const performanceMode = root.dataset.performance || root.dataset.besPerformance || 'balanced';
  let mode = root.dataset.motion || window.localStorage?.getItem('bes-motion-mode') || 'lite';

  if (settings.enabled === false || mediaReduce || appearanceReduceMotion()) mode = 'off';
  if (performanceMode === 'low' && mode === 'full') mode = 'lite';
  if (!['off', 'lite', 'full'].includes(mode)) mode = 'lite';

  const durationScale = mode === 'off' ? 0 : performanceMode === 'high' ? 1 : performanceMode === 'low' ? .72 : .9;
  return { mode, performance: performanceMode, enabled: mode !== 'off', durationScale, settings };
}

function normalizeTargets(target) {
  if (!target) return [];
  if (target instanceof Element) return [target];
  if (Array.isArray(target)) return target.filter((item) => item instanceof Element);
  if (typeof target[Symbol.iterator] === 'function') return [...target].filter((item) => item instanceof Element);
  return [];
}

function clearAnimation(element) {
  const previous = activeAnimations.get(element);
  if (previous) {
    try { previous.cancel(); } catch { /* already finished */ }
    activeAnimations.delete(element);
  }
}

function scaledOptions(options, policy, overrides) {
  const requestedDuration = Number(overrides.duration ?? options.duration ?? 300);
  return {
    ...options,
    ...overrides,
    duration: Math.max(1, Math.round(requestedDuration * policy.durationScale)),
    fill: overrides.fill || options.fill || 'both',
  };
}

export function runEffect(target, effectName, overrides = {}) {
  const policy = getMotionPolicy();
  const definition = PRODUCTION_EFFECTS[effectName];
  const targets = normalizeTargets(target);

  if (!definition || !targets.length || !policy.enabled) {
    return { animations: [], cancel() {}, finished: Promise.resolve([]) };
  }

  const animations = targets.map((element, index) => {
    clearAnimation(element);
    const options = scaledOptions(definition.options || {}, policy, {
      ...overrides,
      delay: Number(overrides.delay || 0) + index * Number(overrides.stagger || 0),
    });
    const animation = element.animate(definition.keyframes, options);
    activeAnimations.set(element, animation);
    animation.addEventListener('finish', () => {
      if (activeAnimations.get(element) === animation) activeAnimations.delete(element);
      if (overrides.persist !== true) {
        window.requestAnimationFrame(() => {
          try { animation.cancel(); } catch { /* already detached */ }
        });
      }
    }, { once: true });
    animation.addEventListener('cancel', () => {
      if (activeAnimations.get(element) === animation) activeAnimations.delete(element);
    }, { once: true });
    return animation;
  });

  return {
    animations,
    cancel() { animations.forEach((animation) => { try { animation.cancel(); } catch { /* ignore */ } }); },
    finished: Promise.allSettled(animations.map((animation) => animation.finished)),
  };
}

function selectedEffectForSemantic(semantic, policy) {
  const selected = policy.settings?.semanticOverrides?.[semantic];
  if (selected && PRODUCTION_EFFECTS[selected]) return selected;
  const choice = SEMANTIC_EFFECTS[semantic];
  if (!choice) return null;
  return choice[policy.mode] || choice.lite || null;
}

export function runSemanticMotion(target, semantic, overrides = {}) {
  const policy = getMotionPolicy();
  if (policy.mode === 'off') return runEffect(null, '');
  const effectName = selectedEffectForSemantic(semantic, policy);
  return effectName ? runEffect(target, effectName, overrides) : runEffect(null, '');
}

export function applySitewideEffect(effectName, semantics = [], metadata = {}) {
  if (!PRODUCTION_EFFECTS[effectName]) return getMotionCoreSettings();
  const semanticOverrides = {};
  [...new Set(semantics)].filter(Boolean).forEach((semantic) => { semanticOverrides[semantic] = effectName; });
  return setMotionCoreSettings({
    enabled: true,
    semanticOverrides,
    sitewideSelection: {
      effectName,
      sourceId: PRODUCTION_EFFECTS[effectName].sourceId,
      semantics: Object.keys(semanticOverrides),
      ...metadata,
      updatedAt: Date.now(),
    },
  });
}

export function resetSitewideEffect() {
  return setMotionCoreSettings({ semanticOverrides: {}, sitewideSelection: null });
}

export function stopMotion(target) {
  normalizeTargets(target).forEach(clearAnimation);
}

export function createRipple(target, clientX, clientY) {
  const policy = getMotionPolicy();
  if (!policy.enabled || policy.settings.buttons === false || !(target instanceof Element)) return null;
  const rect = target.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return null;

  const layer = document.createElement('span');
  layer.className = 'eh-motion-ripple-layer';
  Object.assign(layer.style, {
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    borderRadius: getComputedStyle(target).borderRadius || '12px',
  });

  const ripple = document.createElement('i');
  const localX = Number.isFinite(clientX) ? clientX - rect.left : rect.width / 2;
  const localY = Number.isFinite(clientY) ? clientY - rect.top : rect.height / 2;
  const diameter = Math.hypot(Math.max(localX, rect.width - localX), Math.max(localY, rect.height - localY)) * 2;
  Object.assign(ripple.style, {
    left: `${localX}px`, top: `${localY}px`, width: `${diameter}px`, height: `${diameter}px`,
  });
  layer.appendChild(ripple);
  document.body.appendChild(layer);

  const animation = ripple.animate([
    { transform: 'translate(-50%,-50%) scale(0)', opacity: .28 },
    { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 },
  ], {
    duration: Math.round((policy.mode === 'full' ? 560 : 360) * policy.durationScale),
    easing: 'cubic-bezier(.2,0,0,1)', fill: 'forwards',
  });
  const remove = () => layer.remove();
  animation.addEventListener('finish', remove, { once: true });
  animation.addEventListener('cancel', remove, { once: true });
  return animation;
}

export function createParticleBurst(target, options = {}) {
  const policy = getMotionPolicy();
  if (!policy.enabled || policy.settings.celebrations === false || !(target instanceof Element)) {
    return runSemanticMotion(target, 'success');
  }
  if (policy.mode !== 'full' || policy.performance === 'low') return runSemanticMotion(target, 'success');

  const rect = target.getBoundingClientRect();
  const layer = document.createElement('span');
  layer.className = 'eh-motion-particle-layer';
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(layer);

  const colors = options.colors || ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];
  const count = Math.min(36, Math.max(12, Number(options.count || 24)));
  const animations = [];
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('i');
    const angle = (index / count) * Math.PI * 2 + (Math.random() - .5) * .22;
    const distance = 42 + Math.random() * 78;
    particle.style.setProperty('--particle-color', colors[index % colors.length]);
    particle.style.setProperty('--particle-rotation', `${Math.round((Math.random() - .5) * 720)}deg`);
    layer.appendChild(particle);
    animations.push(particle.animate([
      { transform: 'translate(-50%,-50%) scale(.7) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0) rotate(var(--particle-rotation))`, opacity: 0 },
    ], {
      duration: Math.round((700 + Math.random() * 420) * policy.durationScale),
      easing: 'cubic-bezier(.12,.7,.15,1)', fill: 'forwards',
    }));
  }

  runSemanticMotion(target, 'success');
  const timer = window.setTimeout(() => {
    layer.remove();
    cleanupTimers.delete(timer);
  }, 1300);
  cleanupTimers.add(timer);
  return {
    animations,
    cancel() { animations.forEach((animation) => animation.cancel()); layer.remove(); },
    finished: Promise.allSettled(animations.map((animation) => animation.finished)),
  };
}

export function animateNumber(element, toValue, options = {}) {
  const policy = getMotionPolicy();
  if (!(element instanceof Element) || policy.settings.data === false) return null;
  const parsedCurrent = String(element.textContent || '').replace(/[^\d.-]/g, '');
  const fromValue = Number(options.from ?? (parsedCurrent || 0));
  const targetValue = Number(toValue);
  if (!Number.isFinite(fromValue) || !Number.isFinite(targetValue) || !policy.enabled) {
    element.textContent = `${options.prefix || ''}${targetValue}${options.suffix || ''}`;
    return null;
  }

  const duration = Math.round(Number(options.duration || 700) * policy.durationScale);
  const startedAt = performance.now();
  let frame = 0;
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / Math.max(1, duration));
    const eased = 1 - ((1 - progress) ** 4);
    const value = fromValue + (targetValue - fromValue) * eased;
    element.textContent = `${options.prefix || ''}${value.toFixed(Number(options.decimals || 0))}${options.suffix || ''}`;
    if (progress < 1) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  runSemanticMotion(element, 'data');
  return { cancel() { cancelAnimationFrame(frame); } };
}

export function previewMotionCore(kind = 'success', target = null) {
  const fallback = target || document.querySelector('.settings-engine-banner') || document.body;
  if (kind === 'success') return createParticleBurst(fallback, { count: 20 });
  if (kind === 'error') return runSemanticMotion(fallback, 'error');
  if (kind === 'notify') return runSemanticMotion(fallback, 'notify');
  if (kind === 'dialog') return runSemanticMotion(fallback, 'dialog');
  return runSemanticMotion(fallback, 'enter');
}

function installGlobalSelectionListeners() {
  if (globalListenerCleanup || typeof document === 'undefined') return;
  const cardSelector = '.flat-app-window-card,.dashboard-luxury-card,.settings-m3-card,[data-motion-card="true"]';

  const onPointerDown = (event) => {
    const interactive = event.target instanceof Element
      ? event.target.closest('button:not([disabled]),[role="button"]:not([aria-disabled="true"]),a[href]')
      : null;
    if (!interactive || interactive.closest('[data-motion-ignore="true"]')) return;
    if (getMotionCoreSettings().semanticOverrides?.press) runSemanticMotion(interactive, 'press');
  };

  const onPointerOver = (event) => {
    const card = event.target instanceof Element ? event.target.closest(cardSelector) : null;
    if (!card || card.contains(event.relatedTarget) || card.closest('[data-motion-ignore="true"]')) return;
    if (getMotionCoreSettings().semanticOverrides?.cardHover) runSemanticMotion(card, 'cardHover', { persist: true });
  };

  const onPointerOut = (event) => {
    const card = event.target instanceof Element ? event.target.closest(cardSelector) : null;
    if (!card || card.contains(event.relatedTarget)) return;
    if (getMotionCoreSettings().semanticOverrides?.cardHover) stopMotion(card);
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  globalListenerCleanup = () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointerover', onPointerOver, true);
    document.removeEventListener('pointerout', onPointerOut, true);
    globalListenerCleanup = null;
  };
}

export function installMotionCoreApi() {
  if (typeof window === 'undefined') return null;
  const api = {
    version: MOTION_CORE_VERSION,
    effects: PRODUCTION_EFFECTS,
    getPolicy: getMotionPolicy,
    getSettings: getMotionCoreSettings,
    setSettings: setMotionCoreSettings,
    applySitewide: applySitewideEffect,
    resetSitewide: resetSitewideEffect,
    run: runEffect,
    semantic: runSemanticMotion,
    stop: stopMotion,
    ripple: createRipple,
    celebrate: createParticleBurst,
    animateNumber,
    preview: previewMotionCore,
  };
  window.EnglishHubMotion = api;
  installGlobalSelectionListeners();
  const settings = getMotionCoreSettings();
  document.documentElement.dataset.motionCore = settings.enabled === false ? 'off' : 'on';
  window.dispatchEvent(new CustomEvent('bes-motion-core-ready', { detail: { api, settings } }));
  return api;
}

export function disposeMotionCore() {
  cleanupTimers.forEach((timer) => window.clearTimeout(timer));
  cleanupTimers.clear();
  globalListenerCleanup?.();
  if (window.EnglishHubMotion?.version === MOTION_CORE_VERSION) delete window.EnglishHubMotion;
}
