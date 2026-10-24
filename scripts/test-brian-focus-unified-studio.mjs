import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dir=new URL('../src/components/BrianFocus/',import.meta.url);
const file=name=>readFileSync(new URL(name,dir),'utf8');
const overlay=file('FocusOverlay.jsx'), parent=file('BrianFocus.jsx');
const hub=file('FocusUnifiedStudio.jsx'),css=file('FocusUnifiedStudio.css');
const legacy=['Focus7Studio.jsx','Focus8Studio.jsx','Focus9Studio.jsx','Focus6Appearance.jsx','Focus8Commands.jsx'];
assert.match(overlay,/import FocusUnifiedStudio/);
assert.match(overlay,/className="bfc-unified__launcher"/);
assert.match(overlay,/renderTool=\{\(\{source,tab\}\)=>/);
for(const expr of ['<Focus7Studio','<Focus8Studio','<Focus9Studio']){
 assert.equal(overlay.split(expr).length-1,1,expr+' should render only once inside unified hub');
}
for(const old of ['className="bfc7-open-studio"','className="bfc8-open-studio"','className="bfc9-open-studio"']){
 assert.ok(!overlay.includes(old),'Old versioned header launcher remains: '+old);
}
assert.equal((overlay.match(/bfc-unified__launcher/g)||[]).length,1);
assert.match(overlay,/source==='atelier'/);
assert.match(overlay,/source==='ambient'/);
assert.match(overlay,/onClose=\{\(\)=>setUnifiedOpen\(false\)\}/);
assert.match(overlay,/initialSelected=\{unifiedTarget\}/);
assert.match(overlay,/openUnifiedStudio\(\{source:'atelier',tab:'journal'\}\)/);
assert.match(overlay,/else if\(type==='studio-open'\)openUnifiedStudio\(\)/);
assert.match(parent,/import '\.\/FocusUnifiedStudio\.css';/);
assert.match(parent,/startFocusEnter/);
assert.match(parent,/startFocusExit/);
assert.match(parent,/usePersistentFocusYoutube/);
const categories=hub.match(/\{id:'(space|work|class|system)'/g)||[];
assert.equal(categories.length,4);
const features=[...hub.matchAll(/\['(atelier|ambient|silk)','([^']+)','(space|work|class|system)'/g)];
assert.equal(features.length,30,'All ten features from each of three historical modules must stay navigable');
const unique=new Set(features.map(match=>match[1]+':'+match[2]));
assert.equal(unique.size,30,'Every destination should be unique');
for(const source of ['atelier','ambient','silk']){
 assert.equal(features.filter(match=>match[1]===source).length,10);
}
assert.match(hub,/input type="search"/);
assert.match(hub,/normalize\(value\)/);
assert.match(hub,/initialSelected=null/);
for(const text of ['Living Atelier 7.0','Ambient OS 8.0','Silk Flow 9.0','Focus Studio 6.0','Living Space 6.0']){
 for(const name of legacy)assert.ok(!file(name).includes(text),name+' still displays '+text);
}
assert.match(css,/\.bfc-unified__panel/);
assert.match(css,/\.bfc7-studio__tabs/);
assert.match(css,/\.bfc8-tabs/);
assert.match(css,/\.bfc9-tabs/);
assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/prefers-reduced-motion/);
console.log('PASS Brian Focus unified navigation: one entry, four task-oriented groups, thirty preserved features, no visible V6/V7/V8/V9 labels.');
