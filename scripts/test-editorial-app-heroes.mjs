import fs from 'node:fs';

const readOptional = (path) => {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return '';
  }
};

const files = {
  externalJsx: readOptional('src/components/ExternalAppHero.jsx'),
  externalCss: readOptional('src/components/ExternalAppHero.css'),
  tesolJsx: readOptional('src/components/TesolMethodHero.jsx'),
  tesolCss: readOptional('src/components/TesolMethodHero.css'),
  applicationBootstrap: readOptional('src/applicationBootstrap.jsx'),
  firstVisitWelcome: readOptional('src/firstVisitWelcome.js'),
  firstVisitWelcomeCss: readOptional('src/styles/FirstVisitWelcome.css'),
  firstVisitWelcomeMotionCss: readOptional('src/styles/FirstVisitWelcomeMotion.css'),
};

const checks = [
  ['External app hero uses the editorial shell', files.externalJsx.includes('external-app-editorial-shell')],
  ['External app hero supports pointer parallax', files.externalJsx.includes('onPointerMove={handlePointerMove}')],
  ['External app hero has interactive editorial panels', files.externalJsx.includes('aria-pressed={activePanel === panel.id}')],
  ['External app hero keeps app runtime CTA', files.externalJsx.includes("document.getElementById('external-app-runtime')")],
  ['External app hero keeps dashboard route', files.externalJsx.includes("window.location.hash = '#/dashboard'")],
  ['External app CSS defines paper editorial tokens', files.externalCss.includes('--editorial-paper')],
  ['External app CSS contains editorial shell layout', files.externalCss.includes('.external-app-editorial-shell')],
  ['External app hero uses compact viewport sizing', files.externalCss.includes('--editorial-hero-height:clamp(360px,42vh,460px)') && files.externalCss.includes('min-height:var(--editorial-hero-height)')],
  ['External app CSS respects reduced motion', files.externalCss.includes('@media(prefers-reduced-motion:reduce)')],
  ['TESOL hero uses the editorial journal shell', files.tesolJsx.includes('tesol-editorial-shell')],
  ['TESOL hero supports pointer parallax', files.tesolJsx.includes('onPointerMove={handlePointerMove}')],
  ['TESOL hero has interactive term selection', files.tesolJsx.includes('aria-pressed={activeTerm === index}')],
  ['TESOL hero keeps explorer CTA', files.tesolJsx.includes("document.getElementById('tesol-method-explorer')")],
  ['TESOL hero keeps dashboard route', files.tesolJsx.includes("window.location.hash = '#/dashboard'")],
  ['TESOL CSS defines journal paper tokens', files.tesolCss.includes('--tesol-paper')],
  ['TESOL CSS contains editorial journal shell layout', files.tesolCss.includes('.tesol-editorial-shell')],
  ['TESOL hero uses compact viewport sizing', files.tesolCss.includes('--tesol-hero-height:clamp(360px,42vh,460px)') && files.tesolCss.includes('min-height:var(--tesol-hero-height)')],
  ['TESOL CSS respects reduced motion', files.tesolCss.includes('@media(prefers-reduced-motion:reduce)')],
  ['First-visit welcome is bootstrapped', files.applicationBootstrap.includes("import './styles/FirstVisitWelcome.css';") && files.applicationBootstrap.includes("import { installFirstVisitWelcome } from './firstVisitWelcome.js';") && files.applicationBootstrap.includes('installFirstVisitWelcome();')],
  ['First-visit welcome uses a versioned browser key', files.firstVisitWelcome.includes("WELCOME_SEEN_KEY = 'bes-first-visit-welcome-v1'") && files.firstVisitWelcome.includes("WELCOME_VERSION = '1'")],
  ['First-visit welcome reads and persists seen state', files.firstVisitWelcome.includes('localStorage.getItem(WELCOME_SEEN_KEY)') && files.firstVisitWelcome.includes('localStorage.setItem(WELCOME_SEEN_KEY, WELCOME_VERSION)')],
  ['First-visit welcome protects auth and recovery routes', files.firstVisitWelcome.includes('isProtectedEntryRoute') && files.firstVisitWelcome.includes('recovery') && files.firstVisitWelcome.includes('register')],
  ['First-visit welcome has accessible dialog semantics', files.firstVisitWelcome.includes('role="dialog"') && files.firstVisitWelcome.includes('aria-modal="true"') && files.firstVisitWelcome.includes('aria-labelledby="brian-welcome-title"')],
  ['First-visit welcome implements proposal 10 actions', files.firstVisitWelcome.includes('Bắt đầu ngay') && files.firstVisitWelcome.includes('Khám phá sau') && files.firstVisitWelcome.includes('data-welcome-action="start"') && files.firstVisitWelcome.includes('data-welcome-action="later"')],
  ['First-visit welcome renders lighthouse scene', files.firstVisitWelcome.includes('brian-welcome-lighthouse') && files.firstVisitWelcomeCss.includes('.brian-welcome-lighthouse') && files.firstVisitWelcomeCss.includes('.brian-welcome-beam')],
  ['First-visit welcome uses 16:9 desktop composition', files.firstVisitWelcomeCss.includes('aspect-ratio:16/9')],
  ['First-visit welcome respects reduced motion', files.firstVisitWelcomeCss.includes('@media(prefers-reduced-motion:reduce)')],
  ['Lighthouse beam listens to pointer movement', files.firstVisitWelcome.includes("card.addEventListener('pointermove', onPointerMove)") && files.firstVisitWelcome.includes("card.addEventListener('pointerleave', onPointerLeave)")],
  ['Lighthouse beam interaction is animation-frame throttled', files.firstVisitWelcome.includes('requestAnimationFrame') && files.firstVisitWelcome.includes('pointerFrame')],
  ['Lighthouse beam uses CSS variables for live steering', files.firstVisitWelcome.includes("style.setProperty('--welcome-beam-angle'") && files.firstVisitWelcomeMotionCss.includes('--welcome-beam-angle')],
  ['Lighthouse beam has automatic sweep fallback', files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeBeamInteractiveSweep') && files.firstVisitWelcomeMotionCss.includes('animation:brianWelcomeBeamInteractiveSweep')],
  ['Lighthouse lantern pulses independently', files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeLanternPulse') && files.firstVisitWelcomeMotionCss.includes('.brian-welcome-lighthouse-lantern')],
  ['Interactive lighthouse motion respects reduced motion', files.firstVisitWelcomeMotionCss.includes('@media(prefers-reduced-motion:reduce)') && files.firstVisitWelcome.includes("matchMedia('(prefers-reduced-motion: reduce)')")],
  ['Welcome scene renders a sea-light reflection layer', files.firstVisitWelcome.includes('brian-welcome-sea-reflection') && files.firstVisitWelcome.includes('brian-welcome-reflection-core')],
  ['Sea reflection follows pointer-steered beam state', files.firstVisitWelcome.includes("style.setProperty('--welcome-reflection-x'") && files.firstVisitWelcome.includes("style.setProperty('--welcome-reflection-opacity'")],
  ['Sea reflection resets when pointer leaves', files.firstVisitWelcome.includes("style.removeProperty('--welcome-reflection-x')") && files.firstVisitWelcome.includes("style.removeProperty('--welcome-reflection-opacity')")],
  ['Sea reflection has cinematic animated water shimmer', files.firstVisitWelcomeMotionCss.includes('.brian-welcome-sea-reflection') && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeReflectionShimmer')],
  ['Sea reflection has automatic sweep synchronized with lighthouse', files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeReflectionSweep') && files.firstVisitWelcomeMotionCss.includes('brianWelcomeReflectionSweep 7s')],
  ['Sea reflection motion respects reduced motion', files.firstVisitWelcomeMotionCss.includes('.brian-welcome-sea-reflection') && files.firstVisitWelcomeMotionCss.includes('animation:none!important')],
  ['Cinematic welcome adds layered pointer parallax', files.firstVisitWelcome.includes("style.setProperty('--welcome-parallax-x'") && files.firstVisitWelcome.includes("style.setProperty('--welcome-parallax-y'") && files.firstVisitWelcomeMotionCss.includes('--welcome-parallax-x')],
  ['Cinematic welcome renders volumetric beam particles', files.firstVisitWelcome.includes('brian-welcome-light-particles') && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeParticleFloat')],
  ['Cinematic welcome uses three moving ocean layers', files.firstVisitWelcome.includes('wave-c') && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeWaveDrift')],
  ['Cinematic welcome renders parallax cloud layers', files.firstVisitWelcome.includes('brian-welcome-cloud cloud-far') && files.firstVisitWelcome.includes('brian-welcome-cloud cloud-near') && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeCloudDrift')],
  ['Cinematic welcome includes living stars and a rare shooting star', files.firstVisitWelcome.includes('brian-welcome-shooting-star') && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeShootingStar')],
  ['Cinematic welcome gives the moon a breathing halo', files.firstVisitWelcome.includes('brian-welcome-moon-halo') && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeMoonHalo')],
  ['Cinematic welcome makes feature cards beam-aware', files.firstVisitWelcome.includes('data-welcome-feature') && files.firstVisitWelcome.includes('is-feature-lit') && files.firstVisitWelcomeMotionCss.includes('.brian-welcome-features article.is-feature-lit')],
  ['Cinematic welcome gives the primary CTA magnetic motion and sweep', files.firstVisitWelcome.includes("style.setProperty('--welcome-cta-x'") && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeCtaSweep')],
  ['Cinematic welcome has staged entrance choreography', files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeSceneEntrance') && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeContentEntrance')],
  ['Cinematic welcome has a dedicated start transition', files.firstVisitWelcome.includes("root.classList.add('is-starting')") && files.firstVisitWelcomeMotionCss.includes('@keyframes brianWelcomeStartFlash')],
  ['Cinematic welcome pauses motion while the page is hidden', files.firstVisitWelcome.includes("document.addEventListener('visibilitychange', onVisibilityChange)") && files.firstVisitWelcomeMotionCss.includes('.is-motion-paused')],
  ['Cinematic visibility tune increases beam particles', (files.firstVisitWelcome.match(/<i><\/i>/g) || []).length >= 14],
  ['Cinematic visibility tune strengthens scene parallax', files.firstVisitWelcome.includes('const x = normalizedX * 13;') && files.firstVisitWelcome.includes('const y = normalizedY * 9;')],
  ['Cinematic visibility tune deepens ocean motion', files.firstVisitWelcomeMotionCss.includes('--welcome-wave-travel:18px') && files.firstVisitWelcomeMotionCss.includes('--welcome-wave-lift:5px')],
  ['Cinematic visibility tune makes shooting star easier to notice', files.firstVisitWelcomeMotionCss.includes('width:96px') && files.firstVisitWelcomeMotionCss.includes('animation:brianWelcomeShootingStar 13s linear 3s infinite')],
];

const failures = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
}

if (failures.length) {
  console.error(`\nUI contract failed: ${failures.length} check(s).`);
  process.exit(1);
}

console.log('\nUI contract passed.');