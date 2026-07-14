#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const cwd = process.cwd();
const force = process.argv.includes('--force');
const reinstall = process.argv.includes('--reinstall');
const pkgPath = path.join(cwd, 'package.json');
const indexPath = path.join(cwd, 'index.html');
const versionPath = path.join(cwd, 'public', 'version.json');
const modulesPath = path.join(cwd, 'public', 'bes-modules-v10.88.0.json');
const flagsPath = path.join(cwd, 'public', 'bes-feature-flags-v10.88.0.json');
const migrationPath = path.join(cwd, 'public', 'bes-migrations-v10.89.0.json');
const buildPath = path.join(cwd, 'public', 'bes-platform-build-v10.89.0.json');
const statePath = path.join(cwd, '.bes-release', 'v10.89.0.json');
const requiredAssets = [
  'public/bes-unified-work-hub-v10890.css',
  'public/bes-unified-work-hub-v10890.js',
  'public/bes-platform-control-v10890.css',
  'public/bes-platform-control-v10890.js',
  'public/bes-release-v10.89.0.json',
  'public/bes-work-hub-v10.89.0.json',
  'supabase/work_hub_v10_89_0.sql',
  'scripts/check-work-hub-v10.89.0.mjs',
  'scripts/platform-doctor-v10.89.0.mjs',
  'scripts/release-guard-v10.89.0.mjs',
  'scripts/rollback-v10.89.0.mjs'
];

function fail(message) {
  console.error(`\n[V10.89.0] ${message}\n`);
  process.exit(1);
}
function readJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function copyIfExists(source, target) {
  if (fs.existsSync(source)) fs.copyFileSync(source, target);
}
function sha256(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function shaText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
function gitValue(args) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; }
  catch { return null; }
}
function supported(version) {
  return /^10\.88\.(0|1)$/.test(String(version || ''));
}
function upsertByKey(list, entry, key) {
  const index = list.findIndex((item) => item && item[key] === entry[key]);
  if (index >= 0) list[index] = { ...list[index], ...entry };
  else list.push(entry);
}

for (const target of [pkgPath, indexPath, path.join(cwd, 'src')]) {
  if (!fs.existsSync(target)) fail(`Không tìm thấy ${path.relative(cwd, target)}. Hãy chạy installer tại thư mục gốc repository.`);
}
for (const asset of requiredAssets) {
  if (!fs.existsSync(path.join(cwd, asset))) fail(`Thiếu ${asset}. Hãy chép đầy đủ gói update-only trước khi chạy installer.`);
}

const packageBefore = readJson(pkgPath, null);
if (!packageBefore) fail('package.json không hợp lệ.');
const previousVersion = String(packageBefore.version || 'unknown');
const currentIndex = fs.readFileSync(indexPath, 'utf8');
const alreadyInstalled = previousVersion === '10.89.0'
  && fs.existsSync(statePath)
  && currentIndex.includes('/bes-unified-work-hub-v10890.css')
  && currentIndex.includes('/bes-unified-work-hub-v10890.js')
  && currentIndex.includes('/bes-platform-control-v10890.js');

if (alreadyInstalled && !reinstall) {
  console.log('\nBrian English Studio V10.89.0 đã được cài đầy đủ. Installer không thay đổi thêm tệp nào.');
  console.log('Dùng --reinstall chỉ khi cần tái tạo integration tags sau khi đã sao lưu Git.\n');
  process.exit(0);
}

