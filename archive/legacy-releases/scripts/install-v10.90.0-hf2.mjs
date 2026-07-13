#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');
const indexPath = path.join(cwd, 'index.html');
const lockPath = path.join(cwd, 'package-lock.json');
const statePath = path.join(cwd, '.bes-release', 'v10.90.0-hf2.json');
const bridgeAsset = 'public/bes-supabase-bridge-v10900hf2.js';
const workHubAsset = 'public/bes-unified-work-hub-v10900hf2.js';

function fail(message) {
  console.error(`\n[V10.90.0-HF2] ${message}\n`);
  process.exit(1);
}
function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function sha(file) {
  return fs.existsSync(file)
    ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : null;
}
function copy(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

for (const file of [
  pkgPath,
  indexPath,
  path.join(cwd, bridgeAsset),
  path.join(cwd, workHubAsset),
  path.join(cwd, 'scripts', 'check-work-hub-rpc-v10.90.0-hf2.mjs'),
  path.join(cwd, 'scripts', 'rollback-v10.90.0-hf2.mjs')
]) {
  if (!fs.existsSync(file)) {
    fail(`Thiếu ${path.relative(cwd, file)}. Hãy chép đầy đủ gói update-only vào repository.`);
  }
}

const pkg = readJson(pkgPath, null);
if (!pkg) fail('package.json không hợp lệ.');
const current = String(pkg.version || 'unknown');
if (!/^10\.90\./.test(current)) {
  fail(`Phiên bản hiện tại là ${current}. Hotfix này chỉ dành cho V10.90.x.`);
}

let html = fs.readFileSync(indexPath, 'utf8');
if (
  !/bes-unified-work-hub-v10890\.js/i.test(html) &&
  !/bes-unified-work-hub-v10900hf2\.js/i.test(html)
) {
  fail('Không tìm thấy Unified Work Hub trong index.html.');
}

const already =
  html.includes('/bes-supabase-bridge-v10900hf2.js') &&
  html.includes('/bes-unified-work-hub-v10900hf2.js') &&
  fs.existsSync(statePath);

if (already) {
  console.log('\nV10.90.0-HF2 đã được cài.\n');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, '.bes-backup', `v10.90.0-hf2-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
copy(pkgPath, path.join(backupDir, 'package.json'));
copy(indexPath, path.join(backupDir, 'index.html'));
copy(lockPath, path.join(backupDir, 'package-lock.json'));
copy(
  path.join(cwd, 'public', 'bes-supabase-bridge-v10900hf1.js'),
  path.join(backupDir, 'public', 'bes-supabase-bridge-v10900hf1.js')
);
copy(
  path.join(cwd, 'public', 'bes-unified-work-hub-v10890.js'),
  path.join(backupDir, 'public', 'bes-unified-work-hub-v10890.js')
);

const lockBefore = sha(lockPath);

html = html
  .replace(/\s*<script[^>]+bes-supabase-bridge-v10900hf(?:1|2)\.js[^>]*><\/script>\s*/gi, '\n')
  .replace(/\s*<script[^>]+bes-unified-work-hub-(?:v10890|v10900hf2)\.js[^>]*><\/script>\s*/gi, '\n');

const bridgeTag =
  '<script defer src="/bes-supabase-bridge-v10900hf2.js" data-bes-supabase-bridge-version="10.90.0-HF2"></script>';
const workHubTag =
  '<script defer src="/bes-unified-work-hub-v10900hf2.js" data-bes-work-hub-version="10.90.0-HF2"></script>';

const smartPattern =
  /(<script[^>]+src=["']\/bes-smart-knowledge-v10900\.js["'][^>]*><\/script>)/i;

if (smartPattern.test(html)) {
  html = html.replace(smartPattern, bridgeTag + '\n  $1\n  ' + workHubTag);
} else if (/<\/body>/i.test(html)) {
  html = html.replace(/<\/body>/i, `  ${bridgeTag}\n  ${workHubTag}\n</body>`);
} else {
  html += `\n${bridgeTag}\n${workHubTag}\n`;
}

fs.writeFileSync(indexPath, html);

pkg.scripts ||= {};
pkg.scripts['test:work-hub-rpc-compat'] =
  'node scripts/check-work-hub-rpc-v10.90.0-hf2.mjs';
pkg.scripts['rollback:v10.90.0-hf2'] =
  'node scripts/rollback-v10.90.0-hf2.mjs';

const steps = ['npm run test:work-hub-rpc-compat'];
if (pkg.scripts.build) steps.push('npm run build');
if (pkg.scripts.test) steps.push('npm test');
if (pkg.scripts['test:department']) steps.push('npm run test:department');
pkg.scripts['verify:v10.90.0-hf2'] = steps.join(' && ');

writeJson(pkgPath, pkg);
writeJson(statePath, {
  version: '10.90.0-HF2',
  baseVersion: current,
  installedAt: new Date().toISOString(),
  backupDir: path.relative(cwd, backupDir),
  lockHashBefore: lockBefore,
  lockHashAfter: sha(lockPath),
  assets: [bridgeAsset, workHubAsset]
});

if (lockBefore !== sha(lockPath)) {
  fail('package-lock.json đã thay đổi ngoài dự kiến.');
}

console.log('\nĐã cài V10.90.0-HF2 — Work Hub RPC Compatibility.');
console.log('Không cần chạy thêm SQL.');
console.log('Kiểm tra: npm run verify:v10.90.0-hf2\n');
