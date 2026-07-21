#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const cwd = process.cwd();
const force = process.argv.includes('--force');
const reinstall = process.argv.includes('--reinstall');
const packagePath = path.join(cwd, 'package.json');
const indexPath = path.join(cwd, 'index.html');
const versionPath = path.join(cwd, 'public', 'version.json');
const releasePath = path.join(cwd, 'public', 'bes-release-v10.88.0.json');
const buildPath = path.join(cwd, 'public', 'bes-platform-build-v10.88.0.json');
const migrationPath = path.join(cwd, 'public', 'bes-migrations-v10.88.0.json');
const statePath = path.join(cwd, '.bes-release', 'v10.88.0.json');
const requiredAssets = [
  'public/bes-platform-control-v10880.css',
  'public/bes-platform-control-v10880.js',
  'public/bes-release-v10.88.0.json',
  'public/bes-modules-v10.88.0.json',
  'public/bes-feature-flags-v10.88.0.json',
  'public/bes-migrations-v10.88.0.json',
  'public/bes-platform-build-v10.88.0.json'
];

function fail(message) {
  console.error(`\n[V10.88.0] ${message}\n`);
  process.exit(1);
}

function sha256(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function shaText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function copyIfExists(source, target) {
  if (fs.existsSync(source)) fs.copyFileSync(source, target);
}

function readJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function gitValue(args) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; }
  catch { return null; }
}

function semverSupported(version) {
  return /^10\.(86\.1|87\.[0-3])$/.test(String(version || ''));
}

for (const target of [packagePath, indexPath, path.join(cwd, 'src')]) {
  if (!fs.existsSync(target)) fail(`Không tìm thấy ${path.relative(cwd, target)}. Hãy chạy installer tại thư mục gốc repository.`);
}
for (const asset of requiredAssets) {
  if (!fs.existsSync(path.join(cwd, asset))) fail(`Thiếu ${asset}. Hãy chép đầy đủ gói update-only trước khi chạy installer.`);
}

const packageBefore = readJson(packagePath, null);
if (!packageBefore) fail('package.json không hợp lệ.');
const previousVersion = String(packageBefore.version || 'unknown');
const currentIndex = fs.readFileSync(indexPath, 'utf8');
const alreadyInstalled = previousVersion === '10.88.0'
  && fs.existsSync(statePath)
  && currentIndex.includes('/bes-platform-control-v10880.css')
  && currentIndex.includes('/bes-platform-control-v10880.js');

if (alreadyInstalled && !reinstall) {
  console.log('\nBrian English Studio V10.88.0 đã được cài đầy đủ. Installer không thay đổi thêm tệp nào.');
  console.log('Dùng --reinstall chỉ khi cần tái tạo integration tags sau khi đã sao lưu Git.\n');
  process.exit(0);
}

