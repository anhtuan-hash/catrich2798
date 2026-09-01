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

/* Calm cinematic ocean: horizontal broken ripples instead of large arc borders. */
.brian-welcome-card{
  --welcome-ocean-horizon:34%;
}
.brian-welcome-card .brian-welcome-ocean-layer{
  overflow:hidden;
  background:
    linear-gradient(to bottom,
      transparent 0 61%,
      rgba(18,39,79,.08) 63%,
      rgba(13,38,79,.42) 68%,
      rgba(7,28,62,.82) 82%,
      rgba(5,22,50,.96) 100%);
}
.brian-welcome-card .brian-welcome-horizon{bottom:var(--welcome-ocean-horizon)!important;height:1px!important;opacity:.72!important;background:linear-gradient(90deg,transparent 0 18%,rgba(122,157,210,.22) 37%,rgba(244,197,162,.48) 64%,rgba(142,171,219,.2) 82%,transparent 100%)!important;box-shadow:0 0 12px rgba(148,172,219,.12)!important}

.brian-welcome-card .brian-welcome-ocean-layer:before{
  content:"";
  z-index:0!important;
  pointer-events:none;
  position:absolute!important;
  left:-7%!important;
  right:-7%!important;
  bottom:0!important;
  height:34%!important;
  opacity:.74!important;
  filter:none!important;
  mix-blend-mode:screen;
  background:
    repeating-linear-gradient(0deg,
      transparent 0 7px,
      rgba(104,145,207,.08) 8px 9px,
      transparent 10px 17px,
      rgba(190,210,241,.11) 18px 19px,
      transparent 20px 29px),
    linear-gradient(180deg,rgba(87,112,170,.08),rgba(18,59,112,.28) 48%,rgba(5,27,63,.06));
  background-size:100% 58px,100% 100%;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.56) 11%,#000 28% 100%);
  mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.56) 11%,#000 28% 100%);
  animation:8.8s ease-in-out -2.4s infinite brianWelcomeOceanSurfaceDrift!important;
}

.brian-welcome-card .brian-welcome-wave{
  border:0!important;
  border-radius:0!important;
  left:-9%!important;
  right:-9%!important;
  bottom:0!important;
  height:34%!important;
  transform-origin:50% 50%!important;
  filter:none!important;
  pointer-events:none;
  opacity:.62!important;
  will-change:transform,background-position,opacity;
  background-repeat:repeat-x!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 12%,#000 92%,transparent 100%);
  mask-image:linear-gradient(to bottom,transparent 0%,#000 12%,#000 92%,transparent 100%);
  animation-name:brianWelcomeOceanSurfaceDrift!important;
  animation-timing-function:ease-in-out!important;
  animation-iteration-count:infinite!important;
}
.brian-welcome-card .brian-welcome-wave.wave-a{
  opacity:.62!important;
  background:
    radial-gradient(ellipse at center,rgba(198,215,244,.28) 0 37%,transparent 40%) 0 12%/176px 5px repeat-x,
    radial-gradient(ellipse at center,rgba(119,162,220,.22) 0 35%,transparent 39%) 70px 32%/238px 4px repeat-x,
    radial-gradient(ellipse at center,rgba(237,207,191,.14) 0 35%,transparent 40%) 20px 51%/292px 4px repeat-x!important;
  animation-duration:9.6s!important;
  animation-delay:-1.8s!important;
}
.brian-welcome-card .brian-welcome-wave.wave-b{
  opacity:.52!important;
  background:
    radial-gradient(ellipse at center,rgba(131,171,228,.24) 0 36%,transparent 40%) 28px 23%/218px 5px repeat-x,
    radial-gradient(ellipse at center,rgba(212,219,242,.2) 0 34%,transparent 39%) 112px 48%/318px 4px repeat-x,
    radial-gradient(ellipse at center,rgba(236,191,174,.12) 0 36%,transparent 40%) 0 70%/264px 5px repeat-x!important;
  animation-duration:12.4s!important;
  animation-delay:-6.1s!important;
  animation-direction:reverse!important;
}
.brian-welcome-card .brian-welcome-wave.wave-c{
  opacity:.44!important;
  background:
    radial-gradient(ellipse at center,rgba(102,148,213,.25) 0 38%,transparent 42%) 80px 18%/250px 6px repeat-x,
    radial-gradient(ellipse at center,rgba(183,201,235,.18) 0 35%,transparent 40%) 10px 45%/356px 5px repeat-x,
    radial-gradient(ellipse at center,rgba(225,181,174,.1) 0 36%,transparent 42%) 160px 74%/304px 6px repeat-x!important;
  animation-duration:15.2s!important;
  animation-delay:-9.4s!important;
}

/* Moon reflection: a vertical, broken path of warm light rather than a flat glow blob. */
.brian-welcome-card .brian-welcome-ocean-layer:after{
  content:"";
  z-index:1!important;
  pointer-events:none;
  position:absolute!important;
  right:10.8%!important;
  bottom:0!important;
  width:24%!important;
  height:34%!important;
  opacity:.58!important;
  filter:blur(.25px)!important;
  mix-blend-mode:screen;
  border-radius:0!important;
  background:
    repeating-linear-gradient(0deg,
      transparent 0 7px,
      rgba(255,220,176,.08) 8px 9px,
      rgba(255,229,190,.34) 10px 12px,
      transparent 13px 19px),
    linear-gradient(to bottom,rgba(255,225,184,.22),rgba(255,204,158,.08) 58%,transparent 100%)!important;
  -webkit-clip-path:polygon(43% 0,57% 0,78% 100%,20% 100%)!important;
  clip-path:polygon(43% 0,57% 0,78% 100%,20% 100%)!important;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.18) 0%,#000 18% 78%,transparent 100%);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.18) 0%,#000 18% 78%,transparent 100%);
  transform:none!important;
  animation:5.6s ease-in-out -1.4s infinite brianWelcomeMoonPathReflection!important;
}

