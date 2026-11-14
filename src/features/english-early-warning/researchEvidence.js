/**
 * Reproducible descriptive study analysis for BRIAN English Early Warning.
 * Do not interpret within-student change as a causal effect. Form A/B remain
 * unequated, and screening cutoffs have not been validated. No student IDs
 * are emitted by this module.
 */
import { RULE_VERSION, SKILLS } from './earlyWarningEngine.js';
import { INTERVENTION_WEEKS, summarizeJournal, weeklyCoverage } from './interventionJournal.js';

export const EVIDENCE_VERSION = '1.0';
export const PUBLIC_MIN_COHORT_SIZE = 5;
const T975_DF_1_TO_120 = Object.freeze([12.706205,4.302653,3.182446,2.776445,2.570582,2.446912,2.364624,2.306004,2.262157,2.228139,2.200985,2.178813,2.160369,2.144787,2.131449,2.119905,2.109816,2.100922,2.093024,2.085963,2.079614,2.073873,2.068658,2.063899,2.059539,2.055529,2.051830,2.048407,2.045230,2.042273,2.039513,2.036933,2.034515,2.032245,2.030108,2.028094,2.026193,2.024394,2.022691,2.021075,2.019541,2.018082,2.016692,2.015368,2.014103,2.012896,2.011741,2.010635,2.009575,2.008559,2.007584,2.006647,2.005746,2.004879,2.004045,2.003241,2.002466,2.001717,2.000995,2.000298,1.999624,1.998971,1.998341,1.997730,1.997138,1.996564,1.996008,1.995469,1.994945,1.994437,1.993943,1.993464,1.992997,1.992544,1.992102,1.991673,1.991254,1.990847,1.990450,1.990063,1.989686,1.989319,1.988960,1.988610,1.988268,1.987934,1.987608,1.987290,1.986979,1.986673,1.986378,1.986086,1.985802,1.985523,1.985251,1.984990,1.984723,1.984468,1.984217,1.983971,1.983731,1.983495,1.983261,1.983038,1.982815,1.982597,1.982383,1.982174,1.981968,1.981765,1.981567,1.981372,1.981180,1.980992,1.980808,1.980626,1.980448,1.980272,1.980100,1.979930]);
const round = n => Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null;
const mean = xs => xs.reduce((sum, n) => sum + n, 0) / xs.length;
const isScore = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

export function pairedDescription(differences) {
  if (!Array.isArray(differences) || differences.some(d => !Number.isFinite(d) || d < -100 || d > 100)) {
    throw new Error('Paired differences must be finite and in the range -100–100.');
  }
  const n = differences.length;
  if (!n) return { n: 0, meanChange: null, medianChange: null, sdChange: null, lower95: null, upper95: null, improved: 0, unchanged: 0, declined: 0 };
  const sorted = [...differences].sort((a, b) => a - b);
  const average = mean(differences);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const sd = n >= 2 ? Math.sqrt(differences.reduce((sum, x) => sum + (x - average) ** 2, 0) / (n - 1)) : null;
  const critical = n > 1 ? T975_DF_1_TO_120[n - 2] : null;
  const margin = critical === null || critical === undefined ? null : critical * sd / Math.sqrt(n);
  return {
    n, meanChange: round(average), medianChange: round(median), sdChange: round(sd),
    lower95: margin === null ? null : round(average - margin),
    upper95: margin === null ? null : round(average + margin),
    improved: differences.filter(d => d > 0).length,
    unchanged: differences.filter(d => d === 0).length,
    declined: differences.filter(d => d < 0).length,
  };
}

