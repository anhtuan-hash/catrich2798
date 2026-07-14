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
const releasePath = path.join(cwd, 'public', 'bes-release-v10.88.0-hf1.json');
const statePath = path.join(cwd, '.bes-release', 'v10.88.0-hf1.json');
const requiredAssets = [
  'public/bes-ai-chat-v10881.css',
  'public/bes-ai-chat-v10881.js',
  'public/bes-release-v10.88.0-hf1.json'
];

function fail(message) {
  console.error(`\n[V10.88.0-HF1] ${message}\n`);
  process.exit(1);
}

function readJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function sha256(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function copyIfExists(source, target) {
  if (fs.existsSync(source)) fs.copyFileSync(source, target);
}

for (const target of [packagePath, indexPath, path.join(cwd, 'src')]) {
  if (!fs.existsSync(target)) fail(`Không tìm thấy ${path.relative(cwd, target)}. Hãy chạy installer tại thư mục gốc repository.`);
}
for (const asset of requiredAssets) {
  if (!fs.existsSync(path.join(cwd, asset))) fail(`Thiếu ${asset}. Hãy chép đầy đủ gói update-only trước khi chạy installer.`);
}

const packageBefore = readJson(packagePath, null);
if (!packageBefore) fail('package.json không hợp lệ.');
const baseVersion = String(packageBefore.version || 'unknown');
const currentIndex = fs.readFileSync(indexPath, 'utf8');
const alreadyInstalled = fs.existsSync(statePath)
  && currentIndex.includes('/bes-ai-chat-v10881.css')
  && currentIndex.includes('/bes-ai-chat-v10881.js');

if (alreadyInstalled && !reinstall) {
  console.log('\nV10.88.0-HF1 đã được cài đầy đủ. Installer không thay đổi thêm tệp nào.');
  console.log('Dùng --reinstall chỉ khi cần tái tạo integration tags sau khi đã sao lưu Git.\n');
  process.exit(0);
}

if (!force && baseVersion !== '10.88.0') {
  fail(`Phiên bản package hiện tại là ${baseVersion}. Hotfix này được thiết kế cho V10.88.0. Không dùng --force nếu chưa sao lưu Git.`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, '.bes-backup', `v10.88.0-hf1-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(packagePath, path.join(backupDir, 'package.json'));
fs.copyFileSync(indexPath, path.join(backupDir, 'index.html'));
copyIfExists(versionPath, path.join(backupDir, 'version.json'));
copyIfExists(path.join(cwd, 'package-lock.json'), path.join(backupDir, 'package-lock.json'));

const lockHashBefore = sha256(path.join(cwd, 'package-lock.json'));
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml
  .replace(/\s*<link[^>]+bes-ai-chat-v10872\.css[^>]*>\s*/g, '\n')
  .replace(/\s*<script[^>]+bes-ai-chat-v10872\.js[^>]*><\/script>\s*/g, '\n')
  .replace(/\s*<link[^>]+bes-ai-chat-v10873\.css[^>]*>\s*/g, '\n')
  .replace(/\s*<script[^>]+bes-ai-chat-v10873\.js[^>]*><\/script>\s*/g, '\n')
  .replace(/\s*<link[^>]+bes-ai-chat-v10881\.css[^>]*>\s*/g, '\n')
  .replace(/\s*<script[^>]+bes-ai-chat-v10881\.js[^>]*><\/script>\s*/g, '\n');

const styleTag = '<link rel="stylesheet" href="/bes-ai-chat-v10881.css" data-bes-ai-chat-hotfix="10.88.0-hf1">';
const scriptTag = '<script defer src="/bes-ai-chat-v10881.js" data-bes-ai-chat-hotfix="10.88.0-hf1"></script>';
if (indexHtml.includes('</head>')) indexHtml = indexHtml.replace('</head>', `  ${styleTag}\n</head>`);
else indexHtml = `${styleTag}\n${indexHtml}`;
if (indexHtml.includes('</body>')) indexHtml = indexHtml.replace('</body>', `  ${scriptTag}\n</body>`);
else indexHtml += `\n${scriptTag}\n`;
fs.writeFileSync(indexPath, indexHtml);

const packageJson = readJson(packagePath, {});
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts['test:ai-chat-close'] = 'node scripts/test-ai-chat-close-v10.88.0-hf1.mjs';
packageJson.scripts['release:guard:ai-chat-hotfix'] = 'node scripts/release-guard-v10.88.0-hf1.mjs';
packageJson.scripts['rollback:v10.88.0-hf1'] = 'node scripts/rollback-v10.88.0-hf1.mjs';
packageJson.scripts['verify:v10.88.0-hf1'] = 'npm run build && npm test && npm run test:department && npm run test:command-center --if-present && npm run test:platform-control --if-present && npm run test:ai-chat-close && npm run platform:doctor --if-present && npm run release:guard --if-present && npm run release:guard:ai-chat-hotfix';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const release = readJson(releasePath, {});
const versionManifest = readJson(versionPath, {});
const hotfixes = Array.isArray(versionManifest.hotfixes) ? versionManifest.hotfixes.filter((item) => item && item.id !== '10.88.0-hf1') : [];
hotfixes.push({
  id: '10.88.0-hf1',
  name: release.releaseName,
  installedAt: new Date().toISOString(),
  runtime: 'v10881',
  baseVersion
});
const nextVersionManifest = {
  ...versionManifest,
  hotfixes,
  lastHotfix: '10.88.0-hf1',
  aiChatRuntime: 'v10881',
  aiChatCloseCleanup: true
};
fs.mkdirSync(path.dirname(versionPath), { recursive: true });
fs.writeFileSync(versionPath, `${JSON.stringify(nextVersionManifest, null, 2)}\n`);

const lockHashAfter = sha256(path.join(cwd, 'package-lock.json'));
if (lockHashBefore !== lockHashAfter) fail('package-lock.json đã thay đổi ngoài dự kiến. Hãy khôi phục Git và kiểm tra lại.');

const state = {
  installedAt: new Date().toISOString(),
  hotfixVersion: '10.88.0-hf1',
  baseVersion,
  backupDir: path.relative(cwd, backupDir),
  lockHashBefore,
  lockHashAfter,
  assets: requiredAssets,
  replacesIntegrationAssets: [
    'public/bes-ai-chat-v10872.css',
    'public/bes-ai-chat-v10872.js',
    'public/bes-ai-chat-v10873.css',
    'public/bes-ai-chat-v10873.js'
  ],
  preservesPackageVersion: true,
  preservesAIHistory: true,
  preservesDrafts: true,
  preservesProviders: true,
  requiresSql: false,
  requiresEnv: false,
  dependencyChanges: false
};
fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);

console.log('\nĐã cài V10.88.0-HF1 — AI Chat Close Cleanup.');
console.log(`Base version giữ nguyên: ${baseVersion}`);
console.log(`Backup: ${path.relative(cwd, backupDir)}`);
console.log('Đã thay runtime AI Chat bằng asset cache-busted v10881.');
console.log('Khi thu gọn/đóng: panel được ẩn ngay, bỏ backdrop-filter và giải phóng tag layout sau 220 ms.');
console.log('Lịch sử AI, draft, provider, API key và dữ liệu Supabase: giữ nguyên.');
console.log('package-lock.json: không thay đổi.');
console.log('SQL / Environment Variable / dependency mới: không cần.');
console.log('\nTiếp theo chạy:');
console.log('  npm run verify:v10.88.0-hf1\n');
