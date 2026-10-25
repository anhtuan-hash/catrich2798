import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,normalizeLesson,sanitizeStudentPage} from '../src/components/BrianBoard/boardModel.js';
import {boardStudentPayload} from '../src/components/BrianBoard/boardPresentation.js';
import {normalizeBoardFrames} from '../src/components/BrianBoard/boardSpatial.js';
import {lassoObjectIds,moveBoardObjects,scaleBoardObjects,duplicateBoardObjects,
 reorderBoardObjects,splitStrokeByEraser,eraseInkAtPoint,buildBoardTemplate,
 BOARD_V8_TEMPLATES,recognizeBoardGesture,createDiagramConnection,syncDiagramConnections,
 groupResizeTransform,BOARD_RESIZE_HANDLES} from '../src/components/BrianBoard/boardV8Tools.js';
import {normalizeBoardCrop} from '../src/components/BrianBoard/boardImageStudio.js';
const source=f=>readFileSync(new URL('../src/components/BrianBoard/'+f,import.meta.url),'utf8');
const square=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];
const objects=[
 {id:'a',kind:'text',x:20,y:60,text:'Public text',fontSize:30},
 {id:'b',kind:'text',x:210,y:260,text:'PRIVATE TEACHER ANSWER',studentVisible:false},
 {id:'c',kind:'shape',shape:'rect',x:15,y:15,x2:65,y2:60,color:'#335d63',width:4}
];
assert.deepEqual(lassoObjectIds(objects,square),['c']); // the text center lies outside the lasso
assert.deepEqual(lassoObjectIds(objects,square.slice(0,2)),[]);
const moved=moveBoardObjects(objects,['c'],10,15);
assert.equal(moved[2].x,25);assert.equal(moved[2].y2,75);
assert.equal(objects[2].x,15,'Original document should not mutate');
assert.equal(BOARD_RESIZE_HANDLES.length,8);
const stretched=groupResizeTransform(objects,['c'],'se',{x:80,y:60});
assert.ok(stretched[2].x2>objects[2].x2);
assert.ok(stretched[2].y2>objects[2].y2);
assert.equal(stretched[1],objects[1],'unselected source remains reference-identical');
const anchored=groupResizeTransform(objects,['c'],'nw',{x:-20,y:-20});
assert.equal(anchored[2].x2,objects[2].x2);
assert.equal(anchored[2].y2,objects[2].y2);
const protectedItem={...objects[2],locked:true};
assert.equal(groupResizeTransform([protectedItem],['c'],'se',{x:80,y:40})[0],protectedItem);
assert.deepEqual(groupResizeTransform(objects,['c'],'unknown',{x:30,y:20}),objects);
assert.deepEqual(normalizeBoardCrop({x:0.2,y:0.1,width:.5,height:.7}),{x:.2,y:.1,width:.5,height:.7});
assert.equal(normalizeBoardCrop({x:.98,y:.99,width:1,height:1}).x,.92);
const scaled=scaleBoardObjects(objects,['c'],1.5);
assert.ok(scaled[2].x2>objects[2].x2);
const copies=duplicateBoardObjects(objects,['a','c']);
assert.equal(copies.length,5);
assert.ok(copies[3].id!=='a');
assert.deepEqual(reorderBoardObjects(objects,['b'],'front').map(x=>x.id),['a','c','b']);
assert.deepEqual(reorderBoardObjects(objects,['b'],'back').map(x=>x.id),['b','a','c']);
const line={id:'ink',kind:'stroke',points:[{x:0,y:0},{x:10,y:0},{x:20,y:0},
 {x:30,y:0},{x:40,y:0}],width:4,smoothed:true,studentVisible:true};
assert.deepEqual(splitStrokeByEraser(line,{x:200,y:200}),[line]);
const cleaned=splitStrokeByEraser(line,{x:20,y:0},3);
assert.ok(cleaned.length>=1);
assert.ok(cleaned.every(o=>o.points.every(p=>Math.abs(p.x-20)>3)));
assert.equal(eraseInkAtPoint([line,objects[0]],{x:20,y:0},3).at(-1).id,'a');
assert.equal(BOARD_V8_TEMPLATES.length,7);
for(const template of BOARD_V8_TEMPLATES){
 const created=buildBoardTemplate(template.id,{x:500,y:500,width:1600,height:900},true);
 assert.ok(created.length>=3,template.id);
 assert.ok(created.every(o=>o.id&&o.studentVisible===true));
}
assert.deepEqual(buildBoardTemplate('unknown'),[]);
assert.deepEqual(recognizeBoardGesture([]),null);
const horizontal=Array.from({length:15},(_,i)=>({x:i*15,y:3}));
assert.equal(recognizeBoardGesture(horizontal)?.shape,'line');
const circular=Array.from({length:30},(_,i)=>({
 x:150+75*Math.cos(i/29*Math.PI*2),y:130+65*Math.sin(i/29*Math.PI*2)
}));
assert.equal(recognizeBoardGesture(circular)?.shape,'ellipse');
const connection=createDiagramConnection(objects,'a','c');
assert.equal(connection?.kind,'shape');
assert.equal(connection?.shape,'arrow');
assert.ok(connection?.fromId==='a'&&connection?.toId==='c');
const linked=syncDiagramConnections(moveBoardObjects([...objects,connection],['c'],50,20));
assert.notEqual(linked.at(-1).x2,connection.x2);

