// Homeroom 4.0 Records Review: transparent source-backed checklist statuses.
// These are *not* algorithmic "completion scores" or AI judgments.
export const PAPER_REQUIRED = Object.freeze(['completionCertificate','birthCertificate','grade10Admission','transcript']);
export const COMPARE_KEYS = Object.freeze([
  'fullName','gender','birthDate','birthPlace','hometown','birthRegistrationPlace',
  'currentAddress','permanentAddress','citizenId','phone','fatherName',
  'fatherPhone','motherName','motherPhone',
]);
const text=(value)=>String(value??'').trim();
const fold=(value)=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ');
function normalizedValue(value,key) {
  const raw=fold(value);
  if(key==='birthDate') {
    const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(iso)return `${iso[3].padStart(2,'0')}/${iso[2].padStart(2,'0')}/${iso[1]}`;
    const vi=raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if(vi)return `${vi[1].padStart(2,'0')}/${vi[2].padStart(2,'0')}/${vi[3]}`;
  }
  return raw;
}
export function requiredPaperDocs(grade) {
  return ['11','12'].includes(text(grade))
    ? PAPER_REQUIRED
    : PAPER_REQUIRED.filter((key)=>key!=='grade10Admission');
}
export function inspectStudentRecord(record={},grade='12') {
  const docs=requiredPaperDocs(grade);
  const checklist=record?.checklist||{};
  const missingDocs=docs.filter((key)=>checklist[key]!=='complete');
  const paperCompleted=docs.length-missingDocs.length;
  const paperPercent=docs.length ? Math.round((paperCompleted/docs.length)*100):0;
  const sources=record?.sources||{};
  const sourcePresence=Object.fromEntries(['paper','vnedu','moet'].map((key)=>{
    const source=sources[key]||{};
    return [key,Boolean(
      Object.values(source.fields||{}).some((value)=>text(value)) ||
      (Array.isArray(source.captures)&&source.captures.length) ||
      (source.excel && Object.keys(source.excel).length)
    ) || (key==='paper' && docs.some((doc)=>checklist[doc]==='complete'))];
  }));
  const mismatches=[];
  for(const key of COMPARE_KEYS) {
    const compared=[
      ['paper',record?.canonical?.[key]],
      ['vnEdu',sources?.vnedu?.fields?.[key]],
      ['MOET',sources?.moet?.fields?.[key]],
    ].filter(([,value])=>text(value)).map(([name,value])=>({source:name,value:text(value),normalized:normalizedValue(value,key)}));
    if(compared.length>1 && compared.some((entry)=>entry.normalized!==compared[0].normalized)){
      mismatches.push({key,values:compared.map(({source,value})=>({source,value}))});
    }
  }
  const missingMoetCitizenId=sourcePresence.moet&&!text(sources?.moet?.fields?.citizenId);
  const verified=Boolean(text(record?.verifiedAt));
  const missingSources=['vnedu','moet'].filter((key)=>!sourcePresence[key]);
  const hasIssue=Boolean(mismatches.length||missingMoetCitizenId);
  const missing=Boolean(missingDocs.length||missingSources.length);
  const complete=verified&&!missing&&!hasIssue;
  return {
    paperCompleted,paperTotal:docs.length,paperPercent,missingDocs,
    sourcePresence,missingSources,mismatches,missingMoetCitizenId,
    hasIssue,missing,verified,complete,
  };
}
export function buildRecordsReview(workspace={}) {
  const students=Array.isArray(workspace.students)
    ? workspace.students.filter((student)=>student?.active!==false):[];
  const records=workspace.studentRecords||{};
  const grade=workspace.classProfile?.grade;
  const entries=students.map((student)=>({
    student,
    review:inspectStudentRecord(records[student.id]||{},grade),
  }));
  const count=(pred)=>entries.filter((entry)=>pred(entry.review)).length;
  return {
    total:entries.length,
    complete:count((r)=>r.complete),
    needs:count((r)=>!r.complete),
    mismatches:count((r)=>r.hasIssue),
    missing:count((r)=>r.missing),
    verified:count((r)=>r.verified),
    paperReady:count((r)=>r.paperCompleted===r.paperTotal),
    digitalReady:count((r)=>r.sourcePresence.vnedu&&r.sourcePresence.moet),
    entries,
  };
}
export function recordsReviewFilter(entry,filter='all'){
  const review=entry.review;
  if(filter==='complete')return review.complete;
  if(filter==='missing')return review.missing||!review.verified;
  if(filter==='issues')return review.hasIssue;
  if(filter==='verified')return review.verified;
  return true;
}
