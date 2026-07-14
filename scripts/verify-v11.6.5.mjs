#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '11.6.5';
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
const jsRelative = 'public/bes-ai-governance-v1165/ai-governance-resilience.js';
const cssRelative = 'public/bes-ai-governance-v1165/ai-governance-resilience.css';
const jsPath = path.join(root, jsRelative);
const js = text(jsRelative);
const css = text(cssRelative);

assert('Package version', pkg.version === VERSION, `nhận ${pkg.version || 'trống'}`);
assert('Verify script', pkg.scripts?.[`verify:v${VERSION}`] === 'node scripts/verify-v11.6.5.mjs');
assert('Runtime test script', pkg.scripts?.[`test:v${VERSION}`] === 'node scripts/test-v11.6.5-resilience.mjs');
assert('Index stylesheet', index.includes('/bes-ai-governance-v1165/ai-governance-resilience.css'));
assert('Index runtime', index.includes('/bes-ai-governance-v1165/ai-governance-resilience.js'));
assert('Release descriptor', fs.existsSync(path.join(root, 'public/bes-release-v11.6.5.json')));
assert('CSS file', Boolean(css));
assert('JS file', Boolean(js));

for (const token of [
  "BES_AI_GOVERNANCE_VERSION = '11.6.5'",
  'function saveSnapshot(announce = false)',
  'function restoreSnapshot()',
  'localStorage.setItem(storageKey()',
  "new CustomEvent('bes-ai-governance-updated'",
  'function setNativeValue(element, value)',
  'function setNativeChecked(element, checked)',
  'PROMPT_LIMIT_RE',
  'function compactMessages(messages, tokenBudget)',
  "next.model = 'openrouter/free'",
  "mode: 'compact-current-model'",
  "mode: 'ultra-compact-free'",
  'if (response.ok || descriptor.method',
  'window.BrianAIGovernanceV1165',
]) assert(`Runtime contract: ${token}`, js.includes(token));

for (const token of [
  '#bes-v1165-toast-stack',
  '.bes-v1165-toast',
  'button[data-bes-governance-saved-v1165="true"]::after',
]) assert(`CSS contract: ${token}`, css.includes(token));

const syntax = spawnSync(process.execPath, ['--check', jsPath], { cwd: root, encoding: 'utf8' });
assert('Runtime JavaScript syntax', syntax.status === 0, syntax.stderr.trim());
const testSyntax = spawnSync(process.execPath, ['--check', path.join(root, 'scripts/test-v11.6.5-resilience.mjs')], { cwd: root, encoding: 'utf8' });
assert('Runtime test syntax', testSyntax.status === 0, testSyntax.stderr.trim());

if (failures.length) {
  console.error(`V${VERSION} static verification FAILED (${checks.length - failures.length}/${checks.length})`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`V${VERSION} static verification PASS (${checks.length}/${checks.length})`);

const resilience = spawnSync(process.execPath, ['scripts/test-v11.6.5-resilience.mjs'], { cwd: root, stdio: 'inherit' });
if (resilience.status !== 0) process.exit(resilience.status || 1);

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
console.log(`\n✓ AI Governance Save & OpenRouter Free Rescue V${VERSION} PASS`);
