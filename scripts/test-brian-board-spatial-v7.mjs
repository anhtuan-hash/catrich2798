import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,normalizeLesson,sanitizeStudentPage} from '../src/components/BrianBoard/boardModel.js';
import {boardStudentPayload} from '../src/components/BrianBoard/boardPresentation.js';
import {
 spatialObjectBounds,unionBoardBounds,boardOverviewBounds,fitBoardContent,
 reorderBoardFrame,duplicateBoardFrame,normalizeBoardFrames,FRAME_LIMIT
} from '../src/components/BrianBoard/boardSpatial.js';
const file=path=>readFileSync(new URL(path,import.meta.url),'utf8');

const stroke={id:'stroke',kind:'stroke',width:5,points:[{x:2100,y:1300},{x:2500,y:1500}]};
const text={id:'text-1',kind:'text',x:2750,y:1620,text:'Teacher only'};
const shape={id:'shape-1',kind:'shape',shape:'rect',x:3300,y:900,x2:3700,y2:1600};
assert.deepEqual(spatialObjectBounds(shape),{x:3300,y:900,width:400,height:700});
assert.deepEqual(spatialObjectBounds(stroke),{x:2095,y:1295,width:410,height:210});
assert.ok(spatialObjectBounds(text).width>=70);
assert.equal(spatialObjectBounds({kind:'unknown'}),null);
assert.equal(spatialObjectBounds({kind:'stroke',points:[]}),null);
assert.deepEqual(unionBoardBounds([{x:0,y:0,width:100,height:100},{x:200,y:300,width:100,height:100}],0),
 {x:0,y:0,width:300,height:400});
assert.equal(unionBoardBounds([null,undefined]),null);
const frames=[
 {id:'f1',title:'Introduction',x:2000,y:800,width:1600,height:900},
 {id:'f2',title:'Reading',x:3900,y:800,width:1600,height:900},
 {id:'f3',title:'Exercise',x:5800,y:800,width:1600,height:900,hidden:true}
];
const initial=newLesson('owner');
initial.pages[0].frames=frames;
initial.pages[0].objects=[stroke,{...text,teacherOnly:true},{...shape,studentVisible:true}];
const lesson=normalizeLesson(initial,'owner');
const snapshot=JSON.stringify(lesson);
const reordered=reorderBoardFrame(lesson.pages[0].frames,'f2',-1);
assert.deepEqual(reordered.map(x=>x.id),['f2','f1','f3']);
assert.deepEqual(lesson.pages[0].frames.map(x=>x.id),['f1','f2','f3'],'reordering must be immutable');
assert.deepEqual(reorderBoardFrame(frames,'f1',-1).map(x=>x.id),frames.map(x=>x.id));
assert.deepEqual(reorderBoardFrame(frames,'missing',1).map(x=>x.id),frames.map(x=>x.id));
const duplicate=duplicateBoardFrame(frames,'f2','copy-id');
assert.equal(duplicate.length,4);
assert.equal(duplicate[2].id,'copy-id');
assert.equal(duplicate[2].title,'Reading (copy)');
assert.equal(duplicate[2].x,3990);
assert.equal(duplicateBoardFrame(frames,'f1','f2').length,3,'duplicate ID must fail');
assert.equal(duplicateBoardFrame(frames,'missing','new').length,3);
assert.equal(duplicateBoardFrame(Array.from({length:FRAME_LIMIT},(_,i)=>({...frames[0],id:'frame-'+i})),
 'frame-1','clone').length,FRAME_LIMIT);
assert.equal(JSON.stringify(lesson),snapshot,'frame operations must not mutate lesson');
const fit=fitBoardContent({frames:lesson.pages[0].frames,objects:lesson.pages[0].objects});
assert.ok(fit.zoom>0&&fit.zoom<=1);
assert.ok(Number.isFinite(fit.camera.x)&&Number.isFinite(fit.camera.y));
assert.deepEqual(fitBoardContent({objects:[],frames:[]}),{camera:{x:0,y:0},zoom:1});
const overview=boardOverviewBounds({frames,objects:lesson.pages[0].objects,
 viewport:{x:2000,y:800,width:1600,height:900}});
assert.ok(overview.x<=0);
assert.ok(overview.width>=7000);
const publicPage=sanitizeStudentPage(lesson.pages[0]);
assert.ok(publicPage.objects.every(x=>x.id!=='text-1'));
const projection=boardStudentPayload(lesson,null,null,{x:2000,y:800,width:1600,height:900});
assert.ok(!JSON.stringify(projection).includes('Teacher only'));
assert.ok(!Object.hasOwn(projection.page,'frames'));
const navigator=file('../src/components/BrianBoard/BoardNavigator.jsx');
const ui=file('../src/components/BrianBoard/BrianBoard.jsx');
const css=file('../src/components/BrianBoard/BoardNavigator.css');
const visual=file('../src/components/BrianBoard/BoardVisualRefresh.css');
assert.match(navigator,/onPointerDown=\{pointerDown\}/);
assert.match(navigator,/onPointerMove=\{pointerMove\}/);
assert.match(navigator,/onKeyDown=/);
assert.match(navigator,/unionBoardBounds/);
assert.match(navigator,/useMemo/);
assert.ok(!navigator.includes('dangerouslySetInnerHTML'));
assert.ok(!navigator.includes('privateAnswer'));
assert.ok(!navigator.includes('innerHTML'));
assert.match(ui,/BoardNavigator/);
assert.match(ui,/fitAllCanvas/);
assert.match(ui,/centerCanvasOn/);
assert.match(ui,/cleanMode/);
assert.match(ui,/bbd-frame-strip/);
assert.match(ui,/reorderBoardFrame/);
assert.match(ui,/duplicateBoardFrame/);
assert.match(ui,/key==='g'/);
assert.match(ui,/key==='m'/);
assert.match(ui,/key==='c'/);
assert.match(css,/touch-action:none/);
assert.match(visual,/\.bbd-frame-strip/);
assert.match(visual,/\.is-clean-mode/);
assert.match(visual,/prefers-reduced-motion/);
assert.ok(!css.includes('https://'),'No external imagery or paid subscriptions');
assert.ok(!ui.includes('dangerouslySetInnerHTML'));
console.log('PASS Brian Board V7: geometry, private mini-map, Fit All, frame order, clean mode, shortcuts, accessibility and safe TV payload.');
