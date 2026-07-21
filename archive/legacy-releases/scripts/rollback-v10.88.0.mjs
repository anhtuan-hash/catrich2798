#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const statePath = path.join(cwd, '.bes-release', 'v10.88.0.json');

function fail(message) {
  console.error(`\n[Rollback V10.88.0] ${message}\n`);
  process.exit(1);
}
function copyIfExists(source, target) {
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    return true;
  }
  return false;
}

if (!fs.existsSync(statePath)) fail('Không tìm thấy .bes-release/v10.88.0.json. Không thể xác định backup an toàn.');
let state;
try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); }
catch { fail('State file V10.88.0 không hợp lệ.'); }

const backupDir = path.join(cwd, state.backupDir || '');
if (!state.backupDir || !fs.existsSync(backupDir)) fail(`Không tìm thấy thư mục backup: ${state.backupDir || 'unknown'}`);

const restored = [];
if (copyIfExists(path.join(backupDir, 'package.json'), path.join(cwd, 'package.json'))) restored.push('package.json');
if (copyIfExists(path.join(backupDir, 'index.html'), path.join(cwd, 'index.html'))) restored.push('index.html');
if (copyIfExists(path.join(backupDir, 'version.json'), path.join(cwd, 'public', 'version.json'))) restored.push('public/version.json');
if (copyIfExists(path.join(backupDir, 'package-lock.json'), path.join(cwd, 'package-lock.json'))) restored.push('package-lock.json');

const indexPath = path.join(cwd, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html
    .replace(/\s*<link[^>]+bes-platform-control-v10880\.css[^>]*>\s*/g, '\n')
    .replace(/\s*<script[^>]+bes-platform-control-v10880\.js[^>]*><\/script>\s*/g, '\n')
    .replace(/\s*<meta[^>]+name=["']bes-app-version["'][^>]*>\s*/g, '\n');
  fs.writeFileSync(indexPath, html);
}

for (const file of ['bes-platform-build-v10.88.0.json', 'bes-migrations-v10.88.0.json']) {
  const backup = path.join(backupDir, file);
  const target = path.join(cwd, 'public', file);
  if (fs.existsSync(backup)) copyIfExists(backup, target);
  else if (fs.existsSync(target)) fs.rmSync(target);
}

const rolledStatePath = path.join(cwd, '.bes-release', `v10.88.0-rolled-back-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.renameSync(statePath, rolledStatePath);

console.log('\nĐã rollback Brian English Studio V10.88.0.');
console.log(`Phiên bản trở về: ${state.previousVersion || 'phiên bản trước'}`);
console.log(`Đã khôi phục: ${restored.join(', ') || 'index integration tags'}`);
console.log('Dữ liệu localStorage về channel, flags và module không bị xóa; chúng không hoạt động khi asset V10.88.0 không được nạp.');
console.log('\nTiếp theo chạy:');
console.log('  npm run build');
console.log('  npm test');
console.log('  npm run test:department\n');
