#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const statePath = path.join(cwd, '.bes-release', 'v10.90.0-hf2.json');

function fail(message) {
  console.error(`\n[Rollback V10.90.0-HF2] ${message}\n`);
  process.exit(1);
}
function copy(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

if (!fs.existsSync(statePath)) {
  fail('Không tìm thấy trạng thái cài đặt V10.90.0-HF2.');
}

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const backupDir = path.join(cwd, state.backupDir || '');
if (!fs.existsSync(backupDir)) {
  fail(`Không tìm thấy thư mục backup: ${state.backupDir}`);
}

copy(path.join(backupDir, 'package.json'), path.join(cwd, 'package.json'));
copy(path.join(backupDir, 'index.html'), path.join(cwd, 'index.html'));
copy(path.join(backupDir, 'package-lock.json'), path.join(cwd, 'package-lock.json'));

for (const asset of [
  'public/bes-supabase-bridge-v10900hf2.js',
  'public/bes-unified-work-hub-v10900hf2.js'
]) {
  try { fs.rmSync(path.join(cwd, asset), { force: true }); } catch {}
}

try { fs.rmSync(statePath, { force: true }); } catch {}

console.log('\nĐã rollback source V10.90.0-HF2.');
console.log('Database và dữ liệu Work Hub không bị thay đổi.\n');
