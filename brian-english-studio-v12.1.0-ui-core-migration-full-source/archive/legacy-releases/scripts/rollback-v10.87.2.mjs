#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const statePath = path.join(cwd, '.bes-release', 'v10.87.2.json');

function fail(message) {
  console.error(`\n[V10.87.2 rollback] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(statePath)) fail('Không tìm thấy trạng thái cài đặt .bes-release/v10.87.2.json.');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const backupDir = path.resolve(cwd, state.backupDir || '');
if (!state.backupDir || !fs.existsSync(backupDir)) fail('Không tìm thấy thư mục backup của V10.87.2.');

for (const name of ['package.json', 'index.html']) {
  const source = path.join(backupDir, name);
  if (!fs.existsSync(source)) fail(`Backup thiếu ${name}.`);
  fs.copyFileSync(source, path.join(cwd, name));
}

const versionBackup = path.join(backupDir, 'version.json');
const versionPath = path.join(cwd, 'public', 'version.json');
if (fs.existsSync(versionBackup)) fs.copyFileSync(versionBackup, versionPath);
else if (fs.existsSync(versionPath)) fs.rmSync(versionPath);

for (const asset of [
  'public/bes-ai-chat-v10872.css',
  'public/bes-ai-chat-v10872.js',
  'public/bes-release-v10.87.2.json'
]) {
  const target = path.join(cwd, asset);
  if (fs.existsSync(target)) fs.rmSync(target);
}

fs.rmSync(statePath);
console.log('\nĐã rollback V10.87.2 về trạng thái trước khi cài đặt.');
console.log(`Đã dùng backup: ${state.backupDir}`);
console.log('Lịch sử hội thoại và draft của Brian AI không bị xóa.');
console.log('\nTiếp theo chạy npm run build, npm test và npm run test:department.\n');
