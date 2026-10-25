import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,normalizeLesson,sanitizeStudentPage} from '../src/components/BrianBoard/boardModel.js';
import {createBoardActivity,normalizeBoardActivities,gradeBoardActivity,publicBoardActivity,shuffleBoardItems}
 from '../src/components/BrianBoard/boardActivities.js';
import {validateBoardPdfHeader,canImportPdf,MAX_BOARD_PDF_PAGES,buildStudentPdfSlides} from '../src/components/BrianBoard/boardPdf.js';
const read=name=>readFileSync(new URL('../src/components/BrianBoard/'+name,import.meta.url),'utf8');
assert.equal(MAX_BOARD_PDF_PAGES,12);
assert.equal(validateBoardPdfHeader(new Uint8Array([37,80,68,70,45,49])),true);
assert.equal(validateBoardPdfHeader(new Uint8Array([80,78,71,49,50])),false);
assert.equal(canImportPdf({fileBytes:5000,pages:12,currentPages:68}),'');
assert.match(canImportPdf({fileBytes:5000,pages:13,currentPages:1}),/12/);
assert.match(canImportPdf({fileBytes:5000,pages:4,currentPages:78}),/80/);
assert.match(canImportPdf({fileBytes:16000000,pages:2,currentPages:1}),/15/);
const matching=createBoardActivity({type:'matching',title:'Global warming',prompt:'Match.',
 raw:'renewable | renewable energy\nemissions | gases\nwildlife | animals'});
assert.equal(matching.items.length,3);
assert.equal(matching.studentVisible,true);
assert.equal(publicBoardActivity({...matching,studentVisible:false}),null);
assert.equal(publicBoardActivity({...matching,teacherOnly:true}),null);
assert.deepEqual(gradeBoardActivity(matching,['renewable energy','gases','animals']),{correct:3,total:3,complete:true});
assert.deepEqual(gradeBoardActivity(matching,['animals','gases','renewable energy']).correct,1);
const publicMatching=publicBoardActivity(matching);
assert.ok(!publicMatching.items);
assert.ok(!JSON.stringify(publicMatching).includes('id":"i0'));
assert.deepEqual(publicMatching.options,['animals','gases','renewable energy']);
assert.throws(()=>createBoardActivity({type:'matching',raw:'a | x\nb | x'}),/unique/);
const ordering=createBoardActivity({type:'ordering',raw:'We | should | protect | Earth'});
assert.equal(ordering.items.length,4);
assert.equal(gradeBoardActivity(ordering,['i0','i1','i2','i3']).correct,4);
assert.equal(publicBoardActivity(ordering).type,'ordering');
const sorting=createBoardActivity({type:'sorting',raw:'solar | Green\ncoal | Fossil\nwind | Green'});
assert.deepEqual(publicBoardActivity(sorting).categories,['Fossil','Green']);
assert.equal(gradeBoardActivity(sorting,['Green','Fossil','Green']).correct,3);
assert.throws(()=>createBoardActivity({type:'sorting',raw:'x without separator\ny | A'}),/item \| answer/);
const lesson=newLesson('private-owner');lesson.pages[0].activities=[matching,ordering,sorting];
const {boardStudentPayload}=await import('../src/components/BrianBoard/boardPresentation.js');
const publicState=boardStudentPayload(lesson,matching.id);
assert.equal(publicState.activity.type,'matching');
assert.equal(publicState.activity.labels.length,3);
assert.equal(publicState.activity.options.length,3);
assert.ok(!publicState.activity.items,'Teacher answer mapping must never go to TV');
const privatePresentation={...lesson,pages:[{...lesson.pages[0],activities:[{...matching,studentVisible:false}]}]};
assert.equal(boardStudentPayload(privatePresentation,matching.id).activity,null,
 'Teacher-only unpublished activity must not appear on TV or preview');
const sortedState=boardStudentPayload(lesson,ordering.id);
assert.equal(sortedState.activity.labels.length,4);
assert.deepEqual(sortedState.activity.labels,publicBoardActivity(ordering).labels,
 'TV token order stays stable when the teacher writes on the page');
const sortingState=boardStudentPayload(lesson,sorting.id);
assert.deepEqual(sortingState.activity.categories,['Fossil','Green']);
const secret={...lesson,pages:[{...lesson.pages[0],activities:[{
 ...matching,teacherNotes:'TEACHER_SECRET',items:matching.items.map(x=>({...x,privateAnswer:'DO_NOT_SEND'}))
}]}]};
const tv=boardStudentPayload(secret,matching.id);
assert.equal(JSON.stringify(tv).includes('DO_NOT_SEND'),false);
assert.equal(JSON.stringify(tv).includes('TEACHER_SECRET'),false);
assert.equal(boardStudentPayload(secret,'non-existent').activity,null);
const hiddenPresentation={...lesson,pages:[{...lesson.pages[0],hidden:true}]};
assert.equal(boardStudentPayload(hiddenPresentation,matching.id).activity,null,
 'An unpublished page cannot show exercises on TV or classroom preview');

