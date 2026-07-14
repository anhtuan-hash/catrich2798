#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const packagePath = path.join(cwd, 'package.json');
const indexPath = path.join(cwd, 'index.html');
const required = [packagePath, indexPath, path.join(cwd, 'src')];

function fail(message) {
  console.error(`\n[V10.86.1] ${message}\n`);
  process.exit(1);
}

for (const target of required) {
  if (!fs.existsSync(target)) fail(`Không tìm thấy ${path.relative(cwd, target)}. Hãy chạy lệnh tại thư mục gốc repository.`);
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, '.bes-backup', `v10.86.1-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(packagePath, path.join(backupDir, 'package.json'));
fs.copyFileSync(indexPath, path.join(backupDir, 'index.html'));
if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
  fs.copyFileSync(path.join(cwd, 'package-lock.json'), path.join(backupDir, 'package-lock.json'));
}

let indexHtml = fs.readFileSync(indexPath, 'utf8');
const guardTag = '<script defer src="/bes-stability-guard.js" data-bes-version="10.86.1"></script>';
if (!indexHtml.includes('/bes-stability-guard.js')) {
  if (indexHtml.includes('</head>')) indexHtml = indexHtml.replace('</head>', `  ${guardTag}\n</head>`);
  else if (indexHtml.includes('</body>')) indexHtml = indexHtml.replace('</body>', `  ${guardTag}\n</body>`);
  else indexHtml += `\n${guardTag}\n`;
  fs.writeFileSync(indexPath, indexHtml);
}

packageJson.version = '10.86.1';
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts['release:guard'] = 'node scripts/release-guard-v10.86.1.mjs';
packageJson.scripts['project:doctor'] = 'node scripts/project-doctor-v10.86.1.mjs';
packageJson.scripts['rollback:v10.86.1'] = 'node scripts/rollback-v10.86.1.mjs';
packageJson.scripts['verify:stability'] = 'npm run build && npm test && npm run test:department && npm run release:guard';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const state = {
  installedAt: new Date().toISOString(),
  version: '10.86.1',
  backupDir: path.relative(cwd, backupDir),
  packageVersionBefore: packageJson.version === '10.86.1' ? '10.86.x' : packageJson.version,
  lockfileChanged: false
};
fs.mkdirSync(path.join(cwd, '.bes-release'), { recursive: true });
fs.writeFileSync(path.join(cwd, '.bes-release', 'v10.86.1.json'), `${JSON.stringify(state, null, 2)}\n`);

console.log('\nBrian English Studio V10.86.1 Stability Guard đã được cài đặt.');
console.log(`Backup: ${path.relative(cwd, backupDir)}`);
console.log('Không thay đổi dependency hoặc package-lock.json.');
console.log('\nTiếp theo chạy:');
console.log('  npm run release:guard');
console.log('  npm run build');
console.log('  npm test');
console.log('  npm run test:department\n');
