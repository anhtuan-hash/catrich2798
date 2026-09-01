import fs from 'node:fs';

const read = (path) => {
  try { return fs.readFileSync(path, 'utf8'); } catch { return ''; }
};

const runtime = read('src/welcomeSceneAlignmentFix.js');
const bootstrap = read('src/tabResumeStability.js');

const checks = [
  ['Welcome scene alignment fix is bootstrapped before welcome mount', bootstrap.includes("import './welcomeSceneAlignmentFix.js';")],
  ['Lighthouse beam uses the rendered lantern as its source', runtime.includes("querySelector('.brian-welcome-lighthouse-lantern')") && runtime.includes('--welcome-lantern-x') && runtime.includes('--welcome-lantern-y')],
  ['Beam and particles share the lighthouse parallax layer', runtime.includes('lighthouseLayer.insertBefore(beam, lighthouse)') && runtime.includes('lighthouseLayer.insertBefore(particles, lighthouse)')],
  ['Pointer steering measures the real lantern center', runtime.includes('lanternRect.left + lanternRect.width * 0.5') && runtime.includes('lanternRect.top + lanternRect.height * 0.5')],
  ['Meteor trails fall from upper-left to lower-right', runtime.includes('@keyframes brianWelcomeMeteorFall') && runtime.includes('--meteor-fall-rotation:26deg') && runtime.includes('--meteor-fall-rotation:31deg') && runtime.includes('translate3d(var(--meteor-dx),var(--meteor-dy),0)')],
  ['Legacy shooting star also falls downward', runtime.includes('@keyframes brianWelcomeShootingStarFall') && runtime.includes('rotate(24deg)') && runtime.includes('translate3d(210px,96px,0)')],
  ['Cinematic ocean replaces arc borders with horizontal water bands', runtime.includes('.brian-welcome-card .brian-welcome-wave{') && runtime.includes('border:0!important') && runtime.includes('border-radius:0!important')],
  ['Cinematic ocean uses layered horizontal surface texture', runtime.includes('repeating-linear-gradient(0deg') && runtime.includes('@keyframes brianWelcomeOceanSurfaceDrift')],
  ['Cinematic ocean raises and softens the horizon', runtime.includes('--welcome-ocean-horizon:34%') && runtime.includes('.brian-welcome-card .brian-welcome-horizon{bottom:var(--welcome-ocean-horizon)!important')],
  ['Moonlight reflection becomes a vertical broken path on the water', runtime.includes('@keyframes brianWelcomeMoonPathReflection') && runtime.includes('brian-welcome-ocean-layer:after') && runtime.includes('mask-image:linear-gradient(to bottom')],
  ['Lighthouse reflection is narrow instead of a giant diagonal wedge', runtime.includes('.brian-welcome-card .brian-welcome-sea-reflection{') && runtime.includes('width:22%!important') && runtime.includes('clip-path:none!important')],
  ['Cinematic ocean keeps a calm static fallback for reduced motion', runtime.includes('@media(prefers-reduced-motion:reduce)') && runtime.includes('brianWelcomeOceanSurfaceDrift') && runtime.includes('animation:none!important')],
];

let failures = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`✓ ${label}`);
  else { failures += 1; console.error(`✗ ${label}`); }
}

if (failures) {
  console.error(`Welcome scene alignment contract failed: ${failures} check(s).`);
  process.exit(1);
}

console.log('Welcome scene alignment contract passed.');
