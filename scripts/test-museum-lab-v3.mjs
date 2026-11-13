import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LESSON_KITS,RUBRIC,STEPS,emptyStudio,normalizeStudio,documentFromStudio,submissionMissing,scoreRubric,buildProgressCsv} from '../src/features/immersive-gallery/v3/museumData.js';
import {normalizeGuestDraft} from '../src/features/immersive-gallery/creatorPassPolicy.js';
import {canSaveMuseumDraft,canSubmitMuseumProject} from '../src/features/immersive-gallery/v3/museumSubmissionPolicy.js';
import {buildStudentMuseumPreview} from '../src/features/immersive-gallery/v3/museumPreviewImages.js';

test('new student workflow has exactly five coherent STEAM steps',()=>{
 assert.deepEqual(STEPS.map(s=>s.key),['understand','plan','create','test','submit']);
 assert.equal(LESSON_KITS.length,1);
 assert.equal(LESSON_KITS[0].id,'climate');
 assert.equal(LESSON_KITS[0].title,'Our Climate Action Museum');
 assert.match(LESSON_KITS[0].subtitle,/Unit 5: Global Warming/);
 assert.match(LESSON_KITS[0].challenge,/everyday activities on global warming/);
 assert.match(LESSON_KITS[0].brief,/group-priority choice/);
 assert.match(LESSON_KITS[0].brief,/25–40 words/);
 assert.match(LESSON_KITS[0].brief,/peer feedback|feedback/);
 assert.doesNotMatch(LESSON_KITS.map(x=>x.title).join(' '),/Protecting Marine Life|Sustainable School/);
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

test('ended Teacher Live leaves a valid museum assignment writable',()=>{
 assert.equal(canSaveMuseumDraft(null),true);
 assert.equal(canSaveMuseumDraft({status:'not_started'}),true);
 assert.equal(canSaveMuseumDraft({status:'active'}),true);
 assert.equal(canSaveMuseumDraft({status:'ended'}),true);
 assert.equal(canSaveMuseumDraft({status:'paused'}),false);
 assert.equal(canSubmitMuseumProject(null),true);
 assert.equal(canSubmitMuseumProject({status:'active',stage_index:10,stage_open:true}),true);
 assert.equal(canSubmitMuseumProject({status:'active',stage_index:10,stage_open:false}),false);
 assert.equal(canSubmitMuseumProject({status:'active',stage_index:9,stage_open:true}),false);
 assert.equal(canSubmitMuseumProject({status:'ended',stage_index:10,stage_open:false}),true);
 assert.equal(canSubmitMuseumProject({status:'ended',stageIndex:10,stageOpen:false}),true);
 assert.equal(canSubmitMuseumProject({status:'paused',stage_index:10,stage_open:true}),false);
 const backend=fs.readFileSync('serverless-handlers/gallery-guest.js','utf8');
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 assert.match(backend,/canSaveMuseumDraft\(live\)/);
 assert.match(backend,/canSubmitMuseumProject\(live\)/);
 assert.match(student,/canSubmitMuseumProject\(liveInfo\)/);
 assert.match(student,/Lesson completed/);
 assert.match(backend,/guestContext\(req,admin,\{write:true\}\)/);
 const artwork=fs.readFileSync('serverless-handlers/museum-artwork.js','utf8');
 assert.match(artwork,/!canSaveMuseumDraft\(live\)/);
});
test('Exit Tickets and museum submissions are counted separately',()=>{
 const api=fs.readFileSync('serverless-handlers/gallery-staff.js','utf8');
 const lessons=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLessonFlow.jsx','utf8');
 const liveStudent=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLiveStudent.jsx','utf8');
 assert.match(api,/from\('museum_live_responses'\)/);
 assert.match(api,/eq\('stage_index',10\)/);
 assert.match(api,/assignments,groups,reviews,exitTickets/);
 assert.match(lessons,/Exit Tickets: /);
 assert.match(lessons,/ticket\.value/);
 assert.match(liveStudent,/student-live-completed/);
 assert.match(liveStudent,/Your group Exit Ticket was recorded/);
});

test('Museum Lab hides date and clock metadata on every student and teacher screen',()=>{
 const read=name=>fs.readFileSync('src/features/immersive-gallery/v3/'+name,'utf8');
 const dashboard=read('MuseumDashboard.jsx'), review=read('MuseumReview.jsx');
 const lessons=read('MuseumLessonFlow.jsx'), student=read('MuseumLabStudent.jsx');
 const liveStudent=read('MuseumLiveStudent.jsx'),liveTeacher=read('MuseumLiveTeacher.jsx');
 const exhibition=read('MuseumExhibitionDetail.jsx');
 assert.doesNotMatch(dashboard,/fmtDate\(|a\.deadline_at/);
 assert.doesNotMatch(review,/fmtDate\(|fmtTime\(|r\.submitted_at|selected\.submitted_at/);
 assert.doesNotMatch(lessons,/fmtDate\(|fmtTime\(|datetime-local|form\.deadlineAt/);
 assert.match(lessons,/accessWindow/);
 assert.match(lessons,/deadlineForWindow/);
 assert.match(lessons,/deadlineAt:deadlineForWindow/);
 assert.doesNotMatch(student,/fmtTime\(|new Date\(c\.createdAt\)|session\.assignment\.deadline_at/);
 assert.match(student,/Version.*c\.version/);
 assert.doesNotMatch(liveStudent,/new Date\(r\.created_at\)/);
 assert.doesNotMatch(liveTeacher,/\{state\.survey\.created_at\}/);
 assert.doesNotMatch(exhibition,/dateLabel|toLocaleDateString/);
 // State/audit timestamps are intentionally retained by the backend and exports.
 const server=fs.readFileSync('serverless-handlers/gallery-guest.js','utf8');
 assert.match(server,/assignment\.deadline_at/);
});

test('Admin can safely archive and restore both prepared and database exhibitions',()=>{
 const server=fs.readFileSync('serverless-handlers/gallery-staff.js','utf8');
 const gallery=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExplore.jsx','utf8');
 const app=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabApp.jsx','utf8');
 const detail=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExhibitionDetail.jsx','utf8');
 const data=fs.readFileSync('src/features/immersive-gallery/galleryData.js','utf8');
 const css=fs.readFileSync('src/features/immersive-gallery/v3/museumLab.css','utf8');
 const migration=fs.readFileSync('supabase/migrations/20261113164000_museum_showcase_safe_archive.sql','utf8');
 assert.match(server,/operation==='archive-exhibition'/);
 assert.match(server,/operation==='restore-exhibition'/);
 assert.match(server,/guardOrigin\(req\);assertAdmin\(ctx\)/);
 assert.match(server,/gallery\.school_scope!==ctx\.profile\.school/);
 assert.match(server,/PREPARED_COLLECTIONS\.some/);
 assert.match(server,/museum_showcase_change/);
 assert.match(server,/operation==='showcase-state'/);
 assert.match(gallery,/data-testid="museum-archived-exhibitions"/);
 assert.match(gallery,/Delete exhibition:/);
 assert.match(gallery,/Restore exhibition/);
 assert.match(gallery,/onClick=\{\(\)=>changeArchive\('collection'/);
 assert.match(gallery,/onClick=\{\(\)=>changeArchive\('gallery'/);
 assert.match(gallery,/archive\.hiddenCollections\.includes\(key\)/);
 assert.match(app,/onRefresh=\{refresh\}/);
 assert.match(detail,/onDelete\?\</);
 assert.match(data,/neq\('status','archived'\)/);
 assert.match(data,/exhibit\.status==='archived'/);
 assert.match(css,/bml-exhibition-delete/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/from public, anon, authenticated/);
 assert.match(migration,/security invoker/);
 assert.match(migration,/to service_role/);
 assert.match(migration,/school_scope=p_school/);
 assert.match(migration,/status='archived'/);
 assert.doesNotMatch(server,/from\('gcp_reviews'\)\.delete\(/);
});

test('Student Creator displays an official competition ribbon with both supplied crests',()=>{
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 const ribbon=fs.readFileSync('src/features/immersive-gallery/v3/MuseumCompetitionRibbon.jsx','utf8');
 const css=fs.readFileSync('src/features/immersive-gallery/v3/museumCompetitionRibbon.css','utf8');
 assert.match(student,/import MuseumCompetitionRibbon/);
 assert.match(student,/<MuseumCompetitionRibbon\/>/);
 assert.match(ribbon,/lang="vi"/);
 for(const label of ['BÀI DỰ THI','HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM\/STEAM','NĂM HỌC 2026–2027','Chủ đề dạy học số – Môn Tiếng Anh THPT','Thạc sĩ Nguyễn Anh Tuấn','Trường Trung - Tiểu học Pétrus Ký']){
  assert.ok(ribbon.includes(label),'Missing competition text: '+label);
 }
 const officialDepartment=fs.readFileSync('public/museum/branding/hcmc-department-education-original.jpg');
 const officialSchool=fs.readFileSync('public/museum/branding/petrus-ky-original.png');
 assert.equal(officialDepartment.length,38788,'Department logo must be the exact supplied JPG');
 assert.equal(officialSchool.length,1055354,'School logo must be the exact supplied transparent PNG');
 assert.equal(officialDepartment.subarray(0,3).toString('hex'),'ffd8ff');
 assert.equal(officialSchool.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.match(ribbon,/hcmc-department-education-original\.jpg/);
 assert.match(ribbon,/petrus-ky-original\.png/);
 assert.doesNotMatch(ribbon,/BookOpen|Globe2|bml-competition-accent/);
 assert.match(css,/overflow:visible/);
 assert.match(css,/height:auto/);
 assert.match(css,/max-height:800px/);
 assert.match(css,/max-width:560px/);
 assert.match(css,/bml-student-canvas16/);
});

test('private Student Creator 2D/3D preview resolves exactly the group uploaded images by slot',()=>{
 const d=emptyStudio();
 d.title='Lights Off, Future On';
 d.artworks={issue:'aaa00000-0000-4000-8000-000000000001',evidence:'aaa00000-0000-4000-8000-000000000002',solution:'aaa00000-0000-4000-8000-000000000003'};
 d.artMeta={issue:{alt:'Classroom photo by group'},evidence:{alt:'Survey image'},solution:{alt:'Light switch photo'}};
 const assets=[
  {id:'aaa00000-0000-4000-8000-000000000001',image_url:'https://private.invalid/one.png?signature=qa',original_name:'room.png'},
  {id:'aaa00000-0000-4000-8000-000000000002',image_url:'https://private.invalid/two.png?signature=qa',original_name:'chart.png'},
  {id:'aaa00000-0000-4000-8000-000000000003',image_url:'https://private.invalid/three.png?signature=qa',original_name:'switch.png'}
 ];
 const x=buildStudentMuseumPreview(d,assets);
 assert.equal(x.rooms.length,1);
 assert.equal(x.rooms[0].exhibits.length,3);
 assert.deepEqual(x.rooms[0].exhibits.map(e=>e.image_url),assets.map(a=>a.image_url));
 assert.ok(x.rooms[0].exhibits.every(e=>e.kind==='image'));
 assert.equal(x.rooms[0].exhibits[0].alt_text,'Classroom photo by group');
 assert.equal(x.rooms[0].exhibits[2].image_original_name,'switch.png');
 const missing=buildStudentMuseumPreview(d,[assets[0]]);
 assert.equal(missing.rooms[0].exhibits[1].image_url,'');
 assert.equal(missing.rooms[0].exhibits[2].image_url,'');
 assert.equal(missing.rooms[0].exhibits[1].asset_id,'aaa00000-0000-4000-8000-000000000002');
 assert.ok(!JSON.stringify(missing).includes('unsplash.com'));
 assert.ok(!JSON.stringify(missing).includes('pexels.com'));
 // A stale exhibit asset_id takes precedence over slot id to avoid substituting
 // an unrelated image. No image is displayed until a matching private asset is signed.
 d.rooms=[{title:'Legacy preview room',exhibits:[
  {title:'The Problem',description:'Legacy',asset_id:'historical-image'},
  {title:'The Evidence',description:'Legacy'},
  {title:'Our Solution',description:'Legacy'}
 ]}];
 const noSubstitution=buildStudentMuseumPreview(d,assets);
 assert.equal(noSubstitution.rooms[0].exhibits[0].image_url,'');
});
test('Paper 2D exhibition uses real image URLs and cannot fabricate stock evidence',()=>{
 const scene=fs.readFileSync('src/features/immersive-gallery/v3/MuseumScene.jsx','utf8');
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 const styles=fs.readFileSync('src/features/immersive-gallery/v3/museumPaper2D.css','utf8');
 assert.match(scene,/museum-2d-exhibits/);
 assert.match(scene,/exhibit\?\.image_url/);
 assert.match(scene,/onError=\{\(\)=>setFailed\(true\)\}/);
 assert.match(scene,/No group image uploaded/);
 assert.match(student,/buildStudentMuseumPreview\(studio,artAssets\)/);
 assert.match(student,/artGuest\('list'\)/);
 assert.match(student,/55000/);
 assert.match(styles,/bml-paper-art-card/);
 assert.match(styles,/bml-museum-preview-window/);
});

test('published school exhibitions stay visible when browser catalogue reads fail',()=>{
 const server=fs.readFileSync('serverless-handlers/gallery-staff.js','utf8');
 const gallery=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExplore.jsx','utf8');
 const app=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabApp.jsx','utf8');
 assert.match(server,/operation==='showcase-state'/);
 assert.match(server,/galleryEnabled,publishedGalleries/);
 assert.match(server,/\.eq\('school_scope',ctx\.profile\.school\)\.eq\('status','published'\)/);
 assert.match(server,/\.in\('visibility',\['school','public'\]\)/);
 assert.match(server,/Date\.parse\(g\.starts_at\)/);
 assert.match(server,/Date\.parse\(g\.ends_at\)/);
 assert.match(gallery,/Array\.isArray\(archive\.publishedGalleries\)/);
 assert.match(gallery,/directError&&!published\.length/);
 assert.match(gallery,/new Map\(\)/);
 assert.match(gallery,/item\.status!=='archived'/);
 assert.match(app,/if\(id==='gallery'&&id!==tab\)setQuery\(''\)/);
});

test('published exhibits hydrate their original private images before 2D/3D viewing',()=>{
 const galleryData=fs.readFileSync('src/features/immersive-gallery/galleryData.js','utf8');
 assert.match(galleryData,/exhibits\.filter\(e=>e\.kind==='image'&&e\.asset_id\)/);
 assert.match(galleryData,/Promise\.allSettled\(imageIds\.map\(id=>getGalleryAssetUrl\(id\)\)\)/);
 assert.match(galleryData,/image_url:e\.kind==='image'\?/);
 assert.match(galleryData,/imageUrls\.get\(e\.asset_id\)/);
 assert.match(galleryData,/createSignedUrl\(row\.path,120\)/);
});

test('published exhibition catalogue remains dashboard-backed and private posters are served only to authorized school staff',()=>{
 const staff=fs.readFileSync('serverless-handlers/gallery-staff.js','utf8');
 const gallery=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExplore.jsx','utf8');
 const app=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabApp.jsx','utf8');
 assert.match(staff,/async function publishedSchoolCatalog\(ctx\)/);
 assert.match(staff,/\.eq\('school_scope',ctx\.profile\.school\)\.eq\('status','published'\)/);
 assert.match(staff,/\.in\('visibility',\['school','public'\]\)/);
 assert.match(staff,/publishedGalleries:await publishedSchoolCatalog\(ctx\)/);
 assert.match(staff,/operation==='showcase-exhibition'/);
 assert.match(staff,/guardOrigin\(req\)/);
 assert.match(staff,/eligible\.some\(g=>g\.id===id\)/);
 assert.match(staff,/\.eq\('status','published'\)\.order\('created_at'\)/);
 assert.match(staff,/\.createSignedUrl\(asset\.path,600\)/);
 assert.match(gallery,/data\?\.publishedGalleries/);
 assert.match(gallery,/const inventory=new Map\(\)/);
 assert.match(gallery,/transport\('showcase-exhibition',\{id:item\.id\}\)/);
 assert.match(gallery,/museum-showcase-published-count/);
 assert.match(gallery,/museum-published-panel/);
 assert.match(gallery,/publishedInView\.map\(g=>/);
 const paper=fs.readFileSync('src/features/immersive-gallery/v3/museumPaper.css','utf8');
 assert.match(paper,/\.bml-published-panel/);
 assert.match(paper,/\.bml-published-entry/);
 assert.match(app,/onRefresh=\{refresh\} transport=\{transport\}/);
});

test('teacher gallery uses the same 2D/3D cinema component as student preview',()=>{
 const teacher=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExhibitionDetail.jsx','utf8');
 const gallery=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExplore.jsx','utf8');
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 const css=fs.readFileSync('src/features/immersive-gallery/v3/museumExhibition.css','utf8');
 assert.match(teacher,/import \{createPortal\} from 'react-dom'/);
 assert.match(teacher,/startInCinema=false/);
 assert.match(teacher,/useState\(Boolean\(startInCinema\)\)/);
 assert.match(teacher,/createPortal\(/);
 assert.match(teacher,/cinema initial3D/);
 assert.match(teacher,/onClose=\{closeCinema\}/);
 assert.match(teacher,/enterCinemaRef\.current\?\.focus/);
 assert.match(gallery,/language=\{language\} startInCinema/);
 assert.match(student,/embedded cinema initial3D gallery=\{previewGallery\}/);
 assert.match(css,/\.bml\.bml-teacher-cinema-portal/);
 assert.match(css,/z-index:9999/);
});

test('student creator login reuses official dashboard competition ribbon without changing redemption form',()=>{
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 const entryCss=fs.readFileSync('src/features/immersive-gallery/v3/museumStudentEditorial.css','utf8');
 assert.match(student,/if\(!session\)return/);
 assert.match(student,/museum-login-competition-banner/);
 assert.match(student,/<MuseumCompetitionRibbon variant="dashboard"\/>/);
 assert.match(student,/<GuestEntry onRedeem=\{redeem\} busy=\{busy\} error=\{error\} language=\{language\}\/>/);
 assert.match(student,/import '\.\/museumDashboardBanner\.css'/);
 assert.match(entryCss,/\.bml\.bml-student-shell\.bml-student-editorial\.bml-student-login-with-ribbon/);
 assert.match(entryCss,/\.bml-guest-competition-wrap/);
});

test('student voice guidance is deterministic for 11 open activities and five project steps',async()=>{
 const {studentNarrationCue,PROJECT_STEP_NARRATIONS}=await import('../src/features/immersive-gallery/v3/museumStudentNarration.js');
 const {VOICEOVER_SCRIPTS}=await import('../src/features/immersive-gallery/v3/museumLiveExtensions.js');
 const activities=Object.keys(VOICEOVER_SCRIPTS);
 assert.equal(activities.length,11);
 assert.equal(PROJECT_STEP_NARRATIONS.length,5);
 for(let i=0;i<11;i++){
  const stage={id:activities[i],title:'Activity '+(i+1),kind:'recap',sentence:''};
  const liveInfo={id:'lesson-1',status:'active',stageOpen:true,stageIndex:i,stage};
  const cue=studentNarrationCue({liveInfo,step:0,ready:true});
  assert.equal(cue.key,'live:lesson-1:'+i+':'+activities[i]);
  assert.equal(cue.text,VOICEOVER_SCRIPTS[activities[i]]);
  assert.equal(studentNarrationCue({liveInfo:{...liveInfo,stageOpen:false},step:0}),null);
  assert.equal(studentNarrationCue({liveInfo,step:0,ready:false}),null);
 }
 for(let i=0;i<5;i++){
  const cue=studentNarrationCue({liveInfo:{status:'not_started'},step:i});
  assert.equal(cue.key,'project:'+i);
  assert.equal(cue.text,PROJECT_STEP_NARRATIONS[i]);
  assert.ok(cue.text.length>100);
 }
 assert.equal(new Set(PROJECT_STEP_NARRATIONS).size,5);
 assert.equal(studentNarrationCue({liveInfo:{status:'active',stageOpen:false},step:0}),null);
 const component=fs.readFileSync('src/features/immersive-gallery/v3/MuseumStudentVoiceGuide.jsx','utf8');
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 assert.match(component,/rankAmericanVoices/);
 assert.match(component,/item.lang='en-US'/);
 assert.match(component,/data-testid="student-auto-voice"/);
 assert.match(component,/localStorage.setItem/);
 assert.match(component,/lastCue.current===cueKey/);
 assert.match(component,/Replay activity guidance/);
 assert.match(student,/<MuseumStudentVoiceGuide cue=\{narrationCue\}\/>/);
 assert.match(student,/setLiveReady\(true\)/);
});
