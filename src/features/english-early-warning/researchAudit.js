/**
 * Evidence export audit. A SHA-256 manifest detects edits to the downloaded
 * aggregate report AFTER creation; it does not authenticate any school record,
 * teacher identity, original assessment, or observation.
 */
import { EVIDENCE_VERSION, PUBLIC_MIN_COHORT_SIZE } from './researchEvidence.js';
import { RULE_VERSION } from './earlyWarningEngine.js';

export const AUDIT_VERSION = '1.0';

function checkDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error('A valid ISO export timestamp is required.');
  }
  return value;
}
function utf8(text) {
  return new TextEncoder().encode(text);
}
function hex(bytes) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2,'0')).join('');
}
export async function sha256Text(text, cryptoImpl = globalThis.crypto) {
  if (typeof text !== 'string' || !cryptoImpl?.subtle?.digest) {
    throw new Error('SHA-256 requires a secure, modern browser.');
  }
  return hex(await cryptoImpl.subtle.digest('SHA-256', utf8(text)));
}
export async function createAuditManifest(reportMarkdown, evidence, createdAt, cryptoImpl = globalThis.crypto) {
  if (typeof reportMarkdown !== 'string' || !reportMarkdown.startsWith('# BRIAN ENGLISH')) {
    throw new Error('Export a valid aggregate study report first.');
  }
  if (!evidence?.sample?.exportPermitted || evidence.sample.completePaired < PUBLIC_MIN_COHORT_SIZE) {
    throw new Error('The aggregate report does not meet the five-pair confidentiality gate.');
  }
  const exportedUtc = checkDate(createdAt);
  return {
    format: 'brian-english-aggregate-audit-manifest',
    manifestVersion: AUDIT_VERSION,
    evidenceVersion: EVIDENCE_VERSION,
    screeningRuleVersion: RULE_VERSION,
    exportedUtc,
    reportFile: 'brian-english-city-level-aggregate-report-' + exportedUtc.slice(0,10) + '.md',
    reportSha256: await sha256Text(reportMarkdown, cryptoImpl),
    reportSizeBytes: utf8(reportMarkdown).byteLength,
    sample: {
      learnerCount: evidence.sample.codedLearners,
      completePaired: evidence.sample.completePaired,
      missingCompletePost: evidence.sample.missingPost,
    },
    attestations: {
      assessmentFormsEquated: false,
      institutionalDataProcessingApprovalVerifiedBySystem: false,
      studentObservationsAuthenticatedBySystem: false,
      effectCausalityEstablished: false,
    },
    caveat: 'Hash checks only whether the downloaded Markdown changed. It does NOT establish source-data authenticity, consent, assessment equivalence, integrity before export, or causal validity.',
  };
}
export async function verifyAuditManifest(reportMarkdown, manifest, cryptoImpl = globalThis.crypto) {
  if (manifest?.format !== 'brian-english-aggregate-audit-manifest'
      || !/^[0-9a-f]{64}$/.test(String(manifest.reportSha256 || ''))
      || !Number.isSafeInteger(manifest.reportSizeBytes) || manifest.reportSizeBytes < 0) {
    return { ok: false, reason: 'Invalid manifest format.' };
  }
  if (utf8(reportMarkdown).byteLength !== manifest.reportSizeBytes) {
    return { ok: false, reason: 'Report file size has changed.' };
  }
  const actual = await sha256Text(reportMarkdown, cryptoImpl);
  return actual === manifest.reportSha256
    ? { ok: true, reason: 'Report matches the supplied SHA-256 manifest.' }
    : { ok: false, reason: 'Report digest does not match the manifest.' };
}

/**
 * Operational readiness is NOT a claim that a school or city approved a study.
 * All external approvals are deliberately never inferred from cohort data.
 */
export function researchReadiness(evidence) {
  if (!evidence?.sample || !evidence?.teacherReviews || !evidence?.delivery) {
    throw new Error('Study evidence is required.');
  }
  const n = evidence.sample.codedLearners;
  const paired = evidence.sample.completePaired;
  const tasks = [
    {
      key:'baseline', title:'Complete four-skill baseline',
      done:n > 0 && evidence.sample.completeBaseline === n,
      metric:evidence.sample.completeBaseline + '/' + n + ' coded learners',
    },
    {
      key:'review', title:'Document teacher screening reviews',
      done:n > 0 && evidence.teacherReviews.pending === 0,
      metric:evidence.teacherReviews.pending + ' still awaiting verification',
    },
    {
      key:'intervention', title:'Log all eight weeks for confirmed cases',
      done:evidence.teacherReviews.confirmed > 0 && evidence.delivery.confirmedWithEightWeeks === evidence.teacherReviews.confirmed,
      metric:evidence.delivery.confirmedWithEightWeeks + '/' + evidence.teacherReviews.confirmed + ' confirmed cases',
    },
    {
      key:'outcomes', title:'Collect complete paired post assessments',
      done:n >= PUBLIC_MIN_COHORT_SIZE && paired === n,
      metric:paired + '/' + n + ' matched four-skill pairs',
    },
  ];
  const external = [
    'Institutional data-processing authorization and notices: not verified in the app',
    'Form A/B comparability and rubric review: not verified in the app',
    'Role-based RLS cross-account penetration test: not signed off',
    'Causal identification design: not established by within-student differences',
  ];
  return {
    tasks, completed:tasks.filter(x=>x.done).length, total:tasks.length,
    minimumPairsForRestrictedExport:paired >= PUBLIC_MIN_COHORT_SIZE,
    fullyDocumentedOperationalCycle:tasks.every(x=>x.done),
    eligibleForOfficialSubmission:false,
    externalBlockers:external,
  };
}
