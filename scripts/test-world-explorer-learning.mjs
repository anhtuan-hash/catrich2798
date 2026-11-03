import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWorldExplorerPack,gradeWorldExplorerAnswer } from '../src/features/world-explorer/learningEngine.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const body=[
'The James Webb Space Telescope is designed to conduct infrared astronomy, and the telescope is equipped with advanced instruments.',
'The largest telescope observes distant galaxies and the atmosphere of exoplanets, allowing scientists to conduct important research in cosmology.',
'The Webb was launched in 2021 on a scientific mission to observe the solar system. It arrived in 2022 and started observations in a solar orbit around the Sun.',
'The resolution of infrared images is important because wavelengths of the visible spectrum are different from infrared wavelengths.',
'Researchers study the formation of stars in the universe with a spacecraft and a satellite.'
].join('\n');
const pack=buildWorldExplorerPack({id:'jwst',body_en:body});
assert.equal(pack.status,'ready');
assert.ok(pack.vocabulary.length>=4,'verified vocabulary from text');
assert.ok(pack.grammar.length>=2,'verified grammar from text');
const types=new Set(pack.questions.map(x=>x.type));
const trueFalse=pack.questions.filter(x=>x.type==='true_false');
assert.ok(trueFalse.some(x=>x.answer==='true'),'source-quoted true item');
assert.ok(trueFalse.some(x=>x.answer==='false'),'source-verifiable altered-quote false item');
for(const q of pack.questions.filter(x=>x.type==='matching')){
 assert.equal(new Set(q.answer.map(x=>x.meaning)).size,q.answer.length,'all matching meanings must be distinct');
}
for(const type of ['true_false','single_choice','matching','gap_fill','short_answer']){
 assert.ok(types.has(type),'must create '+type+' for sufficiently rich fixture');
}
for(const q of pack.questions){
 const evidence=Array.isArray(q.evidence)?q.evidence:[q.evidence];
 assert.ok(evidence.length&&evidence.every(e=>body.includes(e.exact_quote)),q.id+' must be grounded');
 assert.ok(q.id.startsWith(pack.content_hash));
 if(q.type==='single_choice'){
  assert.equal(q.options.length,4);
  assert.equal(new Set(q.options.map(x=>x.text)).size,4);
  assert.equal(q.options.filter(x=>x.text===q.answer).length,1);
 }
 assert.equal(gradeWorldExplorerAnswer(q,q.answer).correct,q.type!=='matching');
}
const match=pack.questions.find(x=>x.type==='matching');
const correct=Object.fromEntries(match.answer.map(x=>[x.word,x.meaning]));
assert.equal(gradeWorldExplorerAnswer(match,correct).points,1);
const empty=Object.fromEntries(match.answer.map(x=>[x.word,'incorrect']));
assert.equal(gradeWorldExplorerAnswer(match,empty).points,0);
assert.notEqual(pack.content_hash,buildWorldExplorerPack({id:'jwst',body_en:body+' Another statement.'}).content_hash);
const component=read('src/features/world-explorer/WorldExplorer.jsx');
const feature=read('src/features/world-explorer/WorldExplorerLearning.jsx');
const css=read('src/features/world-explorer/world-explorer-learning.css');
const migration=read('supabase/migrations/20261104002000_world_explorer_self_study_progress_v1.sql');
assert.match(component,/WorldExplorerLearning/);
assert.match(component,/data-world-explorer-inline-reader/);
assert.match(feature,/data-world-explorer-learning/);
assert.match(feature,/world_explorer_learning_progress/);
assert.match(feature,/world_explorer_bookmarks/);
assert.match(css,/@media\(max-width:720px\)/);
assert.match(migration,/enable row level security/);
assert.match(migration,/user_id=\(select auth\.uid\(\)\)/);
console.log('World Explorer evidence, five practice modes, grading, versioning, storage & UI contracts PASS');
