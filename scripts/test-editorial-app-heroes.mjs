import fs from 'node:fs';

const readOptional = (path) => {
  try { return fs.readFileSync(path, 'utf8'); } catch { return ''; }
};

const files = {
  externalJsx: readOptional('src/components/ExternalAppHero.jsx'),
  externalCss: readOptional('src/components/ExternalAppHero.css'),
  tesolJsx: readOptional('src/components/TesolMethodHero.jsx'),
  tesolCss: readOptional('src/components/TesolMethodHero.css'),
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
];

let failures = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`✓ ${label}`);
  else { failures += 1; console.error(`✗ ${label}`); }
}
if (failures) {
  console.error(`Editorial app hero UI contract failed: ${failures} check(s).`);
  process.exit(1);
}
console.log('Editorial app hero UI contract passed.');
