import assert from 'node:assert/strict';
import {
  RULE_VERSION, parseCsv, importCodedCohort, evaluateLearner, summarizeCohort,
  suggestedIntervention, escapeCsv, toCsv,
} from '../src/features/english-early-warning/earlyWarningEngine.js';

const header = 'student_id,listening,speaking,reading,writing,recent1,recent2,missing14d,post_listening,post_speaking,post_reading,post_writing';
function record(id, l='40', s='55', r='55', w='55', a='50', b='50', missing='2', post='') {
  return [id,l,s,r,w,a,b,missing,...(post ? post.split('/') : ['','','',''])].join(',');
}
const rows = importCodedCohort([header,record('P001'),record('P002','80','80','80','80','80','80','0','85/85/85/85')].join('\n'));
assert.equal(rows.length,2);
assert.equal(RULE_VERSION,'0.1');
assert.deepEqual(parseCsv('a,b\n"1,2",3\n'),[['a','b'],['1,2','3']]);
assert.equal(evaluateLearner(rows[0]).status,'priority');
assert.equal(evaluateLearner(rows[0]).flagCount,3);
assert.equal(evaluateLearner(rows[0]).weakSkill,'listening');
assert.equal(evaluateLearner(rows[1]).status,'no_signal');
assert.equal(evaluateLearner(rows[1]).progress,5);
assert.equal(evaluateLearner(rows[1]).rubricTarget,true);
assert.equal(suggestedIntervention(evaluateLearner(rows[0])).durationWeeks,8);
assert.deepEqual(summarizeCohort(rows.map(evaluateLearner)), {
  n:2,priority:1,review:0,no_signal:1,insufficient:0,matchedPairs:1,meanBefore:80,meanAfter:85,meanChange:5,rubricMet:1,ruleVersion:'0.1'
});
const withMissing = importCodedCohort([header,record('P003','40','40','40','40','','','')].join('\n'));
assert.equal(evaluateLearner(withMissing[0]).status,'insufficient');
assert.equal(evaluateLearner(withMissing[0]).flagCount,null);
assert.equal(evaluateLearner(withMissing[0]).postMean,null);
assert.throws(()=>importCodedCohort([header,record('RealStudent01')].join('\n')), /coded IDs/);
assert.throws(()=>importCodedCohort([header,record('P001'),record('P001')].join('\n')), /duplicate/);
assert.throws(()=>importCodedCohort([header.replace('student_id','full_name'),record('P001')].join('\n')), /Personal-identification/);
assert.throws(()=>importCodedCohort([header,record('P001','101')].join('\n')), /0–100/);
assert.equal(escapeCsv('=SUM(1,2)'), "\"'=SUM(1,2)\"");
assert.match(toCsv(['x'],[{x:'1,2'}]),/"1,2"/);
assert.equal(escapeCsv(-7.5),'-7.5');
assert.equal(escapeCsv('-SUM(A1:A2)'),"'-SUM(A1:A2)");
console.log('[PASS] English Early Warning: CSV validation, tri-state signals, workbook parity, exports');
