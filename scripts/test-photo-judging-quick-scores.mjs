import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_RUBRIC, weightedTotal, isComplete } from '../src/utils/judgingMath.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const guest = read('src/components/PhotoJudgingPage.jsx');
const css = read('src/components/PhotoJudging.css');
const translations = read('src/utils/judgingTranslations.js');

const check = (condition, label) => { assert.ok(condition,label); console.log('✓ '+label); };
check(guest.includes("Array.from({length:10},(_,i)=>i+1)"), 'show score buttons 1–10 under each criterion');
check(guest.includes("className={'bj-score-chip'+(draft.criteria?.[r.id]===value?' is-selected':'')}"), 'highlight only selected value');
check(guest.includes("aria-pressed={draft.criteria?.[r.id]===value}"), 'selected score is exposed to assistive technology');
check(guest.includes("role=\"group\"") && guest.includes("aria-labelledby={'bj-criterion-'+r.id}"), 'each score scale is labeled by criterion');
check(guest.includes("disabled={readonly||busy}") && guest.includes("onClick={()=>edit(r.id,value)}"), 'buttons update drafts but respect lock / save progress');
check(guest.includes("type=\"button\""), 'score tap never submits the form');
check(!guest.includes("<select"), 'no dropdown remains in guest scoring interface');
check(guest.includes("draft.criteria[r.id].toFixed(1)"), 'historical 0.5 / 0 scores remain visible');
check(guest.includes("action:'judge:save'") && guest.includes("action:'judge:submit'"), 'save and submit APIs unchanged');
check(css.includes("grid-template-columns:repeat(10,minmax(0,1fr))"), 'full width ten-chip bar on desktop');
check(css.includes("grid-template-columns:repeat(5,minmax(0,1fr))"), 'large tap targets on mobile');
check(css.includes(".bj-score-form .bj-score-chip.is-selected"), 'selected state styling present');
check(css.includes(":focus-visible") && css.includes("prefers-reduced-motion"), 'focus and reduced motion states supported');
check(translations.includes('"Chạm chọn nhanh điểm từ 1 đến 10 dưới mỗi tiêu chí.'), 'new instruction is bilingual');

const values = Array.from({length:10},(_,i)=>i+1);
assert.deepEqual(values,[1,2,3,4,5,6,7,8,9,10]);
for (const value of values) {
  const selected = Object.fromEntries(DEFAULT_RUBRIC.map(item=>[item.id,value]));
  assert.ok(isComplete(selected, DEFAULT_RUBRIC));
  assert.equal(weightedTotal(selected, DEFAULT_RUBRIC),value*10);
}
assert.ok(isComplete({creativity:8.5,theme:6,art:9,message:7},DEFAULT_RUBRIC),'legacy half score remains valid in saved record');
assert.equal(weightedTotal({creativity:8,theme:6,art:9,message:7},DEFAULT_RUBRIC),75.5);
console.log('Brian Photo Judging 1–10 quick score contract PASS');
