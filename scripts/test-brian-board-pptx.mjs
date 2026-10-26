import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,normalizeLesson,sanitizeStudentPage} from '../src/components/BrianBoard/boardModel.js';
import {validatePptxFile,MAX_BOARD_PPTX_SLIDES,importedPptxPageIndices} from '../src/components/BrianBoard/boardPptx.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(MAX_BOARD_PPTX_SLIDES,20);
assert.match(validatePptxFile({name:'danger.ppt',size:1200},1),/\.pptx/);
assert.match(validatePptxFile({name:'large.pptx',size:20_000_000},1),/12 MB/);
assert.equal(validatePptxFile({name:'class.pptx',size:2000},1),'');
const lesson=newLesson('my-teacher');
const page={...lesson.pages[0],pptxSource:true,objects:[
 {id:'title',kind:'text',text:'Editable slide',x:12,y:40,fontSize:36,fontWeight:'700',pptxEditable:true,studentVisible:true},
 {id:'img',kind:'image',src:'data:image/png;base64,iVBORw0KGgo=',x:20,y:80,width:120,height:90,studentVisible:true}
]};
const loaded=normalizeLesson({...lesson,pages:[page]},'my-teacher');
assert.equal(loaded.pages[0].pptxSource,true,'PPTX identity must survive IndexedDB');
assert.deepEqual(importedPptxPageIndices(loaded),[0]);
assert.equal(sanitizeStudentPage(page).objects[0].fontWeight,'700');
assert.equal(normalizeLesson({...lesson,ownerId:'attacker',pages:[page]},'my-teacher').pages[0].pptxSource,undefined);
const board=read('src/components/BrianBoard/BrianBoard.jsx');
const editor=read('src/components/BrianBoard/BoardPptxStudio.jsx');
const canvas=read('src/components/BrianBoard/BoardCanvas.jsx');
const importer=read('src/components/BrianBoard/boardPptx.js');
assert.match(board,/importBoardPptx/);assert.match(board,/onPresent=\{startPresentation\}/);
assert.match(board,/onEdit=\{changePptxText\}/);assert.match(board,/addPptxSlides/);
assert.match(canvas,/fontWeight=\{o.fontWeight\|\|'550'\}/);
assert.match(editor,/onEdit\(o.id/);assert.match(editor,/onDelete\(o.id\)/);
assert.doesNotMatch(importer,/eval\(|new Function|fetch\(|supabase\./);
assert.match(importer,/MAX_ZIP_FILES/);assert.match(importer,/MAX_IMAGE_BYTES/);
assert.match(importer,/report\.skipped\+\+/);
console.log('PASS Board PowerPoint: owner-scoped editable slides, safe private import limits, TV payload and inspector integration.');