if (!force && previousVersion !== '10.89.0' && !supported(previousVersion)) {
  fail(`Phiên bản hiện tại là ${previousVersion}. V10.89.0 hỗ trợ trực tiếp V10.88.0 và V10.88.1. Dùng --force chỉ sau khi đã sao lưu Git.`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, '.bes-backup', `v10.89.0-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const [source, targetName] of [
  [pkgPath, 'package.json'],
  [indexPath, 'index.html'],
  [versionPath, 'version.json'],
  [modulesPath, 'bes-modules-v10.88.0.json'],
  [flagsPath, 'bes-feature-flags-v10.88.0.json'],
  [path.join(cwd, 'package-lock.json'), 'package-lock.json']
]) copyIfExists(source, path.join(backupDir, targetName));

const lockHashBefore = sha256(path.join(cwd, 'package-lock.json'));
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml
  .replace(/\s*<link[^>]+bes-unified-work-hub-v10890\.css[^>]*>\s*/g, '\n')
  .replace(/\s*<script[^>]+bes-unified-work-hub-v10890\.js[^>]*><\/script>\s*/g, '\n')
  .replace(/\s*<link[^>]+bes-platform-control-v108(?:8[0-9]|90)\.css[^>]*>\s*/g, '\n')
  .replace(/\s*<script[^>]+bes-platform-control-v108(?:8[0-9]|90)\.js[^>]*><\/script>\s*/g, '\n')
  .replace(/\s*<meta[^>]+name=["']bes-app-version["'][^>]*>\s*/g, '\n');

const metaTag = '<meta name="bes-app-version" content="10.89.0">';
const platformStyleTag = '<link rel="stylesheet" href="/bes-platform-control-v10890.css" data-bes-platform-version="10.89.0">';
const workStyleTag = '<link rel="stylesheet" href="/bes-unified-work-hub-v10890.css" data-bes-work-hub-version="10.89.0">';
const platformScriptTag = '<script defer src="/bes-platform-control-v10890.js" data-bes-platform-version="10.89.0"></script>';
const workScriptTag = '<script defer src="/bes-unified-work-hub-v10890.js" data-bes-work-hub-version="10.89.0"></script>';
if (indexHtml.includes('</head>')) indexHtml = indexHtml.replace('</head>', `  ${metaTag}\n  ${platformStyleTag}\n  ${workStyleTag}\n</head>`);
else indexHtml = `${metaTag}\n${platformStyleTag}\n${workStyleTag}\n${indexHtml}`;
if (indexHtml.includes('</body>')) indexHtml = indexHtml.replace('</body>', `  ${platformScriptTag}\n  ${workScriptTag}\n</body>`);
else indexHtml += `\n${platformScriptTag}\n${workScriptTag}\n`;
fs.writeFileSync(indexPath, indexHtml);

const pkg = readJson(pkgPath, {});
pkg.version = '10.89.0';
pkg.scripts ||= {};
if (pkg.scripts['release:guard'] && pkg.scripts['release:guard'] !== 'node scripts/release-guard-v10.89.0.mjs' && !pkg.scripts['release:guard:pre-v10.89']) {
  pkg.scripts['release:guard:pre-v10.89'] = pkg.scripts['release:guard'];
}
if (pkg.scripts['platform:doctor'] && pkg.scripts['platform:doctor'] !== 'node scripts/platform-doctor-v10.89.0.mjs' && !pkg.scripts['platform:doctor:pre-v10.89']) {
  pkg.scripts['platform:doctor:pre-v10.89'] = pkg.scripts['platform:doctor'];
}
pkg.scripts['test:work-hub'] = 'node scripts/check-work-hub-v10.89.0.mjs';
pkg.scripts['platform:doctor'] = 'node scripts/platform-doctor-v10.89.0.mjs';
pkg.scripts['release:guard'] = 'node scripts/release-guard-v10.89.0.mjs';
pkg.scripts['release:guard:v10.89'] = 'node scripts/release-guard-v10.89.0.mjs';
pkg.scripts['rollback:v10.89.0'] = 'node scripts/rollback-v10.89.0.mjs';
const verifySteps = ['npm run test:work-hub', 'npm run build', 'npm test'];
if (pkg.scripts['test:department']) verifySteps.push('npm run test:department');
if (pkg.scripts['test:platform-control']) verifySteps.push('npm run test:platform-control');
if (pkg.scripts['test:resource-library-access']) verifySteps.push('npm run test:resource-library-access');
verifySteps.push('npm run platform:doctor', 'npm run release:guard:v10.89');
pkg.scripts['verify:v10.89'] = verifySteps.join(' && ');
writeJson(pkgPath, pkg);

const release = readJson(path.join(cwd, 'public', 'bes-release-v10.89.0.json'), {});
const previousManifest = readJson(versionPath, {});
const installedAt = new Date().toISOString();
const features = [...new Set([
  ...(Array.isArray(previousManifest.features) ? previousManifest.features : []),
  ...(Array.isArray(release.features) ? release.features : [])
])];
writeJson(versionPath, {
  ...previousManifest,
  ...release,
  version: '10.89.0',
  previousVersion,
  installedAt,
  release: release.releaseName || 'Unified Work Hub',
  requiresSql: true,
  requiredMigration: 'work_hub_v10_89_0.sql',
  features
});

const modules = readJson(modulesPath, { schema: 1, version: '10.89.0', modules: [] });
modules.schema ||= 1;
modules.version = '10.89.0';
modules.generatedAt = installedAt;
modules.modules = Array.isArray(modules.modules) ? modules.modules : [];
upsertByKey(modules.modules, {
  id: 'work-hub',
  title: 'Trung tâm công việc',
  route: '#/work-hub',
  category: 'Chuyên môn',
  roles: ['admin', 'ttcm', 'teacher'],
  status: 'stable',
  version: '10.89.0',
  dependencies: ['department', 'platform-control']
}, 'id');
upsertByKey(modules.modules, {
  id: 'platform-control',
  title: 'Platform Control Center',
  route: '#/platform-control',
  category: 'Quản trị',
  roles: ['admin', 'ttcm'],
  status: 'stable',
  version: '10.89.0',
  dependencies: ['system-health']
}, 'id');
writeJson(modulesPath, modules);

const flags = readJson(flagsPath, { schema: 1, version: '10.89.0', defaultChannel: 'stable', channels: ['stable', 'beta', 'lab'], flags: [] });
flags.version = '10.89.0';
flags.flags = Array.isArray(flags.flags) ? flags.flags : [];
for (const flag of [
  { key: 'work_hub.enabled', label: 'Unified Work Hub', description: 'Bật Trung tâm công việc cho toàn hệ thống.', minimumChannel: 'stable', default: true },
  { key: 'work_hub.approval_queue', label: 'Work Hub Approval Queue', description: 'Bật hàng chờ phê duyệt cho Admin/TTCM.', minimumChannel: 'stable', default: true },
  { key: 'work_hub.realtime', label: 'Work Hub Realtime', description: 'Làm mới công việc, phản hồi và thông báo qua Supabase Realtime.', minimumChannel: 'beta', default: true }
]) upsertByKey(flags.flags, flag, 'key');
writeJson(flagsPath, flags);

const sqlDir = path.join(cwd, 'supabase');
const sqlFiles = fs.existsSync(sqlDir)
  ? fs.readdirSync(sqlDir).filter((name) => name.toLowerCase().endsWith('.sql')).sort()
  : [];
const migrations = sqlFiles.map((name) => {
  const file = path.join(sqlDir, name);
  const stat = fs.statSync(file);
  return { name, sizeBytes: stat.size, sha256: sha256(file), modifiedAt: stat.mtime.toISOString() };
});
writeJson(migrationPath, {
  schema: 1,
  version: '10.89.0',
  generatedAt: installedAt,
  count: migrations.length,
  latest: migrations.length ? migrations[migrations.length - 1].name : null,
  requiredMigration: 'work_hub_v10_89_0.sql',
  migrations
});

const buildManifest = {
  schema: 1,
  version: '10.89.0',
  previousVersion,
  installedAt,
  gitCommit: gitValue(['rev-parse', '--short', 'HEAD']),
  gitBranch: gitValue(['rev-parse', '--abbrev-ref', 'HEAD']),
  nodeVersion: process.version,
  packageManager: 'npm',
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local',
  packageHash: shaText(fs.readFileSync(pkgPath, 'utf8')),
  migrationCount: migrations.length,
  requiresSql: true
};
writeJson(buildPath, buildManifest);

const lockHashAfter = sha256(path.join(cwd, 'package-lock.json'));
if (lockHashBefore !== lockHashAfter) fail('package-lock.json đã thay đổi ngoài dự kiến. Hãy khôi phục Git và kiểm tra lại.');

writeJson(statePath, {
  installedAt,
  version: '10.89.0',
  previousVersion,
  backupDir: path.relative(cwd, backupDir),
  lockHashBefore,
  lockHashAfter,
  assets: requiredAssets,
  integrationTags: [
    '/bes-platform-control-v10890.css',
    '/bes-platform-control-v10890.js',
    '/bes-unified-work-hub-v10890.css',
    '/bes-unified-work-hub-v10890.js'
  ],
  migrationCount: migrations.length,
  gitCommit: buildManifest.gitCommit,
  requiresSql: true,
  requiredMigration: 'supabase/work_hub_v10_89_0.sql',
  requiresEnv: false,
  dependencyChanges: false
});

console.log('\nBrian English Studio V10.89.0 Unified Work Hub đã được cài vào source.');
console.log(`Phiên bản trước: ${previousVersion}`);
console.log(`Backup: ${path.relative(cwd, backupDir)}`);
console.log(`Migration inventory: ${migrations.length} file SQL`);
console.log('package-lock.json: không thay đổi');
console.log('Dependency / Environment Variable mới: không cần');
console.log('\nBẮT BUỘC: Chạy supabase/work_hub_v10_89_0.sql trong Supabase SQL Editor.');
console.log('Sau đó đăng xuất, đăng nhập lại và chạy:');
console.log('  npm run verify:v10.89\n');
