#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const report = {
  generatedAt: new Date().toISOString(),
  version: '10.86.1',
  cwd,
  checks: [],
  largeAssets: [],
  environmentFiles: [],
  notes: []
};
const add = (name, ok, detail = '') => report.checks.push({ name, ok, detail });

for (const file of ['package.json', 'index.html', 'vite.config.js', 'src', 'public']) {
  add(`Tồn tại ${file}`, fs.existsSync(path.join(cwd, file)));
}

for (const name of fs.readdirSync(cwd)) {
  if (/^\.env/.test(name)) report.environmentFiles.push(name);
}
if (report.environmentFiles.includes('.env')) report.notes.push('Có file .env ở root; kiểm tra để chắc chắn file này không được commit.');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.bes-backup'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      const stat = fs.statSync(full);
      if (stat.size > 1024 * 1024) report.largeAssets.push({ file: path.relative(cwd, full), bytes: stat.size });
    }
  }
}
walk(path.join(cwd, 'src'));
walk(path.join(cwd, 'public'));
report.largeAssets.sort((a, b) => b.bytes - a.bytes);
if (report.largeAssets.some((item) => /\.css$/i.test(item.file))) {
  report.notes.push('Có stylesheet lớn hơn 1 MB; nên tách CSS theo route ở phiên bản Performance Architecture sau.');
}

fs.mkdirSync(path.join(cwd, 'reports'), { recursive: true });
const output = path.join(cwd, 'reports', 'v10.86.1-project-doctor.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nBrian English Studio · Project Doctor V10.86.1\n');
for (const check of report.checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}`);
console.log(`\nAsset > 1 MB: ${report.largeAssets.length}`);
for (const item of report.largeAssets.slice(0, 12)) console.log(`! ${item.file} — ${(item.bytes / 1024 / 1024).toFixed(2)} MB`);
for (const note of report.notes) console.log(`! ${note}`);
console.log(`\nĐã lưu báo cáo: ${path.relative(cwd, output)}\n`);
