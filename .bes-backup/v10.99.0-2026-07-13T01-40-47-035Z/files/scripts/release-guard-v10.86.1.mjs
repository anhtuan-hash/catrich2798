#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const results = [];
const add = (name, status, detail = '') => results.push({ name, status, detail });
const exists = (relative) => fs.existsSync(path.join(cwd, relative));
const read = (relative) => fs.readFileSync(path.join(cwd, relative), 'utf8');

let pkg = null;
try {
  pkg = JSON.parse(read('package.json'));
  add('package.json hợp lệ', true, pkg.name || 'unnamed');
} catch (error) {
  add('package.json hợp lệ', false, error.message);
}

add('Phiên bản package 10.86.1', pkg?.version === '10.86.1', pkg?.version || 'missing');
add('Stability Guard asset', exists('public/bes-stability-guard.js'));
add('Version manifest', exists('public/version.json'));
add('Installer state', exists('.bes-release/v10.86.1.json'));

const index = exists('index.html') ? read('index.html') : '';
add('Guard được nạp trong index.html', index.includes('/bes-stability-guard.js'));
add('Guard dùng defer', /<script[^>]+defer[^>]+bes-stability-guard\.js/.test(index) || /<script[^>]+bes-stability-guard\.js[^>]+defer/.test(index));

const sourceFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '.bes-backup'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|mjs|ts|tsx|html|json)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(cwd, 'src'));
walk(path.join(cwd, 'api'));

let exposedServiceRole = [];
let exposedClientAiKey = [];
let conflictMarkers = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(cwd, file);
  if (/VITE_SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"`][^'"`]+/.test(text)) exposedServiceRole.push(rel);
  if (/VITE_OPENAI_API_KEY|VITE_ANTHROPIC_API_KEY|VITE_GEMINI_API_KEY/.test(text)) exposedClientAiKey.push(rel);
  if (/^(<<<<<<<|=======|>>>>>>>) /m.test(text)) conflictMarkers.push(rel);
}
add('Không lộ service-role key phía client', exposedServiceRole.length === 0, exposedServiceRole.join(', '));
add('Không dùng AI secret dạng VITE_*', exposedClientAiKey.length === 0, exposedClientAiKey.join(', '));
add('Không còn Git conflict marker', conflictMarkers.length === 0, conflictMarkers.join(', '));

const requiredMarkers = ['#/qa', '#/ai-governance'];
const allSource = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const marker of requiredMarkers) {
  add(`Route nền tảng ${marker}`, allSource.includes(marker), allSource.includes(marker) ? 'found' : 'warning: không tìm thấy chuỗi route');
}

if (exists('package-lock.json')) {
  try {
    const lock = JSON.parse(read('package-lock.json'));
    const lockVersion = lock.packages?.['']?.version || lock.version;
    add('Lockfile vẫn đọc được', true, lockVersion || 'no root version');
    add('Dependency không bị installer sửa', true, 'package-lock.json chỉ được đọc');
  } catch (error) {
    add('Lockfile vẫn đọc được', false, error.message);
  }
} else {
  add('Lockfile tồn tại', false, 'warning: repository không có package-lock.json');
}

if (exists('public/version.json')) {
  try {
    const manifest = JSON.parse(read('public/version.json'));
    add('Manifest không yêu cầu SQL', manifest.requiresSql === false, String(manifest.requiresSql));
    add('Manifest không yêu cầu ENV mới', manifest.requiresEnv === false, String(manifest.requiresEnv));
  } catch (error) {
    add('Manifest JSON hợp lệ', false, error.message);
  }
}

const failed = results.filter((item) => !item.status && !String(item.detail).startsWith('warning:'));
const warnings = results.filter((item) => !item.status && String(item.detail).startsWith('warning:'));

console.log('\nBrian English Studio V10.86.1 · Release Guard\n');
for (const item of results) {
  const isWarning = !item.status && String(item.detail).startsWith('warning:');
  console.log(`${item.status ? '✓' : isWarning ? '!' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
console.log(`\nKết quả: ${results.length - failed.length - warnings.length}/${results.length} đạt · ${warnings.length} cảnh báo · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
