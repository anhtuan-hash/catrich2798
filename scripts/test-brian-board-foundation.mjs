import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,newPage,normalizeLesson,pathFromPoints,appendObject,sanitizeStudentPage,BOARD_W,BOARD_H} from '../src/components/BrianBoard/boardModel.js';
const root=new URL('../src/components/BrianBoard/',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const lesson=newLesson('teacher-abc'),first=lesson.pages[0];
assert.equal(BOARD_W,1600);assert.equal(BOARD_H,900);
assert.equal(first.objects.length,0);
assert.equal(normalizeLesson({...lesson,ownerId:'someone-else'},'teacher-abc').pages[0].objects.length,0);
const stroke={id:'ink1',kind:'stroke',color:'#335d63',width:5,
 points:[{x:12,y:13,pressure:.5},{x:44,y:48,pressure:.8}],studentVisible:true};
const changed=appendObject(lesson,first.id,stroke);
assert.equal(lesson.pages[0].objects.length,0,'Immutable updates must preserve history');
assert.equal(changed.pages[0].objects.length,1);
assert.match(pathFromPoints(stroke.points),/M 12 13/);
assert.equal(pathFromPoints([{x:4,y:8}]),'M 4 8 l 0.01 0.01');
assert.equal(normalizeLesson(changed,'teacher-abc').pages[0].objects[0].kind,'stroke');
assert.equal(normalizeLesson({...lesson,theme:'unsafe'},'teacher-abc').theme,'ivory');
const privatePage={...first,objects:[
 stroke,
 {kind:'text',id:'private',text:'Confidential teacher answer',teacherOnly:true},
 {kind:'flashcard',id:'card',text:'Question',privateAnswer:'Teacher secret',studentVisible:true},
 {kind:'mask',id:'mask',studentVisible:true}
]};
const safe=sanitizeStudentPage(privatePage);
assert.equal(safe.objects.length,2);
assert.equal(safe.objects.some(o=>o.id==='private'||o.kind==='mask'),false);
assert.equal(JSON.stringify(safe).includes('Teacher secret'),false);
assert.equal(sanitizeStudentPage({...privatePage,hidden:true}),null);
let records=new Map();
const transactions=[];
globalThis.indexedDB={
 open:()=>{
  const request={result:null};
  queueMicrotask(()=>{
   const database={
    objectStoreNames:{contains:n=>n==='lessons'},
    transaction:(_name,mode)=>{
     const tx={mode,oncomplete:null,onerror:null,onabort:null,
      objectStore:()=>({
       get:key=>{
        const req={result:null,onerror:null,onsuccess:null};
        queueMicrotask(()=>{req.result=records.get(key);req.onsuccess?.();});
        return req;
       },
       put:value=>{
        transactions.push(value.key);
        records.set(value.key,value);
        queueMicrotask(()=>tx.oncomplete?.());
       },
      }),
     };
     return tx;
    },
   };
   request.result=database;request.onsuccess?.();
  });
  return request;
 },
};
const {readBoardDraft,saveBoardDraft}=await import('../src/components/BrianBoard/boardStorage.js');
await saveBoardDraft('teacher-abc',changed);
await saveBoardDraft('teacher-def',newLesson('teacher-def'));
const original=await readBoardDraft('teacher-abc');
const other=await readBoardDraft('teacher-def');
assert.equal(original.pages[0].objects.length,1);
assert.equal(other.pages[0].objects.length,0);
await assert.rejects(()=>saveBoardDraft('teacher-def',changed),/Owner mismatch/);
const body=read('BrianBoard.jsx'),canvas=read('BoardCanvas.jsx'),css=read('BrianBoard.css');
const app=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const dock=readFileSync(new URL('../src/utils/unifiedFloatingDock.js',import.meta.url),'utf8');
assert.match(body,/createPortal/);
assert.match(body,/aria-modal="true"/);
assert.match(body,/readBoardDraft\(ownerId\)/);
assert.match(body,/saveBoardDraft\(ownerId,snapshot\)/);
assert.match(body,/animation.finished/);
assert.match(body,/onClick=\{undo\}/);
assert.match(body,/onClick=\{redo\}/);
assert.match(body,/setStudentView/);
assert.match(body,/isDepartmentLeaderRole/);
assert.match(canvas,/getCoalescedEvents/);
assert.match(canvas,/setPointerCapture/);
assert.match(canvas,/pathFromPoints/);
assert.match(canvas,/onPointerCancel/);
assert.match(canvas,/tool==='eraser'/);
assert.match(css,/bbd-theme-midnight/);
assert.match(css,/bbd-theme-ivory/);
assert.match(css,/@media\(max-width:640px\)/);
assert.match(dock,/board: 'board'/);
assert.match(app,/<BrianBoard currentUser=\{currentUser\} language=\{language\}\/>/);
assert.match(app,/<BrianFocus currentUser=\{currentUser\}/);
console.log('PASS Brian Board Foundation: serialized owner-isolated IndexedDB, real vector input contracts, history, pages, private student projection, WAAPI and Focus continuity.');
