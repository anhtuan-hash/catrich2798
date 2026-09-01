const WELCOME_FRAME_ID = 'brian-first-visit-welcome';
const STYLE_ID = 'brian-welcome-scene-alignment-fix';
const INSTALL_KEY = '__besWelcomeSceneAlignmentFixInstalled';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const alignmentStyle = `
.brian-welcome-lighthouse-layer > .brian-welcome-beam,
.brian-welcome-lighthouse-layer > .brian-welcome-light-particles{
  left:auto!important;
  right:calc(100% - var(--welcome-lantern-x))!important;
  top:var(--welcome-lantern-y)!important;
  translate:0 -50%;
}
.brian-welcome-lighthouse-layer > .brian-welcome-beam{z-index:0}
.brian-welcome-lighthouse-layer > .brian-welcome-light-particles{z-index:1}
.brian-welcome-lighthouse-layer > .brian-welcome-lighthouse{z-index:2}

.brian-welcome-meteor{animation-name:brianWelcomeMeteorFall}
.brian-welcome-meteor.meteor-a{--meteor-fall-rotation:26deg}
.brian-welcome-meteor.meteor-b{--meteor-fall-rotation:22deg}
.brian-welcome-meteor.meteor-c{--meteor-fall-rotation:29deg}
.brian-welcome-meteor.meteor-d{--meteor-fall-rotation:25deg}
.brian-welcome-meteor.meteor-e{--meteor-fall-rotation:20deg}
.brian-welcome-meteor.meteor-f{--meteor-fall-rotation:31deg}
.brian-welcome-meteor.meteor-g{--meteor-fall-rotation:18deg}
.brian-welcome-card .brian-welcome-shooting-star{animation-name:brianWelcomeShootingStarFall}

@keyframes brianWelcomeMeteorFall{
  0%,56%{
    opacity:0;
    transform:translate3d(0,0,0) rotate(var(--meteor-fall-rotation)) scaleX(.38);
  }
  59%{opacity:.12}
  62%{
    opacity:1;
    transform:translate3d(18px,8px,0) rotate(var(--meteor-fall-rotation)) scaleX(.7);
  }
  69%{
    opacity:.96;
    transform:translate3d(var(--meteor-mid-dx),var(--meteor-mid-dy),0) rotate(var(--meteor-fall-rotation)) scaleX(1);
  }
  76%{
    opacity:0;
    transform:translate3d(var(--meteor-dx),var(--meteor-dy),0) rotate(var(--meteor-fall-rotation)) scaleX(1.14);
  }
  100%{
    opacity:0;
    transform:translate3d(var(--meteor-dx),var(--meteor-dy),0) rotate(var(--meteor-fall-rotation)) scaleX(1.14);
  }
}

@keyframes brianWelcomeShootingStarFall{
  0%,60%{opacity:0;transform:translate3d(0,0,0) rotate(24deg) scaleX(.5)}
  63%{opacity:1}
  69%{opacity:.96;transform:translate3d(92px,43px,0) rotate(24deg) scaleX(1)}
  76%{opacity:0;transform:translate3d(210px,96px,0) rotate(24deg) scaleX(1.2)}
  100%{opacity:0;transform:translate3d(210px,96px,0) rotate(24deg) scaleX(1.2)}
}

@media(prefers-reduced-motion:reduce){
  .brian-welcome-root.is-motion-forced .brian-welcome-meteor{
    animation-name:brianWelcomeMeteorFall!important;
  }
  .brian-welcome-root.is-motion-forced .brian-welcome-shooting-star{
    animation-name:brianWelcomeShootingStarFall!important;
  }
}
`;

const bindings = new Map();

function addAlignmentStyle(frameDocument) {
  if (frameDocument.getElementById(STYLE_ID)) return;
  const style = frameDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = alignmentStyle;
  frameDocument.head?.appendChild(style);
}

