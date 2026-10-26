// Regression: V9 accidentally referenced <Monitor/> without importing it,
// crashing Brian Board only when teachers opened the full-screen portal.
// Vite can compile unbound JSX identifiers, so enforce runtime binding presence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const files=[
 'src/components/BrianBoard/BrianBoard.jsx',
 'src/components/BrianBoard/BoardRemoteTV.jsx',
 'src/components/BrianBoard/BoardClassroomLive.jsx',
 'src/components/BrianBoard/BoardLiveGuestControl.jsx',
 'src/components/BrianBoard/BoardPdfStudio.jsx',
 'src/components/BrianBoard/BoardCropEditor.jsx',
 'src/components/BrianBoard/BoardCanvas.jsx'
];
for(const file of files){
 const s=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const tags=[...new Set([...s.matchAll(/<([A-Z][A-Za-z0-9]*)\\b/g)].map(m=>m[1]))];
 const imports=[...s.matchAll(/(?:^|\\n)import\\s+([\\s\\S]*?)\\s+from\\s+['"][^'"]+['"];?/g)].map(m=>m[1]);
 const declared=new Set(imports.flatMap(c=>
  [...c.matchAll(/\\b[A-Za-z_$][A-Za-z0-9_$]*\\b/g)].map(m=>m[0])));
 for(const match of s.matchAll(/\\b(?:const|let|var|function|class)\\s+([A-Z][A-Za-z0-9]*)/g))
  declared.add(match[1]);
 // Icon is a local binding of the mapped draw tools / activity type icons.
 declared.add('Icon');
 const missing=tags.filter(name=>!declared.has(name));
 assert.deepEqual(missing,[],file+' has JSX elements without a runtime import/binding: '+missing.join(', '));
}
const board=readFileSync(new URL('../src/components/BrianBoard/BrianBoard.jsx',import.meta.url),'utf8');
const lucideImport=board.match(/import\\s*\\{([^}]+)\\}\\s*from 'lucide-react'/)?.[1]||'';
assert.ok(lucideImport.split(',').map(s=>s.trim()).includes('Monitor'),
 'Remote TV button must import the Monitor component before Board opens');
assert.match(board,/<Monitor size=\\{18\\}/);
console.log('PASS Brian Board runtime: every key JSX component, including remote TV Monitor, has an import or local declaration.');