if (!force && previousVersion !== '10.88.0' && !semverSupported(previousVersion)) {
  fail(`Phiên bản hiện tại là ${previousVersion}. V10.88.0 hỗ trợ trực tiếp V10.86.1 và V10.87.0–V10.87.3. Dùng --force chỉ sau khi đã sao lưu Git.`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, '.bes-backup', `v10.88.0-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(packagePath, path.join(backupDir, 'package.json'));
fs.copyFileSync(indexPath, path.join(backupDir, 'index.html'));
copyIfExists(versionPath, path.join(backupDir, 'version.json'));
copyIfExists(path.join(cwd, 'package-lock.json'), path.join(backupDir, 'package-lock.json'));
for (const file of ['bes-platform-build-v10.88.0.json', 'bes-migrations-v10.88.0.json']) {
  copyIfExists(path.join(cwd, 'public', file), path.join(backupDir, file));
}

const lockHashBefore = sha256(path.join(cwd, 'package-lock.json'));
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml
  .replace(/\s*<link[^>]+bes-platform-control-v10880\.css[^>]*>\s*/g, '\n')
  .replace(/\s*<script[^>]+bes-platform-control-v10880\.js[^>]*><\/script>\s*/g, '\n')
  .replace(/\s*<meta[^>]+name=["']bes-app-version["'][^>]*>\s*/g, '\n');

const metaTag = '<meta name="bes-app-version" content="10.88.0">';
const styleTag = '<link rel="stylesheet" href="/bes-platform-control-v10880.css" data-bes-platform-version="10.88.0">';
const scriptTag = '<script defer src="/bes-platform-control-v10880.js" data-bes-platform-version="10.88.0"></script>';
if (indexHtml.includes('</head>')) indexHtml = indexHtml.replace('</head>', `  ${metaTag}\n  ${styleTag}\n</head>`);
else indexHtml = `${metaTag}\n${styleTag}\n${indexHtml}`;
if (indexHtml.includes('</body>')) indexHtml = indexHtml.replace('</body>', `  ${scriptTag}\n</body>`);
else indexHtml += `\n${scriptTag}\n`;
fs.writeFileSync(indexPath, indexHtml);

const packageJson = readJson(packagePath, {});
packageJson.version = '10.88.0';
packageJson.scripts = packageJson.scripts || {};
if (packageJson.scripts['release:guard'] && packageJson.scripts['release:guard'] !== 'node scripts/release-guard-v10.88.0.mjs' && !packageJson.scripts['release:guard:pre-v10.88']) {
  packageJson.scripts['release:guard:pre-v10.88'] = packageJson.scripts['release:guard'];
}
if (packageJson.scripts['project:doctor'] && !packageJson.scripts['project:doctor:pre-v10.88']) {
  packageJson.scripts['project:doctor:pre-v10.88'] = packageJson.scripts['project:doctor'];
}
packageJson.scripts['platform:doctor'] = 'node scripts/platform-doctor-v10.88.0.mjs';
packageJson.scripts['release:guard'] = 'node scripts/release-guard-v10.88.0.mjs';
packageJson.scripts['test:platform-control'] = 'node scripts/test-platform-control-v10.88.0.mjs';
packageJson.scripts['rollback:v10.88.0'] = 'node scripts/rollback-v10.88.0.mjs';
packageJson.scripts['verify:v10.88'] = 'npm run build && npm test && npm run test:department && npm run test:platform-control && npm run platform:doctor && npm run release:guard';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const release = readJson(releasePath, {});
const previousManifest = readJson(versionPath, {});
const features = [...new Set([
  ...(Array.isArray(previousManifest.features) ? previousManifest.features : []),
  ...(Array.isArray(release.features) ? release.features : [])
])];
const installedAt = new Date().toISOString();
const currentManifest = {
  ...previousManifest,
  ...release,
  version: '10.88.0',
  previousVersion,
  installedAt,
  features
};
fs.mkdirSync(path.dirname(versionPath), { recursive: true });
fs.writeFileSync(versionPath, `${JSON.stringify(currentManifest, null, 2)}\n`);

const sqlDir = path.join(cwd, 'supabase');
const sqlFiles = fs.existsSync(sqlDir)
  ? fs.readdirSync(sqlDir).filter((name) => name.toLowerCase().endsWith('.sql')).sort()
  : [];
const migrations = sqlFiles.map((name) => {
  const file = path.join(sqlDir, name);
  const stat = fs.statSync(file);
  return {
    name,
    sizeBytes: stat.size,
    sha256: sha256(file),
    modifiedAt: stat.mtime.toISOString()
  };
});
const migrationManifest = {
  schema: 1,
  version: '10.88.0',
  generatedAt: installedAt,
  count: migrations.length,
  latest: migrations.length ? migrations[migrations.length - 1].name : null,
  migrations
};
fs.writeFileSync(migrationPath, `${JSON.stringify(migrationManifest, null, 2)}\n`);

const buildManifest = {
  schema: 1,
  version: '10.88.0',
  previousVersion,
  installedAt,
  gitCommit: gitValue(['rev-parse', '--short', 'HEAD']),
  gitBranch: gitValue(['rev-parse', '--abbrev-ref', 'HEAD']),
  nodeVersion: process.version,
  packageManager: 'npm',
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local',
  packageHash: shaText(fs.readFileSync(packagePath, 'utf8')),
  migrationCount: migrations.length
};
fs.writeFileSync(buildPath, `${JSON.stringify(buildManifest, null, 2)}\n`);

const lockHashAfter = sha256(path.join(cwd, 'package-lock.json'));
if (lockHashBefore !== lockHashAfter) fail('package-lock.json đã thay đổi ngoài dự kiến. Hãy khôi phục Git và kiểm tra lại.');

const stateRecord = {
  installedAt,
  version: '10.88.0',
  previousVersion,
  backupDir: path.relative(cwd, backupDir),
  lockHashBefore,
  lockHashAfter,
  assets: requiredAssets,
  integrationTags: ['/bes-platform-control-v10880.css', '/bes-platform-control-v10880.js'],
  migrationCount: migrations.length,
  gitCommit: buildManifest.gitCommit,
  requiresSql: false,
  requiresEnv: false,
  dependencyChanges: false
};
fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, `${JSON.stringify(stateRecord, null, 2)}\n`);

console.log('\nBrian English Studio V10.88.0 Platform Control Center đã được cài đặt.');
console.log(`Phiên bản trước: ${previousVersion}`);
console.log(`Backup: ${path.relative(cwd, backupDir)}`);
console.log(`Migration inventory: ${migrations.length} file SQL`);
console.log(`Git commit: ${buildManifest.gitCommit || 'không xác định'}`);
console.log('package-lock.json: không thay đổi');
console.log('SQL / Environment Variable / dependency mới: không cần');
console.log('\nMở Platform Control Center bằng Command/Ctrl + Shift + P.');
console.log('Tiếp theo chạy:');
console.log('  npm run verify:v10.88\n');
