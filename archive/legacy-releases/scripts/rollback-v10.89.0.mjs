#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const statePath = path.join(cwd, '.bes-release', 'v10.89.0.json');

function fail(message) {
  console.error(`\n[V10.89.0 rollback] ${message}\n`);
  process.exit(1);
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function restore(source, target) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return true;
}

if (!fs.existsSync(statePath)) fail('Không tìm thấy .bes-release/v10.89.0.json. Không thể xác định backup an toàn.');
const state = readJson(statePath);
if (!state || !state.backupDir) fail('State record không hợp lệ.');
const backupDir = path.join(cwd, state.backupDir);
if (!fs.existsSync(backupDir)) fail(`Không tìm thấy backup: ${state.backupDir}`);

const files = [
  ['package.json', 'package.json'],
  ['index.html', 'index.html'],
  ['version.json', 'public/version.json'],
  ['bes-modules-v10.88.0.json', 'public/bes-modules-v10.88.0.json'],
  ['bes-feature-flags-v10.88.0.json', 'public/bes-feature-flags-v10.88.0.json'],
  ['package-lock.json', 'package-lock.json']
];
const restored = [];
for (const [sourceName, targetName] of files) {
  if (restore(path.join(backupDir, sourceName), path.join(cwd, targetName))) restored.push(targetName);
}

for (const generated of [
  'public/bes-migrations-v10.89.0.json',
  'public/bes-platform-build-v10.89.0.json'
]) {
  const file = path.join(cwd, generated);
  if (fs.existsSync(file)) fs.rmSync(file);
}

const record = {
  rolledBackAt: new Date().toISOString(),
  version: '10.89.0',
  restoredVersion: state.previousVersion || null,
  backupDir: state.backupDir,
  restored,
  databaseRollbackPerformed: false,
  note: 'Source rollback only. Supabase Work Hub tables are preserved.'
};
fs.mkdirSync(path.join(cwd, '.bes-release'), { recursive: true });
fs.writeFileSync(
  path.join(cwd, '.bes-release', `v10.89.0-rolled-back-${new Date().toISOString().replace(/[:.]/g, '-')}.json`),
  `${JSON.stringify(record, null, 2)}\n`
);

console.log('\nĐã rollback source V10.89.0.');
console.log(`Khôi phục: ${restored.join(', ') || 'không có tệp nào'}`);
console.log('Database Work Hub không bị xoá hoặc rollback.');
console.log('Tiếp theo chạy npm run build, npm test và npm run test:department.\n');
