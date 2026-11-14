import assert from 'node:assert/strict';
import { evaluateLearner } from '../src/features/english-early-warning/earlyWarningEngine.js';
import {
  pairedDescription, buildResearchEvidence, researchReportMarkdown,
  PUBLIC_MIN_COHORT_SIZE,
} from '../src/features/english-early-warning/researchEvidence.js';

function learner(id, pre, gain, postReady=true) {
  const scores={listening:pre,speaking:pre,reading:pre,writing:pre};
  const post=Object.fromEntries(Object.keys(scores).map(key=>[key,postReady ? pre+gain : null]));
  return evaluateLearner({studentId:id,scores,post,recent1:pre,recent2:pre,missing14d:0});
}
function assertClose(actual,expected,tolerance=0.02){assert.ok(Math.abs(actual-expected)<tolerance,actual+' is not within '+tolerance+' of '+expected)}
const paired=pairedDescription([10,20,0,10]);
assert.equal(paired.n,4);
assert.equal(paired.meanChange,10);
assert.equal(paired.medianChange,10);
assert.equal(paired.improved,3);
assert.equal(paired.unchanged,1);
assertClose(paired.sdChange,8.16);
assertClose(paired.lower95,-2.99);
assertClose(paired.upper95,22.99);
assert.equal(pairedDescription([]).meanChange,null);
assert.equal(pairedDescription([5]).lower95,null);
assert.deepEqual([pairedDescription([10,10]).lower95,pairedDescription([10,10]).upper95],[10,10]);
assert.throws(()=>pairedDescription([NaN]),/finite/);

const cohort=[
  learner('P001',50,10),learner('P002',50,20),learner('P003',50,0),
  learner('P004',50,10),learner('P005',50,0,false),learner('P006',50,10),
];
const reviews={
  P001:{decision:'confirmed'},P002:{decision:'confirmed'},
  P003:{decision:'not_confirmed'},
};
const logged=[{
  studentId:'P001',week:1,skill:'listening',assigned:2,completed:1,
  checkpointScore:60,observedOn:'2026-11-14',recordedAt:'2026-11-14T00:00:00Z',sequence:1,
}];
const report=buildResearchEvidence(cohort,reviews,logged);
assert.equal(report.sample.codedLearners,6);
assert.equal(report.sample.completePaired,5);
assert.equal(report.sample.missingPost,1);
assert.equal(report.outcomes.overall.meanChange,10);
assertClose(report.outcomes.overall.lower95,1.22);
assertClose(report.outcomes.overall.upper95,18.78);
assert.equal(report.teacherReviews.confirmed,2);
assert.equal(report.teacherReviews.notConfirmed,1);
assert.equal(report.teacherReviews.pending,3);
assert.equal(report.delivery.events,1);
assert.equal(report.delivery.confirmedWithoutLoggedSupport,1);
assert.equal(report.delivery.completionPct,50);
assert.equal(report.sample.exportPermitted,true);
const exported=researchReportMarkdown(report,'2026-11-14T08:00:00.000Z');
assert.match(exported,/Paired four-skill observations: 5/);
assert.match(exported,/Mean of paired baseline four-skill averages: 50/);
assert.match(exported,/Missing complete post-assessment: 1/);
assert.match(exported,/95% paired-t CI/);
assert.doesNotMatch(exported,/P001|P002|Private comment/);
assert.throws(()=>researchReportMarkdown(report,'invalid'),/timestamp/);

const tiny=buildResearchEvidence(cohort.slice(0,5),reviews,logged);
assert.equal(PUBLIC_MIN_COHORT_SIZE,5);
assert.equal(tiny.sample.exportPermitted,false);
assert.throws(()=>researchReportMarkdown(tiny,'2026-11-14T08:00:00Z'),/at least five/);
const empty=buildResearchEvidence([]);
assert.equal(empty.outcomes.overall.n,0);
assert.equal(empty.sample.completePaired,0);
assert.equal(empty.outcomes.pairedBaselineMean,null);
console.log('[PASS] V5: matched-pair mean and t CI, missingness, teacher review, public-safe export');
