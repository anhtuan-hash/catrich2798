import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {submissionReadiness,submissionWindowMessage} from '../src/features/immersive-gallery/v3/museumSubmissionReadiness.js';
import {documentFromStudio,submissionMissing} from '../src/features/immersive-gallery/v3/museumData.js';
import {evidenceMissing} from '../src/features/immersive-gallery/v3/learningEvidence.js';
import {canSubmitMuseumProject} from '../src/features/immersive-gallery/v3/museumSubmissionPolicy.js';

const read=p=>fs.readFileSync(p,'utf8');
const snapshot={id:'survey-example-01',session_id:'lesson-example-01',counts:[1,2,3,4],source:'online',created_at:'2026-11-13T10:00:00Z'};
const draft={
 title:'Lights Off, Future On',summary:'One realistic school climate action.',
 learning:{
  issue:'An empty classroom sometimes has unused lights switched on.',
  evidence:'Some class groups selected reducing unnecessary lights.',
  source:'Our class group-priority vote, source named separately.',
  solution:'A teacher-approved class monitor checks unused lights.',
  feedback:'Classmates recommended explaining the exceptions for safety.',
  improvement:'We included a clear safety exception.',reflection:'We improved our English explanations.',
  roles:'Editor, evidence checker, designer and presenter.',
  feasibility:'A teacher approves the list of switches and monitors.',
  tested:true
 },
 survey:snapshot,
 artworks:{
  issue:'c78d4bba-2808-4efe-9ac7-f904bc3b1001',
  evidence:'c78d4bba-2808-4efe-9ac7-f904bc3b1002',
  solution:'c78d4bba-2808-4efe-9ac7-f904bc3b1003'
 },
 artMeta:Object.fromEntries(['issue','evidence','solution'].map(k=>[k,{
  alt:'Student caption describing '+k,
  rights:'Teacher-approved classroom usage rights.',
  source:''
 }]))
};
const live={status:'active',stageIndex:10,stageOpen:true};
test('all nine required draft text fields can be 100% while three uploaded images still lack source attributions',()=>{
 assert.deepEqual(submissionMissing(draft,'en'),[]);
 const document=documentFromStudio(draft);
 assert.ok(evidenceMissing(document).includes('issue: source'));
 assert.ok(evidenceMissing(document).includes('evidence: source'));
 assert.ok(evidenceMissing(document).includes('solution: source'));
 const r=submissionReadiness(draft,live);
 assert.equal(r.missingImageSources,3);
 assert.equal(r.ready,false);
 assert.deepEqual(r.missing.map(x=>x.text),[
  'The Problem: name the actual image creator or source',
  'The Evidence: name the actual image creator or source',
  'Our Solution: name the actual image creator or source'
 ]);
 assert.equal(r.allowedByLesson,true);
});
test('adding truthful provenance for each image clears source blockers without rewriting artwork, captions or group survey',()=>{
 const next=structuredClone(draft);
 for(const meta of Object.values(next.artMeta))meta.source='Creator named by the group (example only)';
 const oldIds=Object.values(draft.artworks);
 const r=submissionReadiness(next,live);
 assert.equal(r.ready,true);
 assert.deepEqual(r.missing,[]);
 assert.deepEqual(Object.values(next.artworks),oldIds);
 assert.equal(next.survey.id,snapshot.id);
 assert.equal(draft.artMeta.issue.source,'');
});
test('submission window is independent of Exit Ticket response and draft progress',()=>{
 assert.equal(canSubmitMuseumProject(live),true);
 assert.equal(submissionWindowMessage(live),'');
 assert.equal(submissionReadiness(draft,{status:'active',stageIndex:9,stageOpen:true}).allowedByLesson,false);
 assert.match(submissionWindowMessage({status:'active',stageIndex:9,stageOpen:true}),/Activity 11/);
 assert.match(submissionWindowMessage({status:'paused',stageIndex:10,stageOpen:false}),/paused/);
 assert.equal(submissionReadiness({...draft,artMeta:structuredClone(draft.artMeta)},{status:'ended',stageIndex:10,stageOpen:false}).allowedByLesson,true);
});
test('visible submission controls and image fix shortcut are reachable from the student workspace',()=>{
 const component=read('src/features/immersive-gallery/v3/MuseumLabStudent.jsx');
 const artwork=read('src/features/immersive-gallery/v3/MuseumArtworkStudio.jsx');
 const css=read('src/features/immersive-gallery/v3/museumSubmissionFix.css');
 assert.match(component,/data-testid="museum-submit-shortcut"/);
 assert.match(component,/onClick=\{openSubmitReview\}/);
 assert.match(component,/data-testid="museum-submission-checks"/);
 assert.match(component,/Add missing image sources/);
 assert.match(component,/setStep\(2\)/);
 assert.match(component,/setArtworkOpen\(true\)/);
 assert.match(artwork,/Image source is missing/);
 assert.match(artwork,/Do not invent a source/);
 assert.match(css,/overflow-y:auto/);
});
test('server submission authorization, group matching and originality rules remain enforced',()=>{
 const backend=read('serverless-handlers/gallery-guest.js');
 assert.match(backend,/operation==='submit'/);
 assert.match(backend,/guestContext\(req,admin,\{write:true\}\)/);
 assert.match(backend,/canSubmitMuseumProject\(live\)/);
 assert.match(backend,/evidenceMissing\(doc\)/);
 assert.match(backend,/changedExhibits\(before\.doc,after\.doc\)/);
 assert.match(backend,/gcp_guest_submit/);
});
