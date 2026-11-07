/**
 * BMPE Wave 5 formal release evidence gate. It never deploys or merges.
 * Usage: node scripts/bmpe-release-gate.mjs path/to/release-evidence.json
 */
import fs from 'node:fs';

const path = process.argv[2];
const required = [
  ['sourceAndBuild','CI build and source test logs'],
  ['featureParity','Role and feature parity inventory plus E2E results'],
  ['visualParity','Before/after visual diffs for critical routes/themes'],
  ['crossPlatform','Native macOS Safari and Windows Edge testing'],
  ['coreWebVitals','Official LCP/INP/CLS p75 with representative sample, plus trace'],
  ['motionCorrectness','Motion presets, reduced-motion, dock/loader lifecycle'],
  ['dataAndPermissions','Attendance, Gradebook, TTCM, work hub, import/export, permissions'],
  ['rollback','Production SHA, rollback target and smoke protocol'],
];
let manifest=null;
try {
  if (path && fs.existsSync(path)) manifest=JSON.parse(fs.readFileSync(path,'utf8'));
} catch { /* An invalid manifest is always a NO-GO. */ }
const sha=String(process.env.GITHUB_SHA || manifest?.candidateSha || '');
const matches=Boolean(manifest?.candidateSha && (!process.env.GITHUB_SHA || manifest.candidateSha===process.env.GITHUB_SHA));
const failures=required.filter(([key])=>{
  const part=manifest?.gates?.[key];
  const link=String(part?.evidence || '');
  return part?.status!=='PASS' || !/^https:\/\//.test(link) || link.includes('example.com');
}).map(([key,description])=>`${key}: ${description} — NOT VERIFIED`);
if(!matches) failures.unshift('candidateSha does not match the candidate deployment/CI SHA');
if(failures.length) {
  console.error('BMPE RELEASE DECISION: NO-GO\n' + failures.map(x=>' - '+x).join('\n'));
  process.exitCode=1;
} else {
  console.log('BMPE EVIDENCE MANIFEST: all required evidence references present for '+sha);
  console.log('Manual reviewer still must verify the referenced reports and deployment SHA before production release.');
}