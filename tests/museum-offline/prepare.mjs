import fs from 'node:fs/promises';
import JSZip from 'jszip';
import assert from 'node:assert/strict';
import {aseanFixture,fixture} from './fixture.mjs';
import {exportMuseumOffline} from '../../src/features/immersive-gallery/v3/offline/exportMuseum.js';
import {buildOfflineHtml,digest} from '../../src/features/immersive-gallery/v3/offline/snapshot.js';
const runtime=JSON.parse(await fs.readFile('dist/museum-offline-runtime.json','utf8'));
assert.equal(/(?:[a-z0-9-]+)\.supabase\.co|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(runtime.script),false,'No cloud endpoint or JWT may ship in offline code');
async function makeArchive(f,assignmentIds){
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>{assert.equal(url,'/museum-offline-runtime.json');return Response.json(runtime);};
 try{return await exportMuseumOffline({assignmentIds,staff:async action=>action==='dashboard'?f.staff:action==='showcase-state'?f.showcase:{gallery:f.galleries[0]},
  art:async groupId=>f.artworks[groupId]||[],
  live:async(action,body,params)=>{
   if(action==='state')return f.live[params.assignmentId];
   if(action==='evidence')return f.evidence[params.assignmentId];
   if(action==='group-gallery'){
    const saved=f.groupDrafts[params.groupId];
    if(!saved)throw Object.assign(new Error('No saved group draft'),{status:404});
    return saved;
   }
   return {before:null,after:null};
  },
  fetcher:async()=>{throw Error('Unexpected external fetch');}});
 }finally{globalThis.fetch=originalFetch;}
}
const result=await makeArchive(fixture());
const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());
const snapshot=JSON.parse(await zip.file('snapshot.json').async('string')),manifest=JSON.parse(await zip.file('manifest.json').async('string'));
const html=await zip.file('PetrusKy_Museum_Offline.html').async('string');
assert.equal(await digest(html),manifest.htmlSha256);assert.equal(await digest(JSON.stringify(snapshot)),manifest.snapshotSha256);
assert.equal(manifest.counts.lessons,1);assert.equal(manifest.readOnly,true);
await fs.mkdir('artifacts/museum-offline',{recursive:true});
await fs.writeFile('artifacts/museum-offline/qa.html',html);
snapshot.staff.assignments[0].title='Tampered';
await fs.writeFile('artifacts/museum-offline/tampered.html',buildOfflineHtml(runtime,snapshot,manifest.snapshotSha256));
console.log('Actual ZIP exporter round trip verified: HTML, snapshot, manifest checksums and frozen counts.');
const asean=await makeArchive(aseanFixture(),['qa-lesson']);
const aseanZip=await JSZip.loadAsync(await asean.blob.arrayBuffer());
assert.equal(asean.manifest.counts.studentWorkshops,3);
assert.equal(asean.snapshot.evidence['qa-lesson'].responses.length,5);
await fs.mkdir('artifacts/museum-offline/asean/hoc-sinh',{recursive:true});
for(const entry of ['PetrusKy_Museum_Offline.html','hoc-sinh/index.html']){
 await fs.writeFile('artifacts/museum-offline/asean/'+entry,await aseanZip.file(entry).async('string'));
}
