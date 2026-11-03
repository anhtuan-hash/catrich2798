import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildLearningPack,sha256} from '../supabase/functions/world-explorer-learning/engine.mjs';

const reading=[
 'The James Webb Space Telescope (JWST) is a space telescope designed to conduct infrared astronomy.',
 'It is the largest telescope in space, and is equipped with high-resolution and high-sensitivity instruments, allowing it to view objects too old, distant, or faint for the Hubble Space Telescope.',
 'This enables investigations across many fields of astronomy and cosmology, such as observation of the first stars and the formation of the first galaxies, and detailed atmospheric characterization of potentially habitable exoplanets.',
 "Despite Webb's mirror diameter being 2.7 times larger than that of the Hubble Space Telescope, it produces images of comparable resolution because it observes in the infrared spectrum, which has longer wavelengths than the Hubble's visible spectrum.",
 'The Webb was launched on 25 December 2021 on an Ariane 5 rocket from Kourou, French Guiana.',
 'In 15 January 2022 it arrived at its destination, a solar orbit near the Sun-Earth L2 Lagrange point.'
].join(' ');
const pack=buildLearningPack({body_en:reading});
assert.equal(pack.status,'ready');
assert.ok(pack.vocabulary.length>=5,'source-grounded vocabulary');
assert.ok(pack.grammar.length>=3,'source-grounded grammar patterns');
assert.ok(pack.questions.length>=8,'reading exercises');
assert.deepEqual([...new Set(pack.questions.map(q=>q.question_type))].sort(),
 ['gap_fill','matching','short_answer','single_choice','true_false']);
assert.ok(pack.questions.every(q=>reading.includes(q.evidence.exact_quote)),'all evidence must be exact source text');
assert.ok(pack.questions.every(q=>q.answer_key&&q.options&&q.validation_status==='verified'));
assert.equal(new Set(pack.questions.map(q=>q.id)).size,pack.questions.length);
assert.ok(pack.questions.filter(q=>q.question_type==='single_choice').every(q=>
 q.options.length===4&&q.options.filter(o=>o.id===q.answer_key.accepted[0]).length===1));
assert.ok(pack.questions.some(q=>q.question_type==='true_false'&&q.answer_key.accepted[0]==='false'));
assert.ok((await sha256(reading)).length===64);
assert.equal(buildLearningPack({body_en:'A short text.'}).status,'needs_review');
const admin=readFileSync(new URL('../src/features/world-explorer/WorldExplorerAdmin.jsx',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/features/world-explorer/WorldExplorerLearning.jsx',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261103235500_world_explorer_learning_v1.sql',import.meta.url),'utf8');
const old=readFileSync(new URL('../supabase/functions/world-explorer-hourly/index.ts',import.meta.url),'utf8');
assert.match(admin,/learning_enabled/);
assert.match(ui,/we_get_learning_questions/);
assert.match(ui,/we_submit_learning_answer/);
assert.match(ui,/we_complete_learning_attempt/);
assert.match(sql,/world_explorer_learning_questions enable row level security/);
assert.doesNotMatch(sql,/grant select on public\.world_explorer_learning_questions to (anon|authenticated)/);
assert.match(old,/world_explorer_auto_ingest/);
console.log('World Explorer Learning V1: 5 types, QA evidence, privacy and hourly regressions PASS.');
