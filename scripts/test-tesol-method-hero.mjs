import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

assert.ok(fs.existsSync('src/components/TesolMethodHero.jsx'), 'TesolMethodHero.jsx must exist');
assert.ok(fs.existsSync('src/components/TesolMethodHero.css'), 'TesolMethodHero.css must exist');

const hero = read('src/components/TesolMethodHero.jsx');
const integration = read('src/components/ExternalAppsIntegration.jsx');
const viewer = read('src/components/ExternalWebAppViewer.jsx');
const css = read('src/components/TesolMethodHero.css');

assert.match(hero, /Master ELT Terms & Concepts/, 'hero heading must match approved copy');
assert.match(hero, /Explore Terms/, 'hero must expose Explore Terms CTA');
assert.match(hero, /View Dashboard/, 'hero must expose View Dashboard CTA');
assert.match(hero, /#\/dashboard/, 'dashboard CTA must target the verified Brian dashboard route');
assert.match(integration, /TesolMethodHero/, 'TESOL route must render the dedicated hero');
assert.match(integration, /introContent=/, 'TESOL hero must be passed into the embedded viewer');
assert.match(integration, /explorerId="tesol-method-explorer"/, 'TESOL explorer must expose a stable anchor');
assert.match(viewer, /introContent = null/, 'viewer must keep intro content optional for other apps');
assert.match(viewer, /explorerId = ''/, 'viewer must keep explorer id optional for other apps');
assert.match(viewer, /data-has-intro=/, 'viewer must scope intro layout behavior');
assert.match(css, /data-has-intro="true"/, 'intro scrolling must be scoped to viewers that have hero content');

console.log('TESOL hero source contract passed.');
