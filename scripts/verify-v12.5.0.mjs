import fs from 'node:fs';

const files = [
  'src/pages/Home.jsx',
  'src/pages/WebApps.jsx',
  'src/pages/Games.jsx',
  'src/pages/SpecialTools.jsx',
  'src/ui-core/components/UILaunch.jsx',
  'src/ui-core/styles/ui-core.css',
  'src/ui-core/layouts/routeLayout.js',
  'src/config/version.js',
  'package.json',
];

for (const file of files) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const source = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const home = source[files[0]];
const apps = source[files[1]];
const games = source[files[2]];
const tools = source[files[3]];
const launch = source[files[4]];
const css = source[files[5]];
const routes = source[files[6]];
const version = source[files[7]];
const pkg = JSON.parse(source[files[8]]);

const assertions = [
  ['Shared UILaunchPage primitive', launch.includes('export const UILaunchPage') && launch.includes('data-ui="launch"')],
  ['Shared launch anatomy primitives', ['UILaunchHero', 'UILaunchStage', 'UILaunchToolbar', 'UILaunchNavigation', 'UILaunchGrid', 'UILaunchPinned'].every((name) => launch.includes(`export const ${name}`))],
  ['Home launch contract', home.includes('<UILaunchPage app="home"') && home.includes('<UILaunchHero') && home.includes('<UILaunchStage')],
  ['Home pinned contract', home.includes('<UILaunchPinned')],
  ['Apps launch contract', apps.includes('<UILaunchPage app="apps"') && apps.includes('<UILaunchHero')],
  ['Apps shared toolbar and grid', apps.includes('<UILaunchToolbar') && apps.includes('<UILaunchGrid')],
  ['Apps shared pinned area', apps.includes('<UILaunchPinned')],
  ['Duplicate apps navigation retired', !apps.includes('<TopMenu') && !apps.includes('function TopMenu')],
  ['Launcher dock contract', apps.includes('bui-launch-dock') && apps.includes('bui-launch-dock-config')],
  ['Launcher tile contract', apps.includes('bui-launch-tile flat-app-window-card')],
  ['Games launch contract', games.includes('<UILaunchPage app="games"') && games.includes('<UILaunchHero')],
  ['Games platform grid contract', games.includes('bui-launch-game-grid') && games.includes('bui-launch-tile games-v46-platform-card')],
  ['Games preview contract', games.includes('bui-launch-preview') && games.includes('bui-launch-action-band')],
  ['Tools launch contract', tools.includes('<UILaunchPage app="tools"') && tools.includes('<UILaunchGrid')],
  ['Launch root styling', css.includes('.bui-launch {') && css.includes(".app-shell[data-layout='launch'] #bes-main-content")],
  ['Launch hero and stage styling', css.includes('.bui-launch-hero {') && css.includes('.bui-launch-stage,')],
  ['Launch toolbar and navigation styling', css.includes('.bui-launch-toolbar {') && css.includes('.bui-launch-navigation {')],
  ['Launch grid and tile styling', css.includes('.bui-launch-grid {') && css.includes('.bui-launch-tile {')],
  ['Material 3 launch adapter', css.includes("html[data-design-language='material-3'] .bui-launch-hero")],
  ['Apple launch adapter', css.includes("html[data-design-language='apple'] .bui-launch-hero")],
  ['Responsive launch contracts', css.includes('@media (max-width: 1080px)') && css.includes('@media (max-width: 720px)')],
  ['Horizontal input safeguard', css.includes('writing-mode: horizontal-tb !important')],
  ['Launch route mapping', routes.includes("['home', 'launch']") && routes.includes("['apps', 'launch']") && routes.includes("['games', 'launch']") && routes.includes("['tools', 'launch']")],
  ['Version registry', version.includes("12.5.0") && pkg.version === '12.5.0'],
  ['V12.5 verification command', Boolean(pkg.scripts?.['verify:v12.5.0'])],
];

let passed = 0;
for (const [label, ok] of assertions) {
  if (!ok) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
  passed += 1;
}
console.log(`V12.5.0 unified Launch Experience verification PASS (${passed}/${assertions.length})`);
