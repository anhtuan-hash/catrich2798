import fs from 'node:fs';

const readOptional = (path) => {
  try { return fs.readFileSync(path, 'utf8'); } catch { return ''; }
};

const files = {
  externalJsx: readOptional('src/components/ExternalAppHero.jsx'),
  externalCss: readOptional('src/components/ExternalAppHero.css'),
  tesolJsx: readOptional('src/components/TesolMethodHero.jsx'),
  tesolCss: readOptional('src/components/TesolMethodHero.css'),
  heroEditor: readOptional('src/components/HomeHeroCmsEditor.jsx'),
  mobileHeroAdmin: readOptional('src/components/MobileHeroAdminField.jsx'),
  mobileDirectHero: readOptional('src/mobileHomeDirectHero.js'),
  mobileHeroApi: readOptional('api/homepage-mobile-hero-publish.js'),
  mobileHeroBootstrap: readOptional('public/hero/mobile-current.json'),
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
  ['Homepage Hero editor embeds the dedicated Mobile Hero field', files.heroEditor.includes("import MobileHeroAdminField from './MobileHeroAdminField.jsx'") && files.heroEditor.includes('<MobileHeroAdminField currentUser={currentUser} />')],
  ['Mobile Hero controls follow TTCM/Admin editor access in the client', files.mobileHeroAdmin.includes('isDepartmentLeaderRole(currentUser?.role)') && files.mobileHeroAdmin.includes('Chỉ tài khoản TTCM/Admin')],
  ['Mobile Hero controls accept image files and support preview, publish, and reset', files.mobileHeroAdmin.includes('IMAGE_ACCEPT') && files.mobileHeroAdmin.includes('Công bố ảnh mobile') && files.mobileHeroAdmin.includes('handleReset') && files.mobileHeroAdmin.includes('Xem trước Hero Mobile')],
  ['Mobile Hero is published independently from the desktop Hero document', files.mobileHeroAdmin.includes('/api/homepage-mobile-hero-publish') && files.mobileHeroApi.includes("const MOBILE_DOCUMENT_PATH = 'public/hero/mobile-current.json'")],
  ['Mobile Hero publish API authorizes TTCM/Admin on the server', files.mobileHeroApi.includes("!['admin', 'administrator', 'department_head', 'department-head', 'ttcm'].includes(role)") && files.mobileHeroApi.includes('Only Admin/TTCM can publish the Mobile Hero image')],
  ['Mobile Hero publish API restricts media to image MIME types', files.mobileHeroApi.includes('ALLOWED_IMAGE_TYPES') && !files.mobileHeroApi.includes("['video/mp4'" )],
  ['Mobile homepage loads the published Mobile Hero with the existing art as fallback', files.mobileDirectHero.includes("const MOBILE_HERO_DOCUMENT = '/hero/mobile-current.json'") && files.mobileDirectHero.includes('publishedMobileHeroUrl || mobileHomeHeroImage')],
  ['Mobile Hero document supports bootstrap or published art', files.mobileHeroBootstrap.includes('"delivery": "vercel-static"') && files.mobileHeroBootstrap.includes('"fit": "contain"') && (files.mobileHeroBootstrap.includes('"revision": "bootstrap"') || (files.mobileHeroBootstrap.includes('"url": "/hero/media/') && files.mobileHeroBootstrap.includes('"mimeType": "image/')))],
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
