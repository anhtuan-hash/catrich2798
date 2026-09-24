import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildBankInventory, selectExamFromBank } from '../src/utils/questionBankExamBuilder.js';

const makeArrangement = (id, bundleId, pos, status='approved') => ({
  id,
  bundle_id: bundleId,
  bundle_position: pos,
  question_type: 'arrangement',
  stem: `Choose the correct order for fixture ${id}.`,
  options: ['a-b-c','b-a-c','a-c-b','c-a-b'],
  correct_answer: 'A',
  explanation: 'Fixture explanation.',
  skill: 'Discourse',
  cefr: 'B1',
  topic: 'fixture topic',
  cognitive_level: 'comprehension',
  difficulty: 2,
  grammar_point: 'cohesion',
  tags: ['TNTHPT2025-2026','arrangement'],
  status,
  grade: 12,
  usage_count: 0,
  fingerprint: 'fp-' + id,
});

const bundles = [
  { id:'approved-set', bundle_type:'arrangement_5', status:'approved', grade:12, title:'Approved set' },
  { id:'draft-set', bundle_type:'arrangement_5', status:'draft', grade:12, title:'Draft set' },
  { id:'archived-set', bundle_type:'arrangement_5', status:'archived', grade:12, title:'Archived set' },
  { id:'broken-set', bundle_type:'arrangement_5', status:'approved', grade:12, title:'Broken set' },
];

const questions = [];
for (let p=1;p<=5;p+=1) {
  questions.push(makeArrangement(`approved-${p}`,'approved-set',p));
  questions.push(makeArrangement(`draft-${p}`,'draft-set',p));
  questions.push(makeArrangement(`archived-${p}`,'archived-set',p));
}
for (let p=1;p<=4;p+=1) questions.push(makeArrangement(`broken-${p}`,'broken-set',p));

const inventory = buildBankInventory(questions,bundles);
assert.equal(inventory.arrangementItems.length,10,'Only valid non-archived 5-item Arrangement sets should enter inventory.');
assert.ok(inventory.arrangementItems.some((item)=>item.bundle_id==='approved-set'));
assert.ok(inventory.arrangementItems.some((item)=>item.bundle_id==='draft-set'));
assert.ok(!inventory.arrangementItems.some((item)=>item.bundle_id==='archived-set'));
assert.ok(!inventory.arrangementItems.some((item)=>item.bundle_id==='broken-set'));

const result = selectExamFromBank({
  questions,
  bundles,
  blueprint:[{ type:'arrangement_5', label:'Arrangement', mode:'items', count:5 }],
  filters:{ grade:'12', approvedOnly:true },
  seed:20260924,
  auditOptions:{ isTnThpt:false },
});
assert.equal(result.complete,true);
assert.equal(result.items.length,5);
assert.ok(result.items.every((item)=>item.bundle_id==='approved-set'),'Approved-only builder must reject draft Arrangement bundles.');

const builder = fs.readFileSync('src/utils/questionBankExamBuilder.js','utf8');
const migration = fs.readFileSync('supabase/question_bank_quality_consistency_v11_9_5.sql','utf8');

for (const token of [
  "bundleStatus === 'archived'",
  "siblings.length === 5",
  "String(candidate.bundle?.status || '').toLowerCase() === 'approved'",
  "inventory.bundleMap.get(item.bundle_id)?.status",
]) assert.ok(builder.includes(token),'Builder consistency guard missing: '+token);

for (const token of [
  "when ''arrangement_5'' then 5",
  "b.bundle_type='functional_cloze_6'",
  "array['TNTHPT2025-2026','functional-cloze']",
  "ab.status=''approved''",
  "ab.bundle_type=''arrangement_5''",
  "qb_coverage_plan arrangement patch anchor not found",
]) assert.ok(migration.includes(token),'Quality consistency migration missing: '+token);

console.log('PASS: Arrangement Builder, Golden audit, Coverage and legacy Functional tags use one consistent contract.');
