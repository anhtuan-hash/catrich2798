#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');
const indexPath = path.join(cwd, 'index.html');
const lockPath = path.join(cwd, 'package-lock.json');
const statePath = path.join(cwd, '.bes-release', 'v10.90.0-hf3.json');
const assets = [
  'public/bes-supabase-key-capture-v10900hf3.js',
  'public/bes-supabase-bridge-v10900hf3.js',
  'public/bes-unified-work-hub-v10900hf3.js'
];
function fail(message) { console.error(`\n[V10.90.0-HF3] ${message}\n`); process.exit(1); }
function readJson(file, fallback = {}) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function sha(file) { return fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null; }
function copy(source, target) { if (!fs.existsSync(source)) return; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); }

for (const file of [pkgPath, indexPath, ...assets.map((item) => path.join(cwd, item)), path.join(cwd, 'scripts', 'check-supabase-key-capture-v10.90.0-hf3.mjs'), path.join(cwd, 'scripts', 'rollback-v10.90.0-hf3.mjs')]) {
  if (!fs.existsSync(file)) fail(`Thiếu ${path.relative(cwd, file)}. Hãy chép đầy đủ gói update-only.`);
}
const pkg = readJson(pkgPath, null);
if (!pkg) fail('package.json không hợp lệ.');
const current = String(pkg.version || 'unknown');
if (!/^10\.90\./.test(current)) fail(`Phiên bản hiện tại là ${current}. Hotfix chỉ dành cho V10.90.x.`);
let html = fs.readFileSync(indexPath, 'utf8');
if (!/bes-unified-work-hub-(?:v10890|v10900hf[23])\.js/i.test(html)) fail('Không tìm thấy Unified Work Hub trong index.html.');
if (html.includes('/bes-supabase-key-capture-v10900hf3.js') && html.includes('/bes-supabase-bridge-v10900hf3.js') && html.includes('/bes-unified-work-hub-v10900hf3.js') && fs.existsSync(statePath)) {
  console.log('\nV10.90.0-HF3 đã được cài.\n'); process.exit(0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, '.bes-backup', `v10.90.0-hf3-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
copy(pkgPath, path.join(backupDir, 'package.json'));
copy(indexPath, path.join(backupDir, 'index.html'));
copy(lockPath, path.join(backupDir, 'package-lock.json'));
for (const old of ['bes-supabase-bridge-v10900hf1.js','bes-supabase-bridge-v10900hf2.js','bes-unified-work-hub-v10890.js','bes-unified-work-hub-v10900hf2.js']) copy(path.join(cwd,'public',old), path.join(backupDir,'public',old));
const lockBefore = sha(lockPath);

html = html
  .replace(/\s*<script[^>]+bes-supabase-key-capture-v10900hf3\.js[^>]*><\/script>\s*/gi, '\n')
  .replace(/\s*<script[^>]+bes-supabase-bridge-v10900hf(?:1|2|3)\.js[^>]*><\/script>\s*/gi, '\n')
  .replace(/\s*<script[^>]+bes-unified-work-hub-(?:v10890|v10900hf[23])\.js[^>]*><\/script>\s*/gi, '\n');

const captureTag = '<script src="/bes-supabase-key-capture-v10900hf3.js" data-bes-key-capture-version="10.90.0-HF3"></script>';
const bridgeTag = '<script defer src="/bes-supabase-bridge-v10900hf3.js" data-bes-supabase-bridge-version="10.90.0-HF3"></script>';
const workHubTag = '<script defer src="/bes-unified-work-hub-v10900hf3.js" data-bes-work-hub-version="10.90.0-HF3"></script>';

// The capture hook must run before the Vite module so it can observe the app's first valid Supabase request.
const firstExecutable = /(<script\b[^>]*(?:type=["']module["']|src=)[^>]*>)/i;
if (firstExecutable.test(html)) html = html.replace(firstExecutable, `${captureTag}\n  ${bridgeTag}\n  $1`);
else if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `  ${captureTag}\n  ${bridgeTag}\n</head>`);
else html = `${captureTag}\n${bridgeTag}\n${html}`;
if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `  ${workHubTag}\n</body>`);
else html += `\n${workHubTag}\n`;
fs.writeFileSync(indexPath, html);

pkg.scripts ||= {};
pkg.scripts['test:supabase-key-capture'] = 'node scripts/check-supabase-key-capture-v10.90.0-hf3.mjs';
pkg.scripts['rollback:v10.90.0-hf3'] = 'node scripts/rollback-v10.90.0-hf3.mjs';
const steps = ['npm run test:supabase-key-capture'];
if (pkg.scripts.build) steps.push('npm run build');
if (pkg.scripts.test) steps.push('npm test');
if (pkg.scripts['test:department']) steps.push('npm run test:department');
pkg.scripts['verify:v10.90.0-hf3'] = steps.join(' && ');
writeJson(pkgPath, pkg);
writeJson(statePath, { version: '10.90.0-HF3', baseVersion: current, installedAt: new Date().toISOString(), backupDir: path.relative(cwd, backupDir), lockHashBefore: lockBefore, lockHashAfter: sha(lockPath), assets });
if (lockBefore !== sha(lockPath)) fail('package-lock.json đã thay đổi ngoài dự kiến.');
console.log('\nĐã cài V10.90.0-HF3 — Supabase Key Capture & Cache Repair.');
console.log('Không cần chạy thêm SQL.');
console.log('Kiểm tra: npm run verify:v10.90.0-hf3\n');
