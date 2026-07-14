#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const VERSION = '11.6.7';
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
const jsRelative = 'public/bes-ai-dock-v2/ai-dock-v2.js';
const cssRelative = 'public/bes-fonts/brian-font.css';
const js = text(jsRelative);
const css = text(cssRelative);
const fontFiles = ['woff2', 'woff', 'ttf', 'otf']
  .map((ext) => path.join(root, 'public', 'bes-fonts', `brian-personal-font.${ext}`))
  .filter((file) => fs.existsSync(file));

assert('package version', pkg.version === VERSION, `nhận ${pkg.version || 'trống'}`);
assert('verify script registered', pkg.scripts?.[`verify:v${VERSION}`] === 'node scripts/verify-v11.6.7.mjs');
assert('test script registered', pkg.scripts?.[`test:v${VERSION}`] === 'node scripts/test-v11.6.7-ai-dock.mjs');
assert('index start marker', index.includes('BES_AI_DOCK_V2_V1167_START'));
assert('index end marker', index.includes('BES_AI_DOCK_V2_V1167_END'));
assert('index new dock asset', index.includes('/bes-ai-dock-v2/ai-dock-v2.js'));
assert('index font css', index.includes('/bes-fonts/brian-font.css'));
assert('index preloads font', /\/bes-fonts\/brian-personal-font\.(woff2|woff|ttf|otf)/.test(index));
assert('old V11.6.4 injection removed', !index.includes('BES_AI_COMPOSER_V1164') && !index.includes('bes-ai-composer-v1164'));
assert('old V11.6.6 injection removed', !index.includes('BES_AI_COMPOSER_V1166') && !index.includes('bes-ai-composer-v1166'));
assert('new dock JS exists', fs.existsSync(path.join(root, jsRelative)));
assert('font CSS exists', fs.existsSync(path.join(root, cssRelative)));
assert('deployed font alias exists', fontFiles.length === 1, `tìm thấy ${fontFiles.length}`);
assert('deployed font is non-trivial', fontFiles.length === 1 && fs.statSync(fontFiles[0]).size >= 8000);
assert('font CSS points to stable alias', /\/bes-fonts\/brian-personal-font\.(woff2|woff|ttf|otf)/.test(css));
assert('font display swap', css.includes('font-display: swap'));
assert('font variables applied', css.includes('--bes-font-personal'));
assert('icon font protection', css.includes('material-symbols-outlined') && css.includes('[class^="fa-"]'));
assert('Shadow DOM isolation', js.includes("attachShadow({ mode: 'open' })"));
assert('legacy panel removal', js.includes('removeLegacyAI') && js.includes('isLegacyPanel'));
assert('legacy rerender observer', js.includes('new MutationObserver'));
assert('horizontal editor contract', js.includes('writing-mode:horizontal-tb!important') && js.includes('width:100%!important'));
assert('provider bridge', js.includes('callBridge') && js.includes('bes:ai-dock-request'));
assert('OpenRouter fallback', js.includes('https://openrouter.ai/api/v1/chat/completions') && js.includes('openrouter/free'));
assert('prompt-limit retry', js.includes('prompt tokens limit exceeded') && js.includes('callOpenRouter(userText, true)'));
assert('context toggle', js.includes('usePageContext'));
assert('file attachment limit', js.includes('MAX_ATTACHMENTS = 5'));
assert('screen capture', js.includes('getDisplayMedia'));
assert('voice dictation', js.includes('SpeechRecognition'));
assert('new host id', js.includes("const HOST_ID = 'bes-ai-dock-v2-host'"));

const syntax = spawnSync(process.execPath, ['--check', path.join(root, jsRelative)], { encoding: 'utf8' });
assert('JavaScript syntax', syntax.status === 0, syntax.stderr.trim());

const runtimeTest = spawnSync(process.execPath, [path.join(root, 'scripts', 'test-v11.6.7-ai-dock.mjs')], { cwd: root, encoding: 'utf8' });
assert('runtime contract test', runtimeTest.status === 0, (runtimeTest.stderr || runtimeTest.stdout).trim());

if (failures.length) {
  console.error(`V${VERSION} verification FAILED (${checks.length - failures.length}/${checks.length})`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`V${VERSION} static verification PASS (${checks.length}/${checks.length})`);
console.log(runtimeTest.stdout.trim());