/* Lighthouse reflection: narrow, soft and vertical beneath the tower. */
.brian-welcome-card .brian-welcome-sea-reflection{
  width:22%!important;
  height:27%!important;
  right:0!important;
  bottom:0!important;
  clip-path:none!important;
  opacity:.24!important;
  transform:none!important;
  transform-origin:50% 0!important;
  mix-blend-mode:screen;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.76),rgba(0,0,0,.42) 48%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.76),rgba(0,0,0,.42) 48%,transparent 100%)!important;
  animation:6.4s ease-in-out -2.2s infinite brianWelcomeLighthouseWaterReflection!important;
}
.brian-welcome-card .brian-welcome-reflection-core{
  inset:0!important;
  filter:blur(.25px)!important;
  background:
    repeating-linear-gradient(0deg,
      transparent 0 9px,
      rgba(255,230,187,.11) 10px 11px,
      rgba(255,240,208,.31) 12px 14px,
      transparent 15px 22px),
    linear-gradient(90deg,transparent 0 28%,rgba(255,213,166,.13) 45%,rgba(255,235,199,.26) 57%,rgba(212,170,176,.11) 73%,transparent 100%)!important;
  -webkit-mask-image:linear-gradient(to bottom,#000 0%,rgba(0,0,0,.72) 55%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,#000 0%,rgba(0,0,0,.72) 55%,transparent 100%)!important;
  animation:3.9s ease-in-out infinite brianWelcomeLighthouseReflectionShimmer!important;
}
.brian-welcome-card .brian-welcome-reflection-ripple{
  left:18%!important;
  right:18%!important;
  width:auto!important;
  height:2px!important;
  opacity:.28!important;
  background:linear-gradient(90deg,transparent,rgba(255,225,184,.34),rgba(255,240,211,.48),rgba(255,214,179,.2),transparent)!important;
  animation:4.6s ease-in-out infinite brianWelcomeLighthouseReflectionRipple!important;
}
.brian-welcome-card .brian-welcome-reflection-ripple.ripple-a{bottom:68%!important;animation-delay:-.7s!important}
.brian-welcome-card .brian-welcome-reflection-ripple.ripple-b{bottom:43%!important;animation-delay:-2.1s!important}
.brian-welcome-card .brian-welcome-reflection-ripple.ripple-c{bottom:20%!important;animation-delay:-3.5s!important}

@keyframes brianWelcomeOceanSurfaceDrift{
  0%,100%{transform:translate3d(-1.2%,0,0);background-position:0 12%,70px 32%,20px 51%;opacity:.48}
  42%{transform:translate3d(.8%,-1px,0);background-position:52px 13%,18px 31%,96px 50%;opacity:.68}
  72%{transform:translate3d(1.4%,1px,0);background-position:94px 11%,128px 33%,38px 52%;opacity:.58}
}
@keyframes brianWelcomeMoonPathReflection{
  0%,100%{opacity:.44;filter:blur(.35px);background-position:0 0,0 0}
  38%{opacity:.66;filter:blur(.12px);background-position:8px 18px,0 0}
  70%{opacity:.52;filter:blur(.28px);background-position:-6px 34px,0 0}
}
@keyframes brianWelcomeLighthouseWaterReflection{
  0%,100%{opacity:.18;filter:blur(.2px);translate:0 0}
  46%{opacity:.29;filter:blur(.4px);translate:-2px 1px}
  72%{opacity:.22;filter:blur(.25px);translate:2px 0}
}
@keyframes brianWelcomeLighthouseReflectionShimmer{
  0%,100%{opacity:.54;background-position:0 0,0 0}
  50%{opacity:.86;background-position:7px 21px,0 0}
}
@keyframes brianWelcomeLighthouseReflectionRipple{
  0%,100%{opacity:.16;transform:translateX(-6px) scaleX(.78)}
  50%{opacity:.42;transform:translateX(7px) scaleX(1.08)}
}

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

@media(max-width:900px){
  .brian-welcome-card{--welcome-ocean-horizon:31%}
  .brian-welcome-card .brian-welcome-wave{height:31%!important;opacity:.48!important}
  .brian-welcome-card .brian-welcome-ocean-layer:before,
  .brian-welcome-card .brian-welcome-ocean-layer:after{height:31%!important}
  .brian-welcome-card .brian-welcome-sea-reflection{width:25%!important;height:24%!important;opacity:.2!important}
}
@media(max-width:600px){
  .brian-welcome-card{--welcome-ocean-horizon:27%}
  .brian-welcome-card .brian-welcome-wave{height:27%!important;opacity:.38!important}
  .brian-welcome-card .brian-welcome-ocean-layer:before,
  .brian-welcome-card .brian-welcome-ocean-layer:after{height:27%!important}
  .brian-welcome-card .brian-welcome-ocean-layer:after{width:30%!important;right:6%!important;opacity:.38!important}
  .brian-welcome-card .brian-welcome-sea-reflection{width:28%!important;height:20%!important;opacity:.16!important}
}

@media(prefers-reduced-motion:reduce){
  .brian-welcome-card .brian-welcome-ocean-layer:before,
  .brian-welcome-card .brian-welcome-ocean-layer:after,
  .brian-welcome-card .brian-welcome-wave,
  .brian-welcome-card .brian-welcome-sea-reflection,
  .brian-welcome-card .brian-welcome-reflection-core,
  .brian-welcome-card .brian-welcome-reflection-ripple{
    animation:none!important;
  }
  .brian-welcome-root.is-motion-forced .brian-welcome-ocean-layer:before,
  .brian-welcome-root.is-motion-forced .brian-welcome-wave{
    animation-name:brianWelcomeOceanSurfaceDrift!important;
    animation-iteration-count:infinite!important;
  }
  .brian-welcome-root.is-motion-forced .brian-welcome-ocean-layer:after{
    animation:5.6s ease-in-out -1.4s infinite brianWelcomeMoonPathReflection!important;
  }
  .brian-welcome-root.is-motion-forced .brian-welcome-sea-reflection{
    animation:6.4s ease-in-out -2.2s infinite brianWelcomeLighthouseWaterReflection!important;
  }
  .brian-welcome-root.is-motion-forced .brian-welcome-reflection-core{
    animation:3.9s ease-in-out infinite brianWelcomeLighthouseReflectionShimmer!important;
  }
  .brian-welcome-root.is-motion-forced .brian-welcome-reflection-ripple{
    animation:4.6s ease-in-out infinite brianWelcomeLighthouseReflectionRipple!important;
  }
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
