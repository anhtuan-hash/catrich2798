import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOARD_W,BOARD_H,newLesson,normalizeLesson,sanitizeStudentPage} from '../src/components/BrianBoard/boardModel.js';
import {
 BOARD_PEN_PRESETS,BOARD_GRID_SIZE,smoothBoardPath,pressureBoardSegments,
 boardShapeGeometry,boardShapePreviewPath,snapBoardPoint,constrainBoardShape
} from '../src/components/BrianBoard/boardDrawing.js';
import {boardStudentPayload} from '../src/components/BrianBoard/boardPresentation.js';
const source=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');
const read=name=>source('../src/components/BrianBoard/'+name);
assert.equal(BOARD_W,1600);assert.equal(BOARD_H,900);
assert.deepEqual(Object.keys(BOARD_PEN_PRESETS),['fine','classic','fountain','marker']);
assert.equal(BOARD_PEN_PRESETS.fountain.pressure,true);
assert.ok(BOARD_PEN_PRESETS.marker.opacity<1);
assert.equal(BOARD_GRID_SIZE,25);
assert.deepEqual(snapBoardPoint({x:37,y:49},true),{x:25,y:50});
assert.deepEqual(snapBoardPoint({x:37,y:49},false),{x:37,y:49});
assert.deepEqual(constrainBoardShape({x:0,y:0},{x:70,y:20},'rect',{shift:true}),
 {x:0,y:0,x2:70,y2:70});
const diagonal=constrainBoardShape({x:0,y:0},{x:49,y:43},'arrow',{shift:true});
assert.ok(Math.abs(diagonal.x2-diagonal.y2)<.01);
assert.equal(constrainBoardShape({x:12,y:14},{x:73,y:61},'triangle',{snap:true}).x,0);
assert.equal(smoothBoardPath([]),'');
assert.equal(smoothBoardPath([{x:4,y:8}]),'M 4 8 l 0.01 0.01');
assert.match(smoothBoardPath([{x:1,y:1},{x:6,y:6},{x:12,y:15}]),/ Q /);
const pressure=pressureBoardSegments([
 {x:1,y:1,pressure:.1},{x:8,y:9,pressure:1},{x:19,y:19,pressure:1}
],8);
assert.equal(pressure.length,2);
assert.ok(pressure[0].width<pressure[1].width);
assert.ok(pressureBoardSegments(Array.from({length:4001},(_,i)=>({x:i,y:i,pressure:.5})),8).length<=300);
assert.equal(boardShapeGeometry('triangle',0,0,100,80).type,'polygon');
assert.deepEqual(boardShapeGeometry('triangle',0,0,100,80).points,[[50,0],[100,80],[0,80]]);
assert.equal(boardShapeGeometry('arrow',0,0,100,50).points.length,5);
assert.equal(boardShapeGeometry('rect',0,0,100,50),null);
assert.match(boardShapePreviewPath('triangle',0,0,100,80),/ Z$/);
assert.match(boardShapePreviewPath('ellipse',0,0,100,80),/ A /);

const doc=newLesson('teacher-only');
const raw={id:'stroke-1',kind:'stroke',points:[
 {x:0,y:0,pressure:.2},{x:30,y:70,pressure:.8},{x:90,y:100,pressure:1}],
 color:'#335d63',width:8,smoothed:true,pressureSensitive:true,studentVisible:true};
const arrow={id:'arrow-1',kind:'shape',shape:'arrow',x:10,y:20,x2:200,y2:140,
 color:'#335d63',width:5,fill:'none'};
const triangle={id:'triangle-1',kind:'shape',shape:'triangle',x:10,y:20,x2:200,y2:140,
 color:'#335d63',width:5,fill:'#fff0c8'};
const privateShape={...triangle,id:'private-shape',teacherOnly:true,privateAnswer:'DO_NOT_SEND'};
doc.pages[0].background='dots';
doc.pages[0].objects=[raw,arrow,triangle,privateShape];
const restored=normalizeLesson(doc,'teacher-only');
assert.equal(restored.pages[0].background,'dots');
assert.equal(restored.pages[0].objects[0].pressureSensitive,true);
const safe=sanitizeStudentPage(restored.pages[0]);
assert.equal(safe.background,'dots');
assert.equal(safe.objects.length,3);
assert.equal(safe.objects[0].points[0].pressure,.2);
assert.equal(safe.objects[0].smoothed,true);
assert.equal(safe.objects[0].pressureSensitive,true);
assert.equal(safe.objects[1].shape,'arrow');
assert.equal(safe.objects[2].shape,'triangle');
assert.equal(safe.objects[2].fill,'#fff0c8');
assert.ok(!JSON.stringify(safe).includes('DO_NOT_SEND'));
const tv=boardStudentPayload(restored);
assert.ok(!JSON.stringify(tv).includes('DO_NOT_SEND'));
assert.equal(tv.page.objects.length,3);
assert.equal(tv.page.background,'dots');
assert.equal(sanitizeStudentPage({...doc.pages[0],hidden:true}),null);
const code=read('BoardCanvas.jsx'),board=read('BrianBoard.jsx'),pdf=read('boardPdf.js');
const viewer=source('../public/brian-board-viewer.js');
const css=read('BrianBoard.css');
assert.match(code,/getCoalescedEvents/);
assert.match(code,/pressureBoardSegments/);
assert.match(code,/smoothBoardPath/);
assert.match(code,/boardShapeGeometry/);
assert.match(code,/onPointerCancel/);
assert.match(code,/eraser-ink/);
assert.match(code,/onDuplicateObject/);
assert.match(board,/BOARD_PEN_PRESETS/);
assert.match(board,/shape-arrow/);
assert.match(board,/shape-triangle/);
assert.match(board,/snapToGrid/);
assert.match(board,/shapeFill/);
assert.match(board,/clearInk/);
assert.match(board,/onDuplicateObject=\{duplicateObject\}/);
assert.match(board,/\['plain','grid','lines','dots'\]/);
assert.match(pdf,/pressureBoardSegments/);
assert.match(pdf,/boardShapeGeometry/);
assert.match(pdf,/smoothBoardPath/);
assert.match(viewer,/viewerShapeGeometry/);
assert.match(viewer,/viewerSmoothPath/);
assert.match(viewer,/pressureSensitive/);
assert.match(css,/bbd-canvas--dots/);
assert.match(css,/bbd-canvas__selection-actions/);
assert.ok(!viewer.includes('innerHTML'),'Student screen must never inject HTML');
assert.ok(!board.includes('dangerouslySetInnerHTML'));
const focus=source('../src/components/BrianFocus/BrianFocus.jsx');
assert.ok(focus.includes('youtube')||focus.includes('YouTube'),'Focus remains a separate untouched component');
console.log('PASS Brian Board drawing v4: four ink presets, smoothing, pressure, ink-only erase, arrow, triangle, fill, snap, dots, select actions and safe public TV/PDF contracts.');
