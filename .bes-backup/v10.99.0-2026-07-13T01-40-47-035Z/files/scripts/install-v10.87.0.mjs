#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const cwd = process.cwd();
const force = process.argv.includes('--force');
const reinstall = process.argv.includes('--reinstall');
const packagePath = path.join(cwd, 'package.json');
const indexPath = path.join(cwd, 'index.html');
const versionPath = path.join(cwd, 'public', 'version.json');
const releaseManifestPath = path.join(cwd, 'public', 'bes-release-v10.87.0.json');
const statePath = path.join(cwd, '.bes-release', 'v10.87.0.json');

function fail(message) {
  console.error(`\n[V10.87.0] ${message}\n`);
  process.exit(1);
}

function sha256(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

for (const target of [packagePath, indexPath, path.join(cwd, 'src')]) {
  if (!fs.existsSync(target)) fail(`Không tìm thấy ${path.relative(cwd, target)}. Hãy chạy installer tại thư mục gốc repository.`);
}

for (const asset of [
  'public/bes-command-center-v10870.css',
  'public/bes-command-center-v10870.js',
  'public/bes-release-v10.87.0.json'
]) {
  if (!fs.existsSync(path.join(cwd, asset))) fail(`Thiếu ${asset}. Hãy chép đầy đủ gói update-only trước khi chạy installer.`);
}

const packageBefore = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const previousVersion = String(packageBefore.version || 'unknown');
const currentIndex = fs.readFileSync(indexPath, 'utf8');
const alreadyInstalled = previousVersion === '10.87.0'
  && fs.existsSync(statePath)
  && currentIndex.includes('/bes-command-center-v10870.css')
  && currentIndex.includes('/bes-command-center-v10870.js');
if (alreadyInstalled && !reinstall) {
  console.log('\nBrian English Studio V10.87.0 đã được cài đầy đủ. Installer không thay đổi thêm tệp nào.');
  console.log('Dùng --reinstall chỉ khi cần tạo lại integration tags sau khi đã sao lưu Git.\n');
  process.exit(0);
}
const hasStabilityGuard = fs.existsSync(path.join(cwd, 'public', 'bes-stability-guard.js'));
if (!force && !hasStabilityGuard) {
  fail('Chưa phát hiện V10.86.1 Stability Guard. Hãy cài V10.86.1 trước, hoặc chỉ dùng --force khi repository đã có cơ chế phục hồi tương đương.');
}
if (!force && !/^10\.86\.1$|^10\.87\.0$/.test(previousVersion)) {
  fail(`Phiên bản hiện tại là ${previousVersion}; bản cập nhật này được thiết kế cho V10.86.1. Dùng --force chỉ khi đã sao lưu Git.`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, '.bes-backup', `v10.87.0-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(packagePath, path.join(backupDir, 'package.json'));
fs.copyFileSync(indexPath, path.join(backupDir, 'index.html'));
if (fs.existsSync(versionPath)) fs.copyFileSync(versionPath, path.join(backupDir, 'version.json'));
if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
  fs.copyFileSync(path.join(cwd, 'package-lock.json'), path.join(backupDir, 'package-lock.json'));
}

const lockHashBefore = sha256(path.join(cwd, 'package-lock.json'));
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml
  .replace(/\s*<link[^>]+bes-command-center-v10870\.css[^>]*>\s*/g, '\n')
  .replace(/\s*<script[^>]+bes-command-center-v10870\.js[^>]*><\/script>\s*/g, '\n');

const styleTag = '<link rel="stylesheet" href="/bes-command-center-v10870.css" data-bes-command-center-version="10.87.0">';
const scriptTag = '<script defer src="/bes-command-center-v10870.js" data-bes-command-center-version="10.87.0"></script>';
if (indexHtml.includes('</head>')) indexHtml = indexHtml.replace('</head>', `  ${styleTag}\n</head>`);
else indexHtml = `${styleTag}\n${indexHtml}`;
if (indexHtml.includes('</body>')) indexHtml = indexHtml.replace('</body>', `  ${scriptTag}\n</body>`);
else indexHtml += `\n${scriptTag}\n`;
fs.writeFileSync(indexPath, indexHtml);

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = '10.87.0';
packageJson.scripts = packageJson.scripts || {};
if (packageJson.scripts['release:guard'] && !packageJson.scripts['release:guard:v10.86.1']) {
  packageJson.scripts['release:guard:v10.86.1'] = packageJson.scripts['release:guard'];
}
packageJson.scripts['release:guard'] = 'node scripts/release-guard-v10.87.0.mjs';
packageJson.scripts['test:command-center'] = 'node scripts/test-command-center-v10.87.mjs';
packageJson.scripts['rollback:v10.87.0'] = 'node scripts/rollback-v10.87.0.mjs';
packageJson.scripts['verify:v10.87'] = 'npm run build && npm test && npm run test:department && npm run test:command-center && npm run release:guard';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const releaseManifest = JSON.parse(fs.readFileSync(releaseManifestPath, 'utf8'));
let previousManifest = {};
if (fs.existsSync(versionPath)) {
  try { previousManifest = JSON.parse(fs.readFileSync(versionPath, 'utf8')); } catch { previousManifest = {}; }
}
const mergedFeatures = [...new Set([...(Array.isArray(previousManifest.features) ? previousManifest.features : []), ...releaseManifest.features])];
const currentManifest = {
  ...previousManifest,
  ...releaseManifest,
  features: mergedFeatures,
  previousVersion,
  installedAt: new Date().toISOString()
};
fs.mkdirSync(path.dirname(versionPath), { recursive: true });
fs.writeFileSync(versionPath, `${JSON.stringify(currentManifest, null, 2)}\n`);

const lockHashAfter = sha256(path.join(cwd, 'package-lock.json'));
if (lockHashBefore !== lockHashAfter) fail('package-lock.json đã thay đổi ngoài dự kiến. Hãy khôi phục Git và kiểm tra lại.');

const state = {
  installedAt: new Date().toISOString(),
  version: '10.87.0',
  previousVersion,
  backupDir: path.relative(cwd, backupDir),
  lockHashBefore,
  lockHashAfter,
  assets: [
    'public/bes-command-center-v10870.css',
    'public/bes-command-center-v10870.js',
    'public/bes-release-v10.87.0.json'
  ],
  requiresSql: false,
  requiresEnv: false,
  dependencyChanges: false
};
fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

console.log('\nBrian English Studio V10.87.0 Launcher & Command Center đã được cài đặt.');
console.log(`Phiên bản trước: ${previousVersion}`);
console.log(`Backup: ${path.relative(cwd, backupDir)}`);
console.log('package-lock.json: không thay đổi');
console.log('SQL / Environment Variable / dependency mới: không cần');
console.log('\nTiếp theo chạy:');
console.log('  npm run test:command-center');
console.log('  npm run release:guard');
console.log('  npm run build');
console.log('  npm test');
console.log('  npm run test:department\n');
