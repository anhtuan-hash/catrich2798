#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const backupRoot = path.join(cwd, '.bes-backup');
if (!fs.existsSync(backupRoot)) {
  console.error('Không tìm thấy .bes-backup. Không thể rollback tự động.');
  process.exit(1);
}
const candidates = fs.readdirSync(backupRoot)
  .filter((name) => name.startsWith('v10.86.1-'))
  .sort()
  .reverse();
if (!candidates.length) {
  console.error('Không tìm thấy backup V10.86.1.');
  process.exit(1);
}
const backup = path.join(backupRoot, candidates[0]);
for (const file of ['package.json', 'index.html']) {
  const source = path.join(backup, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(cwd, file));
}
for (const file of ['public/bes-stability-guard.js', 'public/version.json', '.bes-release/v10.86.1.json']) {
  const target = path.join(cwd, file);
  if (fs.existsSync(target)) fs.rmSync(target, { force: true });
}
console.log(`Đã khôi phục package.json và index.html từ ${path.relative(cwd, backup)}.`);
console.log('package-lock.json không bị V10.86.1 thay đổi nên không cần khôi phục.');
