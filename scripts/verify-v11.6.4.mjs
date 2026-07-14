#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '11.6.4';
const root = process.cwd();
const failures = [];
const checks = [];
const text = (relative) => {
  const file = path.join(root, relative);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};
function assert(name, condition, detail = '') {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const pkg = JSON.parse(text('package.json') || '{}');
const index = text('index.html');
const jsRelative = 'public/bes-ai-composer-v1164/ai-composer-hotfix.js';
const cssRelative = 'public/bes-ai-composer-v1164/ai-composer-hotfix.css';
const jsPath = path.join(root, jsRelative);
const js = text(jsRelative);
const css = text(cssRelative);

assert('Package version', pkg.version === VERSION, `nhận ${pkg.version || 'trống'}`);
assert('Verify script', pkg.scripts?.[`verify:v${VERSION}`] === 'node scripts/verify-v11.6.4.mjs');
assert('Index stylesheet', index.includes('/bes-ai-composer-v1164/ai-composer-hotfix.css'));
assert('Index runtime', index.includes('/bes-ai-composer-v1164/ai-composer-hotfix.js'));
assert('Release descriptor', fs.existsSync(path.join(root, 'public/bes-release-v11.6.4.json')));
assert('CSS file', Boolean(css));
assert('JS file', Boolean(js));

for (const token of [
  "BES_AI_COMPOSER_VERSION = '11.6.4'",
  'function panelFor(textarea)',
  'function findComposer(panel, textarea, sendButton, toolButtons)',
  'function enforceInlineLayout(panel, composer, textarea, sendButton)',
  "textarea.dataset.besAiTextareaV1164 = 'true'",
  "position: 'static'",
  "width: '100%'",
  "'writing-mode': 'horizontal-tb'",
  'new MutationObserver',
]) assert(`Runtime contract: ${token}`, js.includes(token));

for (const token of [
  'textarea[data-bes-ai-textarea-v1164="true"]',
  'width: 100% !important',
  'min-width: 100% !important',
  'writing-mode: horizontal-tb !important',
  '[data-bes-ai-send-v1164="true"]',
  'position: absolute !important',
  '[data-bes-ai-tools-v1164="true"]',
]) assert(`CSS contract: ${token}`, css.includes(token));

const syntax = spawnSync(process.execPath, ['--check', jsPath], { cwd: root, encoding: 'utf8' });
assert('Runtime JavaScript syntax', syntax.status === 0, syntax.stderr.trim());

if (failures.length) {
  console.error(`V${VERSION} static verification FAILED (${checks.length - failures.length}/${checks.length})`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`V${VERSION} static verification PASS (${checks.length}/${checks.length})`);

const scripts = pkg.scripts || {};
const commands = [];
if (scripts.build) commands.push(['npm', ['run', 'build'], 'Production build']);
if (scripts.test) commands.push(['npm', ['test'], 'Smoke tests']);
if (scripts['test:department']) commands.push(['npm', ['run', 'test:department'], 'Department runtime']);
for (const [command, args, label] of commands) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
  console.log(`✓ ${label} PASS`);
}
console.log(`\n✓ Brian AI Composer Horizontal Hotfix V${VERSION} PASS`);
