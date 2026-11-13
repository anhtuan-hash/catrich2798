import {submissionMissing,documentFromStudio} from './museumData.js';
import {evidenceMissing} from './learningEvidence.js';
import {canSubmitMuseumProject} from './museumSubmissionPolicy.js';

// Mirrors draft/content checks enforced by gallery-guest, but never claims to
// certify peer-review events, group authorization or image ownership client-side.
const imageNames={issue:'The Problem',evidence:'The Evidence',solution:'Our Solution'};
export function submissionReadiness(studio,live){
 const doc=documentFromStudio(studio||{});
 const missing=submissionMissing(studio||{},'en');
 const frozen=Boolean(doc.survey);
 if(live&&live.status!=='not_started'&&frozen)missing.push(...evidenceMissing(doc));
 const details=[...new Set(missing)].map(item=>{
  const match=/^(issue|evidence|solution): (alt|source|rights)$/.exec(item);
  return match?{code:item,text:`${imageNames[match[1]]}: ${{
   alt:'add an English image description',
   source:'name the actual image creator or source',
   rights:'confirm permission to use the image'
  }[match[2]]}`,type:'image',field:match[2]}:
  {code:item,text:item,type:'learning',field:null};
 });
 const missingImageSources=details.filter(x=>x.field==='source').length;
 return {ready:details.length===0&&canSubmitMuseumProject(live),
  missing:details,missingImageSources,
  allowedByLesson:canSubmitMuseumProject(live),
  checkedCount:details.length,
  // Do not treat an application percentage as a reviewer decision or grade.
  stateLabel:details.length?details.length+' requirement'+(details.length===1?'':'s')+' to complete':'Draft checks complete'};
}
export function submissionWindowMessage(live){
 if(canSubmitMuseumProject(live))return '';
 if(live?.status==='paused')return 'Teacher Live is paused. Ask your teacher to resume or end the lesson.';
 return 'Submission opens during Activity 11 (Exit Ticket) or after the teacher ends the lesson.';
}
