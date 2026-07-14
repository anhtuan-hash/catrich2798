#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const results = [];
const add = (name, status, detail = '', warning = false) => results.push({ name, status, detail, warning });
const exists = (name) => fs.existsSync(path.join(cwd, name));
const read = (name) => fs.readFileSync(path.join(cwd, name), 'utf8');
const hash = (name) => exists(name) ? crypto.createHash('sha256').update(fs.readFileSync(path.join(cwd, name))).digest('hex') : null;

let pkg = null;
try { pkg = JSON.parse(read('package.json')); add('package.json hợp lệ', true); }
catch (error) { add('package.json hợp lệ', false, error.message); }

add('Phiên bản package là 10.87.3', pkg?.version === '10.87.3', pkg?.version || 'missing');
add('CSS V10.87.3 tồn tại', exists('public/bes-ai-chat-v10873.css'));
add('JavaScript V10.87.3 tồn tại', exists('public/bes-ai-chat-v10873.js'));
add('Release manifest tồn tại', exists('public/bes-release-v10.87.3.json'));
add('Installer tồn tại', exists('scripts/install-v10.87.3.mjs'));
add('Rollback tồn tại', exists('scripts/rollback-v10.87.3.mjs'));
add('AI chat test tồn tại', exists('scripts/test-ai-chat-v10.87.3.mjs'));

if (exists('index.html')) {
  const source = read('index.html');
  add('index.html nạp CSS V10.87.3 đúng một lần', (source.match(/bes-ai-chat-v10873\.css/g) || []).length === 1);
  add('index.html nạp JavaScript V10.87.3 đúng một lần', (source.match(/bes-ai-chat-v10873\.js/g) || []).length === 1);
  add('index.html không còn nạp runtime V10.87.2', !source.includes('/bes-ai-chat-v10872.css') && !source.includes('/bes-ai-chat-v10872.js'));
  add('Không chứa secret phía client', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(source));
}

if (exists('public/bes-ai-chat-v10873.js')) {
  const syntax = spawnSync(process.execPath, ['--check', path.join(cwd, 'public', 'bes-ai-chat-v10873.js')], { encoding: 'utf8' });
  add('Runtime JavaScript hợp lệ', syntax.status === 0, (syntax.stderr || '').trim());
}

if (exists('public/bes-ai-chat-v10873.css')) {
  const css = read('public/bes-ai-chat-v10873.css');
  add('Composer 160px', css.includes('--bes-ai-composer-min: 160px'));
  add('Input 104–220px', css.includes('--bes-ai-input-min: 104px') && css.includes('--bes-ai-input-max: 220px'));
  add('Send button inset', css.includes('[data-bes-ai-chat-input-wrap="true"] [data-bes-ai-chat-role="send"]'));
  add('Mobile full-screen', css.includes('@media (max-width: 680px)') && css.includes('100dvh'));
  add('Có reduced motion', css.includes('prefers-reduced-motion'));
}

try {
  const manifest = JSON.parse(read('public/version.json'));
  add('Version manifest là 10.87.3', manifest.version === '10.87.3', manifest.version || 'missing');
  add('Không yêu cầu SQL', manifest.requiresSql === false, String(manifest.requiresSql));
  add('Không yêu cầu ENV mới', manifest.requiresEnv === false, String(manifest.requiresEnv));
  add('Không yêu cầu dependency', manifest.requiresDependencyInstall === false, String(manifest.requiresDependencyInstall));
} catch (error) { add('public/version.json hợp lệ', false, error.message); }

if (exists('.bes-release/v10.87.3.json')) {
  try {
    const installState = JSON.parse(read('.bes-release/v10.87.3.json'));
    const currentLock = hash('package-lock.json');
    add('package-lock.json không bị installer thay đổi', installState.lockHashBefore === installState.lockHashAfter && installState.lockHashAfter === currentLock, currentLock || 'no lockfile', !currentLock);
    add('Installer giữ lịch sử AI', installState.preservesAIHistory === true);
    add('Installer giữ draft', installState.preservesDrafts === true);
    add('Installer giữ provider', installState.preservesProviders === true);
  } catch (error) { add('Installer state hợp lệ', false, error.message); }
}

add('Script test:ai-chat đúng', pkg?.scripts?.['test:ai-chat'] === 'node scripts/test-ai-chat-v10.87.3.mjs', pkg?.scripts?.['test:ai-chat'] || 'missing');
add('Script rollback:v10.87.3 tồn tại', Boolean(pkg?.scripts?.['rollback:v10.87.3']), pkg?.scripts?.['rollback:v10.87.3'] || 'missing');
add('Script verify:v10.87.3 tồn tại', Boolean(pkg?.scripts?.['verify:v10.87.3']), pkg?.scripts?.['verify:v10.87.3'] || 'missing');
add('Release Guard V10.87.2 nền vẫn được giữ', exists('scripts/release-guard-v10.87.2.mjs'), '', true);

const failed = results.filter((item) => !item.status && !item.warning);
const warnings = results.filter((item) => !item.status && item.warning);
console.log('\nBrian English Studio V10.87.3 · Release Guard\n');
for (const item of results) console.log(`${item.status ? '✓' : item.warning ? '!' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nKết quả: ${results.length - failed.length - warnings.length}/${results.length} đạt · ${warnings.length} cảnh báo · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
