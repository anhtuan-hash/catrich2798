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

add('Phiên bản package 10.87.1', pkg?.version === '10.87.1', pkg?.version || 'missing');
add('Visual Harmony CSS', exists('public/bes-command-center-v10871.css'));
add('Visual Harmony JavaScript', exists('public/bes-command-center-v10871.js'));
add('Release manifest V10.87.1', exists('public/bes-release-v10.87.1.json'));
add('Installer state', exists('.bes-release/v10.87.1.json'));
add('Command Center V10.87.0 nền vẫn có thể rollback', exists('public/bes-command-center-v10870.js'), '', true);
add('Stability Guard vẫn tồn tại', exists('public/bes-stability-guard.js'));

const index = exists('index.html') ? read('index.html') : '';
add('CSS V10.87.1 chỉ được nạp một lần', count(index, /bes-command-center-v10871\.css/g) === 1, String(count(index, /bes-command-center-v10871\.css/g)));
add('JavaScript V10.87.1 chỉ được nạp một lần', count(index, /bes-command-center-v10871\.js/g) === 1, String(count(index, /bes-command-center-v10871\.js/g)));
add('Không còn nạp asset V10.87.0', !/bes-command-center-v10870\.(css|js)/.test(index));
add('Command Center dùng defer', /<script[^>]+defer[^>]+bes-command-center-v10871\.js/.test(index) || /<script[^>]+bes-command-center-v10871\.js[^>]+defer/.test(index));
add('Stability Guard vẫn được nạp', index.includes('/bes-stability-guard.js'));

const jsPath = path.join(cwd, 'public', 'bes-command-center-v10871.js');
if (fs.existsSync(jsPath)) {
  const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
  add('JavaScript không lỗi cú pháp', syntax.status === 0, (syntax.stderr || '').trim());
  const source = fs.readFileSync(jsPath, 'utf8');
  add('Runtime version 10.87.1', source.includes("var VERSION = '10.87.1'"));
  add('Giữ storage key của V10.87.0', source.includes("var BASE_KEY = 'bes-command-center-v10870'"));
  add('Có phân màu theo nhóm', source.includes('toneForItem') && source.includes('data-bescc-tone'));
  add('Có phím Ctrl/Cmd + K', source.includes("String(event.key).toLowerCase() === 'k'"));
  add('Không ghi đè Launcher V4', !source.includes("safeSet('bes-launcher-config-v4'") && !source.includes("localStorage.setItem('bes-launcher-config-v4'"));
  add('Không chứa secret phía client', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(source));
}

const cssPath = path.join(cwd, 'public', 'bes-command-center-v10871.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  add('Có lớp cách ly style host', css.includes('#bes-command-overlay button') && css.includes('all: unset'));
  add('Không ép dark mode theo hệ điều hành', !css.includes('prefers-color-scheme: dark'));
  add('Có responsive tablet', css.includes('@media (max-width: 820px)'));
  add('Có responsive mobile', css.includes('@media (max-width: 620px)'));
  add('Có reduced motion', css.includes('prefers-reduced-motion'));
  add('Không dùng màu nền card navy cứng', !/\.bescc-card\s*\{[^}]*background:\s*#(?:10213d|17243a)/s.test(css));
}

try {
  const manifest = JSON.parse(read('public/version.json'));
  add('Version manifest là 10.87.1', manifest.version === '10.87.1', manifest.version || 'missing');
  add('Không yêu cầu SQL', manifest.requiresSql === false, String(manifest.requiresSql));
  add('Không yêu cầu ENV mới', manifest.requiresEnv === false, String(manifest.requiresEnv));
  add('Không yêu cầu cài dependency', manifest.requiresDependencyInstall === false, String(manifest.requiresDependencyInstall));
} catch (error) {
  add('public/version.json hợp lệ', false, error.message);
}

if (exists('.bes-release/v10.87.1.json')) {
  try {
    const installState = JSON.parse(read('.bes-release/v10.87.1.json'));
    const currentLock = hash('package-lock.json');
    add('package-lock.json không bị installer thay đổi', installState.lockHashBefore === installState.lockHashAfter && installState.lockHashAfter === currentLock, currentLock || 'no lockfile', !currentLock);
    add('Installer ghi nhận giữ cấu hình cũ', installState.preservesStorageKeys === true);
  } catch (error) {
    add('Installer state hợp lệ', false, error.message);
  }
}

add('Script test:command-center', pkg?.scripts?.['test:command-center'] === 'node scripts/test-command-center-v10.87.1.mjs', pkg?.scripts?.['test:command-center'] || 'missing');
add('Script rollback:v10.87.1', Boolean(pkg?.scripts?.['rollback:v10.87.1']), pkg?.scripts?.['rollback:v10.87.1'] || 'missing');
add('Script verify:v10.87.1', Boolean(pkg?.scripts?.['verify:v10.87.1']), pkg?.scripts?.['verify:v10.87.1'] || 'missing');

const failed = results.filter((item) => !item.status && !item.warning);
const warnings = results.filter((item) => !item.status && item.warning);
console.log('\nBrian English Studio V10.87.1 · Release Guard\n');
for (const item of results) {
  console.log(`${item.status ? '✓' : item.warning ? '!' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(`\nKết quả: ${results.length - failed.length - warnings.length}/${results.length} đạt · ${warnings.length} cảnh báo · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
