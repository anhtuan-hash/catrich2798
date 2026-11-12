import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LESSON_KITS,RUBRIC,STEPS,emptyStudio,normalizeStudio,documentFromStudio,submissionMissing,scoreRubric,buildProgressCsv} from '../src/features/immersive-gallery/v3/museumData.js';
import {normalizeGuestDraft} from '../src/features/immersive-gallery/creatorPassPolicy.js';

test('new student workflow has exactly five coherent STEAM steps',()=>{
 assert.deepEqual(STEPS.map(s=>s.key),['understand','plan','create','test','submit']);
 assert.equal(LESSON_KITS.length,3);
 assert.ok(LESSON_KITS.some(k=>k.id==='climate'));
});
test('auto-layout yields three readable text exhibits without exposed geometric controls',()=>{
 const d=emptyStudio();
 d.title='Climate Action Museum';
 d.learning={issue:'Air pollution is a problem.',audience:'Families',evidence:'Our observation records plastic waste.',source:'School scenario data',solution:'We propose recycling.',feedback:'Visitors wanted shorter sentences.',improvement:'We shortened each label.',reflection:'We improved our English.',tested:true};
 const rendered=documentFromStudio(d);
 assert.equal(rendered.rooms.length,1);
 assert.deepEqual(rendered.rooms[0].exhibits.map(e=>e.title),['The Problem','The Evidence','Our Solution']);
 assert.deepEqual(rendered.rooms[0].exhibits.map(e=>e.transform.position[0]),[-3,0,3]);
 assert.deepEqual(submissionMissing(d),[]);
 assert.equal(normalizeGuestDraft(rendered).learning.feedback,d.learning.feedback);
 assert.equal(normalizeGuestDraft(rendered).learning.tested,true);
});
test('evidence is not invented and missing requirements are called out',()=>{
 const blank=emptyStudio(), missing=submissionMissing(blank);
 assert.ok(missing.length>=6);
 assert.ok(missing.some(x=>x.includes('nguồn')));
});
test('legacy documents are preserved until explicit conversion',()=>{
 const d=normalizeStudio({title:'Old',rooms:[{template_key:'classic',exhibits:[{description:'existing'}]},{template_key:'lab',exhibits:[]}]});
 assert.equal(d.legacy,true);
 assert.equal(d.legacyOriginal.rooms.length,2);
});
test('rubric totals enforce all five maximum scores',()=>{
 assert.equal(RUBRIC.reduce((n,c)=>n+c.max,0),100);
 assert.equal(scoreRubric({english:40,evidence:20,reasoning:15,design:15,revision:10}),100);
 assert.throws(()=>scoreRubric({english:999}),/Điểm rubric/);
});
test('CSV exports escape formula injection and use real submitted data only',()=>{
 const data={assignments:[{id:'abc',title:'=HYPERLINK("unsafe")',class_scope:'11A3'}],groups:[{assignment_id:'abc',id:'g1',label:'Group A',state:'submitted'}],reviews:[{group_id:'g1',version:1}]};
 const csv=buildProgressCsv(data);
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/Group A/);
 assert.match(csv,/Đã nộp/);
});
test('Brian Gallery routes are replaced but legacy source is preserved',()=>{
 const app=fs.readFileSync('src/pages/ToolPage.jsx','utf8');
 const route=fs.readFileSync('src/main.jsx','utf8');
 const home=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabApp.jsx','utf8');
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 assert.match(app,/v3\/MuseumLabApp/);
 assert.match(route,/v3\/MuseumLabStudent/);
 assert.match(home,/MuseumDashboard/);
 assert.match(home,/MuseumEvidence/);
 assert.match(student,/guestRequest\('submit'/);
 assert.match(student,/guestRequest\('save'/);
 assert.doesNotMatch(student,/auth\.signUp|auth\.admin\.createUser|signInAnonymously/);
 assert.doesNotMatch(student,/(?:Trục X|Vị trí XYZ|model_key.*onChange)/);
 assert.ok(fs.existsSync('src/features/immersive-gallery/GalleryApp.jsx'));
});
test('teacher rubric endpoint is scoped and no public RLS table privileges',()=>{
 const api=fs.readFileSync('serverless-handlers/gallery-staff.js','utf8');
 const sql=fs.readFileSync('supabase/migrations/20261112190000_museum_lab_v3_rubric_scores.sql','utf8');
 assert.match(api,/if\(operation==='grade-rubric'\)/);
 assert.match(api,/scoped\.assignment\.created_by!==ctx\.user\.id/);
 assert.match(api,/Object\.keys\(ceilings\)/);
 assert.match(sql,/revoke all on public\.gcp_rubric_scores from public,anon,authenticated/);
 assert.match(sql,/alter table public\.gcp_rubric_scores enable row level security/);
});
test('Material 3 redesign has scoped accessible UI and curated exhibitions',()=>{
 const css=fs.readFileSync('src/features/immersive-gallery/v3/museumLab.css','utf8');
 const dashboard=fs.readFileSync('src/features/immersive-gallery/v3/MuseumDashboard.jsx','utf8');
 const sample=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExplore.jsx','utf8');
 assert.match(css,/#0b57d0/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/:focus-visible/);
 assert.match(dashboard,/data-testid="museum-dashboard"/);
 assert.match(sample,/museum-collection-/);
 assert.doesNotMatch(sample,/>DEMO · SAMPLE</);
});
