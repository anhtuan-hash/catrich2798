#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const statePath = path.join(cwd, '.bes-release', 'v10.88.0-hf1.json');

function fail(message) {
  console.error(`\n[V10.88.0-HF1 rollback] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(statePath)) fail('Không tìm thấy .bes-release/v10.88.0-hf1.json.');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const backupDir = path.resolve(cwd, state.backupDir || '');
if (!state.backupDir || !fs.existsSync(backupDir)) fail('Không tìm thấy thư mục backup của hotfix.');

for (const name of ['package.json', 'index.html']) {
  const source = path.join(backupDir, name);
  if (!fs.existsSync(source)) fail(`Backup thiếu ${name}.`);
  fs.copyFileSync(source, path.join(cwd, name));
}

const versionBackup = path.join(backupDir, 'version.json');
const versionPath = path.join(cwd, 'public', 'version.json');
if (fs.existsSync(versionBackup)) fs.copyFileSync(versionBackup, versionPath);
else if (fs.existsSync(versionPath)) fs.rmSync(versionPath);

const lockBackup = path.join(backupDir, 'package-lock.json');
const lockPath = path.join(cwd, 'package-lock.json');
if (fs.existsSync(lockBackup)) fs.copyFileSync(lockBackup, lockPath);

for (const asset of [
  'public/bes-ai-chat-v10881.css',
  'public/bes-ai-chat-v10881.js',
  'public/bes-release-v10.88.0-hf1.json'
]) {
  const target = path.join(cwd, asset);
  if (fs.existsSync(target)) fs.rmSync(target);
}

fs.rmSync(statePath);
console.log('\nĐã rollback V10.88.0-HF1.');
console.log(`Đã dùng backup: ${state.backupDir}`);
console.log('Integration AI Chat trước hotfix đã được khôi phục từ index.html backup.');
console.log('Lịch sử AI, draft, provider và API key không bị xóa.\n');
