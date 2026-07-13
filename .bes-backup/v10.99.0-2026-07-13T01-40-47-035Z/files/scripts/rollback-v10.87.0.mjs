#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const statePath = path.join(cwd, '.bes-release', 'v10.87.0.json');
if (!fs.existsSync(statePath)) {
  console.error('\nKhông tìm thấy .bes-release/v10.87.0.json. Không thể xác định backup tự động.\n');
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const backupDir = path.join(cwd, state.backupDir || '');
if (!fs.existsSync(backupDir)) {
  console.error(`\nKhông tìm thấy backup: ${state.backupDir}\n`);
  process.exit(1);
}

for (const [sourceName, targetName] of [
  ['package.json', 'package.json'],
  ['index.html', 'index.html'],
  ['version.json', path.join('public', 'version.json')]
]) {
  const source = path.join(backupDir, sourceName);
  const target = path.join(cwd, targetName);
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

for (const asset of state.assets || []) {
  const target = path.join(cwd, asset);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}
fs.rmSync(statePath, { force: true });

console.log('\nĐã rollback mã nguồn V10.87.0 về trạng thái trước khi cài.');
console.log('Cấu hình Command Center trong localStorage được giữ lại nhưng không còn được nạp.');
console.log('Launcher V4, dữ liệu Supabase và học liệu không bị thay đổi.');
console.log('\nChạy lại: npm run build && npm test && npm run test:department\n');
