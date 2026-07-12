#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const cwd=process.cwd();
const statePath=path.join(cwd,'.bes-release','v10.90.0-hf1.json');
function fail(m){console.error(`\n[Rollback V10.90.0-HF1] ${m}\n`);process.exit(1);}
let state;try{state=JSON.parse(fs.readFileSync(statePath,'utf8'));}catch{fail('Không tìm thấy trạng thái cài đặt hotfix.');}
const backup=path.join(cwd,state.backupDir||'');
for(const name of ['package.json','index.html','package-lock.json']){
  const source=path.join(backup,name),target=path.join(cwd,name);
  if(fs.existsSync(source))fs.copyFileSync(source,target);
}
if(fs.existsSync(statePath))fs.rmSync(statePath);
console.log('\nĐã rollback V10.90.0-HF1. Asset bridge vẫn nằm trong public nhưng không còn được nạp.\n');