function bindWelcomeFrame(frame) {
  if (!frame || bindings.has(frame)) return;
  const frameDocument = frame.contentDocument;
  const frameWindow = frame.contentWindow;
  if (!frameDocument || !frameWindow) return;

  const root = frameDocument.querySelector('.brian-welcome-root');
  const card = frameDocument.querySelector('.brian-welcome-card');
  const lighthouseLayer = frameDocument.querySelector('.brian-welcome-lighthouse-layer');
  const lighthouse = frameDocument.querySelector('.brian-welcome-lighthouse');
  const lantern = frameDocument.querySelector('.brian-welcome-lighthouse-lantern');
  const beam = frameDocument.querySelector('.brian-welcome-beam');
  const particles = frameDocument.querySelector('.brian-welcome-light-particles');
  const reflection = frameDocument.querySelector('.brian-welcome-sea-reflection');
  if (!root || !card || !lighthouseLayer || !lighthouse || !lantern || !beam || !particles) return;

  addAlignmentStyle(frameDocument);

  // Keep the light source inside the exact same parallax layer as the lighthouse.
  // This prevents the beam from drifting away while the near layer translates.
  lighthouseLayer.insertBefore(beam, lighthouse);
  lighthouseLayer.insertBefore(particles, lighthouse);

  let pointerFrame = 0;
  let pendingPointer = null;
  let resizeObserver = null;
  const forceFullMotion = root.classList.contains('is-motion-forced');
  const reducedMotion = !forceFullMotion && Boolean(frameWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  function syncLanternAnchor() {
    const layerRect = lighthouseLayer.getBoundingClientRect();
    const lanternRect = lantern.getBoundingClientRect();
    if (!layerRect.width || !layerRect.height || !lanternRect.width || !lanternRect.height) return;
    const lanternX = lanternRect.left - layerRect.left + lanternRect.width * 0.5;
    const lanternY = lanternRect.top - layerRect.top + lanternRect.height * 0.5;
    lighthouseLayer.style.setProperty('--welcome-lantern-x', `${lanternX.toFixed(2)}px`);
    lighthouseLayer.style.setProperty('--welcome-lantern-y', `${lanternY.toFixed(2)}px`);
  }

  function lanternViewportOrigin() {
    const lanternRect = lantern.getBoundingClientRect();
    return {
      x: lanternRect.left + lanternRect.width * 0.5,
      y: lanternRect.top + lanternRect.height * 0.5,
    };
  }

  function applyRealLanternSteering() {
    pointerFrame = 0;
    if (!pendingPointer || reducedMotion || !card.isConnected || !lantern.isConnected) return;

    const cardRect = card.getBoundingClientRect();
    const origin = lanternViewportOrigin();
    const activeFeature = frameDocument.querySelector('.brian-welcome-features article.is-feature-lit');
    let targetX = pendingPointer.x;
    let targetY = pendingPointer.y;
    if (activeFeature) {
      const featureRect = activeFeature.getBoundingClientRect();
      targetX = featureRect.left + featureRect.width * 0.5;
      targetY = featureRect.top + featureRect.height * 0.44;
    }

    const dx = targetX - origin.x;
    const dy = targetY - origin.y;
    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI - 180;
    const normalizedAngle = rawAngle < -180 ? rawAngle + 360 : rawAngle;
    const angle = clamp(normalizedAngle, -16, 9);
    const distance = Math.hypot(dx, dy);
    const scale = clamp(distance / (cardRect.width * 0.52), 0.82, 1.12);
    const opacity = clamp(0.8 + scale * 0.14, 0.88, 0.98);
    const waterInfluence = clamp((-angle + 9) / 25, 0, 1);
    const reflectionX = clamp(angle * 1.45, -24, 14);
    const reflectionOpacity = clamp(0.34 + waterInfluence * 0.46 + (scale - 0.82) * 0.18, 0.38, 0.88);
    const reflectionScale = clamp(0.9 + waterInfluence * 0.16 + (scale - 1) * 0.16, 0.88, 1.12);
    const reflectionTilt = clamp(angle * 0.12, -2.2, 1.4);

    card.style.setProperty('--welcome-beam-angle', `${angle.toFixed(2)}deg`);
    card.style.setProperty('--welcome-beam-scale', scale.toFixed(3));
    card.style.setProperty('--welcome-beam-opacity', opacity.toFixed(3));
    beam.style.setProperty('--welcome-beam-angle', `${angle.toFixed(2)}deg`);
    beam.style.setProperty('--welcome-beam-scale', scale.toFixed(3));
    beam.style.setProperty('--welcome-beam-opacity', opacity.toFixed(3));
    reflection?.style.setProperty('--welcome-reflection-x', `${reflectionX.toFixed(2)}px`);
    reflection?.style.setProperty('--welcome-reflection-opacity', reflectionOpacity.toFixed(3));
    reflection?.style.setProperty('--welcome-reflection-scale', reflectionScale.toFixed(3));
    reflection?.style.setProperty('--welcome-reflection-tilt', `${reflectionTilt.toFixed(2)}deg`);
    pendingPointer = null;
  }

  function onPointerMove(event) {
    if (reducedMotion) return;
    pendingPointer = { x: event.clientX, y: event.clientY };
    if (!pointerFrame) pointerFrame = frameWindow.requestAnimationFrame(applyRealLanternSteering);
  }

  function onPointerLeave() {
    pendingPointer = null;
    if (pointerFrame) {
      frameWindow.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }
    ['--welcome-beam-angle', '--welcome-beam-scale', '--welcome-beam-opacity']
      .forEach((property) => card.style.removeProperty(property));
  }

  function onResize() {
    frameWindow.requestAnimationFrame(syncLanternAnchor);
  }

  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerleave', onPointerLeave);
  frameWindow.addEventListener('resize', onResize);

  if (typeof frameWindow.ResizeObserver === 'function') {
    resizeObserver = new frameWindow.ResizeObserver(onResize);
    resizeObserver.observe(card);
    resizeObserver.observe(lighthouse);
  }

  frameWindow.requestAnimationFrame(() => {
    syncLanternAnchor();
    frameWindow.requestAnimationFrame(syncLanternAnchor);
  });

  const cleanup = () => {
    if (pointerFrame) frameWindow.cancelAnimationFrame(pointerFrame);
    resizeObserver?.disconnect();
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerleave', onPointerLeave);
    frameWindow.removeEventListener('resize', onResize);
    bindings.delete(frame);
  };
  bindings.set(frame, cleanup);
}

function bindCurrentWelcomeFrame() {
  const frame = document.getElementById(WELCOME_FRAME_ID);
  if (!(frame instanceof HTMLIFrameElement)) return;
  const bind = () => frame.contentWindow?.requestAnimationFrame(() => bindWelcomeFrame(frame));
  if (frame.contentDocument?.readyState === 'complete') bind();
  else frame.addEventListener('load', bind, { once: true });
}

function cleanupMissingFrames() {
  for (const [frame, cleanup] of bindings.entries()) {
    if (!frame.isConnected) cleanup();
  }
}

export function installWelcomeSceneAlignmentFix() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  window.addEventListener('bes-first-visit-welcome-shown', bindCurrentWelcomeFrame);
  window.addEventListener('bes-first-visit-welcome-dismissed', cleanupMissingFrames);
  bindCurrentWelcomeFrame();
}

installWelcomeSceneAlignmentFix();
