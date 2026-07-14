#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '11.6.6';
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
const jsRelative = 'public/bes-ai-composer-v1166/ai-composer-rebuild.js';
const cssRelative = 'public/bes-ai-composer-v1166/ai-composer-rebuild.css';
const jsPath = path.join(root, jsRelative);
const js = text(jsRelative);
const css = text(cssRelative);

assert('Package version', pkg.version === VERSION, `nhận ${pkg.version || 'trống'}`);
assert('Verify script', pkg.scripts?.[`verify:v${VERSION}`] === 'node scripts/verify-v11.6.6.mjs');
assert('Runtime test script', pkg.scripts?.[`test:v${VERSION}`] === 'node scripts/test-v11.6.6-composer.mjs');
assert('New stylesheet injection', index.includes('/bes-ai-composer-v1166/ai-composer-rebuild.css'));
assert('New runtime injection', index.includes('/bes-ai-composer-v1166/ai-composer-rebuild.js'));
assert('Old stylesheet removed', !index.includes('/bes-ai-composer-v1164/ai-composer-hotfix.css'));
assert('Old runtime removed', !index.includes('/bes-ai-composer-v1164/ai-composer-hotfix.js'));
assert('Old marker removed', !index.includes('BES_AI_COMPOSER_V1164'));
assert('Old asset directory removed', !fs.existsSync(path.join(root, 'public/bes-ai-composer-v1164')));
assert('Release descriptor', fs.existsSync(path.join(root, 'public/bes-release-v11.6.6.json')));
assert('CSS file', Boolean(css));
assert('JS file', Boolean(js));

for (const token of [
  "const VERSION = '11.6.6'",
  'function chooseWideRoot(panel, editor, tools)',
  'function conflictReport(panel, root, editor)',
  'function structuralFallback(root, editor, send)',
  'function pathFromEditorToRoot(editor, root)',
  "editor.dataset.besAiEditorV1166 = 'true'",
  "'grid-column': '1 / -1'",
  "'writing-mode': 'horizontal-tb'",
  'new MutationObserver',
  'BESAIComposerRebuildV1166'
]) assert(`Runtime contract: ${token}`, js.includes(token));

for (const token of [
  '[data-bes-ai-root-v1166="true"]',
  '[data-bes-ai-path-v1166="true"]',
  '[data-bes-ai-editor-v1166="true"]',
  'inline-size: 100% !important',
  'grid-column: 1 / -1 !important',
  'writing-mode: horizontal-tb !important',
  '[data-bes-ai-tools-v1166="true"]',
  '[data-bes-ai-send-v1166="true"]'
]) assert(`CSS contract: ${token}`, css.includes(token));

const syntax = spawnSync(process.execPath, ['--check', jsPath], { cwd: root, encoding: 'utf8' });
assert('Runtime JavaScript syntax', syntax.status === 0, syntax.stderr.trim());

if (failures.length) {
  console.error(`V${VERSION} static verification FAILED (${checks.length - failures.length}/${checks.length})`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`V${VERSION} static verification PASS (${checks.length}/${checks.length})`);

const runtime = spawnSync(process.execPath, ['scripts/test-v11.6.6-composer.mjs'], { cwd: root, stdio: 'inherit' });
if (runtime.status !== 0) process.exit(runtime.status || 1);

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
console.log(`\n✓ Brian AI Composer Clean Rebuild V${VERSION} PASS`);
