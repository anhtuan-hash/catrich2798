#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '11.6.3';
const root = process.cwd();
const checks = [];
const failures = [];

function assert(name, condition, detail = '') {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function text(relative) {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const packageJson = JSON.parse(text('package.json') || '{}');
const index = text('index.html');
const jsPath = path.join(root, 'public/bes-appearance-v1163/appearance-engine.js');
const cssPath = path.join(root, 'public/bes-appearance-v1163/appearance-engine.css');
const js = text('public/bes-appearance-v1163/appearance-engine.js');
const css = text('public/bes-appearance-v1163/appearance-engine.css');

assert('Package version', packageJson.version === VERSION, `nhận ${packageJson.version || 'trống'}`);
assert('Verify script registered', packageJson.scripts?.[`verify:v${VERSION}`] === 'node scripts/verify-v11.6.3.mjs');
assert('Index V11.6.3 stylesheet', index.includes('/bes-appearance-v1163/appearance-engine.css'));
assert('Index V11.6.3 runtime', index.includes('/bes-appearance-v1163/appearance-engine.js'));
assert('Old V11.6.2 runtime inactive', !index.includes('<script type="module" src="/bes-appearance-v1162/appearance-engine.js"></script>'));
assert('Appearance runtime exists', fs.existsSync(jsPath));
assert('Appearance stylesheet exists', fs.existsSync(cssPath));
assert('Release descriptor exists', fs.existsSync(path.join(root, 'public/bes-release-v11.6.3.json')));

for (const token of [
  "BES_APPEARANCE_VERSION = '11.6.3'",
  'function isSettingsRoute()',
  'function cleanupAppearanceUiOutsideSettings()',
  'if (!isSettingsRoute())',
  'event.stopPropagation()',
  "&& isSettingsRoute()",
  'window.addEventListener(\'popstate\'',
]) assert(`Route guard contract: ${token}`, js.includes(token));

assert('No global legacy binding call', !js.includes('decorateLegacyControls();'));
assert('Settings-only enhancement guard', js.includes('if (!isSettingsRoute()) return;'));
assert('Studio close on non-settings route', js.includes('else cleanupAppearanceUiOutsideSettings();'));
assert('Theme Studio CSS retained', css.includes('.bes-theme-studio'));
assert('Reduced motion CSS retained', css.includes('prefers-reduced-motion'));

const syntax = spawnSync(process.execPath, ['--check', jsPath], { cwd: root, encoding: 'utf8' });
assert('Runtime JavaScript syntax', syntax.status === 0, syntax.stderr.trim());

if (failures.length) {
  console.error(`V${VERSION} static verification FAILED (${checks.length - failures.length}/${checks.length})`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`V${VERSION} static verification PASS (${checks.length}/${checks.length})`);

const scripts = packageJson.scripts || {};
const commands = [];
if (scripts.build) commands.push(['npm', ['run', 'build'], 'Production build']);
if (scripts.test) commands.push(['npm', ['test'], 'Smoke tests']);
if (scripts['test:department']) commands.push(['npm', ['run', 'test:department'], 'Department runtime']);

for (const [command, args, label] of commands) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`✗ ${label} FAILED`);
    process.exit(result.status || 1);
  }
  console.log(`✓ ${label} PASS`);
}
console.log(`\n✓ Brian Appearance Route Guard V${VERSION} PASS`);