// Page-only PDF remains the default; worksheets require an explicit selection.
assert.deepEqual(buildStudentPdfSlides(lesson).map(s=>s.kind),['page']);
const handout=buildStudentPdfSlides(lesson,{includeActivities:true});
assert.deepEqual(handout.map(s=>s.kind),['page','activity','activity','activity']);
assert.deepEqual(handout[2].activity.labels,publicBoardActivity(ordering).labels,
 'Public ordering pieces are shuffled before entering the PDF plan');
assert.ok(!JSON.stringify(handout).includes('"items"'),'Private answer-mapping items must not enter PDF slides');
const secretHandout=buildStudentPdfSlides(secret,{includeActivities:true});
assert.equal(JSON.stringify(secretHandout).includes('DO_NOT_SEND'),false);
assert.equal(JSON.stringify(secretHandout).includes('TEACHER_SECRET'),false);
const limitedLesson={...lesson,pages:[
 {...lesson.pages[0],activities:[matching,{...ordering,teacherOnly:true},{...sorting,studentVisible:false}]},
 {...lesson.pages[0],id:'hidden-page',hidden:true,activities:[matching]}
]};
assert.equal(buildStudentPdfSlides(limitedLesson,{includeActivities:true}).length,2,
 'Hidden pages and teacher-only activities must be omitted');
assert.throws(()=>buildStudentPdfSlides({
 ...lesson,pages:[...Array(3)].map((_,i)=>({
 ...lesson.pages[0],id:'p'+i,activities:Array(24).fill(matching)
 }))
},{includeActivities:true}),/50 public pages/);

const restored=normalizeLesson(lesson,'private-owner');
assert.equal(restored.pages[0].activities.length,3);
assert.equal(normalizeLesson(privatePresentation,'private-owner').pages[0].activities[0].studentVisible,false,
 'Activity publishing state must persist across owner-private restores');
assert.equal(normalizeLesson({...lesson,ownerId:'wrong-owner'},'private-owner').pages[0].activities.length,0);
assert.ok(!JSON.stringify(sanitizeStudentPage(lesson.pages[0])).includes('renewable energy'),
 'Private answer mapping must never leak via regular canvas projection.');
const board=read('BrianBoard.jsx');
assert.match(board,/importBoardPdf/);assert.match(board,/exportBoardStudentPdf/);
assert.match(board,/BoardActivityStage/);assert.match(board,/onClick=\{addActivity\}/);
assert.match(board,/activeActivityId/);
const src=read('boardPdf.js');
assert.match(src,/isEvalSupported:false/);assert.match(src,/pdfjs-dist/);assert.match(src,/pdf-lib/);
assert.match(src,/sanitizeStudentPage/);assert.match(src,/publicBoardActivity/);assert.match(src,/canvas.toDataURL\('image\/jpeg'/);
assert.match(read('BoardActivityStage.jsx'),/gradeBoardActivity/);
assert.match(read('BoardActivityStage.jsx'),/is-correct/);
const viewer=readFileSync(new URL('../public/brian-board-viewer.js',import.meta.url),'utf8');
assert.match(viewer,/renderPublicActivity/);
assert.match(viewer,/textContent/);
assert.ok(!viewer.includes('innerHTML'),'Student TV must not inject editable HTML');
const boardUI=read('BrianBoard.jsx');
assert.match(boardUI,/boardStudentPayload\(lesson,activeActivityId,activityLive,currentViewport\)/);
assert.match(boardUI,/Student activity preview/);
assert.match(boardUI,/studentActivityPreview=studentActivityPayload\?\.activity\|\|null/);
assert.match(boardUI,/!studentActivityPreview/);
assert.match(boardUI,/studentActivityPreview\.options\.map/);
assert.match(boardUI,/studentActivityPreview\.categories\.map/);
assert.doesNotMatch(boardUI,/publicBoardActivity\(page\.activities/,
 'Student preview must use the same sanitized payload as television');
assert.match(boardUI,/Export PDF with answer-free worksheets/);
assert.match(boardUI,/exportStudentPdf\(true\)/);
assert.match(boardUI,/toggleActivityVisibility/);
assert.match(boardUI,/Công bố cho học sinh/);

assert.match(read('BoardActivities.css'),/prefers-reduced-motion/);
console.log('PASS Brian Board phase 2: PDF validation, private worksheet export, 3 scored activities, per-page persistence and safe projections.');