export function buildResearchEvidence(results = [], reviews = {}, journal = []) {
  if (!Array.isArray(results) || !Array.isArray(journal)) throw new Error('Invalid study input.');
  const codedIds = results.map(row => row.studentId);
  if (new Set(codedIds).size !== codedIds.length) throw new Error('Duplicate study pseudonyms.');
  const baselineComplete = results.filter(row => SKILLS.every(skill => isScore(row.scores?.[skill])));
  const postComplete = results.filter(row => SKILLS.every(skill => isScore(row.post?.[skill])));
  const completePaired = results.filter(row => SKILLS.every(skill => isScore(row.scores?.[skill]) && isScore(row.post?.[skill])));
  const pairedMeans = completePaired.map(row => ({
    before: mean(SKILLS.map(skill => row.scores[skill])),
    after: mean(SKILLS.map(skill => row.post[skill])),
  }));
  const baselinePairedMean = pairedMeans.length ? round(mean(pairedMeans.map(row => row.before))) : null;
  const postPairedMean = pairedMeans.length ? round(mean(pairedMeans.map(row => row.after))) : null;
  const differences = pairedMeans.map(row => row.after - row.before);
  const statusCounts = { priority: 0, review: 0, no_signal: 0, insufficient: 0 };
  results.forEach(row => { if (Object.hasOwn(statusCounts, row.status)) statusCounts[row.status]++; });
  const confirmedIds = new Set(Object.entries(reviews).filter(([id, row]) => codedIds.includes(id) && row?.decision === 'confirmed').map(([id]) => id));
  const unconfirmed = Object.entries(reviews).filter(([id, row]) => codedIds.includes(id) && row?.decision === 'not_confirmed').length;
  const activeEntries = journal.filter(row => codedIds.includes(row.studentId) && confirmedIds.has(row.studentId));
  const intervention = summarizeJournal(activeEntries, codedIds);
  const fullyLogged = [...confirmedIds].filter(id => weeklyCoverage(activeEntries, id) === INTERVENTION_WEEKS).length;
  const documented = new Set(activeEntries.map(row => row.studentId));
  const paired = pairedDescription(differences);
  const rubricMet = completePaired.filter(row => {
    const post = SKILLS.map(skill => row.post[skill]);
    return mean(post) >= 60 && Math.min(...post) >= 50;
  }).length;

  return {
    evidenceVersion: EVIDENCE_VERSION, ruleVersion: RULE_VERSION,
    sample: {
      codedLearners: results.length, completeBaseline: baselineComplete.length,
      completePost: postComplete.length, completePaired: completePaired.length,
      missingPost: results.length - postComplete.length, unmatched: results.length - completePaired.length,
      exportPermitted: results.length >= PUBLIC_MIN_COHORT_SIZE && completePaired.length >= PUBLIC_MIN_COHORT_SIZE,
    },
    screening: statusCounts,
    teacherReviews: {
      confirmed: confirmedIds.size, notConfirmed: unconfirmed,
      pending: results.length - confirmedIds.size - unconfirmed,
    },
    delivery: {
      ...intervention, confirmedWithoutLoggedSupport: [...confirmedIds].filter(id => !documented.has(id)).length,
      confirmedWithEightWeeks: fullyLogged,
    },
    outcomes: {
      pairedBaselineMean: baselinePairedMean, pairedPostMean: postPairedMean,
      overall: paired, provisionalPostTargetCount: rubricMet,
      skillChanges: Object.fromEntries(SKILLS.map(skill => [skill, pairedDescription(
        results.filter(row => isScore(row.scores?.[skill]) && isScore(row.post?.[skill]))
          .map(row => row.post[skill] - row.scores[skill])
      )])),
    },
    limitations: [
      'No validated equivalence test for diagnostic Forms A and B.',
      'Screening cutoffs are experimental; warning labels are not predicted probabilities.',
      'Uncontrolled pre/post differences are descriptive and do not establish causation.',
      'Do not interpret a provisional 60/50 rule as proof of CEFR B1 or official competency certification.',
      '95% paired-t intervals assume independent learner differences and approximately adequate conditions; inspect distributions and small samples.',
    ],
  };
}

const format = v => v === null || v === undefined ? 'Not available' : String(v);
const fmtInterval = x => x.lower95 === null ? 'Not estimable' : '[' + format(x.lower95) + ', ' + format(x.upper95) + ']';
export function researchReportMarkdown(evidence, generatedAt) {
  if (!evidence?.sample?.exportPermitted) throw new Error('City-level aggregate export requires at least five learners with complete paired assessments.');
  const date = typeof generatedAt === 'string' && Number.isFinite(Date.parse(generatedAt))
    ? generatedAt : (() => { throw new Error('A valid export timestamp is required.'); })();
  const sample = evidence.sample;
  const outcome = evidence.outcomes;
  const rows = [
    ['Four-skill mean', outcome.overall],
    ...SKILLS.map(skill => [skill, outcome.skillChanges[skill]]),
  ];
  const table = rows.map(([name, stats]) =>
    stats.n < PUBLIC_MIN_COHORT_SIZE
      ? '| ' + name + ' | <5 (suppressed) | Not disclosed | Not disclosed | Not disclosed |'
      : '| ' + name + ' | ' + stats.n + ' | ' + format(stats.meanChange) + ' | ' + fmtInterval(stats) + ' | ' + format(stats.medianChange) + ' |'
  );
  return [
    '# BRIAN ENGLISH — Aggregate research evidence',
    '',
    'Exported UTC: ' + date,
    'Rule version: ' + evidence.ruleVersion + '; evidence schema: ' + evidence.evidenceVersion,
    '',
    '## Study population and missingness',
    '',
    '- Coded learners imported: ' + sample.codedLearners,
    '- Complete baseline four-skill records: ' + sample.completeBaseline,
    '- Complete post-assessments: ' + sample.completePost,
    '- Paired four-skill observations: ' + sample.completePaired,
    '- Missing complete post-assessment: ' + sample.missingPost,
    '',
    '## Teacher-reviewed implementation',
    '',
    '- Teacher-confirmed support needs: ' + evidence.teacherReviews.confirmed,
    '- Teachers did not confirm: ' + evidence.teacherReviews.notConfirmed,
    '- Not yet reviewed: ' + evidence.teacherReviews.pending,
    '- Learners with logged support: ' + evidence.delivery.activeLearners,
    '- Documented activity entries: ' + evidence.delivery.events,
    '- Confirmed learners with all eight weeks documented: ' + evidence.delivery.confirmedWithEightWeeks,
    '- Assigned/completed tasks: ' + evidence.delivery.assignedTasks + '/' + evidence.delivery.completedTasks,
    '- Task completion rate: ' + format(evidence.delivery.completionPct) + '%',
    '',
    '## Observed pre/post changes (paired only)',
    '',
    '- Mean of paired baseline four-skill averages: ' + format(outcome.pairedBaselineMean),
    '- Mean of paired post four-skill averages: ' + format(outcome.pairedPostMean),
    '- Provisional 60/50 post-test target count (among paired learners): ' + outcome.provisionalPostTargetCount,
    '',
    '| Measure | Paired n | Mean change | 95% paired-t CI | Median change |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...table,
    '',
    '## Cautions',
    '',
    ...evidence.limitations.map(x => '- ' + x),
    '- Report contains aggregate counts only; no learner codes or narrative teacher notes.',
    '- This export is not an approval, a statistical validation of thresholds or an accepted city-level outcome.',
    '',
  ].join('\n');
}
