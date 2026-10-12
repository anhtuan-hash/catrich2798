import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const assets=fileURLToPath(new URL('../dist/assets/',import.meta.url));
const js=readdirSync(assets).filter(name=>name.endsWith('.js'));
const required=['HomeroomConductTab','StudentRecordsTab','HomeroomStudentHub','SubjectStudentsTab','HomeroomCoreTabs','HomeroomPhase3Tabs'];
for(const name of required){
  assert.ok(js.some(file=>file.startsWith(name+'-')),
    `Missing separate lazy chunk for ${name}: verify Vite did not reintroduce an eager dependency`);
}
const bytes=Object.fromEntries(required.map(name=>{
  const file=js.find(x=>x.startsWith(name+'-'));
  return [name,statSync(fileURLToPath(new URL('../dist/assets/'+file,import.meta.url))).size];
}));
console.log('Homeroom 4.0 Phase 8: production bundles split into deferred feature modules: '+JSON.stringify(bytes));
