import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,sanitizeStudentPage} from '../src/components/BrianBoard/boardModel.js';
import {buildStudentPdfSlides} from '../src/components/BrianBoard/boardPdf.js';
import {boardStudentPayload} from '../src/components/BrianBoard/boardPresentation.js';
import {createLabeledDiagramConnection,syncDiagramConnections,moveBoardObjects}
 from '../src/components/BrianBoard/boardV8Tools.js';
import {BOARD_IMAGE_FILTERS,boardImageFilterCss} from '../src/components/BrianBoard/boardImageStudio.js';
import {findPdfBackground,pdfAnnotationSummary,annotateBoardObject,annotateBoardObjects,
 pdfHighlightRegion,setPdfPaperState,clearPdfAnnotations,pdfPageIndices}
 from '../src/components/BrianBoard/boardPdfAnnotations.js';
const source=f=>readFileSync(new URL('../src/components/BrianBoard/'+f,import.meta.url),'utf8');
const lesson=newLesson('owner-test');
const paper={id:'paper-1',kind:'image',pdfBackground:true,locked:true,src:'data:image/png;base64,AAA=',
 x:100,y:120,width:1200,height:660,studentVisible:true};
const page={...lesson.pages[0],objects:[paper]};
assert.equal(findPdfBackground(page).id,'paper-1');
assert.deepEqual(pdfPageIndices({...lesson,pages:[lesson.pages[0],page]}),[1]);
assert.deepEqual(pdfAnnotationSummary(page),{hasPdf:true,paperLocked:true,paperVisible:true,
 annotationCount:0,annotationLimit:400,annotations:0});
const stroke={id:'draw-1',kind:'stroke',points:[{x:110,y:140},{x:155,y:155}],
 width:4,color:'#333333',studentVisible:true};
assert.equal(annotateBoardObject(page,stroke).pdfAnnotation,true);
assert.equal(annotateBoardObject(lesson.pages[0],stroke),stroke);
assert.equal(annotateBoardObjects(page,[stroke])[0].pdfAnnotation,true);
const highlighted=pdfHighlightRegion(page,{x:250,y:210,width:360,height:46});
assert.equal(highlighted.objects.length,2);
assert.equal(highlighted.objects[1].shape,'rect');
assert.equal(highlighted.objects[1].pdfAnnotation,true);
assert.equal(highlighted.objects[1].opacity,.42);
assert.equal(highlighted.objects[1].studentVisible,true);
assert.equal(page.objects.length,1,'Highlight must not mutate PDF input');
const paperHidden=setPdfPaperState(highlighted,'hidden',true);
assert.equal(findPdfBackground(paperHidden).hidden,true);
assert.equal(pdfAnnotationSummary(paperHidden).annotationCount,1);
assert.equal(sanitizeStudentPage(paperHidden).objects.length,1,'Student cannot see hidden source paper');
const paperUnlocked=setPdfPaperState(paperHidden,'locked',false);
assert.equal(findPdfBackground(paperUnlocked).locked,false);
const clear=clearPdfAnnotations(highlighted);
assert.equal(clear.objects.length,1);
assert.equal(clear.objects[0].id,'paper-1');
const legacy={id:'legacy-teacher-note',kind:'text',text:'Keep my old note',x:130,y:155};
const prior={...highlighted,objects:[...highlighted.objects,legacy]};
const cleaned=clearPdfAnnotations(prior);
assert.equal(cleaned.objects.length,2,'Legacy objects cannot be removed by PDF cleanup');
assert.equal(cleaned.objects[1].id,'legacy-teacher-note');
assert.equal(clearPdfAnnotations(lesson.pages[0]),lesson.pages[0]);
assert.throws(()=>pdfHighlightRegion({...page,locked:true},{x:150,y:150,width:40,height:20}),/Unlock/);
assert.throws(()=>pdfHighlightRegion(page,{x:200,y:200,width:2,height:2}),/Invalid highlight/);
const published={...page,objects:[paper,highlighted.objects[1],
 {...stroke,id:'private-stroke',studentVisible:false,teacherOnly:true}]};
const doc={...lesson,pages:[published]};
const slides=buildStudentPdfSlides(doc);
assert.equal(slides.length,1);
assert.equal(slides[0].page.objects.length,2);
assert.ok(!JSON.stringify(slides).includes('private-stroke'));
assert.equal(slides[0].page.objects[1].opacity,.42);
const projector=boardStudentPayload(doc);
assert.equal(projector.page.objects.length,2);
assert.ok(!JSON.stringify(projector).includes('private-stroke'));
const diagram=[
 {id:'n1',kind:'shape',shape:'rect',x:100,y:100,x2:340,y2:230},
 {id:'n2',kind:'shape',shape:'rect',x:600,y:140,x2:850,y2:290}
];
const edge=createLabeledDiagramConnection(diagram,'n1','n2','CAUSES');
assert.equal(edge.length,2);
assert.equal(edge[0].kind,'shape');
assert.equal(edge[1].connectorId,edge[0].id);
assert.equal(edge[1].studentVisible,true);
assert.deepEqual(createLabeledDiagramConnection(diagram,'n1','n2',''),[]);
const moved=syncDiagramConnections(moveBoardObjects([...diagram,...edge],['n2'],200,30));
assert.notEqual(moved.at(-1).x,edge.at(-1).x);
assert.equal(moved.at(-1).text,'CAUSES');
assert.equal(BOARD_IMAGE_FILTERS.vivid,'saturate(1.45) contrast(1.08)');
assert.equal(boardImageFilterCss('__invalid'),'none');
const ui=source('BrianBoard.jsx'),canvas=source('BoardCanvas.jsx'),studio=source('BoardPdfStudio.jsx');
assert.ok(ui.includes("panel==='pdf'"));
assert.ok(ui.includes("pdfHighlightRegion"));
assert.ok(ui.includes("clearPdfAnnotations"));
assert.ok(ui.includes('applyBoardImageFilter'));
assert.ok(ui.includes('connect-labeled'));
assert.match(canvas,/onPdfHighlight/);
assert.match(canvas,/pdf-highlight/);
assert.match(studio,/onNavigate/);
assert.match(studio,/onPaperState/);
assert.match(source('boardPdf.js'),/opacity:Math\.max/);
assert.match(source('boardModel.js'),/opacity:Math\.max/);
assert.match(source('boardImageStudio.js'),/applyBoardImageFilter/);
assert.ok(!studio.includes('dangerouslySetInnerHTML'));
assert.ok(!ui.includes('dangerouslySetInnerHTML'));
console.log('PASS Brian Board V8.3: reversible PDF overlays, opacity parity, paper locks, labeled diagrams, offline image filters, student privacy and inspector controls.');