const frame=normalizeBoardFrames([{id:'a',title:'Frame 01',x:0,y:0,width:1600,height:900,
 teacherNotes:'THE ANSWER IS 42',transition:'focus'}]);
assert.equal(frame[0].teacherNotes,'THE ANSWER IS 42');
assert.equal(frame[0].transition,'focus');
const lesson=newLesson('teacher');
lesson.pages[0].frames=frame;
lesson.pages[0].objects=[...objects,{id:'pin-1',kind:'activity-pin',x:100,y:100,
 text:'Private quiz',activityId:'act1',teacherOnly:true,studentVisible:false}];
const restored=normalizeLesson(lesson,'teacher');
assert.equal(restored.pages[0].objects.length,4);
assert.equal(sanitizeStudentPage(restored.pages[0]).objects.length,2);
const student=boardStudentPayload(restored);
assert.ok(!JSON.stringify(student).includes('THE ANSWER IS 42'));
assert.ok(!JSON.stringify(student).includes('PRIVATE TEACHER ANSWER'));
assert.ok(!JSON.stringify(student).includes('Private quiz'));
const board=source('BrianBoard.jsx'),canvas=source('BoardCanvas.jsx');
assert.match(board,/BoardFrameThumbnail/);
assert.match(board,/BoardReliabilityPanel/);
assert.match(board,/boardAssets\.js/);
assert.match(board,/listBoardCheckpoints/);
assert.match(board,/teacherNotes/);
assert.match(board,/onBatchEdit=\{batchEdit\}/);
assert.match(board,/onPrecisionErase=\{precisionErase\}/);
assert.match(board,/onSaveAsset=\{saveSelectedAsset\}/);
assert.match(board,/smartGeometry=\{smartGeometry\}/);
assert.match(board,/cropImageInLayer/);
assert.match(board,/syncDiagramConnections/);
assert.match(board,/groupResizeTransform/);
assert.match(board,/frame\.transition/);
assert.match(board,/const isFocus=transition==='focus'/);
assert.match(board,/BoardCropEditor/);
assert.match(board,/cropBoardImageRegion/);
assert.match(board,/bbd-v8-layers/);
assert.match(board,/insertTeachingTemplate/);
assert.match(board,/pinActivity/);
assert.match(canvas,/lassoObjectIds/);
assert.match(canvas,/onPrecisionErase/);
assert.match(canvas,/bbd-v8-selection/);
assert.match(canvas,/activity-pin/);
assert.match(canvas,/recognizeBoardGesture/);
assert.match(canvas,/beginResize/);
assert.match(canvas,/resize-group/);
assert.match(canvas,/transformHandles\.map/);
assert.match(canvas,/\['pen','highlighter','lasso','eraser-precision'\]\.includes\(state\.tool\)/);
assert.match(canvas,/onBatchEdit\?\.\(selectedIds,'connect'\)/);
const assets=source('boardAssets.js'),storage=source('boardStorage.js');
assert.match(assets,/openBoardDB/);assert.match(assets,/ownerId/);
assert.match(storage,/saveBoardCheckpoint/);
assert.match(storage,/readBoardCheckpoint/);
assert.match(storage,/listBoardCheckpoints/);
const check=source('BoardReliabilityPanel.jsx');
assert.match(check,/navigator\.storage/);
assert.match(check,/onPrivateBackup/);
assert.match(source('boardImageStudio.js'),/cropBoardImageData/);
assert.match(source('boardImageStudio.js'),/cropBoardImageRegion/);
assert.match(source('BoardCropEditor.jsx'),/onPointerMove=\{drag\}/);
assert.match(source('BoardFrameThumbnail.jsx'),/renderBoardObject/);
assert.ok(!board.includes('dangerouslySetInnerHTML'));
assert.ok(!canvas.includes('dangerouslySetInnerHTML'));
console.log('PASS Brian Board V8: lasso, precision eraser, immutable transformations, 7 templates, private presenter notes/assets/checkpoints, pins, layer controls, and device diagnostics.');
