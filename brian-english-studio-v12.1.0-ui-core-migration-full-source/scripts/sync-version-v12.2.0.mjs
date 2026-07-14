import fs from 'node:fs';
const targets = [['package.json', (p) => ({...p, version:'12.2.0'})], ['package-lock.json', (p) => { p.version='12.2.0'; if (p.packages?.['']) p.packages[''].version='12.2.0'; return p; }]];
for (const [file, update] of targets) { const value=JSON.parse(fs.readFileSync(file,'utf8')); fs.writeFileSync(file, JSON.stringify(update(value), null, 2)+'\n'); }
console.log('Version synchronized: 12.2.0');
