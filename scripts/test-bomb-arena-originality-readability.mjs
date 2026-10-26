import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {G12_UNIT_PACKS,G12_TOTAL_ITEMS} from '../src/components/BrianBombArena/arenaG12UnitPacks.js';
import {SAMPLE_PACKS,getSamplePack} from '../src/components/BrianBombArena/arenaSamplePacks.js';

const common=new Set('a an the in at on for to with of from by as is are was were has have had do does did will can could would should and or but if while when so that this those these their her his our it we they you he she my very much more less than its into near during after before yesterday year years there'.split(' '));
const meaningful=q=>new Set(q.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(x=>x.length>2&&!common.has(x)));
const jaccard=(a,b)=>{
 const A=meaningful(a),B=meaningful(b);
 let same=0;for(const token of A)if(B.has(token))same++;
 return same/(A.size+B.size-same||1);
};
const source=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
const style=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.css',import.meta.url),'utf8');
assert.equal(G12_UNIT_PACKS.length,10);
assert.equal(G12_TOTAL_ITEMS,1000);
assert.equal(SAMPLE_PACKS.length,23);
assert.equal(getSamplePack('g12-grammar-unit-1-100').count,100);
const all=new Set();
let worst=0,worstPair='',checkedPairs=0;
for(const [index,pack] of G12_UNIT_PACKS.entries()){
 assert.equal(pack.count,100);
 assert.equal(pack.items.length,100);
 const counts=[0,0,0,0];
 for(const item of pack.items){
  assert.equal(item.grade,12);
  assert.equal(item.unit,index+1);
  assert.equal(item.options.length,4);
  assert.equal(item.options[item.answerIndex],item.answer);
  assert.ok(item.prompt.includes('___')||item.prompt.startsWith('Identify the sentence type:'));
  assert.ok(!item.prompt.includes('@'));
  assert.ok(item.prompt.length>=35);
  assert.ok(!all.has(item.prompt.toLowerCase()),'duplicate: '+item.id);
  all.add(item.prompt.toLowerCase());
  counts[item.answerIndex]++;
 }
 assert.ok(counts.every(n=>n>=20&&n<=30),'A–D answer positions too uneven for Unit '+pack.unit);
 // Within each five-question grammatical pattern, genuine lexical content
 // must change, not just the person's name or superficial metadata.
 for(let base=0;base<100;base+=5){
  const group=pack.items.slice(base,base+5);
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
   const similarity=jaccard(group[i].prompt,group[j].prompt);
   checkedPairs++;if(similarity>worst){worst=similarity;worstPair=group[i].id+' '+group[j].id;}
   assert.ok(similarity<.82,group[i].id+' and '+group[j].id+' are too similar: '+similarity.toFixed(2));
  }
 }
}
assert.equal(all.size,1000);
assert.match(source,/className="bba-question-display"/);
assert.match(source,/clamp\(35px,3\.6vw,62px\)/);
assert.ok(!source.includes('<h2>{selectedQuestion?.prompt'));
assert.match(source,/onClick=\{\(\)=>answerChoice\(index\)\}/);
assert.match(style,/\.bba-classroom-question-card \.bba-question-display/);
console.log('PASS: 1,000 full Grade 12 sentences; unique grammar contexts, balanced keys, accessible large question heading.');
console.log('Reviewed pairs:',checkedPairs,'/ Max within-group semantic token overlap:',worst.toFixed(2),worstPair);
