#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const cwd=process.cwd();
const pkgPath=path.join(cwd,'package.json');
const indexPath=path.join(cwd,'index.html');
const lockPath=path.join(cwd,'package-lock.json');
const statePath=path.join(cwd,'.bes-release','v10.90.0-hf1.json');
const asset='public/bes-supabase-bridge-v10900hf1.js';

function fail(message){console.error(`\n[V10.90.0-HF1] ${message}\n`);process.exit(1);}
function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function sha(file){return fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;}
function copy(source,target){if(fs.existsSync(source)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}}

for(const file of [pkgPath,indexPath,path.join(cwd,asset),path.join(cwd,'scripts','check-supabase-bridge-v10.90.0-hf1.mjs'),path.join(cwd,'scripts','rollback-v10.90.0-hf1.mjs')]){
  if(!fs.existsSync(file))fail(`Thiếu ${path.relative(cwd,file)}. Hãy chép đầy đủ gói update-only.`);
}
const pkg=readJson(pkgPath,null);if(!pkg)fail('package.json không hợp lệ.');
const current=String(pkg.version||'unknown');
if(!/^10\.90\./.test(current))fail(`Phiên bản hiện tại là ${current}. Hotfix này chỉ dành cho V10.90.x.`);
let html=fs.readFileSync(indexPath,'utf8');
const already=html.includes('/bes-supabase-bridge-v10900hf1.js')&&fs.existsSync(statePath);
if(already){console.log('\nV10.90.0-HF1 đã được cài.\n');process.exit(0);}
if(!/bes-smart-knowledge-v10900\.js/.test(html))fail('Không tìm thấy asset Smart Knowledge V10.90.0 trong index.html.');

const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backupDir=path.join(cwd,'.bes-backup',`v10.90.0-hf1-${stamp}`);
fs.mkdirSync(backupDir,{recursive:true});
copy(pkgPath,path.join(backupDir,'package.json'));
copy(indexPath,path.join(backupDir,'index.html'));
copy(lockPath,path.join(backupDir,'package-lock.json'));
const lockBefore=sha(lockPath);

html=html.replace(/\s*<script[^>]+bes-supabase-bridge-v10900hf1\.js[^>]*><\/script>\s*/g,'\n');
const bridgeTag='<script defer src="/bes-supabase-bridge-v10900hf1.js" data-bes-supabase-bridge-version="10.90.0-HF1"></script>';
const smartTagPattern=/(<script[^>]+src=["']\/bes-smart-knowledge-v10900\.js["'][^>]*><\/script>)/i;
html=html.replace(smartTagPattern,bridgeTag+'\n  $1');
fs.writeFileSync(indexPath,html);

pkg.scripts||={};
pkg.scripts['test:supabase-bridge']='node scripts/check-supabase-bridge-v10.90.0-hf1.mjs';
pkg.scripts['rollback:v10.90.0-hf1']='node scripts/rollback-v10.90.0-hf1.mjs';
if(!pkg.scripts['rollback:v10.90.0']&&fs.existsSync(path.join(cwd,'scripts','rollback-v10.90.0.mjs')))pkg.scripts['rollback:v10.90.0']='node scripts/rollback-v10.90.0.mjs';
if(!pkg.scripts['verify:v10.90']){
  const baseSteps=[];
  if(pkg.scripts['test:smart-knowledge'])baseSteps.push('npm run test:smart-knowledge');
  if(pkg.scripts.build)baseSteps.push('npm run build');
  if(pkg.scripts.test)baseSteps.push('npm test');
  if(pkg.scripts['test:department'])baseSteps.push('npm run test:department');
  if(pkg.scripts['test:platform-control'])baseSteps.push('npm run test:platform-control');
  if(pkg.scripts['test:work-hub:compat'])baseSteps.push('npm run test:work-hub:compat');
  if(pkg.scripts['platform:doctor'])baseSteps.push('npm run platform:doctor');
  if(pkg.scripts['release:guard:v10.90'])baseSteps.push('npm run release:guard:v10.90');
  pkg.scripts['verify:v10.90']=baseSteps.join(' && ')||'npm run test:smart-knowledge';
}
const steps=['npm run test:supabase-bridge'];
if(pkg.scripts.build)steps.push('npm run build');
if(pkg.scripts.test)steps.push('npm test');
if(pkg.scripts['test:department'])steps.push('npm run test:department');
if(pkg.scripts['test:smart-knowledge'])steps.push('npm run test:smart-knowledge');
pkg.scripts['verify:v10.90.0-hf1']=steps.join(' && ');
writeJson(pkgPath,pkg);

writeJson(statePath,{version:'10.90.0-HF1',baseVersion:current,installedAt:new Date().toISOString(),backupDir:path.relative(cwd,backupDir),lockHashBefore:lockBefore,lockHashAfter:sha(lockPath),asset});
if(lockBefore!==sha(lockPath))fail('package-lock.json đã thay đổi ngoài dự kiến.');
console.log('\nĐã cài V10.90.0-HF1 — Supabase Runtime Bridge.');
console.log('Không cần chạy thêm SQL.');
console.log('Kiểm tra: npm run verify:v10.90.0-hf1\n');
