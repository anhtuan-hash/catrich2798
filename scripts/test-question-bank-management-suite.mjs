import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  advancedFilterQuestions,
  balancedOptionOrders,
  findDuplicateGroups,
  managementDashboard,
  parseCsv,
  questionsToCsv,
  smartReplacementCandidates,
  spreadsheetRowsToQuestions,
  taxonomySuggestions,
  textSimilarity,
} from '../src/utils/questionBankManagement.js';

const base = (id, stem, answer='A', extra={}) => ({
  id, stem,
  options: ['Alpha','Beta','Gamma','Delta'],
  correct_answer: answer,
  explanation: 'Because the text supports it.',
  grade: 12, cefr: 'B1', skill: 'Use of English', topic: 'environment',
  cognitive_level: 'comprehension', difficulty: 2, grammar_point: 'collocation',
  tags: ['TNTHPT2025-2026','functional-cloze'],
  status: 'approved', visibility: 'personal', source_kind: 'manual',
  usage_count: 0, fingerprint: 'fp-' + id,
  ...extra,
});

const questions = [
  base('q1','Students should reduce plastic waste at school.','A',{fingerprint:'same'}),
  base('q2','Students should reduce plastic waste at school.','B',{fingerprint:'same',usage_count:2}),
  base('q3','Students can reduce plastic waste in their school.','C',{cefr:'B2',cognitive_level:'application'}),
  base('q4','Students can reduce plastic waste at their school.','D',{cefr:'B2',cognitive_level:'application'}),
  base('q5','A completely unrelated item about astronomy.','A',{topic:'science',status:'draft'}),
];

assert.ok(textSimilarity(questions[2].stem, questions[3].stem) > 0.5);
const duplicates = findDuplicateGroups(questions,0.5);
assert.ok(duplicates.some((group)=>group.kind==='exact'));
assert.ok(duplicates.some((group)=>group.kind==='near'));

const filtered = advancedFilterQuestions(questions,{grade:'12',cefr:'B1',status:'approved',topic:'environment'});
assert.equal(filtered.length,2);

const replacement = smartReplacementCandidates(questions[0],questions,['q2'],5);
assert.ok(replacement.some((entry)=>entry.item.id==='q3'));

const orders = balancedOptionOrders(Array.from({length:40},(_,i)=>base('b'+i,'Question '+i,['A','B','C','D'][i%4])),'test');
assert.equal(orders.length,40);
for(const order of orders){assert.equal(order.length,4);assert.equal(new Set(order).size,4);}

const csv = questionsToCsv(questions);
const parsedCsv = parseCsv(csv);
assert.ok(parsedCsv.length>=5);
const imported = spreadsheetRowsToQuestions([
  ['stem','A','B','C','D','answer','grade','cefr','topic','cognitive_level','difficulty','grammar_point','tags'],
  ['Sample?','one','two','three','four','B','12','B1','school','recognition','2','articles','tag1|tag2'],
]);
assert.equal(imported.length,1);
assert.equal(imported[0].correct_answer,'B');
assert.deepEqual(imported[0].tags,['tag1','tag2']);

const dashboard = managementDashboard(questions,[],[]);
assert.equal(dashboard.total,5);
assert.equal(dashboard.statuses.approved,4);
assert.equal(dashboard.statuses.draft,1);
assert.ok(dashboard.duplicateGroups>=1);

const topics = taxonomySuggestions(questions,'topic');
assert.equal(topics[0].value,'environment');
assert.equal(topics[0].count,4);

const page = fs.readFileSync('src/pages/QuestionBank.jsx','utf8');
const suite = fs.readFileSync('src/pages/question-bank/QuestionBankManagementSuite.jsx','utf8');
const builder = fs.readFileSync('src/utils/questionBankExamBuilder.js','utf8');
const css = fs.readFileSync('src/pages/QuestionBank.css','utf8');
const migration = fs.readFileSync('supabase/question_bank_management_suite_v11_7_0.sql','utf8');
const rpcs = fs.readFileSync('supabase/question_bank_management_rpcs_v11_7_0.sql','utf8');

for(const token of [
  "['manage', 'Quản trị']",
  'QuestionBankManagementSuite',
  'manageTargetQuestionId',
  'Chỉnh sửa chùm',
  'approvedOnly',
]) assert.ok(page.includes(token),'Parent integration missing: '+token);

for(const token of [
  'QUESTION EDITOR','BUNDLE EDITOR','BULK MANAGEMENT + ADVANCED SEARCH','DUPLICATE CENTER',
  'REVIEW & APPROVAL','TAXONOMY MANAGER','IMPORT / EXPORT CENTER','MANUAL EXAM COMPOSER',
  'STUDENT PRACTICE MODE','ITEM PERFORMANCE','BACKUP & RECOVERY','HISTORY & AUDIT',
  'restoreItemVersion','archiveQuestion','hardDeleteQuestion','mergeDuplicate','normalizeTaxonomy',
  'balancedOptionOrders','smartReplaceComposer','assessment_practice_attempts','qb_recompute_item_statistics',
  'createSnapshot','restoreSnapshot',
]) assert.ok(suite.includes(token),'Management Suite missing: '+token);


for(const token of [
  'practiceVisibleOptions',
  'practiceSourceAnswer',
  'practiceVisibleCorrectAnswer',
  'option_order: optionOrders[index]',
  'Brian không ghi lượt xem thử của giáo viên vào Item Performance',
]) assert.ok(suite.includes(token),'Practice preview telemetry/balancing guard missing: '+token);

const previewStart = suite.indexOf('async function submitPractice()');
const previewEnd = suite.indexOf('async function recomputeAnalytics()', previewStart);
assert.ok(previewStart >= 0 && previewEnd > previewStart, 'Practice preview function boundaries missing.');
const previewBlock = suite.slice(previewStart, previewEnd);
assert.ok(!previewBlock.includes("from('assessment_practice_attempts').insert"), 'Teacher preview must not create practice attempts.');
assert.ok(!previewBlock.includes("from('assessment_practice_responses').insert"), 'Teacher preview must not create practice responses.');
assert.ok(!previewBlock.includes("qb_recompute_item_statistics"), 'Teacher preview must not alter item telemetry.');

assert.ok(suite.includes("itemRefs.tests.length || itemRefs.practices.length"),'hard delete must be blocked by live references');
assert.ok(suite.includes("qb_merge_items"),'duplicate merge must use safe RPC');
assert.ok(builder.includes('filters.approvedOnly'),'builder must support approved-only mode');
assert.ok(builder.includes("=== 'archived'"),'builder must exclude archived content');
assert.ok(css.includes('.qb-admin-suite'));

for(const table of [
  'assessment_item_versions','assessment_bundle_versions','assessment_taxonomy_terms','assessment_bank_snapshots',
  'assessment_practice_sets','assessment_practice_items','assessment_practice_attempts','assessment_practice_responses',
]) assert.ok(migration.includes(table),'Migration missing table: '+table);
assert.ok(migration.includes('trg_qb_capture_item_version'));
assert.ok(migration.includes('trg_qb_capture_bundle_version'));
assert.ok(rpcs.includes('qb_merge_items'));
assert.ok(rpcs.includes('qb_normalize_taxonomy_term'));

console.log('PASS: complete Question Bank Management Suite contract is intact.');
