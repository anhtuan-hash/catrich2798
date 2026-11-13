import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
import {createOfflineRuntime} from '../../src/features/immersive-gallery/v3/offline/runtime.js';
import {sanitizeSnapshot,safeJson,buildOfflineHtml,digest,BLOCKED_WRITE} from '../../src/features/immersive-gallery/v3/offline/snapshot.js';
import {captureMuseum} from '../../src/features/immersive-gallery/v3/offline/exportMuseum.js';
test('secrets and signed capabilities are excluded; evidence content remains',()=>{
 const result=sanitizeSnapshot({passcode:'private',invitation_handle:'private',nested:{access_token:'private',storage_path:'private'},reviewers:[{}],url:'https://example.test/?token=secret',learning:{evidence:'Observed note'},content_frozen_at:'date'});
 assert.deepEqual(result,{nested:{},url:'',learning:{evidence:'Observed note'},content_frozen_at:'date'});
});
test('untrusted lesson text cannot break the embedded JSON or create a script',async()=>{
 const f=fixture();f.staff.assignments[0].title='</script><script>alert(1)</script>\u2028';
 const html=buildOfflineHtml({script:'void 0;',css:''},f,await digest(JSON.stringify(f)));
 assert.equal((html.match(/<script/g)||[]).length,2);
 assert.deepEqual(JSON.parse(safeJson(f)),f);
 assert.match(html,/connect-src data: blob:/);
});
test('viewer controls never mutate frozen records and all write endpoints reject',async()=>{
 const f=fixture(),before=JSON.stringify(f),rt=createOfflineRuntime(f);
 assert.equal((await rt.staff('dashboard')).offlineReadOnly,true);
 for(const op of ['create-assignment','delete-assignment','review','publish','settings'])await assert.rejects(rt.staff(op,{}),{message:BLOCKED_WRITE});
 for(const op of ['freeze-survey','media-add','media-voice','respond'])await assert.rejects(rt.liveStaff(op,{assignmentId:'qa-lesson'}),{message:BLOCKED_WRITE});
 for(const action of ['next','next','reveal','previous','pause','resume','end','restart'])await rt.liveStaff('control',{assignmentId:'qa-lesson',action});
 assert.equal(JSON.stringify(rt.snapshot),before);assert.equal(JSON.stringify(f),before);
 assert.throws(()=>{rt.snapshot.staff.assignments[0].title='changed';},TypeError);
 assert.throws(()=>rt.guest('save'),{message:BLOCKED_WRITE});
 const read=await rt.staff('dashboard');read.assignments[0].title='changed';assert.equal(JSON.stringify(rt.snapshot),before);
});
const fakeOptions=f=>({staff:async action=>action==='dashboard'?f.staff:action==='showcase-state'?f.showcase:{gallery:f.galleries[0]},art:async()=>f.artworks['qa-group'],live:async action=>action==='state'?f.live['qa-lesson']:action==='evidence'?f.evidence['qa-lesson']:action==='group-gallery'?f.groupDrafts['qa-group']:{before:null,after:null},fetcher:async()=>{throw Error('Unexpected HTTP request');}});
test('capture preserves recorded evidence, removes secrets, and fails on missing artwork',async()=>{
 const f=fixture();f.staff.groups[0].passcode='secret';
 const snapshot=await captureMuseum(fakeOptions(f));
 assert.equal(snapshot.staff.groups[0].passcode,undefined);
 assert.deepEqual(snapshot.evidence,sanitizeSnapshot(f.evidence));
 f.artworks['qa-group']=[];f.groupDrafts['qa-group'].draft.rooms[0].exhibits[0].image_url='';
 await assert.rejects(captureMuseum(fakeOptions(f)),/referenced artwork is missing/);
});
test('cancelled or capped captures cannot report success',async()=>{
 const f=fixture(),controller=new AbortController();controller.abort();
 await assert.rejects(captureMuseum({...fakeOptions(f),signal:controller.signal}),{name:'AbortError'});
 f.staff.assignments=Array.from({length:100},()=>f.staff.assignments[0]);
 await assert.rejects(captureMuseum(fakeOptions(f)),/API limit/);
});
test('image bytes are embedded before signed capabilities are stripped; failed downloads abort',async()=>{
 const original=globalThis.FileReader;
 globalThis.FileReader=class {async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();}};
 try{
  const f=fixture(),url='https://storage.example/storage/v1/object/sign/image?token=temporary';
  f.galleries[0].rooms[0].exhibits[0].image_url=url;
  let calls=0;
  const snapshot=await captureMuseum({...fakeOptions(f),fetcher:async(input,options)=>{
   calls++;assert.equal(input,url);assert.equal(options.credentials,'omit');
   return new Response(Buffer.from('synthetic image bytes'),{headers:{'Content-Type':'image/png'}});
  }});
  assert.equal(calls,1);assert.match(snapshot.galleries[0].rooms[0].exhibits[0].image_url,/^data:image\/png;base64,/);
  assert.equal(JSON.stringify(snapshot).includes('token=temporary'),false);assert.equal(snapshot.media[0].sha256.length,64);
  await assert.rejects(captureMuseum({...fakeOptions(f),fetcher:async()=>new Response('',{status:403})}),/could not be downloaded/);
 }finally{globalThis.FileReader=original;}
});
