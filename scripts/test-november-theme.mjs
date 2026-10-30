import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/utils/novemberHomeTheme.js','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function harness(){
 let row={november_home_enabled:false,november_avatar_url:'',updated_at:'2026-10-01T00:00:00Z'};
 let query=null, failure=null, requests=0, realtimeCount=0, cleanups=0, timerCount=0;
 const unsubs=[]; const storage=new Map(); const window=new EventTarget();const document=new EventTarget();document.hidden=false;
 window.setInterval=()=>{timerCount++;return 1};window.clearInterval=()=>timerCount--;
 const client={from:()=>({select:()=>({eq:()=>({maybeSingle:()=>{requests++;return query?query():Promise.resolve({data:{...row}})}})})}),rpc:async(name,args)=>{if(failure)return {error:{message:failure}};row={...row,november_home_enabled:args.p_enabled??row.november_home_enabled,november_avatar_url:args.p_url??row.november_avatar_url,updated_at:'2026-10-30T12:00:00Z'};return{data:[{...row}]}}};
 const context=vm.createContext({Event,CustomEvent,window,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},getRuntimeClient:()=>client,subscribeTable:()=>{realtimeCount++;return()=>{cleanups++}},useSyncExternalStore:(sub,get)=>{unsubs.push(sub(()=>{}));return get()}});
 const api=vm.runInContext(source+'\n({loadNovemberHomeTheme,saveNovemberHomeTheme,saveNovemberAvatar,getNovemberHomeTheme,useNovemberHomeTheme})',context);
 return {api,window,unsubs,setQuery:f=>query=f,setFailure:s=>failure=s,stats:()=>({requests,realtimeCount,cleanups,timerCount})};
}
test('confirmed on/off and failed writes preserve last known state',async()=>{
 const h=harness();await h.api.loadNovemberHomeTheme();assert.equal(h.api.getNovemberHomeTheme().enabled,false);assert.equal(h.api.getNovemberHomeTheme().verified,true);
 assert.equal((await h.api.saveNovemberHomeTheme(true)).ok,true);assert.equal(h.api.getNovemberHomeTheme().enabled,true);
 h.setFailure('not an approved admin');assert.equal((await h.api.saveNovemberHomeTheme(false)).ok,false);assert.equal(h.api.getNovemberHomeTheme().enabled,true);
 h.setFailure(null);await h.api.saveNovemberHomeTheme(false);assert.equal(h.api.getNovemberHomeTheme().enabled,false);
});
test('an old in-flight read cannot undo a confirmed switch',async()=>{
 const h=harness();let resolve;h.setQuery(()=>new Promise(r=>resolve=r));const read=h.api.loadNovemberHomeTheme();
 await h.api.saveNovemberHomeTheme(true);resolve({data:{november_home_enabled:false,november_avatar_url:'',updated_at:'2026-10-01T00:00:00Z'}});await read;assert.equal(h.api.getNovemberHomeTheme().enabled,true);
});
test('read requests and realtime listeners are shared and cleaned up',async()=>{
 const h=harness();h.api.useNovemberHomeTheme();h.api.useNovemberHomeTheme();await h.api.loadNovemberHomeTheme();assert.equal(h.stats().requests,1);assert.equal(h.stats().realtimeCount,1);assert.equal(h.stats().timerCount,1);
 h.unsubs[0]();assert.equal(h.stats().cleanups,0);h.unsubs[1]();assert.equal(h.stats().cleanups,1);assert.equal(h.stats().timerCount,0);
});
test('avatar save/remove is independent of the theme switch',async()=>{
 const h=harness();await h.api.saveNovemberHomeTheme(true);await h.api.saveNovemberAvatar('https://example.test/avatar.webp');assert.equal(h.api.getNovemberHomeTheme().enabled,true);assert.equal(h.api.getNovemberHomeTheme().avatarUrl,'https://example.test/avatar.webp');await h.api.saveNovemberAvatar('');assert.equal(h.api.getNovemberHomeTheme().avatarUrl,'');
});
test('failed reads do not fabricate a verified state',async()=>{const h=harness();h.setQuery(async()=>({error:{message:'offline'}}));assert.equal((await h.api.loadNovemberHomeTheme()).ok,false);assert.equal(h.api.getNovemberHomeTheme().verified,false)});
