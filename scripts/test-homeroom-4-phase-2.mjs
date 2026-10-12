import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('../'+p, import.meta.url),'utf8');
const css = read('src/styles/homeroom-4-expressive.css');
const tokens = read('src/styles/homeroom-4-tokens.css');
const workspace = read('src/pages/HomeroomWorkspace.jsx');
const tabs = read('src/components/homeroom/HomeroomNavigationPalette.jsx');
const hero = read('src/components/homeroom/HomeroomGlassHero.jsx');
assert.match(workspace, /page hr-page hr-v4/, 'Scoped design class must be present');
assert.match(workspace, /import '..\/styles\/homeroom-4-expressive\.css'/, 'Scoped CSS must load after tokens');
assert.match(css, /\.page\.hr-page\.hr-v4 \.hr-campus-hero\s*\{[\s\S]*?height:\s*308px/, 'Hero must use a short desktop layout');
assert.match(css, /\.hr-campus-scene__svg/, 'Keep original vector art visible');
assert.match(css, /\.hr-campus-hero__actions button/, 'Hero actions remain usable');
assert.match(css, /@media \(max-width: 1100px\)/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /@media \(max-width: 520px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /html\[data-theme="dark"\]/);
assert.doesNotMatch(css, /(^|\n)\s*:root\s*\{/);
assert.doesNotMatch(css, /\.gradebook|\.app-shell|\.attendance-app/, 'Never style other apps');
assert.match(tabs, /data-tone=\{tab\.key\}/);
assert.match(tabs, /aria-current=\{active === tab\.key \? 'page' : undefined\}/);
assert.match(tabs, /aria-controls="hr-workspace-body"/);
for(const name of ['LayoutDashboard','Layers3','UsersRound','FolderOpen','CalendarCheck2','Award','ShieldCheck']){
  assert.ok(tabs.includes(name), 'Missing meaningful icon: '+name);
}
assert.match(workspace, /<main id="hr-workspace-body"/);
assert.match(workspace, /visibleTab === 'classes'\) \? <HomeroomClassProfileEditor/, 'The class profile form must not blanket the daily overview');
assert.match(hero, /onClick=\{\(\) => navigate\('classes'\)\}/, 'Manage class action should open class management');
assert.match(hero, /<CampusScene \/>/, 'Keep CampusScene vector illustration');
for(const key of ['primary','teal','violet','coral','radius-card','surface','ink','focus-ring']){
 assert.match(tokens, new RegExp('--hr4-'+key+'\\s*:'));
}
console.log('Homeroom 4.0 Phase 2: compact responsive hero, 7 accessible colorful tabs, scoped forms and vector scene OK');
