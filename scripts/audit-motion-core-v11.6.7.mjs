import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';

const read = (path) => fs.readFileSync(path, 'utf8');
const catalog = read('src/motion/motionCatalog.js');
const runtime = read('src/motion/englishHubMotionCore.js');
const bridge = read('src/components/GlobalMotionCoreBridge.jsx');
const appearance = read('src/components/SettingsAppearanceEngine.jsx');
const navigation = read('src/components/GlobalFlatNavigation.jsx');
const labHtml = read('public/motion-lab.html');
const labData = read('public/motion-lab-data.js');
const labRuntime = read('public/motion-lab-runtime.js');

const sourceIds = [...catalog.matchAll(/sourceId:\s*'([^']+)'/g)].map((match) => match[1]);
assert.equal(sourceIds.length, 21, 'Production catalog must contain 21 selected effects.');
assert.equal(new Set(sourceIds).size, sourceIds.length, 'Production source effects must be unique.');
assert.match(catalog, /SEMANTIC_EFFECTS/);
assert.match(catalog, /MOTION_FEATURE_DEFAULTS/);

for (const api of ['runEffect', 'runSemanticMotion', 'createRipple', 'createParticleBurst', 'animateNumber', 'installMotionCoreApi']) {
  assert.match(runtime, new RegExp(`export function ${api}`), `Missing Motion Core API: ${api}`);
}
assert.match(runtime, /prefers-reduced-motion/);
assert.match(runtime, /bes-appearance-v2/);
assert.match(runtime, /performance === 'low'/);
assert.match(runtime, /overrides\.persist !== true/);
assert.doesNotMatch(runtime, /animejs|cdn\.jsdelivr/i);

assert.match(bridge, /MutationObserver/);
assert.match(bridge, /bes-motion-success/);
assert.match(bridge, /data-motion-effect/);
assert.match(bridge, /motionCelebrate === 'true'/);
assert.doesNotMatch(bridge, /đã lưu\|thành công/);

assert.match(appearance, /MotionCoreSettings/);
assert.match(navigation, /GlobalMotionCoreBridge/);
assert.match(labHtml, /MOTION_LAB_EFFECTS_READY\.then/);
assert.match(labHtml, /motion-lab-runtime\.js/);
assert.doesNotMatch(labHtml + labData + labRuntime, /cdn\.jsdelivr|anime\.umd/i);

const encoded = labData.match(/MOTION_LAB_GZIP_BASE64='([^']+)'/)?.[1];
assert.ok(encoded, 'Compressed Motion Lab catalog is missing.');
const effects = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
assert.equal(effects.length, 100, 'Motion Lab must preserve all 100 effects.');
assert.equal(new Set(effects.map((effect) => effect.id)).size, 100, 'Motion Lab effect IDs must be unique.');
assert.equal(effects.filter((effect) => effect.kind === 'generic').length, 64);
assert.equal(effects.filter((effect) => effect.kind === 'custom').length, 36);
const runners = new Set(effects.filter((effect) => effect.kind === 'custom').map((effect) => effect.runner));
for (const runner of runners) assert.match(labRuntime, new RegExp(`${runner}\\(stage\\)`), `Missing custom runner: ${runner}`);

new vm.Script(labData, { filename: 'motion-lab-data.js' });
new vm.Script(labRuntime, { filename: 'motion-lab-runtime.js' });
console.log(`Motion Core audit passed: ${sourceIds.length} production effects, ${effects.length} lab effects, ${runners.size} custom runners.`);
