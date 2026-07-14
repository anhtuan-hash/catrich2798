#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const results = [];
const add = (name, status, detail = '', warning = false) => results.push({ name, status, detail, warning });
const exists = (relative) => fs.existsSync(path.join(cwd, relative));
const read = (relative) => fs.readFileSync(path.join(cwd, relative), 'utf8');
const count = (text, pattern) => (text.match(pattern) || []).length;
const hash = (relative) => exists(relative) ? crypto.createHash('sha256').update(fs.readFileSync(path.join(cwd, relative))).digest('hex') : null;

let pkg = null;
try {
  pkg = JSON.parse(read('package.json'));
  add('package.json hợp lệ', true, pkg.name || 'unnamed');
} catch (error) {
  add('package.json hợp lệ', false, error.message);
}

add('Phiên bản package 10.87.2', pkg?.version === '10.87.2', pkg?.version || 'missing');
add('AI Chat CSS', exists('public/bes-ai-chat-v10872.css'));
add('AI Chat JavaScript', exists('public/bes-ai-chat-v10872.js'));
add('Release manifest V10.87.2', exists('public/bes-release-v10.87.2.json'));
add('Installer state', exists('.bes-release/v10.87.2.json'));
add('Command Center V10.87.1 vẫn tồn tại', exists('public/bes-command-center-v10871.js'));
add('Stability Guard vẫn tồn tại', exists('public/bes-stability-guard.js'));

const index = exists('index.html') ? read('index.html') : '';
add('CSS V10.87.2 chỉ được nạp một lần', count(index, /bes-ai-chat-v10872\.css/g) === 1, String(count(index, /bes-ai-chat-v10872\.css/g)));
add('JavaScript V10.87.2 chỉ được nạp một lần', count(index, /bes-ai-chat-v10872\.js/g) === 1, String(count(index, /bes-ai-chat-v10872\.js/g)));
add('AI Chat runtime dùng defer', /<script[^>]+defer[^>]+bes-ai-chat-v10872\.js/.test(index) || /<script[^>]+bes-ai-chat-v10872\.js[^>]+defer/.test(index));
add('Command Center V10.87.1 vẫn được nạp', index.includes('/bes-command-center-v10871.js'));
add('Stability Guard vẫn được nạp', index.includes('/bes-stability-guard.js'));

const jsPath = path.join(cwd, 'public', 'bes-ai-chat-v10872.js');
if (fs.existsSync(jsPath)) {
  const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
  add('JavaScript không lỗi cú pháp', syntax.status === 0, (syntax.stderr || '').trim());
  const source = fs.readFileSync(jsPath, 'utf8');
  add('Runtime version 10.87.2', source.includes("var VERSION = '10.87.2'"));
  add('Có phát hiện Brian AI', source.includes('scoreCandidate') && source.includes("text.indexOf('brian ai')"));
  add('Có full rescan API', source.includes('BESAIChatLayoutV10872'));
  add('Không ghi đè Launcher V4', !source.includes("bes-launcher-config-v4"));
  add('Không chứa secret phía client', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(source));
}

const cssPath = path.join(cwd, 'public', 'bes-ai-chat-v10872.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  add('Desktop panel rộng 480–590px', css.includes('clamp(480px, 38vw, 590px)'));
  add('Expanded panel tối đa 760px', css.includes('min(760px, calc(100vw - 40px))'));
  add('Mobile full-screen', css.includes('@media (max-width: 680px)') && css.includes('100dvh'));
  add('Message list co giãn', css.includes('[data-bes-ai-chat-role="messages"]') && css.includes('flex: 1 1 auto'));
  add('Composer không bị co', css.includes('[data-bes-ai-chat-role="composer"]') && css.includes('flex: 0 0 auto'));
  add('Có reduced motion', css.includes('prefers-reduced-motion'));
}

try {
  const manifest = JSON.parse(read('public/version.json'));
  add('Version manifest là 10.87.2', manifest.version === '10.87.2', manifest.version || 'missing');
  add('Không yêu cầu SQL', manifest.requiresSql === false, String(manifest.requiresSql));
  add('Không yêu cầu ENV mới', manifest.requiresEnv === false, String(manifest.requiresEnv));
  add('Không yêu cầu cài dependency', manifest.requiresDependencyInstall === false, String(manifest.requiresDependencyInstall));
} catch (error) {
  add('public/version.json hợp lệ', false, error.message);
}

if (exists('.bes-release/v10.87.2.json')) {
  try {
    const installState = JSON.parse(read('.bes-release/v10.87.2.json'));
    const currentLock = hash('package-lock.json');
    add('package-lock.json không bị installer thay đổi', installState.lockHashBefore === installState.lockHashAfter && installState.lockHashAfter === currentLock, currentLock || 'no lockfile', !currentLock);
    add('Installer ghi nhận giữ lịch sử AI', installState.preservesAIHistory === true);
    add('Installer ghi nhận giữ draft', installState.preservesDrafts === true);
  } catch (error) {
    add('Installer state hợp lệ', false, error.message);
  }
}

add('Script test:ai-chat', pkg?.scripts?.['test:ai-chat'] === 'node scripts/test-ai-chat-v10.87.2.mjs', pkg?.scripts?.['test:ai-chat'] || 'missing');
add('Script rollback:v10.87.2', Boolean(pkg?.scripts?.['rollback:v10.87.2']), pkg?.scripts?.['rollback:v10.87.2'] || 'missing');
add('Script verify:v10.87.2', Boolean(pkg?.scripts?.['verify:v10.87.2']), pkg?.scripts?.['verify:v10.87.2'] || 'missing');

add('Release Guard V10.87.1 nền vẫn được giữ', exists('scripts/release-guard-v10.87.1.mjs'), '', true);

const failed = results.filter((item) => !item.status && !item.warning);
const warnings = results.filter((item) => !item.status && item.warning);
console.log('\nBrian English Studio V10.87.2 · Release Guard\n');
for (const item of results) {
  console.log(`${item.status ? '✓' : item.warning ? '!' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(`\nKết quả: ${results.length - failed.length - warnings.length}/${results.length} đạt · ${warnings.length} cảnh báo · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
