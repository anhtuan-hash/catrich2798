import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const hub = read('src/components/DashboardNewsHub.jsx');
const page = read('src/pages/WorkDashboard.jsx');
const css = read('src/styles/dashboard-newsroom-editorial-20261023.css');

assert.match(hub, /items\.slice\(0, 4\)/, 'Compact mode shows only four news items');
assert.match(hub, /compactItems\.slice\(1\)/, 'Only three secondary stories');
assert.match(hub, /dnh dnh-editorial/, 'Dedicated scoped design class');
assert.match(hub, /dnh-image-backdrop/, 'Portrait-safe backdrop image');
const compact = hub.slice(hub.indexOf('!expanded ? <div className="dnh-grid">'), hub.indexOf(' : <div className="dnh-full">'));
assert.match(compact, /dnh-featured/);
assert.match(compact, /dnh-story/);
assert.doesNotMatch(compact, /dnh-story-summary/, 'Compact secondary headlines should not repeat full summaries');
assert.match(hub, /role="tablist"/, 'News channels remain available');
assert.match(hub, /setSelected\(item\)/, 'Focused article reader preserved');
assert.match(hub, /dnh-full-grid/, 'Expanded newsroom preserved');
assert.match(hub, /\/api\/news-feed/, 'Backend news feed preserved');
assert.match(hub, /\/api\/news-article/, 'Backend article reader preserved');

const imports = [...page.matchAll(/import '\.\.\/styles\/([^']+\.css)';/g)].map((m) => m[1]);
assert.equal(imports[6], 'dashboard-newsroom-editorial-20261023.css',
  'Newsroom still follows the six original editorial CSS layers');
assert.deepEqual(imports.slice(7), ['dashboard-hero-cms.css', 'dashboard-hero-minimal-20261023.css', 'dashboard-hero-typography.css', 'dashboard-align-homeroom-edges.css'],
  'Later, separately scoped Hero customization and type styles do not replace Newsroom authority');
assert.match(css, /dnh\.dnh-editorial:not\(\.is-expanded\) \.dnh-grid/);
assert.match(css, /grid-template-columns: minmax\(0, 1\.14fr\) minmax\(0, \.86fr\)/);
assert.match(css, /grid-template-rows: 210px minmax\(0, auto\)/);
assert.match(css, /max-height: 210px/);
assert.match(css, /object-fit: contain/);
assert.match(css, /filter: blur\(15px\)/);
assert.match(css, /grid-template-rows: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /\.dnh-story-summary\s*\{\s*display: none/);
assert.match(css, /@media \(max-width: 980px\)/);
assert.match(css, /@media \(max-width: 620px\)/);
assert.match(css, /grid-template-rows: 176px minmax\(0, auto\)/);
assert.match(css, /:focus-visible/);
assert.doesNotMatch(css, /(^|\n)\s*(html|body|\:root)\s*\{/m, 'No global style overrides');
assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, 'Newsroom CSS balanced');
console.log('PASS: three readable secondary stories, height-bounded portrait-safe lead, scoped desktop/tablet/mobile rules, expanded reader preserved.');
