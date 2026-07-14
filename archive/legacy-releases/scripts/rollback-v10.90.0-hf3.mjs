#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const cwd = process.cwd();
const statePath = path.join(cwd, '.bes-release', 'v10.90.0-hf3.json');
if (!fs.existsSync(statePath)) { console.error('Không tìm thấy trạng thái cài V10.90.0-HF3.'); process.exit(1); }
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const backupDir = path.join(cwd, state.backupDir);
function restore(name) { const source = path.join(backupDir, name); if (fs.existsSync(source)) { fs.mkdirSync(path.dirname(path.join(cwd,name)), {recursive:true}); fs.copyFileSync(source, path.join(cwd,name)); } }
restore('package.json'); restore('index.html'); restore('package-lock.json');
for (const asset of state.assets || []) { const file = path.join(cwd, asset); if (fs.existsSync(file)) fs.rmSync(file); }
fs.rmSync(statePath, { force: true });
console.log('Đã rollback V10.90.0-HF3.');
